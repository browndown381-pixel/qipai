import fs from 'fs';
import path from 'path';
import type { DealMode, Rank } from '../games/ddz/DdzRules.js';
import type { MatchReplayRecord } from '../games/ddz/DdzStateMachine.js';

export interface UserProfile {
  playerId: string;
  nickname: string;
  avatarId: string;
  roomCards: number;
  beans: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: number;
}

export interface MatchRecord {
  id: string;
  roomId: string;
  gameType: string;
  dealMode?: DealMode;
  wildRanks?: Rank[];
  hasReplay?: boolean;
  timestamp: number;
  baseScore: number;
  multiplier: number;
  winnerSide: string;
  players: Array<{
    playerId: string;
    nickname: string;
    role: string;
    scoreDelta: number;
    isWinner: boolean;
  }>;
}

interface PersistedData {
  users: Record<string, UserProfile>;
  matches: MatchRecord[];
  replays?: Record<string, MatchReplayRecord>;
}

const DATA_FILE = path.resolve(process.cwd(), '.game-data.json');

const SEED_NAMES = [
  '长安棋圣',
  '江南布衣',
  '玉面书生',
  '云端雀神',
  '紫禁巅峰',
  '清风剑客',
];

export class StorageService {
  private data: PersistedData = {
    users: {},
    matches: [],
    replays: {},
  };

  constructor() {
    this.load();
    this.ensureSeedLeaderboard();
  }

  private load(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedData;
        if (parsed && parsed.users && Array.isArray(parsed.matches)) {
          this.data = {
            users: parsed.users,
            matches: parsed.matches,
            replays: parsed.replays ?? {},
          };
        }
      }
    } catch {
      // Fallback to in-memory default
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in read-only environments
    }
  }

  private ensureSeedLeaderboard(): void {
    if (Object.keys(this.data.users).length > 0) return;
    const seeds: Array<{ id: string; name: string; avatar: string; beans: number; played: number; won: number }> = [
      { id: 'seed_1', name: '长安棋圣·陆羽', avatar: 'scholar', beans: 38600, played: 84, won: 56 },
      { id: 'seed_2', name: '金陵酒客·沈万', avatar: 'noble', beans: 29400, played: 62, won: 39 },
      { id: 'seed_3', name: '临安侠女·苏映雪', avatar: 'heroine', beans: 24800, played: 55, won: 33 },
      { id: 'seed_4', name: '姑苏剑仙·慕容', avatar: 'warrior', beans: 19200, played: 48, won: 26 },
    ];
    for (const s of seeds) {
      this.data.users[s.id] = {
        playerId: s.id,
        nickname: s.name,
        avatarId: s.avatar,
        roomCards: 12,
        beans: s.beans,
        gamesPlayed: s.played,
        gamesWon: s.won,
        createdAt: Date.now() - 86400000,
      };
    }
    this.save();
  }

  getOrCreateGuest(playerId: string, preferredNickname?: string, avatarId?: string): UserProfile {
    const existing = this.data.users[playerId];
    if (existing) {
      if (preferredNickname && preferredNickname.trim()) {
        existing.nickname = preferredNickname.trim().slice(0, 14);
      }
      if (avatarId) {
        existing.avatarId = avatarId;
      }
      if (existing.beans < 1000) {
        existing.beans = 5000;
      }
      this.save();
      return existing;
    }

    const suffix = playerId.slice(-4).toUpperCase();
    const randomTitle = SEED_NAMES[Math.floor(Math.random() * SEED_NAMES.length)];
    const profile: UserProfile = {
      playerId,
      nickname: preferredNickname?.trim() || `${randomTitle}${suffix}`,
      avatarId: avatarId || 'noble',
      roomCards: 10,
      beans: 12000,
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: Date.now(),
    };
    this.data.users[playerId] = profile;
    this.save();
    return profile;
  }

  getUser(playerId: string): UserProfile | null {
    return this.data.users[playerId] ?? null;
  }

  updateNickname(playerId: string, nickname: string, avatarId?: string): UserProfile | null {
    const u = this.data.users[playerId];
    if (!u) return null;
    if (nickname.trim()) {
      u.nickname = nickname.trim().slice(0, 14);
    }
    if (avatarId) {
      u.avatarId = avatarId;
    }
    this.save();
    return u;
  }

  consumeRoomCard(playerId: string, count = 1): boolean {
    const u = this.data.users[playerId];
    if (!u || u.roomCards < count) return false;
    u.roomCards -= count;
    this.save();
    return true;
  }

  updateBeans(playerId: string, delta: number): number {
    const u = this.data.users[playerId];
    if (!u) return 0;
    u.beans = Math.max(0, u.beans + delta);
    this.save();
    return u.beans;
  }

  claimFreeSupply(playerId: string): UserProfile | null {
    const u = this.data.users[playerId];
    if (!u) return null;
    if (u.beans < 3000) {
      u.beans += 5000;
    }
    if (u.roomCards < 3) {
      u.roomCards += 5;
    }
    this.save();
    return u;
  }

  recordSettlement(
    roomId: string,
    gameType: string,
    baseScore: number,
    multiplier: number,
    winnerSide: string,
    results: Array<{
      playerId: string;
      nickname: string;
      isBot: boolean;
      role: string;
      scoreDelta: number;
      isWinner: boolean;
    }>,
    replayData?: Omit<MatchReplayRecord, 'matchId'>,
    skipBeanUpdate = false
  ): MatchRecord {
    for (const r of results) {
      if (r.isBot) continue;
      const u = this.data.users[r.playerId];
      if (u) {
        if (!skipBeanUpdate) {
          u.beans = Math.max(0, u.beans + r.scoreDelta);
        }
        u.gamesPlayed += 1;
        if (r.isWinner) {
          u.gamesWon += 1;
        }
      }
    }

    const matchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: MatchRecord = {
      id: matchId,
      roomId,
      gameType,
      dealMode: replayData?.dealMode ?? 'classic',
      wildRanks: replayData?.wildRanks ?? [],
      hasReplay: Boolean(replayData),
      timestamp: Date.now(),
      baseScore,
      multiplier,
      winnerSide,
      players: results.map((r) => ({
        playerId: r.playerId,
        nickname: r.nickname,
        role: r.role,
        scoreDelta: r.scoreDelta,
        isWinner: r.isWinner,
      })),
    };

    if (!this.data.replays) {
      this.data.replays = {};
    }
    if (replayData) {
      this.data.replays[matchId] = {
        ...replayData,
        matchId,
      };
    }

    this.data.matches.unshift(record);
    if (this.data.matches.length > 50) {
      const removed = this.data.matches.slice(50);
      this.data.matches = this.data.matches.slice(0, 50);
      for (const old of removed) {
        if (this.data.replays && old.id in this.data.replays) {
          delete this.data.replays[old.id];
        }
      }
    }
    this.save();
    return record;
  }

  getMatchReplay(matchId: string): MatchReplayRecord | null {
    return this.data.replays?.[matchId] ?? null;
  }

  getLeaderboard(limit = 10): UserProfile[] {
    return Object.values(this.data.users)
      .sort((a, b) => b.beans - a.beans)
      .slice(0, limit);
  }

  getPlayerMatches(playerId: string, limit = 15): MatchRecord[] {
    return this.data.matches
      .filter((m) => m.players.some((p) => p.playerId === playerId))
      .slice(0, limit);
  }
}

export const storageService = new StorageService();
