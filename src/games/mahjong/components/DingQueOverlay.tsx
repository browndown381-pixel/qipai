import React, { useEffect, useState } from 'react';
import { MahjongSuit } from '../types';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

export interface DingQueOverlayProps {
  recommendedSuit: MahjongSuit;
  onSelectSuit: (suit: MahjongSuit) => void;
}

export const DingQueOverlay: React.FC<DingQueOverlayProps> = ({
  recommendedSuit,
  onSelectSuit,
}) => {
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSelectSuit(recommendedSuit);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [recommendedSuit, onSelectSuit]);

  const suits: Array<{ id: MahjongSuit; name: string; icon: string; color: string }> = [
    { id: 0, name: '定缺 · 万', icon: '/assets/mahjong/ui/dk_mjp_2.png', color: 'from-rose-500 to-red-700' },
    { id: 1, name: '定缺 · 条', icon: '/assets/mahjong/ui/dk_mjp_1.png', color: 'from-emerald-500 to-teal-700' },
    { id: 2, name: '定缺 · 筒', icon: '/assets/mahjong/ui/dk_mjp_3.png', color: 'from-blue-500 to-indigo-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-[#2a170e] to-[#120804] p-5 text-center text-white shadow-2xl">
        <h3 className="font-display text-lg font-black text-amber-200 sm:text-xl">
          请选择定缺门类
        </h3>
        <p className="mt-1 text-xs text-white/60">
          四川血流麻将规则：必须先打光定缺花色，方可胡牌 ({countdown}s)
        </p>

        {/* 3 Suit buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 w-full">
          {suits.map((s) => {
            const isRec = s.id === recommendedSuit;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  soundEngine.playTap(760);
                  hapticEngine.tap();
                  onSelectSuit(s.id);
                }}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition-transform active:scale-95 ${
                  isRec
                    ? 'border-amber-300 bg-gradient-to-b from-amber-400/20 to-orange-500/20 shadow-[0_0_16px_rgba(251,191,36,0.4)] scale-105'
                    : 'border-white/10 bg-black/40 hover:border-white/20'
                }`}
              >
                {isRec && (
                  <span className="absolute -top-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.2 text-[9px] font-black text-black shadow">
                    推荐
                  </span>
                )}
                <img
                  src={s.icon}
                  alt={s.name}
                  className="h-10 w-10 object-contain drop-shadow"
                />
                <span className="mt-1.5 font-display text-xs font-black text-white">
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
