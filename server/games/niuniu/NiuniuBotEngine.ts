import { NiuniuCard } from '../../../src/games/niuniu/types.js';
import {
  evaluateBetMultiplier,
  evaluateCallBankerExpected,
  solveOptimalPartition,
} from '../../../src/games/niuniu/algorithms/NiuniuLogic.js';

export class NiuniuBotEngine {
  /**
   * 机器人抢庄决策：返回 0 (不抢), 1, 2, 3, 4
   */
  static decideCallBanker(cards: NiuniuCard[]): number {
    return evaluateCallBankerExpected(cards);
  }

  /**
   * 机器人闲家加倍决策：返回 5, 10, 15, 20
   */
  static decideBetMultiplier(cards: NiuniuCard[]): number {
    return evaluateBetMultiplier(cards);
  }

  /**
   * 机器人算牛与分牌求解
   */
  static solvePartition(cards: NiuniuCard[]) {
    return solveOptimalPartition(cards);
  }
}
