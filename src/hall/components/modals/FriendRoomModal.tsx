import React, { useState } from 'react';
import { DoorOpen, Sparkles, Users, X } from 'lucide-react';
import { DealMode } from '../../../games/ddz/types';

export interface FriendRoomModalProps {
  onClose: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (
    baseScore: number,
    isPrivate: boolean,
    autoFillBots: boolean,
    mode?: DealMode
  ) => void;
  initialMode?: DealMode;
  initialBaseScore?: number;
}

export const FriendRoomModal: React.FC<FriendRoomModalProps> = ({
  onClose,
  onJoinRoom,
  onCreateRoom,
  initialMode = 'classic',
  initialBaseScore = 100,
}) => {
  const [roomInput, setRoomInput] = useState('');
  const [mode, setMode] = useState<DealMode>(initialMode);
  const [baseScore, setBaseScore] = useState<number>(initialBaseScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#162032] p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 text-amber-400">
          <Users className="h-6 w-6" />
          <h3 className="text-lg font-black">好友房约局</h3>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-black/30 p-4 border border-white/10">
            <label className="block text-xs font-bold text-slate-300 mb-2">输入房间号加入</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.trim())}
                placeholder="例如: 8888"
                className="flex-1 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (roomInput) {
                    onJoinRoom(roomInput);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400"
              >
                <DoorOpen className="h-4 w-4" />
                <span>加入</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-black/30 p-4 border border-white/10">
            <div className="text-xs font-bold text-slate-300 mb-3">创建私人房间</div>
            <div className="flex gap-2 mb-3">
              {(['classic', 'no_shuffle', 'tiandi_laizi'] as DealMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                    mode === m ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {m === 'classic' ? '经典' : m === 'no_shuffle' ? '不洗牌' : '天地癞子'}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              {[100, 500, 2000].map((bs) => (
                <button
                  key={bs}
                  onClick={() => setBaseScore(bs)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                    baseScore === bs ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  底分 {bs}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                onCreateRoom(baseScore, true, true, mode);
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-black text-slate-950 shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>立即创建房间</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
