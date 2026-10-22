import React from 'react';
import { NiuniuCard, NiuniuHandResult, NiuniuPlayerInfo } from '../types';
import { NiuniuCardView } from './NiuniuCardView';
import { AvatarSvg } from '../../../shared/ui/AvatarSvg';

export interface NiuniuPlayerSeatProps {
  player: NiuniuPlayerInfo | null;
  seatIndex: number;
  isSelf: boolean;
  isDealerCandidate?: boolean;
  phase: string;
  onCardClick?: (card: NiuniuCard, index: number) => void;
  selectedCardIds?: number[];
  className?: string;
  style?: React.CSSProperties;
}

export const NiuniuPlayerSeat: React.FC<NiuniuPlayerSeatProps> = ({
  player,
  seatIndex,
  isSelf,
  isDealerCandidate = false,
  phase,
  onCardClick,
  selectedCardIds = [],
  className = '',
  style = {},
}) => {
  if (!player) {
    return (
      <div
        className={`flex flex-col items-center justify-center opacity-40 ${className}`}
        style={style}
      >
        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-dashed border-white/30 bg-black/30">
          <span className="text-[10px] sm:text-xs text-white/50">空位</span>
        </div>
      </div>
    );
  }

  const {
    nickname,
    avatarId,
    beans,
    isDealer,
    callMultiplier,
    betMultiplier,
    cards,
    hasShownHand,
    handResult,
    scoreDelta,
  } = player;

  // Determine whether cards should be partitioned 3+2
  const showPartition = hasShownHand && handResult && handResult.tenGroup.length === 3;

  // Split cards into 3 and 2 if partitioned, or normal
  const orderedCards = React.useMemo(() => {
    if (!showPartition || !handResult) return cards;
    const tenCardIds = new Set(handResult.tenGroup.map((c) => c.id));
    const tens = cards.filter((c) => tenCardIds.has(c.id));
    const bulls = cards.filter((c) => !tenCardIds.has(c.id));
    return [...tens, ...bulls];
  }, [showPartition, handResult, cards]);

  const isBullCard = (card: NiuniuCard, idx: number) => {
    if (!showPartition || !handResult) return false;
    return idx >= 3;
  };

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={style}
    >
      {/* ================= Candidate Dealer Flash Ring ================= */}
      {isDealerCandidate && (
        <div className="pointer-events-none absolute -inset-2.5 z-0 animate-ping rounded-full border-2 border-amber-400 bg-amber-400/20" />
      )}

      {/* ================= Avatar and Info Panel ================= */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Avatar Container */}
        <div
          className={`
            relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full
            border-2 shadow-lg transition-transform duration-300
            ${isDealer ? 'border-amber-400 ring-4 ring-amber-400/40' : 'border-[#d4af37]/80 bg-[#16271c]'}
            ${isDealerCandidate ? 'scale-110 ring-4 ring-yellow-300' : ''}
          `}
        >
          <div className="h-full w-full overflow-hidden rounded-full">
            <AvatarSvg avatarId={avatarId} />
          </div>

          {/* Dealer Badge */}
          {isDealer && (
            <div className="absolute -top-2 -left-2 z-20 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-amber-200 bg-gradient-to-br from-yellow-400 to-amber-600 text-[10px] sm:text-xs font-black text-black shadow-md animate-in zoom-in-75">
              庄
            </div>
          )}

          {/* Call Banker Multiplier Pill */}
          {callMultiplier !== -1 && phase !== 'WAITING' && (
            <div className="absolute -bottom-1 -right-2 z-20 rounded-md border border-amber-300 bg-[#7c1d12] px-1 py-0.2 text-[9px] sm:text-[10px] font-bold text-amber-200 shadow">
              {callMultiplier === 0 ? '不抢' : `抢${callMultiplier}倍`}
            </div>
          )}

          {/* Bet Multiplier Pill */}
          {betMultiplier > 0 && !isDealer && phase !== 'WAITING' && (
            <div className="absolute -top-1.5 -right-2 z-20 rounded-md border border-cyan-300 bg-[#0f4b6b] px-1 py-0.2 text-[9px] sm:text-[10px] font-extrabold text-cyan-100 shadow">
              {betMultiplier}倍
            </div>
          )}
        </div>

        {/* Nickname & Beans Bar */}
        <div className="mt-1 flex flex-col items-center rounded-md border border-white/10 bg-black/75 px-1.5 py-0.5 shadow-sm backdrop-blur-xs">
          <span className="max-w-[70px] truncate text-[9px] sm:text-[10px] font-medium text-white/90">
            {nickname}
          </span>
          <div className="flex items-center gap-0.5">
            <img
              src="/assets/ui/zjm_icon_douzi.png"
              alt="豆"
              className="h-2.5 w-2.5 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300">
              {beans > 100000 ? `${(beans / 10000).toFixed(1)}万` : beans}
            </span>
          </div>
        </div>
      </div>

      {/* ================= Hand Cards Container ================= */}
      {cards && cards.length > 0 && (
        <div
          className={`
            relative z-20 mt-1 flex items-center justify-center
            ${isSelf ? 'gap-1 sm:gap-1.5' : '-space-x-4 sm:-space-x-5'}
          `}
        >
          {orderedCards.map((card, idx) => {
            const isSelected = selectedCardIds.includes(card.id);
            const isBull = isBullCard(card, idx);
            const isCardFaceDown = card.rank === 0 || (!isSelf && !hasShownHand && phase !== 'COMPARE_AND_SETTLE' && phase !== 'ROUND_RESULT');

            return (
              <NiuniuCardView
                key={`${card.id}_${idx}`}
                card={card}
                faceDown={isCardFaceDown}
                selected={isSelected}
                isBullPart={isBull}
                size={isSelf ? 'lg' : 'sm'}
                onClick={isSelf && onCardClick ? () => onCardClick(card, idx) : undefined}
                className={isBull ? 'z-30' : 'z-20'}
              />
            );
          })}
        </div>
      )}

      {/* ================= Hand Type Stamp / Badge ================= */}
      {hasShownHand && handResult && (
        <div className="absolute top-[85%] z-40 animate-in zoom-in-50 fade-in duration-200">
          <div
            className={`
              flex items-center justify-center rounded-full px-2.5 py-0.5 text-center font-black tracking-wider shadow-xl whitespace-nowrap border
              ${
                handResult.level >= 10
                  ? 'border-yellow-200 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-black text-xs sm:text-sm shadow-amber-500/50 scale-105 ring-2 ring-yellow-300'
                  : handResult.level >= 7
                  ? 'border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-700 text-white text-[10px] sm:text-xs'
                  : handResult.level > 0
                  ? 'border-blue-300 bg-gradient-to-r from-blue-600 to-indigo-800 text-white text-[10px] sm:text-xs'
                  : 'border-neutral-500 bg-neutral-800 text-neutral-300 text-[10px]'
              }
            `}
          >
            {handResult.name}
            {handResult.multiplier > 1 && (
              <span className="ml-0.5 text-[9px] opacity-90">({handResult.multiplier}倍)</span>
            )}
          </div>
        </div>
      )}

      {/* ================= Floating Score Delta ================= */}
      {scoreDelta !== undefined && scoreDelta !== 0 && (phase === 'COMPARE_AND_SETTLE' || phase === 'ROUND_RESULT') && (
        <div
          className={`
            pointer-events-none absolute -top-5 z-50 font-mono text-xs sm:text-sm font-black drop-shadow-md animate-in slide-in-from-bottom-2 fade-in duration-300
            ${scoreDelta > 0 ? 'text-amber-300' : 'text-red-400'}
          `}
        >
          {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
        </div>
      )}
    </div>
  );
};
