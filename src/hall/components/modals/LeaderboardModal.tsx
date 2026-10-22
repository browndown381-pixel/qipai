import React from 'react';
import { Trophy, X } from 'lucide-react';
import { AvatarSvg } from '../../../shared/ui/AvatarSvg';
import type { UserProfile } from '../../HallView';

export interface LeaderboardModalProps {
  leaderboard: UserProfile[];
  myProfile: UserProfile | null;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  leaderboard,
  myProfile,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[82vh] w-full max-w-lg flex-col rounded-2xl border border-amber-500/30 bg-[#162032] p-5 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 text-amber-400">
          <Trophy className="h-6 w-6" />
          <h3 className="text-lg font-black">富豪风云榜</h3>
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {leaderboard.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">暂无榜单数据</div>
          ) : (
            leaderboard.map((item, idx) => {
              const isMe = myProfile?.playerId === item.playerId;
              return (
                <div
                  key={item.playerId}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${
                    isMe ? 'border-amber-400/50 bg-amber-500/15' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-black text-amber-300">
                      #{idx + 1}
                    </span>
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-white/20">
                      <AvatarSvg avatarId={item.avatarId} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{item.nickname}</div>
                      <div className="text-[11px] text-slate-400">
                        胜率{' '}
                        {item.gamesPlayed > 0
                          ? Math.round((item.gamesWon / item.gamesPlayed) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-amber-300">
                      {item.beans.toLocaleString()} 豆
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
