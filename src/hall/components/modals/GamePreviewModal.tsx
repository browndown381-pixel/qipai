import React from 'react';
import { Play, X } from 'lucide-react';

export type PreviewGameKey = 'laoyancai' | 'shuangko' | 'sihepai' | 'niuniu' | 'zhajinhua' | string;
export type GameKey = PreviewGameKey;

export interface GamePreviewModalProps {
  gameKey: PreviewGameKey;
  myBeans?: number;
  onClose: () => void;
  onQuickStart: (gameKey: PreviewGameKey, baseScore: number) => void;
}

export const GamePreviewModal: React.FC<GamePreviewModalProps> = ({
  gameKey,
  onClose,
  onQuickStart,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#162032] p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-black text-amber-400">选择场次快速开局</h3>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[100, 500, 2000, 10000].map((bs) => (
            <button
              key={bs}
              onClick={() => onQuickStart(gameKey, bs)}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10"
            >
              <span>底分 {bs}</span>
              <Play className="h-4 w-4 text-amber-400 fill-current" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
