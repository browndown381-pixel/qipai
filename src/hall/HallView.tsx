import React, { useEffect, useMemo, useState } from 'react';
import { soundEngine } from '../shared/audio/SoundEngine';
import { hapticEngine } from '../shared/haptics/HapticEngine';
import {
  DealMode,
  MatchReplayRecord,
  Rank,
  ROOM_TIER_CONFIGS,
  RoomTierConfig,
} from '../games/ddz/types';
import { PuzzleChallengeModal } from '../games/ddz/components/PuzzleChallengeModal';
import { ReplayViewerModal } from '../games/ddz/components/ReplayViewerModal';
import { RegionalGamePortal } from './RegionalGamePortal';
import { AmbientParticles } from './components/AmbientParticles';
import { HallHeader } from './components/HallHeader';
import { HallFooter } from './components/HallFooter';
import { DdzArenaGrid } from './components/DdzArenaGrid';
import { MahjongArenaGrid } from './components/MahjongArenaGrid';
import { NiuniuArenaGrid } from './components/NiuniuArenaGrid';
import { ZjhArenaGrid } from './components/ZjhArenaGrid';
import { QuickStartFab } from './components/QuickStartFab';
import { CommercialTierCardSpec } from './components/TierCard';
import { InsufficientBeansModal } from './components/modals/InsufficientBeansModal';
import { FriendRoomModal } from './components/modals/FriendRoomModal';
import { DailySignInModal } from './components/modals/DailySignInModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { MatchRecordsModal } from './components/modals/MatchRecordsModal';
import { PublicRoomsModal } from './components/modals/PublicRoomsModal';
import { ProfileEditorModal } from './components/modals/ProfileEditorModal';
import { SettingsModal } from './components/modals/SettingsModal';
import type { ViewportMetrics } from '../App';

export interface UserProfile {
  playerId: string;
  nickname: string;
  avatarId: string;
  roomCards: number;
  beans: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface RoomSummary {
  roomId: string;
  gameType: string;
  mode?: string;
  hostId: string;
  baseScore: number;
  isPrivate: boolean;
  status: string;
  playerCount: number;
  maxPlayers: number;
  players: Array<{ nickname: string; avatarId: string; isBot: boolean }>;
}

export interface MatchRecord {
  id: string;
  roomId: string;
  gameType: string;
  dealMode?: DealMode;
  wildRanks?: Rank[];
  timestamp: number;
  baseScore: number;
  multiplier: number;
  winnerSide: string;
  players: Array<{
    playerId: string;
    nickname: string;
    role: string;
    scoreDelta: number;
    isWinner: boolean;
  }>;
  replay?: MatchReplayRecord;
}

export interface HallViewProps {
  profile: UserProfile | null;
  rooms: RoomSummary[];
  leaderboard: UserProfile[];
  matches: MatchRecord[];
  notice: string | null;
  viewport?: ViewportMetrics;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onQuickMatch: (
    baseScore: number,
    fillBots: boolean,
    mode?: DealMode
  ) => void;
  onQuickMatchMahjong?: (baseScore?: number, mode?: string) => void;
  onQuickMatchNiuniu?: (baseScore?: number, mode?: string) => void;
  onQuickMatchZhajinhua?: (baseScore?: number, mode?: string) => void;
  onCreateRoom: (
    baseScore: number,
    isPrivate: boolean,
    autoFillBots: boolean,
    mode?: DealMode
  ) => void;
  onJoinRoom: (roomId: string) => void;
  onRefreshLobby: () => void;
  onClaimSupply: () => void;
  onUpdateProfile: (nickname: string, avatarId: string) => void;
}

export type DdzArenaMode = 'classic' | 'tiandi_laizi' | 'no_shuffle' | 'puzzle';
type PlatformModalType = 'rooms' | 'leaderboard' | 'records' | 'signin' | null;

export const HallView: React.FC<HallViewProps> = ({
  profile,
  rooms,
  leaderboard,
  matches,
  notice,
  viewport,
  isFullscreen,
  onToggleFullscreen,
  onQuickMatch,
  onQuickMatchMahjong,
  onQuickMatchNiuniu,
  onQuickMatchZhajinhua,
  onCreateRoom,
  onJoinRoom,
  onRefreshLobby,
  onClaimSupply,
  onUpdateProfile,
}) => {
  const isMobileLandscape = useMemo(() => {
    if (viewport) {
      return viewport.tier !== 'tablet_desktop' && viewport.aspectRatio > 1.25;
    }
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight && window.innerHeight < 550;
    }
    return false;
  }, [viewport]);
  const [portalStage, setPortalStage] = useState<'main_portal' | 'ddz_subhall' | 'mahjong_subhall' | 'niuniu_subhall' | 'zhajinhua_subhall'>('main_portal');
  const [ddzArenaMode, setDdzArenaMode] = useState<DdzArenaMode>('classic');
  const [selectedBaseScore, setSelectedBaseScore] = useState<number>(100);
  const [selectedDealMode, setSelectedDealMode] = useState<DealMode>('classic');

  // Modals state
  const [insufficientTier, setInsufficientTier] = useState<RoomTierConfig | null>(null);
  const [showFriendRoomModal, setShowFriendRoomModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [platformModal, setPlatformModal] = useState<PlatformModalType>(null);
  const [showPuzzleModal, setShowPuzzleModal] = useState<boolean>(false);
  const [puzzleInitLevelIdx, setPuzzleInitLevelIdx] = useState<number>(0);
  const [activeReplay, setActiveReplay] = useState<MatchReplayRecord | null>(null);
  const [loadingReplayId, setLoadingReplayId] = useState<string | null>(null);

  // Extras
  const [bonusRoomCards, setBonusRoomCards] = useState<number>(0);
  const [roomCardToast, setRoomCardToast] = useState<string | null>(null);

  useEffect(() => {
    soundEngine.startBgm('lobby');
  }, []);

  const myBeans = profile?.beans ?? 12000;
  const myRoomCards = (profile?.roomCards ?? 28) + bonusRoomCards;
  const isBankruptAlert = myBeans < 3000;

  const displayNumericId = useMemo(() => {
    const raw = profile?.playerId ?? '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 6) return digits.slice(0, 6);
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash * 31 + raw.charCodeAt(i)) % 900000;
    }
    return String(100000 + Math.abs(hash || 768924));
  }, [profile?.playerId]);

  const recommendedTier = useMemo(() => {
    return (
      [...ROOM_TIER_CONFIGS].reverse().find((t) => myBeans >= t.minBeans) ??
      ROOM_TIER_CONFIGS[0]
    );
  }, [myBeans]);

  const handleClaimRoomCards = () => {
    soundEngine.playPowerChime(2);
    hapticEngine.tap();
    setBonusRoomCards((prev) => prev + 5);
    setRoomCardToast('已免费领取 +5 张好友房卡');
    window.setTimeout(() => setRoomCardToast(null), 2200);
  };

  const handleOpenMatchReplay = async (match: MatchRecord) => {
    soundEngine.playTap(780);
    hapticEngine.selectCard();
    if (match.replay) {
      setActiveReplay(match.replay);
      return;
    }
    try {
      setLoadingReplayId(match.id);
      const resp = await fetch(`/api/replay/${encodeURIComponent(match.id)}`);
      if (!resp.ok) return;
      const data = (await resp.json()) as { replay?: MatchReplayRecord };
      if (data.replay) {
        setActiveReplay(data.replay);
      }
    } catch {
      // Ignore network error
    } finally {
      setLoadingReplayId(null);
    }
  };

  const handleClickTierCard = (tierCfg: RoomTierConfig, spec: CommercialTierCardSpec) => {
    if (ddzArenaMode === 'puzzle') {
      soundEngine.playCardPlace(true);
      hapticEngine.playCard();
      setPuzzleInitLevelIdx(spec.puzzleLevelIdx);
      setShowPuzzleModal(true);
      return;
    }

    if (myBeans < tierCfg.minBeans) {
      soundEngine.playTap(580);
      setInsufficientTier(tierCfg);
      return;
    }

    soundEngine.playCardPlace(true);
    hapticEngine.playCard();
    setSelectedDealMode(ddzArenaMode);
    setSelectedBaseScore(tierCfg.baseScore);
    onQuickMatch(tierCfg.baseScore, true, ddzArenaMode);
  };

  const handleQuickStart = () => {
    soundEngine.playCardPlace(true);
    hapticEngine.playCard();
    setSelectedBaseScore(recommendedTier.baseScore);
    onQuickMatch(recommendedTier.baseScore, true, selectedDealMode);
  };

  const isMainPortal = portalStage === 'main_portal';

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-b from-[#1c202d] via-[#141722] to-[#0c0e15] select-none text-[#FAF8F5]">
      {/* Background Subtle Floating Micro-Particles */}
      <AmbientParticles />

      {/* Top Navigation Bar with Official Asset Badges */}
      <HallHeader
        profile={profile}
        displayNumericId={displayNumericId}
        isMainPortal={isMainPortal}
        myBeans={myBeans}
        myRoomCards={myRoomCards}
        isBankruptAlert={isBankruptAlert}
        isMobileLandscape={isMobileLandscape}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onBackToPortal={() => setPortalStage('main_portal')}
        onOpenProfile={() => setShowProfileModal(true)}
        onClaimRoomCards={handleClaimRoomCards}
        onClaimSupply={onClaimSupply}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Floating Notice / Toast */}
      {(notice || roomCardToast) && (
        <div className="pointer-events-none fixed top-14 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-400/60 bg-[#1b0e07]/95 px-4 py-1 text-xs font-bold text-amber-200 shadow-2xl whitespace-nowrap animate-in fade-in">
          {roomCardToast || notice}
        </div>
      )}

      {/* Main Stage Area */}
      <main
        className={`relative z-10 mx-auto flex h-full max-h-full min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-center overflow-hidden ${
          isMobileLandscape ? 'px-2 py-1' : 'px-2.5 py-2 sm:px-4 sm:py-3'
        }`}
        style={{
          paddingLeft: 'max(0.6rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.6rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {/* STAGE A: MAIN CHESS & CARD PORTAL */}
        {portalStage === 'main_portal' && (
          <div className="flex h-full w-full flex-1 flex-col items-center justify-center animate-in fade-in zoom-in-[0.99] duration-200">
            <RegionalGamePortal
              myBeans={myBeans}
              onEnterDdzHall={() => {
                soundEngine.playCardPlace(true);
                setPortalStage('ddz_subhall');
              }}
              onEnterMahjongHall={() => {
                soundEngine.playCardPlace(true);
                setPortalStage('mahjong_subhall');
              }}
              onEnterNiuniuHall={() => {
                soundEngine.playCardPlace(true);
                setPortalStage('niuniu_subhall');
              }}
              onEnterZjhHall={() => {
                soundEngine.playCardPlace(true);
                setPortalStage('zhajinhua_subhall');
              }}
              onQuickStartDdz={handleQuickStart}
              onQuickStartMahjong={() => onQuickMatchMahjong?.(100)}
              onQuickStartGame={(gameKey, baseScore) => {
                soundEngine.playCardPlace(true);
                if (gameKey === 'zhajinhua') {
                  onQuickMatchZhajinhua?.(baseScore, 'classic');
                  return;
                }
                onQuickMatch(baseScore, true, 'classic');
              }}
            />
          </div>
        )}

        {/* STAGE B: DOU DIZHU ARENA SUB-HALL */}
        {portalStage === 'ddz_subhall' && (
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col justify-between overflow-hidden animate-in fade-in zoom-in-[0.99] duration-200">
            <DdzArenaGrid
              ddzArenaMode={ddzArenaMode}
              myBeans={myBeans}
              onSelectMode={(mode) => {
                soundEngine.playTap(780);
                hapticEngine.selectCard();
                setDdzArenaMode(mode);
                if (mode !== 'puzzle') setSelectedDealMode(mode);
              }}
              onClickTier={handleClickTierCard}
            />

            {/* Quick Start Floating Button in Sub-Hall */}
            {ddzArenaMode !== 'puzzle' && (
              <div
                className="absolute z-30 sm:bottom-3 sm:right-3"
                style={{
                  bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
                  right: 'max(0.6rem, env(safe-area-inset-right, 0px))',
                }}
              >
                <QuickStartFab
                  onQuickStart={handleQuickStart}
                  recommendedScore={recommendedTier.baseScore}
                />
              </div>
            )}
          </div>
        )}

        {/* STAGE C: MAHJONG ARENA SUB-HALL */}
        {portalStage === 'mahjong_subhall' && (
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col justify-between overflow-hidden animate-in fade-in zoom-in-[0.99] duration-200">
            <MahjongArenaGrid
              myBeans={myBeans}
              isMobileLandscape={isMobileLandscape}
              onSelectTier={(baseScore, mode) => {
                soundEngine.playCardPlace(true);
                hapticEngine.playCard();
                onQuickMatchMahjong?.(baseScore, mode);
              }}
              onQuickStart={(baseScore, mode) => {
                soundEngine.playCardPlace(true);
                hapticEngine.playCard();
                onQuickMatchMahjong?.(baseScore || 100, mode);
              }}
              onInsufficientBeans={(tier) => {
                setInsufficientTier({
                  tier: 'primary',
                  name: tier.title,
                  badge: '麻将',
                  baseScore: tier.baseScore,
                  minBeans: tier.minBeans,
                  maxMultiplier: 64,
                  fee: 0,
                  accentColor: 'from-emerald-500 to-teal-700',
                });
              }}
            />
          </div>
        )}

        {/* STAGE D: NIUNIU ARENA SUB-HALL */}
        {portalStage === 'niuniu_subhall' && (
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col justify-between overflow-hidden animate-in fade-in zoom-in-[0.99] duration-200">
            <NiuniuArenaGrid
              myBeans={myBeans}
              isMobileLandscape={isMobileLandscape}
              onSelectTier={(baseScore, mode) => {
                soundEngine.playCardPlace(true);
                hapticEngine.playCard();
                onQuickMatchNiuniu?.(baseScore, mode);
              }}
              onQuickStart={(baseScore, mode) => {
                soundEngine.playCardPlace(true);
                hapticEngine.playCard();
                onQuickMatchNiuniu?.(baseScore || 100, mode);
              }}
              onInsufficientBeans={(tier) => {
                setInsufficientTier({
                  tier: 'primary',
                  name: tier.title,
                  badge: '斗牛',
                  baseScore: tier.baseScore,
                  minBeans: tier.minBeans,
                  maxMultiplier: 100,
                  fee: 0,
                  accentColor: 'from-amber-600 to-red-700',
                });
              }}
            />
          </div>
        )}

        {/* STAGE E: ZHAJINHUA ARENA SUB-HALL */}
        {portalStage === 'zhajinhua_subhall' && (
          <div className="relative flex h-full min-h-0 w-full flex-1 flex-col justify-between overflow-hidden animate-in fade-in zoom-in-[0.99] duration-200">
            <ZjhArenaGrid
              myBeans={myBeans}
              isMobileLandscape={isMobileLandscape}
              onSelectTier={(baseScore, mode) => {
                soundEngine.playCardPlace(true);
                hapticEngine.playCard();
                onQuickMatchZhajinhua?.(baseScore, mode);
              }}
              onQuickStart={(baseScore, mode) => {
                soundEngine.playCardPlace(true);
                hapticEngine.playCard();
                onQuickMatchZhajinhua?.(baseScore, mode);
              }}
              onInsufficientBeans={(tier) => {
                setInsufficientTier({
                  tier: 'primary',
                  name: tier.name,
                  badge: '金花',
                  baseScore: tier.baseScore,
                  minBeans: tier.minBeans,
                  maxMultiplier: 20,
                  fee: 0,
                  accentColor: 'from-amber-500 to-rose-700',
                });
              }}
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation Dock (Visible in Main Portal) */}
      {isMainPortal && (
        <HallFooter
          roomsCount={rooms.length}
          signedInToday={localStorage.getItem('h5_signin_last_date') === new Date().toISOString().slice(0, 10)}
          isMobileLandscape={isMobileLandscape}
          onOpenFriendRoom={() => setShowFriendRoomModal(true)}
          onOpenRooms={() => {
            onRefreshLobby();
            setPlatformModal('rooms');
          }}
          onOpenLeaderboard={() => setPlatformModal('leaderboard')}
          onOpenRecords={() => setPlatformModal('records')}
          onOpenSignIn={() => setPlatformModal('signin')}
        />
      )}

      {/* Modals */}
      {insufficientTier && (
        <InsufficientBeansModal
          targetTier={insufficientTier}
          recommendedTier={recommendedTier}
          currentBeans={myBeans}
          onClose={() => setInsufficientTier(null)}
          onClaimSupply={onClaimSupply}
          onEnterRecommendedTier={() => {
            const modeToEnter: DealMode = ddzArenaMode === 'puzzle' ? 'classic' : ddzArenaMode;
            setSelectedDealMode(modeToEnter);
            setSelectedBaseScore(recommendedTier.baseScore);
            onQuickMatch(recommendedTier.baseScore, true, modeToEnter);
          }}
        />
      )}

      {showFriendRoomModal && (
        <FriendRoomModal
          onClose={() => setShowFriendRoomModal(false)}
          onJoinRoom={onJoinRoom}
          onCreateRoom={onCreateRoom}
          initialMode={selectedDealMode}
          initialBaseScore={selectedBaseScore}
        />
      )}

      {platformModal === 'rooms' && (
        <PublicRoomsModal
          rooms={rooms}
          onClose={() => setPlatformModal(null)}
          onRefresh={onRefreshLobby}
          onOpenFriendRoom={() => setShowFriendRoomModal(true)}
          onJoinRoom={onJoinRoom}
        />
      )}

      {platformModal === 'leaderboard' && (
        <LeaderboardModal
          leaderboard={leaderboard}
          myProfile={profile}
          onClose={() => setPlatformModal(null)}
        />
      )}

      {platformModal === 'records' && (
        <MatchRecordsModal
          matches={matches}
          myPlayerId={profile?.playerId}
          loadingReplayId={loadingReplayId}
          onClose={() => setPlatformModal(null)}
          onOpenReplay={handleOpenMatchReplay}
        />
      )}

      {platformModal === 'signin' && (
        <DailySignInModal
          onClose={() => setPlatformModal(null)}
          onClaimSupply={onClaimSupply}
        />
      )}

      {showProfileModal && profile && (
        <ProfileEditorModal
          initialNickname={profile.nickname}
          initialAvatarId={profile.avatarId}
          onClose={() => setShowProfileModal(false)}
          onSave={onUpdateProfile}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenPuzzle={() => setShowPuzzleModal(true)}
        />
      )}

      {activeReplay && (
        <ReplayViewerModal
          replay={activeReplay}
          viewerPlayerId={profile?.playerId}
          onClose={() => setActiveReplay(null)}
        />
      )}

      {showPuzzleModal && (
        <PuzzleChallengeModal
          initialLevelIdx={puzzleInitLevelIdx}
          onClose={() => setShowPuzzleModal(false)}
          onClaimReward={onClaimSupply}
        />
      )}
    </div>
  );
};
