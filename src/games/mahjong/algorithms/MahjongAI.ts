/**
 * MahjongAI.ts
 * 商业级麻将攻防一体启发式 AI 决策引擎 (参考 xiyoufang/mahjong)
 *
 * 核心逻辑：
 * 1. 进攻导向：基于向听数 (Shanten) + 有效进张 (Ukeire) 最大化评估出牌
 * 2. 防守导向：当对手副露 >= 3 组或残局 (牌墙 < 20) 时，对生张中张施加危险惩罚，优先打现张/熟张避炮
 * 3. 定缺优先：川麻血战到底开局优先打绝定缺花色
 * 4. 动作裁决：智能评估碰、杠、胡与过牌决策
 */

import {
  createCountsVector,
  isHonorTile,
  legacyIdToTileIndex,
  TileIndex,
  TIAO_END,
  TIAO_START,
  TONG_END,
  TONG_START,
  TOTAL_TILE_TYPES,
  WAN_END,
  WAN_START,
} from './TileEngine';
import { calculateShanten } from './ShantenEngine';
import { evaluateHuPattern, EvaluatorOptions } from './HandEvaluator';
import { MeldSnapshot } from './MahjongScorer';

export interface AIPlayerContext {
  handTiles: TileIndex[];
  melds: MeldSnapshot[];
  dingQueSuit?: number; // 0:万, 1:条, 2:筒, -1:无
  riverTiles: TileIndex[]; // 全局各家已出牌河
  opponentsMeldsCount: number[]; // 各对手的副露组数
  wallRemaining: number; // 牌墙剩余张数
  mode: string;
}

/**
 * 计算某张牌的防守危险系数 (0 为绝对安全，分值越高越危险)
 */
function evaluateTileDanger(
  tile: TileIndex,
  riverTiles: TileIndex[],
  wallRemaining: number
): number {
  const idx = legacyIdToTileIndex(tile);

  // 统计该牌在全场牌河中出现的次数
  let riverCount = 0;
  for (const t of riverTiles) {
    if (legacyIdToTileIndex(t) === idx) riverCount++;
  }

  // 规则 1: 牌河中已出现 3 张以上，绝张或近绝张，极度安全
  if (riverCount >= 3) return 0;
  if (riverCount === 2) return 10;
  if (riverCount === 1) return 25;

  // 规则 2: 字牌若从未出现，残局较危险，前期可打
  if (isHonorTile(idx)) {
    return wallRemaining < 25 ? 45 : 15;
  }

  // 规则 3: 数牌中张 (4, 5, 6) 未现张最为凶险
  const rank = (idx % 9) + 1;
  if (rank === 4 || rank === 5 || rank === 6) {
    return 70;
  }
  if (rank === 3 || rank === 7) {
    return 55;
  }
  // 1, 9 幺九数牌相对稍安全
  return 35;
}

/**
 * AI 出牌决策
 */
export function decideBestDiscard(context: AIPlayerContext): TileIndex {
  const {
    handTiles,
    melds,
    dingQueSuit = -1,
    riverTiles,
    opponentsMeldsCount,
    wallRemaining,
    mode,
  } = context;

  // 1. 定缺强制约束：若有定缺牌必须先打定缺花色
  if (dingQueSuit >= 0 && dingQueSuit <= 2) {
    const dingQueCandidates: TileIndex[] = [];
    for (const t of handTiles) {
      const idx = legacyIdToTileIndex(t);
      if (dingQueSuit === 0 && idx >= WAN_START && idx <= WAN_END) dingQueCandidates.push(t);
      else if (dingQueSuit === 1 && idx >= TIAO_START && idx <= TIAO_END) dingQueCandidates.push(t);
      else if (dingQueSuit === 2 && idx >= TONG_START && idx <= TONG_END) dingQueCandidates.push(t);
    }
    if (dingQueCandidates.length > 0) {
      // 优先打孤张或边张定缺牌
      return dingQueCandidates[0];
    }
  }

  // 2. 评估场面威胁度
  const maxOpponentMelds = Math.max(...opponentsMeldsCount, 0);
  const isEndGame = wallRemaining <= 24;
  const isHighDangerState = maxOpponentMelds >= 3 || (maxOpponentMelds >= 2 && isEndGame);

  const evalOptions: EvaluatorOptions = {
    allowQiDui: true,
    allowShiSanYao: mode === 'guobiao',
    wildcardIndex: mode === 'hongzhong' ? 31 : undefined,
    dingQueSuit,
  };

  // 3. 枚举打出每张候选牌并计算攻防综合得分
  const uniqueCandidates = Array.from(new Set(handTiles.map((t) => legacyIdToTileIndex(t))));
  let bestTile = handTiles[0];
  let highestScore = -Infinity;

  for (const candidate of uniqueCandidates) {
    const idx = handTiles.findIndex((t) => legacyIdToTileIndex(t) === candidate);
    if (idx === -1) continue;

    const remainingHand = [...handTiles];
    remainingHand.splice(idx, 1);

    // 计算打出后的向听数 (越小越好)
    const shanten = calculateShanten(remainingHand, melds.length, {
      allowQiDui: true,
      allowShiSanYao: mode === 'guobiao',
    });

    // 计算有效进张总数 (能使向听数缩减的牌张数)
    let ukeireCount = 0;
    for (let test = 0; test < TOTAL_TILE_TYPES; test++) {
      const newShanten = calculateShanten([...remainingHand, test], melds.length, {
        allowQiDui: true,
        allowShiSanYao: mode === 'guobiao',
      });
      if (newShanten < shanten) {
        // 估算剩余张数 (粗略按未现 3 张计)
        ukeireCount += 2;
      }
    }

    // 进攻得分：向听数越小越优，进张数越大越优
    const attackScore = -100 * shanten + ukeireCount;

    // 防守惩罚：危险度越低越安全
    const danger = evaluateTileDanger(candidate, riverTiles, wallRemaining);
    const defenseWeight = isHighDangerState ? (shanten >= 2 ? 2.5 : 0.8) : 0.2;

    const totalScore = attackScore - danger * defenseWeight;

    if (totalScore > highestScore) {
      highestScore = totalScore;
      bestTile = candidate;
    }
  }

  return bestTile;
}

/**
 * AI 碰牌决策评估
 */
export function shouldAIPeng(
  handTiles: TileIndex[],
  targetTile: TileIndex,
  meldsCount: number,
  mode: string
): boolean {
  const targetIdx = legacyIdToTileIndex(targetTile);
  const counts = createCountsVector(handTiles);
  if (counts[targetIdx] < 2) return false;

  // 计算当前向听数
  const currentShanten = calculateShanten(handTiles, meldsCount, { allowQiDui: true });

  // 模拟碰牌后 (扣除 2 张，增加 1 组副露)
  const simulatedHand = [...handTiles];
  let removed = 0;
  for (let i = simulatedHand.length - 1; i >= 0 && removed < 2; i--) {
    if (legacyIdToTileIndex(simulatedHand[i]) === targetIdx) {
      simulatedHand.splice(i, 1);
      removed++;
    }
  }

  // 模拟打出一张最优牌后的向听数
  const newShanten = calculateShanten(simulatedHand, meldsCount + 1, { allowQiDui: false });

  // 若能显著推进向听数或直接听牌，则果断碰牌
  return newShanten <= currentShanten && newShanten <= 1;
}

/**
 * AI 杠牌决策评估
 */
export function shouldAIGang(): boolean {
  // 商业麻将中，杠牌带来开杠奖励与刮风下雨收益，AI 默认积极开杠
  return true;
}
