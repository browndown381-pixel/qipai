import React, { useState } from 'react';
import { Check, Copy, Plus } from 'lucide-react';
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
  onCopyIdSuccess?: (id: string) => void;
}

export const HallHeader: React.FC<HallHeaderProps> = ({
  profile,
  displayNumericId,
  isMainPortal,
  myRoomCards,
  isMobileLandscape = false,
  onBackToPortal,
  onOpenProfile,
  onClaimRoomCards,
  onOpenSettings,
  onCopyIdSuccess,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playTap(820);
    hapticEngine.tap();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(displayNumericId);
      } else {
        const ta = document.createElement('textarea');
        ta.value = displayNumericId;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      // Ignore clipboard permission errors in restricted iframes
    }

    setCopied(true);
    onCopyIdSuccess?.(displayNumericId);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <header
      className={`relative z-20 w-full max-w-full shrink-0 border-b border-amber-200/20 bg-gradient-to-b from-[#1a0f08]/75 via-[#1a0f08]/50 to-transparent px-2.5 backdrop-blur-md transition-all sm:px-5 ${
        isMobileLandscape ? 'h-12 sm:h-13' : 'h-14 sm:h-16'
      }`}
      style={{
        paddingTop: 'max(0.2rem, env(safe-area-inset-top, 0px))',
        paddingLeft: 'max(0.65rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.65rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
        {/* ZONE 1 (LEFT): Sub-Hall Back Button + Commercial Player Info Capsule */}
        <div className="flex min-w-0 items-center justify-start gap-1.5 sm:gap-2.5">
          {!isMainPortal && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTap(680);
                hapticEngine.tap();
                onBackToPortal();
              }}
              className="group flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-amber-200/35 bg-[#1e120a]/80 text-white shadow-md backdrop-blur-xs transition-all hover:border-amber-300 hover:bg-[#2b190e] active:scale-95 sm:h-10 sm:w-auto sm:px-3.5 cursor-pointer"
              title="返回棋牌主大厅"
            >
              <img
                src="/assets/ui/btn_back.png"
                alt="返回"
                className="h-4 w-4 shrink-0 object-contain drop-shadow"
              />
              <span className="hidden text-xs font-extrabold tracking-wide whitespace-nowrap text-amber-100 sm:inline">
                大厅
              </span>
            </button>
          )}

          {profile && (
            <div className="flex max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-full border border-amber-200/30 bg-gradient-to-r from-[#1c120c]/88 via-[#261810]/82 to-[#1c120c]/75 py-0.5 pr-3 pl-1 shadow-[0_4px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md sm:gap-2.5 sm:py-1 sm:pr-4 sm:pl-1.5">
              {/* Clickable Framed Avatar */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTap(700);
                  hapticEngine.tap();
                  onOpenProfile();
                }}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center transition-transform hover:scale-105 active:scale-95 sm:h-10.5 sm:w-10.5 cursor-pointer"
                title="点击修改头像与昵称"
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#3d4659] to-[#1e2330] sm:h-9.5 sm:w-9.5">
                  <AvatarSvg
                    avatarId={profile.avatarId}
                    size={isMobileLandscape ? 28 : 34}
                    animState="idle"
                  />
                </div>
                <img
                  src="/assets/ui/head_frame.png"
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
                />
              </button>

              {/* Player Nickname + One-Click Copyable ID Row (Zero overflow, no wrapping button) */}
              <div className="flex min-w-0 flex-col justify-center">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTap(700);
                    hapticEngine.tap();
                    onOpenProfile();
                  }}
                  className="max-w-[118px] truncate text-left text-xs leading-tight font-extrabold tracking-tight text-white drop-shadow-xs transition-colors hover:text-amber-200 sm:max-w-[175px] sm:text-sm cursor-pointer"
                  title="点击修改昵称"
                >
                  {profile.nickname}
                </button>

                <button
                  type="button"
                  onClick={handleCopyId}
                  className="group/id mt-0.5 flex items-center gap-1 text-left whitespace-nowrap transition-opacity active:scale-95 cursor-pointer"
                  title="点击复制玩家 ID"
                >
                  <span className="font-mono text-[10px] leading-none font-bold text-amber-100/85 tabular-nums sm:text-[11px]">
                    ID:{displayNumericId}
                  </span>
                  {copied ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/25 px-1 py-0.2 text-[9px] leading-none font-extrabold text-emerald-300">
                      <Check className="h-2.5 w-2.5 shrink-0 stroke-[3]" />
                      <span>已复制</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1 py-0.2 text-[9px] leading-none font-bold text-amber-300/95 group-hover/id:bg-amber-400/25 group-hover/id:text-amber-200">
                      <Copy className="h-2.5 w-2.5 shrink-0" />
                      <span>复制</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ZONE 2 (CENTER): Room Cards (房卡) Capsule */}
        <div className="flex shrink-0 items-center justify-center">
          <div className="flex h-8.5 items-center rounded-full border border-amber-200/30 bg-[#1c120c]/85 pr-1 pl-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-md sm:h-9.5 sm:pr-1.5 sm:pl-2.5">
            <img
              src="/assets/ui/zjm_icon_jinka.png"
              alt="房卡"
              className="h-4.5 w-4.5 shrink-0 object-contain drop-shadow sm:h-5.5 sm:w-5.5"
            />
            <span className="px-2 font-mono text-xs font-black text-white tabular-nums sm:px-3 sm:text-sm">
              {myRoomCards.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onClaimRoomCards}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-100/90 bg-gradient-to-b from-[#ffe58f] via-[#f59e0b] to-[#d97706] text-[#261105] shadow hover:brightness-110 active:scale-90 sm:h-6.5 sm:w-6.5 cursor-pointer"
              title="免费补充房卡"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* ZONE 3 (RIGHT): Settings Button */}
        <div className="flex shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(760);
              hapticEngine.tap();
              onOpenSettings();
            }}
            className="group flex h-8.5 items-center justify-center gap-1.5 rounded-full border border-amber-200/30 bg-[#1c120c]/85 px-2.5 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all hover:border-amber-300/60 hover:bg-[#2b190e] active:scale-95 sm:h-9.5 sm:px-3.5 cursor-pointer"
            title="系统设置"
          >
            <img
              src="/assets/ui/zjm_icon_shezhi.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/ui/icon_setting.png';
              }}
              alt="设置"
              className="h-4 w-4 shrink-0 object-contain drop-shadow transition-transform duration-300 group-hover:rotate-45 sm:h-4.5 sm:w-4.5"
            />
            <span className="text-xs font-extrabold tracking-wide whitespace-nowrap text-white sm:text-sm">
              设置
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
