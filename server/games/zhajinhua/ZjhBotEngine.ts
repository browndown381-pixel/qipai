/**
 * 炸金花 commercial AI bot decision engine.
 *
 * Uses exact dead-card-adjusted 1v1 equity across C(49, 3) = 18,424 opponent combinations,
 * multi-way survival equity P_win^(k-1), Pot Odds (callCost / (pot + callCost)), and
 * per-seat personality (aggression & bluff).
 */
import {
  analyzeZjhDecisionEquity,
  deadCardAdjustedEquity,
} from '../../../src/games/zhajinhua/algorithms/ZjhLogic.js';
import { ZjhDebugLogger } from '../../../src/games/zhajinhua/utils/ZjhDebugLogger.js';
import type {
  ZjhActionPayload,
  ZjhCard,
  ZjhMode,
  ZjhRaiseOption,
} from '../../../src/games/zhajinhua/types.js';

export interface ZjhBotPersonality {
  /** 0..1 — willingness to raise / compare. */
  aggression: number;
  /** 0..1 — chance to keep playing a weak hand or semi-bluff. */
  bluff: number;
}

export interface ZjhBotContext {
  seatIndex?: number;
  nickname?: string;
  mode?: ZjhMode;
  pot?: number;
  cards: readonly ZjhCard[];
  seen: boolean;
  round: number;
  maxRounds: number;
  stakeLevel: number;
  activeCount: number;
  beans: number;
  callCost: number;
  raiseOptions: ZjhRaiseOption[];
  compareCost: number;
  canCompare: boolean;
  compareTargets: number[];
  mustAllIn: boolean;
  personality: ZjhBotPersonality;
}

export type Rng = () => number;

export const randomPersonality = (rng: Rng = Math.random): ZjhBotPersonality => ({
  aggression: 0.25 + rng() * 0.55,
  bluff: 0.06 + rng() * 0.22,
});

export class ZjhBotEngine {
  static decide(ctx: ZjhBotContext, rng: Rng = Math.random): ZjhActionPayload {
    const mode = ctx.mode ?? 'classic';
    const estimatedPot = ctx.pot ?? ctx.callCost * Math.max(2, ctx.activeCount * ctx.round);
    const equityAnalysis = analyzeZjhDecisionEquity({
      cards: ctx.cards,
      mode,
      activeCount: ctx.activeCount,
      pot: estimatedPot,
      callCost: ctx.callCost,
      compareCost: ctx.compareCost,
      canCompare: ctx.canCompare,
      round: ctx.round,
      stakeLevel: ctx.stakeLevel,
    });

    const p1v1 = deadCardAdjustedEquity(ctx.cards, mode);
    const pMulti = equityAnalysis.multiWayEquity / 100;
    const potOdds = equityAnalysis.potOdds / 100;
    const { personality: per } = ctx;

    let chosen: ZjhActionPayload;

    // 1. Blind play: bots decide whether to peek or stay blind based on round, stake pressure, and aggression.
    if (!ctx.seen) {
      const peekChance = Math.min(
        0.95,
        0.18 + 0.22 * (ctx.round - 1) + 0.16 * ctx.stakeLevel - 0.08 * per.aggression,
      );
      if (rng() < peekChance) {
        chosen = { action: 'look' };
      } else {
        chosen = ZjhBotEngine.playBlind(ctx, p1v1, rng);
      }
      if (ctx.seatIndex !== undefined) {
        ZjhDebugLogger.logBotDecision(
          ctx.seatIndex,
          ctx.nickname || `AI#${ctx.seatIndex}`,
          ctx.cards,
          ctx.seen,
          per,
          equityAnalysis,
          chosen,
        );
      }
      return chosen;
    }

    // 2. Forced All-In when beans cannot cover a call
    if (ctx.mustAllIn) {
      chosen =
        pMulti >= potOdds * 0.85 || p1v1 > 0.52 || rng() < per.bluff
          ? { action: 'allin' }
          : { action: 'fold' };
      if (ctx.seatIndex !== undefined) {
        ZjhDebugLogger.logBotDecision(
          ctx.seatIndex,
          ctx.nickname || `AI#${ctx.seatIndex}`,
          ctx.cards,
          ctx.seen,
          per,
          equityAnalysis,
          chosen,
        );
      }
      return chosen;
    }

    // 3. Compare multi-way equity against Pot Odds threshold + personality adjustment
    const foldThreshold = Math.max(
      0.12,
      potOdds * (1.05 - 0.28 * per.aggression) + 0.03 * (ctx.round - 1),
    );
    const effectiveMulti = pMulti + (rng() - 0.5) * 0.05;

    if (effectiveMulti < foldThreshold && p1v1 < 0.46 && rng() >= per.bluff) {
      chosen = { action: 'fold' };
    } else if (p1v1 >= 0.95) {
      // Monster hands (Straight and above): value raise aggressively
      const topIdx = rng() < 0.65 ? ctx.raiseOptions.length - 1 : 0;
      chosen = ZjhBotEngine.pickRaise(ctx, topIdx) ?? ZjhBotEngine.callOrFold(ctx);
    } else if (
      ctx.canCompare &&
      ctx.beans >= ctx.compareCost &&
      ((ctx.activeCount === 2 && p1v1 > 0.48) ||
        (ctx.round >= Math.ceil(ctx.maxRounds * 0.55) && p1v1 > 0.58) ||
        (p1v1 > 0.72 && rng() < 0.28 * per.aggression + 0.12))
    ) {
      // Value compare in heads-up or late rounds
      const target = ctx.compareTargets[Math.floor(rng() * ctx.compareTargets.length)];
      chosen = { action: 'compare', targetSeat: target };
    } else if (p1v1 > 0.78 && rng() < 0.25 + 0.5 * per.aggression) {
      chosen = ZjhBotEngine.pickRaise(ctx, 0) ?? ZjhBotEngine.callOrFold(ctx);
    } else {
      chosen = ZjhBotEngine.callOrFold(ctx);
    }

    if (ctx.seatIndex !== undefined) {
      ZjhDebugLogger.logBotDecision(
        ctx.seatIndex,
        ctx.nickname || `AI#${ctx.seatIndex}`,
        ctx.cards,
        ctx.seen,
        per,
        equityAnalysis,
        chosen,
      );
    }
    return chosen;
  }

  private static playBlind(ctx: ZjhBotContext, p1v1: number, rng: Rng): ZjhActionPayload {
    const { personality: per } = ctx;
    if (ctx.mustAllIn) return { action: 'allin' };
    if (ctx.raiseOptions.length > 0 && rng() < 0.09 * per.aggression + (p1v1 > 0.9 ? 0.08 : 0)) {
      const raise = ZjhBotEngine.pickRaise(ctx, 0);
      if (raise) return raise;
    }
    return ZjhBotEngine.callOrFold(ctx);
  }

  private static pickRaise(ctx: ZjhBotContext, index: number): ZjhActionPayload | null {
    const option = ctx.raiseOptions[Math.max(0, Math.min(index, ctx.raiseOptions.length - 1))];
    if (!option || option.cost > ctx.beans) return null;
    return { action: 'raise', level: option.level };
  }

  private static callOrFold(ctx: ZjhBotContext): ZjhActionPayload {
    if (ctx.callCost > ctx.beans) return { action: 'allin' };
    return { action: 'call' };
  }
}
