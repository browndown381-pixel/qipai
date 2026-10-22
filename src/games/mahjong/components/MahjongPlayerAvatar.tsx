import React from 'react';
import { MahjongMeld } from '../types';
import { MeldsZone } from './MeldsZone';

export interface MahjongPlayerAvatarProps {
  nickname: string;
  avatarId?: string;
  gender?: 'female' | 'male';
  beans: number;
  isBanker?: boolean;
  dingQueSuit?: number | null;
  huCount?: number;
  isCurrentTurn?: boolean;
  isReady?: boolean;
  melds?: MahjongMeld[];
  meldsPerspective?: 1 | 2 | 3;
  showMelds?: boolean;
  className?: string;
}

export const MahjongPlayerAvatar: React.FC<MahjongPlayerAvatarProps> = ({
  nickname,
  avatarId,
  gender,
  beans,
  isBanker = false,
  dingQueSuit = null,
  huCount = 0,
  isCurrentTurn = false,
  isReady = false,
  melds = [],
  meldsPerspective = 2,
  showMelds = true,
  className = '',
}) => {
  const isFemale =
    gender === 'female' || avatarId === 'beier' || avatarId === 'heroine';
  const headSrc = isFemale
    ? '/assets/mahjong/ui/im_defaulthead_0.png'
    : '/assets/mahjong/ui/im_defaulthead_1.png';

  const DING_QUE_ICON_MAP: Record<number, string> = {
    0: '/assets/mahjong/ui/dk_mjp_2.png', // 万 (红)
    1: '/assets/mahjong/ui/dk_mjp_1.png', // 条 (绿)
    2: '/assets/mahjong/ui/dk_mjp_3.png', // 筒 (蓝)
  };

  const dingQueImg =
    dingQueSuit !== null && dingQueSuit !== undefined && dingQueSuit >= 0 && dingQueSuit <= 2
      ? DING_QUE_ICON_MAP[dingQueSuit] ?? null
      : null;

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 1. Avatar Head Frame (Cocos authentic im_defaultheadbg.png) */}
      <div className="relative flex items-center justify-center">
        {/* Background Frame */}
        <img
          src="/assets/mahjong/ui/im_defaultheadbg.png"
          alt="Avatar Frame"
          className={`h-16 w-16 sm:h-18 sm:w-18 object-contain drop-shadow-xl transition-transform ${
            isCurrentTurn ? 'scale-105 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]' : ''
          }`}
          draggable={false}
        />

        {/* Head Portrait centered inside frame */}
        <div className="absolute inset-0 flex items-center justify-center p-2.5">
          <img
            src={headSrc}
            alt={nickname}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-contain pointer-events-none drop-shadow"
            draggable={false}
          />
        </div>

        {/* Banker Badge (img_banker.png) at top-right */}
        {isBanker && (
          <img
            src="/assets/mahjong/ui/img_banker.png"
            alt="庄"
            className="absolute -top-1.5 -right-1.5 h-6 w-6 sm:h-7 sm:w-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10"
            draggable={false}
          />
        )}

        {/* Ding Que Badge at top-left */}
        {dingQueImg && (
          <img
            src={dingQueImg}
            alt="定缺"
            className="absolute -top-1.5 -left-1.5 h-6 w-6 sm:h-7 sm:w-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10 animate-in zoom-in-75 duration-200"
            draggable={false}
          />
        )}

        {/* Ready Badge at top */}
        {isReady && (
          <img
            src="/assets/mahjong/ui/im_ready.png"
            alt="准备"
            className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-auto object-contain drop-shadow z-10 animate-pulse"
            draggable={false}
          />
        )}

        {/* Hu Counter Badge */}
        {huCount > 0 && (
          <span className="absolute -bottom-1 -right-1 z-10 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-1.5 py-0.2 font-mono text-[10px] font-black text-white shadow-md border border-amber-300 animate-pulse">
            胡×{huCount}
          </span>
        )}
      </div>

      {/* 2. Score Bar underneath (im_userscore.png) */}
      <div className="relative -mt-2 flex h-6 w-24 sm:w-26 items-center justify-center">
        <img
          src="/assets/mahjong/ui/im_userscore.png"
          alt="Score Bar"
          className="absolute inset-0 h-full w-full object-contain pointer-events-none drop-shadow-md"
          draggable={false}
        />
        <span className="relative z-10 font-mono text-[11px] sm:text-xs font-black text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] tabular-nums">
          {beans.toLocaleString()}
        </span>
      </div>

      {/* 3. Nickname Label */}
      <span className="mt-0.5 max-w-[84px] truncate text-center font-display text-[10px] sm:text-[11px] font-bold text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {nickname}
      </span>

      {/* 4. Melds Zone (if any and showMelds is enabled) */}
      {showMelds && melds && melds.length > 0 && (
        <div className="mt-1 flex items-center">
          <MeldsZone melds={melds} isSmall perspective={meldsPerspective} />
        </div>
      )}
    </div>
  );
};
