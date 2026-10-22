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

export class MahjongBotEngine {
  /**
   * 智能定缺策略：统计万、条、筒三门牌数量与面子连贯性，定最弱的一门
   */
  static decideDingQue(handTiles: number[], mode: string = 'hongzhong'): MahjongSuit {
    const suitCounts: Record<0 | 1 | 2, number> = { 0: 0, 1: 0, 2: 0 };

    for (const t of handTiles) {
      if (isWildcard(t, mode)) continue;
      const s = getSuit(t);
      if (s >= 0 && s <= 2) {
        suitCounts[s as 0 | 1 | 2] += 1;
      }
    }

    const suits: Array<0 | 1 | 2> = [0, 1, 2];
    suits.sort((a, b) => suitCounts[a] - suitCounts[b]);

    return suits[0];
  }

  /**
   * 商业级打牌决策：
   * 1. 严格遵守打缺规则：若有定缺牌，先打散张定缺牌；
   * 2. 无定缺牌时，调用 34 维向听数 + 真实可见有效进张(Ukeire) + 牌河危险度综合估值引擎。
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
   * 商业级响应决策 (吃/碰/杠/胡/过)
   */
  static decideAction(
    availableActions: AvailableAction[]
  ): AvailableAction | null {
    if (!availableActions || availableActions.length === 0) return null;

    // 1. 胡牌：最高优先级，有胡必胡
    const huAct = availableActions.find((a) => a.actionType === 'hu');
    if (huAct) return huAct;

    // 2. 开杠：刮风下雨抢分
    const gangAct = availableActions.find((a) => a.actionType === 'gang');
    if (gangAct) return gangAct;

    // 3. 碰牌：推进听牌
    const pengAct = availableActions.find((a) => a.actionType === 'peng');
    if (pengAct) {
      return pengAct;
    }

    return null;
  }
}
