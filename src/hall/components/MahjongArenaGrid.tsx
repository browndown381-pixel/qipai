import React, { useMemo, useState } from 'react';
import { soundEngine } from '../../shared/audio/SoundEngine';
import { hapticEngine } from '../../shared/haptics/HapticEngine';
import { QuickStartFab } from './QuickStartFab';

export type MahjongPlayMode = 'hongzhong' | 'tuidaohu' | 'xuezhan' | 'puer';

export interface MahjongTierConfig {
  id: string;
  title: string;
  baseScore: number;
  minBeans: number;
  capLabel: string;
  onlineBase: number;
  tiles: [string, string, string];
  tileAlts: [string, string, string];
  theme: {
    bgGradient: string;
    borderColor: string;
    glowColor: string;
    titleColor: string;
    titleShadow: string;
    pillBg: string;
    ribbonBg: string;
  };
}

export const MAHJONG_PLAY_MODES: Array<{
  id: MahjongPlayMode;
  label: string;
  cornerTag?: string;
}> = [
  {
    id: 'puer',
    label: '普洱麻将',
    cornerTag: '特色',
  },
  {
    id: 'hongzhong',
    label: '红中血流',
    cornerTag: '血流',
  },
  {
    id: 'xuezhan',
    label: '血战到底',
    cornerTag: '川麻',
  },
  {
    id: 'tuidaohu',
    label: '推倒胡',
    cornerTag: '经典',
  },
];

export const MAHJONG_TIER_CONFIGS: MahjongTierConfig[] = [
  {
    id: 'mj_rookie',
    title: '初级场',
    baseScore: 100,
    minBeans: 1000,
    capLabel: '32番封顶',
    onlineBase: 3120,
    tiles: [
      '/assets/mahjong/tiles/tile_1.png',
      '/assets/mahjong/tiles/tile_2.png',
      '/assets/mahjong/tiles/tile_3.png',
    ],
    tileAlts: ['一万', '二万', '三万'],
    theme: {
      bgGradient: 'from-[#0b3827] via-[#07261a] to-[#04140e]',
      borderColor: 'border-[#34d399]/60',
      glowColor: 'bg-emerald-400/20',
      titleColor: '#e6fffa',
      titleShadow: '#073e2a',
      pillBg: 'bg-[#09422d]/85',
      ribbonBg: 'from-[#0d9488] to-[#059669]',
    },
  },
  {
    id: 'mj_primary',
    title: '中级场',
    baseScore: 500,
    minBeans: 10000,
    capLabel: '64番封顶',
    onlineBase: 4580,
    tiles: [
      '/assets/mahjong/tiles/tile_11.png',
      '/assets/mahjong/tiles/tile_15.png',
      '/assets/mahjong/tiles/tile_19.png',
    ],
    tileAlts: ['一条', '五条', '九条'],
    theme: {
      bgGradient: 'from-[#0f2e57] via-[#0a1e3a] to-[#050f1d]',
      borderColor: 'border-[#60a5fa]/60',
      glowColor: 'bg-blue-400/20',
      titleColor: '#eff6ff',
      titleShadow: '#0c2547',
      pillBg: 'bg-[#12335f]/85',
      ribbonBg: 'from-[#2563eb] to-[#1d4ed8]',
    },
  },
  {
    id: 'mj_middle',
    title: '高级场',
    baseScore: 2000,
    minBeans: 50000,
    capLabel: '128番封顶',
    onlineBase: 3340,
    tiles: [
      '/assets/mahjong/tiles/tile_21.png',
      '/assets/mahjong/tiles/tile_25.png',
      '/assets/mahjong/tiles/tile_29.png',
    ],
    tileAlts: ['一筒', '五筒', '九筒'],
    theme: {
      bgGradient: 'from-[#35154c] via-[#220d32] to-[#11051b]',
      borderColor: 'border-[#c084fc]/60',
      glowColor: 'bg-purple-400/25',
      titleColor: '#faf5ff',
      titleShadow: '#2b0a3f',
      pillBg: 'bg-[#3b1554]/85',
      ribbonBg: 'from-[#7c3aed] to-[#6d28d9]',
    },
  },
  {
    id: 'mj_high',
    title: '巅峰场',
    baseScore: 10000,
    minBeans: 200000,
    capLabel: '不设封顶',
    onlineBase: 2190,
    tiles: [
      '/assets/mahjong/tiles/tile_31.png',
      '/assets/mahjong/tiles/tile_31.png',
      '/assets/mahjong/tiles/tile_31.png',
    ],
    tileAlts: ['红中', '红中', '红中'],
    theme: {
      bgGradient: 'from-[#54130d] via-[#3a0a06] to-[#1f0402]',
      borderColor: 'border-[#fbbf24]/75',
      glowColor: 'bg-amber-400/30',
      titleColor: '#fff1f2',
      titleShadow: '#420904',
      pillBg: 'bg-[#5b150c]/85',
      ribbonBg: 'from-[#dc2626] to-[#ea580c]',
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
  onQuickStart,
  onInsufficientBeans,
  isMobileLandscape = false,
}) => {
  const [activeMode, setActiveMode] = useState<MahjongPlayMode>('puer');

  const recommendedTier = useMemo(() => {
    return (
      [...MAHJONG_TIER_CONFIGS].reverse().find((t) => myBeans >= t.minBeans) ??
      MAHJONG_TIER_CONFIGS[0]
    );
  }, [myBeans]);

  const handleCardClick = (tier: MahjongTierConfig) => {
    soundEngine.playCardPlace(true);
    hapticEngine.playCard();

    if (myBeans < tier.minBeans) {
      if (onInsufficientBeans) {
        onInsufficientBeans(tier);
      } else {
        alert(`您的欢乐豆不足以进入【${tier.title}】（需 ${tier.minBeans.toLocaleString()} 豆）`);
      }
      return;
    }

    onSelectTier(tier.baseScore, activeMode);
  };

  const handleQuickMatchClick = () => {
    soundEngine.playCardPlace(true);
    hapticEngine.playCard();
    if (onQuickStart) {
      onQuickStart(recommendedTier.baseScore, activeMode);
    } else {
      onSelectTier(recommendedTier.baseScore, activeMode);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-between overflow-hidden select-none px-1 py-1 sm:py-2">
      {/* 1. COMPACT COMMERCIAL 4-MODE SWITCHER BAR */}
      <div className="mx-auto grid w-full max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px] shrink-0 grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-[#121822]/95 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.3)] sm:gap-2 sm:p-1.5 landscape:max-w-4xl">
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
              className={`relative flex h-8 items-center justify-center rounded-xl px-1.5 transition-all duration-150 active:scale-[0.98] sm:h-9.5 ${
                active
                  ? 'border border-amber-300/80 bg-gradient-to-b from-[#ea580c] via-[#c2410c] to-[#9a3412] text-white shadow-[0_2px_12px_rgba(234,88,12,0.45)]'
                  : 'border border-transparent bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <span className="font-display text-xs font-black tracking-wide whitespace-nowrap sm:text-sm">
                {m.label}
              </span>

              {m.cornerTag && (
                <span
                  className={`pointer-events-none absolute -top-1.5 -right-1 hidden rounded-full px-1.5 py-0.2 text-[9px] leading-tight font-black shadow sm:inline-block ${
                    active
                      ? 'bg-[#450a0a] text-amber-200 border border-amber-400/40'
                      : 'bg-black/60 text-white/80 border border-white/20'
                  }`}
                >
                  {m.cornerTag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. RESTRAINED SAFE CANVAS 4 ARENA CARDS
          - Portrait: Aspect-locked at [3/3.8] with height-responsive max-width constraint:
            `max-w-[min(480px,calc((100dvh-130px)*0.82))]` prevents vertical stretching or cutoffs.
          - Landscape: Aspect-locked at [16/7.2] with max-height 350px, perfectly balanced 4-in-a-row.
      */}
      <div className="
        mx-auto grid w-full my-auto min-h-0
        max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px]
        max-h-[min(100%,640px)] aspect-[3/3.8]
        grid-cols-2 grid-rows-2
        gap-2 sm:gap-2.5 md:gap-3
        landscape:max-w-4xl landscape:max-h-[350px] landscape:aspect-[16/7.2] landscape:grid-cols-4 landscape:grid-rows-1
      ">
        {MAHJONG_TIER_CONFIGS.map((tier) => {
          const canAfford = myBeans >= tier.minBeans;
          const isRecommended = canAfford && recommendedTier.id === tier.id;

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => handleCardClick(tier)}
              className={`
                group relative flex h-full min-h-0 w-full cursor-pointer flex-col justify-between
                overflow-hidden rounded-2xl border-[2.5px] ${tier.theme.borderColor}
                bg-gradient-to-b ${tier.theme.bgGradient} p-2 text-left
                shadow-[0_8px_20px_rgba(0,0,0,0.55)] transition-transform duration-150
                active:scale-[0.985] [@media(hover:hover)]:hover:brightness-105 sm:rounded-3xl sm:p-2.5
                ${
                  isRecommended
                    ? 'ring-2 ring-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.45)]'
                    : ''
                }
                ${canAfford ? '' : 'opacity-85'}
              `}
            >
              {/* Subtle Gold Dust Radial Highlight */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.12)_0%,transparent_68%)]" />

              {/* TOP HEADER: Recommended Ribbon or Fan Cap + Online Counter */}
              <div className="relative z-10 flex w-full items-center justify-between gap-1">
                {isRecommended ? (
                  <div className="rounded-full border border-amber-300/60 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-2 py-0.5 text-[9px] font-black text-white shadow-sm sm:text-[10px]">
                    推荐
                  </div>
                ) : (
                  <div className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[9px] font-bold text-amber-200/90 shadow-sm sm:text-[10px]">
                    {tier.capLabel}
                  </div>
                )}

                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs backdrop-blur-xs sm:text-[10px]">
                  <img
                    src="/assets/ui/icon_online.png"
                    alt="在线"
                    className="h-2.5 w-2.5 shrink-0 object-contain sm:h-3 sm:w-3"
                  />
                  <span className="tabular-nums">{tier.onlineBase.toLocaleString()}</span>
                </div>
              </div>

              {/* CENTER STAGE: Grand 3D Mahjong Hand (3-Tile Cluster) */}
              <div className="relative z-10 my-auto flex min-h-0 flex-1 flex-col items-center justify-center py-0.5 sm:py-1">
                {/* 3D Mahjong Tile Fan Composition */}
                <div className="relative flex items-center justify-center transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105">
                  {/* Pedestal Ambient Glow */}
                  <div
                    className={`pointer-events-none absolute -inset-3 rounded-full ${tier.theme.glowColor} blur-xl`}
                  />

                  {/* Left Tile */}
                  <img
                    src={tier.tiles[0]}
                    alt={tier.tileAlts[0]}
                    className="h-[clamp(2.5rem,7vh,3.8rem)] w-auto -rotate-6 translate-x-2 translate-y-1 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] sm:h-15 md:h-17 landscape:h-11 sm:landscape:h-13 pointer-events-none"
                    draggable={false}
                  />

                  {/* Center Tile (Elevated Hero) */}
                  <img
                    src={tier.tiles[1]}
                    alt={tier.tileAlts[1]}
                    className="relative z-10 h-[clamp(2.8rem,7.8vh,4.2rem)] w-auto scale-105 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] sm:h-17 md:h-19 landscape:h-13 sm:landscape:h-15 pointer-events-none"
                    draggable={false}
                  />

                  {/* Right Tile */}
                  <img
                    src={tier.tiles[2]}
                    alt={tier.tileAlts[2]}
                    className="h-[clamp(2.5rem,7vh,3.8rem)] w-auto rotate-6 -translate-x-2 translate-y-1 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] sm:h-15 md:h-17 landscape:h-11 sm:landscape:h-13 pointer-events-none"
                    draggable={false}
                  />
                </div>

                {/* 3D Crisp Outlined Title */}
                <h3
                  className="mt-1 font-display text-sm font-black tracking-wide sm:mt-1.5 sm:text-lg landscape:text-xs sm:landscape:text-base whitespace-nowrap text-white"
                  style={{
                    textShadow: `0 1.5px 0 ${tier.theme.titleShadow}, 0 -1px 0 ${tier.theme.titleShadow}, 1.5px 0 0 ${tier.theme.titleShadow}, -1.5px 0 0 ${tier.theme.titleShadow}, 1px 1px 0 ${tier.theme.titleShadow}, -1px -1px 0 ${tier.theme.titleShadow}, 1px -1px 0 ${tier.theme.titleShadow}, -1px 1px 0 ${tier.theme.titleShadow}, 0 3px 0 ${tier.theme.titleShadow}, 0 5px 8px rgba(0,0,0,0.5)`,
                  }}
                >
                  {tier.title}
                </h3>

                {/* Base Score Pill */}
                <div className="mt-0.5 flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/55 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-300 shadow-inner tabular-nums sm:text-xs">
                  <img
                    src="/assets/ui/icon_gold.png"
                    alt="底分"
                    className="h-3 w-3 shrink-0 object-contain drop-shadow"
                  />
                  <span>底分 {tier.baseScore}</span>
                </div>
              </div>

              {/* BOTTOM FOOTER: Single Sleek Commercial Entry Status Bar */}
              <div className="relative z-10 mt-auto w-full pt-0.5">
                <div
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-1 px-2 text-[10px] sm:text-xs font-mono font-extrabold shadow-inner backdrop-blur-xs transition-colors sm:py-1.5 ${
                    canAfford
                      ? 'border-amber-300/30 bg-black/55 text-amber-300 group-hover:bg-black/35'
                      : 'border-rose-400/30 bg-rose-950/60 text-rose-300'
                  }`}
                >
                  <img
                    src="/assets/ui/icon_douzi.png"
                    alt="豆"
                    className="h-3.5 w-3.5 shrink-0 object-contain drop-shadow"
                  />
                  <span>
                    {canAfford
                      ? `${tier.minBeans.toLocaleString()} 豆准入`
                      : '豆子不足'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. FLOATING QUICK START FAB (Consistently aligned with DDZ sub-hall) */}
      <div
        className="absolute z-30 sm:bottom-3 sm:right-3"
        style={{
          bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
          right: 'max(0.6rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <QuickStartFab
          onQuickStart={handleQuickMatchClick}
          recommendedScore={recommendedTier.baseScore}
        />
      </div>
    </div>
  );
};
