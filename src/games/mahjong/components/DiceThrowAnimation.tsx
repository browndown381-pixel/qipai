import React, { useEffect, useState } from 'react';
import { soundEngine } from '../../../shared/audio/SoundEngine';

export interface DiceThrowAnimationProps {
  diceValues: [number, number];
  dealerSeatId: number;
  mySeatId: number;
  onFinish?: () => void;
}

const DIE_DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],
  6: [
    [28, 22],
    [72, 22],
    [28, 50],
    [72, 50],
    [28, 78],
    [72, 78],
  ],
};

const DieFace: React.FC<{ value: number }> = ({ value }) => {
  const dots = DIE_DOT_POSITIONS[value] || DIE_DOT_POSITIONS[1];
  const isRed = value === 1 || value === 4;

  return (
    <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-white via-[#FDF8EE] to-[#EAE0D0] shadow-[0_8px_20px_rgba(0,0,0,0.65),inset_0_2px_4px_rgba(255,255,255,0.9)]">
      {dots.map(([top, left], i) => {
        const dotColor =
          value === 1 ? 'bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.8)]' : isRed ? 'bg-red-600' : 'bg-slate-900';
        const dotSize = value === 1 ? 'h-4 w-4' : 'h-2.5 w-2.5 sm:h-3 sm:w-3';

        return (
          <div
            key={i}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${dotColor} ${dotSize}`}
            style={{ top: `${top}%`, left: `${left}%` }}
          />
        );
      })}
    </div>
  );
};

export const DiceThrowAnimation: React.FC<DiceThrowAnimationProps> = ({
  diceValues,
  dealerSeatId,
  mySeatId,
  onFinish,
}) => {
  const [rolling, setRolling] = useState(true);
  const total = diceValues[0] + diceValues[1];

  // 顺时针/逆时针起牌方位计算 (以庄家为1数起)
  const targetSeat = (dealerSeatId + total - 1) % 4;
  const seatNames = ['自家', '下家', '对家', '上家'];
  const relTargetSeat = (targetSeat - mySeatId + 4) % 4;
  const startPositionName = seatNames[relTargetSeat] || '本家';

  useEffect(() => {
    soundEngine.playDiceRoll();
    const rollTimer = setTimeout(() => {
      setRolling(false);
    }, 900);

    const finishTimer = setTimeout(() => {
      onFinish?.();
    }, 2200);

    return () => {
      clearTimeout(rollTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none cursor-pointer animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col items-center">
        {/* Dice Cup / Rolling Plate */}
        <div className="relative flex h-40 w-40 sm:h-48 sm:w-48 items-center justify-center rounded-full border-4 border-amber-400/70 bg-gradient-to-b from-[#1E392A] via-[#10241A] to-[#0A1610] p-4 shadow-[0_0_50px_rgba(251,191,36,0.35),inset_0_4px_16px_rgba(0,0,0,0.85)]">
          <div className="absolute inset-2 rounded-full border border-amber-300/30 border-dashed pointer-events-none" />

          {/* Dual Dice Container */}
          <div className="flex items-center gap-4 sm:gap-6 z-10">
            <div
              className={`transition-transform duration-700 ${
                rolling
                  ? 'animate-spin scale-110 drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)]'
                  : 'scale-100 rotate-6 drop-shadow-md'
              }`}
            >
              <DieFace value={rolling ? Math.floor(Math.random() * 6) + 1 : diceValues[0]} />
            </div>

            <div
              className={`transition-transform duration-700 ${
                rolling
                  ? 'animate-spin scale-110 drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)]'
                  : 'scale-100 -rotate-12 drop-shadow-md'
              }`}
            >
              <DieFace value={rolling ? Math.floor(Math.random() * 6) + 1 : diceValues[1]} />
            </div>
          </div>
        </div>

        {/* Dice Result Banner */}
        <div
          className={`mt-4 flex flex-col items-center transition-all duration-300 ${
            rolling ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex items-center gap-2 rounded-full border-2 border-amber-400 bg-gradient-to-r from-red-800 via-amber-700 to-red-800 px-6 py-1.5 shadow-[0_4px_20px_rgba(251,191,36,0.6)]">
            <span className="font-display text-sm sm:text-base font-black text-amber-200">
              庄家掷骰: {diceValues[0]} + {diceValues[1]} = {total} 点
            </span>
            <span className="rounded-md bg-amber-400 px-2 py-0.5 font-display text-xs font-black text-black">
              从 {startPositionName} 摸起
            </span>
          </div>
          <span className="mt-1 text-[11px] font-medium text-white/60">点击可快速跳过</span>
        </div>
      </div>
    </div>
  );
};
