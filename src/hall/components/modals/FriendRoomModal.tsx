import React, { useEffect, useState } from 'react';
import { Delete, KeyRound, PlusCircle, X } from 'lucide-react';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

export type SupportedGameType = 'ddz' | 'mahjong' | 'niuniu' | 'zhajinhua' | 'laoyancai';

export interface FriendRoomModalProps {
  onClose: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (
    baseScore: number,
    isPrivate: boolean,
    autoFillBots: boolean,
    mode?: string,
    gameType?: SupportedGameType
  ) => void;
  initialGameType?: SupportedGameType;
  initialMode?: string;
  initialBaseScore?: number;
}

const GAME_OPTIONS: Array<{ id: SupportedGameType; label: string; seats: string }> = [
  { id: 'ddz', label: '斗地主', seats: '3人桌' },
  { id: 'mahjong', label: '国粹麻将', seats: '4人桌' },
  { id: 'niuniu', label: '抢庄牛牛', seats: '5人桌' },
  { id: 'zhajinhua', label: '诈金花', seats: '5人桌' },
  { id: 'laoyancai', label: '云南捞腌菜', seats: '5人桌' },
];

const GAME_MODES_MAP: Record<SupportedGameType, Array<{ id: string; label: string }>> = {
  ddz: [
    { id: 'classic', label: '经典叫抢' },
    { id: 'no_shuffle', label: '畅爽不洗牌' },
    { id: 'tiandi_laizi', label: '天地双癞子' },
  ],
  mahjong: [
    { id: 'puer', label: '云南普洱麻将' },
    { id: 'hongzhong', label: '红中赖子杠' },
    { id: 'xuezhan', label: '川麻血战到底' },
    { id: 'tuidaohu', label: '大众推倒胡' },
  ],
  niuniu: [
    { id: 'qiangzhuang', label: '看牌抢庄' },
    { id: 'crazy', label: '疯狂翻倍牛' },
    { id: 'tongbi', label: '通比牛牛' },
  ],
  zhajinhua: [
    { id: 'classic', label: '经典金花' },
    { id: 'bloody', label: '血拼15轮' },
    { id: 'quick', label: '极速8轮' },
  ],
  laoyancai: [
    { id: 'kunming', label: '昆明抢庄双腌' },
    { id: 'yuxi', label: '玉溪经典轮庄' },
    { id: 'crazy', label: '疯狂三公豹子' },
  ],
};

const AVAILABLE_BASE_SCORES = [100, 300, 800, 2000];

export const FriendRoomModal: React.FC<FriendRoomModalProps> = ({
  onClose,
  onJoinRoom,
  onCreateRoom,
  initialGameType = 'ddz',
  initialMode,
  initialBaseScore = 100,
}) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedGameType, setSelectedGameType] = useState<SupportedGameType>(initialGameType);
  const [selectedMode, setSelectedMode] = useState<string>(
    initialMode || GAME_MODES_MAP[initialGameType][0].id
  );
  const [selectedBaseScore, setSelectedBaseScore] = useState<number>(initialBaseScore);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [autoFillBots, setAutoFillBots] = useState<boolean>(true);

  useEffect(() => {
    const validModes = GAME_MODES_MAP[selectedGameType];
    if (!validModes.some((m) => m.id === selectedMode)) {
      setSelectedMode(validModes[0].id);
    }
  }, [selectedGameType, selectedMode]);

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
    onCreateRoom(selectedBaseScore, isPrivate, autoFillBots, selectedMode, selectedGameType);
  };

  const currentModes = GAME_MODES_MAP[selectedGameType];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#222737] to-[#141822] shadow-2xl"
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
                五游互通 · 好友同玩包厢
              </h3>
              <p className="text-[11px] text-white/55">
                输入 6 位房间号跨游戏秒进牌桌，或自选全 5 款游戏创建专属好友房
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body: Two columns in landscape / stacked in small view */}
        <div className="grid grid-cols-1 gap-3 overflow-y-auto p-3.5 sm:gap-4 sm:p-5 md:grid-cols-[0.9fr_1.1fr]">
          {/* SECTION 1: JOIN ROOM WITH VIRTUAL KEYPAD */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/35 p-3">
            <div>
              <span className="text-xs font-bold text-amber-200">房号直达（自动识别游戏）：</span>
              {/* Room Code Display Slot */}
              <div className="mt-1.5 flex h-10 w-full items-center justify-center rounded-xl border border-amber-400/40 bg-black/50 px-3 font-mono text-lg font-black tracking-widest text-amber-300 tabular-nums">
                {roomCode ? (
                  roomCode
                ) : (
                  <span className="font-sans text-xs font-normal tracking-normal text-white/30">
                    点击下方数字输入 6 位房号
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
                    className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-mono text-sm font-extrabold text-white shadow-xs hover:bg-amber-400/30 active:scale-95 tabular-nums cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-rose-950/60 font-sans text-xs font-bold text-rose-300 hover:bg-rose-900 active:scale-95 cursor-pointer"
                >
                  清空
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress('0')}
                  className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-mono text-sm font-extrabold text-white shadow-xs hover:bg-amber-400/30 active:scale-95 tabular-nums cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="flex h-8.5 items-center justify-center rounded-xl border border-white/10 bg-amber-950/60 text-amber-300 hover:bg-amber-900 active:scale-95 cursor-pointer"
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
              className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 font-display text-xs font-black shadow transition-all whitespace-nowrap ${
                roomCode.trim()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 cursor-pointer'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <span>立即加入该房间</span>
            </button>
          </div>

          {/* SECTION 2: CUSTOMIZE & CREATE ROOM ACROSS ALL 5 GAMES */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/35 p-3">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-amber-200">创建专属好友房：</span>

              {/* Game Category Picker */}
              <div>
                <span className="text-[11px] text-white/70">选择游戏品类：</span>
                <div className="mt-1 grid grid-cols-3 gap-1 sm:grid-cols-5">
                  {GAME_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playTap(740);
                        setSelectedGameType(g.id);
                      }}
                      className={`flex flex-col items-center justify-center rounded-lg py-1 px-1 text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        selectedGameType === g.id
                          ? 'border border-amber-300 bg-amber-500 text-[#18181B]'
                          : 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      <span>{g.label}</span>
                      <span
                        className={`text-[9px] font-normal ${
                          selectedGameType === g.id ? 'text-[#18181B]/75' : 'text-white/45'
                        }`}
                      >
                        {g.seats}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Mode Picker */}
              <div>
                <span className="text-[11px] text-white/70">特色规则模式：</span>
                <div
                  className={`mt-1 grid gap-1 ${
                    currentModes.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
                  }`}
                >
                  {currentModes.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playTap(760);
                        setSelectedMode(m.id);
                      }}
                      className={`rounded-lg py-1 px-1.5 text-[11px] font-bold transition-colors truncate cursor-pointer ${
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
                      onClick={() => {
                        soundEngine.playTap(720);
                        setSelectedBaseScore(s);
                      }}
                      className={`rounded-lg py-1 font-mono text-[11px] font-extrabold transition-colors tabular-nums cursor-pointer ${
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

              {/* Private & Bot Fill Options */}
              <div className="grid grid-cols-2 gap-1.5">
                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-white/5 px-2.5 py-1.5 text-[11px] text-white/85">
                  <span>私密包厢</span>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-amber-500"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-white/5 px-2.5 py-1.5 text-[11px] text-white/85">
                  <span>AI陪练补位</span>
                  <input
                    type="checkbox"
                    checked={autoFillBots}
                    onChange={(e) => setAutoFillBots(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-amber-500"
                  />
                </label>
              </div>

              <p className="text-[10px] text-white/50 leading-relaxed">
                * 创房消耗 1 张房卡，开启“AI陪练补位”时真人好友随时可通过房号进房替换机器人座位。
              </p>
            </div>

            {/* Create Room Button */}
            <button
              type="button"
              onClick={handleCreate}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500 py-2 font-display text-xs font-black text-[#18181B] shadow hover:brightness-105 active:scale-95 whitespace-nowrap cursor-pointer"
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
