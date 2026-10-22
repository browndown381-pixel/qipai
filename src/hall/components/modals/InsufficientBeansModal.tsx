import React from 'react';
import { AlertTriangle, Coins, Play, X } from 'lucide-react';
import { RoomTierConfig } from '../../../games/ddz/types';

export interface InsufficientBeansModalProps {
  targetTier: RoomTierConfig;
  recommendedTier: RoomTierConfig;
  currentBeans: number;
  onClose: () => void;
  onClaimSupply: () => void;
  onEnterRecommendedTier: () => void;
}

export const InsufficientBeansModal: React.FC<InsufficientBeansModalProps> = ({
  targetTier,
  recommendedTier,
  currentBeans,
  onClose,
  onClaimSupply,
  onEnterRecommendedTier,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#182235] p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <h3 className="text-lg font-black">欢乐豆不足以进入【{targetTier.name}】</h3>
        </div>

        <p className="mt-3 text-sm text-slate-300">
          进入【{targetTier.name}】需要至少{' '}
          <span className="font-bold text-amber-300">{targetTier.minBeans.toLocaleString()}</span>{' '}
          豆，您当前拥有 <span className="font-bold text-white">{currentBeans.toLocaleString()}</span> 豆。
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {currentBeans < 3000 && (
            <button
              onClick={() => {
                onClaimSupply();
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-bold text-slate-950 shadow-lg"
            >
              <Coins className="h-5 w-5" />
              <span>免费领取救济金（补足豆子）</span>
            </button>
          )}
          <button
            onClick={() => {
              onEnterRecommendedTier();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 font-bold text-white shadow-lg"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>前往推荐场次【{recommendedTier.name}】</span>
          </button>
        </div>
      </div>
    </div>
  );
};
