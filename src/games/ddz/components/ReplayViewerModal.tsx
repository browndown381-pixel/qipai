import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { CardData, MatchReplayRecord, Rank, Suit } from '../types';
import { AvatarSvg } from '../../../shared/ui/AvatarSvg';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

export interface ReplayViewerModalProps {
  replay: MatchReplayRecord;
  viewerPlayerId?: string;
  myPlayerId?: string;
  onClose: () => void;
}

const SUIT_SYMBOL: Record<Exclude<Suit, null>, { symbol: string; colorClass: string }> = {
  spade: { symbol: '♠', colorClass: 'text-zinc-900' },
  heart: { symbol: '♥', colorClass: 'text-rose-600' },
  club: { symbol: '♣', colorClass: 'text-zinc-900' },
  diamond: { symbol: '♦', colorClass: 'text-rose-600' },
};

const DEAL_MODE_LABELS: Record<string, string> = {
  classic: '经典模式',
  no_shuffle: '不洗牌模式',
  laizi: '经典赖子场',
  tiandi_laizi: '天地双赖子',
  swap_three: '换三张玩法',
};

const MiniPokerCard: React.FC<{
  card: CardData;
  wildRanks: Rank[];
  size?: 'sm' | 'md';
  highlight?: boolean;
}> = ({ card, wildRanks, size = 'sm', highlight = false }) => {
  const isWild = Boolean(card.isWild || wildRanks.includes(card.rank));
  const isJoker = card.rank === 'small_joker' || card.rank === 'big_joker';
  const isBigJoker = card.rank === 'big_joker';
  const suitInfo = card.suit ? SUIT_SYMBOL[card.suit] : null;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-md border select-none shadow-sm transition-transform ${
        size === 'md' ? 'h-12 w-9 px-1 py-0.5' : 'h-9 w-7 px-0.5 py-0.5'
      } ${
        isWild
          ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/60'
          : highlight
            ? 'border-amber-300 bg-[#FFFDF9] -translate-y-1'
            : 'border-stone-300 bg-[#FFFDF9]'
      }`}
    >
      <div
        className={`font-display leading-none font-extrabold ${
          size === 'md' ? 'text-xs' : 'text-[10px]'
        } ${
          isJoker
            ? isBigJoker
              ? 'text-rose-600'
              : 'text-slate-800'
            : suitInfo?.colorClass ?? 'text-zinc-900'
        }`}
      >
        {isJoker ? (isBigJoker ? '大王' : '小王') : card.rank}
      </div>
      <div className="flex items-center justify-between leading-none">
        {suitInfo && !isJoker ? (
          <span className={`${size === 'md' ? 'text-xs' : 'text-[10px]'} ${suitInfo.colorClass}`}>
            {suitInfo.symbol}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-amber-600">{isJoker ? '王' : ''}</span>
        )}
        {isWild && (
          <span className="rounded bg-amber-500 px-0.5 text-[8px] font-extrabold text-amber-950">
            赖
          </span>
        )}
      </div>
    </div>
  );
};

export const ReplayViewerModal: React.FC<ReplayViewerModalProps> = ({
  replay,
  viewerPlayerId,
  myPlayerId,
  onClose,
}) => {
  const effectiveViewerId = viewerPlayerId ?? myPlayerId;
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<1 | 2>(1);

  const totalSteps = replay.steps.length;

  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= totalSteps) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => {
        setStepIndex((prev) => Math.min(totalSteps, prev + 1));
      },
      speed === 2 ? 550 : 1100
    );
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, totalSteps, speed]);

  // Reconstruct the exact 3-seat open-card board state at `stepIndex`
  const snapshotAtStep = useMemo(() => {
    const hands: Record<number, CardData[]> = {
      0: [...(replay.initialHands[0] ?? [])],
      1: [...(replay.initialHands[1] ?? [])],
      2: [...(replay.initialHands[2] ?? [])],
    };

    const seatActionMap: Record<
      number,
      { label: string; cards?: CardData[]; isHighlight?: boolean }
    > = {};
    let currentMultiplier = 1;
    let activeWildRanks: Rank[] =
      replay.wildRanks.length > 0 ? [replay.wildRanks[0]] : [];
    let landlordRevealed = false;
    let activeStepSeat: number | null = null;
    let activeStepDesc = '开局发牌完毕（三家底牌透视已开启）';

    const sortHandDesc = (arr: CardData[]) =>
      [...arr].sort((a, b) => b.value - a.value || b.id.localeCompare(a.id));

    for (let i = 0; i < stepIndex && i < replay.steps.length; i++) {
      const st = replay.steps[i];
      currentMultiplier = st.multiplierAfter;
      activeWildRanks = st.wildRanksAfter ?? replay.wildRanks;
      activeStepSeat = st.seat;
      const seatInfo = replay.seats.find((s) => s.seatIndex === st.seat);
      const seatName = seatInfo?.nickname ?? `座位${st.seat + 1}`;

      if (st.actionType === 'landlord_reveal') {
        landlordRevealed = true;
        hands[st.seat] = sortHandDesc([
          ...(hands[st.seat] ?? []),
          ...(replay.landlordCards ?? []),
        ]);
        seatActionMap[st.seat] = {
          label: '获得 3 张底牌',
          cards: replay.landlordCards,
          isHighlight: i === stepIndex - 1,
        };
        activeStepDesc = `${seatName} 成为地主，收入 3 张底牌`;
      } else if (st.actionType === 'play' && st.cards && st.cards.length > 0) {
        const playedIds = new Set(st.cards.map((c) => c.id));
        hands[st.seat] = sortHandDesc(
          (hands[st.seat] ?? []).filter((c) => !playedIds.has(c.id))
        );
        seatActionMap[st.seat] = {
          label: st.patternLabel ?? '出牌',
          cards: st.cards,
          isHighlight: i === stepIndex - 1,
        };
        activeStepDesc = `${seatName} 打出【${st.patternLabel ?? '牌组'}】（${st.cards.length}张）`;
      } else {
        const label = st.patternLabel ?? '不出';
        seatActionMap[st.seat] = {
          label,
          cards: [],
          isHighlight: i === stepIndex - 1,
        };
        activeStepDesc = `${seatName} 选择「${label}」`;
      }
    }

    return {
      hands,
      seatActionMap,
      currentMultiplier,
      activeWildRanks,
      landlordRevealed,
      activeStepSeat,
      activeStepDesc,
    };
  }, [replay, stepIndex]);

  // Arrange seats so effectiveViewerId (if present) is at bottom, otherwise seat 0 is at bottom
  const mySeatIdx = useMemo(() => {
    if (effectiveViewerId) {
      const found = replay.seats.find((s) => s.playerId === effectiveViewerId);
      if (found) return found.seatIndex;
    }
    return 0;
  }, [replay.seats, effectiveViewerId]);

  const bottomSeat = mySeatIdx;
  const rightSeat = (mySeatIdx + 1) % 3;
  const leftSeat = (mySeatIdx + 2) % 3;

  const renderSeatPanel = (seatIdx: number, position: 'left' | 'right' | 'bottom') => {
    const info = replay.seats.find((s) => s.seatIndex === seatIdx);
    const cards = snapshotAtStep.hands[seatIdx] ?? [];
    const action = snapshotAtStep.seatActionMap[seatIdx];
    const isActiveStep = snapshotAtStep.activeStepSeat === seatIdx;
    const isLandlord = seatIdx === replay.landlordSeat;

    return (
      <div
        className={`flex flex-col rounded-xl border p-2.5 transition-colors ${
          isActiveStep
            ? 'border-amber-400 bg-[#0B4230]/95 shadow-lg'
            : 'border-emerald-800/80 bg-[#062419]/90'
        } ${position === 'bottom' ? 'col-span-2' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-emerald-800/60 pb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <AvatarSvg
              avatarId={info?.avatarId ?? 'noble'}
              size={28}
              isLandlord={isLandlord}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-display text-xs font-bold text-white">
                  {info?.nickname ?? `玩家 ${seatIdx + 1}`}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap shrink-0 ${
                    isLandlord
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-emerald-800 text-emerald-100'
                  }`}
                >
                  {isLandlord ? '地主' : '农民'}
                </span>
              </div>
              <div className="font-mono text-[10px] text-emerald-300/80 tabular-nums">
                余牌 {cards.length} 张 · 结算{' '}
                <span
                  className={
                    (info?.scoreDelta ?? 0) >= 0 ? 'text-amber-300' : 'text-rose-400'
                  }
                >
                  {(info?.scoreDelta ?? 0) >= 0
                    ? `+${info?.scoreDelta}`
                    : info?.scoreDelta}{' '}
                  豆
                </span>
              </div>
            </div>
          </div>

          {/* Action / Played Cards in this seat */}
          {action && (
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  action.isHighlight
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-emerald-900/90 text-amber-200'
                }`}
              >
                {action.label}
              </span>
              {action.cards && action.cards.length > 0 && (
                <div className="flex items-center -space-x-2">
                  {action.cards.map((c) => (
                    <MiniPokerCard
                      key={c.id}
                      card={c}
                      wildRanks={snapshotAtStep.activeWildRanks}
                      size="sm"
                      highlight={action.isHighlight}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Open-Card Hand Strip */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {cards.length === 0 ? (
            <span className="text-xs font-bold text-amber-300">已出完所有手牌（获胜）</span>
          ) : (
            cards.map((c) => (
              <MiniPokerCard
                key={c.id}
                card={c}
                wildRanks={snapshotAtStep.activeWildRanks}
                size={position === 'bottom' ? 'md' : 'sm'}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-400/50 bg-[#051F16] text-[#FAF8F5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/80 bg-[#041810] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Crown className="h-4 w-4 text-amber-400 shrink-0" />
            <h3 className="font-display text-sm sm:text-base font-extrabold text-amber-300">
              全视角三家明牌复盘 · 房号 {replay.roomId}
            </h3>
            <span className="rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
              {DEAL_MODE_LABELS[replay.dealMode] ?? '经典模式'}
            </span>
            {replay.wildRanks.length > 0 && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-500/25 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>
                  赖子：{replay.wildRanks.map((r, i) => `${i === 0 ? '天赖' : '地赖'}[${r}]`).join(' · ')}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 3 Landlord Bottom Cards */}
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-[#072B1E] px-2.5 py-1">
              <span className="text-[11px] text-emerald-300 whitespace-nowrap">三张底牌:</span>
              <div className="flex items-center gap-1">
                {replay.landlordCards.map((c) => (
                  <MiniPokerCard
                    key={c.id}
                    card={c}
                    wildRanks={snapshotAtStep.activeWildRanks}
                    size="sm"
                  />
                ))}
              </div>
            </div>

            <div className="font-mono text-xs font-bold text-amber-300 tabular-nums whitespace-nowrap">
              底分 {replay.baseScore} · 倍数 ×{snapshotAtStep.currentMultiplier}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-emerald-700/80 bg-emerald-950 p-1.5 text-emerald-200 hover:text-white"
              title="关闭复盘"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center 3-Seat Open-Card Perspective Grid */}
        <div className="grid flex-1 grid-cols-1 gap-2.5 overflow-y-auto p-3 sm:grid-cols-2">
          {renderSeatPanel(leftSeat, 'left')}
          {renderSeatPanel(rightSeat, 'right')}
          {renderSeatPanel(bottomSeat, 'bottom')}
        </div>

        {/* Bottom Scrubber & Playback Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-800/80 bg-[#041810] px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-semibold text-amber-200">
                {snapshotAtStep.activeStepDesc}
              </span>
              <span className="font-mono text-xs text-emerald-300 tabular-nums whitespace-nowrap ml-2">
                步数 {stepIndex} / {totalSteps}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={totalSteps}
              value={stepIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setStepIndex(Number(e.target.value));
              }}
              className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-emerald-900 accent-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                hapticEngine.tap();
                setIsPlaying(false);
                setStepIndex(0);
              }}
              className="flex items-center gap-1 rounded-lg border border-emerald-700 bg-[#072B1E] px-2.5 py-1.5 text-xs font-medium text-emerald-100 hover:border-amber-400 whitespace-nowrap"
              title="回到开局"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>开局</span>
            </button>

            <button
              type="button"
              disabled={stepIndex <= 0}
              onClick={() => {
                hapticEngine.tap();
                setIsPlaying(false);
                setStepIndex((s) => Math.max(0, s - 1));
              }}
              className="flex items-center gap-1 rounded-lg border border-emerald-700 bg-[#072B1E] px-2.5 py-1.5 text-xs font-medium text-emerald-100 hover:border-amber-400 disabled:opacity-40 whitespace-nowrap"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>上一手</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticEngine.tap();
                if (stepIndex >= totalSteps) {
                  setStepIndex(0);
                  setIsPlaying(true);
                } else {
                  setIsPlaying((p) => !p);
                }
              }}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 whitespace-nowrap"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? '暂停' : stepIndex >= totalSteps ? '重播' : '自动播放'}</span>
            </button>

            <button
              type="button"
              disabled={stepIndex >= totalSteps}
              onClick={() => {
                hapticEngine.tap();
                setIsPlaying(false);
                setStepIndex((s) => Math.min(totalSteps, s + 1));
              }}
              className="flex items-center gap-1 rounded-lg border border-emerald-700 bg-[#072B1E] px-2.5 py-1.5 text-xs font-medium text-emerald-100 hover:border-amber-400 disabled:opacity-40 whitespace-nowrap"
            >
              <span>下一手</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                hapticEngine.tap();
                setSpeed((s) => (s === 1 ? 2 : 1));
              }}
              className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-500/15 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-500/25 whitespace-nowrap"
              title="切换复盘播放倍速"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>{speed}x</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
