export type Suit = 'spade' | 'heart' | 'club' | 'diamond' | null;

export type Rank =
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | '2'
  | 'small_joker'
  | 'big_joker';

export interface CardData {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  isWild?: boolean;
}

export type DealMode =
  | 'classic'
  | 'no_shuffle'
  | 'laizi'
  | 'tiandi_laizi'
  | 'swap_three';

export type SwapDirection = 'clockwise' | 'counter_clockwise';

export type RoomTier = 'rookie' | 'primary' | 'middle' | 'high';

export interface RoomTierConfig {
  tier: RoomTier;
  name: string;
  badge: string;
  baseScore: number;
  minBeans: number;
  maxMultiplier: number;
  fee: number;
  accentColor: string;
}

export const ROOM_TIER_CONFIGS: RoomTierConfig[] = [
  {
    tier: 'rookie',
    name: '新手场',
    badge: '轻松入门',
    baseScore: 100,
    minBeans: 1000,
    maxMultiplier: 32,
    fee: 30,
    accentColor: 'emerald',
  },
  {
    tier: 'primary',
    name: '初级场',
    badge: '热门竞技',
    baseScore: 300,
    minBeans: 3000,
    maxMultiplier: 64,
    fee: 90,
    accentColor: 'sky',
  },
  {
    tier: 'middle',
    name: '中级场',
    badge: '高手切磋',
    baseScore: 800,
    minBeans: 8000,
    maxMultiplier: 128,
    fee: 240,
    accentColor: 'amber',
  },
  {
    tier: 'high',
    name: '高级场',
    badge: '巅峰封神',
    baseScore: 2000,
    minBeans: 20000,
    maxMultiplier: 256,
    fee: 600,
    accentColor: 'rose',
  },
];

export function getRoomTierByBaseScore(baseScore: number): RoomTierConfig {
  const exact = ROOM_TIER_CONFIGS.find((c) => c.baseScore === baseScore);
  if (exact) return exact;
  if (baseScore >= 1500) return ROOM_TIER_CONFIGS[3];
  if (baseScore >= 500) return ROOM_TIER_CONFIGS[2];
  if (baseScore >= 200) return ROOM_TIER_CONFIGS[1];
  return ROOM_TIER_CONFIGS[0];
}

export type HandSortMode = 'rank' | 'count';

export type DdzPhase =
  | 'WAITING'
  | 'DEALING'
  | 'BIDDING'
  | 'GRABBING'
  | 'LANDLORD_REVEAL'
  | 'SWAPPING'
  | 'DOUBLING'
  | 'PLAYING'
  | 'SETTLEMENT';

export type PropType = 'flower' | 'bomb_cup' | 'tea' | 'like' | 'ingot';

export interface SeatPlayerInfo {
  playerId: string;
  nickname: string;
  avatarId: string;
  seatIndex: number;
  beans: number;
  ready: boolean;
  isBot: boolean;
  disconnected: boolean;
  trusteeship?: boolean;
}

export type TablePlayerInfo = SeatPlayerInfo;

export interface ChatBubbleInfo {
  id: string;
  seatIndex: number;
  text: string;
  emoji?: string;
}

export interface SeatActionInfo {
  seat: number;
  type:
    | 'call'
    | 'no_call'
    | 'grab'
    | 'no_grab'
    | 'swap_three'
    | 'double_1'
    | 'double_2'
    | 'double_4'
    | 'play'
    | 'pass';
  cards?: CardData[];
  patternLabel?: string;
}

export interface ReplayStep {
  stepIndex: number;
  seat: number;
  actionType:
    | 'call'
    | 'no_call'
    | 'grab'
    | 'no_grab'
    | 'landlord_reveal'
    | 'swap_three'
    | 'double_1'
    | 'double_2'
    | 'double_4'
    | 'play'
    | 'pass';
  cards?: CardData[];
  patternLabel?: string;
  multiplierAfter: number;
  wildRanksAfter: Rank[];
}

export interface MatchReplayRecord {
  matchId: string;
  roomId: string;
  dealMode: DealMode;
  wildRanks: Rank[];
  baseScore: number;
  finalMultiplier: number;
  landlordSeat: number;
  winnerSeat: number;
  isSpring: boolean;
  isAntiSpring: boolean;
  timestamp: number;
  seats: Array<{
    seatIndex: number;
    playerId: string;
    nickname: string;
    avatarId: string;
    role: 'landlord' | 'peasant';
    scoreDelta: number;
    isWinner: boolean;
  }>;
  initialHands: Record<number, CardData[]>;
  landlordCards: CardData[];
  steps: ReplayStep[];
}

export interface GameSnapshotPayload {
  roomId: string;
  dealMode?: DealMode;
  wildRanks?: Rank[];
  baseScore: number;
  maxMultiplier?: number;
  isPrivate: boolean;
  hostId: string;
  phase: DdzPhase;
  players: Array<SeatPlayerInfo | null>;
  mySeat: number;
  myCards: CardData[];
  othersCount: Record<string, number>;
  landlordId: string | null;
  landlordSeat: number | null;
  landlordCards: CardData[];
  bottomCardsTag?: string | null;
  multiplier: number;
  currentPlayerId: string | null;
  currentSeat: number;
  timeoutAt: number;
  serverTime: number;
  isFreeLead: boolean;
  lastPlayed: {
    playerId: string;
    seatIndex: number;
    cards: CardData[];
    patternLabel: string;
  } | null;
  seatLastActions: SeatActionInfo[];
  cardRecorder?: Record<Rank, number>;
  swapDirection?: SwapDirection;
  swappedInCardIds?: string[];
  swapSubmittedSeats?: number[];
}

export type DdzSnapshot = GameSnapshotPayload;

export interface SettlementData {
  matchId?: string;
  winnerId: string;
  winnerSeat: number;
  isLandlordWin: boolean;
  baseScore: number;
  grabMultiplier: number;
  doubleMultiplier?: number;
  bombMultiplier: number;
  springMultiplier: number;
  totalMultiplier: number;
  maxMultiplier?: number;
  effectiveMultiplier?: number;
  isCapped?: boolean;
  bankruptProtectedIds?: string[];
  isSpring: boolean;
  isAntiSpring: boolean;
  scoreChanges: Record<string, number>;
  remainingHands: Record<string, CardData[]>;
  wildRanks?: Rank[];
  replay?: MatchReplayRecord;
}
