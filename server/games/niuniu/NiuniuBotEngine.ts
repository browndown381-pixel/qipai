import { NiuniuCard, NiuniuPlayMode } from '../../../src/games/niuniu/types.js';
import {
  evaluateBetMultiplier,
  evaluateCallBankerExpected,
  solveOptimalPartition,
} from '../../../src/games/niuniu/algorithms/NiuniuLogic.js';

export class NiuniuBotEngine {
  /**
   * 机器人看前4张牌抢庄决策：返回 0 (不抢), 1, 2, 3, 4
   */
  static decideCallBanker(
    first4Cards: NiuniuCard[],
    playMode: NiuniuPlayMode = 'qiangzhuang'
  ): number {
    return evaluateCallBankerExpected(first4Cards, playMode);
  }

  /**
   * 机器人闲家加倍决策：返回 5, 10, 15, 20
   */
  static decideBetMultiplier(
    first4Cards: NiuniuCard[],
    playMode: NiuniuPlayMode = 'qiangzhuang',
    dealerCallMultiplier: number = 1
  ): number {
    return evaluateBetMultiplier(first4Cards, playMode, dealerCallMultiplier);
  }

  /**
   * 机器人算牛与分牌求解
   */
  static solvePartition(
    cards: NiuniuCard[],
    playMode: NiuniuPlayMode = 'qiangzhuang'
  ) {
    return solveOptimalPartition(cards, playMode);
  }
}
