import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  RotateCcw,
  Sparkles,
  Trophy,
  Undo2,
  X,
} from 'lucide-react';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';
import { AvatarSvg } from '../../../shared/ui/AvatarSvg';
import { CardData, Rank, Suit } from '../types';

export interface PuzzleLevel {
  id: number;
  title: string;
  difficulty: '入门' | '进阶' | '困难' | '宗师' | '绝世';
  rewardBeans: number;
  description: string;
  strategyTip: string;
  landlordRanks: Rank[];
  peasantRanks: Rank[];
}

const RANK_VAL: Record<Rank, number> = {
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

const SUITS: Array<Exclude<Suit, null>> = ['spade', 'heart', 'club', 'diamond'];

function buildHandFromRanks(ranks: Rank[], prefix: string): CardData[] {
  const rankCounter: Record<string, number> = {};
  return ranks
    .map((r, i) => {
      const count = rankCounter[r] ?? 0;
      rankCounter[r] = count + 1;
      const suit: Suit =
        r === 'small_joker' || r === 'big_joker' ? null : SUITS[count % 4];
      return {
        id: `${prefix}_${r}_${i}`,
        rank: r,
        suit,
        value: RANK_VAL[r],
      };
    })
    .sort((a, b) => b.value - a.value);
}

export const PUZZLE_LEVELS: PuzzleLevel[] = [
  {
    id: 1,
    title: '第一关 · 引蛇出洞',
    difficulty: '入门',
    rewardBeans: 500,
    description: '农民手握单张2与对9，若直接出对子会被农民单2夺牌权。',
    strategyTip: '先打单张Q逼出农民单2，再用小王夺回牌权，最后对7收尾！',
    landlordRanks: ['small_joker', 'Q', '7', '7'],
    peasantRanks: ['2', '9', '9'],
  },
  {
    id: 2,
    title: '第二关 · 三带破敌',
    difficulty: '入门',
    rewardBeans: 800,
    description: '手握三张8与单A、单4，农民握有对K与单2。',
    strategyTip: '先用三张8带4打出（农民无三张可管），再出单A即可获胜？注意留大牌控场！',
    landlordRanks: ['big_joker', '8', '8', '8', '4', '3'],
    peasantRanks: ['2', 'K', 'K', '9'],
  },
  {
    id: 3,
    title: '第三关 · 拆对制胜',
    difficulty: '进阶',
    rewardBeans: 1200,
    description: '农民握有对J与单A，地主手握对Q、单K与单5。',
    strategyTip: '先出对Q压死农民对J，逼其过牌后，需谨防单5被管！试试先出单K逼出农民单A！',
    landlordRanks: ['2', 'Q', 'Q', '6'],
    peasantRanks: ['A', 'J', 'J', '4'],
  },
  {
    id: 4,
    title: '第四关 · 顺子牵制',
    difficulty: '困难',
    rewardBeans: 2000,
    description: '地主拥有34567顺子与对A、单3，农民握有大王与对K。',
    strategyTip: '先打34567五张顺子，农民无法压制，随后打对A压制农民对K，最后单3走完！',
    landlordRanks: ['A', 'A', '7', '6', '5', '4', '3', '3'],
    peasantRanks: ['big_joker', 'K', 'K', '8'],
  },
  {
    id: 5,
    title: '第五关 · 棄炸保帅',
    difficulty: '宗师',
    rewardBeans: 3500,
    description: '四张9若当炸弹打会留下两张孤立小单牌，四带二单反而一锤定音！',
    strategyTip: '利用四带二单（9999带3和5）一次性清空两张小单牌，再用单2收官！',
    landlordRanks: ['2', '9', '9', '9', '9', '5', '3'],
    peasantRanks: ['small_joker', 'A', 'Q', 'Q'],
  },
  {
    id: 6,
    title: '第六关 · 绝境逢生',
    difficulty: '绝世',
    rewardBeans: 5000,
    description: '巅峰残局！地主既有三带又有单张，出牌次序错一步即满盘皆输。',
    strategyTip: '先打单J诱出农民单2，大王管上夺回先手，再打三6带4，最后对10绝杀！',
    landlordRanks: ['big_joker', 'J', '10', '10', '6', '6', '6', '4'],
    peasantRanks: ['2', 'Q', 'Q', '5'],
  },
];

interface PuzzleMovePattern {
  type:
    | 'SINGLE'
    | 'PAIR'
    | 'TRIPLE'
    | 'TRIPLE_SINGLE'
    | 'TRIPLE_PAIR'
    | 'STRAIGHT'
    | 'FOUR_TWO_SINGLES'
    | 'BOMB'
    | 'ROCKET';
  mainValue: number;
  length: number;
  cards: CardData[];
  label: string;
}

function classifyPuzzleMove(cards: CardData[]): PuzzleMovePattern | null {
  const n = cards.length;
  if (n === 0) return null;
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const byVal = new Map<number, CardData[]>();
  for (const c of sorted) {
    const list = byVal.get(c.value) ?? [];
    list.push(c);
    byVal.set(c.value, list);
  }
  const entries = Array.from(byVal.entries()).sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);

  if (n === 1) {
    return {
      type: 'SINGLE',
      mainValue: sorted[0].value,
      length: 1,
      cards: sorted,
      label: `单${sorted[0].rank === 'small_joker' ? '小王' : sorted[0].rank === 'big_joker' ? '大王' : sorted[0].rank}`,
    };
  }
  if (n === 2) {
    if (byVal.has(16) && byVal.has(17)) {
      return { type: 'ROCKET', mainValue: 17, length: 2, cards: sorted, label: '王炸' };
    }
    if (entries.length === 1 && entries[0][1].length === 2) {
      return {
        type: 'PAIR',
        mainValue: entries[0][0],
        length: 2,
        cards: sorted,
        label: `对${sorted[0].rank}`,
      };
    }
    return null;
  }
  if (n === 3) {
    if (entries.length === 1 && entries[0][1].length === 3) {
      return {
        type: 'TRIPLE',
        mainValue: entries[0][0],
        length: 3,
        cards: sorted,
        label: `三张${sorted[0].rank}`,
      };
    }
    return null;
  }
  if (n === 4) {
    if (entries.length === 1 && entries[0][1].length === 4) {
      return {
        type: 'BOMB',
        mainValue: entries[0][0],
        length: 4,
        cards: sorted,
        label: `炸弹${sorted[0].rank}`,
      };
    }
    if (entries[0][1].length === 3) {
      return {
        type: 'TRIPLE_SINGLE',
        mainValue: entries[0][0],
        length: 4,
        cards: [...entries[0][1], ...entries[1][1]],
        label: '三带一',
      };
    }
    return null;
  }
  if (n === 5 && entries[0][1].length === 3 && entries[1]?.[1].length === 2) {
    return {
      type: 'TRIPLE_PAIR',
      mainValue: entries[0][0],
      length: 5,
      cards: [...entries[0][1], ...entries[1][1]],
      label: '三带二',
    };
  }
  if (n === 6 && entries[0][1].length === 4) {
    return {
      type: 'FOUR_TWO_SINGLES',
      mainValue: entries[0][0],
      length: 6,
      cards: sorted,
      label: '四带二单',
    };
  }
  if (n >= 5 && entries.length === n) {
    const vals = sorted.map((c) => c.value).sort((a, b) => a - b);
    if (vals[vals.length - 1] <= 14) {
      let ok = true;
      for (let i = 1; i < vals.length; i++) {
        if (vals[i] !== vals[i - 1] + 1) {
          ok = false;
          break;
        }
      }
      if (ok) {
        return {
          type: 'STRAIGHT',
          mainValue: vals[vals.length - 1],
          length: n,
          cards: sorted,
          label: '顺子',
        };
      }
    }
  }
  return null;
}

function canPuzzleMoveBeat(
  cand: PuzzleMovePattern,
  target: PuzzleMovePattern | null
): boolean {
  if (!target) return true;
  if (cand.type === 'ROCKET') return true;
  if (target.type === 'ROCKET') return false;
  if (cand.type === 'BOMB') {
    if (target.type !== 'BOMB') return true;
    return cand.mainValue > target.mainValue;
  }
  if (cand.type !== target.type || cand.length !== target.length) return false;
  return cand.mainValue > target.mainValue;
}

function generateLegalPuzzleMoves(
  hand: CardData[],
  target: PuzzleMovePattern | null
): PuzzleMovePattern[] {
  const byVal = new Map<number, CardData[]>();
  for (const c of hand) {
    const list = byVal.get(c.value) ?? [];
    list.push(c);
    byVal.set(c.value, list);
  }
  const uniqueVals = Array.from(byVal.keys()).sort((a, b) => a - b);
  const candidates: PuzzleMovePattern[] = [];

  // Singles
  for (const v of uniqueVals) {
    const m = classifyPuzzleMove([byVal.get(v)![0]]);
    if (m && canPuzzleMoveBeat(m, target)) candidates.push(m);
  }

  // Pairs
  for (const v of uniqueVals) {
    const grp = byVal.get(v)!;
    if (grp.length >= 2) {
      const m = classifyPuzzleMove(grp.slice(0, 2));
      if (m && canPuzzleMoveBeat(m, target)) candidates.push(m);
    }
  }

  // Triples, Triple+1, Triple+2
  for (const v of uniqueVals) {
    const grp = byVal.get(v)!;
    if (grp.length >= 3) {
      const core = grp.slice(0, 3);
      const t = classifyPuzzleMove(core);
      if (t && canPuzzleMoveBeat(t, target)) candidates.push(t);

      for (const kv of uniqueVals) {
        if (kv === v) continue;
        const kGrp = byVal.get(kv)!;
        const ts = classifyPuzzleMove([...core, kGrp[0]]);
        if (ts && canPuzzleMoveBeat(ts, target)) candidates.push(ts);
        if (kGrp.length >= 2) {
          const tp = classifyPuzzleMove([...core, ...kGrp.slice(0, 2)]);
          if (tp && canPuzzleMoveBeat(tp, target)) candidates.push(tp);
        }
      }
    }
  }

  // Four + Two singles & Bombs
  for (const v of uniqueVals) {
    const grp = byVal.get(v)!;
    if (grp.length === 4) {
      const b = classifyPuzzleMove(grp);
      if (b && canPuzzleMoveBeat(b, target)) candidates.push(b);

      const otherVals = uniqueVals.filter((ov) => ov !== v);
      for (let i = 0; i < otherVals.length; i++) {
        for (let j = i + 1; j < otherVals.length; j++) {
          const f2 = classifyPuzzleMove([
            ...grp,
            byVal.get(otherVals[i])![0],
            byVal.get(otherVals[j])![0],
          ]);
          if (f2 && canPuzzleMoveBeat(f2, target)) candidates.push(f2);
        }
      }
    }
  }

  // Straights (length 5..hand.length)
  const seqVals = uniqueVals.filter((v) => v <= 14);
  for (let len = 5; len <= seqVals.length; len++) {
    for (let start = 0; start + len <= seqVals.length; start++) {
      const slice = seqVals.slice(start, start + len);
      if (slice[slice.length - 1] - slice[0] === len - 1) {
        const cards = slice.map((v) => byVal.get(v)![0]);
        const st = classifyPuzzleMove(cards);
        if (st && canPuzzleMoveBeat(st, target)) candidates.push(st);
      }
    }
  }

  // Rocket
  if (byVal.has(16) && byVal.has(17)) {
    const r = classifyPuzzleMove([byVal.get(16)![0], byVal.get(17)![0]]);
    if (r && canPuzzleMoveBeat(r, target)) candidates.push(r);
  }

  // Order multi-card combos first to accelerate Alpha-Beta pruning
  candidates.sort((a, b) => b.length - a.length || a.mainValue - b.mainValue);
  return candidates;
}

interface MinimaxResult {
  landlordWins: boolean;
  bestMove: PuzzleMovePattern | null; // null means PASS
  depth: number;
}

/**
 * Whitepaper v2.0 Section 1.5: Alpha-Beta / Minimax Endgame Solver with Memoization
 */
function solveEndgameMinimax(
  landlordHand: CardData[],
  peasantHand: CardData[],
  turn: 'landlord' | 'peasant',
  lastMove: PuzzleMovePattern | null,
  memo = new Map<string, MinimaxResult>(),
  depth = 0
): MinimaxResult {
  if (landlordHand.length === 0) {
    return { landlordWins: true, bestMove: null, depth };
  }
  if (peasantHand.length === 0) {
    return { landlordWins: false, bestMove: null, depth };
  }
  if (depth > 26) {
    return {
      landlordWins: landlordHand.length <= peasantHand.length,
      bestMove: null,
      depth,
    };
  }

  const lKey = landlordHand.map((c) => c.value).join(',');
  const pKey = peasantHand.map((c) => c.value).join(',');
  const mKey = lastMove ? `${lastMove.type}:${lastMove.mainValue}:${lastMove.length}` : 'FREE';
  const stateKey = `${turn}|${lKey}|${pKey}|${mKey}`;

  const cached = memo.get(stateKey);
  if (cached) return cached;

  const activeHand = turn === 'landlord' ? landlordHand : peasantHand;
  const legalMoves = generateLegalPuzzleMoves(activeHand, lastMove);

  if (turn === 'landlord') {
    let bestFallback: MinimaxResult = {
      landlordWins: false,
      bestMove: legalMoves[0] ?? null,
      depth: 99,
    };

    for (const move of legalMoves) {
      const usedIds = new Set(move.cards.map((c) => c.id));
      const nextL = landlordHand.filter((c) => !usedIds.has(c.id));
      const sub = solveEndgameMinimax(nextL, peasantHand, 'peasant', move, memo, depth + 1);
      if (sub.landlordWins) {
        const winRes: MinimaxResult = {
          landlordWins: true,
          bestMove: move,
          depth: sub.depth,
        };
        memo.set(stateKey, winRes);
        return winRes;
      }
      bestFallback = { landlordWins: false, bestMove: move, depth: sub.depth };
    }

    if (lastMove !== null) {
      const passSub = solveEndgameMinimax(
        landlordHand,
        peasantHand,
        'peasant',
        null,
        memo,
        depth + 1
      );
      if (passSub.landlordWins) {
        const winPass: MinimaxResult = {
          landlordWins: true,
          bestMove: null,
          depth: passSub.depth,
        };
        memo.set(stateKey, winPass);
        return winPass;
      }
    }

    memo.set(stateKey, bestFallback);
    return bestFallback;
  } else {
    // Peasant is minimizing (seeking landlordWins === false)
    let longestDelay: MinimaxResult = {
      landlordWins: true,
      bestMove: null,
      depth: 0,
    };

    for (const move of legalMoves) {
      const usedIds = new Set(move.cards.map((c) => c.id));
      const nextP = peasantHand.filter((c) => !usedIds.has(c.id));
      const sub = solveEndgameMinimax(landlordHand, nextP, 'landlord', move, memo, depth + 1);
      if (!sub.landlordWins) {
        const peasantWin: MinimaxResult = {
          landlordWins: false,
          bestMove: move,
          depth: sub.depth,
        };
        memo.set(stateKey, peasantWin);
        return peasantWin;
      }
      if (sub.depth >= longestDelay.depth) {
        longestDelay = { landlordWins: true, bestMove: move, depth: sub.depth };
      }
    }

    if (lastMove !== null) {
      const passSub = solveEndgameMinimax(
        landlordHand,
        peasantHand,
        'landlord',
        null,
        memo,
        depth + 1
      );
      if (!passSub.landlordWins) {
        const peasantPassWin: MinimaxResult = {
          landlordWins: false,
          bestMove: null,
          depth: passSub.depth,
        };
        memo.set(stateKey, peasantPassWin);
        return peasantPassWin;
      }
      if (passSub.depth >= longestDelay.depth) {
        longestDelay = { landlordWins: true, bestMove: null, depth: passSub.depth };
      }
    }

    memo.set(stateKey, longestDelay);
    return longestDelay;
  }
}

interface HistorySnapshot {
  landlordHand: CardData[];
  peasantHand: CardData[];
  turn: 'landlord' | 'peasant';
  lastMove: PuzzleMovePattern | null;
  lastActor: 'landlord' | 'peasant' | null;
  peasantStatusText: string;
  landlordStatusText: string;
}

export interface PuzzleChallengeModalProps {
  initialLevelIdx?: number;
  onClose: () => void;
  onClaimReward?: (beans: number, levelTitle: string) => void;
}

export const PuzzleChallengeModal: React.FC<PuzzleChallengeModalProps> = ({
  initialLevelIdx = 0,
  onClose,
  onClaimReward,
}) => {
  const safeInitIdx = Math.max(0, Math.min(PUZZLE_LEVELS.length - 1, initialLevelIdx));
  const [levelIdx, setLevelIdx] = useState<number>(safeInitIdx);
  const currentLevel = PUZZLE_LEVELS[levelIdx];

  const [landlordHand, setLandlordHand] = useState<CardData[]>(() =>
    buildHandFromRanks(PUZZLE_LEVELS[safeInitIdx].landlordRanks, 'L')
  );
  const [peasantHand, setPeasantHand] = useState<CardData[]>(() =>
    buildHandFromRanks(PUZZLE_LEVELS[safeInitIdx].peasantRanks, 'P')
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [turn, setTurn] = useState<'landlord' | 'peasant'>('landlord');
  const [lastMove, setLastMove] = useState<PuzzleMovePattern | null>(null);
  const [lastActor, setLastActor] = useState<'landlord' | 'peasant' | null>(null);
  const [peasantStatusText, setPeasantStatusText] = useState<string>('等待地主先手出牌');
  const [landlordStatusText, setLandlordStatusText] = useState<string>('请选择手牌出击');
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [solvedLevels, setSolvedLevels] = useState<Set<number>>(new Set());
  const [solverHintText, setSolverHintText] = useState<string | null>(null);

  const loadLevel = (idx: number) => {
    const lv = PUZZLE_LEVELS[idx];
    setLevelIdx(idx);
    setLandlordHand(buildHandFromRanks(lv.landlordRanks, 'L'));
    setPeasantHand(buildHandFromRanks(lv.peasantRanks, 'P'));
    setSelectedIds(new Set());
    setTurn('landlord');
    setLastMove(null);
    setLastActor(null);
    setPeasantStatusText('等待地主先手出牌');
    setLandlordStatusText('请选择手牌出击');
    setHistory([]);
    setSolverHintText(null);
  };

  const gameResult: 'playing' | 'win' | 'lose' =
    landlordHand.length === 0 ? 'win' : peasantHand.length === 0 ? 'lose' : 'playing';

  // Run Minimax evaluation on current state when it's Landlord's turn
  const minimaxEval = useMemo(() => {
    if (gameResult !== 'playing' || turn !== 'landlord') return null;
    const effectiveTarget = lastActor === 'peasant' ? lastMove : null;
    return solveEndgameMinimax(landlordHand, peasantHand, 'landlord', effectiveTarget);
  }, [landlordHand, peasantHand, turn, lastMove, lastActor, gameResult]);

  // Peasant AI turn execution via Minimax Solver
  useEffect(() => {
    if (gameResult !== 'playing' || turn !== 'peasant') return;
    const timer = setTimeout(() => {
      const effectiveTarget = lastActor === 'landlord' ? lastMove : null;
      const aiDecision = solveEndgameMinimax(
        landlordHand,
        peasantHand,
        'peasant',
        effectiveTarget
      );

      if (!aiDecision.bestMove) {
        soundEngine.playTap(440);
        setPeasantStatusText('农民：不出');
        setLastMove(null);
        setLastActor(null);
        setTurn('landlord');
      } else {
        const move = aiDecision.bestMove;
        const usedIds = new Set(move.cards.map((c) => c.id));
        const nextP = peasantHand.filter((c) => !usedIds.has(c.id));
        soundEngine.playCardPlace(false);
        setPeasantHand(nextP);
        setLastMove(move);
        setLastActor('peasant');
        setPeasantStatusText(
          `农民打出：${move.label} [${move.cards.map((c) => c.rank).join(' ')}]`
        );
        if (nextP.length === 0) {
          soundEngine.playDefeatTone();
        } else {
          setTurn('landlord');
        }
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [turn, gameResult, landlordHand, peasantHand, lastMove, lastActor]);

  const handleToggleCard = (cardId: string) => {
    if (turn !== 'landlord' || gameResult !== 'playing') return;
    soundEngine.playTap(760);
    hapticEngine.selectCard();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handlePlaySelected = () => {
    if (turn !== 'landlord' || gameResult !== 'playing') return;
    const picked = landlordHand.filter((c) => selectedIds.has(c.id));
    const move = classifyPuzzleMove(picked);
    if (!move) {
      setSolverHintText('所选牌型不符合规则，请重新点选');
      return;
    }

    const effectiveTarget = lastActor === 'peasant' ? lastMove : null;
    if (!canPuzzleMoveBeat(move, effectiveTarget)) {
      setSolverHintText('所选牌型无法压制农民的出牌');
      return;
    }

    setHistory((prev) => [
      ...prev,
      {
        landlordHand: [...landlordHand],
        peasantHand: [...peasantHand],
        turn,
        lastMove,
        lastActor,
        peasantStatusText,
        landlordStatusText,
      },
    ]);

    const nextL = landlordHand.filter((c) => !selectedIds.has(c.id));
    soundEngine.playCardPlace(true);
    hapticEngine.playCard();
    setLandlordHand(nextL);
    setSelectedIds(new Set());
    setLastMove(move);
    setLastActor('landlord');
    setLandlordStatusText(`已出：${move.label} [${move.cards.map((c) => c.rank).join(' ')}]`);
    setSolverHintText(null);

    if (nextL.length === 0) {
      soundEngine.playVictoryFanfare();
      if (!solvedLevels.has(currentLevel.id)) {
        setSolvedLevels((prev) => new Set(prev).add(currentLevel.id));
        onClaimReward?.(currentLevel.rewardBeans, currentLevel.title);
      }
    } else {
      setTurn('peasant');
    }
  };

  const handlePass = () => {
    if (turn !== 'landlord' || gameResult !== 'playing') return;
    if (lastActor !== 'peasant' || !lastMove) {
      setSolverHintText('当前为您的自由先手回合，必须出牌');
      return;
    }

    setHistory((prev) => [
      ...prev,
      {
        landlordHand: [...landlordHand],
        peasantHand: [...peasantHand],
        turn,
        lastMove,
        lastActor,
        peasantStatusText,
        landlordStatusText,
      },
    ]);

    soundEngine.playTap(480);
    setSelectedIds(new Set());
    setLastMove(null);
    setLastActor(null);
    setLandlordStatusText('地主：不出');
    setSolverHintText(null);
    setTurn('peasant');
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    soundEngine.playTap(680);
    const prev = history[history.length - 1];
    setLandlordHand(prev.landlordHand);
    setPeasantHand(prev.peasantHand);
    setTurn(prev.turn);
    setLastMove(prev.lastMove);
    setLastActor(prev.lastActor);
    setPeasantStatusText(prev.peasantStatusText);
    setLandlordStatusText(prev.landlordStatusText);
    setSelectedIds(new Set());
    setSolverHintText(null);
    setHistory((h) => h.slice(0, -1));
  };

  const handleMinimaxHint = () => {
    if (!minimaxEval) return;
    soundEngine.playGlissando();
    hapticEngine.smartComboLock();

    if (!minimaxEval.landlordWins) {
      setSolverHintText('提示：当前局面已被农民反制，建议点击「悔棋一步」修正前序出牌！');
      return;
    }

    if (!minimaxEval.bestMove) {
      setSelectedIds(new Set());
      setSolverHintText('提示：本手选择「不出」蓄力，等待农民出牌后再反击！');
      return;
    }

    const ids = new Set(minimaxEval.bestMove.cards.map((c) => c.id));
    setSelectedIds(ids);
    setSolverHintText(
      `推荐必胜解：打出 ${minimaxEval.bestMove.label} [${minimaxEval.bestMove.cards
        .map((c) => (c.rank === 'big_joker' ? '大王' : c.rank === 'small_joker' ? '小王' : c.rank))
        .join(' · ')}]（预计 ${minimaxEval.depth} 步内必胜）`
    );
  };

  const renderCardButton = (card: CardData, interactive: boolean) => {
    const selected = selectedIds.has(card.id);
    const isRed =
      card.suit === 'heart' || card.suit === 'diamond' || card.rank === 'big_joker';
    const suitSymbol =
      card.suit === 'spade'
        ? '♠'
        : card.suit === 'heart'
          ? '♥'
          : card.suit === 'club'
            ? '♣'
            : card.suit === 'diamond'
              ? '♦'
              : '★';
    const rankLabel =
      card.rank === 'big_joker'
        ? '大王'
        : card.rank === 'small_joker'
          ? '小王'
          : card.rank;

    return (
      <button
        key={card.id}
        type="button"
        disabled={!interactive}
        onClick={() => interactive && handleToggleCard(card.id)}
        className={`relative flex h-24 w-16 flex-col justify-between rounded-xl border-2 p-2 shadow-lg transition-all ${
          selected
            ? '-translate-y-3 border-amber-400 bg-amber-50 ring-2 ring-amber-400/70'
            : 'border-slate-300 bg-white hover:-translate-y-1'
        } ${interactive ? 'cursor-pointer' : 'cursor-default opacity-95'}`}
      >
        <div
          className={`text-left font-mono text-sm font-extrabold leading-none ${
            isRed ? 'text-rose-600' : 'text-slate-900'
          }`}
        >
          <div>{rankLabel}</div>
          <div className="mt-0.5 text-xs">{suitSymbol}</div>
        </div>
        <div
          className={`self-end text-xl leading-none ${
            isRed ? 'text-rose-500' : 'text-slate-800'
          }`}
        >
          {suitSymbol}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-amber-400/45 bg-gradient-to-b from-[#170c06] via-[#072318] to-[#04140e] text-[#FAF8F5] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/25 bg-[#120905]/90 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-[#18181B]">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-extrabold text-amber-200">
                  残局闯关 · 极小极大求解器 (Minimax Alpha-Beta Solver)
                </h2>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  白皮书 1.5 模块
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                全明牌博弈树搜索 · 农民 AI 采用极小极大最优防守 · 支持实时必胜路径推演
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-amber-400/30 bg-white/5 p-2 text-amber-200 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Level Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-emerald-500/20 bg-[#041810]/90 px-5 py-2.5">
          {PUZZLE_LEVELS.map((lv, idx) => {
            const active = idx === levelIdx;
            const solved = solvedLevels.has(lv.id);
            return (
              <button
                key={lv.id}
                type="button"
                onClick={() => loadLevel(idx)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? 'border-amber-300 bg-amber-500/25 text-amber-200 shadow'
                    : 'border-emerald-500/25 bg-[#062016] text-emerald-200/80 hover:border-amber-400/40'
                }`}
              >
                {solved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                <span>{lv.title}</span>
                <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                  {lv.difficulty}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Puzzle Arena */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Level Brief & Real-time Minimax Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-[#0b291d]/80 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-extrabold text-amber-300">
                  {currentLevel.title}
                </span>
                <span className="text-xs text-emerald-200/90">
                  首通奖励：+{currentLevel.rewardBeans} 欢乐豆
                </span>
              </div>
              <p className="mt-0.5 text-xs text-emerald-100/85">{currentLevel.description}</p>
            </div>

            {minimaxEval && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  minimaxEval.landlordWins
                    ? 'border-emerald-400/50 bg-emerald-950/90 text-emerald-200'
                    : 'border-rose-400/50 bg-rose-950/90 text-rose-200'
                }`}
              >
                <Cpu className="h-4 w-4 text-amber-400" />
                <span>
                  博弈树估值：
                  {minimaxEval.landlordWins
                    ? `地主存在必胜解（最优 ${minimaxEval.depth} 步）`
                    : '当前走法已被农民反制（请悔棋）'}
                </span>
              </div>
            )}
          </div>

          {/* Peasant AI Open Hand Zone */}
          <div className="rounded-2xl border border-emerald-400/25 bg-[#041810]/90 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <AvatarSvg
                  avatarId="kashen"
                  size={40}
                  animState={turn === 'peasant' ? 'think' : gameResult === 'lose' ? 'win' : 'idle'}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">
                      守关农民 · 陆九渊 (Alpha-Beta AI)
                    </span>
                    <span className="rounded bg-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                      明牌防守 · 剩 {peasantHand.length} 张
                    </span>
                  </div>
                  <p className="text-xs text-amber-300">{peasantStatusText}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 py-1">
              {peasantHand.map((c) => renderCardButton(c, false))}
            </div>
          </div>

          {/* Center Trick Table Banner */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-400/25 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.22),rgba(4,24,16,0.9))] py-4 px-4 text-center">
            {gameResult === 'win' ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/25 px-4 py-1 text-sm font-extrabold text-amber-300">
                  <Trophy className="h-4 w-4" />
                  <span>恭喜破局！地主完美获胜！</span>
                </div>
                <p className="text-xs text-emerald-200">
                  您已成功破解「{currentLevel.title}」的极小极大博弈树防线！
                </p>
                {levelIdx + 1 < PUZZLE_LEVELS.length && (
                  <button
                    type="button"
                    onClick={() => loadLevel(levelIdx + 1)}
                    className="mt-1 inline-flex items-center gap-1 rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-extrabold text-[#18181B] hover:bg-amber-400"
                  >
                    <span>挑战下一关</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : gameResult === 'lose' ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/25 px-4 py-1 text-sm font-extrabold text-rose-300">
                  <span>闯关失败 · 农民率先走完手牌</span>
                </div>
                <p className="text-xs text-emerald-200/80">
                  提示：{currentLevel.strategyTip}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-200">
                  {lastMove
                    ? `当前桌面牌型：${lastActor === 'landlord' ? '地主' : '农民'} 打出 【${
                        lastMove.label
                      }】`
                    : '当前桌面为空 · 自由先手出牌'}
                </div>
                <div className="text-[11px] text-emerald-300/85">{landlordStatusText}</div>
              </div>
            )}

            {solverHintText && (
              <div className="mt-2.5 rounded-xl border border-amber-400/50 bg-amber-500/15 px-3.5 py-1.5 text-xs font-semibold text-amber-200">
                {solverHintText}
              </div>
            )}
          </div>

          {/* Landlord Player Hand & Controls */}
          <div className="rounded-2xl border border-amber-400/35 bg-[#120905]/90 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <AvatarSvg
                  avatarId="noble"
                  size={40}
                  isLandlord={true}
                  animState={gameResult === 'win' ? 'win' : turn === 'landlord' ? 'play' : 'idle'}
                />
                <div>
                  <span className="text-sm font-extrabold text-amber-200">
                    破局地主（您 · 剩 {landlordHand.length} 张）
                  </span>
                  <p className="text-xs text-emerald-300/80">
                    破局锦囊：{currentLevel.strategyTip}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="flex items-center gap-1 rounded-xl border border-emerald-400/35 bg-emerald-950 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-900 disabled:opacity-40"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>悔棋一步</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadLevel(levelIdx)}
                  className="flex items-center gap-1 rounded-xl border border-amber-400/35 bg-amber-950/70 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-900/80"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>重置本关</span>
                </button>
                <button
                  type="button"
                  onClick={handleMinimaxHint}
                  disabled={turn !== 'landlord' || gameResult !== 'playing'}
                  className="flex items-center gap-1 rounded-xl border border-sky-400/50 bg-sky-600/30 px-3.5 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-600/45 disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                  <span>AI 极小极大必胜提示</span>
                </button>
              </div>
            </div>

            <div className="my-4 flex flex-wrap items-center justify-center gap-2.5">
              {landlordHand.map((c) => renderCardButton(c, turn === 'landlord' && gameResult === 'playing'))}
            </div>

            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={handlePass}
                disabled={
                  turn !== 'landlord' ||
                  gameResult !== 'playing' ||
                  lastActor !== 'peasant' ||
                  !lastMove
                }
                className="rounded-full border border-slate-400/40 bg-slate-700 px-6 py-2 text-xs font-extrabold text-white hover:bg-slate-600 disabled:opacity-40"
              >
                不 出
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
                className="rounded-full border border-emerald-400/40 bg-emerald-900/80 px-6 py-2 text-xs font-extrabold text-emerald-100 hover:bg-emerald-800 disabled:opacity-40"
              >
                重 选
              </button>
              <button
                type="button"
                onClick={handlePlaySelected}
                disabled={turn !== 'landlord' || gameResult !== 'playing' || selectedIds.size === 0}
                className="rounded-full bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500 px-8 py-2 text-sm font-extrabold text-[#18181B] shadow-lg hover:brightness-105 disabled:opacity-40"
              >
                出 牌
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
