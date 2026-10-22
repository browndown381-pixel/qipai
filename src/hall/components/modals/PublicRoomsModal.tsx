import React from 'react';
import { LayoutGrid, Plus, RefreshCw, X } from 'lucide-react';
import type { RoomSummary } from '../../HallView';

export interface PublicRoomsModalProps {
  rooms: RoomSummary[];
  onClose: () => void;
  onRefresh: () => void;
  onOpenFriendRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export const PublicRoomsModal: React.FC<PublicRoomsModalProps> = ({
  rooms,
  onClose,
  onRefresh,
  onOpenFriendRoom,
  onJoinRoom,
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

        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-2 text-amber-400">
            <LayoutGrid className="h-6 w-6" />
            <h3 className="text-lg font-black">公开房间列表</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/15"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>刷新</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenFriendRoom();
              }}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-slate-950"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>建房</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {rooms.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">当前暂无公开等待中的房间</div>
          ) : (
            rooms.map((r) => (
              <div
                key={r.roomId}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5"
              >
                <div>
                  <div className="text-sm font-bold text-white">房间 #{r.roomId}</div>
                  <div className="text-xs text-slate-400">
                    底分 {r.baseScore} · 人数 {r.playerCount}/{r.maxPlayers}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onJoinRoom(r.roomId);
                    onClose();
                  }}
                  className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-400"
                >
                  加入
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
