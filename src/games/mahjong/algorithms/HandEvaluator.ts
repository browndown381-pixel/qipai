/**
 * HandEvaluator.ts
 * 商业级麻将全解胡牌分解与多牌型判定引擎
 *
 * 核心升级：
 * 1. 全解枚举 (All-Decomposition Enumeration)：穷举所有合法的 4 面子 + 1 雀头拆解分支，避免单解短路将对对胡/清大对/三元刻子误判为平胡
 * 2. 赖子全向顺子补齐：支持正向顺子 (AB+W, AC+W) 以及反向边张顺子 (如 89+W -> 789)
 * 3. 七对/龙七对/双龙七对/三龙七对 与 十三幺 并行校验，交由 MahjongScorer 按最高番数优先级裁定
 * 4. 内部严格基于 34 维频次向量 counts[34] 运算，彻底杜绝二次 ID 转换
 */

import {
  createCountsVector,
  HONG_ZHONG_INDEX,
  isSuitTile,
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

export interface EvaluatorOptions {
  wildcardIndex?: number; // 万能赖子牌 34 维索引 (如红中 31)，未指定则无赖子
  allowQiDui?: boolean; // 是否允许七对 (默认 true)
  allowShiSanYao?: boolean; // 是否允许十三幺 (国标模式 true)
  dingQueSuit?: number; // 定缺花色 (0:万, 1:条, 2:筒, -1:无定缺)
}

export interface HuDecomposition {
  eye: TileIndex; // 雀头 (0 ~ 33)
  triplets: TileIndex[]; // 刻子索引列表 (0 ~ 33)
  sequences: TileIndex[]; // 顺子首张索引列表 (0 ~ 33)
  wildUsedCount: number; // 使用的赖子张数
}

export interface HuValidationResult {
  canHu: boolean;
  huPattern: 'standard' | 'qidui' | 'shisanyao' | 'none';
  dragonCount: number; // 根/龙的数量 (四张同牌)
  decomposition?: HuDecomposition;
  allDecompositions?: HuDecomposition[];
  isQiDuiValid?: boolean;
  qiDuiDragonCount?: number;
  isShiSanYaoValid?: boolean;
}

const MAX_DECOMPOSITION_BRANCHES = 64;

/**
 * 递归枚举去除雀头后的手牌所有合法刻子 (AAA) 与顺子 (ABC) 拆解组合
 */
function decomposeAllMeldsWithWild(
  counts: number[],
  wildCount: number,
  currentTriplets: TileIndex[],
  currentSequences: TileIndex[],
  results: Array<{ triplets: TileIndex[]; sequences: TileIndex[] }>,
  seenKeys: Set<string>,
  wildIndex: TileIndex = HONG_ZHONG_INDEX
): void {
  if (results.length >= MAX_DECOMPOSITION_BRANCHES) return;

  // 寻找第一张有余量的牌
  let first = -1;
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    if (counts[i] > 0) {
      first = i;
      break;
    }
  }

  // 所有常规牌已消除完：剩余赖子数必须是 3 的倍数 (赖子自成刻子)
  if (first === -1) {
    if (wildCount % 3 === 0) {
      const wildTriplets = Math.floor(wildCount / 3);
      const finalTriplets = [...currentTriplets];
      for (let k = 0; k < wildTriplets; k++) {
        finalTriplets.push(wildIndex);
      }
      finalTriplets.sort((a, b) => a - b);
      const finalSequences = [...currentSequences].sort((a, b) => a - b);
      const key = `T:${finalTriplets.join(',')}|S:${finalSequences.join(',')}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({ triplets: finalTriplets, sequences: finalSequences });
      }
    }
    return;
  }

  const rankInSuit = first % 9; // 0 ~ 8 对应点数 1 ~ 9
  const isNumeric = isSuitTile(first);

  // 分支 1. 自然刻子 (AAA)
  if (counts[first] >= 3) {
    counts[first] -= 3;
    currentTriplets.push(first);
    decomposeAllMeldsWithWild(
      counts,
      wildCount,
      currentTriplets,
      currentSequences,
      results,
      seenKeys,
      wildIndex
    );
    currentTriplets.pop();
    counts[first] += 3;
  }

  // 分支 2. 自然顺子 (ABC，仅数牌且点数 1~7，即 rankInSuit <= 6)
  if (isNumeric && rankInSuit <= 6) {
    if (counts[first + 1] > 0 && counts[first + 2] > 0) {
      counts[first]--;
      counts[first + 1]--;
      counts[first + 2]--;
      currentSequences.push(first);
      decomposeAllMeldsWithWild(
        counts,
        wildCount,
        currentTriplets,
        currentSequences,
        results,
        seenKeys,
        wildIndex
      );
      currentSequences.pop();
      counts[first]++;
      counts[first + 1]++;
      counts[first + 2]++;
    }
  }

  // 分支 3. 使用 1 张赖子补成刻子 (AA + 赖子)
  if (wildCount >= 1 && counts[first] >= 2) {
    counts[first] -= 2;
    currentTriplets.push(first);
    decomposeAllMeldsWithWild(
      counts,
      wildCount - 1,
      currentTriplets,
      currentSequences,
      results,
      seenKeys,
      wildIndex
    );
    currentTriplets.pop();
    counts[first] += 2;
  }

  // 分支 4. 使用 1 张赖子补成顺子 (支持正向 AB+W, 嵌张 AC+W, 以及反向边张 89+W -> 789)
  if (wildCount >= 1 && isNumeric) {
    // 4.1 紧邻两张 (first, first + 1) + 赖子：适用于 rankInSuit <= 7 (含 8万+9万+红中 -> 789万)
    if (rankInSuit <= 7 && counts[first + 1] > 0) {
      const seqStart = rankInSuit <= 6 ? first : first - 1;
      counts[first]--;
      counts[first + 1]--;
      currentSequences.push(seqStart);
      decomposeAllMeldsWithWild(
        counts,
        wildCount - 1,
        currentTriplets,
        currentSequences,
        results,
        seenKeys,
        wildIndex
      );
      currentSequences.pop();
      counts[first]++;
      counts[first + 1]++;
    }

    // 4.2 嵌张两张 (first, first + 2) + 赖子：适用于 rankInSuit <= 6
    if (rankInSuit <= 6 && counts[first + 2] > 0) {
      counts[first]--;
      counts[first + 2]--;
      currentSequences.push(first);
      decomposeAllMeldsWithWild(
        counts,
        wildCount - 1,
        currentTriplets,
        currentSequences,
        results,
        seenKeys,
        wildIndex
      );
      currentSequences.pop();
      counts[first]++;
      counts[first + 2]++;
    }
  }

  // 分支 5. 使用 2 张赖子将孤张补成刻子或顺子
  if (wildCount >= 2 && counts[first] >= 1) {
    counts[first] -= 1;
    // 5.1 优先记为刻子 (A + W + W)
    currentTriplets.push(first);
    decomposeAllMeldsWithWild(
      counts,
      wildCount - 2,
      currentTriplets,
      currentSequences,
      results,
      seenKeys,
      wildIndex
    );
    currentTriplets.pop();

    // 5.2 若为数牌，也可记为顺子 (A + W + W 构成顺子)
    if (isNumeric) {
      const seqStart = rankInSuit <= 6 ? first : Math.max(first - (rankInSuit - 6), 0);
      currentSequences.push(seqStart);
      decomposeAllMeldsWithWild(
        counts,
        wildCount - 2,
        currentTriplets,
        currentSequences,
        results,
        seenKeys,
        wildIndex
      );
      currentSequences.pop();
    }

    counts[first] += 1;
  }
}

/**
 * 校验七对 (含龙七对、双龙七对、三龙七对)
 */
export function checkQiDui(counts: number[], wildCount = 0): { isQiDui: boolean; dragonCount: number } {
  let pairCount = 0;
  let singleCount = 0;
  let dragonCount = 0;

  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    if (counts[i] === 4) {
      dragonCount++;
      pairCount += 2;
    } else if (counts[i] === 3) {
      pairCount += 1;
      singleCount += 1;
    } else if (counts[i] === 2) {
      pairCount += 1;
    } else if (counts[i] === 1) {
      singleCount += 1;
    }
  }

  // 用赖子补齐单张
  if (wildCount >= singleCount) {
    pairCount += singleCount;
    const remainingWild = wildCount - singleCount;
    pairCount += Math.floor(remainingWild / 2);
    // 若有 3 张同牌被 1 张赖子补成 4 张，也构成龙七对的根
    for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
      if (counts[i] === 3 && wildCount >= 1) {
        dragonCount++;
      }
    }
    return { isQiDui: pairCount === 7, dragonCount };
  }

  return { isQiDui: false, dragonCount: 0 };
}

/**
 * 校验十三幺 (1万9万、1条9条、1筒9筒、东南西北中发白共 13 种，加任意 1 张做雀头)
 */
export function checkShiSanYao(counts: number[], wildCount = 0): boolean {
  const orphanIndices = [
    WAN_START, WAN_END,
    TIAO_START, TIAO_END,
    TONG_START, TONG_END,
    27, 28, 29, 30, // 东南西北
    31, 32, 33,     // 中发白
  ];

  let totalAll = wildCount;
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) totalAll += counts[i];
  if (totalAll !== 14) return false;

  let totalOrphans = 0;
  let missingTypes = 0;
  let pairCount = 0;

  for (const idx of orphanIndices) {
    const c = counts[idx] || 0;
    if (c > 2) return false;
    if (c === 0) missingTypes++;
    if (c === 2) pairCount++;
    totalOrphans += c;
  }

  // 非幺九牌必须为 0
  if (totalOrphans + wildCount !== 14) return false;
  if (pairCount > 1) return false;

  const neededForSingles = missingTypes;
  const neededForPair = pairCount === 0 ? 1 : 0;
  return wildCount === neededForSingles + neededForPair;
}

/**
 * 直接在 34 维频次向量 counts[34] 上执行全解胡牌校验（零二次 ID 转换）
 */
export function evaluateHuFromCounts(
  rawCounts34: number[],
  options: EvaluatorOptions = {}
): HuValidationResult {
  const {
    wildcardIndex,
    allowQiDui = true,
    allowShiSanYao = false,
    dingQueSuit = -1,
  } = options;

  const counts = [...rawCounts34];
  let total = 0;
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    total += counts[i] || 0;
  }

  // 1. 定缺一票否决：若手牌存留定缺花色牌，严禁胡牌
  if (dingQueSuit >= 0 && dingQueSuit <= 2) {
    const start = dingQueSuit === 0 ? WAN_START : dingQueSuit === 1 ? TIAO_START : TONG_START;
    const end = dingQueSuit === 0 ? WAN_END : dingQueSuit === 1 ? TIAO_END : TONG_END;
    for (let i = start; i <= end; i++) {
      if (counts[i] > 0) {
        return { canHu: false, huPattern: 'none', dragonCount: 0, allDecompositions: [] };
      }
    }
  }

  // 提取赖子张数
  let wildCount = 0;
  const hasWildConfig =
    wildcardIndex !== undefined && wildcardIndex >= 0 && wildcardIndex < TOTAL_TILE_TYPES;
  if (hasWildConfig) {
    wildCount = counts[wildcardIndex!] || 0;
    counts[wildcardIndex!] = 0;
  }

  // 统计基础根数 (手牌中未开杠的4张同牌)
  let baseDragonCount = 0;
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    if (counts[i] === 4) baseDragonCount++;
  }

  // 2. 校验十三幺 (14 张手牌)
  let isShiSanYaoValid = false;
  if (allowShiSanYao && total === 14) {
    isShiSanYaoValid = checkShiSanYao(counts, wildCount);
  }

  // 3. 校验七对 (14 张手牌)
  let isQiDuiValid = false;
  let qiDuiDragonCount = 0;
  if (allowQiDui && total === 14) {
    const qiduiRes = checkQiDui(counts, wildCount);
    if (qiduiRes.isQiDui) {
      isQiDuiValid = true;
      qiDuiDragonCount = qiduiRes.dragonCount;
    }
  }

  // 4. 全解枚举标准型 (4 面子 + 1 雀头，满足 3N + 2 规则)
  const allDecompositions: HuDecomposition[] = [];
  if (total >= 2 && (total - 2) % 3 === 0) {
    const effectiveWildIdx = hasWildConfig ? wildcardIndex! : HONG_ZHONG_INDEX;

    for (let eye = 0; eye < TOTAL_TILE_TYPES; eye++) {
      // 4.1 自然雀头 (该牌至少 2 张)
      if (counts[eye] >= 2) {
        counts[eye] -= 2;
        const branches: Array<{ triplets: TileIndex[]; sequences: TileIndex[] }> = [];
        decomposeAllMeldsWithWild(
          counts,
          wildCount,
          [],
          [],
          branches,
          new Set<string>(),
          effectiveWildIdx
        );
        for (const b of branches) {
          allDecompositions.push({
            eye,
            triplets: b.triplets,
            sequences: b.sequences,
            wildUsedCount: wildCount,
          });
        }
        counts[eye] += 2;
      }

      // 4.2 赖子组合雀头 (该牌 1 张 + 1 赖子)
      if (wildCount >= 1 && counts[eye] >= 1) {
        counts[eye] -= 1;
        const branches: Array<{ triplets: TileIndex[]; sequences: TileIndex[] }> = [];
        decomposeAllMeldsWithWild(
          counts,
          wildCount - 1,
          [],
          [],
          branches,
          new Set<string>(),
          effectiveWildIdx
        );
        for (const b of branches) {
          allDecompositions.push({
            eye,
            triplets: b.triplets,
            sequences: b.sequences,
            wildUsedCount: wildCount,
          });
        }
        counts[eye] += 1;
      }
    }

    // 4.3 纯双赖子雀头
    if (wildCount >= 2) {
      const branches: Array<{ triplets: TileIndex[]; sequences: TileIndex[] }> = [];
      decomposeAllMeldsWithWild(
        counts,
        wildCount - 2,
        [],
        [],
        branches,
        new Set<string>(),
        effectiveWildIdx
      );
      for (const b of branches) {
        allDecompositions.push({
          eye: effectiveWildIdx,
          triplets: b.triplets,
          sequences: b.sequences,
          wildUsedCount: wildCount,
        });
      }
    }
  }

  // 排序标准拆解：刻子多的拆解优先排在前面 (确保默认首解优先体现对对胡/三元刻子)
  allDecompositions.sort((a, b) => b.triplets.length - a.triplets.length);

  if (isShiSanYaoValid) {
    return {
      canHu: true,
      huPattern: 'shisanyao',
      dragonCount: baseDragonCount,
      decomposition: allDecompositions[0],
      allDecompositions,
      isQiDuiValid,
      qiDuiDragonCount,
      isShiSanYaoValid: true,
    };
  }

  if (allDecompositions.length > 0) {
    return {
      canHu: true,
      huPattern: 'standard',
      dragonCount: baseDragonCount,
      decomposition: allDecompositions[0],
      allDecompositions,
      isQiDuiValid,
      qiDuiDragonCount,
      isShiSanYaoValid: false,
    };
  }

  if (isQiDuiValid) {
    return {
      canHu: true,
      huPattern: 'qidui',
      dragonCount: qiDuiDragonCount,
      allDecompositions: [],
      isQiDuiValid: true,
      qiDuiDragonCount,
      isShiSanYaoValid: false,
    };
  }

  return { canHu: false, huPattern: 'none', dragonCount: 0, allDecompositions: [] };
}

/**
 * 核心综合胡牌校验入口 (接收外部十进制牌 ID 数组，单次转换至 counts[34] 运算)
 */
export function evaluateHuPattern(
  handTiles: number[],
  options: EvaluatorOptions = {}
): HuValidationResult {
  const counts = createCountsVector(handTiles);
  return evaluateHuFromCounts(counts, options);
}
