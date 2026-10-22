import React from 'react';
import { AvailableAction } from '../types';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

export interface ActionBarFSMProps {
  actions: AvailableAction[];
  onAction: (action: AvailableAction) => void;
}

const ACTION_SORT_ORDER: Record<string, number> = {
  pass: 0,
  chi: 1,
  peng: 2,
  gang: 3,
  hu: 4,
};

export const ActionBarFSM: React.FC<ActionBarFSMProps> = ({
  actions,
  onAction,
}) => {
  if (!actions || actions.length === 0) return null;

  const handleActionClick = (a: AvailableAction) => {
    soundEngine.playTap(760);
    hapticEngine.tap();
    onAction(a);
  };

  const sortedActions = [...actions].sort(
    (a, b) => (ACTION_SORT_ORDER[a.actionType] ?? 9) - (ACTION_SORT_ORDER[b.actionType] ?? 9)
  );

  return (
    <div className="flex items-end gap-3 select-none animate-in fade-in zoom-in-95 duration-200">
      {sortedActions.map((act, idx) => {
        if (act.actionType === 'hu') {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleActionClick(act)}
              className="group relative flex h-[76px] w-[76px] items-center justify-center transition-transform hover:scale-108 active:scale-95 drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)] cursor-pointer"
            >
              {/* Radial Burst Ray behind HU */}
              <img
                src="/assets/mahjong/actions/hu_fangshe.png"
                alt="光效"
                className="absolute inset-0 h-full w-full object-contain animate-spin opacity-90 scale-125"
                style={{ animationDuration: '7s' }}
                draggable={false}
              />
              {/* Golden Mahjong Block Base (btn_action0.png, 134x142) */}
              <img
                src="/assets/mahjong/ui/btn_action0.png"
                alt="底座"
                className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(255,215,0,0.4)]"
                draggable={false}
              />
              {/* Foreground Hu Character Flag */}
              <img
                src="/assets/mahjong/ui/flag_hu.png"
                alt="胡"
                className="relative z-10 h-14 w-auto object-contain drop-shadow-[0_2px_8px_rgba(185,28,28,0.9)]"
                draggable={false}
              />
              {act.fanName && (
                <span className="absolute -bottom-2 z-20 rounded-full bg-gradient-to-r from-red-700 to-amber-700 px-2 py-0.5 font-mono text-[10px] font-black text-amber-200 shadow-md whitespace-nowrap border border-amber-300/60">
                  {act.fanName} ×{act.factor}
                </span>
              )}
            </button>
          );
        }

        if (act.actionType === 'gang') {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleActionClick(act)}
              className="group relative flex h-[62px] w-[62px] items-center justify-center transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] cursor-pointer"
            >
              <img
                src="/assets/mahjong/actions/gang_fangshe.png"
                alt="光效"
                className="absolute inset-0 h-full w-full object-contain opacity-60 animate-pulse scale-110"
                draggable={false}
              />
              {/* Emerald Jade Round Base (btn_action1.png, 120x120) */}
              <img
                src="/assets/mahjong/ui/btn_action1.png"
                alt="底座"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              <img
                src="/assets/mahjong/ui/flag_gang.png"
                alt="杠"
                className="relative z-10 h-10 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                draggable={false}
              />
            </button>
          );
        }

        if (act.actionType === 'peng') {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleActionClick(act)}
              className="group relative flex h-[62px] w-[62px] items-center justify-center transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] cursor-pointer"
            >
              <img
                src="/assets/mahjong/actions/peng_fangshe.png"
                alt="光效"
                className="absolute inset-0 h-full w-full object-contain opacity-60 animate-pulse scale-110"
                draggable={false}
              />
              {/* Emerald Jade Round Base (btn_action1.png, 120x120) */}
              <img
                src="/assets/mahjong/ui/btn_action1.png"
                alt="底座"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              <img
                src="/assets/mahjong/ui/flag_peng.png"
                alt="碰"
                className="relative z-10 h-10 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                draggable={false}
              />
            </button>
          );
        }

        if (act.actionType === 'chi') {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleActionClick(act)}
              className="group relative flex h-[62px] w-[62px] items-center justify-center transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] cursor-pointer"
            >
              <img
                src="/assets/mahjong/ui/btn_action1.png"
                alt="底座"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              <img
                src="/assets/mahjong/actions/chi.png"
                alt="吃"
                className="relative z-10 h-10 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                draggable={false}
              />
            </button>
          );
        }

        if (act.actionType === 'pass') {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleActionClick(act)}
              className="group relative flex h-[62px] w-[62px] items-center justify-center transition-transform hover:scale-110 active:scale-95 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] cursor-pointer"
            >
              {/* Emerald Jade Round Base (btn_action1.png, 120x120) */}
              <img
                src="/assets/mahjong/ui/btn_action1.png"
                alt="底座"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              <img
                src="/assets/mahjong/ui/flag_guo.png"
                alt="过"
                className="relative z-10 h-10 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                draggable={false}
              />
            </button>
          );
        }

        return null;
      })}
    </div>
  );
};
