/**
 * Comprehensive Mahjong Types & Encodings
 * Supports both Bloodshed/Hongzhong Sichuan rules and Classic 136-Tile (推倒胡/国标)
 * Compatible with reference Cocos2d-x engine (GameCmd.h / GameLogic.h).
 */

// ---------------------------------------------------------------------------
// Tile & Suit Definitions
// ---------------------------------------------------------------------------

export type MahjongSuit = 0 | 1 | 2 | -1; // 0: 万, 1: 条, 2: 筒, -1: 红中/字牌

export const TILE_SUIT_TONG = 0;
export const TILE_SUIT_WAN = 1;
export const TILE_SUIT_TIAO = 2;
export const TILE_SUIT_HONOR = 3;

export const MAX_TILE_INDEX = 34;
export const MAX_TILE_COUNT = 14;

export const suitOfCard = (card: number): number => (card & 0xf0) >> 4;
export const rankOfCard = (card: number): number => card & 0x0f;
export const isHonorCard = (card: number): boolean => suitOfCard(card) === TILE_SUIT_HONOR;

export const cardToIndex = (card: number): number =>
  ((card & 0xf0) >> 4) * 9 + (card & 0x0f) - 1;

export const indexToCard = (index: number): number =>
  (Math.floor(index / 9) << 4) | ((index % 9) + 1);

export const isNumericSuit = (suit: number): boolean => suit >= 0 && suit <= 2;

export const HONOR_NAMES = ['东', '南', '西', '北', '中', '发', '白'] as const;
export const SUIT_NAMES = ['筒', '万', '条'] as const;
export const NUMERAL_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

export function tileName(card: number): string {
  const suit = suitOfCard(card);
  const rank = rankOfCard(card);
  if (suit === TILE_SUIT_HONOR) {
    return HONOR_NAMES[rank - 1] ?? '牌';
  }
  return `${NUMERAL_NAMES[rank - 1] ?? rank}${SUIT_NAMES[suit] ?? ''}`;
}

export function tileShortName(card: number): string {
  const suit = suitOfCard(card);
  const rank = rankOfCard(card);
  if (suit === TILE_SUIT_HONOR) {
    return HONOR_NAMES[rank - 1] ?? '牌';
  }
  return `${rank}${SUIT_NAMES[suit] ?? ''}`;
}

/** Face texture from the reference art set. kind 0 = standing (hand), 1 = flat (table). */
export function tileFaceSrc(card: number, kind: 'hand' | 'ming' = 'hand'): string {
  const suit = suitOfCard(card) + 1;
  const rank = rankOfCard(card);
  return `/assets/mahjong/tiles/perspectives/2/${kind}mah_${suit}${rank}.png`;
}

export const TILE_BACK_SRC = '/assets/mahjong/tiles/perspectives/2/mingmah_00.png';
export const TILE_BACK_TOP_SRC = '/assets/mahjong/tiles/hand_top.png';
export const TILE_BACK_LEFT_SRC = '/assets/mahjong/tiles/hand_left.png';
export const TILE_BACK_RIGHT_SRC = '/assets/mahjong/tiles/hand_right.png';

export function buildTileDeck(): number[] {
  const deck: number[] = [];
  for (let suit = 0; suit < 4; suit++) {
    const maxRank = suit === TILE_SUIT_HONOR ? 7 : 9;
    for (let rank = 1; rank <= maxRank; rank++) {
      const card = (suit << 4) | rank;
      for (let copy = 0; copy < 4; copy++) {
        deck.push(card);
      }
    }
  }
  return deck;
}

export function sortCards(cards: number[]): number[] {
  return [...cards].sort((a, b) => a - b);
}

export function countCards(cards: number[]): number[] {
  const counts = new Array<number>(MAX_TILE_INDEX).fill(0);
  for (const card of cards) {
    const idx = cardToIndex(card);
    if (idx >= 0 && idx < MAX_TILE_INDEX) counts[idx]++;
  }
  return counts;
}

export function cardsFromCounts(counts: number[]): number[] {
  const cards: number[] = [];
  for (let i = 0; i < counts.length; i++) {
    for (let n = 0; n < counts[i]; n++) cards.push(indexToCard(i));
  }
  return cards;
}

export function removeCardsFromHand(hand: number[], remove: number[]): number[] {
  const result = [...hand];
  for (const card of remove) {
    const idx = result.indexOf(card);
    if (idx === -1) return result;
    result.splice(idx, 1);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Melds & Action Models
// ---------------------------------------------------------------------------

export type MeldType =
  | 'chi'
  | 'peng'
  | 'ming_gang'
  | 'bu_gang'
  | 'an_gang'
  | 'hongzhong_gang';

export type MeldKind = 'peng' | 'ming_gang' | 'an_gang' | 'bu_gang';
export type MjGangKind = 'ming_gang' | 'an_gang' | 'bu_gang';
export type MjActionType = 'hu' | 'peng' | 'gang' | 'pass';
export type MjWinType = 'zimo' | 'dianpao' | 'qianggang';

export interface MahjongMeld {
  type: MeldType;
  triggerSeatId?: number; // 提供牌的座号 (暗杠为自身)
  tiles: number[]; // 3 或 4 张牌
  hidden?: boolean;
  card?: number;
  kind?: MeldKind;
  fromSeat?: number;
}

export type MjMeld = MahjongMeld;

export interface AvailableAction {
  actionType: 'chi' | 'peng' | 'gang' | 'hu' | 'pass';
  targetTile: number;
  meldTiles?: number[]; // 吃或杠的具体牌组合
  fanName?: string;
  factor?: number;
}

export interface MjFanPreview {
  fan: number;
  names: string[];
}

export interface MjActionOption {
  type: MjActionType;
  card: number;
  gangKind?: MjGangKind;
  fan?: MjFanPreview;
}

// ---------------------------------------------------------------------------
// Phases & States
// ---------------------------------------------------------------------------

export type MahjongPhase =
  | 'WAITING'
  | 'DEALING'
  | 'DING_QUE'
  | 'PLAYING'
  | 'RESPONSE'
  | 'CHA_DA_JIAO'
  | 'SETTLEMENT';

export interface MahjongPlayerView {
  seatId: number; // 0: 自身, 1: 下家(右), 2: 对家(上), 3: 上家(左)
  playerId: string;
  nickname: string;
  avatarId: string;
  beans: number;
  isBot: boolean;
  trusteeship?: boolean;
  isDealer?: boolean;
  handCount: number;
  handTiles?: number[]; // 仅自己可见
  drawnTile?: number | null; // 本轮摸起的新牌
  drawnCard?: number | null; // 别名兼容
  melds: MahjongMeld[];
  discards: number[]; // 牌河已出牌
  dingQueSuit?: MahjongSuit | null;
  isTing?: boolean;
  huCount?: number;
  gangCount?: number;
  scoreDelta?: number;
}

export type MahjongPlayerState = MahjongPlayerView;

export interface TingCandidateInfo {
  tileId: number;
  fanName: string;
  factor: number;
  remainCount: number; // 牌桌及手牌剩余未知张数预估
}

export interface RoundBillRecord {
  id: string;
  timestamp: number;
  eventType?: 'zimo' | 'dianpao' | 'xiayu' | 'guafeng' | 'qianggang';
  winnerSeatId?: number;
  loserSeatId?: number; // -1 表示三家共同付
  fanName?: string;
  totalFactor?: number;
  scoreDelta?: number;
  delta?: number;
  label?: string;
  seatId?: number;
  kind?: 'gang' | 'hu' | 'zimo' | 'qianggang';
}

export type MjScoreBill = RoundBillRecord;

export interface MjLastAction {
  seatId: number;
  type:
    | 'discard'
    | 'peng'
    | 'ming_gang'
    | 'an_gang'
    | 'bu_gang'
    | 'hu'
    | 'zimo'
    | 'qianggang'
    | 'pass';
  card: number;
  ts: number;
}

export interface MjSettlementWinner {
  seatId: number;
  winType: MjWinType;
  fan: number;
  fanNames: string[];
  winCard: number;
  fromSeat: number;
  score: number;
}

export interface MjSettlement {
  matchId?: string;
  endedReason: 'hu' | 'draw';
  winners: MjSettlementWinner[];
  scoreDeltas: number[];
  beans: number[];
  revealHands: number[][];
  melds: MjMeld[][];
  remainWallCount: number;
  nextDealerSeatId: number;
  roundIndex: number;
  timestamp: number;
}

export interface MjDiscardHint {
  card: number;
  waits: number[];
}

export interface MahjongTableSnapshot {
  roomId: string;
  baseScore: number;
  roundIndex?: number;
  maxRounds?: number;
  phase: MahjongPhase;
  dealerSeatId: number;
  currentTurnSeatId: number;
  remainWallCount: number;
  mySeatId?: number;
  latestDiscard?: {
    seatId: number;
    tileId?: number;
    card?: number;
    seq?: number;
  } | null;
  lastAction?: MjLastAction | null;
  players: MahjongPlayerView[];
  availableActions?: AvailableAction[];
  myActions?: MjActionOption[];
  actionSource?: 'response' | 'self' | null;
  responseSeats?: number[];
  discardHints?: MjDiscardHint[];
  tingWaits?: number[];
  tingList?: TingCandidateInfo[];
  optimalDiscard?: {
    bestTile: number;
    totalTingCount: number;
    maxFactor: number;
    reason: string;
  };
  diceValues?: [number, number];
  turnRemainMs?: number;
  bills: RoundBillRecord[];
  settlement?: MjSettlement | null;
  mode?: string;
  serverNow?: number;
}
