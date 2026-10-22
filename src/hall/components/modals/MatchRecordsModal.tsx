import React from 'react';
import { Film, X } from 'lucide-react';
import { MatchRecord } from '../../HallView';

export interface MatchRecordsModalProps {
  matches: MatchRecord[];
  myPlayerId?: string;
  loadingReplayId: string | null;
  onClose: () => void;
  onOpenReplay: (match: MatchRecord) => void;
}

const modeShortLabel = (mode?: string) => {
  if (mode === 'tiandi_laizi') return '癞子玩法';
  if (mode === 'laizi') return '经典癞子';
  if (mode === 'no_shuffle') return '不洗牌';
  if (mode === 'swap_three') return '换三张';
  return '经典模式';
};

export const MatchRecordsModal: React.FC<MatchRecordsModalProps> = ({
  matches,
  myPlayerId,
  loadingReplayId,
  onClose,
  onOpenReplay,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#232838] to-[#171a24] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-sky-400" />
            <h3 className="font-display text-base font-extrabold text-amber-200 sm:text-lg">
              近期战绩与三家明牌复盘
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4">
          {matches.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/60 sm:text-sm">
              暂无对局记录，完成一局斗地主后即可在此处回看三家明牌复盘！
            </p>
          ) : (
            <div className="space-y-2.5">
              {matches.map((m) => {
                const myEntry = m.players.find((p: { playerId: string; scoreDelta: number }) => p.playerId === myPlayerId);
                const delta = myEntry?.scoreDelta ?? 0;

                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/8 bg-[#12151f] px-3.5 py-2.5 transition-colors hover:border-white/15"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                          {modeShortLabel(m.dealMode)}
                        </span>
                        <span className="font-mono text-xs text-white/80 tabular-nums">
                          底分 {m.baseScore} · ×{m.multiplier}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-white/50">
                        {new Date(m.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-mono text-xs font-extrabold tabular-nums sm:text-sm ${
                          delta >= 0 ? 'text-amber-300' : 'text-rose-400'
                        }`}
                      >
                        {delta >= 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} 豆
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenReplay(m)}
                        disabled={loadingReplayId === m.id}
                        className="flex items-center gap-1 rounded-xl border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/30 active:scale-95 disabled:opacity-50"
                      >
                        <Film className="h-3 w-3" />
                        <span>{loadingReplayId === m.id ? '加载中' : '明牌复盘'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
