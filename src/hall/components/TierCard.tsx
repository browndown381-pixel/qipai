import React from 'react';
import { RoomTier, RoomTierConfig } from '../../games/ddz/types';

export interface CommercialTierCardSpec {
  tierId: RoomTier;
  title: string;
  capLabel: string;
  beanRangeText: string;
  puzzleStageTitle: string;
  puzzleLevelIdx: number;
  puzzleReward: number;
  baseOnline: number;
  bgTexture: string;
  borderColor: string;
  ribbonBg: string;
  pillBg: string;
  bottomPillBg: string;
  titleStroke: string;
  titleShadow: string;
  emblemType: 'rookie' | 'primary' | 'middle' | 'high';
}

export const COMMERCIAL_TIER_SPECS: CommercialTierCardSpec[] = [
  {
    tierId: 'rookie',
    title: '新手场',
    capLabel: '32倍封顶',
    beanRangeText: '1,000 豆准入',
    puzzleStageTitle: '第一关 · 引蛇出洞',
    puzzleLevelIdx: 0,
    puzzleReward: 500,
    baseOnline: 2180,
    bgTexture: '/assets/ui/tier_bg_green.png',
    borderColor: 'border-[#9bf8d6]',
    ribbonBg: 'from-[#0d9488] to-[#059669]',
    pillBg: 'bg-[#0e573d]/85',
    bottomPillBg: 'bg-[#0b4732]/85 border-[#6ee7b7]/30',
    titleStroke: '#105c40',
    titleShadow: '#073624',
    emblemType: 'rookie',
  },
  {
    tierId: 'primary',
    title: '初级场',
    capLabel: '64倍封顶',
    beanRangeText: '3,000 豆准入',
    puzzleStageTitle: '第三关 · 拆对制胜',
    puzzleLevelIdx: 2,
    puzzleReward: 1200,
    baseOnline: 3460,
    bgTexture: '/assets/ui/tier_bg_green.png',
    borderColor: 'border-[#bcd2ff]',
    ribbonBg: 'from-[#2563eb] to-[#1d4ed8]',
    pillBg: 'bg-[#1e348a]/85',
    bottomPillBg: 'bg-[#17286e]/85 border-[#93c5fd]/30',
    titleStroke: '#1f348c',
    titleShadow: '#101d57',
    emblemType: 'primary',
  },
  {
    tierId: 'middle',
    title: '中级场',
    capLabel: '128倍封顶',
    beanRangeText: '8,000 豆准入',
    puzzleStageTitle: '第四关 · 顺子牵制',
    puzzleLevelIdx: 3,
    puzzleReward: 2000,
    baseOnline: 2690,
    bgTexture: '/assets/ui/tier_bg_orange.png',
    borderColor: 'border-[#e6c9ff]',
    ribbonBg: 'from-[#7c3aed] to-[#6d28d9]',
    pillBg: 'bg-[#4b1d91]/85',
    bottomPillBg: 'bg-[#3b1575]/85 border-[#d8b4fe]/30',
    titleStroke: '#501e96',
    titleShadow: '#2f0e5e',
    emblemType: 'middle',
  },
  {
    tierId: 'high',
    title: '宗师场',
    capLabel: '256倍封顶',
    beanRangeText: '20,000 豆准入',
    puzzleStageTitle: '第六关 · 绝境逢生',
    puzzleLevelIdx: 5,
    puzzleReward: 5000,
    baseOnline: 1540,
    bgTexture: '/assets/ui/tier_bg_orange.png',
    borderColor: 'border-[#ffd4a8]',
    ribbonBg: 'from-[#dc2626] to-[#ea580c]',
    pillBg: 'bg-[#8c2809]/85',
    bottomPillBg: 'bg-[#701e05]/85 border-[#fdba74]/30',
    titleStroke: '#8f2908',
    titleShadow: '#591502',
    emblemType: 'high',
  },
];

const TierCrestEmblem: React.FC<{ type: CommercialTierCardSpec['emblemType'] }> = ({
  type,
}) => {
  if (type === 'rookie') {
    return (
      <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 md:h-13 md:w-13 landscape:h-9 landscape:w-9 items-center justify-center rounded-2xl border-2 border-[#a7f3d0] bg-gradient-to-b from-[#34d399] to-[#059669] shadow-[0_6px_14px_rgba(6,78,59,0.45),inset_0_2px_4px_rgba(255,255,255,0.45)] sm:rounded-3xl">
        <span className="font-display text-lg font-black text-white drop-shadow sm:text-2xl landscape:text-base">
          1
        </span>
        <span className="absolute -bottom-1.5 rounded-full border border-emerald-200 bg-[#064e3b] px-1.5 py-0.2 font-mono text-[9px] font-black text-emerald-200 shadow-xs sm:px-2 sm:text-[10px]">
          I 阶
        </span>
      </div>
    );
  }
  if (type === 'primary') {
    return (
      <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 md:h-13 md:w-13 landscape:h-9 landscape:w-9 items-center justify-center rounded-2xl border-2 border-[#bfdbfe] bg-gradient-to-b from-[#60a5fa] to-[#2563eb] shadow-[0_6px_14px_rgba(30,58,138,0.45),inset_0_2px_4px_rgba(255,255,255,0.45)] sm:rounded-3xl">
        <span className="font-display text-lg font-black text-white drop-shadow sm:text-2xl landscape:text-base">
          2
        </span>
        <span className="absolute -bottom-1.5 rounded-full border border-blue-200 bg-[#1e3a8a] px-1.5 py-0.2 font-mono text-[9px] font-black text-blue-100 shadow-xs sm:px-2 sm:text-[10px]">
          II 阶
        </span>
      </div>
    );
  }
  if (type === 'middle') {
    return (
      <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 md:h-13 md:w-13 landscape:h-9 landscape:w-9 items-center justify-center rounded-2xl border-2 border-[#e9d5ff] bg-gradient-to-b from-[#c084fc] to-[#7e22ce] shadow-[0_6px_14px_rgba(88,28,135,0.45),inset_0_2px_4px_rgba(255,255,255,0.45)] sm:rounded-3xl">
        <span className="font-display text-lg font-black text-white drop-shadow sm:text-2xl landscape:text-base">
          3
        </span>
        <span className="absolute -bottom-1.5 rounded-full border border-purple-200 bg-[#4c1d95] px-1.5 py-0.2 font-mono text-[9px] font-black text-purple-100 shadow-xs sm:px-2 sm:text-[10px]">
          III 阶
        </span>
      </div>
    );
  }
  return (
    <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 md:h-13 md:w-13 landscape:h-9 landscape:w-9 items-center justify-center rounded-2xl border-2 border-[#fde68a] bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#dc2626] shadow-[0_6px_14px_rgba(124,45,18,0.5),inset_0_2px_4px_rgba(255,255,255,0.5)] sm:rounded-3xl">
      <span className="font-display text-lg font-black text-white drop-shadow sm:text-2xl landscape:text-base">
        4
      </span>
      <span className="absolute -bottom-1.5 rounded-full border border-amber-200 bg-[#7c2d12] px-1.5 py-0.2 font-mono text-[9px] font-black text-amber-200 shadow-xs sm:px-2 sm:text-[10px]">
        MAX
      </span>
    </div>
  );
};

export interface TierCardProps {
  tierCfg: RoomTierConfig;
  spec: CommercialTierCardSpec;
  isRecommended: boolean;
  dynamicOnline: number;
  isPuzzleMode: boolean;
  canAfford?: boolean;
  onClick: () => void;
}

export const TierCard: React.FC<TierCardProps> = ({
  tierCfg,
  spec,
  isRecommended,
  dynamicOnline,
  isPuzzleMode,
  canAfford = true,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative flex h-full min-h-0 w-full cursor-pointer flex-col items-center justify-between
        overflow-hidden rounded-[22px] border-[2.5px] bg-[#1a1c26] px-3 pt-2 pb-2 text-center
        shadow-[0_10px_24px_rgba(0,0,0,0.45)] transition-transform duration-150 active:scale-[0.985]
        [@media(hover:hover)]:hover:brightness-[1.05] sm:rounded-[26px] sm:px-3.5 sm:pt-2.5 sm:pb-2.5
        ${spec.borderColor}
        ${
          isRecommended
            ? 'ring-2 ring-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.5)]'
            : ''
        }
        ${canAfford ? '' : 'opacity-85'}
      `}
      style={{
        backgroundImage: `url(${spec.bgTexture})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Layer 1: Soft Glow Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

      {/* Top-Left Flush Corner Ribbon or Official QSFlag */}
      {isRecommended ? (
        <div className="pointer-events-none absolute top-0 left-0 z-20 overflow-hidden rounded-tl-[19px] rounded-br-2xl border border-amber-300/40 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow sm:text-xs">
          推荐
        </div>
      ) : (
        <div
          className={`pointer-events-none absolute top-0 left-0 z-20 overflow-hidden rounded-tl-[19px] rounded-br-2xl bg-gradient-to-r ${spec.ribbonBg} px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow sm:px-3 sm:py-0.5 sm:text-xs whitespace-nowrap`}
        >
          {spec.capLabel}
        </div>
      )}

      {/* Top-Right Compact Online Counter with Official icon_online */}
      <div className="relative z-20 flex w-full shrink-0 items-center justify-end">
        <div
          className={`flex items-center gap-1 rounded-full ${spec.pillBg} px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs sm:px-2.5 sm:text-xs`}
        >
          <img
            src="/assets/ui/icon_online.png"
            alt="在线"
            className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain drop-shadow"
          />
          <span className="font-mono tabular-nums">{dynamicOnline.toLocaleString()}</span>
        </div>
      </div>

      {/* Center Stage: Dedicated Emblem Icon + 3D Title + Base Score */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-1 py-0.5 sm:gap-1.5 landscape:gap-0.5 landscape:py-0">
        <div className="transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-108 pointer-events-none">
          <TierCrestEmblem type={spec.emblemType} />
        </div>

        {/* 3D Outlined Title without text-stroke bloat */}
        <h3
          className="mt-0.5 font-display text-[clamp(1.2rem,4vw,1.9rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-base sm:landscape:text-lg"
          style={{
            textShadow: `0 1.5px 0 ${spec.titleStroke}, 0 -1px 0 ${spec.titleStroke}, 1.5px 0 0 ${spec.titleStroke}, -1.5px 0 0 ${spec.titleStroke}, 1px 1px 0 ${spec.titleStroke}, -1px -1px 0 ${spec.titleStroke}, 1px -1px 0 ${spec.titleStroke}, -1px 1px 0 ${spec.titleStroke}, 0 3px 0 ${spec.titleShadow}, 0 5px 8px rgba(0,0,0,0.5)`,
          }}
        >
          {spec.title}
        </h3>

        {/* Base score or Puzzle stage title */}
        {isPuzzleMode ? (
          <div
            className={`rounded-full ${spec.pillBg} px-3 py-0.5 text-xs font-extrabold text-amber-200 shadow-inner sm:text-sm whitespace-nowrap`}
          >
            {spec.puzzleStageTitle}
          </div>
        ) : (
          <div
            className={`flex items-center gap-1 rounded-full ${spec.pillBg} px-3 py-0.5 font-mono text-[10px] sm:text-xs font-black text-amber-200 shadow-inner tabular-nums whitespace-nowrap`}
          >
            <img
              src="/assets/ui/icon_gold.png"
              alt="底分"
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 object-contain drop-shadow"
            />
            <span>底分 {tierCfg.baseScore}</span>
          </div>
        )}
      </div>

      {/* Bottom Full-Width Centered Entry Bar with Official icon_douzi */}
      <div
        className={`relative z-20 flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border py-1 px-2 text-[10px] sm:text-xs font-mono font-extrabold shadow-inner backdrop-blur-xs transition-colors sm:rounded-2xl sm:py-1.5 ${
          isPuzzleMode
            ? `${spec.bottomPillBg} text-white`
            : canAfford
            ? `${spec.bottomPillBg} text-amber-300 [@media(hover:hover)]:group-hover:bg-black/35`
            : 'border-rose-400/30 bg-rose-950/60 text-rose-300'
        }`}
      >
        <img
          src="/assets/ui/icon_douzi.png"
          alt="豆"
          className="h-3.5 w-3.5 shrink-0 object-contain drop-shadow"
        />
        <span className="tabular-nums whitespace-nowrap">
          {isPuzzleMode
            ? `通关赏金 +${spec.puzzleReward}`
            : canAfford
            ? spec.beanRangeText
            : '豆子不足'}
        </span>
      </div>
    </button>
  );
};
