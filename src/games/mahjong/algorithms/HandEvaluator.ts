/**
 * HandEvaluator.ts
 * 商业级麻将胡牌分解与多牌型判定引擎 (参考 xiyoufang/mahjong)
 *
 * 支持：
 * 1. 标准型 (4 面子 + 1 雀头)，支持回溯剪枝与赖子万能替补
 * 2. 七对型 (7 对子)，支持龙七对 (四张同牌算作根)、双龙七对、三龙七对
 * 3. 十三幺 (国标幺九字牌 13 种 + 1 雀头)
 * 4. 川麻定缺过滤与普洱全牌型兼容
 */

import {
  createCountsVector,
  DRAGON_END,
  HONG_ZHONG_INDEX,
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
  WIND_START,
} from './TileEngine';

export interface EvaluatorOptions {
  wildcardIndex?: number; // 万能赖子牌索引 (如红中 31)，未指定则无赖子
  allowQiDui?: boolean; // 是否允许七对 (默认 true)
  allowShiSanYao?: boolean; // 是否允许十三幺 (国标模式 true)
  dingQueSuit?: number; // 定缺花色 (0:万, 1:条, 2:筒, -1:无定缺)
}

export interface HuDecomposition {
  eye: TileIndex; // 雀头
  triplets: TileIndex[]; // 刻子列表
  sequences: TileIndex[]; // 顺子首张列表
  wildUsedCount: number; // 使用的赖子张数
}

export interface HuValidationResult {
  canHu: boolean;
  huPattern: 'standard' | 'qidui' | 'shisanyao' | 'none';
  dragonCount: number; // 根/龙的数量 (四张同牌)
  decomposition?: HuDecomposition;
}

/**
 * 递归验证去除雀头后的手牌能否完全分解为刻子 (AAA) 与顺子 (ABC)
 */
function decomposeMeldsWithWild(
  counts: number[],
  wildCount: number,
  triplets: TileIndex[],
  sequences: TileIndex[]
): boolean {
  // 寻找第一张有余量的牌
  let first = -1;
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    if (counts[i] > 0) {
      first = i;
      break;
    }
  }

  // 所有牌已消除完：剩余赖子数必须是 3 的倍数 (即赖子自成刻子)
  if (first === -1) {
    if (wildCount % 3 === 0) {
      const wildTriplets = Math.floor(wildCount / 3);
      for (let k = 0; k < wildTriplets; k++) {
        triplets.push(HONG_ZHONG_INDEX);
      }
      return true;
    }
    return false;
  }

  // 1. 尝试自然刻子 (AAA)
  if (counts[first] >= 3) {
    counts[first] -= 3;
    triplets.push(first);
    if (decomposeMeldsWithWild(counts, wildCount, triplets, sequences)) return true;
    triplets.pop();
    counts[first] += 3;
  }

  // 2. 尝试自然顺子 (ABC，仅数牌: 万 0~6, 条 9~15, 筒 18~24)
  const isWanSeq = first >= WAN_START && first <= WAN_END - 2;
  const isTiaoSeq = first >= TIAO_START && first <= TIAO_END - 2;
  const isTongSeq = first >= TONG_START && first <= TONG_END - 2;

  if (isWanSeq || isTiaoSeq || isTongSeq) {
    if (counts[first + 1] > 0 && counts[first + 2] > 0) {
      counts[first]--;
      counts[first + 1]--;
      counts[first + 2]--;
      sequences.push(first);
      if (decomposeMeldsWithWild(counts, wildCount, triplets, sequences)) return true;
      sequences.pop();
      counts[first]++;
      counts[first + 1]++;
      counts[first + 2]++;
    }
  }

  // 3. 尝试使用 1 张赖子补成刻子 (AA + 赖子)
  if (wildCount >= 1 && counts[first] >= 2) {
    counts[first] -= 2;
    triplets.push(first);
    if (decomposeMeldsWithWild(counts, wildCount - 1, triplets, sequences)) return true;
    triplets.pop();
    counts[first] += 2;
  }

  // 4. 尝试使用 1 张赖子补成顺子 (AB + 赖子 或 AC + 赖子)
  if (wildCount >= 1 && (isWanSeq || isTiaoSeq || isTongSeq)) {
    // 4.1 AB + 赖子 (需补 first+2)
    if (counts[first + 1] > 0) {
      counts[first]--;
      counts[first + 1]--;
      sequences.push(first);
      if (decomposeMeldsWithWild(counts, wildCount - 1, triplets, sequences)) return true;
      sequences.pop();
      counts[first]++;
      counts[first + 1]++;
    }

    // 4.2 AC + 赖子 (需补 first+1 嵌张)
    if (counts[first + 2] > 0) {
      counts[first]--;
      counts[first + 2]--;
      sequences.push(first);
      if (decomposeMeldsWithWild(counts, wildCount - 1, triplets, sequences)) return true;
      sequences.pop();
      counts[first]++;
      counts[first + 2]++;
    }
  }

  // 5. 尝试使用 2 张赖子将孤张补成刻子 (A + 赖子 + 赖子)
  if (wildCount >= 2 && counts[first] >= 1) {
    counts[first] -= 1;
    triplets.push(first);
    if (decomposeMeldsWithWild(counts, wildCount - 2, triplets, sequences)) return true;
    triplets.pop();
    counts[first] += 1;
  }

  return false;
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
    // 多余成对的赖子可能补成新的四张 (龙)
    return { isQiDui: pairCount === 7, dragonCount };
  }

  return { isQiDui: false, dragonCount: 0 };
}

/**
 * 校验十三幺 (1万9万、1条9条、1筒9筒、东南西北中发白共 13 种，加任意 1 张做雀头)
 */
export function checkShiSanYao(counts: number[]): boolean {
  const orphanIndices = [
    WAN_START, WAN_END,
    TIAO_START, TIAO_END,
    TONG_START, TONG_END,
    27, 28, 29, 30, // 东南西北
    31, 32, 33,     // 中发白
  ];

  let hasPair = false;
  for (const idx of orphanIndices) {
    if (counts[idx] === 0) return false;
    if (counts[idx] === 2) {
      if (hasPair) return false;
      hasPair = true;
    } else if (counts[idx] > 2) {
      return false;
    }
  }

  // 检查其余牌是否为 0
  let totalOrphans = 0;
  for (const idx of orphanIndices) {
    totalOrphans += counts[idx];
  }
  let totalAll = 0;
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) totalAll += counts[i];

  return hasPair && totalOrphans === 14 && totalAll === 14;
}

/**
 * 核心综合胡牌校验入口
 */
export function evaluateHuPattern(
  handTiles: TileIndex[],
  options: EvaluatorOptions = {}
): HuValidationResult {
  const {
    wildcardIndex,
    allowQiDui = true,
    allowShiSanYao = false,
    dingQueSuit = -1,
  } = options;

  // 1. 定缺校验 (川麻血战到底)：若手牌存留定缺花色牌，严禁胡牌
  if (dingQueSuit >= 0 && dingQueSuit <= 2) {
    for (const t of handTiles) {
      const idx = legacyIdToTileIndex(t);
      if (dingQueSuit === 0 && idx >= WAN_START && idx <= WAN_END) return { canHu: false, huPattern: 'none', dragonCount: 0 };
      if (dingQueSuit === 1 && idx >= TIAO_START && idx <= TIAO_END) return { canHu: false, huPattern: 'none', dragonCount: 0 };
      if (dingQueSuit === 2 && idx >= TONG_START && idx <= TONG_END) return { canHu: false, huPattern: 'none', dragonCount: 0 };
    }
  }

  // 2. 统计频次
  const counts = createCountsVector(handTiles);
  let total = handTiles.length;

  // 提取赖子张数
  let wildCount = 0;
  if (wildcardIndex !== undefined && wildcardIndex >= 0 && wildcardIndex < TOTAL_TILE_TYPES) {
    wildCount = counts[wildcardIndex];
    counts[wildcardIndex] = 0;
  }

  // 统计根数 (未开杠的4张同牌)
  let baseDragonCount = 0;
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    if (counts[i] === 4) baseDragonCount++;
  }

  // 3. 校验十三幺 (手牌总数必须为 14 张且未副露)
  if (allowShiSanYao && total === 14 && wildCount === 0) {
    if (checkShiSanYao(counts)) {
      return { canHu: true, huPattern: 'shisanyao', dragonCount: 0 };
    }
  }

  // 4. 校验七对 (手牌总数必须为 14 张且未副露)
  if (allowQiDui && total === 14) {
    const qiduiRes = checkQiDui(counts, wildCount);
    if (qiduiRes.isQiDui) {
      return {
        canHu: true,
        huPattern: 'qidui',
        dragonCount: qiduiRes.dragonCount,
      };
    }
  }

  // 5. 校验标准型 (4 面子 + 1 雀头，满足 3N + 2 规则)
  if ((total - 2) % 3 !== 0) {
    return { canHu: false, huPattern: 'none', dragonCount: 0 };
  }

  // 枚举可能的雀头 (eye)
  for (let eye = 0; eye < TOTAL_TILE_TYPES; eye++) {
    // 5.1 自然雀头 (该牌至少 2 张)
    if (counts[eye] >= 2) {
      counts[eye] -= 2;
      const triplets: TileIndex[] = [];
      const sequences: TileIndex[] = [];
      if (decomposeMeldsWithWild(counts, wildCount, triplets, sequences)) {
        counts[eye] += 2;
        return {
          canHu: true,
          huPattern: 'standard',
          dragonCount: baseDragonCount,
          decomposition: { eye, triplets, sequences, wildUsedCount: wildCount },
        };
      }
      counts[eye] += 2;
    }

    // 5.2 赖子组合雀头 (该牌 1 张 + 1 赖子)
    if (wildCount >= 1 && counts[eye] >= 1) {
      counts[eye] -= 1;
      const triplets: TileIndex[] = [];
      const sequences: TileIndex[] = [];
      if (decomposeMeldsWithWild(counts, wildCount - 1, triplets, sequences)) {
        counts[eye] += 1;
        return {
          canHu: true,
          huPattern: 'standard',
          dragonCount: baseDragonCount,
          decomposition: { eye, triplets, sequences, wildUsedCount: wildCount },
        };
      }
      counts[eye] += 1;
    }
  }

  // 5.3 纯双赖子雀头
  if (wildCount >= 2) {
    const triplets: TileIndex[] = [];
    const sequences: TileIndex[] = [];
    if (decomposeMeldsWithWild(counts, wildCount - 2, triplets, sequences)) {
      return {
        canHu: true,
        huPattern: 'standard',
        dragonCount: baseDragonCount,
        decomposition: {
          eye: wildcardIndex ?? HONG_ZHONG_INDEX,
          triplets,
          sequences,
          wildUsedCount: wildCount,
        },
      };
    }
  }

  return { canHu: false, huPattern: 'none', dragonCount: 0 };
}
