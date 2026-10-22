// ─── Tile Encoding ───────────────────────────────────────────────────────────
// TileID = Suit × 10 + Rank
// Wan(万): 1-9, Tiao(条): 11-19, Tong(筒): 21-29, HongZhong(红中): 31

export enum MjSuit {
  Wan = 0,
  Tiao = 1,
  Tong = 2,
  Special = -1,
}

export const HONGZHONG_ID = 31;

export interface TileData {
  id: string;
  tileId: number;
  suit: MjSuit;
  rank: number;
  isWild: boolean;
}

export type MeldType = 'chi' | 'peng' | 'minggang' | 'bugang' | 'angang' | 'hongzhonggang';

export interface MeldData {
  type: MeldType;
  triggerSeat: number;
  tiles: TileData[];
}

export type MjPhase =
  | 'WAITING'
  | 'DEALING'
  | 'DINGQUE'
  | 'SWAPPING'
  | 'PLAYING'
  | 'RESPONSE'
  | 'SETTLEMENT';

export interface FanResult {
  fanId: number;
  fanName: string;
  factor: number;
}

export interface TingInfo {
  tileId: number;
  fans: FanResult[];
  remainCount: number;
}

export type RoundBillEventType = 'zimo' | 'dianpao' | 'angang' | 'minggang' | 'bugang' | 'qiangganghu';

export interface RoundBillEvent {
  eventType: RoundBillEventType;
  winnerSeat: number;
  loserSeat: number; // -1 for three-family payment
  fanId: number;
  fanName: string;
  totalFactor: number;
  scoreDelta: number;
  timestamp: number;
}

export interface PlayerSettlement {
  seatId: number;
  totalScore: number;
  huCount: number;
  gangCount: number;
  isChaJiao: boolean;
  tuiShuiDelta: number;
  remainHand: TileData[];
  fans: FanResult[];
}

export interface ActionType {
  type: 'pass' | 'chi' | 'peng' | 'minggang' | 'bugang' | 'angang' | 'hu';
  tiles?: number[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const NORMAL_TILE_IDS: number[] = [];
for (let s = 0; s < 3; s++) {
  for (let r = 1; r <= 9; r++) {
    NORMAL_TILE_IDS.push(s * 10 + r);
  }
}

export function getSuit(tileId: number): MjSuit {
  if (tileId >= 1 && tileId <= 9) return MjSuit.Wan;
  if (tileId >= 11 && tileId <= 19) return MjSuit.Tiao;
  if (tileId >= 21 && tileId <= 29) return MjSuit.Tong;
  if (tileId === HONGZHONG_ID) return MjSuit.Special;
  return MjSuit.Special;
}

export function getRank(tileId: number): number {
  if (tileId === HONGZHONG_ID) return 0;
  return tileId % 10;
}

export function createTile(tileId: number, id?: string): TileData {
  return {
    id: id ?? `t${tileId}_${Math.random().toString(36).slice(2, 8)}`,
    tileId,
    suit: getSuit(tileId),
    rank: getRank(tileId),
    isWild: tileId === HONGZHONG_ID,
  };
}

export function buildFullDeck(): TileData[] {
  const deck: TileData[] = [];
  for (const tid of NORMAL_TILE_IDS) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push(createTile(tid));
    }
  }
  for (let copy = 0; copy < 4; copy++) {
    deck.push(createTile(HONGZHONG_ID));
  }
  return deck;
}

export const SUIT_NAMES: Record<number, string> = {
  [MjSuit.Wan]: '万',
  [MjSuit.Tiao]: '条',
  [MjSuit.Tong]: '筒',
  [MjSuit.Special]: '字',
};

export const RANK_NAMES: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九', 0: '中',
};

export function tileName(tileId: number): string {
  if (tileId === HONGZHONG_ID) return '红中';
  const suit = getSuit(tileId);
  const rank = getRank(tileId);
  return `${RANK_NAMES[rank]}${SUIT_NAMES[suit]}`;
}
