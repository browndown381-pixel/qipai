import React from 'react';
import { NiuniuSettlement } from '../types';
import { AvatarSvg } from '../../../shared/ui/AvatarSvg';
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

  const selfRecord = settlement.players.find((p) => p.playerId === selfPlayerId);
  const isSelfWin = (selfRecord?.scoreDelta ?? 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-[#1f1a14] via-[#14100c] to-[#0a0806] shadow-2xl">
        {/* Banner Header */}
        <div
          className={`
            relative flex items-center justify-center py-3 text-center
            ${
              isSelfWin
                ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600'
                : 'bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700'
            }
          `}
        >
          <span className="font-display text-lg sm:text-xl font-black tracking-wider text-black drop-shadow">
            {isSelfWin ? '大吉大利 · 胜利' : '再接再厉 · 惜败'}
          </span>
        </div>

        {/* Players List Table */}
        <div className="flex flex-col gap-1.5 p-3 sm:p-4 max-h-[60vh] overflow-y-auto">
          {settlement.players.map((p) => {
            const isSelf = p.playerId === selfPlayerId;
            return (
              <div
                key={p.playerId}
                className={`
                  flex items-center justify-between rounded-lg px-2.5 py-1.5 border transition-colors
                  ${
                    isSelf
                      ? 'border-amber-400/60 bg-amber-500/10'
                      : 'border-white/5 bg-white/5'
                  }
                `}
              >
                {/* Left: Avatar + Nickname + Role Tag */}
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-white/20">
                    <AvatarSvg avatarId={p.playerId} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-bold text-white max-w-[80px] sm:max-w-[110px] truncate">
                        {p.nickname}
                      </span>
                      {isSelf && (
                        <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                          我
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/60">
                      <span>{p.isDealer ? '庄家' : '闲家'}</span>
                      <span>·</span>
                      <span className="text-amber-200">{p.handName}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Score Delta & Beans */}
                <div className="flex flex-col items-end">
                  <span
                    className={`font-mono text-sm sm:text-base font-black ${
                      p.scoreDelta > 0
                        ? 'text-amber-400'
                        : p.scoreDelta < 0
                        ? 'text-red-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {p.scoreDelta > 0 ? `+${p.scoreDelta}` : p.scoreDelta}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    结余: {p.balance}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/40 px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(640);
              onLeaveRoom();
            }}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white/80 active:scale-95 cursor-pointer hover:bg-white/20"
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
            className="rounded-full border-2 border-amber-300 bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-1.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/30 active:scale-95 cursor-pointer hover:brightness-110"
          >
            再来一局 ({countdown}s)
          </button>
        </div>
      </div>
    </div>
  );
};
