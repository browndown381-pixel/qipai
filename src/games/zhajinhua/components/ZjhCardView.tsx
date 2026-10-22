import React from 'react';
import type { ZjhCard, ZjhSuit } from '../types';

const SUIT_FILE: Record<ZjhSuit, string> = {
  spade: 'Spade',
  heart: 'Heart',
  club: 'Club',
  diamond: 'Diamond',
};

const rankFile = (rank: number): string => {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
};

export const zjhCardSrc = (card: ZjhCard | null): string =>
  card
    ? `/assets/ddz/cards/Card_${SUIT_FILE[card.suit]}_${rankFile(card.rank)}.png`
    : '/assets/ddz/cards/Card_Back_Default.png';

export type ZjhCardSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ZjhCardSize, string> = {
  xs: 'w-[46px]',
  sm: 'w-[60px]',
  md: 'w-[84px]',
  lg: 'w-[108px]',
};

export interface ZjhCardViewProps {
  /** null renders the card back. */
  card: ZjhCard | null;
  size?: ZjhCardSize;
  dimmed?: boolean;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Thin wrapper over the shared poker art. Keeps a fixed aspect ratio so cards never stretch. */
export const ZjhCardView: React.FC<ZjhCardViewProps> = ({
  card,
  size = 'md',
  dimmed = false,
  glow = false,
  className = '',
  style,
}) => (
  <img
    src={zjhCardSrc(card)}
    alt={card ? `${card.suit} ${card.rank}` : 'card back'}
    draggable={false}
    className={[
      SIZE_CLASS[size],
      'aspect-[5/7] rounded-[6px] object-contain select-none',
      'shadow-[0_4px_10px_rgba(0,0,0,0.55)] transition-[filter,transform,box-shadow] duration-300',
      dimmed ? 'brightness-50 saturate-50' : '',
      glow ? 'shadow-[0_0_18px_rgba(251,191,36,0.9)]' : '',
      className,
    ].join(' ')}
    style={style}
  />
);
