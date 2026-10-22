import React from 'react';
import {
  COMMERCIAL_TIER_SPECS,
  CommercialTierCardSpec,
  TierCard,
} from './TierCard';
import {
  ROOM_TIER_CONFIGS,
  RoomTierConfig,
} from '../../games/ddz/types';
import { DdzArenaMode } from '../HallView';

export const DDZ_FOUR_MODES: Array<{
  id: DdzArenaMode;
  label: string;
  cornerTag?: string;
  onlineFactor: number;
}> = [
  {
    id: 'classic',
    label: '经典玩法',
    cornerTag: '经典',
    onlineFactor: 1.0,
  },
  {
    id: 'tiandi_laizi',
    label: '癞子玩法',
    cornerTag: '百搭',
    onlineFactor: 1.18,
  },
  {
    id: 'no_shuffle',
    label: '不洗牌',
    cornerTag: '多炸',
    onlineFactor: 1.35,
  },
  {
    id: 'puzzle',
    label: '残局闯关',
    cornerTag: '闯关',
    onlineFactor: 0.72,
  },
];

export interface DdzArenaGridProps {
  ddzArenaMode: DdzArenaMode;
  myBeans: number;
  onSelectMode: (mode: DdzArenaMode) => void;
  onClickTier: (tierCfg: RoomTierConfig, spec: CommercialTierCardSpec) => void;
}

export const DdzArenaGrid: React.FC<DdzArenaGridProps> = ({
  ddzArenaMode,
  myBeans,
  onSelectMode,
  onClickTier,
}) => {
  const activeArenaModeMeta =
    DDZ_FOUR_MODES.find((m) => m.id === ddzArenaMode) ?? DDZ_FOUR_MODES[0];

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-between overflow-hidden select-none px-1 py-1 sm:py-2">
      {/* 1. COMPACT COMMERCIAL 4-MODE SWITCHER BAR */}
      <div className="mx-auto grid w-full max-w-[min(480px,calc((100dvh-130px)*0.82))] sm:max-w-[540px] shrink-0 grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-[#181c27]/95 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)] sm:gap-2 sm:p-1.5 landscape:max-w-4xl">
        {DDZ_FOUR_MODES.map((m) => {
          const active = ddzArenaMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMode(m.id)}
              className={`relative flex h-8 items-center justify-center rounded-xl px-1.5 transition-all duration-150 active:scale-[0.98] sm:h-9.5 ${
                active
                  ? 'border border-amber-200 bg-gradient-to-b from-[#ffe48a] via-[#f59e0b] to-[#d97706] text-[#18181B] shadow-[0_2px_10px_rgba(245,158,11,0.45)]'
                  : 'border border-transparent bg-white/[0.04] text-white/75 [@media(hover:hover)]:hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <span className="font-display text-xs font-black tracking-wide whitespace-nowrap sm:text-sm">
                {m.label}
              </span>

              {m.cornerTag && (
                <span
                  className={`pointer-events-none absolute -top-1.5 -right-1 hidden rounded-full px-1.5 py-0.2 text-[9px] leading-tight font-extrabold shadow sm:inline-block ${
                    active
                      ? 'bg-[#991b1b] text-amber-100'
                      : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white'
                  }`}
                >
                  {m.cornerTag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. RESTRAINED SAFE CANVAS 4 LARGE COMMERCIAL ARENA CARDS
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
        {ROOM_TIER_CONFIGS.map((tierCfg, index) => {
          const spec = COMMERCIAL_TIER_SPECS[index] ?? COMMERCIAL_TIER_SPECS[0];
          const canAfford = myBeans >= tierCfg.minBeans;
          const isRecommended =
            ddzArenaMode !== 'puzzle' &&
            canAfford &&
            [...ROOM_TIER_CONFIGS].reverse().find((t) => myBeans >= t.minBeans)?.tier ===
              tierCfg.tier;
          const dynamicOnline = Math.round(
            spec.baseOnline * activeArenaModeMeta.onlineFactor
          );

          return (
            <TierCard
              key={tierCfg.tier}
              tierCfg={tierCfg}
              spec={spec}
              isRecommended={Boolean(isRecommended)}
              dynamicOnline={dynamicOnline}
              isPuzzleMode={ddzArenaMode === 'puzzle'}
              canAfford={canAfford}
              onClick={() => onClickTier(tierCfg, spec)}
            />
          );
        })}
      </div>
    </div>
  );
};
