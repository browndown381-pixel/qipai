import React, { useState } from 'react';
import { Coins, Maximize2, Puzzle, Settings, User, Volume2, VolumeX, X } from 'lucide-react';
import { soundEngine } from '../../../shared/audio/SoundEngine';

export interface SettingsModalProps {
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenPuzzle: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  myBeans: number;
  onClaimSupply: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onOpenProfile,
  onOpenPuzzle,
  isFullscreen,
  onToggleFullscreen,
  myBeans,
  onClaimSupply,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundEngine.isEnabled());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#162032] p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-400">
          <Settings className="h-6 w-6" />
          <h3 className="text-lg font-black">游戏设置与工具</h3>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              const next = soundEngine.toggle();
              setSoundEnabled(next);
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold hover:bg-white/10"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-rose-400" />
            )}
            <span>{soundEnabled ? '音效已开启' : '音效已静音'}</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold hover:bg-white/10"
          >
            <Maximize2 className="h-4 w-4 text-sky-400" />
            <span>{isFullscreen ? '退出全屏' : '全屏模式'}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold hover:bg-white/10"
          >
            <User className="h-4 w-4 text-amber-400" />
            <span>修改头像昵称</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenPuzzle();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold hover:bg-white/10"
          >
            <Puzzle className="h-4 w-4 text-purple-400" />
            <span>残局闯关挑战</span>
          </button>
        </div>

        {myBeans < 3000 && (
          <button
            onClick={() => {
              onClaimSupply();
              onClose();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-black text-slate-950"
          >
            <Coins className="h-4 w-4" />
            <span>免费领取破产救济金</span>
          </button>
        )}
      </div>
    </div>
  );
};
