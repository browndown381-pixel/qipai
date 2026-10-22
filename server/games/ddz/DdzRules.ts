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

export type Suit = 'spade' | 'heart' | 'club' | 'diamond' | null;

export interface CardData {
  id: string;
  rank: Rank;
  suit: Suit;
  value: number;
  isWild?: boolean;
}

export enum PatternType {
  SINGLE = 'SINGLE',
  PAIR = 'PAIR',
  TRIPLE = 'TRIPLE',
  TRIPLE_SINGLE = 'TRIPLE_SINGLE',
  TRIPLE_PAIR = 'TRIPLE_PAIR',
  STRAIGHT = 'STRAIGHT',
  CONSECUTIVE_PAIRS = 'CONSECUTIVE_PAIRS',
  AIRPLANE = 'AIRPLANE',
  AIRPLANE_SINGLE_WINGS = 'AIRPLANE_SINGLE_WINGS',
  AIRPLANE_PAIR_WINGS = 'AIRPLANE_PAIR_WINGS',
  FOUR_WITH_TWO_SINGLES = 'FOUR_WITH_TWO_SINGLES',
  FOUR_WITH_TWO_PAIRS = 'FOUR_WITH_TWO_PAIRS',
  BOMB = 'BOMB',
  ROCKET = 'ROCKET',
}

export interface ClassifiedPattern {
  type: PatternType;
  label: string;
  mainValue: number; // Primary rank value used for same-type comparison & voice reading
  candidateQuads?: number[]; // All valid candidate quad values for four-with-two comparisons
  length: number; // Total card count
  chainCount: number; // Number of consecutive units for straight/pairs/airplane
  cards: CardData[]; // Canonically ordered: main core cards first, kickers/wings second
  /**
   * Bomb hierarchy for Laizi modes:
   * 1 = Soft Bomb (软炸弹: 1~3 wild cards + native cards)
   * 2 = Hard Bomb (硬炸弹: 4 native cards of identical rank)
   * 3 = Pure Laizi Bomb (纯赖子炸: 4 wild cards)
   * 4 = Rocket (王炸: small_joker + big_joker)
   */
  bombTier?: number;
  /** Priority score in the commercial pattern recognition priority queue */
  priority?: number;
}

export const RANK_VALUES: Record<Rank, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  '2': 15,
  small_joker: 16,
  big_joker: 17,
};

export const VALUE_TO_RANK: Record<number, Rank> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
  16: 'small_joker',
  17: 'big_joker',
};

/**
 * Commercial Dou Dizhu Pattern Recognition Priority Table (Higher = Evaluated First).
 * Ensures deterministic disambiguation when a card set matches multiple candidate structures
 * (e.g. 33334444 -> AIRPLANE_SINGLE_WINGS before FOUR_WITH_TWO_PAIRS;
 *  Laizi 5-card Straight vs Triple+Pair).
 */
export const PATTERN_PRIORITY: Record<PatternType, number> = {
  [PatternType.ROCKET]: 1000,
  [PatternType.BOMB]: 900,
  [PatternType.AIRPLANE_PAIR_WINGS]: 820,
  [PatternType.AIRPLANE_SINGLE_WINGS]: 810,
  [PatternType.AIRPLANE]: 800,
  [PatternType.CONSECUTIVE_PAIRS]: 700,
  [PatternType.STRAIGHT]: 600,
  [PatternType.TRIPLE_PAIR]: 520,
  [PatternType.TRIPLE_SINGLE]: 510,
  [PatternType.TRIPLE]: 500,
  [PatternType.FOUR_WITH_TWO_PAIRS]: 420,
  [PatternType.FOUR_WITH_TWO_SINGLES]: 410,
  [PatternType.PAIR]: 300,
  [PatternType.SINGLE]: 200,
};

export type DealMode =
  | 'classic'
  | 'no_shuffle'
  | 'laizi'
  | 'tiandi_laizi'
  | 'swap_three';

const SUIT_ORDER: Record<string, number> = {
  spade: 4,
  heart: 3,
  club: 2,
  diamond: 1,
  joker: 5,
};

const SUIT_SYMBOLS: Record<string, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
};

const LAIZI_ELIGIBLE_RANKS: Rank[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
  '2',
];

export class DdzRules {
  static createDeck(): CardData[] {
    const ranks: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const suits: Array<Exclude<Suit, null>> = ['spade', 'heart', 'club', 'diamond'];
    const deck: CardData[] = [];

    for (const rank of ranks) {
      for (const suit of suits) {
        deck.push({
          id: `${suit}_${rank}`,
          rank,
          suit,
          value: RANK_VALUES[rank],
        });
      }
    }

    deck.push({
      id: 'small_joker',
      rank: 'small_joker',
      suit: null,
      value: RANK_VALUES.small_joker,
    });

    deck.push({
      id: 'big_joker',
      rank: 'big_joker',
      suit: null,
      value: RANK_VALUES.big_joker,
    });

    return deck;
  }

  static formatCard(card: CardData): string {
    if (card.rank === 'big_joker') return '大王';
    if (card.rank === 'small_joker') return '小王';
    const suitSym = card.suit ? (SUIT_SYMBOLS[card.suit] ?? '') : '';
    const wildTag = card.isWild ? '(赖)' : '';
    return `${suitSym}${card.rank}${wildTag}`;
  }

  static formatCards(cards: CardData[]): string {
    if (!cards || cards.length === 0) return '[]';
    return `[${cards.map((c) => this.formatCard(c)).join(' ')}]`;
  }

  static valueToLabel(value: number): string {
    if (value === 17) return '大王';
    if (value === 16) return '小王';
    return VALUE_TO_RANK[value] ?? String(value);
  }

  static resolveVoiceFile(patternType: PatternType | string, mainValue: number): string {
    const audioIdx =
      mainValue === 14
        ? 1
        : mainValue === 15
          ? 2
          : mainValue === 16
            ? 14
            : mainValue === 17
              ? 15
              : Math.max(3, Math.min(13, Math.round(mainValue)));

    switch (patternType) {
      case PatternType.SINGLE:
        return `${audioIdx}.wav`;
      case PatternType.PAIR:
        return `dui${Math.min(13, audioIdx)}.wav`;
      case PatternType.TRIPLE:
        return `tuple${Math.min(13, audioIdx)}.wav`;
      case PatternType.TRIPLE_SINGLE:
        return 'sandaiyi.wav';
      case PatternType.TRIPLE_PAIR:
        return 'sandaiyidui.wav';
      case PatternType.STRAIGHT:
        return 'shunzi.wav';
      case PatternType.CONSECUTIVE_PAIRS:
        return 'liandui.wav';
      case PatternType.AIRPLANE:
      case PatternType.AIRPLANE_SINGLE_WINGS:
      case PatternType.AIRPLANE_PAIR_WINGS:
        return 'feiji.wav';
      case PatternType.FOUR_WITH_TWO_SINGLES:
        return 'sidaier.wav';
      case PatternType.FOUR_WITH_TWO_PAIRS:
        return 'sidailiangdui.wav';
      case PatternType.BOMB:
        return 'zhadan.wav';
      case PatternType.ROCKET:
        return 'wangzha.wav';
      default:
        return 'buyao1.wav';
    }
  }

  static pickRandomWildRank(excludeRanks: Rank[] = []): Rank {
    const pool = LAIZI_ELIGIBLE_RANKS.filter((r) => !excludeRanks.includes(r));
    const chosenPool = pool.length > 0 ? pool : LAIZI_ELIGIBLE_RANKS;
    return chosenPool[Math.floor(Math.random() * chosenPool.length)];
  }

  static markWildCards(cards: CardData[], wildRanks: Rank[]): CardData[] {
    if (!wildRanks || wildRanks.length === 0) {
      return cards.map((c) => (c.isWild ? { ...c, isWild: false } : c));
    }
    const wildSet = new Set<Rank>(wildRanks);
    return cards.map((c) => ({
      ...c,
      isWild: wildSet.has(c.rank),
    }));
  }

  static shuffleDeck(deck: CardData[]): CardData[] {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  /**
   * Commercial Multi-Mode Dealing Algorithm ("classic" / "no_shuffle" / "laizi" / "tiandi_laizi")
   * with multiplayer fairness variance calibration across all 3 seats.
   */
  static dealHands(mode: DealMode = 'classic'): {
    seat0: CardData[];
    seat1: CardData[];
    seat2: CardData[];
    bottomCards: CardData[];
  } {
    const isClumpDeal = mode === 'no_shuffle' || mode === 'tiandi_laizi';
    const sampleCount = isClumpDeal ? 3 : 2;
    let bestDeal: {
      seat0: CardData[];
      seat1: CardData[];
      seat2: CardData[];
      bottomCards: CardData[];
      spread: number;
    } | null = null;

    for (let attempt = 0; attempt < sampleCount; attempt++) {
      const candidate =
        mode === 'no_shuffle'
          ? this.generateNoShuffleDeal()
          : this.generateClassicDeal();

      const s0 = this.estimateQuickStrength(candidate.seat0);
      const s1 = this.estimateQuickStrength(candidate.seat1);
      const s2 = this.estimateQuickStrength(candidate.seat2);
      const maxS = Math.max(s0, s1, s2);
      const minS = Math.min(s0, s1, s2);
      const spread = maxS - minS;

      if (!bestDeal || spread < bestDeal.spread) {
        bestDeal = { ...candidate, spread };
      }
    }

    const chosen = bestDeal!;
    return {
      seat0: this.sortCardsDesc(chosen.seat0),
      seat1: this.sortCardsDesc(chosen.seat1),
      seat2: this.sortCardsDesc(chosen.seat2),
      bottomCards: chosen.bottomCards,
    };
  }

  private static generateClassicDeal(): {
    seat0: CardData[];
    seat1: CardData[];
    seat2: CardData[];
    bottomCards: CardData[];
  } {
    const deck = this.shuffleDeck(this.createDeck());
    return {
      seat0: deck.slice(0, 17),
      seat1: deck.slice(17, 34),
      seat2: deck.slice(34, 51),
      bottomCards: deck.slice(51, 54),
    };
  }

  private static generateNoShuffleDeal(): {
    seat0: CardData[];
    seat1: CardData[];
    seat2: CardData[];
    bottomCards: CardData[];
  } {
    const rawDeck = this.createDeck();
    const byRank = this.countByValue(rawDeck);
    const rankKeys = this.shuffleArray(Array.from(byRank.keys()));

    let structured: CardData[] = [];
    for (const rk of rankKeys) {
      const grp = this.shuffleDeck(byRank.get(rk) ?? []);
      structured.push(...grp);
    }

    for (let pass = 0; pass < 5; pass++) {
      const cutPoint = 18 + Math.floor(Math.random() * 18);
      const leftHalf = structured.slice(0, cutPoint);
      const rightHalf = structured.slice(cutPoint);
      const merged: CardData[] = [];

      let lIdx = 0;
      let rIdx = 0;
      while (lIdx < leftHalf.length || rIdx < rightHalf.length) {
        if (lIdx < leftHalf.length) {
          const chunkLen = 2 + Math.floor(Math.random() * 4);
          merged.push(...leftHalf.slice(lIdx, lIdx + chunkLen));
          lIdx += chunkLen;
        }
        if (rIdx < rightHalf.length) {
          const chunkLen = 2 + Math.floor(Math.random() * 4);
          merged.push(...rightHalf.slice(rIdx, rIdx + chunkLen));
          rIdx += chunkLen;
        }
      }
      structured = merged;
    }

    const holeOffset = Math.floor(Math.random() * (structured.length - 3));
    const bottomCards = structured.slice(holeOffset, holeOffset + 3);
    const playDeck = [
      ...structured.slice(0, holeOffset),
      ...structured.slice(holeOffset + 3),
    ];

    const packetSizes = [4, 4, 4, 3, 2];
    const hands: [CardData[], CardData[], CardData[]] = [[], [], []];
    let cursor = 0;

    for (const pkt of packetSizes) {
      for (let seat = 0; seat < 3; seat++) {
        hands[seat].push(...playDeck.slice(cursor, cursor + pkt));
        cursor += pkt;
      }
    }

    const rot = Math.floor(Math.random() * 3);
    return {
      seat0: hands[rot % 3],
      seat1: hands[(rot + 1) % 3],
      seat2: hands[(rot + 2) % 3],
      bottomCards,
    };
  }

  private static estimateQuickStrength(cards: CardData[]): number {
    const valMap = this.countByValue(cards);
    let score = 0;
    if (valMap.has(16) && valMap.has(17)) score += 10;
    for (const [val, grp] of valMap.entries()) {
      if (grp.length === 4) score += 8;
      else if (grp.length === 3) score += 3;
      else if (grp.length === 2) score += 1.2;

      if (val === 17) score += 4;
      else if (val === 16) score += 3;
      else if (val === 15) score += 2 * grp.length;
      else if (val === 14) score += 1 * grp.length;
    }
    return score;
  }

  private static shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  static sortCardsDesc(cards: CardData[]): CardData[] {
    return [...cards].sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      const sa = SUIT_ORDER[a.suit ?? 'joker'] ?? 0;
      const sb = SUIT_ORDER[b.suit ?? 'joker'] ?? 0;
      return sb - sa;
    });
  }

  /**
   * Canonically orders played cards so that the core pattern (Triple, Airplane chain, Quad)
   * appears on the left and kickers/wings appear on the right, with wild cards placed in the
   * exact group they substitute.
   */
  static orderCardsForPattern(
    cards: CardData[],
    type: PatternType,
    mainValue: number,
    chainCount: number,
    wildRanks: Rank[] = []
  ): CardData[] {
    const sorted = this.sortCardsDesc(cards);
    const wildSet = new Set<Rank>(wildRanks);
    const isWildCard = (c: CardData) => Boolean(c.isWild || wildSet.has(c.rank));

    if (
      type === PatternType.SINGLE ||
      type === PatternType.PAIR ||
      type === PatternType.TRIPLE ||
      type === PatternType.BOMB ||
      type === PatternType.ROCKET
    ) {
      // Natural cards of mainValue first, then wild substitutes
      const nats = sorted.filter((c) => !isWildCard(c));
      const wilds = sorted.filter((c) => isWildCard(c));
      return [...nats, ...wilds];
    }

    if (
      type === PatternType.TRIPLE_SINGLE ||
      type === PatternType.TRIPLE_PAIR ||
      type === PatternType.FOUR_WITH_TWO_SINGLES ||
      type === PatternType.FOUR_WITH_TWO_PAIRS
    ) {
      const coreSize =
        type === PatternType.FOUR_WITH_TWO_SINGLES || type === PatternType.FOUR_WITH_TWO_PAIRS
          ? 4
          : 3;
      const coreCards: CardData[] = [];
      const usedIds = new Set<string>();

      // 1. Pick non-wild cards matching mainValue
      for (const c of sorted) {
        if (coreCards.length < coreSize && !isWildCard(c) && c.value === mainValue) {
          coreCards.push(c);
          usedIds.add(c.id);
        }
      }
      // 2. Pick wild cards matching mainValue if still needed
      for (const c of sorted) {
        if (coreCards.length < coreSize && !usedIds.has(c.id) && c.value === mainValue) {
          coreCards.push(c);
          usedIds.add(c.id);
        }
      }
      // 3. Pick any remaining wild cards to complete the core
      for (const c of sorted) {
        if (coreCards.length < coreSize && !usedIds.has(c.id) && isWildCard(c)) {
          coreCards.push(c);
          usedIds.add(c.id);
        }
      }

      const wingCards = sorted.filter((c) => !usedIds.has(c.id));
      // Sort wings by frequency desc then value desc
      const wingFreq = new Map<number, number>();
      for (const w of wingCards) {
        wingFreq.set(w.value, (wingFreq.get(w.value) ?? 0) + 1);
      }
      wingCards.sort((a, b) => {
        const fa = wingFreq.get(a.value) ?? 1;
        const fb = wingFreq.get(b.value) ?? 1;
        if (fb !== fa) return fb - fa;
        return b.value - a.value;
      });
      return [...coreCards, ...wingCards];
    }

    if (
      type === PatternType.AIRPLANE ||
      type === PatternType.AIRPLANE_SINGLE_WINGS ||
      type === PatternType.AIRPLANE_PAIR_WINGS ||
      type === PatternType.CONSECUTIVE_PAIRS ||
      type === PatternType.STRAIGHT
    ) {
      const unitSize =
        type === PatternType.STRAIGHT
          ? 1
          : type === PatternType.CONSECUTIVE_PAIRS
            ? 2
            : 3;
      const minVal = mainValue - chainCount + 1;
      const usedIds = new Set<string>();
      const coreSlots: CardData[][] = [];

      // First pass: fill each rank slot [mainValue down to minVal] with natural cards
      for (let v = mainValue; v >= minVal; v--) {
        const slot: CardData[] = [];
        for (const c of sorted) {
          if (slot.length < unitSize && !usedIds.has(c.id) && !isWildCard(c) && c.value === v) {
            slot.push(c);
            usedIds.add(c.id);
          }
        }
        // Native wild card of exact rank v
        for (const c of sorted) {
          if (slot.length < unitSize && !usedIds.has(c.id) && isWildCard(c) && c.value === v) {
            slot.push(c);
            usedIds.add(c.id);
          }
        }
        coreSlots.push(slot);
      }

      // Second pass: fill missing core slots using remaining wild cards
      for (const slot of coreSlots) {
        while (slot.length < unitSize) {
          const wild = sorted.find((c) => !usedIds.has(c.id) && isWildCard(c));
          if (!wild) break;
          slot.push(wild);
          usedIds.add(wild.id);
        }
      }

      const orderedCore = coreSlots.flat();
      const wingCards = sorted.filter((c) => !usedIds.has(c.id));
      const wingFreq = new Map<number, number>();
      for (const w of wingCards) {
        wingFreq.set(w.value, (wingFreq.get(w.value) ?? 0) + 1);
      }
      wingCards.sort((a, b) => {
        const fa = wingFreq.get(a.value) ?? 1;
        const fb = wingFreq.get(b.value) ?? 1;
        if (fb !== fa) return fb - fa;
        return b.value - a.value;
      });
      return [...orderedCore, ...wingCards];
    }

    return sorted;
  }

  static countByValue(cards: CardData[]): Map<number, CardData[]> {
    const map = new Map<number, CardData[]>();
    for (const card of cards) {
      const list = map.get(card.value) ?? [];
      list.push(card);
      map.set(card.value, list);
    }
    return map;
  }

  /**
   * Authoritative Priority-Queue Pattern Recognition Engine.
   * Evaluates all legal interpretations of `cards` (including Laizi wild substitutions)
   * and returns the highest-priority pattern from the commercial Dou Dizhu Priority Queue:
   *   1. Rocket (王炸)
   *   2. Bomb (纯赖子炸 > 硬炸弹 > 软炸弹)
   *   3. Airplane with Pair Wings / Single Wings / Pure Airplane (飞机)
   *   4. Consecutive Pairs (连对)
   *   5. Straight (顺子)
   *   6. Triple with Pair / Single / Pure Triple (三带)
   *   7. Four with Two Pairs / Two Singles (四带二)
   *   8. Pair / Single (对子 / 单张)
   */
  static identifyPattern(cards: CardData[], wildRanks: Rank[] = []): ClassifiedPattern | null {
    const n = cards.length;
    if (n === 0) return null;

    const sorted = this.sortCardsDesc(cards);
    const wildSet = new Set<Rank>(wildRanks);
    const wildCards = sorted.filter((c) => Boolean(c.isWild || wildSet.has(c.rank)));

    // Fast path when no wild cards are present in the played set
    if (wildCards.length === 0) {
      const nativeCandidates = this.enumerateNativePatterns(sorted, wildRanks);
      if (nativeCandidates.length === 0) return null;
      nativeCandidates.sort((a, b) => this.comparePatternPriority(b, a));
      return nativeCandidates[0];
    }

    // Pure Laizi Bomb (4 wild cards)
    if (n === 4 && wildCards.length === 4) {
      return this.buildClassifiedPattern(
        PatternType.BOMB,
        '纯赖子炸',
        sorted[0].value,
        4,
        1,
        sorted,
        wildRanks,
        { bombTier: 3 }
      );
    }

    // Evaluate all candidates across native + Laizi priority queue
    const allCandidates = this.identifyAllPatterns(sorted, wildRanks);
    if (allCandidates.length > 0) {
      allCandidates.sort((a, b) => this.comparePatternPriority(b, a));
      return allCandidates[0];
    }

    // Fallback for >5 wild cards edge case
    return this.identifyLaiziPattern(sorted, wildCards, wildRanks);
  }

  /**
   * Compares two candidate interpretations of the same played card set according to
   * the commercial Dou Dizhu Priority Queue (`PATTERN_PRIORITY`), then `bombTier`,
   * then `chainCount`, then `mainValue`.
   */
  static comparePatternPriority(a: ClassifiedPattern, b: ClassifiedPattern): number {
    const pa = a.priority ?? PATTERN_PRIORITY[a.type] ?? 0;
    const pb = b.priority ?? PATTERN_PRIORITY[b.type] ?? 0;
    if (pa !== pb) return pa - pb;
    const ta = a.bombTier ?? 0;
    const tb = b.bombTier ?? 0;
    if (ta !== tb) return ta - tb;
    if (a.chainCount !== b.chainCount) return a.chainCount - b.chainCount;
    return a.mainValue - b.mainValue;
  }

  private static buildClassifiedPattern(
    type: PatternType,
    label: string,
    mainValue: number,
    length: number,
    chainCount: number,
    rawCards: CardData[],
    wildRanks: Rank[],
    extra: Partial<ClassifiedPattern> = {}
  ): ClassifiedPattern {
    const orderedCards = this.orderCardsForPattern(
      rawCards,
      type,
      mainValue,
      chainCount,
      wildRanks
    );
    const basePriority = PATTERN_PRIORITY[type] ?? 0;
    const priority =
      type === PatternType.BOMB
        ? basePriority + (extra.bombTier ?? 2) * 15
        : basePriority;

    return {
      type,
      label,
      mainValue,
      length,
      chainCount,
      cards: orderedCards,
      priority,
      ...extra,
    };
  }

  /**
   * Wild-Card (赖子) Pattern Resolver using Priority Queue Order:
   * Prevents phantom rank hallucinations by requiring the main Triple/Quad rank
   * to be anchored by at least 1 natural card or the wild card's own rank.
   */
  private static identifyLaiziPattern(
    sorted: CardData[],
    wildCards: CardData[],
    wildRanks: Rank[] = []
  ): ClassifiedPattern | null {
    const n = sorted.length;
    const wCount = wildCards.length;
    const wildIds = new Set(wildCards.map((c) => c.id));
    const naturals = sorted.filter((c) => !wildIds.has(c.id));
    const natMap = this.countByValue(naturals);
    const natVals = Array.from(natMap.keys()).sort((a, b) => a - b);
    const wildOwnVals = new Set(wildCards.map((c) => c.value));
    const hasJokersInNaturals = natVals.some((v) => v >= 16);

    // 1. Single (1 card)
    if (n === 1) {
      return this.buildClassifiedPattern(
        PatternType.SINGLE,
        '单张',
        sorted[0].value,
        1,
        1,
        sorted,
        wildRanks
      );
    }

    // 2. Pair (2 cards; wild cannot pair with a Joker)
    if (n === 2) {
      if (hasJokersInNaturals) return null;
      const mainVal = naturals.length === 1 ? naturals[0].value : sorted[0].value;
      return this.buildClassifiedPattern(
        PatternType.PAIR,
        '对子',
        mainVal,
        2,
        1,
        sorted,
        wildRanks
      );
    }

    // 3. Triple (3 cards; cannot combine with Jokers)
    if (n === 3) {
      if (hasJokersInNaturals) return null;
      if (natVals.length <= 1) {
        const mainVal = natVals.length === 1 ? natVals[0] : sorted[0].value;
        return this.buildClassifiedPattern(
          PatternType.TRIPLE,
          '三不带',
          mainVal,
          3,
          1,
          sorted,
          wildRanks
        );
      }
      return null;
    }

    // 4. 4 Cards: Soft Bomb (软炸弹) vs Triple + Single (三带一)
    if (n === 4) {
      if (!hasJokersInNaturals && natVals.length === 1) {
        return this.buildClassifiedPattern(
          PatternType.BOMB,
          '软炸弹',
          natVals[0],
          4,
          1,
          sorted,
          wildRanks,
          { bombTier: 1 }
        );
      }
      // Triple + Single: rank v must exist in naturals OR be one of the wild cards' own rank
      for (let v = 15; v >= 3; v--) {
        const natCount = natMap.get(v)?.length ?? 0;
        if (natCount === 0 && !wildOwnVals.has(v)) continue;
        const needed = Math.max(0, 3 - natCount);
        if (needed <= wCount) {
          return this.buildClassifiedPattern(
            PatternType.TRIPLE_SINGLE,
            '三带一',
            v,
            4,
            1,
            sorted,
            wildRanks
          );
        }
      }
      return null;
    }

    // 5. 5 Cards: Straight (顺子) vs Triple + Pair (三带一对)
    if (n === 5) {
      const straight5 = this.tryMatchLaiziStraight(natMap, wCount, 5);
      if (straight5 !== null) {
        return this.buildClassifiedPattern(
          PatternType.STRAIGHT,
          '顺子',
          straight5,
          5,
          5,
          sorted,
          wildRanks
        );
      }

      if (!hasJokersInNaturals && natVals.length <= 2) {
        for (let tripleV = 15; tripleV >= 3; tripleV--) {
          const cT = natMap.get(tripleV)?.length ?? 0;
          if (cT === 0 && !wildOwnVals.has(tripleV)) continue;
          for (let pairV = 15; pairV >= 3; pairV--) {
            if (tripleV === pairV) continue;
            const cP = natMap.get(pairV)?.length ?? 0;
            if (cP === 0 && !wildOwnVals.has(pairV)) continue;
            const otherNats = natVals.filter((v) => v !== tripleV && v !== pairV);
            if (otherNats.length > 0) continue;
            if (cT <= 3 && cP <= 2 && 3 - cT + (2 - cP) === wCount) {
              return this.buildClassifiedPattern(
                PatternType.TRIPLE_PAIR,
                '三带一对',
                tripleV,
                5,
                1,
                sorted,
                wildRanks
              );
            }
          }
        }
      }
      return null;
    }

    // 6. Airplane (Pure, Single Wings, or Pair Wings) — Priority 800..820
    const airplanePattern = this.tryMatchLaiziAirplane(sorted, natMap, wCount, wildRanks);
    if (airplanePattern) {
      return airplanePattern;
    }

    // 7. Consecutive Pairs (n >= 6 && n % 2 === 0) — Priority 700
    if (n >= 6 && n % 2 === 0) {
      const pairCount = n / 2;
      const consecPairsMain = this.tryMatchLaiziConsecutivePairs(natMap, wCount, pairCount);
      if (consecPairsMain !== null) {
        return this.buildClassifiedPattern(
          PatternType.CONSECUTIVE_PAIRS,
          '连对',
          consecPairsMain,
          n,
          pairCount,
          sorted,
          wildRanks
        );
      }
    }

    // 8. Straight (n >= 5) — Priority 600
    const straightMain = this.tryMatchLaiziStraight(natMap, wCount, n);
    if (straightMain !== null) {
      return this.buildClassifiedPattern(
        PatternType.STRAIGHT,
        '顺子',
        straightMain,
        n,
        n,
        sorted,
        wildRanks
      );
    }

    // 9. Four with Two Singles (n === 6) or Four with Two Pairs (n === 8) — Priority 410..420
    if (n === 6) {
      const carriesRocket = natMap.has(16) && natMap.has(17);
      if (!carriesRocket) {
        for (let qv = 15; qv >= 3; qv--) {
          const natCount = natMap.get(qv)?.length ?? 0;
          if (natCount >= 1 && 4 - natCount <= wCount) {
            return this.buildClassifiedPattern(
              PatternType.FOUR_WITH_TWO_SINGLES,
              '四带二',
              qv,
              6,
              1,
              sorted,
              wildRanks
            );
          }
        }
      }
    }

    if (n === 8) {
      for (let qv = 15; qv >= 3; qv--) {
        const natCount = natMap.get(qv)?.length ?? 0;
        if (natCount === 0 && !wildOwnVals.has(qv)) continue;
        const neededWildsForQuad = Math.max(0, 4 - natCount);
        if (neededWildsForQuad > wCount) continue;
        const remWilds = wCount - neededWildsForQuad;

        let pairsCount = 0;
        let wildsForPairs = 0;
        let valid = true;

        for (const [v, grp] of natMap.entries()) {
          if (v === qv) continue;
          if (v >= 16) {
            valid = false;
            break;
          }
          if (grp.length % 2 === 1) {
            wildsForPairs += 1;
            pairsCount += (grp.length + 1) / 2;
          } else {
            pairsCount += grp.length / 2;
          }
        }

        if (valid && wildsForPairs <= remWilds && (remWilds - wildsForPairs) % 2 === 0) {
          pairsCount += (remWilds - wildsForPairs) / 2;
          if (pairsCount === 2) {
            return this.buildClassifiedPattern(
              PatternType.FOUR_WITH_TWO_PAIRS,
              '四带两对',
              qv,
              8,
              1,
              sorted,
              wildRanks
            );
          }
        }
      }
    }

    return null;
  }

  private static tryMatchLaiziStraight(
    natMap: Map<number, CardData[]>,
    _wCount: number,
    length: number
  ): number | null {
    for (const [v, grp] of natMap.entries()) {
      if (v > 14 || grp.length > 1) return null;
    }

    for (let maxVal = 14; maxVal >= 3 + length - 1; maxVal--) {
      const minVal = maxVal - length + 1;
      let outside = false;
      for (const v of natMap.keys()) {
        if (v < minVal || v > maxVal) {
          outside = true;
          break;
        }
      }
      if (!outside) {
        return maxVal;
      }
    }
    return null;
  }

  private static tryMatchLaiziConsecutivePairs(
    natMap: Map<number, CardData[]>,
    wCount: number,
    pairCount: number
  ): number | null {
    for (const [v, grp] of natMap.entries()) {
      if (v > 14 || grp.length > 2) return null;
    }

    for (let maxVal = 14; maxVal >= 3 + pairCount - 1; maxVal--) {
      const minVal = maxVal - pairCount + 1;
      let outside = false;
      let neededWilds = 0;
      for (const v of natMap.keys()) {
        if (v < minVal || v > maxVal) {
          outside = true;
          break;
        }
      }
      if (outside) continue;

      for (let v = minVal; v <= maxVal; v++) {
        const have = natMap.get(v)?.length ?? 0;
        neededWilds += 2 - have;
      }
      if (neededWilds === wCount) {
        return maxVal;
      }
    }
    return null;
  }

  private static tryMatchLaiziAirplane(
    sorted: CardData[],
    natMap: Map<number, CardData[]>,
    wCount: number,
    wildRanks: Rank[] = []
  ): ClassifiedPattern | null {
    const n = sorted.length;
    for (let k = 6; k >= 2; k--) {
      if (n !== 3 * k && n !== 4 * k && n !== 5 * k) continue;

      for (let maxVal = 14; maxVal >= 3 + k - 1; maxVal--) {
        const minVal = maxVal - k + 1;
        let wildsForCore = 0;
        let possible = true;

        for (let v = minVal; v <= maxVal; v++) {
          const have = Math.min(3, natMap.get(v)?.length ?? 0);
          wildsForCore += 3 - have;
        }
        if (wildsForCore > wCount) continue;

        if (n === 3 * k) {
          for (const [v, grp] of natMap.entries()) {
            if (v < minVal || v > maxVal || grp.length > 3) {
              possible = false;
              break;
            }
          }
          if (possible && wildsForCore === wCount) {
            return this.buildClassifiedPattern(
              PatternType.AIRPLANE,
              '飞机',
              maxVal,
              n,
              k,
              sorted,
              wildRanks
            );
          }
        } else if (n === 4 * k) {
          const carriesRocket = natMap.has(16) && natMap.has(17);
          if (!carriesRocket) {
            return this.buildClassifiedPattern(
              PatternType.AIRPLANE_SINGLE_WINGS,
              '飞机带翅膀',
              maxVal,
              n,
              k,
              sorted,
              wildRanks
            );
          }
        } else if (n === 5 * k) {
          const remWilds = wCount - wildsForCore;
          let wildsForWings = 0;
          for (const [v, grp] of natMap.entries()) {
            const usedInCore = v >= minVal && v <= maxVal ? Math.min(3, grp.length) : 0;
            const rem = grp.length - usedInCore;
            if (rem === 0) continue;
            if (v >= 16 || rem > 4) {
              possible = false;
              break;
            }
            if (rem % 2 === 1) wildsForWings += 1;
          }
          if (possible && wildsForWings <= remWilds && (remWilds - wildsForWings) % 2 === 0) {
            return this.buildClassifiedPattern(
              PatternType.AIRPLANE_PAIR_WINGS,
              '飞机带双翼',
              maxVal,
              n,
              k,
              sorted,
              wildRanks
            );
          }
        }
      }
    }
    return null;
  }

  /**
   * Resolve `cards` against an optional `target` using the Priority Queue.
   * If `target` is null (free lead), returns the highest-priority interpretation.
   * If `target` is present, prefers an interpretation of the exact same pattern type
   * that beats `target` (or a Bomb/Rocket if no same-type match exists).
   */
  static identifyPatternFor(
    cards: CardData[],
    wildRanks: Rank[] = [],
    target: ClassifiedPattern | null = null
  ): ClassifiedPattern | null {
    const primary = this.identifyPattern(cards, wildRanks);
    if (!target) return primary;
    if (primary && primary.type === target.type && this.canBeat(primary, target)) {
      return primary;
    }

    const all = this.identifyAllPatterns(cards, wildRanks);
    const beatingCandidates = all.filter((alt) => this.canBeat(alt, target));
    if (beatingCandidates.length === 0) return primary;

    // Prefer matching target's exact PatternType first, then sort by priority queue
    beatingCandidates.sort((a, b) => {
      const aSameType = a.type === target.type ? 1 : 0;
      const bSameType = b.type === target.type ? 1 : 0;
      if (aSameType !== bSameType) return bSameType - aSameType;
      return this.comparePatternPriority(b, a);
    });
    return beatingCandidates[0];
  }

  private static readonly MAX_WILDS_FOR_ENUMERATION = 5;

  /**
   * Enumerates every legal interpretation of `cards`, sorted by the commercial Priority Queue.
   */
  static identifyAllPatterns(cards: CardData[], wildRanks: Rank[] = []): ClassifiedPattern[] {
    if (cards.length === 0) return [];
    const sorted = this.sortCardsDesc(cards);
    const wildSet = new Set<Rank>(wildRanks);
    const wilds = sorted.filter((c) => Boolean(c.isWild || wildSet.has(c.rank)));
    const naturals = sorted.filter((c) => !(c.isWild || wildSet.has(c.rank)));
    const wildOwnVals = new Set(wilds.map((c) => c.value));
    const natVals = new Set(naturals.map((c) => c.value));
    const seen = new Set<string>();
    const out: ClassifiedPattern[] = [];

    const push = (p: ClassifiedPattern, tier: number | undefined) => {
      // Prevent phantom Triple/Quad mainValue when wilds substitute a rank not present in naturals or wilds
      if (
        wilds.length > 0 &&
        (p.type === PatternType.TRIPLE ||
          p.type === PatternType.TRIPLE_SINGLE ||
          p.type === PatternType.TRIPLE_PAIR ||
          p.type === PatternType.FOUR_WITH_TWO_SINGLES ||
          p.type === PatternType.FOUR_WITH_TWO_PAIRS ||
          p.type === PatternType.BOMB)
      ) {
        if (!natVals.has(p.mainValue) && !wildOwnVals.has(p.mainValue)) {
          return;
        }
      }

      const effectiveTier = p.type === PatternType.BOMB ? tier : p.bombTier;
      const effectiveLabel =
        p.type === PatternType.BOMB
          ? effectiveTier === 3
            ? '纯赖子炸'
            : effectiveTier === 1
              ? '软炸弹'
              : '硬炸弹'
          : p.label;

      const built = this.buildClassifiedPattern(
        p.type,
        effectiveLabel,
        p.mainValue,
        p.length,
        p.chainCount,
        sorted,
        wildRanks,
        {
          bombTier: effectiveTier,
          candidateQuads: p.candidateQuads,
        }
      );

      const key = `${built.type}|${built.length}|${built.chainCount}|${built.mainValue}|${built.bombTier ?? 0}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(built);
    };

    if (wilds.length === 0) {
      for (const p of this.enumerateNativePatterns(sorted, wildRanks)) {
        push(p, p.bombTier);
      }
      out.sort((a, b) => this.comparePatternPriority(b, a));
      return out;
    }
    if (wilds.length > this.MAX_WILDS_FOR_ENUMERATION) return out;

    // Also include native non-substituted patterns (e.g. if wild card acts as its own natural rank)
    for (const p of this.enumerateNativePatterns(sorted, wildRanks)) {
      const isPureWildBomb = p.type === PatternType.BOMB && wilds.length === 4 && naturals.length === 0;
      const isHardBomb = p.type === PatternType.BOMB && wilds.length === 0;
      const tier = isPureWildBomb ? 3 : isHardBomb ? 2 : p.type === PatternType.BOMB ? 1 : p.bombTier;
      push(p, tier);
    }

    const bombTier = wilds.length === 4 && naturals.length === 0 ? 3 : 1;
    const assigned: number[] = new Array(wilds.length).fill(3);
    const rec = (idx: number, minV: number) => {
      if (idx === wilds.length) {
        const virtual = [
          ...naturals,
          ...wilds.map((c, i) => ({
            ...c,
            value: assigned[i],
            rank: VALUE_TO_RANK[assigned[i]],
          })),
        ];
        for (const p of this.enumerateNativePatterns(this.sortCardsDesc(virtual), wildRanks)) {
          if (p.type === PatternType.ROCKET) continue;
          push(p, p.type === PatternType.BOMB ? bombTier : undefined);
        }
        return;
      }
      for (let v = minV; v <= 15; v++) {
        assigned[idx] = v;
        rec(idx + 1, v);
      }
    };
    rec(0, 3);

    out.sort((a, b) => this.comparePatternPriority(b, a));
    return out;
  }

  /**
   * Enumerates all native (no wild substitution) interpretations of `sorted` in Priority Queue order.
   */
  private static enumerateNativePatterns(
    sorted: CardData[],
    wildRanks: Rank[] = []
  ): ClassifiedPattern[] {
    const n = sorted.length;
    const res: ClassifiedPattern[] = [];
    if (n === 0) return res;
    const valMap = this.countByValue(sorted);
    const vals = Array.from(valMap.keys()).sort((a, b) => a - b);
    const cnt = (v: number) => valMap.get(v)?.length ?? 0;
    const mk = (
      type: PatternType,
      label: string,
      mainValue: number,
      chainCount: number,
      extra: Partial<ClassifiedPattern> = {}
    ): void => {
      res.push(
        this.buildClassifiedPattern(type, label, mainValue, n, chainCount, sorted, wildRanks, extra)
      );
    };

    // Priority 1: Single / Pair / Rocket / Triple / Bomb
    if (n === 1) mk(PatternType.SINGLE, '单张', sorted[0].value, 1);
    if (n === 2) {
      if (cnt(16) === 1 && cnt(17) === 1) mk(PatternType.ROCKET, '王炸', 17, 1, { bombTier: 4 });
      else if (vals.length === 1) mk(PatternType.PAIR, '对子', vals[0], 1);
    }
    if (n === 3 && vals.length === 1) mk(PatternType.TRIPLE, '三不带', vals[0], 1);
    if (n === 4) {
      if (vals.length === 1) mk(PatternType.BOMB, '硬炸弹', vals[0], 1, { bombTier: 2 });
      else {
        const t = vals.find((v) => cnt(v) === 3);
        if (t !== undefined) mk(PatternType.TRIPLE_SINGLE, '三带一', t, 1);
      }
    }
    if (n === 5) {
      const t = vals.find((v) => cnt(v) === 3);
      if (t !== undefined && vals.some((v) => cnt(v) === 2)) {
        mk(PatternType.TRIPLE_PAIR, '三带一对', t, 1);
      }
    }

    // Priority 2: Airplanes (evaluated before Four-with-Two so 33334444 prioritizes Airplane with wings)
    const tripleVals = vals.filter((v) => v <= 14 && cnt(v) >= 3);
    for (let k = tripleVals.length; k >= 2; k--) {
      for (let s = tripleVals.length - k; s >= 0; s--) {
        const seq = tripleVals.slice(s, s + k);
        if (seq[k - 1] - seq[0] !== k - 1) continue;
        const top = seq[k - 1];
        if (n === 3 * k) mk(PatternType.AIRPLANE, '飞机', top, k);
        if (n === 4 * k) {
          const leftover = (v: number) => cnt(v) - (seq.includes(v) ? 3 : 0);
          if (!(leftover(16) > 0 && leftover(17) > 0)) {
            mk(PatternType.AIRPLANE_SINGLE_WINGS, '飞机带翅膀', top, k);
          }
        }
        if (n === 5 * k) {
          let pairs = 0;
          let ok = true;
          for (const v of vals) {
            const rem = cnt(v) - (seq.includes(v) ? 3 : 0);
            if (rem === 0) continue;
            if (rem % 2 === 0 && v < 16) pairs += rem / 2;
            else ok = false;
          }
          if (ok && pairs === k) mk(PatternType.AIRPLANE_PAIR_WINGS, '飞机带双翼', top, k);
        }
      }
    }

    // Priority 3: Consecutive pairs
    if (n >= 6 && n % 2 === 0 && vals.length === n / 2 && vals.every((v) => cnt(v) === 2)) {
      if (vals[vals.length - 1] <= 14 && vals[vals.length - 1] - vals[0] === vals.length - 1) {
        mk(PatternType.CONSECUTIVE_PAIRS, '连对', vals[vals.length - 1], vals.length);
      }
    }

    // Priority 4: Straight
    if (n >= 5 && vals.length === n && vals[n - 1] <= 14 && vals[n - 1] - vals[0] === n - 1) {
      mk(PatternType.STRAIGHT, '顺子', vals[n - 1], n);
    }

    // Priority 5: Four with two singles / two pairs
    const quads = vals.filter((v) => cnt(v) === 4);
    if (quads.length > 0 && n === 6 && !(cnt(16) && cnt(17))) {
      mk(PatternType.FOUR_WITH_TWO_SINGLES, '四带二', quads[quads.length - 1], 1, {
        candidateQuads: quads,
      });
    }
    if (quads.length > 0 && n === 8) {
      for (let i = quads.length - 1; i >= 0; i--) {
        const q = quads[i];
        let pairs = 0;
        let ok = true;
        for (const v of vals) {
          if (v === q) continue;
          if (cnt(v) === 2) pairs += 1;
          else if (cnt(v) === 4) pairs += 2;
          else ok = false;
        }
        if (ok && pairs === 2) {
          mk(PatternType.FOUR_WITH_TWO_PAIRS, '四带两对', q, 1, { candidateQuads: quads });
          break;
        }
      }
    }

    res.sort((a, b) => this.comparePatternPriority(b, a));
    return res;
  }

  /**
   * Authoritative comparison between candidate pattern and previous played pattern.
   * Respects Laizi Bomb Hierarchy: Soft Bomb (1) < Hard Bomb (2) < Pure Laizi Bomb (3) < Rocket (4).
   */
  static canBeat(candidate: ClassifiedPattern, target: ClassifiedPattern | null): boolean {
    if (!target) return true;

    if (candidate.type === PatternType.ROCKET) return true;
    if (target.type === PatternType.ROCKET) return false;

    if (candidate.type === PatternType.BOMB) {
      if (target.type !== PatternType.BOMB) return true;
      const candTier = candidate.bombTier ?? 2;
      const targetTier = target.bombTier ?? 2;
      if (candTier !== targetTier) {
        return candTier > targetTier;
      }
      return candidate.mainValue > target.mainValue;
    }

    if (candidate.type !== target.type) return false;
    if (candidate.length !== target.length) return false;
    if (candidate.chainCount !== target.chainCount) return false;

    if (candidate.candidateQuads && candidate.candidateQuads.length > 0) {
      return candidate.candidateQuads.some((q) => q > target.mainValue);
    }

    return candidate.mainValue > target.mainValue;
  }

  /**
   * 15-Rank Histogram (`Int32Array(15)`) & Heuristic Zero-Loss Wing Extraction
   * Index 0..14 maps strictly to values 3..17:
   *   0:'3', 1:'4', 2:'5', 3:'6', 4:'7', 5:'8', 6:'9', 7:'10',
   *   8:'J', 9:'Q', 10:'K', 11:'A', 12:'2', 13:'small_joker', 14:'big_joker'
   */
  static valueToHistIndex(value: number): number {
    return Math.max(0, Math.min(14, value - 3));
  }

  static histIndexToValue(index: number): number {
    return index + 3;
  }

  static buildHistogram15(cards: CardData[]): Int32Array {
    const hist = new Int32Array(15);
    for (const c of cards) {
      const idx = this.valueToHistIndex(c.value);
      hist[idx] += 1;
    }
    return hist;
  }

  static wouldBreakStraightSkeleton(
    hist: Int32Array,
    rankIdx: number,
    removeCount: number
  ): boolean {
    if (rankIdx > 11) return false;
    const remaining = hist[rankIdx] - removeCount;
    if (remaining >= 1) return false;

    let left = rankIdx;
    while (left - 1 >= 0 && hist[left - 1] >= 1) {
      left--;
    }
    let right = rankIdx;
    while (right + 1 <= 11 && hist[right + 1] >= 1) {
      right++;
    }
    const currentSpan = right - left + 1;
    if (currentSpan < 5) return false;

    const leftSpan = rankIdx - left;
    const rightSpan = right - rankIdx;
    return leftSpan < 5 && rightSpan < 5;
  }

  static wouldBreakConsecutivePairs(
    hist: Int32Array,
    rankIdx: number,
    removeCount: number
  ): boolean {
    if (rankIdx > 11 || hist[rankIdx] < 2) return false;
    const remaining = hist[rankIdx] - removeCount;
    if (remaining >= 2) return false;

    let left = rankIdx;
    while (left - 1 >= 0 && hist[left - 1] >= 2) {
      left--;
    }
    let right = rankIdx;
    while (right + 1 <= 11 && hist[right + 1] >= 2) {
      right++;
    }
    if (right - left + 1 < 3) return false;
    const leftLen = rankIdx - left;
    const rightLen = right - rankIdx;
    return leftLen < 3 && rightLen < 3;
  }

  static evaluateWingPenalty(
    hist: Int32Array,
    idx: number,
    needCount: 1 | 2,
    wildIndices: Set<number>
  ): number {
    const count = hist[idx];
    if (count < needCount) return 999999;

    if ((idx === 13 || idx === 14) && hist[13] >= 1 && hist[14] >= 1) {
      return 99999;
    }

    if (count === 4) {
      if (needCount === 2) {
        return 3200;
      }
      return 5500;
    }

    let penalty = idx * 1.5;

    if (wildIndices.has(idx)) {
      penalty += 800;
    }

    if (idx === 14) penalty += 220;
    else if (idx === 13) penalty += 180;
    else if (idx === 12) penalty += 120;
    else if (idx === 11) penalty += 38;

    if (count === 3) {
      penalty += 260;
    }

    if (count === 2 && needCount === 1) {
      penalty += 55;
    }

    if (this.wouldBreakStraightSkeleton(hist, idx, needCount)) {
      penalty += 145;
    }

    if (this.wouldBreakConsecutivePairs(hist, idx, needCount)) {
      penalty += 110;
    }

    return penalty;
  }

  static selectOptimalWings(
    allCards: CardData[],
    excludedCardIds: Set<string>,
    excludedRanks: Set<number>,
    wingCount: number,
    wingSize: 1 | 2,
    wildRanks: Rank[] = []
  ): CardData[] | null {
    const candidatePool = allCards.filter(
      (c) => !excludedCardIds.has(c.id) && !excludedRanks.has(c.value)
    );
    const hist = this.buildHistogram15(candidatePool);
    const byIdx = new Map<number, CardData[]>();
    for (const c of candidatePool) {
      const idx = this.valueToHistIndex(c.value);
      const list = byIdx.get(idx) ?? [];
      if (c.isWild) list.push(c);
      else list.unshift(c);
      byIdx.set(idx, list);
    }

    const wildIndices = new Set<number>(
      wildRanks.map((r) => this.valueToHistIndex(RANK_VALUES[r]))
    );

    const scoredRanks: Array<{ idx: number; penalty: number }> = [];
    for (let idx = 0; idx < 15; idx++) {
      if (wingSize === 2 && idx >= 13) continue;
      if (hist[idx] >= wingSize) {
        const penalty = this.evaluateWingPenalty(hist, idx, wingSize, wildIndices);
        if (penalty < 40000) {
          scoredRanks.push({ idx, penalty });
          if (wingCount > 1 && idx < 13) {
            const maxUnits = Math.floor(hist[idx] / wingSize);
            for (let copy = 2; copy <= maxUnits; copy++) {
              scoredRanks.push({ idx, penalty: penalty + 60 * (copy - 1) });
            }
          }
        }
      }
    }

    scoredRanks.sort((a, b) => a.penalty - b.penalty);

    if (scoredRanks.length < wingCount) {
      return null;
    }

    const chosenRanks = scoredRanks.slice(0, wingCount);
    if (
      wingSize === 1 &&
      chosenRanks.some((r) => r.idx === 13) &&
      chosenRanks.some((r) => r.idx === 14)
    ) {
      if (scoredRanks.length > wingCount) {
        const replacement = scoredRanks[wingCount];
        const bigJokerPos = chosenRanks.findIndex((r) => r.idx === 14);
        if (bigJokerPos !== -1) {
          chosenRanks[bigJokerPos] = replacement;
        }
      } else {
        return null;
      }
    }

    const result: CardData[] = [];
    const usedCountByRank = new Map<number, number>();
    for (const item of chosenRanks) {
      const bucket = byIdx.get(item.idx) ?? [];
      const used = usedCountByRank.get(item.idx) ?? 0;
      result.push(...bucket.slice(used, used + wingSize));
      usedCountByRank.set(item.idx, used + wingSize);
    }
    return result;
  }

  static selectOptimalSwapThree(hand: CardData[]): CardData[] {
    if (hand.length <= 3) return [...hand];
    const hist = this.buildHistogram15(hand);
    const hasRocket = hist[13] >= 1 && hist[14] >= 1;

    const scored = hand.map((card) => {
      const idx = this.valueToHistIndex(card.value);
      const count = hist[idx];
      let keepScore = card.value * 2;

      if (card.isWild) keepScore += 900;
      if ((idx === 13 || idx === 14) && hasRocket) keepScore += 1000;
      if (idx >= 13) keepScore += 450;
      else if (idx === 12) keepScore += 280;
      else if (idx === 11) keepScore += 110;
      else if (idx === 10) keepScore += 55;

      if (count === 4) keepScore += 800;
      else if (count === 3) keepScore += 240;
      else if (count === 2) keepScore += 48;

      if (this.wouldBreakStraightSkeleton(hist, idx, 1)) {
        keepScore += 135;
      }
      if (this.wouldBreakConsecutivePairs(hist, idx, 1)) {
        keepScore += 95;
      }

      return { card, keepScore };
    });

    scored.sort((a, b) => a.keepScore - b.keepScore);
    return scored.slice(0, 3).map((s) => s.card);
  }

  static getMaxMultiplierForBaseScore(baseScore: number): number {
    if (baseScore >= 2000) return 256;
    if (baseScore >= 800) return 128;
    if (baseScore >= 500) return 96;
    if (baseScore >= 300) return 64;
    if (baseScore >= 200) return 48;
    return 32;
  }
}
