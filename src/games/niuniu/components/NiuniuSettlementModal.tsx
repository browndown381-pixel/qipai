import React from 'react';
import { NiuniuSettlement } from '../types';
import { AvatarSvg } from '../../../shared/ui/AvatarSvg';
import { NiuniuCardView } from './NiuniuCardView';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

export interface NiuniuSettlementModalProps {
  settlement?: NiuniuSettlement;
  countdown: number;
  selfPlayerId: string;
  onReadyNext: () => void;
  onLeaveRoom: () => void;
}

export const NiuniuSettlementModal: React.FC<NiuniuSettlementModalProps> = ({
  settlement,
  countdown,
  selfPlayerId,
  onReadyNext,
  onLeaveRoom,
}) => {
  if (!settlement) return null;

  const selfRecord =
    settlement.players.find((p) => p.playerId === selfPlayerId) ??
    settlement.players[0];
  const isSelfWin = (selfRecord?.scoreDelta ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-amber-300/75 bg-gradient-to-b from-[#26160c] via-[#190e07] to-[#110904] shadow-2xl">
        {/* Banner Header */}
        <div
          className={`
            relative flex items-center justify-between px-5 py-3
            ${
              isSelfWin
                ? 'bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#d97706] text-[#240e03]'
                : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white'
            }
          `}
        >
          <span className="font-display text-lg sm:text-xl font-black tracking-wider">
            {isSelfWin ? '本局结算 · 旗开得胜' : '本局结算 · 再接再厉'}
          </span>
          <span className="font-mono text-xs font-extrabold opacity-90">
            底分: {settlement.baseScore}
          </span>
        </div>

        {/* Players Settlement Table */}
        <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto p-3.5 sm:p-4">
          {settlement.players.map((p) => {
            const isSelf = p.playerId === selfPlayerId;
            return (
              <div
                key={p.playerId}
                className={`
                  flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 transition-colors
                  ${
                    isSelf
                      ? 'border-amber-300/65 bg-amber-500/15'
                      : 'border-white/10 bg-white/5'
                  }
                `}
              >
                {/* Left: Avatar + Nickname + Role */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-amber-200/40 bg-[#1e2636]">
                    <AvatarSvg avatarId={p.avatarId || p.playerId} size={36} />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[95px] truncate text-xs sm:text-sm font-extrabold text-white">
                        {p.nickname}
                      </span>
                      {p.isDealer && (
                        <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-[#240e03]">
                          庄家{p.callMultiplier && p.callMultiplier > 0 ? `${p.callMultiplier}倍` : ''}
                        </span>
                      )}
                      {!p.isDealer && p.betMultiplier && p.betMultiplier > 0 && (
                        <span className="rounded bg-cyan-600/80 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
                          闲{p.betMultiplier}倍
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-amber-100/60">
                      余额: {p.balance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Center: 5 Miniature Cards + Hand Stamp */}
                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden sm:flex items-center -space-x-2">
                    {(p.cards || []).map((c, idx) => (
                      <NiuniuCardView
                        key={`${c.id}_${idx}`}
                        card={c}
                        size="xs"
                      />
                    ))}
                  </div>
                  <span className="rounded-full border border-amber-300/45 bg-black/50 px-2.5 py-0.5 text-xs font-black text-amber-200 whitespace-nowrap">
                    {p.handName}
                    {p.handMultiplier ? ` ×${p.handMultiplier}倍` : ''}
                  </span>
                </div>

                {/* Right: Score Delta */}
                <div className="flex w-24 shrink-0 flex-col items-end">
                  <span
                    className={`font-mono text-sm sm:text-base font-black tabular-nums ${
                      p.scoreDelta > 0
                        ? 'text-amber-300'
                        : p.scoreDelta < 0
                        ? 'text-rose-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {p.scoreDelta > 0
                      ? `+${p.scoreDelta.toLocaleString()}`
                      : p.scoreDelta.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/45 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(640);
              onLeaveRoom();
            }}
            className="rounded-full border border-white/25 bg-white/10 px-5 py-1.5 text-xs sm:text-sm font-bold text-white/90 active:scale-95 cursor-pointer hover:bg-white/20"
          >
            返回大厅
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(760);
              hapticEngine.tap();
              onReadyNext();
            }}
            className="rounded-full border-2 border-amber-200 bg-gradient-to-b from-[#ffe58f] via-[#f59e0b] to-[#c2410c] px-6 py-1.5 text-xs sm:text-sm font-black text-[#240e03] shadow-lg active:scale-95 cursor-pointer hover:brightness-110"
          >
            再来一局 ({countdown}s)
          </button>
        </div>
      </div>
    </div>
  );
};
