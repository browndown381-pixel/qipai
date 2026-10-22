/**
 * 炸金花 bot decision engine.
 *
 * Uses the exact hand percentile (share of the 22100 possible hands this hand beats) plus a
 * per-seat personality. Bots only use information a human could see (own cards, pot, round,
 * stake) — never opponents' hidden cards. `rng` is injectable for deterministic tests.
 */
import { handPercentile } from '../../../src/games/zhajinhua/algorithms/ZjhLogic.js';
import type { ZjhActionPayload, ZjhCard, ZjhRaiseOption } from '../../../src/games/zhajinhua/types.js';

export interface ZjhBotPersonality {
  /** 0..1 — willingness to raise / compare. */
  aggression: number;
  /** 0..1 — chance to keep playing a weak hand. */
  bluff: number;
}

export interface ZjhBotContext {
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
  aggression: 0.2 + rng() * 0.6,
  bluff: 0.05 + rng() * 0.25,
});

export class ZjhBotEngine {
  static decide(ctx: ZjhBotContext, rng: Rng = Math.random): ZjhActionPayload {
    const p = handPercentile(ctx.cards);
    const { personality: per } = ctx;

    // Blind players peek more often as the hand goes on and the stakes rise.
    if (!ctx.seen) {
      const peekChance = Math.min(0.95, 0.2 + 0.2 * (ctx.round - 1) + 0.15 * ctx.stakeLevel);
      if (rng() < peekChance) return { action: 'look' };
      return ZjhBotEngine.playBlind(ctx, p, rng);
    }

    // Forced: cannot afford the call.
    if (ctx.mustAllIn) {
      return p > 0.5 || rng() < per.bluff ? { action: 'allin' } : { action: 'fold' };
    }

    const pressure = 0.04 * (ctx.round - 1) + 0.06 * ctx.stakeLevel;
    const foldLine = Math.max(0.12, 0.28 + pressure - 0.18 * per.aggression);
    const effective = p + (rng() - 0.5) * 0.06;

    if (effective < foldLine && rng() >= per.bluff) {
      return { action: 'fold' };
    }

    // Monster hands (straight and above): pile in.
    if (p >= 0.97) {
      const top = ZjhBotEngine.pickRaise(ctx, ctx.raiseOptions.length - 1);
      if (top) return top;
    }

    // Heads-up or late rounds with a decent hand: force a showdown.
    if (ctx.canCompare) {
      const lateGame = ctx.round >= Math.ceil(ctx.maxRounds * 0.6);
      const wantsShowdown =
        (ctx.activeCount === 2 && p > 0.45) ||
        (lateGame && p > 0.6) ||
        (p > 0.75 && rng() < 0.25 * per.aggression + 0.1);
      if (wantsShowdown && ctx.beans >= ctx.compareCost) {
        const target = ctx.compareTargets[Math.floor(rng() * ctx.compareTargets.length)];
        return { action: 'compare', targetSeat: target };
      }
    }

    // Value raise.
    if (p > 0.8 && rng() < 0.2 + 0.5 * per.aggression) {
      const raise = ZjhBotEngine.pickRaise(ctx, 0);
      if (raise) return raise;
    }

    return ZjhBotEngine.callOrFold(ctx);
  }

  private static playBlind(ctx: ZjhBotContext, p: number, rng: Rng): ZjhActionPayload {
    const { personality: per } = ctx;
    if (ctx.mustAllIn) return { action: 'allin' };
    // Aggressive bots sometimes raise blind (cheaper than raising seen).
    if (ctx.raiseOptions.length > 0 && rng() < 0.08 * per.aggression + (p > 0.9 ? 0.1 : 0)) {
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
