import React from 'react';
import { NiuniuCard } from '../types';

export interface NiuniuCardViewProps {
  card?: NiuniuCard;
  faceDown?: boolean;
  mysteryFifthCard?: boolean;
  selected?: boolean;
  isBullPart?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const SUIT_ASSET_PREFIX: Record<string, string> = {
  spade: 'Card_Spade_',
  heart: 'Card_Heart_',
  club: 'Card_Club_',
  diamond: 'Card_Diamond_',
};

const RANK_STRINGS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const NiuniuCardView: React.FC<NiuniuCardViewProps> = ({
  card,
  faceDown = false,
  mysteryFifthCard = false,
  selected = false,
  isBullPart = false,
  size = 'md',
  onClick,
  className = '',
  style = {},
}) => {
  const isBack = faceDown || !card || card.rank <= 0;

  const cardSrc = React.useMemo(() => {
    if (isBack) {
      return '/assets/ddz/cards/Card_Back_Default.png';
    }
    const suitKey = card.suit ? String(card.suit).toLowerCase() : 'spade';
    const prefix = SUIT_ASSET_PREFIX[suitKey] || 'Card_Spade_';
    const rankStr = RANK_STRINGS[card.rank] || String(card.rank);
    return `/assets/ddz/cards/${prefix}${rankStr}.png`;
  }, [isBack, card]);

  const sizeClasses = React.useMemo(() => {
    switch (size) {
      case 'xs':
        return 'w-[28px] h-[39px] sm:w-[32px] sm:h-[45px]';
      case 'sm':
        return 'w-[40px] h-[56px] sm:w-[46px] sm:h-[64px]';
      case 'lg':
        return 'w-[68px] h-[95px] sm:w-[78px] sm:h-[109px] md:w-[86px] md:h-[120px]';
      case 'md':
      default:
        return 'w-[50px] h-[70px] sm:w-[58px] sm:h-[82px]';
    }
  }, [size]);

  return (
    <div
      onClick={onClick}
      className={`
        relative select-none rounded-[7px] sm:rounded-[9px] transition-all duration-200
        ${sizeClasses}
        ${isBullPart ? '-translate-y-2 sm:-translate-y-3 shadow-lg' : 'translate-y-0'}
        ${selected ? 'ring-2 ring-amber-400 -translate-y-3 brightness-108 shadow-[0_8px_16px_rgba(251,191,36,0.45)]' : ''}
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        ${className}
      `}
      style={style}
    >
      <img
        src={cardSrc}
        alt={isBack ? '背面' : `${card?.suit} ${card?.rank}`}
        className="h-full w-full rounded-[7px] sm:rounded-[9px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] pointer-events-none"
        loading="lazy"
        draggable={false}
      />

      {/* Golden Seal on 5th Mystery Card during 4明1暗 Call/Bet Phase */}
      {isBack && mysteryFifthCard && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-amber-200/80 bg-gradient-to-b from-[#3d1e08]/95 to-[#1f0d02]/95 px-2 py-0.5 text-[10px] font-black tracking-wider text-amber-300 shadow-lg">
            待开牌
          </span>
        </div>
      )}
    </div>
  );
};
