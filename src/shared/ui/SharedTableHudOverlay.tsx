import React, { useEffect, useState } from 'react';
import {
  Bot,
  Check,
  Coffee,
  Coins,
  Copy,
  Flame,
  Flower2,
  MessageSquare,
  Shield,
  Sparkles,
  ThumbsUp,
  Trophy,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { hapticEngine } from '../haptics/HapticEngine';
import { socketClient } from '../network/SocketClient';

export interface SharedTableHudOverlayProps {
  activeRoomId: string | null;
  gameType: string | null;
}

type QuickIconKey = 'flame' | 'sparkles' | 'thumbsup' | 'shield' | 'coffee' | 'trophy';
export type InteractivePropType = 'flower' | 'tea' | 'like' | 'ingot';

interface IncomingChatBubble {
  id: string;
  playerId: string;
  seatIndex: number;
  nickname: string;
  text: string;
  iconKey?: QuickIconKey;
}

interface ActiveFlyingProp {
  id: string;
  fromSeat: number;
  toSeat: number;
  propType: InteractivePropType;
  fromNickname?: string;
  toNickname?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const QUICK_CHAT_PRESETS: Array<{ iconKey: QuickIconKey; text: string }> = [
  { iconKey: 'flame', text: '快点吧，我等得花儿都谢了！' },
  { iconKey: 'sparkles', text: '好牌气势如虹，这把稳了！' },
  { iconKey: 'thumbsup', text: '各位牌友手下留情，合作愉快！' },
  { iconKey: 'shield', text: '底牌在手，稳扎稳打！' },
  { iconKey: 'coffee', text: '喝杯滇红定定神，咱们再来一局！' },
  { iconKey: 'trophy', text: '打得漂亮，痛快淋漓！' },
];

const INTERACTIVE_PROPS: Array<{
  type: InteractivePropType;
  label: string;
  accentClass: string;
}> = [
  { type: 'flower', label: '赠鲜花', accentClass: 'text-rose-300 border-rose-400/40 bg-rose-500/15' },
  { type: 'tea', label: '敬香茗', accentClass: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15' },
  { type: 'like', label: '赞好牌', accentClass: 'text-amber-300 border-amber-400/40 bg-amber-500/15' },
  { type: 'ingot', label: '赐元宝', accentClass: 'text-yellow-200 border-yellow-400/40 bg-yellow-500/15' },
];

function renderChatVectorIcon(iconKey?: string) {
  switch (iconKey) {
    case 'flame':
      return <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" />;
    case 'sparkles':
      return <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />;
    case 'thumbsup':
      return <ThumbsUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
    case 'shield':
      return <Shield className="h-3.5 w-3.5 shrink-0 text-sky-400" />;
    case 'coffee':
      return <Coffee className="h-3.5 w-3.5 shrink-0 text-amber-400" />;
    case 'trophy':
      return <Trophy className="h-3.5 w-3.5 shrink-0 text-yellow-300" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5 shrink-0 text-amber-300" />;
  }
}

function renderPropGraphic(propType: InteractivePropType, sizeClass = 'h-6 w-6') {
  switch (propType) {
    case 'flower':
      return <Flower2 className={`${sizeClass} text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.65)]`} />;
    case 'tea':
      return <Coffee className={`${sizeClass} text-emerald-300 drop-shadow-[0_2px_8px_rgba(52,211,153,0.65)]`} />;
    case 'like':
      return <ThumbsUp className={`${sizeClass} text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.65)]`} />;
    case 'ingot':
      return (
        <img
          src="/assets/ui/csr_yuanbao_xiao.png"
          alt="元宝"
          className={`${sizeClass} object-contain drop-shadow-[0_2px_8px_rgba(251,191,36,0.75)]`}
        />
      );
  }
}

function getRelativeSeatAnchor(relSeat: number, totalSeats: number): { x: number; y: number } {
  if (totalSeats === 4) {
    // 0: bottom(me), 1: right, 2: top, 3: left
    if (relSeat === 1) return { x: 84, y: 46 };
    if (relSeat === 2) return { x: 50, y: 16 };
    if (relSeat === 3) return { x: 16, y: 46 };
    return { x: 24, y: 82 };
  }
  if (totalSeats === 5) {
    // 0: bottom, 1: right-bottom, 2: right-top, 3: left-top, 4: left-bottom
    if (relSeat === 1) return { x: 84, y: 58 };
    if (relSeat === 2) return { x: 78, y: 24 };
    if (relSeat === 3) return { x: 22, y: 24 };
    if (relSeat === 4) return { x: 16, y: 58 };
    return { x: 28, y: 82 };
  }
  // 3 seats
  if (relSeat === 1) return { x: 82, y: 34 };
  if (relSeat === 2) return { x: 18, y: 34 };
  return { x: 24, y: 82 };
}

/**
 * SharedTableHudOverlay (/src/shared/ui/SharedTableHudOverlay.tsx).
 * Unified non-intrusive HUD layer across all 5 games:
 * 1. Real-time RTT network latency indicator + silent reconnection status banner
 * 2. One-click copyable 6-digit Room ID badge for Friend Room invitations
 * 3. Universal AI Trusteeship toggle & active takeover banner (hidden when DDZ renders its own native controls)
 * 4. Cross-game Quick-Chat & Interactive Prop throwing with parabolic flight animations (zero hardcoded text emojis)
 */
export const SharedTableHudOverlay: React.FC<SharedTableHudOverlayProps> = ({
  activeRoomId,
  gameType,
}) => {
  const [rttMs, setRttMs] = useState<number>(() => socketClient.getRttMs() || 24);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [copiedRoomId, setCopiedRoomId] = useState<boolean>(false);
  const [isTrusteeship, setIsTrusteeship] = useState<boolean>(false);
  const [showChatMenu, setShowChatMenu] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'chat' | 'props'>('chat');
  const [mySeatIndex, setMySeatIndex] = useState<number>(0);
  const [chatBubbles, setChatBubbles] = useState<IncomingChatBubble[]>([]);
  const [flyingProps, setFlyingProps] = useState<ActiveFlyingProp[]>([]);
  const [lastPropSentAt, setLastPropSentAt] = useState<number>(0);

  const totalSeats = gameType === 'mahjong' ? 4 : gameType === 'ddz' ? 3 : 5;
  const isDdz = gameType === 'ddz';

  useEffect(() => {
    setIsTrusteeship(false);
    setShowChatMenu(false);
  }, [activeRoomId, gameType]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      socketClient.on('socket_heartbeat', (data: { rttMs?: number }) => {
        if (typeof data?.rttMs === 'number') {
          setRttMs(data.rttMs);
        }
        setIsReconnecting(false);
      })
    );

    unsubs.push(
      socketClient.on('socket_reconnecting', () => {
        setIsReconnecting(true);
      })
    );

    unsubs.push(
      socketClient.on('socket_disconnected', () => {
        setIsReconnecting(true);
      })
    );

    unsubs.push(
      socketClient.on('socket_connected', () => {
        setIsReconnecting(false);
      })
    );

    unsubs.push(
      socketClient.on(
        's2c_trusteeship_changed',
        (data: { playerId?: string; seatIndex?: number; trusteeship?: boolean }) => {
          if (!data?.playerId || data.playerId === socketClient.getPlayerId()) {
            setIsTrusteeship(Boolean(data?.trusteeship));
            if (typeof data?.seatIndex === 'number') {
              setMySeatIndex(data.seatIndex);
            }
          }
        }
      )
    );

    unsubs.push(
      socketClient.on('s2c_mj_snapshot', (snap: { mySeatId?: number }) => {
        if (typeof snap?.mySeatId === 'number') {
          setMySeatIndex(snap.mySeatId);
        }
      })
    );

    unsubs.push(
      socketClient.on('s2c_niuniu_snapshot', (snap: { mySeatId?: number }) => {
        if (typeof snap?.mySeatId === 'number') {
          setMySeatIndex(snap.mySeatId);
        }
      })
    );

    unsubs.push(
      socketClient.on('s2c_lyc_snapshot', (snap: { mySeatId?: number }) => {
        if (typeof snap?.mySeatId === 'number') {
          setMySeatIndex(snap.mySeatId);
        }
      })
    );

    unsubs.push(
      socketClient.on('s2c_zjh_snapshot', (snap: { mySeat?: number; myTrusteeship?: boolean }) => {
        if (typeof snap?.mySeat === 'number' && snap.mySeat >= 0) {
          setMySeatIndex(snap.mySeat);
        }
        if (typeof snap?.myTrusteeship === 'boolean') {
          setIsTrusteeship(snap.myTrusteeship);
        }
      })
    );

    unsubs.push(
      socketClient.on(
        's2c_room_state',
        (state: { players?: Array<{ playerId: string; seatIndex?: number; trusteeship?: boolean }> }) => {
          const me = state?.players?.find((p) => p.playerId === socketClient.getPlayerId());
          if (me) {
            if (typeof me.trusteeship === 'boolean') {
              setIsTrusteeship(me.trusteeship);
            }
            if (typeof me.seatIndex === 'number') {
              setMySeatIndex(me.seatIndex);
            }
          }
        }
      )
    );

    unsubs.push(
      socketClient.on(
        's2c_chat_message',
        (msg: {
          playerId: string;
          seatIndex: number;
          nickname: string;
          text?: string;
          emoji?: string;
        }) => {
          if (!msg?.text && !msg?.emoji) return;
          soundEngine.playTap(880);
          const bubbleId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const validIcons: QuickIconKey[] = ['flame', 'sparkles', 'thumbsup', 'shield', 'coffee', 'trophy'];
          const iconKey = validIcons.includes(msg.emoji as QuickIconKey)
            ? (msg.emoji as QuickIconKey)
            : 'sparkles';
          const entry: IncomingChatBubble = {
            id: bubbleId,
            playerId: msg.playerId,
            seatIndex: msg.seatIndex,
            nickname: msg.nickname || '牌友',
            text: msg.text || '',
            iconKey,
          };
          setChatBubbles((prev) => [...prev.slice(-3), entry]);
          window.setTimeout(() => {
            setChatBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
          }, 3400);
        }
      )
    );

    unsubs.push(
      socketClient.on(
        's2c_prop_thrown',
        (evt: {
          fromSeat: number;
          toSeat: number;
          propType: string;
          fromNickname?: string;
          toNickname?: string;
        }) => {
          // DdzTableView has its own seat-bound prop animation layer
          if (gameType === 'ddz') return;
          soundEngine.playPowerChime(1);
          hapticEngine.tap();

          const fromRel = (evt.fromSeat - mySeatIndex + totalSeats) % totalSeats;
          const toRel = (evt.toSeat - mySeatIndex + totalSeats) % totalSeats;
          const startPos = getRelativeSeatAnchor(fromRel, totalSeats);
          const endPos = getRelativeSeatAnchor(toRel, totalSeats);
          const validProps: InteractivePropType[] = ['flower', 'tea', 'like', 'ingot'];
          const normalizedProp: InteractivePropType = validProps.includes(
            evt.propType as InteractivePropType
          )
            ? (evt.propType as InteractivePropType)
            : 'flower';

          const id = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const item: ActiveFlyingProp = {
            id,
            fromSeat: evt.fromSeat,
            toSeat: evt.toSeat,
            propType: normalizedProp,
            fromNickname: evt.fromNickname,
            toNickname: evt.toNickname,
            startX: startPos.x,
            startY: startPos.y,
            endX: endPos.x,
            endY: endPos.y,
          };
          setFlyingProps((prev) => [...prev.slice(-4), item]);
          window.setTimeout(() => {
            setFlyingProps((prev) => prev.filter((p) => p.id !== id));
          }, 1350);
        }
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [gameType, mySeatIndex, totalSeats]);

  const displayRoomCode =
    activeRoomId && /^\d{6}$/.test(activeRoomId) ? activeRoomId : null;

  const handleCopyRoomId = async () => {
    if (!displayRoomCode) return;
    soundEngine.playTap(820);
    hapticEngine.tap();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(displayRoomCode);
      }
    } catch {
      // Ignore clipboard restriction
    }
    setCopiedRoomId(true);
    window.setTimeout(() => setCopiedRoomId(false), 1800);
  };

  const handleToggleTrusteeship = (nextValue?: boolean) => {
    soundEngine.playTap(740);
    hapticEngine.tap();
    const target = nextValue !== undefined ? nextValue : !isTrusteeship;
    setIsTrusteeship(target);
    socketClient.emit('c2s_toggle_trusteeship', { trusteeship: target });
  };

  const handleSendQuickChat = (preset: { iconKey: QuickIconKey; text: string }) => {
    soundEngine.playTap(840);
    hapticEngine.tap();
    setShowChatMenu(false);
    socketClient.emit('c2s_send_chat', {
      emoji: preset.iconKey,
      text: preset.text,
    });
  };

  const handleThrowPropToNextOpponent = (propType: InteractivePropType, targetRelOffset = 1) => {
    const now = Date.now();
    if (now - lastPropSentAt < 750) return;
    setLastPropSentAt(now);
    soundEngine.playTap(860);
    hapticEngine.tap();
    setShowChatMenu(false);
    const targetSeat = (mySeatIndex + targetRelOffset) % totalSeats;
    socketClient.emit('c2s_throw_prop', {
      targetSeat,
      propType,
    });
  };

  const signalColorClass = isReconnecting
    ? 'text-rose-400'
    : rttMs < 85
    ? 'text-emerald-400'
    : rttMs < 180
    ? 'text-amber-300'
    : 'text-rose-400';

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none">
      {/* Parabolic Prop Keyframes */}
      <style>{`
        @keyframes hudPropArcFlight {
          0% {
            transform: translate(-50%, -50%) scale(0.65) rotate(-18deg);
            opacity: 0.2;
          }
          18% {
            opacity: 1;
          }
          50% {
            transform: translate(calc(-50% + var(--mid-dx)), calc(-50% + var(--mid-dy) - 48px)) scale(1.25) rotate(12deg);
            opacity: 1;
          }
          82% {
            transform: translate(calc(-50% + var(--end-dx)), calc(-50% + var(--end-dy))) scale(1.35) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--end-dx)), calc(-50% + var(--end-dy))) scale(1.65);
            opacity: 0;
          }
        }
      `}</style>

      {/* 1. Top-Center Silent Reconnection Banner */}
      {isReconnecting && (
        <div className="pointer-events-auto fixed top-2.5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-400/50 bg-[#1a1109]/95 px-3.5 py-1.5 text-xs font-bold text-amber-200 shadow-xl backdrop-blur-md">
          <WifiOff className="h-3.5 w-3.5 text-amber-400 animate-spin" />
          <span className="whitespace-nowrap">网络波动，正在为您静默重连恢复牌桌...</span>
        </div>
      )}

      {/* 2. Top-Right Compact Telemetry Pill: RTT Signal + Copyable 6-Digit Room Code */}
      <div
        className="pointer-events-auto fixed top-2 right-16 z-40 hidden items-center gap-1.5 sm:flex"
        style={{ right: 'max(4.5rem, env(safe-area-inset-right, 0px))' }}
      >
        {displayRoomCode && (
          <button
            type="button"
            onClick={handleCopyRoomId}
            className="flex h-7 items-center gap-1 rounded-lg border border-amber-300/30 bg-black/55 px-2 text-[11px] font-bold text-amber-100 backdrop-blur-xs transition-colors hover:border-amber-300/60 hover:bg-black/75 active:scale-95 whitespace-nowrap cursor-pointer"
            title="点击复制房间号邀请好友"
          >
            <span className="font-mono tabular-nums">房号:{displayRoomCode}</span>
            {copiedRoomId ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-amber-300/80" />
            )}
          </button>
        )}

        <div
          className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-black/50 px-2 text-[11px] backdrop-blur-xs"
          title="实时网络往返延迟 (RTT)"
        >
          <Wifi className={`h-3 w-3 ${signalColorClass}`} />
          <span className={`font-mono font-bold tabular-nums ${signalColorClass}`}>
            {isReconnecting ? '重连中' : `${rttMs}ms`}
          </span>
        </div>
      </div>

      {/* 3. Incoming Chat Broadcast Bubbles (Zero hardcoded text emojis, pure vector icons) */}
      {!isDdz && chatBubbles.length > 0 && (
        <div className="pointer-events-none fixed top-14 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1.5">
          {chatBubbles.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300/40 bg-[#141822]/92 px-3 py-1 text-xs text-white shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            >
              {renderChatVectorIcon(b.iconKey)}
              <span className="font-bold text-amber-300">{b.nickname}：</span>
              <span className="text-white/95">{b.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Parabolic Interactive Prop Flight Layer */}
      {!isDdz &&
        flyingProps.map((prop) => {
          const dxVw = prop.endX - prop.startX;
          const dyVh = prop.endY - prop.startY;
          return (
            <div
              key={prop.id}
              className="pointer-events-none fixed z-50 flex flex-col items-center justify-center"
              style={
                {
                  left: `${prop.startX}vw`,
                  top: `${prop.startY}vh`,
                  '--mid-dx': `${dxVw * 0.5}vw`,
                  '--mid-dy': `${dyVh * 0.5}vh`,
                  '--end-dx': `${dxVw}vw`,
                  '--end-dy': `${dyVh}vh`,
                  animation: 'hudPropArcFlight 1.25s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                } as React.CSSProperties
              }
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/60 bg-black/55 shadow-[0_0_24px_rgba(251,191,36,0.55)] backdrop-blur-xs">
                <img
                  src="/assets/ui/fx_light_burst.png"
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full scale-150 object-contain opacity-75 animate-spin"
                />
                <div className="relative z-10">{renderPropGraphic(prop.propType, 'h-8 w-8')}</div>
              </div>
              {prop.fromNickname && prop.toNickname && (
                <span className="mt-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-amber-200 whitespace-nowrap shadow">
                  {prop.fromNickname} 赠 {prop.toNickname}
                </span>
              )}
            </div>
          );
        })}

      {/* 5. Bottom-Right Floating Quick-Chat / Props & AI Trusteeship Controls (Hidden on DDZ where native controls exist) */}
      {!isDdz && (
        <div
          className="pointer-events-auto fixed bottom-2.5 right-2.5 z-40 flex items-center gap-1.5"
          style={{
            bottom: 'max(0.55rem, env(safe-area-inset-bottom, 0px))',
            right: 'max(0.65rem, env(safe-area-inset-right, 0px))',
          }}
        >
          {/* Quick-Chat & Interactive Prop Drawer */}
          <div className="relative">
            {showChatMenu && (
              <div className="absolute right-0 bottom-10 mb-1 w-68 rounded-2xl border border-amber-300/30 bg-[#141822]/95 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDrawerTab('chat')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                        drawerTab === 'chat'
                          ? 'bg-amber-400 text-[#1c1008]'
                          : 'text-amber-100/75 hover:text-white'
                      }`}
                    >
                      快捷语
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerTab('props')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                        drawerTab === 'props'
                          ? 'bg-amber-400 text-[#1c1008]'
                          : 'text-amber-100/75 hover:text-white'
                      }`}
                    >
                      互动礼仪
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChatMenu(false)}
                    className="text-white/50 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {drawerTab === 'chat' ? (
                  <div className="flex flex-col gap-1">
                    {QUICK_CHAT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuickChat(preset)}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white/85 transition-colors hover:bg-amber-500/20 hover:text-amber-200 active:scale-98 cursor-pointer"
                      >
                        {renderChatVectorIcon(preset.iconKey)}
                        <span className="truncate">{preset.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {INTERACTIVE_PROPS.map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleThrowPropToNextOpponent(item.type, 1)}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-bold transition-transform active:scale-95 cursor-pointer ${item.accentClass}`}
                        >
                          {renderPropGraphic(item.type, 'h-4 w-4')}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-1 text-[10px] text-white/50">
                      <span>点击向牌桌邻座赠送互动礼仪</span>
                      <Coins className="h-3 w-3 text-amber-300/70" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playTap(760);
                setShowChatMenu((prev) => !prev);
              }}
              className="flex h-8 items-center gap-1 rounded-xl border border-amber-300/30 bg-[#141822]/85 px-2.5 text-xs font-bold text-amber-100 shadow-md backdrop-blur-xs transition-all hover:border-amber-300/60 hover:bg-[#1e2433] active:scale-95 whitespace-nowrap cursor-pointer"
              title="牌桌快捷语与互动礼仪"
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden sm:inline">互动</span>
            </button>
          </div>

          {/* AI Trusteeship Toggle Button */}
          <button
            type="button"
            onClick={() => handleToggleTrusteeship()}
            className={`flex h-8 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold shadow-md backdrop-blur-xs transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
              isTrusteeship
                ? 'border-amber-300 bg-amber-500 text-[#18181B]'
                : 'border-amber-300/30 bg-[#141822]/85 text-amber-100 hover:border-amber-300/60 hover:bg-[#1e2433]'
            }`}
            title={isTrusteeship ? '点击取消 AI 托管' : '开启 AI 智能代打托管'}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>{isTrusteeship ? '托管中' : '托管'}</span>
          </button>
        </div>
      )}

      {/* 6. Prominent Active AI Trusteeship Banner (Click anywhere on banner to resume manual control) */}
      {!isDdz && isTrusteeship && (
        <div className="pointer-events-auto fixed bottom-12 left-1/2 z-40 -translate-x-1/2">
          <button
            type="button"
            onClick={() => handleToggleTrusteeship(false)}
            className="flex items-center gap-2 rounded-2xl border border-amber-300/70 bg-[#181b26]/95 px-4 py-2 text-xs font-extrabold text-amber-200 shadow-2xl backdrop-blur-md transition-transform hover:scale-102 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Bot className="h-4 w-4 text-amber-400" />
            <span>AI 智能托管代打中 · 点击恢复手动操作</span>
          </button>
        </div>
      )}
    </div>
  );
};

