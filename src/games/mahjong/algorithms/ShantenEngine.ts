/**
 * ShantenEngine.ts
 * 商业级麻将向听数 (Shanten) 与有效进张 (Ukeire) 评估引擎 (参考 xiyoufang/mahjong)
 *
 * 定义：
 * -1 向听：已达成胡牌
 *  0 向听：听牌 (差 1 张胡牌)
 *  1 向听：一向听 (差 1 张听牌)
 *  2+ 向听：二向听及以上
 */

import {
  createCountsVector,
  isOrphanTile,
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
import { evaluateHuPattern, EvaluatorOptions } from './HandEvaluator';

/**
 * 递归计算常规面子向听数 (4 面子 + 1 雀头)
 * 标准向听公式：8 - 2*面子数 - 坎/搭子数 - (有对子? 1 : 0)
 */
function calculateStandardShanten(counts: number[], meldCount: number): number {
  let minShanten = 8 - 2 * meldCount;

  // 面子拆分回溯状态
  const search = (
    pos: number,
    completeSets: number,
    partialSets: number,
    hasEye: boolean
  ) => {
    // 限制最多 4 个面子
    const totalSets = meldCount + completeSets;
    if (totalSets + partialSets > 4) {
      partialSets = 4 - totalSets;
    }

    // 计算当前分支向听数
    const currentShanten = 8 - 2 * (meldCount + completeSets) - partialSets - (hasEye ? 1 : 0);
    if (currentShanten < minShanten) {
      minShanten = currentShanten;
    }

    if (pos >= TOTAL_TILE_TYPES) return;

    // 若当前牌没有剩余，推进到下一张牌
    if (counts[pos] === 0) {
      search(pos + 1, completeSets, partialSets, hasEye);
      return;
    }

    // 1. 雀头尝试
    if (!hasEye && counts[pos] >= 2) {
      counts[pos] -= 2;
      search(pos, completeSets, partialSets, true);
      counts[pos] += 2;
    }

    // 2. 刻子尝试 (AAA)
    if (counts[pos] >= 3) {
      counts[pos] -= 3;
      search(pos, completeSets + 1, partialSets, hasEye);
      counts[pos] += 3;
    }

    // 3. 顺子尝试 (ABC，仅数牌)
    const isWan = pos >= WAN_START && pos <= WAN_END - 2;
    const isTiao = pos >= TIAO_START && pos <= TIAO_END - 2;
    const isTong = pos >= TONG_START && pos <= TONG_END - 2;

    if ((isWan || isTiao || isTong) && counts[pos + 1] > 0 && counts[pos + 2] > 0) {
      counts[pos]--;
      counts[pos + 1]--;
      counts[pos + 2]--;
      search(pos, completeSets + 1, partialSets, hasEye);
      counts[pos]++;
      counts[pos + 1]++;
      counts[pos + 2]++;
    }

    // 4. 搭子尝试 (对子视为搭子)
    if (counts[pos] >= 2) {
      counts[pos] -= 2;
      search(pos, completeSets, partialSets + 1, hasEye);
      counts[pos] += 2;
    }

    // 5. 两面/边张搭子 (AB)
    const canSeq2 = (pos >= WAN_START && pos <= WAN_END - 1) ||
                    (pos >= TIAO_START && pos <= TIAO_END - 1) ||
                    (pos >= TONG_START && pos <= TONG_END - 1);
    if (canSeq2 && counts[pos + 1] > 0) {
      counts[pos]--;
      counts[pos + 1]--;
      search(pos, completeSets, partialSets + 1, hasEye);
      counts[pos]++;
      counts[pos + 1]++;
    }

    // 6. 嵌张搭子 (AC)
    const canSeq3 = (pos >= WAN_START && pos <= WAN_END - 2) ||
                    (pos >= TIAO_START && pos <= TIAO_END - 2) ||
                    (pos >= TONG_START && pos <= TONG_END - 2);
    if (canSeq3 && counts[pos + 2] > 0) {
      counts[pos]--;
      counts[pos + 2]--;
      search(pos, completeSets, partialSets + 1, hasEye);
      counts[pos]++;
      counts[pos + 2]++;
    }

    // 7. 不成面子直接跳过孤张
    search(pos + 1, completeSets, partialSets, hasEye);
  };

  search(0, 0, 0, false);
  return minShanten;
}

/**
 * 计算七对向听数 (手牌总数必须为 13 或 14 张)
 * 公式：6 - 对子数 + 种类不足惩罚
 */
function calculateQiDuiShanten(counts: number[]): number {
  let pairs = 0;
  let uniqueCount = 0;

  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    if (counts[i] >= 2) pairs++;
    if (counts[i] > 0) uniqueCount++;
  }

  let shanten = 6 - pairs;
  if (uniqueCount < 7) {
    shanten += 7 - uniqueCount;
  }
  return shanten;
}

/**
 * 计算十三幺向听数 (国标模式专用)
 * 公式：13 - 拥有幺九种数 - (是否有幺九雀头 ? 1 : 0)
 */
function calculateShiSanYaoShanten(counts: number[]): number {
  const orphanIndices = [
    WAN_START, WAN_END,
    TIAO_START, TIAO_END,
    TONG_START, TONG_END,
    27, 28, 29, 30, // 东南西北
    31, 32, 33,     // 中发白
  ];

  let uniqueOrphans = 0;
  let hasPair = false;

  for (const idx of orphanIndices) {
    if (counts[idx] >= 1) uniqueOrphans++;
    if (counts[idx] >= 2) hasPair = true;
  }

  return 13 - uniqueOrphans - (hasPair ? 1 : 0);
}

/**
 * 综合评估手牌向听数
 */
export function calculateShanten(
  handTiles: TileIndex[],
  meldCount = 0,
  options: { allowQiDui?: boolean; allowShiSanYao?: boolean } = {}
): number {
  const counts = createCountsVector(handTiles);
  const total = handTiles.length + meldCount * 3;

  // 1. 常规标准型向听数
  let minShanten = calculateStandardShanten(counts, meldCount);

  // 2. 门清七对向听数
  if (options.allowQiDui && meldCount === 0 && (total === 13 || total === 14)) {
    const qiduiShanten = calculateQiDuiShanten(counts);
    if (qiduiShanten < minShanten) {
      minShanten = qiduiShanten;
    }
  }

  // 3. 门清十三幺向听数
  if (options.allowShiSanYao && meldCount === 0 && (total === 13 || total === 14)) {
    const yaoShanten = calculateShiSanYaoShanten(counts);
    if (yaoShanten < minShanten) {
      minShanten = yaoShanten;
    }
  }

  return minShanten;
}

/**
 * 听牌待牌与有效进张分析结果
 */
export interface TingWaitInfo {
  waitTile: TileIndex; // 能胡的待牌
  remainingCount: number; // 全桌未现剩余张数 (0 ~ 4)
  fan: number; // 预期胡牌基础番数
  fanNames: string[]; // 番型明细
}

export interface DiscardTingRecommendation {
  discardTile: TileIndex; // 建议打出的牌
  shantenAfterDiscard: number; // 打出后的向听数 (0 代表成功听牌)
  waits: TingWaitInfo[]; // 能胡的待牌列表
  totalRemainingWaits: number; // 所有待牌的全桌剩余张数总和
}

/**
 * 听牌分析器 (针对 13 张手牌或 14 张摸牌打牌阶段)
 *
 * 当 handTiles.length === 13 时：计算当前听哪些牌 (0 向听待牌)。
 * 当 handTiles.length === 14 时：遍历每张打出牌 d，计算打出 d 后是否听牌，以及听哪些牌与余牌数量。
 */
export function analyzeTingWaits(
  handTiles: TileIndex[],
  visibleCounts: number[],
  evalOptions: EvaluatorOptions = {}
): DiscardTingRecommendation[] {
  const total = handTiles.length;
  const recommendations: DiscardTingRecommendation[] = [];

  // 情况 A: 已经处于 13 张手牌状态 (等待摸牌或别家出牌)
  if ((total - 1) % 3 === 0) {
    const waits: TingWaitInfo[] = [];
    let totalRemaining = 0;

    for (let w = 0; w < TOTAL_TILE_TYPES; w++) {
      const testHand = [...handTiles, w];
      const res = evaluateHuPattern(testHand, evalOptions);
      if (res.canHu) {
        const visible = visibleCounts[w] || 0;
        const remain = Math.max(0, 4 - visible);
        totalRemaining += remain;
        waits.push({
          waitTile: w,
          remainingCount: remain,
          fan: 1, // 后续由 MahjongScorer 补充精准番数
          fanNames: [res.huPattern === 'qidui' ? '七对' : res.huPattern === 'shisanyao' ? '十三幺' : '平胡'],
        });
      }
    }

    if (waits.length > 0) {
      recommendations.push({
        discardTile: -1,
        shantenAfterDiscard: 0,
        waits,
        totalRemainingWaits: totalRemaining,
      });
    }
    return recommendations;
  }

  // 情况 B: 摸牌后手握 14 张 (3N + 2) 手牌，遍历打出每张候选牌
  const uniqueDiscards = Array.from(new Set(handTiles.map((t) => legacyIdToTileIndex(t))));

  for (const d of uniqueDiscards) {
    // 尝试打出 d
    const idx = handTiles.findIndex((t) => legacyIdToTileIndex(t) === d);
    if (idx === -1) continue;

    const remainingHand = [...handTiles];
    remainingHand.splice(idx, 1);

    // 检查打出 d 后能否听牌
    const waits: TingWaitInfo[] = [];
    let totalRemaining = 0;

    for (let w = 0; w < TOTAL_TILE_TYPES; w++) {
      const testHand = [...remainingHand, w];
      const res = evaluateHuPattern(testHand, evalOptions);
      if (res.canHu) {
        // 计算全场未现张数: 4 - (手牌中拥有的该牌数 + 牌桌已出现的该牌数)
        let inHandCount = 0;
        for (const t of remainingHand) {
          if (legacyIdToTileIndex(t) === w) inHandCount++;
        }
        const visibleOnTable = visibleCounts[w] || 0;
        const remain = Math.max(0, 4 - (visibleOnTable + inHandCount));

        totalRemaining += remain;
        waits.push({
          waitTile: w,
          remainingCount: remain,
          fan: 1,
          fanNames: [res.huPattern === 'qidui' ? '七对' : res.huPattern === 'shisanyao' ? '十三幺' : '平胡'],
        });
      }
    }

    if (waits.length > 0) {
      recommendations.push({
        discardTile: d,
        shantenAfterDiscard: 0,
        waits,
        totalRemainingWaits: totalRemaining,
      });
    }
  }

  // 按全场剩余胡牌张数从大到小降序排列 (最优听牌排在最前)
  return recommendations.sort((a, b) => b.totalRemainingWaits - a.totalRemainingWaits);
}
