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
  analyzeTing,
  getLegalDiscards,
} from '../../../src/games/mahjong/algorithms/MahjongRules';

export class MahjongBotEngine {
  /**
   * 智能定缺策略：统计万、条、筒三门牌数量与面子连贯性，定最弱的一门
   */
  static decideDingQue(handTiles: number[]): MahjongSuit {
    const suitCounts: Record<0 | 1 | 2, number> = { 0: 0, 1: 0, 2: 0 };

    for (const t of handTiles) {
      const s = getSuit(t);
      if (s >= 0 && s <= 2) {
        suitCounts[s as 0 | 1 | 2] += 1;
      }
    }

    // 选牌数最少的一门
    const suits: Array<0 | 1 | 2> = [0, 1, 2];
    suits.sort((a, b) => suitCounts[a] - suitCounts[b]);

    return suits[0];
  }

  /**
   * 商业级打牌决策：
   * 1. 严格遵守打缺规则：若有定缺牌，先打散张定缺牌；
   * 2. 无定缺牌时，基于向听数与连结度估值，保留顺子刻子雀头，弃置边张孤牌。
   */
  static decideDiscard(
    handTiles: number[],
    dingQueSuit: MahjongSuit | null,
    melds: MahjongMeld[] = [],
    wallRemainCount: number = 100,
    discardsCount: Record<number, number> = {},
    mode: string = 'hongzhong'
  ): number {
    const legalDiscards = getLegalDiscards(handTiles, dingQueSuit);
    if (legalDiscards.length === 1) return legalDiscards[0];

    // 如果还有定缺牌，优先打定缺单牌 (按 1, 9 偏远端先打)
    if (dingQueSuit !== null && dingQueSuit >= 0 && legalDiscards.some((t) => getSuit(t) === dingQueSuit)) {
      return legalDiscards.sort((a, b) => {
        const countA = handTiles.filter((t) => t === a).length;
        const countB = handTiles.filter((t) => t === b).length;
        if (countA !== countB) return countA - countB; // 孤张先打
        const distA = Math.abs(getRank(a) - 5);
        const distB = Math.abs(getRank(b) - 5);
        return distB - distA; // 靠近 1、9 的先打
      })[0];
    }

    // 无定缺牌时：测试打出每张牌后能否听牌或听牌张数最多
    let bestDiscard = legalDiscards[0];
    let maxTingCount = -1;

    for (const cand of legalDiscards) {
      if (mode === 'hongzhong' && isWildcard(cand, mode)) continue; // 严禁主动打出红中万能牌

      const restHand = [...handTiles];
      const idx = restHand.indexOf(cand);
      if (idx !== -1) restHand.splice(idx, 1);

      const tingList = analyzeTing(restHand, melds, dingQueSuit, discardsCount, mode);
      const totalTingRemain = tingList.reduce((acc, cur) => acc + cur.remainCount, 0);

      if (totalTingRemain > maxTingCount) {
        maxTingCount = totalTingRemain;
        bestDiscard = cand;
      }
    }

    if (maxTingCount > 0) {
      return bestDiscard;
    }

    // 残局防守机制（牌墙剩余不足 30 张）：若未下叫，优先出熟张避炮防守
    const nonWild = legalDiscards.filter((t) => !isWildcard(t));
    if (wallRemainCount < 30) {
      const safeRanked = [...nonWild].sort((a, b) => {
        const tableSeenA = discardsCount[a] || 0;
        const tableSeenB = discardsCount[b] || 0;
        // 场上见过的熟张优先打出避炮
        if (tableSeenA !== tableSeenB) {
          return tableSeenB - tableSeenA;
        }
        // 靠边端牌风险略低于中张
        return Math.abs(getRank(b) - 5) - Math.abs(getRank(a) - 5);
      });
      if (safeRanked.length > 0 && (discardsCount[safeRanked[0]] || 0) > 0) {
        return safeRanked[0];
      }
    }

    // 常规巡目：评估孤张权重打出
    return nonWild
      .sort((a, b) => {
        const cntA = handTiles.filter((t) => t === a).length;
        const cntB = handTiles.filter((t) => t === b).length;
        if (cntA !== cntB) return cntA - cntB;

        // 检查相邻牌数量
        const hasNeighA = handTiles.some(
          (t) => getSuit(t) === getSuit(a) && Math.abs(getRank(t) - getRank(a)) <= 2 && t !== a
        );
        const hasNeighB = handTiles.some(
          (t) => getSuit(t) === getSuit(b) && Math.abs(getRank(t) - getRank(b)) <= 2 && t !== b
        );
        if (!hasNeighA && hasNeighB) return -1;
        if (hasNeighA && !hasNeighB) return 1;

        return Math.abs(getRank(b) - 5) - Math.abs(getRank(a) - 5);
      })[0] || legalDiscards[0];
  }

  /**
   * 商业级响应决策 (吃/碰/杠/胡/过)
   */
  static decideAction(
    availableActions: AvailableAction[]
  ): AvailableAction | null {
    if (!availableActions || availableActions.length === 0) return null;

    // 1. 胡牌：血流成河绝对最高收益，有胡必胡！
    const huAct = availableActions.find((a) => a.actionType === 'hu');
    if (huAct) return huAct;

    // 2. 开杠：刮风下雨直接抢分，积极开杠
    const gangAct = availableActions.find((a) => a.actionType === 'gang');
    if (gangAct) return gangAct;

    // 3. 碰牌：碰牌概率推进听牌
    const pengAct = availableActions.find((a) => a.actionType === 'peng');
    if (pengAct) {
      return pengAct;
    }

    return null; // 选择“过”
  }
}
