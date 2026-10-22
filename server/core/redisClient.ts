/**
 * Redis-compatible State Store for room snapshots, online presence, and reconnection state.
 * Strictly game-agnostic (/server/core boundary).
 */

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

export class RedisClient {
  private kvStore: Map<string, CacheEntry> = new Map();
  private hashStore: Map<string, Map<string, string>> = new Map();

  constructor() {
    setInterval(() => this.cleanupExpired(), 15000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.kvStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.kvStore.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.kvStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.kvStore.delete(key);
    this.hashStore.delete(key);
  }

  async hset(hashKey: string, field: string, value: string): Promise<void> {
    let map = this.hashStore.get(hashKey);
    if (!map) {
      map = new Map();
      this.hashStore.set(hashKey, map);
    }
    map.set(field, value);
  }

  async hget(hashKey: string, field: string): Promise<string | null> {
    const map = this.hashStore.get(hashKey);
    if (!map) return null;
    return map.get(field) ?? null;
  }

  async hgetall(hashKey: string): Promise<Record<string, string>> {
    const map = this.hashStore.get(hashKey);
    if (!map) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of map.entries()) {
      out[k] = v;
    }
    return out;
  }

  async hdel(hashKey: string, field: string): Promise<void> {
    const map = this.hashStore.get(hashKey);
    if (map) {
      map.delete(field);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.kvStore.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.kvStore.delete(key);
      }
    }
  }
}

export const redisClient = new RedisClient();
