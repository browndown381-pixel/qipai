import React from 'react';
import { NiuniuCard, NiuniuHandResult, NiuniuPhase, NiuniuPlayerInfo } from '../types';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

export interface NiuniuActionBarProps {
  phase: NiuniuPhase;
  countdown: number;
  selfPlayer: NiuniuPlayerInfo | null;
  onCallBanker: (multiplier: number) => void;
  onBet: (multiplier: number) => void;
  onAutoPartition: () => void;
  onShowHand: () => void;
  onReady: () => void;
  hasNiuPrompt?: boolean;
  handResult?: NiuniuHandResult;
}

export const NiuniuActionBar: React.FC<NiuniuActionBarProps> = ({
  phase,
  countdown,
  selfPlayer,
  onCallBanker,
  onBet,
  onAutoPartition,
  onShowHand,
  onReady,
  hasNiuPrompt,
  handResult,
}) => {
  if (!selfPlayer) return null;

  const isDealer = selfPlayer.isDealer;
  const hasCalled = selfPlayer.callMultiplier !== -1;
  const hasBet = selfPlayer.betMultiplier > 0;
  const hasShown = selfPlayer.hasShownHand;
  const isReady = selfPlayer.ready;

  return (
    <div className="relative z-40 flex flex-col items-center justify-center gap-2">
      {/* ================= Countdown Timer Indicator ================= */}
      {countdown > 0 && phase !== 'WAITING' && (
        <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/60 px-3 py-0.5 text-xs font-mono font-bold text-amber-300 shadow-md backdrop-blur-xs">
          <div className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
          <span>倒计时: {countdown}s</span>
        </div>
      )}

      {/* ================= Action Buttons Container ================= */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Phase 1: Call Banker */}
        {phase === 'CALL_BANKER' && !hasCalled && (
          <div className="flex items-center gap-2 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap(680);
                hapticEngine.tap();
                onCallBanker(0);
              }}
              className="rounded-full border border-neutral-400 bg-neutral-800/90 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-lg active:scale-95 cursor-pointer hover:bg-neutral-700"
            >
              不抢
            </button>
            {[1, 2, 3, 4].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => {
                  soundEngine.playTap(760 + mult * 40);
                  hapticEngine.tap();
                  onCallBanker(mult);
                }}
                className="rounded-full border border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/30 active:scale-95 cursor-pointer hover:brightness-110"
              >
                抢{mult}倍
              </button>
            ))}
          </div>
        )}

        {/* Phase 2: Betting */}
        {phase === 'BETTING' && !isDealer && !hasBet && (
          <div className="flex items-center gap-2 animate-in zoom-in-95 duration-150">
            {[5, 10, 15, 20].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => {
                  soundEngine.playTap(750 + mult * 10);
                  hapticEngine.tap();
                  onBet(mult);
                }}
                className="rounded-full border border-cyan-300 bg-gradient-to-r from-cyan-600 to-blue-700 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-cyan-600/30 active:scale-95 cursor-pointer hover:brightness-110"
              >
                {mult}倍
              </button>
            ))}
          </div>
        )}

        {/* Phase 3: Showdown (算牛 / 摊牌) */}
        {phase === 'SHOWDOWN' && !hasShown && (
          <div className="flex items-center gap-2.5 animate-in zoom-in-95 duration-150">
            {/* Auto Partition / Hint Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playCardPlace(true);
                hapticEngine.selectCard();
                onAutoPartition();
              }}
              className="flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-700/90 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white shadow-lg active:scale-95 cursor-pointer hover:bg-emerald-600"
            >
              <span>智能提示</span>
              {handResult && (
                <span className="rounded bg-black/40 px-1 py-0.2 text-[10px] text-amber-300">
                  {handResult.name}
                </span>
              )}
            </button>

            {/* Confirm Show Hand Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playPowerChime(4);
                hapticEngine.playCard();
                onShowHand();
              }}
              className="rounded-full border-2 border-yellow-200 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600 px-5 sm:px-6 py-1.5 text-xs sm:text-sm font-black text-black shadow-xl shadow-amber-500/40 active:scale-95 cursor-pointer hover:brightness-110"
            >
              亮牌
            </button>
          </div>
        )}

        {/* Waiting / Next Round Ready */}
        {(phase === 'WAITING' || phase === 'ROUND_RESULT') && !isReady && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(720);
              hapticEngine.tap();
              onReady();
            }}
            className="rounded-full border-2 border-amber-300 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 px-6 py-2 text-xs sm:text-sm font-black text-black shadow-xl shadow-amber-500/40 active:scale-95 cursor-pointer hover:brightness-110 animate-bounce"
          >
            准备
          </button>
        )}
      </div>
    </div>
  );
};
