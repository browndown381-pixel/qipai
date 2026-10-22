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
  mainValue: number; // Primary rank value used for same-type comparison
  candidateQuads?: number[]; // All valid candidate quad values for four-with-two comparisons
  length: number;    // Total card count
  chainCount: number; // Number of consecutive units for straight/pairs/airplane
  cards: CardData[];
  /**
   * Bomb hierarchy for Laizi modes:
   * 1 = Soft Bomb (软炸弹: 1~3 wild cards + native cards)
   * 2 = Hard Bomb (硬炸弹: 4 native cards of identical rank)
   * 3 = Pure Laizi Bomb (纯赖子炸: 4 wild cards)
   * 4 = Rocket (王炸: small_joker + big_joker)
   */
  bombTier?: number;
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

  /**
   * Tencent Happy Dou Dizhu style "No-Shuffle" (不洗牌) Chunked Riffle & Clump Deal:
   * Preserves rank clumps and sequential runs while interleaving chunks and dealing in 3~4 card packets.
   */
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
   * Authoritative Pattern Recognition aligned with Tencent Happy Dou Dizhu Classic & Laizi Modes.
   * Supports Classic, Single-Laizi, and Heaven-Earth Dual-Laizi (天地赖子) with Soft/Hard/Pure Laizi Bomb tiers.
   */
  static identifyPattern(cards: CardData[], wildRanks: Rank[] = []): ClassifiedPattern | null {
    const n = cards.length;
    if (n === 0) return null;

    const sorted = this.sortCardsDesc(cards);
    const wildSet = new Set<Rank>(wildRanks);
    const wildCards = sorted.filter((c) => Boolean(c.isWild || wildSet.has(c.rank)));

    // Try native (non-substituted) pattern first if no wild cards or if native forms a hard bomb / rocket
    const nativePattern = this.identifyNativePattern(sorted);
    if (wildCards.length === 0) {
      return nativePattern;
    }

    // If all 4 cards are wild cards -> Pure Laizi Bomb (纯赖子炸, bombTier = 3)
    if (n === 4 && wildCards.length === 4) {
      return {
        type: PatternType.BOMB,
        label: '纯赖子炸',
        mainValue: sorted[0].value,
        length: 4,
        chainCount: 1,
        cards: sorted,
        bombTier: 3,
      };
    }

    // If native pattern is a Hard Bomb (4 identical cards, which means all 4 share the exact same rank),
    // wait: if that rank is itself a wild rank, 4 wild cards is already handled above as Pure Laizi Bomb.
    if (nativePattern && (nativePattern.type === PatternType.ROCKET || nativePattern.type === PatternType.BOMB)) {
      return nativePattern;
    }

    // Try Laizi-assisted pattern recognition
    const laiziPattern = this.identifyLaiziPattern(sorted, wildCards);
    if (laiziPattern) {
      return laiziPattern;
    }

    return nativePattern;
  }

  private static identifyNativePattern(sorted: CardData[]): ClassifiedPattern | null {
    const n = sorted.length;
    if (n === 0) return null;

    const valMap = this.countByValue(sorted);
    const distinctValues = Array.from(valMap.keys()).sort((a, b) => a - b);

    // 1. Single
    if (n === 1) {
      return {
        type: PatternType.SINGLE,
        label: '单张',
        mainValue: sorted[0].value,
        length: 1,
        chainCount: 1,
        cards: sorted,
      };
    }

    // 2. Rocket or Pair
    if (n === 2) {
      if (valMap.has(16) && valMap.has(17)) {
        return {
          type: PatternType.ROCKET,
          label: '王炸',
          mainValue: 17,
          length: 2,
          chainCount: 1,
          cards: sorted,
          bombTier: 4,
        };
      }
      if (distinctValues.length === 1) {
        return {
          type: PatternType.PAIR,
          label: '对子',
          mainValue: distinctValues[0],
          length: 2,
          chainCount: 1,
          cards: sorted,
        };
      }
      return null;
    }

    // 3. Triple
    if (n === 3) {
      if (distinctValues.length === 1) {
        return {
          type: PatternType.TRIPLE,
          label: '三不带',
          mainValue: distinctValues[0],
          length: 3,
          chainCount: 1,
          cards: sorted,
        };
      }
      return null;
    }

    // 4. Hard Bomb or Triple + Single
    if (n === 4) {
      if (distinctValues.length === 1) {
        return {
          type: PatternType.BOMB,
          label: '硬炸弹',
          mainValue: distinctValues[0],
          length: 4,
          chainCount: 1,
          cards: sorted,
          bombTier: 2,
        };
      }
      for (const [val, group] of valMap.entries()) {
        if (group.length === 3) {
          return {
            type: PatternType.TRIPLE_SINGLE,
            label: '三带一',
            mainValue: val,
            length: 4,
            chainCount: 1,
            cards: sorted,
          };
        }
      }
      return null;
    }

    // 5. Triple + Pair (5 cards)
    if (n === 5) {
      let tripleVal: number | null = null;
      let hasPair = false;
      for (const [val, group] of valMap.entries()) {
        if (group.length === 3) tripleVal = val;
        if (group.length === 2) hasPair = true;
      }
      if (tripleVal !== null && hasPair) {
        return {
          type: PatternType.TRIPLE_PAIR,
          label: '三带一对',
          mainValue: tripleVal,
          length: 5,
          chainCount: 1,
          cards: sorted,
        };
      }
    }

    // 6. Straight (≥5 consecutive singles, excludes 2 and Jokers: value <= 14)
    if (n >= 5 && distinctValues.length === n) {
      const maxVal = distinctValues[distinctValues.length - 1];
      const minVal = distinctValues[0];
      if (maxVal <= 14 && maxVal - minVal === n - 1) {
        return {
          type: PatternType.STRAIGHT,
          label: '顺子',
          mainValue: maxVal,
          length: n,
          chainCount: n,
          cards: sorted,
        };
      }
    }

    // 7. Consecutive Pairs (≥3 consecutive pairs, excludes 2 and Jokers: value <= 14)
    if (n >= 6 && n % 2 === 0 && distinctValues.length === n / 2) {
      const allPairs = distinctValues.every((v) => (valMap.get(v)?.length ?? 0) === 2);
      const maxVal = distinctValues[distinctValues.length - 1];
      const minVal = distinctValues[0];
      if (allPairs && maxVal <= 14 && maxVal - minVal === distinctValues.length - 1) {
        return {
          type: PatternType.CONSECUTIVE_PAIRS,
          label: '连对',
          mainValue: maxVal,
          length: n,
          chainCount: distinctValues.length,
          cards: sorted,
        };
      }
    }

    // 8. Four with Two Singles (6 cards) or Four with Two Pairs (8 cards)
    const quadValues = distinctValues.filter((v) => (valMap.get(v)?.length ?? 0) === 4);
    if (quadValues.length >= 1) {
      if (n === 6) {
        const carriesRocket = valMap.has(16) && valMap.has(17);
        if (!carriesRocket) {
          return {
            type: PatternType.FOUR_WITH_TWO_SINGLES,
            label: '四带二',
            mainValue: quadValues[quadValues.length - 1],
            candidateQuads: quadValues,
            length: 6,
            chainCount: 1,
            cards: sorted,
          };
        }
      }
      if (n === 8) {
        // Can be 1 quad + 2 pairs (e.g. 4444 + 55 + 66)
        // OR 2 quads (e.g. 4444 + 5555, where one is the quad and the other is two pairs 55+55 or 44+44)
        for (let i = quadValues.length - 1; i >= 0; i--) {
          const qVal = quadValues[i];
          let validPairs = true;
          let pairCount = 0;
          for (const [v, grp] of valMap.entries()) {
            if (v === qVal) continue;
            if (grp.length === 2) {
              pairCount += 1;
            } else if (grp.length === 4) {
              pairCount += 2;
            } else {
              validPairs = false;
              break;
            }
          }
          if (validPairs && pairCount === 2) {
            return {
              type: PatternType.FOUR_WITH_TWO_PAIRS,
              label: '四带两对',
              mainValue: qVal,
              candidateQuads: quadValues,
              length: 8,
              chainCount: 1,
              cards: sorted,
            };
          }
        }
      }
    }

    // 9. Airplane (Pure, Single Wings, or Pair Wings)
    const tripleCandidateVals = distinctValues.filter(
      (v) => v <= 14 && (valMap.get(v)?.length ?? 0) >= 3
    );

    if (tripleCandidateVals.length >= 2) {
      for (let k = tripleCandidateVals.length; k >= 2; k--) {
        for (let startIdx = tripleCandidateVals.length - k; startIdx >= 0; startIdx--) {
          const seq = tripleCandidateVals.slice(startIdx, startIdx + k);
          if (seq[seq.length - 1] - seq[0] !== k - 1) continue;

          if (n === 3 * k) {
            return {
              type: PatternType.AIRPLANE,
              label: '飞机',
              mainValue: seq[seq.length - 1],
              length: n,
              chainCount: k,
              cards: sorted,
            };
          }

          if (n === 4 * k) {
            const leftoverCounts = new Map<number, number>();
            for (const [v, grp] of valMap.entries()) {
              const used = seq.includes(v) ? 3 : 0;
              const rem = grp.length - used;
              if (rem > 0) leftoverCounts.set(v, rem);
            }
            const hasRocketWing = leftoverCounts.has(16) && leftoverCounts.has(17);
            if (!hasRocketWing) {
              return {
                type: PatternType.AIRPLANE_SINGLE_WINGS,
                label: '飞机带翅膀',
                mainValue: seq[seq.length - 1],
                length: n,
                chainCount: k,
                cards: sorted,
              };
            }
          }

          if (n === 5 * k) {
            let validPairs = true;
            let pairCount = 0;
            for (const [v, grp] of valMap.entries()) {
              const used = seq.includes(v) ? 3 : 0;
              const rem = grp.length - used;
              if (rem === 0) continue;
              if (rem % 2 === 0 && v < 16) {
                pairCount += rem / 2;
              } else {
                validPairs = false;
                break;
              }
            }
            if (validPairs && pairCount === k) {
              return {
                type: PatternType.AIRPLANE_PAIR_WINGS,
                label: '飞机带双翼',
                mainValue: seq[seq.length - 1],
                length: n,
                chainCount: k,
                cards: sorted,
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Wild-Card (赖子) Pattern Resolver:
   * Wild cards can substitute any non-Joker rank (3..2, values 3..15).
   * Evaluates Soft Bomb first, then resolves optimal highest-mainValue pattern.
   */
  private static identifyLaiziPattern(
    sorted: CardData[],
    wildCards: CardData[]
  ): ClassifiedPattern | null {
    const n = sorted.length;
    const wCount = wildCards.length;
    const wildIds = new Set(wildCards.map((c) => c.id));
    const naturals = sorted.filter((c) => !wildIds.has(c.id));
    const natMap = this.countByValue(naturals);
    const natVals = Array.from(natMap.keys()).sort((a, b) => a - b);
    const hasJokersInNaturals = natVals.some((v) => v >= 16);

    // 1. Single (1 wild card)
    if (n === 1) {
      return {
        type: PatternType.SINGLE,
        label: '单张',
        mainValue: sorted[0].value,
        length: 1,
        chainCount: 1,
        cards: sorted,
      };
    }

    // 2. Pair (2 cards with >=1 wild; note: wild cannot pair with a Joker)
    if (n === 2) {
      if (hasJokersInNaturals) return null;
      const mainVal = naturals.length === 1 ? naturals[0].value : sorted[0].value;
      return {
        type: PatternType.PAIR,
        label: '对子',
        mainValue: mainVal,
        length: 2,
        chainCount: 1,
        cards: sorted,
      };
    }

    // 3. Triple (3 cards with >=1 wild; cannot combine with Jokers)
    if (n === 3) {
      if (hasJokersInNaturals) return null;
      if (natVals.length <= 1) {
        const mainVal = natVals.length === 1 ? natVals[0] : sorted[0].value;
        return {
          type: PatternType.TRIPLE,
          label: '三不带',
          mainValue: mainVal,
          length: 3,
          chainCount: 1,
          cards: sorted,
        };
      }
      return null;
    }

    // 4. 4 Cards: Soft Bomb (软炸弹) vs Triple + Single (三带一)
    if (n === 4) {
      // Soft Bomb: all natural cards share 1 rank <= 15
      if (!hasJokersInNaturals && natVals.length === 1) {
        return {
          type: PatternType.BOMB,
          label: '软炸弹',
          mainValue: natVals[0],
          length: 4,
          chainCount: 1,
          cards: sorted,
          bombTier: 1,
        };
      }
      // Triple + Single: find highest rank v (3..15) that can form a triple using naturals + wilds
      for (let v = 15; v >= 3; v--) {
        const natCount = natMap.get(v)?.length ?? 0;
        const needed = Math.max(0, 3 - natCount);
        if (needed <= wCount) {
          return {
            type: PatternType.TRIPLE_SINGLE,
            label: '三带一',
            mainValue: v,
            length: 4,
            chainCount: 1,
            cards: sorted,
          };
        }
      }
      return null;
    }

    // 5. 5 Cards: Triple + Pair OR 5-Card Straight
    if (n === 5) {
      // Check 5-Card Straight first (cannot contain 2 or Jokers in naturals)
      const straight5 = this.tryMatchLaiziStraight(natMap, wCount, 5);
      if (straight5 !== null) {
        return {
          type: PatternType.STRAIGHT,
          label: '顺子',
          mainValue: straight5,
          length: 5,
          chainCount: 5,
          cards: sorted,
        };
      }

      // Check Triple + Pair (neither triple nor pair can be Joker)
      if (!hasJokersInNaturals && natVals.length <= 2) {
        for (let tripleV = 15; tripleV >= 3; tripleV--) {
          for (let pairV = 15; pairV >= 3; pairV--) {
            if (tripleV === pairV) continue;
            const otherNats = natVals.filter((v) => v !== tripleV && v !== pairV);
            if (otherNats.length > 0) continue;
            const cT = natMap.get(tripleV)?.length ?? 0;
            const cP = natMap.get(pairV)?.length ?? 0;
            if (cT <= 3 && cP <= 2 && 3 - cT + (2 - cP) === wCount) {
              return {
                type: PatternType.TRIPLE_PAIR,
                label: '三带一对',
                mainValue: tripleV,
                length: 5,
                chainCount: 1,
                cards: sorted,
              };
            }
          }
        }
      }
      return null;
    }

    // 6. Straight (n >= 5)
    const straightMain = this.tryMatchLaiziStraight(natMap, wCount, n);
    if (straightMain !== null) {
      return {
        type: PatternType.STRAIGHT,
        label: '顺子',
        mainValue: straightMain,
        length: n,
        chainCount: n,
        cards: sorted,
      };
    }

    // 7. Consecutive Pairs (n >= 6 && n % 2 === 0)
    if (n >= 6 && n % 2 === 0) {
      const pairCount = n / 2;
      const consecPairsMain = this.tryMatchLaiziConsecutivePairs(natMap, wCount, pairCount);
      if (consecPairsMain !== null) {
        return {
          type: PatternType.CONSECUTIVE_PAIRS,
          label: '连对',
          mainValue: consecPairsMain,
          length: n,
          chainCount: pairCount,
          cards: sorted,
        };
      }
    }

    // 8. Airplane (Pure, Single Wings, or Pair Wings)
    const airplanePattern = this.tryMatchLaiziAirplane(sorted, natMap, wCount);
    if (airplanePattern) {
      return airplanePattern;
    }

    // 9. Four with Two Singles (n === 6) or Four with Two Pairs (n === 8)
    if (n === 6) {
      const carriesRocket = natMap.has(16) && natMap.has(17);
      if (!carriesRocket) {
        for (let qv = 15; qv >= 3; qv--) {
          const natCount = natMap.get(qv)?.length ?? 0;
          if (natCount >= 1 && 4 - natCount <= wCount) {
            return {
              type: PatternType.FOUR_WITH_TWO_SINGLES,
              label: '四带二',
              mainValue: qv,
              length: 6,
              chainCount: 1,
              cards: sorted,
            };
          }
        }
      }
    }

    if (n === 8) {
      for (let qv = 15; qv >= 3; qv--) {
        const natCount = natMap.get(qv)?.length ?? 0;
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
            return {
              type: PatternType.FOUR_WITH_TWO_PAIRS,
              label: '四带两对',
              mainValue: qv,
              length: 8,
              chainCount: 1,
              cards: sorted,
            };
          }
        }
      }
    }

    return null;
  }

  private static tryMatchLaiziStraight(
    natMap: Map<number, CardData[]>,
    wCount: number,
    length: number
  ): number | null {
    // Naturals cannot contain >=15 (2 or Jokers) or duplicates
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
    wCount: number
  ): ClassifiedPattern | null {
    const n = sorted.length;
    // 20 cards max in hand => chains up to 6 (18 pure) / 5 (20 single wings) / 4 (20 pair wings)
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
          // Pure airplane: all naturals must be inside [minVal, maxVal] with count <= 3
          for (const [v, grp] of natMap.entries()) {
            if (v < minVal || v > maxVal || grp.length > 3) {
              possible = false;
              break;
            }
          }
          if (possible && wildsForCore === wCount) {
            return {
              type: PatternType.AIRPLANE,
              label: '飞机',
              mainValue: maxVal,
              length: n,
              chainCount: k,
              cards: sorted,
            };
          }
        } else if (n === 4 * k) {
          const carriesRocket = natMap.has(16) && natMap.has(17);
          if (!carriesRocket) {
            return {
              type: PatternType.AIRPLANE_SINGLE_WINGS,
              label: '飞机带翅膀',
              mainValue: maxVal,
              length: n,
              chainCount: k,
              cards: sorted,
            };
          }
        } else if (n === 5 * k) {
          // Remaining naturals + remaining wilds must form k pairs (no jokers)
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
            return {
              type: PatternType.AIRPLANE_PAIR_WINGS,
              label: '飞机带双翼',
              mainValue: maxVal,
              length: n,
              chainCount: k,
              cards: sorted,
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Resolve `cards` against an optional `target`.
   * `identifyPattern` returns ONE interpretation, but some card sets are legitimately ambiguous
   * (e.g. 44445555 = 四带两对 or 飞机带翅膀; 333444555666 = 飞机 or 三连飞机带翅膀; laizi substitutions).
   * If the primary interpretation cannot beat the target, look for any other legal interpretation
   * that can. Falls back to the primary interpretation (caller reports the usual error).
   */
  static identifyPatternFor(
    cards: CardData[],
    wildRanks: Rank[] = [],
    target: ClassifiedPattern | null = null
  ): ClassifiedPattern | null {
    const primary = this.identifyPattern(cards, wildRanks);
    if (!target) return primary;
    if (primary && this.canBeat(primary, target)) return primary;

    let best: ClassifiedPattern | null = null;
    for (const alt of this.identifyAllPatterns(cards, wildRanks)) {
      if (!this.canBeat(alt, target)) continue;
      if (!best || alt.mainValue > best.mainValue) best = alt;
    }
    return best ?? primary;
  }

  /** Max wild cards for exhaustive substitution (13 ranks multichoose w, w=5 -> 6188 combos). */
  private static readonly MAX_WILDS_FOR_ENUMERATION = 5;

  /**
   * Every legal interpretation of `cards` (deduplicated by type/length/chain/mainValue/tier).
   * With wild cards each wild is exhaustively substituted by a non-joker rank (3..2).
   */
  static identifyAllPatterns(cards: CardData[], wildRanks: Rank[] = []): ClassifiedPattern[] {
    if (cards.length === 0) return [];
    const sorted = this.sortCardsDesc(cards);
    const wildSet = new Set<Rank>(wildRanks);
    const wilds = sorted.filter((c) => Boolean(c.isWild || wildSet.has(c.rank)));
    const naturals = sorted.filter((c) => !(c.isWild || wildSet.has(c.rank)));
    const seen = new Set<string>();
    const out: ClassifiedPattern[] = [];

    const push = (p: ClassifiedPattern, tier: number | undefined) => {
      const pattern: ClassifiedPattern = { ...p, cards: sorted };
      if (p.type === PatternType.BOMB) {
        pattern.bombTier = tier;
        pattern.label = tier === 3 ? '纯赖子炸' : tier === 1 ? '软炸弹' : '硬炸弹';
      }
      const key = `${pattern.type}|${pattern.length}|${pattern.chainCount}|${pattern.mainValue}|${pattern.bombTier ?? 0}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(pattern);
    };

    if (wilds.length === 0) {
      for (const p of this.enumerateNativePatterns(sorted)) push(p, p.bombTier);
      return out;
    }
    if (wilds.length > this.MAX_WILDS_FOR_ENUMERATION) return out;

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
        for (const p of this.enumerateNativePatterns(this.sortCardsDesc(virtual))) {
          if (p.type === PatternType.ROCKET) continue; // jokers can never be substituted
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
    return out;
  }

  /** All native (no substitution) interpretations of a card set - companion of identifyNativePattern. */
  private static enumerateNativePatterns(sorted: CardData[]): ClassifiedPattern[] {
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
      res.push({ type, label, mainValue, length: n, chainCount, cards: sorted, ...extra });
    };

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
    // Straight
    if (n >= 5 && vals.length === n && vals[n - 1] <= 14 && vals[n - 1] - vals[0] === n - 1) {
      mk(PatternType.STRAIGHT, '顺子', vals[n - 1], n);
    }
    // Consecutive pairs
    if (n >= 6 && n % 2 === 0 && vals.length === n / 2 && vals.every((v) => cnt(v) === 2)) {
      if (vals[vals.length - 1] <= 14 && vals[vals.length - 1] - vals[0] === vals.length - 1) {
        mk(PatternType.CONSECUTIVE_PAIRS, '连对', vals[vals.length - 1], vals.length);
      }
    }
    // Four with two singles / two pairs
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
    // Airplanes: every run of >=2 consecutive triple-capable ranks (<=A), every chain length
    const tripleVals = vals.filter((v) => v <= 14 && cnt(v) >= 3);
    for (let k = 2; k <= tripleVals.length; k++) {
      for (let s = 0; s + k <= tripleVals.length; s++) {
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
    return res;
  }

  /**
   * Authoritative comparison between candidate pattern and previous played pattern.
   * Respects Laizi Bomb Hierarchy: Soft Bomb (1) < Hard Bomb (2) < Pure Laizi Bomb (3) < Rocket (4).
   */
  static canBeat(candidate: ClassifiedPattern, target: ClassifiedPattern | null): boolean {
    if (!target) return true;

    // Rocket beats everything
    if (candidate.type === PatternType.ROCKET) return true;
    if (target.type === PatternType.ROCKET) return false;

    // Bomb beats any non-bomb/non-rocket, or smaller bomb according to bombTier then mainValue
    if (candidate.type === PatternType.BOMB) {
      if (target.type !== PatternType.BOMB) return true;
      const candTier = candidate.bombTier ?? 2;
      const targetTier = target.bombTier ?? 2;
      if (candTier !== targetTier) {
        return candTier > targetTier;
      }
      return candidate.mainValue > target.mainValue;
    }

    // Non-bomb must match exact pattern type and card count
    if (candidate.type !== target.type) return false;
    if (candidate.length !== target.length) return false;
    if (candidate.chainCount !== target.chainCount) return false;

    if (candidate.candidateQuads && candidate.candidateQuads.length > 0) {
      return candidate.candidateQuads.some((q) => q > target.mainValue);
    }

    return candidate.mainValue > target.mainValue;
  }

  /**
   * ============================================================================
   * WHITEPAPER SECTION 2.1 & 2.3:
   * 15-Rank Histogram (`Int32Array(15)`) & Heuristic Zero-Loss Wing Extraction
   * ============================================================================
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

  /**
   * Checks if removing `removeCount` cards at `rankIdx` (0..11, i.e., 3..A)
   * would break an existing 5+ Straight skeleton in `hist`.
   */
  static wouldBreakStraightSkeleton(
    hist: Int32Array,
    rankIdx: number,
    removeCount: number
  ): boolean {
    if (rankIdx > 11) return false; // 2 and Jokers never participate in straights
    const remaining = hist[rankIdx] - removeCount;
    if (remaining >= 1) return false; // Still at least 1 card left to sustain any straight!

    // Check if rankIdx currently bridges or belongs to a contiguous run of length >= 5 in 0..11
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

    // After removal the run splits into [left..rankIdx-1] and [rankIdx+1..right].
    // The skeleton is only destroyed if NEITHER side still holds a 5+ straight
    // (trimming the end of a long straight must not count as breaking it).
    const leftSpan = rankIdx - left;
    const rightSpan = right - rankIdx;
    return leftSpan < 5 && rightSpan < 5;
  }

  /**
   * Checks if removing `removeCount` cards at `rankIdx` (0..11)
   * would break a 3+ Consecutive Pairs skeleton.
   */
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
    // Skeleton survives if either remaining side still holds 3+ consecutive pairs.
    const leftLen = rankIdx - left;
    const rightLen = right - rankIdx;
    return leftLen < 3 && rightLen < 3;
  }

  /**
   * Compute structural breaking penalty for extracting `needCount` (1 for single wing, 2 for pair wing)
   * from rank index `idx` (0..14) using the 15-rank histogram.
   * Lower penalty = cleaner, more isolated kicker.
   */
  static evaluateWingPenalty(
    hist: Int32Array,
    idx: number,
    needCount: 1 | 2,
    wildIndices: Set<number>
  ): number {
    const count = hist[idx];
    if (count < needCount) return 999999;

    // Never split Rocket (both small_joker and big_joker held)
    if ((idx === 13 || idx === 14) && hist[13] >= 1 && hist[14] >= 1) {
      return 99999;
    }

    // Never split a 4-of-a-kind Bomb unless required for 4-with-two-pairs or wing fallback
    if (count === 4) {
      if (needCount === 2) {
        return 3200;
      }
      return 5500;
    }

    let penalty = idx * 1.5; // Base preference: smaller rank first among equal structural cost

    // Avoid wasting Laizi wild cards as ordinary kickers
    if (wildIndices.has(idx)) {
      penalty += 800;
    }

    // High control card penalty (A, 2, Small Joker, Big Joker)
    if (idx === 14) penalty += 220; // Big Joker
    else if (idx === 13) penalty += 180; // Small Joker
    else if (idx === 12) penalty += 120; // '2'
    else if (idx === 11) penalty += 38;  // 'A'

    // Splitting a Triple (3-of-a-kind) to extract 1 or 2 cards is heavily penalized
    if (count === 3) {
      penalty += 260;
    }

    // Splitting a Pair when we only need 1 Single Wing
    if (count === 2 && needCount === 1) {
      penalty += 55;
    }

    // Breaking a 5+ Straight skeleton
    if (this.wouldBreakStraightSkeleton(hist, idx, needCount)) {
      penalty += 145;
    }

    // Breaking a 3+ Consecutive Pairs skeleton
    if (this.wouldBreakConsecutivePairs(hist, idx, needCount)) {
      penalty += 110;
    }

    return penalty;
  }

  /**
   * Whitepaper Section 2.3 Heuristic Optimal Wing / Kicker Selector:
   * Given `allCards`, excludes `excludedCardIds` (the core triple/airplane/quad),
   * and selects `wingCount` wings of size `wingSize` (1 = single wing, 2 = pair wing)
   * with minimum structural damage to straights, triples, bombs, and rockets.
   */
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
      // Prefer non-wild cards first inside the same rank bucket
      if (c.isWild) list.push(c);
      else list.unshift(c);
      byIdx.set(idx, list);
    }

    const wildIndices = new Set<number>(
      wildRanks.map((r) => this.valueToHistIndex(RANK_VALUES[r]))
    );

    const scoredRanks: Array<{ idx: number; penalty: number }> = [];
    for (let idx = 0; idx < 15; idx++) {
      // Pair wings cannot use Jokers (idx 13, 14)
      if (wingSize === 2 && idx >= 13) continue;
      if (hist[idx] >= wingSize) {
        const penalty = this.evaluateWingPenalty(hist, idx, wingSize, wildIndices);
        if (penalty < 40000) {
          scoredRanks.push({ idx, penalty });
          // If we need multiple wings and have multiple units in this rank bucket (non-Joker)
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
    // Prevent accidentally picking both Jokers (13 and 14) as two single wings
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

  /**
   * Whitepaper v2.0 Section 1.3: Heuristic Optimal 3-Card Swap Selector (换三张启发式选牌算法)
   * Uses the 15-rank histogram to score each card's structural keep value:
   * - Never breaks Rockets, 4-of-a-kind Bombs, 2s, Aces, or Triples unless forced
   * - Protects 5+ Straight skeletons
   * - Prioritizes isolated low single cards (3~9) first
   */
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
      if (idx >= 13) keepScore += 450; // Jokers
      else if (idx === 12) keepScore += 280; // '2'
      else if (idx === 11) keepScore += 110; // 'A'
      else if (idx === 10) keepScore += 55; // 'K'

      if (count === 4) keepScore += 800; // Bomb
      else if (count === 3) keepScore += 240; // Triple
      else if (count === 2) keepScore += 48; // Pair

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

  /**
   * Whitepaper Section 2.6: Room Tier Multiplier Cap Lookup
   */
  static getMaxMultiplierForBaseScore(baseScore: number): number {
    if (baseScore >= 2000) return 256;
    if (baseScore >= 800) return 128;
    if (baseScore >= 500) return 96;
    if (baseScore >= 300) return 64;
    if (baseScore >= 200) return 48;
    return 32;
  }
}

