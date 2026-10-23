import {
  LaoYanCaiCard,
  LaoYanCaiDecision,
  LaoYanCaiPlayMode,
} from '../../../src/games/laoyancai/types.js';
import {
  analyzeLaoYanCaiDrawOdds,
  evaluateLaoYanCaiHand,
} from '../../../src/games/laoyancai/algorithms/LaoYanCaiLogic.js';

export class LaoYanCaiBotEngine {
  /**
   * Decides banker call multiplier (0 = 不抢, 1 = 1倍, 2 = 2倍, 3 = 3倍)
   */
  static decideCallBanker(
    playMode: LaoYanCaiPlayMode,
    beans: number,
    baseScore: number
  ): number {
    const ratio = beans / Math.max(100, baseScore);
    const roll = Math.random();
    if (ratio < 20) return roll < 0.25 ? 1 : 0;
    if (playMode === 'crazy') {
      if (roll < 0.35) return 3;
      if (roll < 0.65) return 2;
      if (roll < 0.85) return 1;
      return 0;
    }
    if (roll < 0.2) return 3;
    if (roll < 0.5) return 2;
    if (roll < 0.8) return 1;
    return 0;
  }

  /**
   * Decides idle player bet multiplier (5, 10, 15, 20)
   */
  static decideBetMultiplier(
    playMode: LaoYanCaiPlayMode,
    dealerCall: number
  ): number {
    const roll = Math.random();
    if (playMode === 'crazy') {
      if (roll < 0.35) return 20;
      if (roll < 0.68) return 15;
      if (roll < 0.9) return 10;
      return 5;
    }
    if (dealerCall >= 3) {
      return roll < 0.4 ? 10 : roll < 0.75 ? 15 : 5;
    }
    if (roll < 0.22) return 20;
    if (roll < 0.52) return 15;
    if (roll < 0.82) return 10;
    return 5;
  }

  /**
   * Banker natural 8/9 check: if Banker has 8 or 9 points on initial 2 cards,
   * should Banker immediately 炸开 (instant showdown with all players)?
   */
  static decideBankerNaturalZhaKai(
    twoCards: LaoYanCaiCard[],
    playMode: LaoYanCaiPlayMode
  ): boolean {
    const evalRes = evaluateLaoYanCaiHand(twoCards, playMode, false);
    if (!evalRes.canZhaKai) return false;
    // 9 points or suited 8 points -> almost always 炸开
    if (evalRes.points === 9 || evalRes.isSuited || evalRes.isPair) {
      return true;
    }
    // 8 points unsuited -> 88% chance to 炸开
    return Math.random() < 0.88;
  }

  /**
   * Idle player decision: ZHAKAI (if 8/9 points), LAO (draw 3rd card), or BULAO (stand on 2 cards)
   */
  static decidePlayerAction(
    twoCards: LaoYanCaiCard[],
    playMode: LaoYanCaiPlayMode,
    remainingDeck: LaoYanCaiCard[]
  ): 'ZHAKAI' | 'LAO' | 'BULAO' {
    const evalRes = evaluateLaoYanCaiHand(twoCards, playMode, false);
    if (evalRes.canZhaKai) {
      return 'ZHAKAI';
    }
    const odds = analyzeLaoYanCaiDrawOdds(twoCards, playMode, remainingDeck);
    if (evalRes.points <= 4) {
      return 'LAO';
    }
    if (evalRes.points === 5) {
      if (evalRes.isSuited) {
        // Suited 5 points has a chance at 三腌 (3x), draw 70% of the time
        return Math.random() < 0.7 ? 'LAO' : 'BULAO';
      }
      return odds.expectedPointsAfterDraw >= 5.05 && Math.random() < 0.55
        ? 'LAO'
        : 'BULAO';
    }
    if (evalRes.points === 6) {
      // 6 points stands almost always unless suited and feeling aggressive in crazy mode
      if (playMode === 'crazy' && evalRes.isSuited && Math.random() < 0.2) {
        return 'LAO';
      }
      return 'BULAO';
    }
    // 7 points always stands
    return 'BULAO';
  }

  /**
   * Banker final decision after seeing idle players' choices (LAO vs BULAO)
   */
  static decideBankerDrawAction(
    twoCards: LaoYanCaiCard[],
    playMode: LaoYanCaiPlayMode,
    remainingDeck: LaoYanCaiCard[],
    idleDecisions: LaoYanCaiDecision[]
  ): 'LAO' | 'BULAO' {
    const evalRes = evaluateLaoYanCaiHand(twoCards, playMode, false);
    const odds = analyzeLaoYanCaiDrawOdds(twoCards, playMode, remainingDeck);

    if (evalRes.points <= 4) {
      return 'LAO';
    }
    if (evalRes.points >= 7) {
      return 'BULAO';
    }

    const activeIdleCount = idleDecisions.filter(
      (d) => d === 'LAO' || d === 'BULAO'
    ).length;
    const standIdleCount = idleDecisions.filter((d) => d === 'BULAO').length;

    if (evalRes.points === 5) {
      // If most idle players stood (likely 6-7 pts), banker at 5 pts should draw to contest
      if (standIdleCount > activeIdleCount / 2 || odds.improveProbability >= 48) {
        return 'LAO';
      }
      return Math.random() < 0.65 ? 'LAO' : 'BULAO';
    }

    // 6 points: usually stand unless all idle players stood and mode is crazy
    if (
      evalRes.points === 6 &&
      playMode === 'crazy' &&
      standIdleCount === activeIdleCount &&
      activeIdleCount > 0 &&
      Math.random() < 0.22
    ) {
      return 'LAO';
    }
    return 'BULAO';
  }
}
