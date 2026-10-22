import React from 'react';
import { ArrowLeft, Maximize2, Minimize2, Plus } from 'lucide-react';
import { soundEngine } from '../../shared/audio/SoundEngine';
import { hapticEngine } from '../../shared/haptics/HapticEngine';
import { AvatarSvg } from '../../shared/ui/AvatarSvg';
import { UserProfile } from '../HallView';

export interface HallHeaderProps {
  profile: UserProfile | null;
  displayNumericId: string;
  isMainPortal: boolean;
  myBeans: number;
  myRoomCards: number;
  isBankruptAlert: boolean;
  isMobileLandscape?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onBackToPortal: () => void;
  onOpenProfile: () => void;
  onClaimRoomCards: () => void;
  onClaimSupply: () => void;
  onOpenSettings: () => void;
}

export const HallHeader: React.FC<HallHeaderProps> = ({
  profile,
  displayNumericId,
  isMainPortal,
  myBeans,
  myRoomCards,
  isBankruptAlert,
  isMobileLandscape = false,
  isFullscreen,
  onToggleFullscreen,
  onBackToPortal,
  onOpenProfile,
  onClaimRoomCards,
  onClaimSupply,
  onOpenSettings,
}) => {
  return (
    <header
      className={`relative z-20 w-full max-w-full shrink-0 overflow-hidden border-b border-white/8 bg-gradient-to-b from-[#202431] to-[#181b25] px-2.5 backdrop-blur-md transition-all sm:px-4 ${
        isMobileLandscape ? 'h-10 sm:h-11' : 'h-13 sm:h-14'
      }`}
      style={{
        paddingTop: 'max(0.2rem, env(safe-area-inset-top, 0px))',
        paddingLeft: 'max(0.6rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.6rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-1.5 sm:gap-2">
        {/* ZONE 1 (LEFT): Sub-Hall Back Button + Framed Avatar, Nickname & ID */}
        <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
          {!isMainPortal && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap(680);
                hapticEngine.tap();
                onBackToPortal();
              }}
              className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-white/15 bg-gradient-to-b from-[#2f3548] to-[#1a1e2a] px-2.5 text-amber-200 shadow hover:border-amber-300/50 active:scale-95 sm:h-9 sm:px-3.5"
              title="返回棋牌主大厅"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="text-xs font-extrabold whitespace-nowrap">返回大厅</span>
            </button>
          )}

          {profile && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap(700);
                hapticEngine.tap();
                onOpenProfile();
              }}
              className={`${
                !isMainPortal ? 'hidden lg:flex' : 'flex'
              } group min-w-0 items-center gap-1.5 rounded-2xl border border-white/10 bg-[#12151f]/85 py-0.5 pr-2 pl-0.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_2px_6px_rgba(0,0,0,0.35)] transition-colors hover:border-amber-400/40 sm:gap-2 sm:py-1 sm:pr-3 sm:pl-1`}
              title="点击设置昵称与角色形象"
            >
              {/* Framed Commercial Avatar */}
              <div className="relative flex h-7.5 w-7.5 shrink-0 items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-amber-300/80 bg-gradient-to-b from-[#384157] to-[#1b202c] shadow-sm sm:h-9 sm:w-9">
                <AvatarSvg avatarId={profile.avatarId} size={isMobileLandscape ? 24 : 30} animState="idle" />
              </div>

              {/* Stacked Nickname + Numeric ID */}
              <div className="flex min-w-0 flex-col items-start justify-center leading-tight">
                <span className="max-w-[70px] truncate text-[11px] font-extrabold tracking-tight text-white sm:max-w-[116px] sm:text-[13px]">
                  {profile.nickname}
                </span>
                <span className="font-mono text-[9px] font-semibold text-white/55 tabular-nums sm:text-[11px]">
                  ID:{displayNumericId}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* ZONE 2 (CENTER): Dual Asset Bars — Room Cards (房卡) & Official Happy Beans (欢乐豆) */}
        <div className="flex shrink-0 items-center justify-center gap-1 sm:gap-2.5">
          {/* Currency 1: Room Cards (房卡) */}
          <div className="flex h-7 items-center rounded-full border border-white/12 bg-[#10131c]/95 pr-0.5 pl-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.65)] sm:h-8.5 sm:pr-1 sm:pl-1.5">
            <div
              className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border border-amber-200/80 bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-[9px] font-black text-[#18181B] shadow-xs sm:h-5.5 sm:w-5.5 sm:text-[11px]"
              title="好友房卡"
            >
              房
            </div>
            <span className="px-1.5 font-mono text-[10px] font-extrabold text-white tabular-nums sm:px-2.5 sm:text-xs">
              {myRoomCards.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onClaimRoomCards}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-100/80 bg-gradient-to-b from-[#ffe082] via-[#f59e0b] to-[#d97706] text-[#18181B] shadow hover:brightness-110 active:scale-90 sm:h-5.5 sm:w-5.5"
              title="免费领取房卡"
            >
              <Plus className="h-3 w-3 stroke-[3]" />
            </button>
          </div>

          {/* Currency 2: Happy Beans (官方提取欢乐豆图标) */}
          <div className="flex h-7 items-center rounded-full border border-amber-400/25 bg-[#10131c]/95 pr-0.5 pl-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.65)] sm:h-8.5 sm:pr-1 sm:pl-1.5">
            <img
              src="/assets/ui/icon_douzi.png"
              alt="欢乐豆"
              className="h-4.5 w-4.5 shrink-0 object-contain drop-shadow-xs sm:h-6 sm:w-6"
            />
            <span className="px-1.5 font-mono text-[10px] font-extrabold text-amber-300 tabular-nums sm:px-2 sm:text-xs">
              {myBeans.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playPowerChime(2);
                hapticEngine.tap();
                onClaimSupply();
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-100/80 bg-gradient-to-b from-[#ffe082] via-[#f59e0b] to-[#d97706] text-[#18181B] shadow hover:brightness-110 active:scale-90 sm:h-5.5 sm:w-5.5"
              title={isBankruptAlert ? '领取破产救济豆' : '免费领取欢乐豆补给'}
            >
              <Plus className="h-3 w-3 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* ZONE 3 (RIGHT): Unified Fullscreen & Settings Entry */}
        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap(720);
                hapticEngine.tap();
                onToggleFullscreen();
              }}
              className="flex h-7.5 items-center justify-center gap-1 rounded-full border border-white/15 bg-gradient-to-b from-[#2f3548] to-[#1a1e2a] px-2 text-amber-300 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all hover:border-amber-300/50 active:scale-95 sm:h-8.5 sm:px-3"
              title={isFullscreen ? '退出全屏' : '全屏体验'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden text-[11px] font-extrabold sm:inline">
                {isFullscreen ? '还原' : '全屏'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(760);
              hapticEngine.tap();
              onOpenSettings();
            }}
            className="flex h-7.5 items-center justify-center gap-1 rounded-full border border-white/15 bg-gradient-to-b from-[#2f3548] to-[#1a1e2a] px-2 text-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all hover:border-amber-300/50 hover:text-white active:scale-95 sm:h-8.5 sm:px-3"
            title="系统设置"
          >
            <img
              src="/assets/ui/icon_setting.png"
              alt="设置"
              className="h-3.5 w-3.5 shrink-0 object-contain drop-shadow-xs sm:h-4 sm:w-4"
            />
            <span className="hidden text-xs font-extrabold tracking-wide sm:inline">
              设置
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
