import React, { useMemo, useState } from 'react';
import { soundEngine } from '../../shared/audio/SoundEngine';
import { hapticEngine } from '../../shared/haptics/HapticEngine';
import { QuickStartFab } from './QuickStartFab';
import { NiuniuTierConfig } from '../../games/niuniu/types';

export type NiuniuArenaMode = 'qiangzhuang' | 'tongbi' | 'crazy';

export const NIUNIU_MODES: Array<{
  id: NiuniuArenaMode;
  label: string;
  cornerTag?: string;
  onlineFactor: number;
}> = [
  {
    id: 'qiangzhuang',
    label: '抢庄牛牛',
    cornerTag: '热门',
    onlineFactor: 1.25,
  },
  {
    id: 'tongbi',
    label: '通比牛牛',
    cornerTag: '休闲',
    onlineFactor: 0.95,
  },
  {
    id: 'crazy',
    label: '疯狂加倍',
    cornerTag: '刺激',
    onlineFactor: 1.4,
  },
];

export const NIUNIU_TIERS: NiuniuTierConfig[] = [
  {
    id: 'nn_rookie',
    title: '初级体验场',
    baseScore: 100,
    minBeans: 1000,
    capLabel: '40倍封顶',
    onlineBase: 3840,
    theme: {
      bgGradient: 'from-[#6e1e19] via-[#4d1310] to-[#2e0907]',
      borderColor: 'border-[#f87171]/50',
      glowColor: 'bg-red-500/20',
      titleColor: '#ffe4e6',
      titleShadow: '#4c0519',
      pillBg: 'bg-[#5f130e]/85',
      ribbonBg: 'from-[#ef4444] to-[#b91c1c]',
    },
  },
  {
    id: 'nn_primary',
    title: '中级进阶场',
    baseScore: 500,
    minBeans: 10000,
    capLabel: '60倍封顶',
    onlineBase: 5620,
    theme: {
      bgGradient: 'from-[#1e3a8a] via-[#172554] to-[#0f172a]',
      borderColor: 'border-[#60a5fa]/50',
      glowColor: 'bg-blue-500/20',
      titleColor: '#dbeafe',
      titleShadow: '#1e3a8a',
      pillBg: 'bg-[#1e40af]/85',
      ribbonBg: 'from-[#3b82f6] to-[#1d4ed8]',
    },
  },
  {
    id: 'nn_advanced',
    title: '高级精英场',
    baseScore: 2000,
    minBeans: 50000,
    capLabel: '80倍封顶',
    onlineBase: 4210,
    theme: {
      bgGradient: 'from-[#581c87] via-[#3b0764] to-[#1e1b4b]',
      borderColor: 'border-[#c084fc]/50',
      glowColor: 'bg-purple-500/20',
      titleColor: '#f3e8ff',
      titleShadow: '#3b0764',
      pillBg: 'bg-[#6b21a8]/85',
      ribbonBg: 'from-[#a855f7] to-[#7e22ce]',
    },
  },
  {
    id: 'nn_master',
    title: '至尊牛王场',
    baseScore: 10000,
    minBeans: 200000,
    capLabel: '100倍封顶',
    onlineBase: 2890,
    theme: {
      bgGradient: 'from-[#78350f] via-[#451a03] to-[#1c1917]',
      borderColor: 'border-[#fbbf24]/60',
      glowColor: 'bg-amber-500/25',
      titleColor: '#fef3c7',
      titleShadow: '#451a03',
      pillBg: 'bg-[#92400e]/85',
      ribbonBg: 'from-[#f59e0b] to-[#b45309]',
    },
  },
];

export interface NiuniuArenaGridProps {
  myBeans: number;
  isMobileLandscape?: boolean;
  onSelectTier: (baseScore: number, mode: string) => void;
  onQuickStart: (baseScore?: number, mode?: string) => void;
  onInsufficientBeans: (tier: NiuniuTierConfig) => void;
}

export const NiuniuArenaGrid: React.FC<NiuniuArenaGridProps> = ({
  myBeans,
  isMobileLandscape = false,
  onSelectTier,
  onQuickStart,
  onInsufficientBeans,
}) => {
  const [activeMode, setActiveMode] = useState<NiuniuArenaMode>('qiangzhuang');

  const activeModeMeta = useMemo(() => {
    return NIUNIU_MODES.find((m) => m.id === activeMode) ?? NIUNIU_MODES[0];
  }, [activeMode]);

  const recommendedTier = useMemo(() => {
    return (
      [...NIUNIU_TIERS].reverse().find((t) => myBeans >= t.minBeans) ??
      NIUNIU_TIERS[0]
    );
  }, [myBeans]);

  const handleCardClick = (tier: NiuniuTierConfig) => {
    soundEngine.playTap(760);
    hapticEngine.tap();
    if (myBeans < tier.minBeans) {
      onInsufficientBeans(tier);
      return;
    }
    onSelectTier(tier.baseScore, activeMode);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-between overflow-hidden select-none px-1 py-1 sm:py-2">
      {/* ================= 1. Mode Switcher Tabs ================= */}
      <div className="mx-auto grid w-full max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px] shrink-0 grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#1f120e]/95 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)] sm:gap-2 sm:p-1.5 landscape:max-w-4xl">
        {NIUNIU_MODES.map((m) => {
          const active = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                soundEngine.playTap(780);
                hapticEngine.selectCard();
                setActiveMode(m.id);
              }}
              className={`relative flex h-8 items-center justify-center rounded-xl px-1.5 transition-all duration-150 active:scale-[0.98] sm:h-9.5 cursor-pointer ${
                active
                  ? 'border border-amber-300 bg-gradient-to-b from-[#ffd399] via-[#ea580c] to-[#9a3412] text-black shadow-[0_2px_10px_rgba(234,88,12,0.45)]'
                  : 'border border-transparent bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <span className="font-display text-xs font-black tracking-wide whitespace-nowrap sm:text-sm">
                {m.label}
              </span>

              {m.cornerTag && (
                <span
                  className={`pointer-events-none absolute -top-1.5 -right-1 hidden rounded-full px-1.5 py-0.2 text-[9px] leading-tight font-extrabold shadow sm:inline-block ${
                    active
                      ? 'bg-[#7c1d12] text-amber-100'
                      : 'bg-gradient-to-r from-red-600 to-amber-600 text-white'
                  }`}
                >
                  {m.cornerTag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= 2. 4-Tier Arena Cards ================= */}
      <div className="mx-auto grid w-full my-auto min-h-0 max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px] max-h-[min(100%,640px)] aspect-[3/3.8] grid-cols-2 grid-rows-2 gap-2 sm:gap-2.5 md:gap-3 landscape:max-w-4xl landscape:max-h-[350px] landscape:aspect-[16/7.2] landscape:grid-cols-4 landscape:grid-rows-1">
        {NIUNIU_TIERS.map((tier) => {
          const canAfford = myBeans >= tier.minBeans;
          const isRecommended = recommendedTier.id === tier.id && canAfford;
          const dynamicOnline = Math.round(
            tier.onlineBase * activeModeMeta.onlineFactor
          );

          return (
            <div
              key={tier.id}
              onClick={() => handleCardClick(tier)}
              className={`
                group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border-2 p-2.5 sm:p-3 shadow-xl transition-all duration-200 cursor-pointer active:scale-95
                bg-gradient-to-b ${tier.theme.bgGradient} ${tier.theme.borderColor}
                ${isRecommended ? 'ring-2 sm:ring-4 ring-amber-400 scale-[1.02] shadow-amber-500/40' : ''}
                ${!canAfford ? 'opacity-85' : 'hover:brightness-105'}
              `}
            >
              {/* Background Glow */}
              <div
                className={`pointer-events-none absolute inset-0 ${tier.theme.glowColor} blur-xl`}
              />

              {/* Recommended Badge */}
              {isRecommended && (
                <div className="absolute top-0 right-0 z-20 overflow-hidden rounded-bl-xl rounded-tr-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-black shadow-md">
                  推荐
                </div>
              )}

              {/* Top: Title & Cap Label */}
              <div className="relative z-10 flex flex-col">
                <span
                  className="font-display text-sm sm:text-base md:text-lg font-black tracking-wide"
                  style={{
                    color: tier.theme.titleColor,
                    textShadow: `0 2px 4px ${tier.theme.titleShadow}`,
                  }}
                >
                  {tier.title}
                </span>
                <span className="text-[10px] sm:text-xs text-white/70">
                  {tier.capLabel}
                </span>
              </div>

              {/* Middle: Decorative Poker / Bull Graphics */}
              <div className="relative z-10 my-auto flex items-center justify-center py-1">
                <div className="flex items-center -space-x-3 sm:-space-x-4">
                  <div className="h-10 w-7 sm:h-12 sm:w-8.5 rounded-sm bg-gradient-to-br from-white to-neutral-200 shadow-md border border-neutral-300 flex items-center justify-center text-[10px] sm:text-xs font-black text-red-600 -rotate-12">
                    K
                  </div>
                  <div className="h-11 w-7.5 sm:h-13 sm:w-9.5 rounded-sm bg-gradient-to-br from-white to-neutral-200 shadow-lg border border-neutral-300 flex items-center justify-center text-[10px] sm:text-xs font-black text-black z-10">
                    10
                  </div>
                  <div className="h-10 w-7 sm:h-12 sm:w-8.5 rounded-sm bg-gradient-to-br from-white to-neutral-200 shadow-md border border-neutral-300 flex items-center justify-center text-[10px] sm:text-xs font-black text-red-600 rotate-12">
                    A
                  </div>
                </div>
              </div>

              {/* Bottom: Base Score, Entry Requirement, Online */}
              <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="text-amber-200 font-bold">
                    底分: {tier.baseScore}
                  </span>
                  <span className="font-mono text-white/50 text-[9px] sm:text-[10px]">
                    {dynamicOnline} 在线
                  </span>
                </div>

                <div
                  className={`flex items-center justify-center rounded-lg py-1 px-1.5 text-center text-[10px] sm:text-xs font-bold border ${
                    canAfford
                      ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                      : 'border-red-400/50 bg-red-900/30 text-red-200'
                  }`}
                >
                  {canAfford ? `准入: ${tier.minBeans}豆` : `需 ${tier.minBeans}豆`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= 3. Floating Quick Start Button ================= */}
      <div
        className="absolute z-30 sm:bottom-3 sm:right-3"
        style={{
          bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
          right: 'max(0.6rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <QuickStartFab
          onQuickStart={() => onQuickStart(recommendedTier.baseScore, activeMode)}
          recommendedScore={recommendedTier.baseScore}
        />
      </div>
    </div>
  );
};
