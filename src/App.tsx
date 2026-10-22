import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const DdzTableView = React.lazy(() =>
  import('./games/ddz/DdzTableView').then((m) => ({ default: m.DdzTableView }))
);
const MahjongTableView = React.lazy(() =>
  import('./games/mahjong/MahjongTableView').then((m) => ({ default: m.MahjongTableView }))
);
const NiuniuTableView = React.lazy(() =>
  import('./games/niuniu/NiuniuTableView').then((m) => ({ default: m.NiuniuTableView }))
);

const ZhajinhuaTableView = React.lazy(() =>
  import('./games/zhajinhua/ZhajinhuaTableView').then((m) => ({ default: m.ZhajinhuaTableView }))
);

const GameLoadingFallback: React.FC<{ gameType: string | null }> = ({ gameType }) => {
  const getGameLabel = () => {
    if (gameType === 'mahjong') return '麻将';
    if (gameType === 'niuniu') return '抢庄牛牛';
    if (gameType === 'zhajinhua') return '炸金花';
    return '斗地主';
  };
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#07150e] text-amber-200 select-none">
      <div className="relative flex flex-col items-center gap-3">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
          <Loader2 className="h-10 w-10 animate-spin text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
        </div>
        <span className="font-display text-base font-black tracking-wider text-amber-300 drop-shadow">
          正在进入 {getGameLabel()} 对局
        </span>
        <span className="text-xs font-serif text-amber-200/60 tracking-widest">
          加载游戏引擎与商业牌桌算法...
        </span>
      </div>
    </div>
  );
};
import { DealMode } from './games/ddz/types';
import {
  HallView,
  MatchRecord,
  RoomSummary,
  UserProfile,
} from './hall/HallView';
import { soundEngine } from './shared/audio/SoundEngine';
import { socketClient } from './shared/network/SocketClient';
import {
  requestUniversalFullscreen,
  exitUniversalFullscreen,
  detectFullscreenCapabilities,
} from './shared/utils/fullscreenHelper';

export type ResolutionTier = 'compact_mobile' | 'wide_mobile' | 'ultrawide' | 'tablet_desktop';

/**
 * Percentage-based layout matrix (0% - 100%) guaranteeing zero overlap and zero edge clipping
 * between Hand Operation Zone, Played Cards Zone, Action Bar, and Avatar HUDs
 * across all mainstream mobile, tablet, desktop, and ultrawide landscape resolutions.
 */
export interface LayoutZonePercentages {
  sideMarginPct: number;
  topBarTopPct: number;
  holeCardsTopPct: number;
  scoreLineTopPct: number;
  recorderTopPct: number;
  avatarTopPct: number;
  opponentDeckSideXPct: number;
  opponentDeckTopPct: number;
  turnClockSideXPct: number;
  turnClockBottomTopPct: number;
  playedSideXPct: number;
  playedSideTopPct: number;
  playedBottomTopPct: number;
  actionBarTopPct: number;
  comboBannerTopPct: number;
  handBandTopPct: number;
  handCenterYPct: number;
  handBandBottomPct: number;
  handWidthPct: number;
  handCardScale: number;
  bottomDockBottomPct: number;
}

export interface ViewportMetrics {
  width: number;
  height: number;
  aspectRatio: number;
  tier: ResolutionTier;
  isCompactMobileLandscape: boolean;
  /** Continuously interpolated UI scale factor (0.78 ~ 1.0) without breakpoint jumps */
  uiElementScale: number;
  zones: LayoutZonePercentages;
}

const PERCENTAGE_PROFILES: Record<ResolutionTier, LayoutZonePercentages> = {
  // Small-screen mobile landscape (e.g., 667x375, 640x360, 740x360)
  compact_mobile: {
    sideMarginPct: 2.8,
    topBarTopPct: 2.6,
    holeCardsTopPct: 8.2,
    scoreLineTopPct: 15.6,
    recorderTopPct: 17.4,
    avatarTopPct: 13.0,
    opponentDeckSideXPct: 7.2,
    opponentDeckTopPct: 29.8,
    turnClockSideXPct: 15.0,
    turnClockBottomTopPct: 45.8,
    playedSideXPct: 27.4,
    playedSideTopPct: 30.2,
    playedBottomTopPct: 39.2,
    actionBarTopPct: 52.4,
    comboBannerTopPct: 61.8,
    handBandTopPct: 63.0,
    handCenterYPct: 76.8,
    handBandBottomPct: 88.6,
    handWidthPct: 68.0,
    handCardScale: 0.98,
    bottomDockBottomPct: 2.4,
  },
  // Standard full-screen mobile landscape (e.g., 800x375, 812x375, 18:9 ~ 19:9)
  wide_mobile: {
    sideMarginPct: 3.6,
    topBarTopPct: 2.8,
    holeCardsTopPct: 8.4,
    scoreLineTopPct: 15.8,
    recorderTopPct: 17.6,
    avatarTopPct: 13.4,
    opponentDeckSideXPct: 7.6,
    opponentDeckTopPct: 30.2,
    turnClockSideXPct: 15.4,
    turnClockBottomTopPct: 46.2,
    playedSideXPct: 27.8,
    playedSideTopPct: 30.6,
    playedBottomTopPct: 39.6,
    actionBarTopPct: 52.8,
    comboBannerTopPct: 62.2,
    handBandTopPct: 63.4,
    handCenterYPct: 77.0,
    handBandBottomPct: 88.8,
    handWidthPct: 66.5,
    handCardScale: 1.0,
    bottomDockBottomPct: 2.6,
  },
  // Ultrawide mobile & display landscape (>= 19.5:9 / 20:9 / 21:9, e.g., 844x390, 915x412, 932x430, 2560x1080)
  ultrawide: {
    sideMarginPct: 4.8,
    topBarTopPct: 3.0,
    holeCardsTopPct: 8.6,
    scoreLineTopPct: 16.2,
    recorderTopPct: 18.0,
    avatarTopPct: 13.8,
    opponentDeckSideXPct: 8.4,
    opponentDeckTopPct: 30.6,
    turnClockSideXPct: 16.2,
    turnClockBottomTopPct: 46.0,
    playedSideXPct: 28.4,
    playedSideTopPct: 30.8,
    playedBottomTopPct: 39.4,
    actionBarTopPct: 52.5,
    comboBannerTopPct: 61.8,
    handBandTopPct: 63.2,
    handCenterYPct: 76.5,
    handBandBottomPct: 88.2,
    handWidthPct: 64.0,
    handCardScale: 0.96,
    bottomDockBottomPct: 2.8,
  },
  // Tablet & Desktop landscape (>= 960x540, 4:3 / 16:10 / 16:9)
  tablet_desktop: {
    sideMarginPct: 3.2,
    topBarTopPct: 2.6,
    holeCardsTopPct: 8.2,
    scoreLineTopPct: 15.6,
    recorderTopPct: 17.4,
    avatarTopPct: 13.0,
    opponentDeckSideXPct: 7.2,
    opponentDeckTopPct: 30.0,
    turnClockSideXPct: 15.0,
    turnClockBottomTopPct: 46.6,
    playedSideXPct: 27.6,
    playedSideTopPct: 30.4,
    playedBottomTopPct: 40.0,
    actionBarTopPct: 53.4,
    comboBannerTopPct: 62.6,
    handBandTopPct: 63.8,
    handCenterYPct: 77.5,
    handBandBottomPct: 89.2,
    handWidthPct: 67.5,
    handCardScale: 1.02,
    bottomDockBottomPct: 2.4,
  },
};

function lerp(a: number, b: number, t: number): number {
  return Number((a + (b - a) * t).toFixed(3));
}

function interpolateZones(
  z1: LayoutZonePercentages,
  z2: LayoutZonePercentages,
  t: number
): LayoutZonePercentages {
  return {
    sideMarginPct: lerp(z1.sideMarginPct, z2.sideMarginPct, t),
    topBarTopPct: lerp(z1.topBarTopPct, z2.topBarTopPct, t),
    holeCardsTopPct: lerp(z1.holeCardsTopPct, z2.holeCardsTopPct, t),
    scoreLineTopPct: lerp(z1.scoreLineTopPct, z2.scoreLineTopPct, t),
    recorderTopPct: lerp(z1.recorderTopPct, z2.recorderTopPct, t),
    avatarTopPct: lerp(z1.avatarTopPct, z2.avatarTopPct, t),
    opponentDeckSideXPct: lerp(z1.opponentDeckSideXPct, z2.opponentDeckSideXPct, t),
    opponentDeckTopPct: lerp(z1.opponentDeckTopPct, z2.opponentDeckTopPct, t),
    turnClockSideXPct: lerp(z1.turnClockSideXPct, z2.turnClockSideXPct, t),
    turnClockBottomTopPct: lerp(z1.turnClockBottomTopPct, z2.turnClockBottomTopPct, t),
    playedSideXPct: lerp(z1.playedSideXPct, z2.playedSideXPct, t),
    playedSideTopPct: lerp(z1.playedSideTopPct, z2.playedSideTopPct, t),
    playedBottomTopPct: lerp(z1.playedBottomTopPct, z2.playedBottomTopPct, t),
    actionBarTopPct: lerp(z1.actionBarTopPct, z2.actionBarTopPct, t),
    comboBannerTopPct: lerp(z1.comboBannerTopPct, z2.comboBannerTopPct, t),
    handBandTopPct: lerp(z1.handBandTopPct, z2.handBandTopPct, t),
    handCenterYPct: lerp(z1.handCenterYPct, z2.handCenterYPct, t),
    handBandBottomPct: lerp(z1.handBandBottomPct, z2.handBandBottomPct, t),
    handWidthPct: lerp(z1.handWidthPct, z2.handWidthPct, t),
    handCardScale: lerp(z1.handCardScale, z2.handCardScale, t),
    bottomDockBottomPct: lerp(z1.bottomDockBottomPct, z2.bottomDockBottomPct, t),
  };
}

/**
 * Compute C1-continuous Hermite-smoothed `--ui-element-scale` (0.78 ~ 1.0)
 * from actual rendered container dimensions so resizing never produces visual step discontinuities.
 */
export function computeSmoothUiElementScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  const effW = Math.max(width, height);
  const effH = Math.min(width, height);
  const ratioW = effW / 1100;
  const ratioH = effH / 560;
  const aspect = effH > 0 ? effW / effH : 1.78;
  // On ultrawide aspect ratios (> 1.95), slightly damp scale so HUD elements stay compact vertically
  const aspectDamp = aspect > 1.95 ? Math.max(0.9, 1 - (aspect - 1.95) * 0.18) : 1;
  const effectiveRatio = Math.min(ratioW, ratioH) * aspectDamp;

  // Normalize effectiveRatio from [0.52 .. 1.0] into [0 .. 1]
  const rawT = Math.max(0, Math.min(1, (effectiveRatio - 0.52) / (1.0 - 0.52)));
  // Smoothstep (3t^2 - 2t^3) eliminates any derivative discontinuity at breakpoints
  const smoothT = rawT * rawT * (3 - 2 * rawT);
  return Number((0.78 + smoothT * 0.22).toFixed(4));
}

export function computeSmoothUiFontScale(uiElementScale: number): number {
  // Gently modulate font scale (0.86 ~ 1.0) in lockstep with --ui-element-scale
  const normalized = Math.max(0, Math.min(1, (uiElementScale - 0.78) / 0.22));
  return Number((0.86 + normalized * 0.14).toFixed(4));
}

export function computeViewportMetrics(rawW?: number, rawH?: number): ViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      width: 1334,
      height: 750,
      aspectRatio: 1334 / 750,
      tier: 'tablet_desktop',
      isCompactMobileLandscape: false,
      uiElementScale: 1,
      zones: PERCENTAGE_PROFILES.tablet_desktop,
    };
  }
  const vv = window.visualViewport;
  const width = Math.round(rawW ?? (vv ? vv.width : window.innerWidth));
  const height = Math.round(rawH ?? (vv ? vv.height : window.innerHeight));

  // Normalize effective landscape dimensions so portrait-held devices using AutoLandscapeContainer
  // and native landscape devices evaluate aspect ratio and tiers identically
  const effW = Math.max(width, height);
  const effH = Math.min(width, height);
  const aspectRatio = effH > 0 ? Number((effW / effH).toFixed(4)) : 1.78;

  const uiElementScale = computeSmoothUiElementScale(effW, effH);

  // Continuous size parameter s in [0 .. 1] based on effective dimension ratio
  const effectiveRatio = Math.min(effW / 1100, effH / 560);
  const sRaw = Math.max(0, Math.min(1, (effectiveRatio - 0.52) / (1.0 - 0.52)));
  const s = sRaw * sRaw * (3 - 2 * sRaw);

  let baseTier: ResolutionTier = 'tablet_desktop';
  let baseZones: LayoutZonePercentages;

  if (s < 0.45) {
    baseTier = 'compact_mobile';
    const localT = s / 0.45;
    baseZones = interpolateZones(
      PERCENTAGE_PROFILES.compact_mobile,
      PERCENTAGE_PROFILES.wide_mobile,
      localT
    );
  } else if (s < 0.85) {
    baseTier = 'wide_mobile';
    const localT = (s - 0.45) / 0.4;
    baseZones = interpolateZones(
      PERCENTAGE_PROFILES.wide_mobile,
      PERCENTAGE_PROFILES.tablet_desktop,
      localT
    );
  } else {
    baseTier = 'tablet_desktop';
    baseZones = PERCENTAGE_PROFILES.tablet_desktop;
  }

  // Smoothly blend toward the Ultrawide profile as aspect ratio exceeds 1.85 (18.5:9 -> 20:9 / 21:9)
  const ultraRaw = Math.max(0, Math.min(1, (aspectRatio - 1.85) / (2.22 - 1.85)));
  const ultraSmooth = ultraRaw * ultraRaw * (3 - 2 * ultraRaw);
  const zones =
    ultraSmooth > 0
      ? interpolateZones(baseZones, PERCENTAGE_PROFILES.ultrawide, ultraSmooth)
      : baseZones;

  const tier: ResolutionTier = aspectRatio >= 1.98 ? 'ultrawide' : baseTier;

  return {
    width,
    height,
    aspectRatio,
    tier,
    isCompactMobileLandscape: tier !== 'tablet_desktop' && effH < 560,
    uiElementScale,
    zones,
  };
}

/**
 * Reusable Responsive Landscape Container with a built-in ResizeObserver that
 * inspects the container's actual rendered size (`contentRect` / `contentBoxSize`)
 * and dynamically fine-tunes `--ui-element-scale` and `--ui-font-scale` via
 * frame-smoothed interpolation so buttons and typography transition without visual discontinuities.
 */
export const ResponsiveLayoutContainer: React.FC<{
  viewport: ViewportMetrics;
  onContainerResize?: (metrics: ViewportMetrics) => void;
  children: React.ReactNode;
}> = ({ viewport, onContainerResize, children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentScaleRef = useRef<number>(viewport.uiElementScale);
  const targetScaleRef = useRef<number>(viewport.uiElementScale);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const animateScaleStep = () => {
      const current = currentScaleRef.current;
      const target = targetScaleRef.current;
      const diff = target - current;

      if (Math.abs(diff) <= 0.0008) {
        currentScaleRef.current = target;
        const fontScale = computeSmoothUiFontScale(target);
        el.style.setProperty('--ui-element-scale', String(target));
        el.style.setProperty('--ui-font-scale', String(fontScale));
        rafRef.current = null;
        return;
      }

      // Smooth exponential damping across frames
      const next = Number((current + diff * 0.32).toFixed(4));
      currentScaleRef.current = next;
      const fontScale = computeSmoothUiFontScale(next);
      el.style.setProperty('--ui-element-scale', String(next));
      el.style.setProperty('--ui-font-scale', String(fontScale));
      rafRef.current = requestAnimationFrame(animateScaleStep);
    };

    const applyMeasuredSize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const nextMetrics = computeViewportMetrics(w, h);
      targetScaleRef.current = nextMetrics.uiElementScale;
      el.style.setProperty('--side-margin-pct', `${nextMetrics.zones.sideMarginPct}%`);

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animateScaleStep);
      }
      onContainerResize?.(nextMetrics);
    };

    // Initial measurement from actual DOM bounding box
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      applyMeasuredSize(rect.width, rect.height);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      const width = box ? box.inlineSize : entry.contentRect.width;
      const height = box ? box.blockSize : entry.contentRect.height;
      applyMeasuredSize(width, height);
    });

    observer.observe(el);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      observer.disconnect();
    };
  }, [onContainerResize]);

  return (
    <div
      ref={containerRef}
      data-resolution-tier={viewport.tier}
      style={
        {
          width: '100dvw',
          height: '100dvh',
          '--ui-element-scale': currentScaleRef.current,
          '--ui-font-scale': computeSmoothUiFontScale(currentScaleRef.current),
          '--side-margin-pct': `${viewport.zones.sideMarginPct}%`,
        } as React.CSSProperties
      }
      className="ui-scale-smooth relative h-[100dvh] w-[100dvw] overflow-hidden overscroll-none bg-[#041810] select-none touch-manipulation"
    >
      {children}
    </div>
  );
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomGameType, setActiveRoomGameType] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportMetrics>(() => computeViewportMetrics());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const handleContainerResize = useCallback((nextMetrics: ViewportMetrics) => {
    setViewport((prev) => {
      if (
        prev.width === nextMetrics.width &&
        prev.height === nextMetrics.height &&
        prev.uiElementScale === nextMetrics.uiElementScale
      ) {
        return prev;
      }
      return nextMetrics;
    });
  }, []);

  // Track visualViewport & fullscreen changes across all mobile phone resolutions
  useEffect(() => {
    const syncViewport = () => {
      setViewport(computeViewportMetrics());
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    document.addEventListener('fullscreenchange', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      document.removeEventListener('fullscreenchange', syncViewport);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      const caps = detectFullscreenCapabilities();
      if (!caps.isCurrentlyFullscreen) {
        await requestUniversalFullscreen();
      } else {
        await exitUniversalFullscreen();
      }
    } catch {
      // Ignore fullscreen restriction in embedded iframes
    }
  }, []);

  useEffect(() => {
    socketClient.connect();

    const unsubs: Array<() => void> = [];

    unsubs.push(
      socketClient.on('s2c_auth_success', (data) => {
        if (data.profile) {
          setProfile(data.profile);
        }
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
        if (data.activeRoomId) {
          setActiveRoomId(data.activeRoomId);
          if (data.activeGameType) {
            setActiveRoomGameType(data.activeGameType);
          }
        }
        socketClient.emit('c2s_get_lobby_data');
      })
    );

    unsubs.push(
      socketClient.on('s2c_lobby_data', (data) => {
        if (data.profile) setProfile(data.profile);
        if (Array.isArray(data.rooms)) setRooms(data.rooms);
        if (Array.isArray(data.leaderboard)) setLeaderboard(data.leaderboard);
        if (Array.isArray(data.matches)) setMatches(data.matches);
      })
    );

    unsubs.push(
      socketClient.on('s2c_profile_updated', (data) => {
        if (data.profile) {
          setProfile(data.profile);
          localStorage.setItem('h5_game_nickname', data.profile.nickname);
          localStorage.setItem('h5_game_avatar', data.profile.avatarId);
        }
        if (data.notice) {
          showNotice(data.notice);
        }
      })
    );

    unsubs.push(
      socketClient.on('s2c_rooms_updated', (data) => {
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
      })
    );

    unsubs.push(
      socketClient.on('s2c_room_joined', (data) => {
        soundEngine.playTap(760);
        setActiveRoomId(data.roomId);
        if (data.gameType) {
          setActiveRoomGameType(data.gameType);
        }
      })
    );

    unsubs.push(
      socketClient.on('s2c_left_room', (data) => {
        setActiveRoomId(null);
        setActiveRoomGameType(null);
        soundEngine.startBgm('lobby');
        if (data?.profile) setProfile(data.profile);
        if (Array.isArray(data?.rooms)) setRooms(data.rooms);
        socketClient.emit('c2s_get_lobby_data');
      })
    );

    unsubs.push(
      socketClient.on('s2c_action_error', (data) => {
        if (data?.message) {
          showNotice(data.message);
        }
      })
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [showNotice]);

  const handleQuickMatch = (
    baseScore: number,
    fillBots: boolean,
    mode: DealMode = 'classic'
  ) => {
    soundEngine.playTap(720);
    setActiveRoomGameType('ddz');
    socketClient.emit('c2s_quick_match', { gameType: 'ddz', baseScore, fillBots, mode });
  };

  const handleQuickMatchMahjong = (baseScore = 100, mode = 'puer') => {
    soundEngine.playTap(720);
    setActiveRoomGameType('mahjong');
    socketClient.emit('c2s_quick_match', {
      gameType: 'mahjong',
      baseScore,
      fillBots: true,
      mode,
    });
  };

  const handleQuickMatchNiuniu = (baseScore = 100, mode = 'qiangzhuang') => {
    soundEngine.playTap(720);
    setActiveRoomGameType('niuniu');
    setActiveRoomId('room_niuniu_quick');
    socketClient.emit('c2s_quick_match', {
      gameType: 'niuniu',
      baseScore,
      fillBots: true,
      mode,
    });
  };

  const handleQuickMatchZhajinhua = (baseScore = 100, mode = 'classic') => {
    soundEngine.playTap(720);
    setActiveRoomGameType('zhajinhua');
    setActiveRoomId('room_zhajinhua_quick');
    socketClient.emit('c2s_quick_match', {
      gameType: 'zhajinhua',
      baseScore,
      fillBots: true,
      mode,
    });
  };

  const handleCreateRoom = (
    baseScore: number,
    isPrivate: boolean,
    autoFillBots: boolean,
    mode: DealMode = 'classic'
  ) => {
    soundEngine.playTap(720);
    setActiveRoomGameType('ddz');
    socketClient.emit('c2s_create_room', {
      gameType: 'ddz',
      baseScore,
      isPrivate,
      autoFillBots,
      mode,
    });
  };

  const handleJoinRoom = (roomId: string) => {
    soundEngine.playTap(720);
    socketClient.emit('c2s_join_room', { roomId });
  };

  const handleRefreshLobby = () => {
    soundEngine.playTap(640);
    soundEngine.startBgm('lobby');
    socketClient.emit('c2s_get_lobby_data');
  };

  const handleClaimSupply = () => {
    soundEngine.playTap(840);
    soundEngine.startBgm('lobby');
    socketClient.emit('c2s_claim_supply');
  };

  const handleUpdateProfile = (nickname: string, avatarId: string) => {
    soundEngine.playTap(720);
    soundEngine.startBgm('lobby');
    socketClient.emit('c2s_update_profile', { nickname, avatarId });
  };

  return (
    <ResponsiveLayoutContainer
      viewport={viewport}
      onContainerResize={handleContainerResize}
    >
      {activeRoomId ? (
        <Suspense fallback={<GameLoadingFallback gameType={activeRoomGameType} />}>
          {activeRoomGameType === 'mahjong' ? (
            <MahjongTableView
              viewport={viewport}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onLeaveRoom={() => {
                setActiveRoomId(null);
                setActiveRoomGameType(null);
                exitUniversalFullscreen().catch(() => {});
                soundEngine.startBgm('lobby');
                socketClient.emit('c2s_get_lobby_data');
              }}
            />
          ) : activeRoomGameType === 'zhajinhua' ? (
            <ZhajinhuaTableView
              viewport={viewport}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onLeaveRoom={() => {
                setActiveRoomId(null);
                setActiveRoomGameType(null);
                exitUniversalFullscreen().catch(() => {});
                soundEngine.startBgm('lobby');
                socketClient.emit('c2s_get_lobby_data');
              }}
            />
          ) : activeRoomGameType === 'niuniu' ? (
            <NiuniuTableView
              viewport={viewport}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onLeaveRoom={() => {
                setActiveRoomId(null);
                setActiveRoomGameType(null);
                exitUniversalFullscreen().catch(() => {});
                soundEngine.startBgm('lobby');
                socketClient.emit('c2s_get_lobby_data');
              }}
            />
          ) : (
            <DdzTableView
              viewport={viewport}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              onLeaveRoom={() => {
                setActiveRoomId(null);
                setActiveRoomGameType(null);
                exitUniversalFullscreen().catch(() => {});
                soundEngine.startBgm('lobby');
                socketClient.emit('c2s_get_lobby_data');
              }}
            />
          )}
        </Suspense>
      ) : (
        <HallView
          profile={profile}
          rooms={rooms}
          leaderboard={leaderboard}
          matches={matches}
          notice={notice}
          viewport={viewport}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onQuickMatch={handleQuickMatch}
          onQuickMatchMahjong={handleQuickMatchMahjong}
          onQuickMatchNiuniu={handleQuickMatchNiuniu}
          onQuickMatchZhajinhua={handleQuickMatchZhajinhua}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onRefreshLobby={handleRefreshLobby}
          onClaimSupply={handleClaimSupply}
          onUpdateProfile={handleUpdateProfile}
        />
      )}
    </ResponsiveLayoutContainer>
  );
}
