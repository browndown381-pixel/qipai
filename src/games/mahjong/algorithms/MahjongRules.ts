import { MahjongMeld, MahjongSuit, MeldType, TingCandidateInfo } from '../types';
import {
  getRank,
  getSuit,
  HONG_ZHONG_TILE,
  HONOR_TILES,
  isWildcard,
  NORMAL_TILES,
} from './MahjongTile';
import {
  legacyIdToTileIndex,
  tileIndexToLegacyId,
  TOTAL_TILE_TYPES,
} from './TileEngine';
import {
  checkQiDui,
  checkShiSanYao,
  evaluateHuPattern,
} from './HandEvaluator';
import {
  calculateMahjongScore,
  countChaShanGen,
  isDuiDuiHu,
  isHunYiSe as checkHunYiSe,
  isJinGouDiao as checkJinGouDiao,
  isQingYiSe as checkQingYiSe,
} from './MahjongScorer';
import { analyzeTingWaits } from './ShantenEngine';
import { decideBestDiscard } from './MahjongAI';

// 导出底层 34 维核心引擎与专业商业算法引擎
export * from './TileEngine';
export * from './HandEvaluator';
export * from './ShantenEngine';
export * from './MahjongScorer';
export * from './MahjongAI';
export * from './ProfessionalMahjongLogic';

/**
 * 校验七对 (兼容旧接口)
 */
export function isQiDui(tiles: number[]): { isQiDui: boolean; genCount: number } {
  const counts = new Array<number>(TOTAL_TILE_TYPES).fill(0);
  for (const t of tiles) {
    counts[legacyIdToTileIndex(t)]++;
  }
  const res = checkQiDui(counts, 0);
  return { isQiDui: res.isQiDui, genCount: res.dragonCount };
}

/**
 * 校验标准胡型 (兼容旧接口)
 */
export function isStandardHu(tiles: number[]): boolean {
  const res = evaluateHuPattern(tiles, { allowQiDui: false });
  return res.canHu;
}

/**
 * 校验清一色 (兼容旧接口)
 */
export function isQingYiSe(tiles: number[], melds: MahjongMeld[] = []): boolean {
  const allTiles = [...tiles];
  for (const m of melds) {
    if (m.tiles && m.tiles.length > 0) allTiles.push(...m.tiles);
    else {
      const c = m.card ?? 0;
      allTiles.push(c, c, c);
    }
  }
  return checkQingYiSe(allTiles);
}

/**
 * 校验碰碰胡 / 对对胡 (兼容旧接口)
 */
export function isPengPengHu(tiles: number[], melds: MahjongMeld[] = []): boolean {
  const huRes = evaluateHuPattern(tiles, { allowQiDui: false });
  return isDuiDuiHu(huRes, melds);
}

/**
 * 校验金钩钓 (兼容旧接口)
 */
export function isJinGouDiao(handTiles: number[], melds: MahjongMeld[]): boolean {
  return handTiles.length <= 2 && melds.length === 4;
}

/**
 * 计算根数 (兼容旧接口)
 */
export function countGens(tiles: number[], melds: MahjongMeld[] = []): number {
  return countChaShanGen(tiles, melds);
}

export interface HuCheckResult {
  canHu: boolean;
  fanId: number;
  fanName: string;
  totalFactor: number; // 结算倍数
  isQiDui: boolean;
  isQingYiSe: boolean;
  isSoft: boolean; // 是否含红中百搭 (软胡)
  genCount: number;
  details?: { name: string; fanOrMult: string }[];
}

/**
 * 综合胡牌判定与算番核心入口
 */
export function evaluateHu(
  handTiles: number[],
  incomingTile?: number,
  melds: MahjongMeld[] = [],
  dingQueSuit: MahjongSuit | null = null,
  isZimo = false,
  isGangKai = false,
  isGangPao = false,
  isQiangGang = false,
  isHaiDi = false,
  maxCapFactor: number = 256,
  mode: string = 'hongzhong'
): HuCheckResult {
  const allTiles = incomingTile !== undefined ? [...handTiles, incomingTile] : [...handTiles];

  // 1. 定缺一票否决：若含有定缺花色的牌，严禁胡牌 (血战模式)
  if (dingQueSuit !== null && dingQueSuit >= 0) {
    if (allTiles.some((t) => getSuit(t) === dingQueSuit)) {
      return {
        canHu: false,
        fanId: 0,
        fanName: '',
        totalFactor: 0,
        isQiDui: false,
        isQingYiSe: false,
        isSoft: false,
        genCount: 0,
      };
    }
  }

  // 2. 调用商业级 HandEvaluator 进行完整牌型判定
  const isHongZhongMode = mode === 'hongzhong';
  const evalRes = evaluateHuPattern(allTiles, {
    wildcardIndex: isHongZhongMode ? 31 : undefined,
    allowQiDui: true,
    allowShiSanYao: mode === 'guobiao',
    dingQueSuit: dingQueSuit ?? -1,
  });

  if (!evalRes.canHu) {
    return {
      canHu: false,
      fanId: 0,
      fanName: '',
      totalFactor: 0,
      isQiDui: false,
      isQingYiSe: false,
      isSoft: false,
      genCount: 0,
    };
  }

  // 3. 调用商业级 MahjongScorer 精确计算番型与倍数
  const winCard = incomingTile !== undefined ? incomingTile : allTiles[allTiles.length - 1];
  const scoreRes = calculateMahjongScore(allTiles, winCard, {
    mode,
    isZimo,
    isGangShangHua: isGangKai,
    isGangShangPao: isGangPao,
    isHaiDiLaoYue: isHaiDi,
    isQiangGangHu: isQiangGang,
    melds,
    isMenQing: melds.filter((m) => m.type !== 'an_gang').length === 0,
  });

  // 封顶处理
  const cappedFactor = Math.min(scoreRes.totalFan, maxCapFactor);
  const isSoft = isHongZhongMode && allTiles.includes(HONG_ZHONG_TILE);

  return {
    canHu: true,
    fanId: scoreRes.baseFan,
    fanName: scoreRes.fanNames.join(' · ') || '平胡',
    totalFactor: cappedFactor,
    isQiDui: evalRes.huPattern === 'qidui',
    isQingYiSe: scoreRes.fanNames.some((n) => n.includes('清一色') || n.includes('清七对') || n.includes('清大对')),
    isSoft,
    genCount: scoreRes.puerGenCount,
    details: scoreRes.details,
  };
}

/**
 * 听牌分析器：给定 3N+1 张手牌，穷举所有可能摸起并胡牌的候选牌
 */
export function analyzeTing(
  handTiles13: number[],
  melds: MahjongMeld[] = [],
  dingQueSuit: MahjongSuit | null = null,
  discardsCount: Record<number, number> = {},
  mode: string = 'hongzhong'
): TingCandidateInfo[] {
  // 如果手牌中依然存在定缺花色，无法听牌
  if (dingQueSuit !== null && dingQueSuit >= 0 && handTiles13.some((t) => getSuit(t) === dingQueSuit)) {
    return [];
  }

  const results: TingCandidateInfo[] = [];

  // 根据模式扩充候选池 (普洱与国标需遍历字牌)
  const candidatePool =
    mode === 'puer' || mode === 'guobiao'
      ? [...NORMAL_TILES, ...HONOR_TILES]
      : mode === 'hongzhong'
      ? [...NORMAL_TILES, HONG_ZHONG_TILE]
      : [...NORMAL_TILES];

  for (const cand of candidatePool) {
    if (dingQueSuit !== null && getSuit(cand) === dingQueSuit) continue;

    const evalResult = evaluateHu(
      handTiles13,
      cand,
      melds,
      dingQueSuit,
      true, // 自摸视角预估
      false,
      false,
      false,
      false,
      256,
      mode
    );

    if (evalResult.canHu) {
      // 估算剩余未知张数: 4 - 手牌已有 - 牌桌已出
      const inHand = handTiles13.filter((t) => legacyIdToTileIndex(t) === legacyIdToTileIndex(cand)).length;
      const onTable = discardsCount[cand] || discardsCount[legacyIdToTileIndex(cand)] || 0;
      const remainCount = Math.max(0, 4 - inHand - onTable);

      results.push({
        tileId: cand,
        fanName: evalResult.fanName,
        factor: evalResult.totalFactor,
        remainCount,
      });
    }
  }

  return results;
}

/**
 * 合法出牌列表筛选（强制打缺：手牌有定缺花色时，严禁打其他花色）
 */
export function getLegalDiscards(
  handTiles: number[],
  dingQueSuit: MahjongSuit | null
): number[] {
  if (dingQueSuit === null || dingQueSuit < 0) return [...handTiles];

  const dingQueTiles = handTiles.filter((t) => getSuit(t) === dingQueSuit);
  if (dingQueTiles.length > 0) {
    return dingQueTiles;
  }

  return [...handTiles];
}

/**
 * 碰牌检验：手牌中拥有至少两张相同的牌，且不能是定缺牌
 */
export function canPeng(
  handTiles: number[],
  targetTile: number,
  dingQueSuit: MahjongSuit | null,
  mode: string = 'hongzhong'
): boolean {
  if (mode === 'hongzhong' && isWildcard(targetTile, mode)) return false; // 红中模式下万能牌不可被碰
  if (dingQueSuit !== null && dingQueSuit >= 0 && getSuit(targetTile) === dingQueSuit) return false;

  const targetIdx = legacyIdToTileIndex(targetTile);
  const count = handTiles.filter((t) => legacyIdToTileIndex(t) === targetIdx).length;
  return count >= 2;
}

/**
 * 杠牌检验（明杠/直杠、补杠/公杠、暗杠）
 */
export function checkGangOptions(
  handTiles: number[],
  targetTile?: number,
  isSelfTurn = false,
  melds: MahjongMeld[] = [],
  dingQueSuit: MahjongSuit | null = null,
  mode: string = 'hongzhong'
): Array<{ gangType: MeldType; tileId: number; tiles: number[] }> {
  const options: Array<{ gangType: MeldType; tileId: number; tiles: number[] }> = [];

  // A. 他家出牌时的直杠 (明杠)
  if (!isSelfTurn && targetTile !== undefined) {
    if (!isWildcard(targetTile, mode)) {
      if (dingQueSuit === null || dingQueSuit < 0 || getSuit(targetTile) !== dingQueSuit) {
        const targetIdx = legacyIdToTileIndex(targetTile);
        if (handTiles.filter((t) => legacyIdToTileIndex(t) === targetIdx).length >= 3) {
          options.push({
            gangType: 'ming_gang',
            tileId: targetTile,
            tiles: [targetTile, targetTile, targetTile, targetTile],
          });
        }
      }
    }
  }

  // B. 自身摸牌回合的暗杠与补杠
  if (isSelfTurn) {
    // 1. 暗杠：手中任意 4 张相同的牌
    const tileCounts: Record<number, number> = {};
    for (const t of handTiles) {
      const idx = legacyIdToTileIndex(t);
      tileCounts[idx] = (tileCounts[idx] || 0) + 1;
    }
    for (const [idxStr, cnt] of Object.entries(tileCounts)) {
      const idx = Number(idxStr);
      if (cnt >= 4) {
        const rawTile = handTiles.find((t) => legacyIdToTileIndex(t) === idx) ?? tileIndexToLegacyId(idx);
        if (dingQueSuit === null || dingQueSuit < 0 || getSuit(rawTile) !== dingQueSuit) {
          const isHongzhongWild = mode === 'hongzhong' && idx === 31;
          options.push({
            gangType: isHongzhongWild ? 'hongzhong_gang' : 'an_gang',
            tileId: rawTile,
            tiles: [rawTile, rawTile, rawTile, rawTile],
          });
        }
      }
    }

    // 2. 补杠：手中某张牌已在之前的碰牌副露中
    for (const m of melds) {
      if (m.type === 'peng') {
        const pengTile = (m.tiles && m.tiles.length > 0 ? m.tiles[0] : m.card) ?? 0;
        if (pengTile === 0) continue;
        const pengIdx = legacyIdToTileIndex(pengTile);
        if (handTiles.some((t) => legacyIdToTileIndex(t) === pengIdx)) {
          const matchTile = handTiles.find((t) => legacyIdToTileIndex(t) === pengIdx) ?? pengTile;
          options.push({
            gangType: 'bu_gang',
            tileId: matchTile,
            tiles: [matchTile, matchTile, matchTile, matchTile],
          });
        }
      }
    }
  }

  return options;
}

export interface OptimalDiscardResult {
  bestTile: number;
  totalTingCount: number;
  maxFactor: number;
  expectedScore: number;
  tingCandidates: TingCandidateInfo[];
  reason: string;
}

/**
 * 商业级智能打牌助手：计算期望价值最高的最优出牌建议 (整合 MahjongAI 攻防算法)
 */
export function calculateOptimalDiscard(
  handTiles: number[],
  melds: MahjongMeld[] = [],
  dingQueSuit: MahjongSuit | null = null,
  discardsCount: Record<number, number> = {},
  riverTiles: number[] = [],
  wallRemaining: number = 50,
  mode: string = 'hongzhong'
): OptimalDiscardResult | null {
  const legalDiscards = getLegalDiscards(handTiles, dingQueSuit);
  if (legalDiscards.length === 0) return null;

  let bestResult: OptimalDiscardResult | null = null;
  let highestScore = -1;

  const uniqueLegal = Array.from(new Set(legalDiscards));

  // 首先寻找能够直接听牌的最优出牌
  for (const discard of uniqueLegal) {
    if (mode === 'hongzhong' && isWildcard(discard, mode)) continue; // 严禁推荐弃置红中万能牌

    const restHand = [...handTiles];
    const idx = restHand.indexOf(discard);
    if (idx !== -1) restHand.splice(idx, 1);

    const tingList = analyzeTing(restHand, melds, dingQueSuit, discardsCount, mode);
    if (tingList.length === 0) continue;

    const totalTingCount = tingList.reduce((acc, cur) => acc + cur.remainCount, 0);
    const maxFactor = Math.max(...tingList.map((t) => t.factor));
    const expectedScore = tingList.reduce((acc, cur) => acc + cur.remainCount * cur.factor, 0);

    if (
      expectedScore > highestScore ||
      (expectedScore === highestScore && totalTingCount > (bestResult?.totalTingCount || 0))
    ) {
      highestScore = expectedScore;
      bestResult = {
        bestTile: discard,
        totalTingCount,
        maxFactor,
        expectedScore,
        tingCandidates: tingList,
        reason: `听 ${tingList.length} 门，共剩 ${totalTingCount} 张，最高 ${maxFactor} 倍`,
      };
    }
  }

  if (bestResult) {
    return bestResult;
  }

  // 若尚未听牌，则调用攻防一体启发式 MahjongAI 给出最佳舍牌
  const aiTile = decideBestDiscard({
    handTiles,
    melds,
    dingQueSuit: dingQueSuit ?? -1,
    riverTiles,
    opponentsMeldsCount: [melds.length],
    wallRemaining,
    mode,
  });

  return {
    bestTile: aiTile,
    totalTingCount: 0,
    maxFactor: 1,
    expectedScore: 0,
    tingCandidates: [],
    reason: '攻防进张优化推荐',
  };
}
