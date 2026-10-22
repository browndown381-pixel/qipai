import React from 'react';
import { MahjongMeld } from '../types';
import { MahjongTileView } from './MahjongTileView';

export interface MeldsZoneProps {
  melds: MahjongMeld[];
  isSmall?: boolean;
  perspective?: 1 | 2 | 3;
  direction?: 'row' | 'column';
  className?: string;
}

export const MeldsZone: React.FC<MeldsZoneProps> = ({
  melds,
  isSmall = true,
  perspective = 2,
  direction = 'row',
  className = '',
}) => {
  if (!melds || melds.length === 0) return null;

  const isVertical = direction === 'column';

  return (
    <div
      className={`flex ${isVertical ? 'flex-col gap-1.5' : 'flex-row items-center gap-1.5 sm:gap-2'} select-none pointer-events-none ${className}`}
    >
      {melds.map((m, mIdx) => {
        const isGang = m.type?.includes('gang') || m.kind?.includes('gang');
        const tiles = m.tiles || [m.card, m.card, m.card, ...(isGang ? [m.card] : [])];
        const isAnGang = m.type === 'an_gang' || m.kind === 'an_gang' || Boolean(m.hidden);

        return (
          <div
            key={mIdx}
            className={`
              flex items-center rounded-lg bg-black/40 p-0.5 border border-white/10 shadow-md backdrop-blur-xs
              ${perspective === 1 || perspective === 3 ? 'gap-0' : 'gap-0'}
            `}
          >
            {tiles.map((t: number, tIdx: number) => {
              // 暗杠第 2、3 张盖牌
              const hide = isAnGang && (tIdx === 1 || tIdx === 2);
              return (
                <div
                  key={tIdx}
                  className={`
                    ${tIdx > 0 ? (perspective === 1 || perspective === 3 ? '-ml-1.5' : '-ml-1') : ''}
                    transition-transform
                  `}
                >
                  <MahjongTileView
                    tileId={t}
                    isSmall={isSmall}
                    perspective={perspective}
                    kind="ming"
                    isBack={hide}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
