import React, { useState } from 'react';
import { soundEngine } from '../../shared/audio/SoundEngine';
import { hapticEngine } from '../../shared/haptics/HapticEngine';

export type MahjongPlayMode = 'hongzhong' | 'tuidaohu' | 'xuezhan' | 'puer';

export interface MahjongTierConfig {
  id: string;
  title: string;
  baseScore: number;
  minBeans: number;
  capLabel: string;
  onlineBase: number;
  emblemIcon: string;
  theme: {
    cardGradient: string;
    borderColor: string;
    titleStroke: string;
    titleShadow: string;
  };
}

export const MAHJONG_PLAY_MODES: Array<{
  id: MahjongPlayMode;
  label: string;
  onlineFactor: number;
}> = [
  {
    id: 'puer',
    label: '普洱麻将',
    onlineFactor: 1.15,
  },
  {
    id: 'hongzhong',
    label: '红中血流',
    onlineFactor: 1.3,
  },
  {
    id: 'xuezhan',
    label: '血战到底',
    onlineFactor: 1.1,
  },
  {
    id: 'tuidaohu',
    label: '推倒胡',
    onlineFactor: 0.95,
  },
];

export const MAHJONG_TIER_CONFIGS: MahjongTierConfig[] = [
  {
    id: 'mj_rookie',
    title: '新手场',
    baseScore: 100,
    minBeans: 1000,
    capLabel: '32番封顶',
    onlineBase: 3120,
    emblemIcon: '/assets/ui/icon_1.png',
    theme: {
      cardGradient: 'from-[#34c395] to-[#167a57]',
      borderColor: 'border-[#7ce8c3]/80',
      titleStroke: '#105c40',
      titleShadow: '#073624',
    },
  },
  {
    id: 'mj_primary',
    title: '初级场',
    baseScore: 500,
    minBeans: 10000,
    capLabel: '64番封顶',
    onlineBase: 4580,
    emblemIcon: '/assets/ui/icon_2.png',
    theme: {
      cardGradient: 'from-[#4f86f7] to-[#2347b8]',
      borderColor: 'border-[#9ec0ff]/80',
      titleStroke: '#1b358f',
      titleShadow: '#0e1d54',
    },
  },
  {
    id: 'mj_middle',
    title: '中级场',
    baseScore: 2000,
    minBeans: 50000,
    capLabel: '128番封顶',
    onlineBase: 3340,
    emblemIcon: '/assets/ui/icon_3.png',
    theme: {
      cardGradient: 'from-[#9b6bf2] to-[#5e2ca5]',
      borderColor: 'border-[#dec4ff]/80',
      titleStroke: '#481d85',
      titleShadow: '#280d4f',
    },
  },
  {
    id: 'mj_high',
    title: '至尊场',
    baseScore: 10000,
    minBeans: 200000,
    capLabel: '不设封顶',
    onlineBase: 2190,
    emblemIcon: '/assets/ui/icon_cs.png',
    theme: {
      cardGradient: 'from-[#f47b4b] via-[#dc4726] to-[#991b1b]',
      borderColor: 'border-[#ffc299]/80',
      titleStroke: '#7f1d09',
      titleShadow: '#450a03',
    },
  },
];

export interface MahjongArenaGridProps {
  myBeans: number;
  onSelectTier: (baseScore: number, mode?: MahjongPlayMode) => void;
  onQuickStart?: (baseScore?: number, mode?: MahjongPlayMode) => void;
  onInsufficientBeans?: (tier: MahjongTierConfig) => void;
  isMobileLandscape?: boolean;
}

export const MahjongArenaGrid: React.FC<MahjongArenaGridProps> = ({
  myBeans,
  onSelectTier,
  onInsufficientBeans,
}) => {
  const [activeMode, setActiveMode] = useState<MahjongPlayMode>('puer');
  const activeModeMeta =
    MAHJONG_PLAY_MODES.find((m) => m.id === activeMode) ?? MAHJONG_PLAY_MODES[0];

  const handleCardClick = (tier: MahjongTierConfig) => {
    soundEngine.playCardPlace(true);
    hapticEngine.playCard();

    if (myBeans < tier.minBeans) {
      onInsufficientBeans?.(tier);
      return;
    }

    onSelectTier(tier.baseScore, activeMode);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-between overflow-hidden select-none px-1 py-1 sm:py-2">
      {/* 1. CLEAN COMMERCIAL 4-MODE SWITCHER BAR */}
      <div className="mx-auto grid w-full max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px] shrink-0 grid-cols-4 gap-1.5 rounded-2xl border border-amber-200/25 bg-[#1e120a]/80 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-md sm:gap-2 sm:p-1.5 landscape:max-w-4xl">
        {MAHJONG_PLAY_MODES.map((m) => {
          const active = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                soundEngine.playTap(750);
                hapticEngine.tap();
                setActiveMode(m.id);
              }}
              className={`relative flex h-8.5 items-center justify-center rounded-xl px-2 transition-all duration-150 active:scale-[0.98] sm:h-10 cursor-pointer ${
                active
                  ? 'border border-amber-200 bg-gradient-to-b from-[#ffe48a] via-[#f59e0b] to-[#d97706] text-[#1f0c04] shadow-[0_2px_10px_rgba(245,158,11,0.4)]'
                  : 'border border-transparent bg-white/[0.06] text-amber-100/85 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              <span className="font-display text-xs font-black tracking-wide whitespace-nowrap sm:text-sm">
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. 4 CLEAN COMMERCIAL ARENA CARDS */}
      <div
        className="
          mx-auto my-auto grid min-h-0 w-full
          max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px]
          max-h-[min(100%,640px)] aspect-[3/3.75]
          grid-cols-2 grid-rows-2
          gap-2.5 sm:gap-3.5
          landscape:max-w-4xl landscape:max-h-[350px] landscape:aspect-[16/7.0] landscape:grid-cols-4 landscape:grid-rows-1
        "
      >
        {MAHJONG_TIER_CONFIGS.map((tier) => {
          const canAfford = myBeans >= tier.minBeans;
          const dynamicOnline = Math.round(
            tier.onlineBase * activeModeMeta.onlineFactor
          );

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => handleCardClick(tier)}
              className={`
                group relative flex h-full min-h-0 w-full cursor-pointer flex-col items-center justify-between
                overflow-hidden rounded-[22px] sm:rounded-[26px] border-2 ${tier.theme.borderColor}
                bg-gradient-to-b ${tier.theme.cardGradient}
                px-3 pt-2.5 pb-3 text-center
                shadow-[0_10px_22px_rgba(25,12,4,0.32),inset_0_1.5px_1px_rgba(255,255,255,0.45)]
                transition-all duration-150 active:scale-[0.98] [@media(hover:hover)]:hover:brightness-105
                ${canAfford ? '' : 'opacity-85'}
              `}
            >
              {/* Soft Top Specular Highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.22),transparent_70%)]" />

              {/* Top-Right Compact Online Counter */}
              <div className="relative z-20 flex w-full shrink-0 items-center justify-end">
                <div className="flex items-center gap-1 rounded-full bg-black/22 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white/95 backdrop-blur-xs">
                  <img
                    src="/assets/ui/icon_online.png"
                    alt="在线"
                    className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain brightness-0 invert opacity-95"
                  />
                  <span className="font-mono tabular-nums">
                    {dynamicOnline.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Center Stage: Single Clean 3D Emblem + 3D Title + Clean Unboxed Base Score */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-1.5 py-0.5">
                <div className="relative flex h-13 w-16 sm:h-16 sm:w-20 landscape:h-12 landscape:w-16 items-center justify-center transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-106 pointer-events-none">
                  <img
                    src={tier.emblemIcon}
                    alt=""
                    className="h-full w-auto object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]"
                    draggable={false}
                  />
                </div>

                <h3
                  className="font-display text-[clamp(1.25rem,4vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,2.6vw,1.5rem)]"
                  style={{
                    textShadow: `0 1.5px 0 ${tier.theme.titleStroke}, 0 -1px 0 ${tier.theme.titleStroke}, 1.5px 0 0 ${tier.theme.titleStroke}, -1.5px 0 0 ${tier.theme.titleStroke}, 0 3px 0 ${tier.theme.titleShadow}, 0 4px 8px rgba(0,0,0,0.4)`,
                  }}
                >
                  {tier.title}
                </h3>

                <div className="font-mono text-xs sm:text-sm font-extrabold text-white/95 drop-shadow-xs tabular-nums whitespace-nowrap">
                  底分 {tier.baseScore.toLocaleString()}
                </div>
              </div>

              {/* Bottom Clean Unboxed Entry Beans Line */}
              <div className="relative z-20 flex w-full shrink-0 items-center justify-center gap-1 border-t border-white/20 pt-2 font-mono text-xs sm:text-sm font-extrabold">
                <img
                  src="/assets/ui/icon_douzi.png"
                  alt="豆"
                  className="h-3.5 w-3.5 shrink-0 object-contain drop-shadow"
                />
                <span
                  className={`tabular-nums whitespace-nowrap ${
                    canAfford ? 'text-amber-200' : 'text-rose-200'
                  }`}
                >
                  {canAfford
                    ? `${tier.minBeans.toLocaleString()} 豆准入`
                    : `需 ${tier.minBeans.toLocaleString()} 豆`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
