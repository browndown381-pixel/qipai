import React, { useState } from 'react';
import { Delete, KeyRound, PlusCircle, RefreshCw, X } from 'lucide-react';
import { DealMode } from '../../../games/ddz/types';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

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

const AVAILABLE_MODES: Array<{ id: DealMode; label: string }> = [
  { id: 'classic', label: '经典玩法' },
  { id: 'no_shuffle', label: '不洗牌' },
  { id: 'tiandi_laizi', label: '天地癞子' },
];

const AVAILABLE_BASE_SCORES = [100, 300, 800, 2000];

export const FriendRoomModal: React.FC<FriendRoomModalProps> = ({
  onClose,
  onJoinRoom,
  onCreateRoom,
  initialMode = 'classic',
  initialBaseScore = 100,
}) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<DealMode>(initialMode);
  const [selectedBaseScore, setSelectedBaseScore] = useState<number>(initialBaseScore);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    soundEngine.playTap(750);
    hapticEngine.tap();
    if (roomCode.length < 8) {
      setRoomCode((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    soundEngine.playTap(600);
    hapticEngine.tap();
    setRoomCode((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    soundEngine.playTap(520);
    hapticEngine.tap();
    setRoomCode('');
  };

  const handleJoin = () => {
    if (roomCode.trim()) {
      soundEngine.playTap(820);
      hapticEngine.tap();
      onClose();
      onJoinRoom(roomCode.trim());
    }
  };

  const handleCreate = () => {
    soundEngine.playCardPlace(true);
    hapticEngine.playCard();
    onClose();
    onCreateRoom(selectedBaseScore, isPrivate, true, selectedMode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#222737] to-[#141822] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <KeyRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-display text-base font-extrabold text-white">
                好友同玩包厢
              </h3>
              <p className="text-[11px] text-white/55">
                输入房间号直接加入，或创建专属对战牌桌
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body: Two columns in landscape / stacked in small view */}
        <div className="grid grid-cols-1 gap-3 overflow-y-auto p-3.5 sm:gap-4 sm:p-5 md:grid-cols-2">
          {/* SECTION 1: JOIN ROOM WITH VIRTUAL KEYPAD */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/35 p-3">
            <div>
              <span className="text-xs font-bold text-amber-200">房号直达：</span>
              {/* Room Code Display Slot */}
              <div className="mt-1.5 flex h-10 w-full items-center justify-center rounded-xl border border-amber-400/40 bg-black/50 px-3 font-mono text-lg font-black tracking-widest text-amber-300">
                {roomCode ? (
                  roomCode
                ) : (
                  <span className="font-sans text-xs font-normal text-white/30">
                    点击下方数字输入房号
                  </span>
                )}
              </div>

              {/* Built-in Landscape Virtual Keypad (0~9, Backspace, Clear) */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeyPress(digit)}
                    className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-mono text-sm font-extrabold text-white shadow-xs hover:bg-amber-400/30 active:scale-95"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-rose-950/60 font-sans text-xs font-bold text-rose-300 hover:bg-rose-900 active:scale-95"
                >
                  清空
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress('0')}
                  className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-mono text-sm font-extrabold text-white shadow-xs hover:bg-amber-400/30 active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-amber-950/60 text-amber-300 hover:bg-amber-900 active:scale-95"
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Join Room Button */}
            <button
              type="button"
              disabled={!roomCode.trim()}
              onClick={handleJoin}
              className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 font-display text-xs font-black shadow transition-all ${
                roomCode.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <span>加入该房间</span>
            </button>
          </div>

          {/* SECTION 2: CUSTOMIZE & CREATE ROOM */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/35 p-3">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-amber-200">创建专属好友房：</span>

              {/* Mode Picker */}
              <div>
                <span className="text-[11px] text-white/70">玩法模式：</span>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {AVAILABLE_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMode(m.id)}
                      className={`rounded-lg py-1 px-1 text-[11px] font-bold transition-colors ${
                        selectedMode === m.id
                          ? 'border border-amber-300 bg-amber-500 text-[#18181B]'
                          : 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Base Score Picker */}
              <div>
                <span className="text-[11px] text-white/70">底分阶梯：</span>
                <div className="mt-1 grid grid-cols-4 gap-1">
                  {AVAILABLE_BASE_SCORES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedBaseScore(s)}
                      className={`rounded-lg py-1 font-mono text-[11px] font-extrabold transition-colors ${
                        selectedBaseScore === s
                          ? 'border border-amber-300 bg-amber-500 text-[#18181B]'
                          : 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Private Checkbox & Note */}
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs">
                <span className="text-white/80">仅持房号好友可进</span>
                <label className="flex cursor-pointer items-center gap-1.5 font-bold text-amber-300">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  <span>私密房间</span>
                </label>
              </div>

              <p className="text-[10px] text-white/50 leading-relaxed">
                * 创房每次消耗 1 张好友房卡，好友均可免费加入畅玩。
              </p>
            </div>

            {/* Create Room Button */}
            <button
              type="button"
              onClick={handleCreate}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500 py-2 font-display text-xs font-black text-[#18181B] shadow hover:brightness-105 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>立即创建好友房间</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
