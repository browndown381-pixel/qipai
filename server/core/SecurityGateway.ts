import crypto from 'node:crypto';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface ActionGuardState {
  lastSeq: number;
  recentFingerprints: Map<string, number>;
}

const HMAC_SECRET =
  process.env.SESSION_HMAC_SECRET || 'h5_commercial_card_suite_hmac_secret_2026';

/**
 * SecurityGateway:
 * 1. HMAC-SHA256 Session Token signing & verification (anti-spoofing)
 * 2. Per-socket Token Bucket Rate Limiter (anti-flood / anti-rapid-click)
 * 3. Action Sequence (`_seq`) & payload fingerprint idempotency guard (anti-replay)
 */
export class SecurityGateway {
  private actionBuckets: Map<string, TokenBucket> = new Map();
  private heavyBuckets: Map<string, TokenBucket> = new Map();
  private actionGuards: Map<string, ActionGuardState> = new Map();

  private stats = {
    tokensIssued: 0,
    tokenVerificationsPassed: 0,
    tokenVerificationsFailed: 0,
    rateLimitedDrops: 0,
    duplicateActionDrops: 0,
  };

  constructor() {
    // Periodic cleanup of stale fingerprints
    setInterval(() => this.cleanupStaleFingerprints(), 30000).unref?.();
  }

  /**
   * Issues an HMAC-SHA256 signed session token bound to playerId.
   * Format: `${playerId}.${issuedAt}.${signatureHex}`
   */
  issueSessionToken(playerId: string): string {
    const issuedAt = Date.now().toString(36);
    const payload = `${playerId}.${issuedAt}`;
    const sig = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 32);
    this.stats.tokensIssued += 1;
    return `${payload}.${sig}`;
  }

  /**
   * Verifies an HMAC session token.
   * Returns the verified playerId if valid, or null if tampered.
   */
  verifySessionToken(token?: string | null): string | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) {
      this.stats.tokenVerificationsFailed += 1;
      return null;
    }
    const [playerId, issuedAt, providedSig] = parts;
    if (!playerId || !issuedAt || !providedSig) {
      this.stats.tokenVerificationsFailed += 1;
      return null;
    }
    const payload = `${playerId}.${issuedAt}`;
    const expectedSig = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 32);

    try {
      const a = Buffer.from(providedSig, 'utf8');
      const b = Buffer.from(expectedSig, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        this.stats.tokenVerificationsPassed += 1;
        return playerId;
      }
    } catch {
      // Fall through
    }
    this.stats.tokenVerificationsFailed += 1;
    return null;
  }

  /**
   * Token Bucket Rate Limiter per socketId.
   * @param isHeavyOrCost true / cost > 1 for room creation / quick match, false / 1 for in-game actions
   */
  consumeRateLimit(socketId: string, isHeavyOrCost: boolean | number = false): boolean {
    const isHeavyOperation =
      typeof isHeavyOrCost === 'number' ? isHeavyOrCost > 1 : Boolean(isHeavyOrCost);
    const now = Date.now();
    const map = isHeavyOperation ? this.heavyBuckets : this.actionBuckets;
    const capacity = isHeavyOperation ? 8 : 32;
    const refillPerMs = isHeavyOperation ? 2.5 / 1000 : 15 / 1000;

    let bucket = map.get(socketId);
    if (!bucket) {
      bucket = { tokens: capacity - 1, lastRefill: now };
      map.set(socketId, bucket);
      return true;
    }

    const elapsed = Math.max(0, now - bucket.lastRefill);
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      this.stats.rateLimitedDrops += 1;
      return false;
    }

    bucket.tokens -= 1;
    return true;
  }

  /**
   * Idempotency & Replay Guard for game action events.
   * Rejects duplicate `_seq` numbers or identical `(event + businessPayload)` within 280ms.
   */
  checkActionIdempotency(
    socketId: string,
    event: string,
    payload: unknown
  ): boolean {
    const now = Date.now();
    let guard = this.actionGuards.get(socketId);
    if (!guard) {
      guard = { lastSeq: 0, recentFingerprints: new Map() };
      this.actionGuards.set(socketId, guard);
    }

    let seq: number | undefined;
    const cleanPayload: Record<string, unknown> = {};

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const raw = payload as Record<string, unknown>;
      if (typeof raw._seq === 'number' && Number.isFinite(raw._seq)) {
        seq = raw._seq;
      }
      for (const [k, v] of Object.entries(raw)) {
        if (k !== '_seq') {
          cleanPayload[k] = v;
        }
      }
    }

    // 1. Sequence monotonicity check if client attached _seq
    if (seq !== undefined) {
      if (seq <= guard.lastSeq && guard.lastSeq - seq < 1000) {
        this.stats.duplicateActionDrops += 1;
        return false;
      }
      guard.lastSeq = seq;
    }

    // 2. Short-window payload fingerprint check (280ms debounce for identical action)
    const fingerprint = `${event}:${JSON.stringify(cleanPayload)}`;
    const prevTime = guard.recentFingerprints.get(fingerprint);
    if (prevTime !== undefined && now - prevTime < 280) {
      this.stats.duplicateActionDrops += 1;
      return false;
    }

    guard.recentFingerprints.set(fingerprint, now);
    return true;
  }

  removeSocketState(socketId: string): void {
    this.actionBuckets.delete(socketId);
    this.heavyBuckets.delete(socketId);
    this.actionGuards.delete(socketId);
  }

  getStats() {
    return { ...this.stats };
  }

  private cleanupStaleFingerprints(): void {
    const now = Date.now();
    for (const guard of this.actionGuards.values()) {
      for (const [fp, ts] of guard.recentFingerprints.entries()) {
        if (now - ts > 5000) {
          guard.recentFingerprints.delete(fp);
        }
      }
    }
  }
}

export const securityGateway = new SecurityGateway();
