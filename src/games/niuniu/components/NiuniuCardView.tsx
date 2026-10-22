import React from 'react';
import { NiuniuCard } from '../types';

export interface NiuniuCardViewProps {
  card?: NiuniuCard;
  faceDown?: boolean;
  selected?: boolean;
  isBullPart?: boolean; // 属于3+2中的“算牛”突出部分
  size?: 'sm' | 'md' | 'lg';
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
  selected = false,
  isBullPart = false,
  size = 'md',
  onClick,
  className = '',
  style = {},
}) => {
  const isBack = faceDown || !card || card.rank === 0;

  // Build card image asset URL
  const cardSrc = React.useMemo(() => {
    if (isBack) {
      return '/assets/ddz/cards/Card_Back_Default.png';
    }
    const suitKey = card.suit ? String(card.suit).toLowerCase() : 'spade';
    const prefix = SUIT_ASSET_PREFIX[suitKey] || 'Card_Spade_';
    const rankStr = RANK_STRINGS[card.rank] || String(card.rank);
    return `/assets/ddz/cards/${prefix}${rankStr}.png`;
  }, [isBack, card]);

  // Dimension presets (width x height)
  const sizeClasses = React.useMemo(() => {
    switch (size) {
      case 'sm':
        return 'w-[36px] h-[50px] sm:w-[44px] sm:h-[62px]';
      case 'lg':
        return 'w-[64px] h-[90px] sm:w-[76px] sm:h-[106px] md:w-[86px] md:h-[120px]';
      case 'md':
      default:
        return 'w-[48px] h-[67px] sm:w-[58px] sm:h-[82px]';
    }
  }, [size]);

  return (
    <div
      onClick={onClick}
      className={`
        relative select-none rounded-[6px] sm:rounded-[8px] transition-all duration-200
        ${sizeClasses}
        ${isBullPart ? '-translate-y-2 sm:-translate-y-3.5 shadow-lg' : 'translate-y-0'}
        ${selected ? 'ring-2 ring-amber-400 -translate-y-2 brightness-110 shadow-xl' : ''}
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        ${className}
      `}
      style={style}
    >
      <img
        src={cardSrc}
        alt={isBack ? '背面' : `${card?.suit} ${card?.rank}`}
        className="h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] pointer-events-none rounded-[6px] sm:rounded-[8px]"
        loading="lazy"
        draggable={false}
      />
    </div>
  );
};
