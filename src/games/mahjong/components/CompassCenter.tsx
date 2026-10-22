import React, { useEffect, useState } from 'react';

export interface CompassCenterProps {
  currentTurnSeatId: number; // 0=me, 1=right, 2=top, 3=left
  remainWallCount: number;
  baseScore: number;
}

export const CompassCenter: React.FC<CompassCenterProps> = ({
  currentTurnSeatId,
  remainWallCount,
  baseScore,
}) => {
  const [countdown, setCountdown] = useState<number>(15);

  useEffect(() => {
    setCountdown(15);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurnSeatId]);

  const tensDigit = Math.floor(Math.max(0, countdown) / 10) % 10;
  const onesDigit = Math.max(0, countdown) % 10;
  const pointerIdx = Math.max(0, Math.min(3, currentTurnSeatId));

  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none">
      {/* 1. Large Square Dragon Watermark Tablecloth Texture (Cocos bg_center.png, 507x506) */}
      <img
        src="/assets/mahjong/ui/bg_center.png"
        alt="Center Dragon Mat"
        className="pointer-events-none h-[170px] w-[170px] object-contain opacity-55 drop-shadow-[0_6px_16px_rgba(0,0,0,0.8)]"
        draggable={false}
      />

      {/* 2. Direction Beam Indicators (time0..time3) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {pointerIdx === 0 && (
          <img
            src="/assets/mahjong/ui/time0.png"
            alt="South Indicator"
            className="absolute -bottom-5 h-12 w-auto object-contain animate-pulse drop-shadow-[0_4px_10px_rgba(251,191,36,0.7)]"
            draggable={false}
          />
        )}
        {pointerIdx === 1 && (
          <img
            src="/assets/mahjong/ui/time1.png"
            alt="East Indicator"
            className="absolute -right-5 w-12 h-auto object-contain animate-pulse drop-shadow-[0_4px_10px_rgba(251,191,36,0.7)]"
            draggable={false}
          />
        )}
        {pointerIdx === 2 && (
          <img
            src="/assets/mahjong/ui/time2.png"
            alt="North Indicator"
            className="absolute -top-5 h-12 w-auto object-contain animate-pulse drop-shadow-[0_4px_10px_rgba(251,191,36,0.7)]"
            draggable={false}
          />
        )}
        {pointerIdx === 3 && (
          <img
            src="/assets/mahjong/ui/time3.png"
            alt="West Indicator"
            className="absolute -left-5 w-12 h-auto object-contain animate-pulse drop-shadow-[0_4px_10px_rgba(251,191,36,0.7)]"
            draggable={false}
          />
        )}
      </div>

      {/* 3. Authentic Beveled Square Digital Timer Box (time_bg.png, 132x131) with Radial Progress Ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex h-[82px] w-[82px] items-center justify-center">
          {/* SVG Countdown Depletion Ring */}
          <svg className="absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] -rotate-90 pointer-events-none z-0" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="4"
            />
            {/* Depleting Active Progress Bar */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={countdown <= 3 ? '#ef4444' : countdown <= 6 ? '#f97316' : '#fbbf24'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 * (1 - Math.max(0, countdown) / 15)}
              style={{
                transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease',
                filter: countdown <= 3 ? 'drop-shadow(0 0 8px rgba(239,68,68,0.9))' : 'drop-shadow(0 0 5px rgba(251,191,36,0.6))',
              }}
            />
          </svg>

          <img
            src="/assets/mahjong/ui/time_bg.png"
            alt="Timer Box"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] z-1"
            draggable={false}
          />

          {/* 7-Segment Digital Countdown Display */}
          <div className="relative z-10 flex items-center justify-center gap-0.5">
            <img
              src={`/assets/mahjong/ui/timer_${tensDigit}.png`}
              alt={String(tensDigit)}
              className="h-5 w-auto object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              draggable={false}
            />
            <img
              src={`/assets/mahjong/ui/timer_${onesDigit}.png`}
              alt={String(onesDigit)}
              className="h-5 w-auto object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* 4. Remaining Tiles Pill (b1.png, 161x41) directly to the right */}
      <div className="absolute left-[calc(50%+46px)] top-1/2 -translate-y-1/2 z-20 flex items-center">
        <div className="relative flex h-6 w-20 items-center justify-center">
          <img
            src="/assets/mahjong/ui/b1.png"
            alt="剩余牌数"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-md"
            draggable={false}
          />
          <div className="relative z-10 flex items-center justify-center pl-1.5">
            <span className="font-mono text-xs font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] tabular-nums">
              {remainWallCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
