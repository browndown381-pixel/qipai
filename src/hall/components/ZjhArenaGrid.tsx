import React, { useMemo, useState } from 'react';
import { soundEngine } from '../../shared/audio/SoundEngine';
import { hapticEngine } from '../../shared/haptics/HapticEngine';
import { ZJH_TIERS, type ZjhMode, type ZjhTierConfig } from '../../games/zhajinhua/types';
import { QuickStartFab } from './QuickStartFab';

const MODES: Array<{ id: ZjhMode; label: string; tag: string; desc: string; onlineFactor: number }> = [
  { id: 'classic', label: '经典金花', tag: '热门', desc: '豹子最大，闷牌对决', onlineFactor: 1.2 },
  { id: 'special', label: '235 玩法', tag: '刺激', desc: '杂色 235 可吃豹子', onlineFactor: 0.9 },
];

interface TierTheme {
  bg: string;
  border: string;
  glow: string;
  title: string;
  online: number;
  cap: string;
}

const THEMES: Record<string, TierTheme> = {
  zjh_t1: {
    bg: 'from-[#14532d] via-[#0f3d22] to-[#082414]',
    border: 'border-[#4ade80]/50',
    glow: 'bg-emerald-500/20',
    title: '#dcfce7',
    online: 4120,
    cap: '最高 10 倍',
  },
  zjh_t2: {
    bg: 'from-[#1e3a8a] via-[#172554] to-[#0f172a]',
    border: 'border-[#60a5fa]/50',
    glow: 'bg-blue-500/20',
    title: '#dbeafe',
    online: 5360,
    cap: '最高 10 倍',
  },
  zjh_t3: {
    bg: 'from-[#581c87] via-[#3b0764] to-[#1e1b4b]',
    border: 'border-[#c084fc]/50',
    glow: 'bg-purple-500/20',
    title: '#f3e8ff',
    online: 3180,
    cap: '最高 10 倍',
  },
  zjh_t4: {
    bg: 'from-[#78350f] via-[#451a03] to-[#1c1917]',
    border: 'border-[#fbbf24]/60',
    glow: 'bg-amber-500/25',
    title: '#fef3c7',
    online: 1760,
    cap: '最高 10 倍',
  },
};

export interface ZjhArenaGridProps {
  myBeans: number;
  isMobileLandscape?: boolean;
  onSelectTier: (baseScore: number, mode: string) => void;
  onQuickStart: (baseScore: number, mode: string) => void;
  onInsufficientBeans: (tier: ZjhTierConfig) => void;
}

/** Mini hand preview: three overlapped cards showing the tier's flavour. */
const PREVIEW: Array<Array<{ r: string; red: boolean }>> = [
  [{ r: 'A', red: true }, { r: 'A', red: false }, { r: 'A', red: true }],
  [{ r: 'K', red: false }, { r: 'Q', red: false }, { r: 'J', red: false }],
  [{ r: '9', red: true }, { r: '9', red: false }, { r: 'K', red: true }],
  [{ r: '7', red: true }, { r: '8', red: true }, { r: '9', red: true }],
];

export const ZjhArenaGrid: React.FC<ZjhArenaGridProps> = ({
  myBeans,
  isMobileLandscape = false,
  onSelectTier,
  onQuickStart,
  onInsufficientBeans,
}) => {
  const [mode, setMode] = useState<ZjhMode>('classic');
  const modeMeta = MODES.find((m) => m.id === mode) ?? MODES[0];

  const recommended = useMemo(
    () => [...ZJH_TIERS].reverse().find((t) => myBeans >= t.minBeans) ?? ZJH_TIERS[0],
    [myBeans],
  );

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
      {/* Mode tabs */}
      <div className="mx-auto grid w-full max-w-[min(480px,calc((100dvh-130px)*0.82))] shrink-0 grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-[#1a1026]/95 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] sm:max-w-[540px] sm:gap-2 sm:p-1.5 landscape:max-w-xl">
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
              className={`relative flex h-8 cursor-pointer flex-col items-center justify-center rounded-xl px-1.5 transition-all duration-150 active:scale-[0.98] sm:h-10 ${
                active
                  ? 'border border-amber-200 bg-gradient-to-b from-[#fde68a] via-[#d97706] to-[#92400e] text-black shadow-[0_2px_10px_rgba(217,119,6,0.45)]'
                  : 'border border-transparent bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <span className="font-display text-xs font-black tracking-wide whitespace-nowrap sm:text-sm">{m.label}</span>
              <span className={`hidden text-[9px] leading-none sm:block ${active ? 'text-black/70' : 'text-white/40'}`}>
                {m.desc}
              </span>
              <span
                className={`pointer-events-none absolute -right-1 -top-1.5 hidden rounded-full px-1.5 text-[9px] font-extrabold leading-tight shadow sm:inline-block ${
                  active ? 'bg-[#7c1d12] text-amber-100' : 'bg-gradient-to-r from-fuchsia-600 to-amber-600 text-white'
                }`}
              >
                {m.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tier cards */}
      <div
        className={`mx-auto my-auto grid min-h-0 w-full max-w-[min(480px,calc((100dvh-130px)*0.82))] aspect-[3/3.8] max-h-[min(100%,640px)] grid-cols-2 grid-rows-2 gap-2 sm:max-w-[540px] sm:gap-2.5 md:gap-3 landscape:max-w-4xl landscape:max-h-[350px] landscape:aspect-[16/7.2] landscape:grid-cols-4 landscape:grid-rows-1 ${
          isMobileLandscape ? 'landscape:max-h-[calc(100dvh-120px)]' : ''
        }`}
      >
        {ZJH_TIERS.map((tier, i) => {
          const theme = THEMES[tier.id];
          const canAfford = myBeans >= tier.minBeans;
          const isRecommended = recommended.id === tier.id && canAfford;
          const online = Math.round(theme.online * modeMeta.onlineFactor);
          return (
            <div
              key={tier.id}
              role="button"
              onClick={() => pick(tier)}
              className={`group relative flex h-full w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-2 bg-gradient-to-b p-2.5 shadow-xl transition-all duration-200 active:scale-95 sm:rounded-3xl sm:p-3 ${theme.bg} ${theme.border} ${
                isRecommended ? 'scale-[1.02] shadow-amber-500/40 ring-2 ring-amber-400 sm:ring-4' : ''
              } ${canAfford ? 'hover:brightness-105' : 'opacity-85'}`}
            >
              <div className={`pointer-events-none absolute inset-0 blur-xl ${theme.glow}`} />

              {isRecommended && (
                <div className="absolute right-0 top-0 z-20 rounded-bl-xl rounded-tr-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-black text-black shadow-md sm:text-[10px]">
                  推荐
                </div>
              )}

              <div className="relative z-10 flex flex-col">
                <span
                  className="font-display text-sm font-black tracking-wide sm:text-base md:text-lg"
                  style={{ color: theme.title, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}
                >
                  {tier.name}
                </span>
                <span className="text-[10px] text-white/70 sm:text-xs">{theme.cap}</span>
              </div>

              {/* Hand preview */}
              <div className="relative z-10 my-auto flex items-center justify-center py-1">
                <div className="flex items-center -space-x-3 sm:-space-x-4">
                  {PREVIEW[i % PREVIEW.length].map((c, idx) => (
                    <div
                      key={idx}
                      className={`flex h-11 w-8 items-center justify-center rounded-sm border border-neutral-300 bg-gradient-to-br from-white to-neutral-200 text-xs font-black shadow-md sm:h-14 sm:w-10 sm:text-sm ${
                        c.red ? 'text-red-600' : 'text-black'
                      } ${idx === 0 ? '-rotate-12' : idx === 2 ? 'rotate-12' : 'z-10'}`}
                    >
                      {c.r}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="font-bold text-amber-200">底注 {tier.baseScore}</span>
                  <span className="font-mono text-[9px] text-white/50 sm:text-[10px]">{online} 在线</span>
                </div>
                <div
                  className={`flex items-center justify-center rounded-lg border px-1.5 py-1 text-center text-[10px] font-bold sm:text-xs ${
                    canAfford
                      ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                      : 'border-red-400/50 bg-red-900/30 text-red-200'
                  }`}
                >
                  {canAfford ? `准入 ${tier.minBeans}豆` : `需 ${tier.minBeans}豆`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="absolute z-30 sm:bottom-3 sm:right-3"
        style={{
          bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
          right: 'max(0.6rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <QuickStartFab
          onQuickStart={() => onQuickStart(recommended.baseScore, mode)}
          recommendedScore={recommended.baseScore}
        />
      </div>
    </div>
  );
};
