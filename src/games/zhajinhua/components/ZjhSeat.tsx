import React from 'react';
import { AvatarSvg } from '../../../shared/ui/AvatarSvg';
import type { ZjhSeatSnapshot } from '../types';
import { ZjhCardView, type ZjhCardSize } from './ZjhCardView';

export interface ZjhSeatProps {
  seat: ZjhSeatSnapshot | null;
  isSelf: boolean;
  isDealer: boolean;
  isTurn: boolean;
  turnSecondsLeft: number;
  turnSecondsTotal: number;
  /** Seat can be picked as a compare target right now. */
  selectable: boolean;
  onSelect?: () => void;
  /** Hand finished: show net result floating above the seat. */
  showDelta: boolean;
}

const STATUS_BADGE: Record<string, { text: string; className: string }> = {
  folded: { text: '已弃牌', className: 'bg-neutral-700 text-neutral-200' },
  lost: { text: '比牌输', className: 'bg-red-800 text-red-100' },
  allin: { text: '全押', className: 'bg-fuchsia-700 text-white' },
};

const formatBeans = (n: number): string => {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 1_000_000 ? 0 : 1)}万`;
  return String(n);
};

export const formatZjhBeans = formatBeans;

const EmptySeat: React.FC = () => (
  <div className="flex h-[96px] w-[150px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 text-xs text-white/30">
    空位
  </div>
);

export const ZjhSeat: React.FC<ZjhSeatProps> = ({
  seat,
  isSelf,
  isDealer,
  isTurn,
  turnSecondsLeft,
  turnSecondsTotal,
  selectable,
  onSelect,
  showDelta,
}) => {
  if (!seat) return <EmptySeat />;

  const out = seat.status === 'folded' || seat.status === 'lost';
  const badge = STATUS_BADGE[seat.status];
  const cardSize: ZjhCardSize = isSelf ? 'lg' : 'sm';
  const hasCards = seat.status !== 'waiting';
  const progress = isTurn && turnSecondsTotal > 0 ? Math.max(0, Math.min(1, turnSecondsLeft / turnSecondsTotal)) : 0;
  const urgent = isTurn && turnSecondsLeft <= 5;

  const cards = seat.cards;
  const cardNodes = [0, 1, 2].map((i) => (
    <ZjhCardView
      key={i}
      card={cards ? cards[i] : null}
      size={cardSize}
      dimmed={out}
      glow={seat.isWinner}
      className={i > 0 ? (isSelf ? '-ml-[62px]' : '-ml-[34px]') : ''}
      style={{ transform: `rotate(${(i - 1) * (isSelf ? 5 : 4)}deg)`, transformOrigin: '50% 100%' }}
    />
  ));

  const panel = (
    <div
      className={[
        'relative flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 backdrop-blur-sm transition-all duration-300',
        seat.isWinner
          ? 'border-amber-300 bg-amber-900/60 shadow-[0_0_26px_rgba(251,191,36,0.75)]'
          : isTurn
            ? 'border-emerald-300 bg-black/70 shadow-[0_0_20px_rgba(52,211,153,0.6)]'
            : 'border-white/15 bg-black/55',
        out ? 'opacity-60' : '',
        selectable ? 'cursor-pointer ring-2 ring-red-400 animate-pulse' : '',
      ].join(' ')}
    >
      <div className="relative h-[52px] w-[52px] shrink-0">
        {isTurn && (
          <div
            className="absolute -inset-[3px] rounded-full"
            style={{
              background: `conic-gradient(${urgent ? '#f87171' : '#34d399'} ${progress * 360}deg, rgba(255,255,255,0.12) 0deg)`,
            }}
          />
        )}
        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-[#cda761] bg-black">
          <AvatarSvg avatarId={seat.avatarId} />
        </div>
        {isDealer && (
          <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-500 text-[10px] font-black text-black">
            庄
          </span>
        )}
      </div>

      <div className="flex min-w-[78px] flex-col leading-tight">
        <span className="max-w-[96px] truncate text-[12px] font-bold text-white">{seat.nickname}</span>
        <span className="font-mono text-[12px] font-bold text-amber-300">{formatBeans(seat.beans)}</span>
        {badge ? (
          <span className={`mt-0.5 w-fit rounded px-1.5 text-[10px] font-bold ${badge.className}`}>{badge.text}</span>
        ) : seat.status === 'active' ? (
          <span
            className={`mt-0.5 w-fit rounded px-1.5 text-[10px] font-bold ${
              seat.seen ? 'bg-sky-700 text-sky-50' : 'bg-amber-700 text-amber-50'
            }`}
          >
            {seat.seen ? '已看牌' : '闷牌'}
          </span>
        ) : null}
      </div>

      {seat.disconnected && (
        <span className="absolute -right-1 -top-1 rounded bg-red-700 px-1 text-[9px] font-bold text-white">离线</span>
      )}
    </div>
  );

  return (
    <div
      className="relative flex flex-col items-center gap-1.5"
      onClick={selectable ? onSelect : undefined}
      role={selectable ? 'button' : undefined}
    >
      {/* Net result floating above the seat */}
      {showDelta && seat.delta !== 0 && (
        <div
          className={`absolute -top-7 z-20 rounded-full px-3 py-0.5 font-mono text-base font-black shadow-lg ${
            seat.delta > 0 ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-red-300'
          }`}
        >
          {seat.delta > 0 ? '+' : ''}
          {formatBeans(seat.delta)}
        </div>
      )}

      {/* Cards above for the main player, below the panel for others */}
      {isSelf && hasCards && <div className="flex items-end">{cardNodes}</div>}

      {panel}

      {!isSelf && hasCards && (
        <div className="flex items-end">{cardNodes}</div>
      )}

      {/* Hand label & last action & bet */}
      <div className="flex min-h-[22px] items-center gap-1.5">
        {seat.handLabel && cards && (
          <span className="rounded-full border border-amber-300/60 bg-black/70 px-2 py-0.5 text-[11px] font-black text-amber-200">
            {seat.handLabel}
          </span>
        )}
        {seat.lastAction && !seat.handLabel && (
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white/85">
            {seat.lastAction}
          </span>
        )}
        {seat.totalBet > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-amber-100 bg-amber-400" />
            {formatBeans(seat.totalBet)}
          </span>
        )}
      </div>
    </div>
  );
};
