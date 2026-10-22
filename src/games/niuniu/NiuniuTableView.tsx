import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ViewportMetrics } from '../../App';
import { soundEngine } from '../../shared/audio/SoundEngine';
import { hapticEngine } from '../../shared/haptics/HapticEngine';
import { socketClient } from '../../shared/network/SocketClient';
import { AutoLandscapeContainer } from '../../shared/components/AutoLandscapeContainer';
import {
  NiuniuCard,
  NiuniuHandResult,
  NiuniuPhase,
  NiuniuPlayerInfo,
  NiuniuTableSnapshot,
} from './types';
import {
  createStandardNiuniuDeck,
  evaluateNiuniuHand,
  shuffleDeck,
  solveOptimalPartition,
} from './algorithms/NiuniuLogic';
import { NiuniuPlayerSeat } from './components/NiuniuPlayerSeat';
import { NiuniuActionBar } from './components/NiuniuActionBar';
import { NiuniuSettlementModal } from './components/NiuniuSettlementModal';

export interface NiuniuTableViewProps {
  viewport?: ViewportMetrics;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onLeaveRoom: () => void;
}

export const NiuniuTableView: React.FC<NiuniuTableViewProps> = ({
  viewport,
  isFullscreen,
  onToggleFullscreen,
  onLeaveRoom,
}) => {
  const [snapshot, setSnapshot] = useState<NiuniuTableSnapshot | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundEngine.isEnabled());
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);

  // Simulation local state fallback if socket snapshot is delayed
  const [localSnapshot, setLocalSnapshot] = useState<NiuniuTableSnapshot | null>(null);

  // Initialize socket listener
  useEffect(() => {
    soundEngine.startBgm('table');

    const unsub = socketClient.on('s2c_niuniu_snapshot', (data: NiuniuTableSnapshot) => {
      setSnapshot(data);
    });

    socketClient.emit('c2s_request_snapshot');

    return () => {
      unsub();
    };
  }, []);

  // Offline local simulation fallback initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!snapshot) {
        // Create initial local mock 5-player game if server snapshot hasn't arrived
        const deck = shuffleDeck(createStandardNiuniuDeck());
        const mockSeats: NiuniuPlayerInfo[] = [
          {
            playerId: 'self_player',
            nickname: '我 (牌圣)',
            avatarId: 'kashen',
            seatIndex: 0,
            beans: 128000,
            ready: true,
            isBot: false,
            disconnected: false,
            callMultiplier: -1,
            betMultiplier: 0,
            isDealer: false,
            cards: deck.slice(0, 5),
            hasShownHand: false,
          },
          {
            playerId: 'bot_1',
            nickname: '锦鲤·贝儿AI',
            avatarId: 'beier',
            seatIndex: 1,
            beans: 95000,
            ready: true,
            isBot: true,
            disconnected: false,
            callMultiplier: 2,
            betMultiplier: 0,
            isDealer: false,
            cards: deck.slice(5, 10),
            hasShownHand: false,
          },
          {
            playerId: 'bot_2',
            nickname: '折扇·柳如风AI',
            avatarId: 'scholar',
            seatIndex: 2,
            beans: 180000,
            ready: true,
            isBot: true,
            disconnected: false,
            callMultiplier: 0,
            betMultiplier: 0,
            isDealer: false,
            cards: deck.slice(10, 15),
            hasShownHand: false,
          },
          {
            playerId: 'bot_3',
            nickname: '财神·金百万AI',
            avatarId: 'noble',
            seatIndex: 3,
            beans: 240000,
            ready: true,
            isBot: true,
            disconnected: false,
            callMultiplier: 3,
            betMultiplier: 0,
            isDealer: false,
            cards: deck.slice(15, 20),
            hasShownHand: false,
          },
          {
            playerId: 'bot_4',
            nickname: '凌霄剑仙AI',
            avatarId: 'warrior',
            seatIndex: 4,
            beans: 88000,
            ready: true,
            isBot: true,
            disconnected: false,
            callMultiplier: 1,
            betMultiplier: 0,
            isDealer: false,
            cards: deck.slice(20, 25),
            hasShownHand: false,
          },
        ];

        setLocalSnapshot({
          roomId: '888666',
          baseScore: 100,
          playMode: 'qiangzhuang',
          phase: 'CALL_BANKER',
          countdown: 5,
          dealerSeatId: 3,
          seats: mockSeats,
          candidateDealerSeats: [1, 3],
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [snapshot]);

  // Use server snapshot if available, otherwise local simulation snapshot
  const activeSnapshot = snapshot || localSnapshot;

  // Identify self player (usually seat 0 or matching socket playerId)
  const selfPlayer = useMemo(() => {
    if (!activeSnapshot) return null;
    return (
      activeSnapshot.seats.find((s) => s && !s.isBot) ??
      activeSnapshot.seats[0] ??
      null
    );
  }, [activeSnapshot]);

  // Pre-evaluate self hand
  const selfHandResult = useMemo<NiuniuHandResult | undefined>(() => {
    if (!selfPlayer || !selfPlayer.cards || selfPlayer.cards.length !== 5) return undefined;
    return evaluateNiuniuHand(selfPlayer.cards);
  }, [selfPlayer]);

  // Client actions
  const handleCallBanker = useCallback((multiplier: number) => {
    soundEngine.playNiuniuCall();
    hapticEngine.tap();
    socketClient.emit('c2s_niuniu_call_banker', { callMultiplier: multiplier });
    if (localSnapshot && selfPlayer) {
      setLocalSnapshot((prev) => {
        if (!prev) return null;
        const newSeats = [...prev.seats];
        newSeats[selfPlayer.seatIndex] = {
          ...newSeats[selfPlayer.seatIndex]!,
          callMultiplier: multiplier,
        };
        return {
          ...prev,
          phase: 'BETTING',
          countdown: 5,
          dealerSeatId: multiplier >= 3 ? selfPlayer.seatIndex : 3,
          seats: newSeats,
        };
      });
    }
  }, [localSnapshot, selfPlayer]);

  const handleBet = useCallback((multiplier: number) => {
    soundEngine.playNiuniuChip();
    hapticEngine.playCard();
    socketClient.emit('c2s_niuniu_bet', { betMultiplier: multiplier });
    if (localSnapshot && selfPlayer) {
      setLocalSnapshot((prev) => {
        if (!prev) return null;
        const newSeats = [...prev.seats];
        newSeats[selfPlayer.seatIndex] = {
          ...newSeats[selfPlayer.seatIndex]!,
          betMultiplier: multiplier,
        };
        return {
          ...prev,
          phase: 'SHOWDOWN',
          countdown: 8,
          seats: newSeats,
        };
      });
    }
  }, [localSnapshot, selfPlayer]);

  const handleAutoPartition = useCallback(() => {
    if (!selfPlayer || !selfPlayer.cards || selfPlayer.cards.length !== 5) return;
    soundEngine.playTap(640);
    hapticEngine.selectCard();
    const partition = solveOptimalPartition(selfPlayer.cards);
    if (partition.hasNiu) {
      setSelectedCardIds(partition.bullGroup.map((c) => c.id));
    } else {
      setSelectedCardIds([]);
    }
  }, [selfPlayer]);

  const handleShowHand = useCallback(() => {
    soundEngine.playNiuniuHandReveal(selfHandResult?.level ?? 0);
    hapticEngine.playCard();
    socketClient.emit('c2s_niuniu_show_hand');
    if (localSnapshot && selfPlayer && selfHandResult) {
      setLocalSnapshot((prev) => {
        if (!prev) return null;
        const newSeats = [...prev.seats];
        newSeats[selfPlayer.seatIndex] = {
          ...newSeats[selfPlayer.seatIndex]!,
          hasShownHand: true,
          handResult: selfHandResult,
        };
        return {
          ...prev,
          phase: 'COMPARE_AND_SETTLE',
          seats: newSeats,
        };
      });
    }
  }, [localSnapshot, selfPlayer, selfHandResult]);

  const handleReady = useCallback(() => {
    soundEngine.playTap(720);
    hapticEngine.tap();
    socketClient.emit('c2s_niuniu_ready');
    if (localSnapshot && selfPlayer) {
      setLocalSnapshot((prev) => {
        if (!prev) return null;
        const newSeats = [...prev.seats];
        newSeats[selfPlayer.seatIndex] = {
          ...newSeats[selfPlayer.seatIndex]!,
          ready: true,
        };
        return {
          ...prev,
          phase: 'WAITING',
          seats: newSeats,
        };
      });
    }
  }, [localSnapshot, selfPlayer]);

  const handleCardClick = (card: NiuniuCard) => {
    setSelectedCardIds((prev) =>
      prev.includes(card.id) ? prev.filter((id) => id !== card.id) : [...prev, card.id]
    );
  };

  const seats = activeSnapshot?.seats ?? [null, null, null, null, null];
  const phase = activeSnapshot?.phase ?? 'WAITING';
  const countdown = activeSnapshot?.countdown ?? 0;
  const candidateSeats = activeSnapshot?.candidateDealerSeats ?? [];

  return (
    <AutoLandscapeContainer baseHeight={720} minVirtualWidth={1280} maxVirtualWidth={1600}>
      {({ virtualWidth, virtualHeight, stageScale }) => (
        <div className="relative h-full w-full select-none overflow-hidden bg-[#071911]">
          {/* Background Ambient Dark Layer */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.7)_95%)]" />

          {/* Virtual Stage Container: 720p height, dynamic virtualWidth, centered and scaled */}
          <div
            className="absolute overflow-hidden"
            style={{
              width: `${virtualWidth}px`,
              height: `${virtualHeight}px`,
              left: '50%',
              top: '50%',
              transform: `translate3d(-50%, -50%, 0) scale(${stageScale})`,
              transformOrigin: 'center center',
            }}
          >
            {/* ================= Semi-Elliptical Table Velvet Felt ================= */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative rounded-[160px] border-[6px] border-[#cda761] bg-radial from-[#185e3a] via-[#0d4026] to-[#062415] shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_0_50px_rgba(0,0,0,0.9)]"
                style={{
                  width: `${virtualWidth - 80}px`,
                  height: '630px',
                }}
              />
              {/* Center Decorative Golden Pattern */}
              <div className="pointer-events-none absolute flex flex-col items-center justify-center opacity-25">
                <span className="font-display text-5xl font-black tracking-widest text-[#d8b872]">
                  抢庄牛牛
                </span>
                <span className="text-xs font-serif tracking-widest text-amber-200">
                  CLASSIC BULLFIGHT POKER
                </span>
              </div>
            </div>

            {/* ================= Top Navigation Header ================= */}
            <header className="absolute top-3 left-6 right-6 z-30 flex items-center justify-between">
              {/* Left: Exit & Table Info */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-md active:scale-95 cursor-pointer hover:bg-black/80"
                  title="返回大厅"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/60 px-3.5 py-1 backdrop-blur-xs text-xs font-bold text-amber-200">
                  <span className="rounded-xs bg-red-700 px-1 py-0.2 text-[10px] font-black text-amber-100">斗牛</span>
                  <span>抢庄牛牛</span>
                  <span className="text-white/30">|</span>
                  <span className="font-mono text-white/80">房号: {activeSnapshot?.roomId || '------'}</span>
                  <span className="text-white/30">|</span>
                  <span className="font-mono text-amber-300">底分: {activeSnapshot?.baseScore || 100}</span>
                </div>
              </div>

              {/* Right: Sound, Rules, Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = soundEngine.toggle();
                    setSoundEnabled(next);
                  }}
                  title={soundEnabled ? '静音' : '开启声音'}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-md active:scale-95 cursor-pointer hover:bg-black/80"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-amber-300" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-neutral-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRuleModal(true)}
                  title="规则说明"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-md active:scale-95 cursor-pointer hover:bg-black/80"
                >
                  <HelpCircle className="h-5 w-5 text-amber-200" />
                </button>

                {onToggleFullscreen && (
                  <button
                    type="button"
                    onClick={onToggleFullscreen}
                    title={isFullscreen ? '退出全屏' : '全屏'}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-md active:scale-95 cursor-pointer hover:bg-black/80"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5 text-white" />
                    ) : (
                      <Maximize2 className="h-5 w-5 text-white" />
                    )}
                  </button>
                )}
              </div>
            </header>

            {/* ================= 5-Player Table Arena Ring ================= */}
            <main className="relative z-20 h-full w-full">
              {/* Top Center: Seat 2 and Seat 3 */}
              <div
                className="absolute top-[65px]"
                style={{ left: `${virtualWidth * 0.32}px`, transform: 'translateX(-50%)' }}
              >
                <NiuniuPlayerSeat
                  player={seats[2]}
                  seatIndex={2}
                  isSelf={false}
                  phase={phase}
                  isDealerCandidate={phase === 'DETERMINE_BANKER' && candidateSeats.includes(2)}
                />
              </div>

              <div
                className="absolute top-[65px]"
                style={{ left: `${virtualWidth * 0.68}px`, transform: 'translateX(-50%)' }}
              >
                <NiuniuPlayerSeat
                  player={seats[3]}
                  seatIndex={3}
                  isSelf={false}
                  phase={phase}
                  isDealerCandidate={phase === 'DETERMINE_BANKER' && candidateSeats.includes(3)}
                />
              </div>

              {/* Left Side: Seat 1 */}
              <div className="absolute top-[300px] left-[70px] -translate-y-1/2">
                <NiuniuPlayerSeat
                  player={seats[1]}
                  seatIndex={1}
                  isSelf={false}
                  phase={phase}
                  isDealerCandidate={phase === 'DETERMINE_BANKER' && candidateSeats.includes(1)}
                />
              </div>

              {/* Right Side: Seat 4 */}
              <div className="absolute top-[300px] right-[70px] -translate-y-1/2">
                <NiuniuPlayerSeat
                  player={seats[4]}
                  seatIndex={4}
                  isSelf={false}
                  phase={phase}
                  isDealerCandidate={phase === 'DETERMINE_BANKER' && candidateSeats.includes(4)}
                />
              </div>

              {/* Bottom Center: Seat 0 (Main Player) */}
              <div className="absolute bottom-[108px] left-1/2 -translate-x-1/2">
                <NiuniuPlayerSeat
                  player={seats[0]}
                  seatIndex={0}
                  isSelf={true}
                  phase={phase}
                  onCardClick={handleCardClick}
                  selectedCardIds={selectedCardIds}
                  isDealerCandidate={phase === 'DETERMINE_BANKER' && candidateSeats.includes(0)}
                />
              </div>
            </main>

            {/* ================= Action Bar Dock ================= */}
            <footer className="absolute bottom-[16px] left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 flex justify-center pointer-events-auto">
              <NiuniuActionBar
                phase={phase}
                countdown={countdown}
                selfPlayer={selfPlayer}
                onCallBanker={handleCallBanker}
                onBet={handleBet}
                onAutoPartition={handleAutoPartition}
                onShowHand={handleShowHand}
                onReady={handleReady}
                hasNiuPrompt={selfHandResult ? selfHandResult.level > 0 : false}
                handResult={selfHandResult}
              />
            </footer>

            {/* ================= Settlement Modal ================= */}
            {phase === 'ROUND_RESULT' && activeSnapshot?.settlement && (
              <NiuniuSettlementModal
                settlement={activeSnapshot.settlement}
                countdown={countdown}
                selfPlayerId={selfPlayer?.playerId || ''}
                onReadyNext={handleReady}
                onLeaveRoom={onLeaveRoom}
              />
            )}

            {/* ================= Rule Explanation Modal ================= */}
            {showRuleModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs pointer-events-auto">
                <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-amber-400 bg-[#16120e] p-4 text-white shadow-2xl">
                  <h3 className="text-center font-display text-lg font-black text-amber-300">
                    抢庄牛牛 · 规则说明
                  </h3>
                  <div className="mt-3 flex-1 overflow-y-auto space-y-2 text-xs sm:text-sm text-neutral-300 pr-1">
                    <p>
                      <strong className="text-amber-200">1. 发牌规则：</strong>每位玩家发 5 张牌，由 52 张标准扑克组成（无大小王）。
                    </p>
                    <p>
                      <strong className="text-amber-200">2. 牌型大小：</strong>五小牛 (10倍) &gt; 炸弹牛 (8倍) &gt; 五花牛 (6倍) &gt; 四花牛 (5倍) &gt; 牛牛 (4倍) &gt; 牛九 (3倍) &gt; 牛八~牛七 (2倍) &gt; 牛六~牛一 (1倍) &gt; 无牛 (1倍)。
                    </p>
                    <p>
                      <strong className="text-amber-200">3. 算牛规则：</strong>任意 3 张牌点数和为 10 的倍数即为「有牛」，其余 2 张牌点数相加对 10 取模得到牛数。
                    </p>
                    <p>
                      <strong className="text-amber-200">4. 比牌规则：</strong>牌型相同时比较单张最大牌（K &gt; Q &gt; ... &gt; A），最大牌相同时比较花色（黑桃 &gt; 红桃 &gt; 梅花 &gt; 方块），绝无平局。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRuleModal(false)}
                    className="mt-4 rounded-full border border-amber-300 bg-amber-500 py-2 text-xs font-black text-black active:scale-95 cursor-pointer"
                  >
                    我知道了
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AutoLandscapeContainer>
  );
};
