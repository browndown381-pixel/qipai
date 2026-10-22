/**
 * MahjongScorer.ts
 * 商业级麻将番种与计分结算引擎 (参考 xiyoufang/mahjong)
 *
 * 覆盖：
 * 1. 基础牌型番：平胡 (1番)、对对胡/大对子 (2番)、七对 (4番)、龙七对 (8番)、双龙七对 (16番)、十三幺 (16番)
 * 2. 花色番：清一色 (4番)、混一色 (2番)、清大对 (8番)、清七对 (16番)
 * 3. 普洱特色加番：茶山根 (手牌/副露中未杠出的4张相同牌，每组 ×2 或 +1 番)
 * 4. 状态与附加番：门清 (×2)、自摸 (×2)、杠上开花 (×2)、杠上炮 (×2)、海底捞月 (×2)、金钩钓 (4番)、抢杠胡 (×2)
 */

import {
  createCountsVector,
  DRAGON_END,
  DRAGON_START,
  isHonorTile,
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
  WIND_END,
  WIND_START,
} from './TileEngine';
import { evaluateHuPattern, HuValidationResult } from './HandEvaluator';

export interface MeldSnapshot {
  type: 'peng' | 'gang' | 'chi' | string;
  card?: number;
  tiles?: number[];
}

export interface ScoreContext {
  mode: 'puer' | 'xuezhan' | 'guobiao' | 'hongzhong' | string;
  isZimo: boolean; // 是否自摸
  isGangShangHua?: boolean; // 杠上开花
  isGangShangPao?: boolean; // 杠上炮
  isHaiDiLaoYue?: boolean; // 海底捞月
  isQiangGangHu?: boolean; // 抢杠胡
  melds?: MeldSnapshot[]; // 已副露的牌组
  isMenQing?: boolean; // 是否门清 (无吃碰明杠)
}

export interface ScoreResult {
  baseFan: number; // 牌型基础番
  totalFan: number; // 最终综合总番数 (含自摸、根、门清等乘数)
  totalMultiplier: number; // 倍率
  fanNames: string[]; // 番型名称列表
  details: { name: string; fanOrMult: string }[];
  puerGenCount: number; // 普洱茶山根数量
}

/**
 * 检查清一色 (全为同一种数牌: 纯万、纯条或纯筒)
 */
export function isQingYiSe(allTiles: TileIndex[]): boolean {
  let hasWan = false;
  let hasTiao = false;
  let hasTong = false;
  let hasHonor = false;

  for (const t of allTiles) {
    const idx = legacyIdToTileIndex(t);
    if (idx >= WAN_START && idx <= WAN_END) hasWan = true;
    else if (idx >= TIAO_START && idx <= TIAO_END) hasTiao = true;
    else if (idx >= TONG_START && idx <= TONG_END) hasTong = true;
    else if (isHonorTile(idx)) hasHonor = true;
  }

  if (hasHonor) return false;
  const suits = (hasWan ? 1 : 0) + (hasTiao ? 1 : 0) + (hasTong ? 1 : 0);
  return suits === 1;
}

/**
 * 检查混一色 (一种数牌 + 字牌)
 */
export function isHunYiSe(allTiles: TileIndex[]): boolean {
  let hasWan = false;
  let hasTiao = false;
  let hasTong = false;
  let hasHonor = false;

  for (const t of allTiles) {
    const idx = legacyIdToTileIndex(t);
    if (idx >= WAN_START && idx <= WAN_END) hasWan = true;
    else if (idx >= TIAO_START && idx <= TIAO_END) hasTiao = true;
    else if (idx >= TONG_START && idx <= TONG_END) hasTong = true;
    else if (isHonorTile(idx)) hasHonor = true;
  }

  if (!hasHonor) return false;
  const suits = (hasWan ? 1 : 0) + (hasTiao ? 1 : 0) + (hasTong ? 1 : 0);
  return suits === 1;
}

/**
 * 检查大对子 / 对对胡 (全部面子均为刻子/杠，无顺子)
 */
export function isDuiDuiHu(huRes: HuValidationResult, melds: MeldSnapshot[] = []): boolean {
  // 检查副露中是否有顺子 (吃牌)
  for (const m of melds) {
    if (m.type === 'chi') return false;
  }
  // 检查手牌分解中是否有顺子
  if (huRes.huPattern === 'standard' && huRes.decomposition) {
    return huRes.decomposition.sequences.length === 0;
  }
  return false;
}

/**
 * 检查金钩钓 (全副露，手牌仅留 1 张牌单钓将胡牌)
 */
export function isJinGouDiao(handTilesCount: number): boolean {
  return handTilesCount === 1 || handTilesCount === 2; // 胡牌瞬间 1 张手牌单钓
}

/**
 * 检查大三元 (中、发、白 全部成刻/杠) 与小三元 (2组刻子 + 1对将)
 */
export function checkSanYuan(
  counts: number[],
  melds: MeldSnapshot[] = []
): { isDaSanYuan: boolean; isXiaoSanYuan: boolean } {
  let dragonKeCount = 0;
  let dragonPairCount = 0;

  for (let d = DRAGON_START; d <= DRAGON_END; d++) {
    let count = counts[d] || 0;
    for (const m of melds) {
      const c = m.card ?? m.tiles?.[0] ?? 0;
      if (legacyIdToTileIndex(c) === d && (m.type === 'peng' || m.type === 'gang')) {
        count += 3;
      }
    }
    if (count >= 3) dragonKeCount++;
    else if (count >= 2) dragonPairCount++;
  }

  return {
    isDaSanYuan: dragonKeCount === 3,
    isXiaoSanYuan: dragonKeCount === 2 && dragonPairCount >= 1,
  };
}

/**
 * 计算手牌与副露中所有「四张相同牌」（包含暗坎四张与暗杠）
 * 普洱麻将独创「茶山根」：手牌中有4张同牌即使未开杠也计 1 根 (×2)
 */
export function countChaShanGen(handTiles: TileIndex[], melds: MeldSnapshot[] = []): number {
  const counts = createCountsVector(handTiles);
  let gen = 0;

  // 手牌内部自然拥有 4 张
  for (let i = 0; i < TOTAL_TILE_TYPES; i++) {
    if (counts[i] === 4) {
      gen++;
    }
  }

  // 手牌 1 张 + 副露碰牌 3 张 (形成事实上的 4 张同牌未杠)
  for (const m of melds) {
    if (m.type === 'peng') {
      const c = m.card ?? m.tiles?.[0] ?? 0;
      const idx = legacyIdToTileIndex(c);
      if (counts[idx] === 1) {
        gen++;
      }
    }
  }

  return gen;
}

/**
 * 核心番数结算计算器入口
 */
export function calculateMahjongScore(
  handTiles: TileIndex[],
  winCard: TileIndex,
  context: ScoreContext
): ScoreResult {
  const {
    mode,
    isZimo,
    isGangShangHua = false,
    isGangShangPao = false,
    isHaiDiLaoYue = false,
    isQiangGangHu = false,
    melds = [],
    isMenQing = melds.filter((m) => m.type !== 'an_gang').length === 0,
  } = context;

  // 1. 组合完整获胜手牌
  const fullHand = [...handTiles];
  const allTiles = [...fullHand];
  for (const m of melds) {
    if (m.tiles && m.tiles.length > 0) {
      allTiles.push(...m.tiles);
    } else {
      const c = m.card ?? 0;
      allTiles.push(c, c, c);
      if (m.type === 'gang') allTiles.push(c);
    }
  }

  // 2. 判定胡牌型
  const huRes = evaluateHuPattern(fullHand, {
    allowQiDui: true,
    allowShiSanYao: mode === 'guobiao',
    wildcardIndex: mode === 'hongzhong' ? 31 : undefined,
  });

  const fanNames: string[] = [];
  const details: { name: string; fanOrMult: string }[] = [];
  let baseFan = 1;

  const isQing = isQingYiSe(allTiles);
  const isHun = isHunYiSe(allTiles);
  const isDuiDui = isDuiDuiHu(huRes, melds);
  const isJinGou = isJinGouDiao(handTiles.length);
  const sanYuan = checkSanYuan(createCountsVector(fullHand), melds);

  // 3. 基础牌型与花色判定
  if (huRes.huPattern === 'shisanyao') {
    baseFan = 16;
    fanNames.push('十三幺');
    details.push({ name: '十三幺', fanOrMult: '16番' });
  } else if (huRes.huPattern === 'qidui') {
    if (isQing) {
      baseFan = 16;
      fanNames.push('清七对');
      details.push({ name: '清七对', fanOrMult: '16番' });
    } else if (huRes.dragonCount >= 2) {
      baseFan = 16;
      fanNames.push('双龙七对');
      details.push({ name: '双龙七对', fanOrMult: '16番' });
    } else if (huRes.dragonCount === 1) {
      baseFan = 8;
      fanNames.push('龙七对');
      details.push({ name: '龙七对', fanOrMult: '8番' });
    } else {
      baseFan = 4;
      fanNames.push('七对');
      details.push({ name: '七对', fanOrMult: '4番' });
    }
  } else {
    // 标准面子型
    if (isQing && isDuiDui) {
      baseFan = 8;
      fanNames.push('清大对');
      details.push({ name: '清大对', fanOrMult: '8番' });
    } else if (sanYuan.isDaSanYuan) {
      baseFan = 8;
      fanNames.push('大三元');
      details.push({ name: '大三元', fanOrMult: '8番' });
    } else if (isQing) {
      baseFan = 4;
      fanNames.push('清一色');
      details.push({ name: '清一色', fanOrMult: '4番' });
    } else if (isDuiDui) {
      baseFan = 2;
      fanNames.push('对对胡');
      details.push({ name: '对对胡', fanOrMult: '2番' });
    } else if (sanYuan.isXiaoSanYuan) {
      baseFan = 4;
      fanNames.push('小三元');
      details.push({ name: '小三元', fanOrMult: '4番' });
    } else if (isHun) {
      baseFan = 2;
      fanNames.push('混一色');
      details.push({ name: '混一色', fanOrMult: '2番' });
    } else {
      baseFan = 1;
      fanNames.push('平胡');
      details.push({ name: '平胡', fanOrMult: '1番' });
    }

    if (isJinGou) {
      baseFan = Math.max(baseFan, 4);
      fanNames.push('金钩钓');
      details.push({ name: '金钩钓', fanOrMult: '4番' });
    }
  }

  // 4. 普洱特色「茶山根」计算
  const genCount = countChaShanGen(fullHand, melds);
  if (genCount > 0) {
    const genName = mode === 'puer' ? `茶山根×${genCount}` : `根×${genCount}`;
    fanNames.push(genName);
    details.push({ name: genName, fanOrMult: `×${Math.pow(2, genCount)}` });
  }

  // 5. 附加加倍状态
  let multiplier = Math.pow(2, genCount);

  if (isZimo) {
    multiplier *= 2;
    fanNames.push('自摸');
    details.push({ name: '自摸', fanOrMult: '×2' });
  }
  if (isMenQing && mode === 'puer') {
    multiplier *= 2;
    fanNames.push('门清');
    details.push({ name: '门清', fanOrMult: '×2' });
  }
  if (isGangShangHua) {
    multiplier *= 2;
    fanNames.push('杠上开花');
    details.push({ name: '杠上开花', fanOrMult: '×2' });
  }
  if (isGangShangPao) {
    multiplier *= 2;
    fanNames.push('杠上炮');
    details.push({ name: '杠上炮', fanOrMult: '×2' });
  }
  if (isHaiDiLaoYue) {
    multiplier *= 2;
    fanNames.push('海底捞月');
    details.push({ name: '海底捞月', fanOrMult: '×2' });
  }
  if (isQiangGangHu) {
    multiplier *= 2;
    fanNames.push('抢杠胡');
    details.push({ name: '抢杠胡', fanOrMult: '×2' });
  }

  const totalFan = baseFan * multiplier;

  return {
    baseFan,
    totalFan,
    totalMultiplier: multiplier,
    fanNames,
    details,
    puerGenCount: genCount,
  };
}
