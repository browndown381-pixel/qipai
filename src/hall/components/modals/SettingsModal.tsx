import React, { useState } from 'react';
import {
  Brain,
  Edit3,
  Music,
  Settings,
  Smartphone,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';
import { PWAInstallButton } from '../../../shared/pwa/PWAInstallButton';

export interface SettingsModalProps {
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenPuzzle: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onOpenProfile,
  onOpenPuzzle,
}) => {
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(soundEngine.isBgmEnabled());
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(soundEngine.isEnabled());
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(hapticEngine.isEnabled());
  const [bgmVolume, setBgmVolume] = useState<number>(Math.round(soundEngine.getBgmVolume() * 100));
  const [sfxVolume, setSfxVolume] = useState<number>(Math.round(soundEngine.getSfxVolume() * 100));

  const handleToggleBgm = () => {
    setBgmEnabled(soundEngine.toggleBgm());
  };

  const handleToggleSfx = () => {
    setSfxEnabled(soundEngine.toggle());
  };

  const handleToggleHaptic = () => {
    setHapticEnabled(hapticEngine.toggle());
  };

  const handleChangeBgmVol = (val: number) => {
    setBgmVolume(val);
    soundEngine.setBgmVolume(val / 100);
  };

  const handleChangeSfxVol = (val: number) => {
    setSfxVolume(val);
    soundEngine.setSfxVolume(val / 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90dvh,540px)] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#232838] to-[#171a24] p-4 text-white shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Settings className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-display text-base font-extrabold text-white">
                游戏系统设置
              </h3>
              <p className="text-[11px] text-white/55">
                音量无级调节、触感与出战形象管理
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Setting Items */}
        <div className="mt-3 flex-1 min-h-0 space-y-2.5 overflow-y-auto overscroll-contain pr-0.5">
          {/* BGM Row + Slider */}
          <div className="rounded-2xl border border-white/8 bg-black/35 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-amber-300" />
                <div>
                  <div className="text-xs font-bold text-white">背景音乐</div>
                  <div className="text-[10px] text-white/50">大厅迎宾与对局国风乐</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleBgm}
                className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors ${
                  bgmEnabled ? 'bg-emerald-500 text-[#0f172a]' : 'bg-white/10 text-white/60'
                }`}
              >
                {bgmEnabled ? '已开启' : '已关闭'}
              </button>
            </div>

            {bgmEnabled && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] text-white/60">音量</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgmVolume}
                  onChange={(e) => handleChangeBgmVol(Number(e.target.value))}
                  className="h-1.5 flex-1 accent-amber-400 rounded-lg cursor-pointer bg-white/20"
                />
                <span className="font-mono text-xs font-bold text-amber-300 w-8 text-right">
                  {bgmVolume}%
                </span>
              </div>
            )}
          </div>

          {/* SFX Row + Slider */}
          <div className="rounded-2xl border border-white/8 bg-black/35 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sfxEnabled ? (
                  <Volume2 className="h-4 w-4 text-amber-300" />
                ) : (
                  <VolumeX className="h-4 w-4 text-rose-400" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">游戏音效与语音</div>
                  <div className="text-[10px] text-white/50">出牌声响与角色台词</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSfx}
                className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors ${
                  sfxEnabled ? 'bg-emerald-500 text-[#0f172a]' : 'bg-white/10 text-white/60'
                }`}
              >
                {sfxEnabled ? '已开启' : '已关闭'}
              </button>
            </div>

            {sfxEnabled && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] text-white/60">音量</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume}
                  onChange={(e) => handleChangeSfxVol(Number(e.target.value))}
                  className="h-1.5 flex-1 accent-amber-400 rounded-lg cursor-pointer bg-white/20"
                />
                <span className="font-mono text-xs font-bold text-amber-300 w-8 text-right">
                  {sfxVolume}%
                </span>
              </div>
            )}
          </div>

          {/* Haptics */}
          <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/35 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-amber-300" />
              <div>
                <div className="text-xs font-bold text-white">触感震动反馈</div>
                <div className="text-[10px] text-white/50">选牌与炸弹爆炸触感</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHaptic}
              className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors ${
                hapticEnabled ? 'bg-emerald-500 text-[#0f172a]' : 'bg-white/10 text-white/60'
              }`}
            >
              {hapticEnabled ? '已开启' : '已关闭'}
            </button>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-400/40 bg-amber-500/15 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25 active:scale-95"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>角色资料</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPuzzle();
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-sky-400/40 bg-sky-500/15 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/25 active:scale-95"
          >
            <Brain className="h-3.5 w-3.5" />
            <span>残局闯关</span>
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
};
