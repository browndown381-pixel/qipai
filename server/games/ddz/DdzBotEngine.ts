import {
  CardData,
  ClassifiedPattern,
  DdzRules,
  PatternType,
  Rank,
} from './DdzRules.js';

export interface HandPartition {
  rockets: CardData[][];
  bombs: CardData[][];
  airplanes: CardData[][];
  straights: CardData[][];
  consecutivePairs: CardData[][];
  triples: CardData[][];
  pairs: CardData[][];
  singles: CardData[][];
  netTurns: number;
  controlScore: number;
  structuralScore: number;
}

export interface BotContext {
  myCards: CardData[];
  mySeat: number;
  landlordSeat: number;
  lastPlayed: {
    seat: number;
    pattern: ClassifiedPattern;
  } | null;
  seatCardCounts: Record<number, number>;
  wildRanks?: Rank[];
}

interface SequenceSearchState {
  airplanes: CardData[][];
  consecutivePairs: CardData[][];
  straights: CardData[][];
  triples: CardData[][];
  pairs: CardData[][];
  singles: CardData[][];
  netTurns: number;
  structuralScore: number;
}

/**
 * Commercial-grade Dou Dizhu AI & Zero-Breakage Hint Engine 5.0:
 * 1. DFS Branch-and-Bound (分支定界) Optimal Hand Partitioning Tree with Laizi Gap Repair
 * 2. 4-Tier Zero-Breakage Priority Hint Engine (零损拆牌优先四级智能提示 + 赖子百变合成)
 * 3. Role-aware Peasant Cooperation (Gatekeeper vs Feeder) & Endgame Suppression
 */
export class DdzBotEngine {
  /**
   * Partition a hand into structural combos using DFS Branch-and-Bound search
   * to globally minimize `netTurns` and maximize `structuralScore`.
   */
  static partitionHand(cards: CardData[], wildRanks: Rank[] = []): HandPartition {
    const wildSet = new Set<Rank>(wildRanks);
    const valMap = DdzRules.countByValue(cards);

    const rockets: CardData[][] = [];
    const bombs: CardData[][] = [];

    // 1. Extract Rocket (undisputed)
    if (valMap.has(16) && valMap.has(17)) {
      rockets.push([...(valMap.get(16) ?? []), ...(valMap.get(17) ?? [])]);
      valMap.delete(16);
      valMap.delete(17);
    }

    // 2. Extract 4-of-a-kind Bombs (Hard Bombs or Pure 4-Wild Bombs)
    for (const [val, group] of Array.from(valMap.entries())) {
      if (group.length === 4) {
        bombs.push([...group]);
        valMap.delete(val);
      }
    }

    // Separate high non-sequence cards (2, Small Joker, Big Joker) from sequence-eligible cards (3..A, val 3..14)
    const highTriples: CardData[][] = [];
    const highPairs: CardData[][] = [];
    const highSingles: CardData[][] = [];

    for (const highVal of [15, 16, 17]) {
      const grp = valMap.get(highVal);
      if (!grp || grp.length === 0) continue;
      if (grp.length === 3) highTriples.push([...grp]);
      else if (grp.length === 2) highPairs.push([...grp]);
      else if (grp.length === 1) highSingles.push([...grp]);
      valMap.delete(highVal);
    }

    // Build pools for sequence-eligible ranks (3..14)
    const seqPool = new Map<number, CardData[]>();
    for (const [v, grp] of valMap.entries()) {
      if (v <= 14 && grp.length > 0) {
        seqPool.set(v, [...grp]);
      }
    }

    // 3. Run DFS Branch-and-Bound search over 3..14 to find optimal sequence extraction
    let nodesVisited = 0;
    const MAX_DFS_NODES = 160;
    let bestState: SequenceSearchState | null = null;

    const evaluateLeaf = (
      pool: Map<number, CardData[]>,
      airplanes: CardData[][],
      consecutivePairs: CardData[][],
      straights: CardData[][]
    ): SequenceSearchState => {
      const triples: CardData[][] = [];
      const pairs: CardData[][] = [];
      const singles: CardData[][] = [];

      const remVals = Array.from(pool.keys()).sort((a, b) => a - b);
      for (const v of remVals) {
        const grp = pool.get(v)!;
        if (grp.length === 3) triples.push([...grp]);
        else if (grp.length === 2) pairs.push([...grp]);
        else if (grp.length === 1) singles.push([...grp]);
      }

      const allTriples = [...triples, ...highTriples];
      const allPairs = [...pairs, ...highPairs];
      const allSingles = [...singles, ...highSingles];

      const wingCapacity =
        allTriples.length + airplanes.reduce((acc, p) => acc + p.length / 3, 0);
      const lowWingCandidates =
        allSingles.filter((s) => s[0].value <= 14).length +
        allPairs.filter((p) => p[0].value <= 13).length;
      const absorbedWings = Math.min(wingCapacity, lowWingCandidates);

      const totalCombos =
        airplanes.length +
        consecutivePairs.length +
        straights.length +
        allTriples.length +
        allPairs.length +
        allSingles.length;

      const wildBonusTurns = cards.filter((c) => c.isWild || wildSet.has(c.rank)).length;

      const netTurns = Math.max(
        1,
        totalCombos - absorbedWings - bombs.length - rockets.length - Math.floor(wildBonusTurns / 2)
      );

      const structuralScore =
        airplanes.length * 18 +
        consecutivePairs.reduce((acc, cp) => acc + cp.length * 2.5, 0) +
        straights.reduce((acc, st) => acc + st.length * 2.2, 0) +
        allTriples.length * 9 +
        allPairs.length * 3 -
        allSingles.filter((s) => s[0].value <= 10).length * 4;

      return {
        airplanes: airplanes.map((a) => [...a]),
        consecutivePairs: consecutivePairs.map((c) => [...c]),
        straights: straights.map((s) => [...s]),
        triples: allTriples,
        pairs: allPairs,
        singles: allSingles,
        netTurns,
        structuralScore,
      };
    };

    const isBetterState = (cand: SequenceSearchState, curr: SequenceSearchState | null): boolean => {
      if (!curr) return true;
      if (cand.netTurns !== curr.netTurns) {
        return cand.netTurns < curr.netTurns;
      }
      return cand.structuralScore > curr.structuralScore;
    };

    const dfs = (
      pool: Map<number, CardData[]>,
      airplanes: CardData[][],
      consecutivePairs: CardData[][],
      straights: CardData[][]
    ): void => {
      nodesVisited++;
      const currentEval = evaluateLeaf(pool, airplanes, consecutivePairs, straights);
      if (isBetterState(currentEval, bestState)) {
        bestState = currentEval;
      }

      if (nodesVisited >= MAX_DFS_NODES) return;

      const extractedCount = airplanes.length + consecutivePairs.length + straights.length;
      if (bestState && extractedCount > bestState.netTurns + 1) {
        return;
      }

      // Candidate 1: Extract an Airplane (consecutive triples, length >= 2)
      const tripleVals = Array.from(pool.entries())
        .filter(([, g]) => g.length >= 3)
        .map(([v]) => v)
        .sort((a, b) => a - b);

      for (let i = 0; i < tripleVals.length; i++) {
        let j = i;
        while (j + 1 < tripleVals.length && tripleVals[j + 1] === tripleVals[j] + 1) {
          j++;
        }
        const runLen = j - i + 1;
        if (runLen >= 2) {
          const nextPool = this.clonePool(pool);
          const planeCards: CardData[] = [];
          for (let k = i; k <= j; k++) {
            const v = tripleVals[k];
            const grp = nextPool.get(v)!;
            planeCards.push(...grp.splice(0, 3));
            if (grp.length === 0) nextPool.delete(v);
          }
          dfs(nextPool, [...airplanes, planeCards], consecutivePairs, straights);
          break;
        }
      }

      // Candidate 2: Extract Consecutive Pairs (length >= 3 pairs)
      const pairVals = Array.from(pool.entries())
        .filter(([, g]) => g.length >= 2)
        .map(([v]) => v)
        .sort((a, b) => a - b);

      for (let i = 0; i < pairVals.length; i++) {
        let j = i;
        while (j + 1 < pairVals.length && pairVals[j + 1] === pairVals[j] + 1) {
          j++;
        }
        const runLen = j - i + 1;
        if (runLen >= 3) {
          const lengthsToTry = runLen >= 4 ? [runLen, 3] : [runLen];
          for (const len of lengthsToTry) {
            const nextPool = this.clonePool(pool);
            const cpCards: CardData[] = [];
            for (let k = i; k < i + len; k++) {
              const v = pairVals[k];
              const grp = nextPool.get(v)!;
              cpCards.push(...grp.splice(0, 2));
              if (grp.length === 0) nextPool.delete(v);
            }
            dfs(nextPool, airplanes, [...consecutivePairs, cpCards], straights);
          }
          break;
        }
      }

      // Candidate 3: Extract Straight (length >= 5 consecutive singles)
      const singleVals = Array.from(pool.entries())
        .filter(([, g]) => g.length >= 1)
        .map(([v]) => v)
        .sort((a, b) => a - b);

      for (let i = 0; i < singleVals.length; i++) {
        let j = i;
        while (j + 1 < singleVals.length && singleVals[j + 1] === singleVals[j] + 1) {
          j++;
        }
        const runLen = j - i + 1;
        if (runLen >= 5) {
          {
            const nextPool = this.clonePool(pool);
            const stCards: CardData[] = [];
            for (let k = i; k <= j; k++) {
              const v = singleVals[k];
              const grp = nextPool.get(v)!;
              stCards.push(grp.pop()!);
              if (grp.length === 0) nextPool.delete(v);
            }
            dfs(nextPool, airplanes, consecutivePairs, [...straights, stCards]);
          }

          if (runLen >= 6) {
            const firstV = singleVals[i];
            const lastV = singleVals[j];
            if ((pool.get(firstV)?.length ?? 0) >= 2) {
              const nextPool = this.clonePool(pool);
              const stCards: CardData[] = [];
              for (let k = i + 1; k <= j; k++) {
                const v = singleVals[k];
                const grp = nextPool.get(v)!;
                stCards.push(grp.pop()!);
                if (grp.length === 0) nextPool.delete(v);
              }
              dfs(nextPool, airplanes, consecutivePairs, [...straights, stCards]);
            }
            if ((pool.get(lastV)?.length ?? 0) >= 2) {
              const nextPool = this.clonePool(pool);
              const stCards: CardData[] = [];
              for (let k = i; k <= j - 1; k++) {
                const v = singleVals[k];
                const grp = nextPool.get(v)!;
                stCards.push(grp.pop()!);
                if (grp.length === 0) nextPool.delete(v);
              }
              dfs(nextPool, airplanes, consecutivePairs, [...straights, stCards]);
            }
          }
          break;
        }
      }
    };

    dfs(seqPool, [], [], []);

    const chosen = bestState ?? evaluateLeaf(seqPool, [], [], []);

    let controlScore = 0;
    controlScore += rockets.length * 8;
    controlScore += bombs.length * 6;
    for (const c of cards) {
      if (c.isWild || wildSet.has(c.rank)) controlScore += 3.5;
      else if (c.value === 17) controlScore += 4;
      else if (c.value === 16) controlScore += 3;
      else if (c.value === 15) controlScore += 2;
      else if (c.value === 14) controlScore += 1;
    }

    return {
      rockets,
      bombs,
      airplanes: chosen.airplanes,
      straights: chosen.straights,
      consecutivePairs: chosen.consecutivePairs,
      triples: chosen.triples,
      pairs: chosen.pairs,
      singles: chosen.singles,
      netTurns: chosen.netTurns,
      controlScore,
      structuralScore: chosen.structuralScore,
    };
  }

  private static clonePool(pool: Map<number, CardData[]>): Map<number, CardData[]> {
    const next = new Map<number, CardData[]>();
    for (const [k, v] of pool.entries()) {
      next.set(k, [...v]);
    }
    return next;
  }

  /**
   * Decide whether AI should call or grab landlord.
   */
  static shouldCallOrGrab(
    cards: CardData[],
    isGrabPhase: boolean,
    currentMultiplier: number,
    wildRanks: Rank[] = []
  ): boolean {
    const part = this.partitionHand(cards, wildRanks);
    if (!isGrabPhase) {
      return part.controlScore >= 7 || (part.controlScore >= 5 && part.netTurns <= 6);
    }
    if (currentMultiplier >= 4) {
      return part.controlScore >= 11 && part.netTurns <= 5;
    }
    return part.controlScore >= 9 || (part.controlScore >= 7 && part.netTurns <= 5);
  }

  /**
   * Decide whether AI should choose "不加倍" (1), "加倍 ×2" (2), or "超级加倍 ×4" (4) in DOUBLING phase.
   */
  static chooseDoubleFactor(
    cards: CardData[],
    isLandlord: boolean,
    currentMultiplier: number,
    wildRanks: Rank[] = []
  ): 1 | 2 | 4 {
    const part = this.partitionHand(cards, wildRanks);
    const thresholdBonus = isLandlord ? 1 : 0;
    if (
      part.controlScore >= 11 + thresholdBonus &&
      part.netTurns <= 4 &&
      currentMultiplier <= 8
    ) {
      return 4;
    }
    if (part.controlScore >= 7 + thresholdBonus && part.netTurns <= 6) {
      return 2;
    }
    return 1;
  }

  /**
   * 4-Tier Zero-Breakage Priority Hint Engine (`findAllPlayableMoves`) with Laizi Wild Synthesis:
   * - Tier 1 (Zero Breakage): Pure isolated combos from DFS optimal partition.
   * - Tier 2 (Zero-Turn-Penalty Edge Trimming & Laizi Combos): Trimming 6+ straights or using wild cards to complete pairs/triples/straights.
   * - Tier 3 (Minimal Net-Turn Loss Splitting): Splitting pairs/triples/sequences ordered by smallest post-move `netTurns` increase.
   * - Tier 4 (Bomb & Rocket Fallback): Soft Bombs -> Hard Bombs -> Pure Laizi Bomb -> Rocket last.
   */
  static findAllPlayableMoves(
    cards: CardData[],
    target: ClassifiedPattern | null,
    wildRanks: Rank[] = []
  ): CardData[][] {
    const sorted = DdzRules.sortCardsDesc(cards);
    const wildSet = new Set<Rank>(wildRanks);
    const wildPool = sorted.filter((c) => Boolean(c.isWild || wildSet.has(c.rank)));
    const wildIds = new Set(wildPool.map((c) => c.id));
    const naturals = sorted.filter((c) => !wildIds.has(c.id));

    const valMap = DdzRules.countByValue(sorted);
    const natMap = DdzRules.countByValue(naturals);
    const distinctAsc = Array.from(valMap.keys()).sort((a, b) => a - b);
    const natDistinctAsc = Array.from(natMap.keys()).sort((a, b) => a - b);

    // If whole hand is a single valid pattern that beats target, prioritize it immediately!
    const fullHandPattern = DdzRules.identifyPattern(sorted, wildRanks);
    if (fullHandPattern && DdzRules.canBeat(fullHandPattern, target)) {
      if (!target) {
        return [sorted];
      }
    }

    const part = this.partitionHand(sorted, wildRanks);

    // Case A: Free Lead (target === null)
    if (!target) {
      const leadResults: CardData[][] = [];
      if (fullHandPattern) {
        leadResults.push(sorted);
      }

      for (const plane of part.airplanes) {
        const k = plane.length / 3;
        const planeIds = new Set(plane.map((c) => c.id));
        const planeRanks = new Set(plane.map((c) => c.value));
        const optSingleWings = DdzRules.selectOptimalWings(
          sorted,
          planeIds,
          planeRanks,
          k,
          1,
          wildRanks
        );
        const optPairWings = DdzRules.selectOptimalWings(
          sorted,
          planeIds,
          planeRanks,
          k,
          2,
          wildRanks
        );
        if (optSingleWings) {
          leadResults.push([...plane, ...optSingleWings]);
        }
        if (optPairWings) {
          leadResults.push([...plane, ...optPairWings]);
        }
        leadResults.push(plane);
      }

      for (const st of part.straights) leadResults.push(st);
      for (const cp of part.consecutivePairs) leadResults.push(cp);

      for (const tr of part.triples) {
        const trIds = new Set(tr.map((c) => c.id));
        const trRanks = new Set([tr[0].value]);
        const optSingleWing = DdzRules.selectOptimalWings(
          sorted,
          trIds,
          trRanks,
          1,
          1,
          wildRanks
        );
        const optPairWing = DdzRules.selectOptimalWings(
          sorted,
          trIds,
          trRanks,
          1,
          2,
          wildRanks
        );
        if (optSingleWing) {
          leadResults.push([...tr, ...optSingleWing]);
        }
        if (optPairWing) {
          leadResults.push([...tr, ...optPairWing]);
        }
        leadResults.push(tr);
      }

      for (const pr of part.pairs) leadResults.push(pr);
      for (const sg of part.singles) leadResults.push(sg);

      for (const bm of part.bombs) leadResults.push(bm);
      for (const rk of part.rockets) leadResults.push(rk);

      return this.filterLegalMoves(this.dedupeMoves(leadResults), null, wildRanks);
    }

    // Case B: Following a target pattern
    if (target.type === PatternType.ROCKET) {
      return [];
    }

    const tier1ZeroBreakage: CardData[][] = [];
    const tier2EdgeTrim: CardData[][] = [];
    const tier3SplitCandidates: CardData[][] = [];

    if (
      fullHandPattern &&
      fullHandPattern.type !== PatternType.BOMB &&
      fullHandPattern.type !== PatternType.ROCKET &&
      DdzRules.canBeat(fullHandPattern, target)
    ) {
      tier1ZeroBreakage.push(sorted);
    }

    const bombValues = new Set(part.bombs.map((b) => b[0].value));
    const hasRocket = part.rockets.length > 0;
    const nonBombVals = distinctAsc.filter(
      (v) => !bombValues.has(v) && !(hasRocket && (v === 16 || v === 17))
    );

    const isolatedSingleVals = part.singles.map((s) => s[0].value);
    const isolatedPairVals = part.pairs.map((p) => p[0].value);
    const isolatedTripleVals = part.triples.map((t) => t[0].value);

    switch (target.type) {
      case PatternType.SINGLE: {
        for (const sg of part.singles) {
          if (sg[0].value > target.mainValue) {
            tier1ZeroBreakage.push([sg[0]]);
          }
        }

        for (const st of part.straights) {
          if (st.length >= 6) {
            const asc = [...st].sort((a, b) => a.value - b.value);
            const lowEdge = asc[0];
            const highEdge = asc[asc.length - 1];
            if (lowEdge.value > target.mainValue) {
              tier2EdgeTrim.push([lowEdge]);
            }
            if (highEdge.value > target.mainValue) {
              tier2EdgeTrim.push([highEdge]);
            }
          }
        }

        for (const v of nonBombVals) {
          if (v > target.mainValue && !isolatedSingleVals.includes(v)) {
            tier3SplitCandidates.push([valMap.get(v)![0]]);
          }
        }
        break;
      }

      case PatternType.PAIR: {
        for (const pr of part.pairs) {
          if (pr[0].value > target.mainValue) {
            tier1ZeroBreakage.push(pr.slice(0, 2));
          }
        }

        for (const cp of part.consecutivePairs) {
          if (cp.length >= 8) {
            const asc = [...cp].sort((a, b) => a.value - b.value);
            const lowPair = asc.slice(0, 2);
            const highPair = asc.slice(asc.length - 2);
            if (lowPair[0].value > target.mainValue) tier2EdgeTrim.push(lowPair);
            if (highPair[0].value > target.mainValue) tier2EdgeTrim.push(highPair);
          }
        }

        for (const v of nonBombVals) {
          if (
            v > target.mainValue &&
            (valMap.get(v)?.length ?? 0) >= 2 &&
            !isolatedPairVals.includes(v)
          ) {
            tier3SplitCandidates.push(valMap.get(v)!.slice(0, 2));
          }
        }

        // Laizi synthesis: 1 natural single (> target.mainValue, <= 15) + 1 wild card
        if (wildPool.length >= 1) {
          for (const v of natDistinctAsc) {
            if (v > target.mainValue && v <= 15 && (natMap.get(v)?.length ?? 0) === 1) {
              tier2EdgeTrim.push([natMap.get(v)![0], wildPool[wildPool.length - 1]]);
            }
          }
        }
        break;
      }

      case PatternType.TRIPLE: {
        for (const tr of part.triples) {
          if (tr[0].value > target.mainValue) {
            tier1ZeroBreakage.push(tr.slice(0, 3));
          }
        }
        for (const v of nonBombVals) {
          if (
            v > target.mainValue &&
            (valMap.get(v)?.length ?? 0) >= 3 &&
            !isolatedTripleVals.includes(v)
          ) {
            tier3SplitCandidates.push(valMap.get(v)!.slice(0, 3));
          }
        }
        // Laizi synthesis: natural pair + 1 wild
        if (wildPool.length >= 1) {
          for (const v of natDistinctAsc) {
            if (v > target.mainValue && v <= 15 && (natMap.get(v)?.length ?? 0) === 2) {
              tier2EdgeTrim.push([
                ...natMap.get(v)!.slice(0, 2),
                wildPool[wildPool.length - 1],
              ]);
            }
          }
        }
        break;
      }

      case PatternType.TRIPLE_SINGLE: {
        // Whitepaper 2.3 Heuristic Zero-Loss Wing Selection via 15-Rank Histogram
        for (const tr of part.triples) {
          if (tr[0].value > target.mainValue) {
            const core = tr.slice(0, 3);
            const optWing = DdzRules.selectOptimalWings(
              sorted,
              new Set(core.map((c) => c.id)),
              new Set([tr[0].value]),
              1,
              1,
              wildRanks
            );
            if (optWing) {
              tier1ZeroBreakage.push([...core, ...optWing]);
            }
          }
        }
        for (const v of nonBombVals) {
          if (v > target.mainValue && (valMap.get(v)?.length ?? 0) >= 3) {
            const core = valMap.get(v)!.slice(0, 3);
            const optWing = DdzRules.selectOptimalWings(
              sorted,
              new Set(core.map((c) => c.id)),
              new Set([v]),
              1,
              1,
              wildRanks
            );
            if (optWing) {
              tier3SplitCandidates.push([...core, ...optWing]);
            }
          }
        }
        // Laizi synthesis: natural pair + 1 wild + 1 heuristic zero-loss kicker
        if (wildPool.length >= 1) {
          const wCard = wildPool[wildPool.length - 1];
          for (const v of natDistinctAsc) {
            if (v > target.mainValue && v <= 15 && (natMap.get(v)?.length ?? 0) === 2) {
              const core = [...natMap.get(v)!.slice(0, 2), wCard];
              const optWing = DdzRules.selectOptimalWings(
                sorted,
                new Set(core.map((c) => c.id)),
                new Set([v]),
                1,
                1,
                wildRanks
              );
              if (optWing) {
                tier2EdgeTrim.push([...core, ...optWing]);
              }
            }
          }
        }
        break;
      }

      case PatternType.TRIPLE_PAIR: {
        // Whitepaper 2.3 Heuristic Zero-Loss Pair Wing Selection via 15-Rank Histogram
        for (const tr of part.triples) {
          if (tr[0].value > target.mainValue) {
            const core = tr.slice(0, 3);
            const optPairWing = DdzRules.selectOptimalWings(
              sorted,
              new Set(core.map((c) => c.id)),
              new Set([tr[0].value]),
              1,
              2,
              wildRanks
            );
            if (optPairWing) {
              tier1ZeroBreakage.push([...core, ...optPairWing]);
            }
          }
        }
        for (const v of nonBombVals) {
          if (v > target.mainValue && (valMap.get(v)?.length ?? 0) >= 3) {
            const core = valMap.get(v)!.slice(0, 3);
            const optPairWing = DdzRules.selectOptimalWings(
              sorted,
              new Set(core.map((c) => c.id)),
              new Set([v]),
              1,
              2,
              wildRanks
            );
            if (optPairWing) {
              tier3SplitCandidates.push([...core, ...optPairWing]);
            }
          }
        }
        break;
      }

      case PatternType.STRAIGHT: {
        const len = target.length;
        for (const st of part.straights) {
          if (st.length === len) {
            const maxVal = Math.max(...st.map((c) => c.value));
            if (maxVal > target.mainValue) {
              tier1ZeroBreakage.push(st);
            }
          } else if (st.length > len) {
            const asc = [...st].sort((a, b) => a.value - b.value);
            for (let i = 0; i <= asc.length - len; i++) {
              const win = asc.slice(i, i + len);
              if (win[win.length - 1].value > target.mainValue) {
                tier2EdgeTrim.push(win);
              }
            }
          }
        }

        const availVals = nonBombVals.filter((v) => v <= 14);
        for (let i = 0; i <= availVals.length - len; i++) {
          const window = availVals.slice(i, i + len);
          const maxV = window[window.length - 1];
          if (maxV - window[0] === len - 1 && maxV > target.mainValue) {
            tier3SplitCandidates.push(window.map((v) => valMap.get(v)![0]));
          }
        }

        // Laizi Gap-Repair Straight Synthesis
        if (wildPool.length >= 1) {
          for (
            let maxV = Math.max(target.mainValue + 1, 3 + len - 1);
            maxV <= 14;
            maxV++
          ) {
            const minV = maxV - len + 1;
            const picked: CardData[] = [];
            let missing = 0;
            for (let v = minV; v <= maxV; v++) {
              const natGrp = natMap.get(v);
              if (natGrp && natGrp.length > 0) {
                picked.push(natGrp[0]);
              } else {
                missing++;
              }
            }
            if (missing > 0 && missing <= wildPool.length) {
              picked.push(...wildPool.slice(wildPool.length - missing));
              tier2EdgeTrim.push(picked);
            }
          }
        }
        break;
      }

      case PatternType.CONSECUTIVE_PAIRS: {
        const pairCount = target.chainCount;
        for (const cp of part.consecutivePairs) {
          const cpPairs = cp.length / 2;
          if (cpPairs === pairCount) {
            const maxVal = Math.max(...cp.map((c) => c.value));
            if (maxVal > target.mainValue) {
              tier1ZeroBreakage.push(cp);
            }
          } else if (cpPairs > pairCount) {
            const asc = [...cp].sort((a, b) => a.value - b.value);
            for (let i = 0; i <= cpPairs - pairCount; i++) {
              const win = asc.slice(i * 2, (i + pairCount) * 2);
              if (win[win.length - 1].value > target.mainValue) {
                tier2EdgeTrim.push(win);
              }
            }
          }
        }

        const availVals = nonBombVals.filter(
          (v) => v <= 14 && (valMap.get(v)?.length ?? 0) >= 2
        );
        for (let i = 0; i <= availVals.length - pairCount; i++) {
          const window = availVals.slice(i, i + pairCount);
          const maxV = window[window.length - 1];
          if (maxV - window[0] === pairCount - 1 && maxV > target.mainValue) {
            tier3SplitCandidates.push(
              window.flatMap((v) => valMap.get(v)!.slice(0, 2))
            );
          }
        }

        // Laizi Gap-Repair Consecutive Pairs Synthesis
        if (wildPool.length >= 1) {
          for (
            let maxV = Math.max(target.mainValue + 1, 3 + pairCount - 1);
            maxV <= 14;
            maxV++
          ) {
            const minV = maxV - pairCount + 1;
            const picked: CardData[] = [];
            let missing = 0;
            for (let v = minV; v <= maxV; v++) {
              const natGrp = natMap.get(v) ?? [];
              const take = Math.min(2, natGrp.length);
              picked.push(...natGrp.slice(0, take));
              missing += 2 - take;
            }
            if (missing > 0 && missing <= wildPool.length) {
              picked.push(...wildPool.slice(wildPool.length - missing));
              tier2EdgeTrim.push(picked);
            }
          }
        }
        break;
      }

      case PatternType.AIRPLANE:
      case PatternType.AIRPLANE_SINGLE_WINGS:
      case PatternType.AIRPLANE_PAIR_WINGS: {
        const k = target.chainCount;
        const availTriples = nonBombVals.filter(
          (v) => v <= 14 && (valMap.get(v)?.length ?? 0) >= 3
        );
        for (let i = 0; i <= availTriples.length - k; i++) {
          const seq = availTriples.slice(i, i + k);
          const maxV = seq[seq.length - 1];
          if (maxV - seq[0] === k - 1 && maxV > target.mainValue) {
            const core = seq.flatMap((v) => valMap.get(v)!.slice(0, 3));
            const coreIds = new Set(core.map((c) => c.id));
            const coreRanks = new Set(seq);
            if (target.type === PatternType.AIRPLANE) {
              tier1ZeroBreakage.push(core);
            } else if (target.type === PatternType.AIRPLANE_SINGLE_WINGS) {
              const optWings = DdzRules.selectOptimalWings(
                sorted,
                coreIds,
                coreRanks,
                k,
                1,
                wildRanks
              );
              if (optWings) {
                tier1ZeroBreakage.push([...core, ...optWings]);
              }
            } else if (target.type === PatternType.AIRPLANE_PAIR_WINGS) {
              const optWings = DdzRules.selectOptimalWings(
                sorted,
                coreIds,
                coreRanks,
                k,
                2,
                wildRanks
              );
              if (optWings) {
                tier1ZeroBreakage.push([...core, ...optWings]);
              }
            }
          }
        }
        break;
      }

      case PatternType.FOUR_WITH_TWO_SINGLES:
      case PatternType.FOUR_WITH_TWO_PAIRS: {
        const wingSize: 1 | 2 =
          target.type === PatternType.FOUR_WITH_TWO_SINGLES ? 1 : 2;
        for (const v of distinctAsc) {
          if (v > target.mainValue && (valMap.get(v)?.length ?? 0) === 4) {
            const core = valMap.get(v)!.slice(0, 4);
            const optWings = DdzRules.selectOptimalWings(
              sorted,
              new Set(core.map((c) => c.id)),
              new Set([v]),
              2,
              wingSize,
              wildRanks
            );
            if (optWings) {
              tier3SplitCandidates.push([...core, ...optWings]);
            }
          }
        }
        break;
      }

      default:
        break;
    }

    const scoredTier3 = tier3SplitCandidates.map((cand) => {
      const usedIds = new Set(cand.map((c) => c.id));
      const rem = sorted.filter((c) => !usedIds.has(c.id));
      const remPart = this.partitionHand(rem, wildRanks);
      const mainVal = DdzRules.identifyPattern(cand, wildRanks)?.mainValue ?? 0;
      return {
        cards: cand,
        postNetTurns: remPart.netTurns,
        mainVal,
      };
    });

    scoredTier3.sort((a, b) => {
      if (a.postNetTurns !== b.postNetTurns) return a.postNetTurns - b.postNetTurns;
      return a.mainVal - b.mainVal;
    });

    // Tier 4: Soft Bombs (ascending) -> Hard Bombs (ascending) -> Pure Laizi Bomb -> Rocket last
    const tier4BombsAndRocket: CardData[][] = [];

    // 4a. Soft Bombs (1~2 wilds + 2~3 natural cards of same rank <= 15)
    if (wildPool.length >= 1) {
      for (const v of natDistinctAsc) {
        if (v > 15) continue;
        const natGrp = natMap.get(v) ?? [];
        if (natGrp.length >= 2 && natGrp.length < 4) {
          const needed = 4 - natGrp.length;
          if (needed <= wildPool.length) {
            const softBomb = [...natGrp, ...wildPool.slice(wildPool.length - needed)];
            const sbPat = DdzRules.identifyPattern(softBomb, wildRanks);
            if (sbPat && DdzRules.canBeat(sbPat, target)) {
              tier4BombsAndRocket.push(softBomb);
            }
          }
        }
      }
    }

    // 4b. Native Hard Bombs & Pure Laizi Bombs
    const sortedBombs = [...part.bombs].sort((a, b) => a[0].value - b[0].value);
    for (const bm of sortedBombs) {
      const bmPat = DdzRules.identifyPattern(bm, wildRanks);
      if (bmPat && DdzRules.canBeat(bmPat, target)) {
        tier4BombsAndRocket.push(bm);
      }
    }

    // 4c. Pure 4-Wild Bomb if player holds >= 4 wild cards across 2 wild ranks (TianDi Laizi)
    if (wildPool.length >= 4) {
      const pureWildBomb = wildPool.slice(0, 4);
      const pwPat = DdzRules.identifyPattern(pureWildBomb, wildRanks);
      if (pwPat && DdzRules.canBeat(pwPat, target)) {
        tier4BombsAndRocket.push(pureWildBomb);
      }
    }

    // 4d. Rocket
    for (const rk of part.rockets) {
      tier4BombsAndRocket.push(rk);
    }

    return this.filterLegalMoves(
      this.dedupeMoves([
        ...tier1ZeroBreakage,
        ...tier2EdgeTrim,
        ...scoredTier3.map((item) => item.cards),
        ...tier4BombsAndRocket,
      ]),
      target,
      wildRanks
    );
  }

  /**
   * Final safety net: only keep moves the authoritative server rules would accept.
   * Hint builders may merge wings into a longer chain (e.g. 333444555 + 666 -> 4-chain airplane)
   * which the server then rejects - those must never be offered as hints / bot moves.
   */
  private static filterLegalMoves(
    moves: CardData[][],
    target: ClassifiedPattern | null,
    wildRanks: Rank[]
  ): CardData[][] {
    return moves.filter((m) => {
      if (m.length === 0) return false;
      const pattern = DdzRules.identifyPatternFor(m, wildRanks, target);
      return pattern !== null && DdzRules.canBeat(pattern, target);
    });
  }

  /**
   * Tactical AI Decision Engine for playing cards or passing.
   */
  static chooseBestMove(ctx: BotContext): CardData[] {
    const { myCards, mySeat, landlordSeat, lastPlayed, seatCardCounts, wildRanks = [] } = ctx;
    const isMeLandlord = mySeat === landlordSeat;
    const targetPattern =
      lastPlayed && lastPlayed.seat !== mySeat ? lastPlayed.pattern : null;

    const moves = this.findAllPlayableMoves(myCards, targetPattern, wildRanks);
    if (moves.length === 0) return [];

    // 1. Instant Win Check
    for (const m of moves) {
      if (m.length === myCards.length) {
        return m;
      }
    }

    const part = this.partitionHand(myCards, wildRanks);

    // 2. Free Lead Logic
    if (!targetPattern) {
      if (!isMeLandlord) {
        const teammateSeat = [0, 1, 2].find((s) => s !== mySeat && s !== landlordSeat)!;
        const teammateCount = seatCardCounts[teammateSeat] ?? 17;
        if (teammateCount === 1 && part.singles.length > 0) {
          return part.singles[0];
        }
        if (teammateCount === 2 && part.pairs.length > 0) {
          return part.pairs[0];
        }
      }

      const enemySeats = isMeLandlord
        ? [0, 1, 2].filter((s) => s !== landlordSeat)
        : [landlordSeat];
      const enemyHasOneCard = enemySeats.some((s) => (seatCardCounts[s] ?? 17) === 1);
      if (enemyHasOneCard) {
        const nonSingleMove = moves.find((m) => m.length > 1);
        if (nonSingleMove) return nonSingleMove;
        return moves[moves.length - 1];
      }

      return moves[0];
    }

    // 3. Following someone else's play
    const lastSeat = lastPlayed!.seat;
    const isTeammatePlay = !isMeLandlord && lastSeat !== landlordSeat;
    const lastPlayerCardsLeft = seatCardCounts[lastSeat] ?? 17;

    if (isTeammatePlay) {
      if (lastPlayerCardsLeft <= 4) return [];
      if (targetPattern.length >= 2 || targetPattern.mainValue >= 12) return [];

      const cleanSingleFollow = part.singles.find(
        (s) => s[0].value > targetPattern.mainValue && s[0].value <= 14
      );
      return cleanSingleFollow ?? [];
    }

    // 4. Following an Enemy Play
    const firstMove = moves[0];
    const firstPattern = DdzRules.identifyPattern(firstMove, wildRanks);
    if (!firstPattern) return [];

    if (firstPattern.type === PatternType.BOMB || firstPattern.type === PatternType.ROCKET) {
      if (lastPlayerCardsLeft <= 5 || part.netTurns <= 2) {
        return firstMove;
      }
      return [];
    }

    const usedIds = new Set(firstMove.map((c) => c.id));
    const remCards = myCards.filter((c) => !usedIds.has(c.id));
    const remPart = this.partitionHand(remCards, wildRanks);
    if (remPart.netTurns > part.netTurns + 1 && lastPlayerCardsLeft > 6) {
      return [];
    }

    if (lastPlayerCardsLeft === 1 && targetPattern.type === PatternType.SINGLE) {
      // Opponent is about to go out: play the HIGHEST single (moves are not ordered by value).
      const singles = moves.filter((m) => m.length === 1);
      if (singles.length > 0) {
        return singles.reduce((best, m) => (m[0].value > best[0].value ? m : best));
      }
    }

    return firstMove;
  }

  private static dedupeMoves(moves: CardData[][]): CardData[][] {
    const seen = new Set<string>();
    const out: CardData[][] = [];
    for (const m of moves) {
      const key = m
        .map((c) => c.id)
        .sort()
        .join(',');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(m);
      }
    }
    return out;
  }
}
