import React from 'react';
import { Film, History, X } from 'lucide-react';
import type { MatchRecord } from '../../HallView';

export interface MatchRecordsModalProps {
  matches: MatchRecord[];
  myPlayerId?: string;
  loadingReplayId: string | null;
  onClose: () => void;
  onOpenReplay: (match: MatchRecord) => void;
}

export const MatchRecordsModal: React.FC<MatchRecordsModalProps> = ({
  matches,
  loadingReplayId,
  onClose,
  onOpenReplay,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[82vh] w-full max-w-lg flex-col rounded-2xl border border-white/15 bg-[#162032] p-5 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 text-amber-400">
          <History className="h-6 w-6" />
          <h3 className="text-lg font-black">历史战绩与牌谱回放</h3>
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {matches.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">暂无近期战绩记录</div>
          ) : (
            matches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5"
              >
                <div>
                  <div className="text-sm font-bold text-white">
                    房间 #{m.roomId} · 底分 {m.baseScore} · 倍数 x{m.multiplier}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(m.timestamp).toLocaleString()}
                  </div>
                </div>
                {m.gameType === 'ddz' && (
                  <button
                    onClick={() => onOpenReplay(m)}
                    disabled={loadingReplayId === m.id}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30"
                  >
                    <Film className="h-4 w-4" />
                    <span>{loadingReplayId === m.id ? '加载中...' : '回放'}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
