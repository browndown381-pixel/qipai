import React, { useState } from 'react';
import { soundEngine } from '../../shared/audio/SoundEngine';
import { hapticEngine } from '../../shared/haptics/HapticEngine';
import { ZJH_TIERS, type ZjhMode, type ZjhTierConfig } from '../../games/zhajinhua/types';

const MODES: Array<{ id: ZjhMode; label: string; onlineFactor: number }> = [
  { id: 'classic', label: '经典金花', onlineFactor: 1.2 },
  { id: 'special', label: '235 玩法', onlineFactor: 0.95 },
];

interface TierTheme {
  cardGradient: string;
  borderColor: string;
  titleStroke: string;
  titleShadow: string;
  emblemIcon: string;
  online: number;
}

const THEMES: Record<string, TierTheme> = {
  zjh_t1: {
    cardGradient: 'from-[#34c395] to-[#167a57]',
    borderColor: 'border-[#7ce8c3]/80',
    titleStroke: '#105c40',
    titleShadow: '#073624',
    emblemIcon: '/assets/ui/icon_1.png',
    online: 4120,
  },
  zjh_t2: {
    cardGradient: 'from-[#4f86f7] to-[#2347b8]',
    borderColor: 'border-[#9ec0ff]/80',
    titleStroke: '#1b358f',
    titleShadow: '#0e1d54',
    emblemIcon: '/assets/ui/icon_2.png',
    online: 5360,
  },
  zjh_t3: {
    cardGradient: 'from-[#9b6bf2] to-[#5e2ca5]',
    borderColor: 'border-[#dec4ff]/80',
    titleStroke: '#481d85',
    titleShadow: '#280d4f',
    emblemIcon: '/assets/ui/icon_3.png',
    online: 3180,
  },
  zjh_t4: {
    cardGradient: 'from-[#f47b4b] via-[#dc4726] to-[#991b1b]',
    borderColor: 'border-[#ffc299]/80',
    titleStroke: '#7f1d09',
    titleShadow: '#450a03',
    emblemIcon: '/assets/ui/icon_cs.png',
    online: 1760,
  },
};

const TIER_TITLES = ['新手场', '初级场', '中级场', '至尊场'];

export interface ZjhArenaGridProps {
  myBeans: number;
  isMobileLandscape?: boolean;
  onSelectTier: (baseScore: number, mode: string) => void;
  onQuickStart?: (baseScore: number, mode: string) => void;
  onInsufficientBeans: (tier: ZjhTierConfig) => void;
}

export const ZjhArenaGrid: React.FC<ZjhArenaGridProps> = ({
  myBeans,
  onSelectTier,
  onInsufficientBeans,
}) => {
  const [mode, setMode] = useState<ZjhMode>('classic');
  const modeMeta = MODES.find((m) => m.id === mode) ?? MODES[0];

  const pick = (tier: ZjhTierConfig) => {
    soundEngine.playTap(760);
    hapticEngine.tap();
    if (myBeans < tier.minBeans) {
      onInsufficientBeans(tier);
      return;
    }
    onSelectTier(tier.baseScore, mode);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-between overflow-hidden select-none px-1 py-1 sm:py-2">
      {/* 1. CLEAN COMMERCIAL 2-MODE SWITCHER BAR (Zero subtitles, zero tags) */}
      <div className="mx-auto grid w-full max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px] shrink-0 grid-cols-2 gap-1.5 rounded-2xl border border-amber-200/25 bg-[#1e120a]/80 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-md sm:gap-2 sm:p-1.5 landscape:max-w-2xl">
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                soundEngine.playTap(780);
                hapticEngine.selectCard();
                setMode(m.id);
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
        {ZJH_TIERS.map((tier, i) => {
          const theme = THEMES[tier.id] ?? THEMES.zjh_t1;
          const canAfford = myBeans >= tier.minBeans;
          const online = Math.round(theme.online * modeMeta.onlineFactor);
          const displayTitle = TIER_TITLES[i] ?? tier.name;

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => pick(tier)}
              className={`
                group relative flex h-full min-h-0 w-full cursor-pointer flex-col items-center justify-between
                overflow-hidden rounded-[22px] sm:rounded-[26px] border-2 ${theme.borderColor}
                bg-gradient-to-b ${theme.cardGradient}
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
                  <span className="font-mono tabular-nums">{online.toLocaleString()}</span>
                </div>
              </div>

              {/* Center Stage: Single Clean 3D Emblem + 3D Title + Clean Unboxed Base Score */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-1.5 py-0.5">
                <div className="relative flex h-13 w-16 sm:h-16 sm:w-20 landscape:h-12 landscape:w-16 items-center justify-center transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-106 pointer-events-none">
                  <img
                    src={theme.emblemIcon}
                    alt=""
                    className="h-full w-auto object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]"
                    draggable={false}
                  />
                </div>

                <h3
                  className="font-display text-[clamp(1.25rem,4vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,2.6vw,1.5rem)]"
                  style={{
                    textShadow: `0 1.5px 0 ${theme.titleStroke}, 0 -1px 0 ${theme.titleStroke}, 1.5px 0 0 ${theme.titleStroke}, -1.5px 0 0 ${theme.titleStroke}, 0 3px 0 ${theme.titleShadow}, 0 4px 8px rgba(0,0,0,0.4)`,
                  }}
                >
                  {displayTitle}
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
