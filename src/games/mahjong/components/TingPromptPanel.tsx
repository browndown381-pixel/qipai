import React from 'react';
import { TingCandidateInfo } from '../types';
import { MahjongTileView } from './MahjongTileView';

export interface TingPromptPanelProps {
  tingList?: TingCandidateInfo[];
  candidates?: TingCandidateInfo[];
}

export const TingPromptPanel: React.FC<TingPromptPanelProps> = ({
  tingList,
  candidates,
}) => {
  const items = tingList || candidates || [];

  if (!items || items.length === 0) return null;

  return (
    <div className="relative flex flex-col items-start select-none pointer-events-auto">
      {/* Ting Panel Container using authentic tingbg.png */}
      <div className="relative flex min-w-[190px] max-w-[240px] flex-col rounded-2xl border border-amber-400/40 bg-[#160c06]/95 p-2 shadow-2xl backdrop-blur-md">
        {/* Header with Cocos tingbg banner badge */}
        <div className="relative mb-1 flex items-center gap-1.5 border-b border-amber-400/20 pb-1">
          <img
            src="/assets/mahjong/ui/tingbg.png"
            alt="听牌"
            className="h-5 w-auto object-contain"
            draggable={false}
          />
          <span className="font-display text-[11px] font-black text-amber-300">
            听 {items.length} 门
          </span>
        </div>

        {/* Candidate tiles list */}
        <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pr-0.5">
          {items.map((cand) => (
            <div
              key={cand.tileId}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1"
            >
              <MahjongTileView tileId={cand.tileId} isSmall perspective={2} kind="ming" />
              <div className="flex flex-col leading-none">
                <span className="font-mono text-[10px] font-black text-amber-300">
                  剩{cand.remainCount}张
                </span>
                <span className="font-mono text-[9px] font-bold text-amber-400/80 mt-0.5">
                  ×{cand.factor}番
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
