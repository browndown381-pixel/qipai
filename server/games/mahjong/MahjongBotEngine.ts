import {
  AvailableAction,
  MahjongMeld,
  MahjongSuit,
} from '../../../src/games/mahjong/types';
import {
  getRank,
  getSuit,
  isWildcard,
} from '../../../src/games/mahjong/algorithms/MahjongTile';
import {
  calculateOptimalDiscard,
  getLegalDiscards,
} from '../../../src/games/mahjong/algorithms/MahjongRules';
import {
  shouldAIGang,
  shouldAIPeng,
} from '../../../src/games/mahjong/algorithms/MahjongAI';

export class MahjongBotEngine {
  /**
   * 智能定缺策略：综合评估万、条、筒三门牌的张数与内部刻子/对子/顺子搭子结构，定结构最弱的一门
   */
  static decideDingQue(handTiles: number[], mode: string = 'hongzhong'): MahjongSuit {
    const suitScores: Record<0 | 1 | 2, number> = { 0: 0, 1: 0, 2: 0 };
    const suitRankCounts: Record<0 | 1 | 2, number[]> = {
      0: new Array(10).fill(0),
      1: new Array(10).fill(0),
      2: new Array(10).fill(0),
    };

    for (const t of handTiles) {
      if (isWildcard(t, mode)) continue;
      const s = getSuit(t);
      const r = getRank(t);
      if ((s === 0 || s === 1 || s === 2) && r >= 1 && r <= 9) {
        suitScores[s] += 10;
        suitRankCounts[s][r] += 1;
      }
    }

    for (const s of [0, 1, 2] as const) {
      const counts = suitRankCounts[s];
      for (let r = 1; r <= 9; r++) {
        if (counts[r] >= 3) suitScores[s] += 16; // 刻子权重高，不轻易定缺
        else if (counts[r] === 2) suitScores[s] += 7; // 对子加权
        if (r <= 8 && counts[r] > 0 && counts[r + 1] > 0) suitScores[s] += 4; // 连张搭子
        if (r <= 7 && counts[r] > 0 && counts[r + 2] > 0) suitScores[s] += 2; // 嵌张搭子
      }
    }

    const suits: Array<0 | 1 | 2> = [0, 1, 2];
    suits.sort((a, b) => suitScores[a] - suitScores[b]);

    return suits[0];
  }

  /**
   * 商业级打牌决策：
   * 1. 严格遵守打缺规则：若有定缺牌，先打散张定缺牌；
   * 2. 无定缺牌时，调用 34 维向听数 + 真实可见有效进张(Ukeire) + 筋壁牌河危险度综合估值引擎。
   */
  static decideDiscard(
    handTiles: number[],
    dingQueSuit: MahjongSuit | null,
    melds: MahjongMeld[] = [],
    wallRemainCount: number = 100,
    discardsCount: Record<number, number> = {},
    mode: string = 'puer'
  ): number {
    const legalDiscards = getLegalDiscards(handTiles, dingQueSuit, mode);
    if (legalDiscards.length === 0) return handTiles[handTiles.length - 1] || 1;
    if (legalDiscards.length === 1) return legalDiscards[0];

    // 如果还有定缺牌，优先打定缺单牌 (按 1, 9 偏远端先打)
    if (
      dingQueSuit !== null &&
      dingQueSuit >= 0 &&
      legalDiscards.some((t) => !isWildcard(t, mode) && getSuit(t) === dingQueSuit)
    ) {
      return [...legalDiscards].sort((a, b) => {
        const countA = handTiles.filter((t) => t === a).length;
        const countB = handTiles.filter((t) => t === b).length;
        if (countA !== countB) return countA - countB;
        const distA = Math.abs(getRank(a) - 5);
        const distB = Math.abs(getRank(b) - 5);
        return distB - distA;
      })[0];
    }

    // 委托 34 维核心向听数与攻防一体 AI 引擎计算最佳出牌
    const visibleTiles: number[] = [];
    for (const [key, cnt] of Object.entries(discardsCount)) {
      const tid = Number(key);
      for (let i = 0; i < cnt; i++) visibleTiles.push(tid);
    }

    const optimal = calculateOptimalDiscard(
      handTiles,
      melds,
      dingQueSuit,
      discardsCount,
      visibleTiles,
      wallRemainCount,
      mode
    );

    if (optimal && legalDiscards.includes(optimal.bestTile)) {
      return optimal.bestTile;
    }

    const nonWild = legalDiscards.filter((t) => !isWildcard(t, mode));
    return nonWild[0] ?? legalDiscards[0];
  }

  /**
   * 商业级响应决策 (吃/碰/杠/胡/过)：
   * 结合手牌向听数评估，杜绝破坏门清听牌或恶化向听数的盲目碰杠
   */
  static decideAction(
    availableActions: AvailableAction[],
    handTiles?: number[],
    meldsCount: number = 0,
    mode: string = 'puer'
  ): AvailableAction | null {
    if (!availableActions || availableActions.length === 0) return null;

    // 1. 胡牌：最高优先级，有胡必胡
    const huAct = availableActions.find((a) => a.actionType === 'hu');
    if (huAct) return huAct;

    // 2. 开杠：在不破坏已有听牌结构的前提下刮风下雨抢分
    const gangAct = availableActions.find((a) => a.actionType === 'gang');
    if (gangAct) {
      if (!handTiles || shouldAIGang(handTiles, gangAct.targetTile, meldsCount, mode)) {
        return gangAct;
      }
    }

    // 3. 碰牌：仅当碰牌能加快向听推进或维持高质量听牌时才碰
    const pengAct = availableActions.find((a) => a.actionType === 'peng');
    if (pengAct) {
      if (!handTiles || shouldAIPeng(handTiles, pengAct.targetTile, meldsCount, mode)) {
        return pengAct;
      }
    }

    return null;
  }
}
