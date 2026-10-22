import React from 'react';
import { Maximize2, X } from 'lucide-react';

export interface FullscreenGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullscreenGuideModal: React.FC<FullscreenGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-400/40 bg-[#1e0e07] p-5 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-base font-bold text-amber-200">
              全屏横屏体验指南
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-1 text-white/75 hover:bg-white/20 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-amber-100/85">
          <p>
            1. iOS Safari 浏览器下，请点击底部工具栏的「分享」按钮，选择「添加到主屏幕」即可获得完整全屏沉浸牌桌体验。
          </p>
          <p>
            2. 也可点击地址栏左侧「大小 / 隐藏工具栏」收起顶部导航栏。
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-[#18181B] hover:bg-amber-400 cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
