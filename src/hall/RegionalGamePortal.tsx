import React, { useState } from 'react';
import { soundEngine } from '../shared/audio/SoundEngine';
import { hapticEngine } from '../shared/haptics/HapticEngine';
import { GamePreviewModal, GameKey } from './components/modals/GamePreviewModal';

export interface RegionalGamePortalProps {
  onEnterDdzHall: () => void;
  onEnterMahjongHall: () => void;
  onEnterNiuniuHall?: () => void;
  onEnterZjhHall?: () => void;
  onQuickStartDdz: () => void;
  onQuickStartMahjong?: () => void;
  onQuickStartGame?: (gameKey: GameKey, baseScore: number) => void;
  myBeans?: number;
}

export const RegionalGamePortal: React.FC<RegionalGamePortalProps> = ({
  onEnterDdzHall,
  onEnterMahjongHall,
  onEnterNiuniuHall,
  onEnterZjhHall,
  onQuickStartDdz,
  onQuickStartMahjong,
  onQuickStartGame,
  myBeans = 12000,
}) => {
  const [activePreview, setActivePreview] = useState<GameKey | null>(null);

  const handleOpenPreview = (gameKey: GameKey) => {
    soundEngine.playTap(760);
    hapticEngine.tap();
    setActivePreview(gameKey);
  };

  const handleStartGame = (gameKey: GameKey, baseScore: number) => {
    if (onQuickStartGame) {
      onQuickStartGame(gameKey, baseScore);
    } else {
      // Default fallback: triggers appropriate quick match
      soundEngine.playCardPlace(true);
      hapticEngine.playCard();
      onQuickStartDdz();
    }
  };

  return (
    <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden select-none px-1">
      {/* =====================================================================
          SYMMETRIC RESTRAINED CANVAS GRID (2 COLUMNS x 3 ROWS)
          - Portrait: 2 columns x 3 rows with clean height-responsive constraint
          - Landscape: 3 columns x 2 rows (or 2 columns x 3 rows clamped), perfectly balanced
         ===================================================================== */}
      <div className="
        mx-auto grid w-full my-auto min-h-0
        max-w-[min(480px,calc((100dvh-132px)*0.85))] sm:max-w-[540px] md:max-w-[620px]
        max-h-[min(100%,680px)] aspect-[3/3.75]
        grid-cols-2 grid-rows-[1fr_1fr_1fr]
        gap-2 sm:gap-2.5 md:gap-3
        landscape:max-w-4xl landscape:max-h-[min(100%,380px)] landscape:aspect-[16/7.5] landscape:grid-cols-3 landscape:grid-rows-2
      ">
        {/* ===================================================================
            CARD 1: 普洱麻将 (Pu'er Mahjong - Classic Flagship)
           =================================================================== */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playCardPlace(true);
            hapticEngine.playCard();
            onEnterMahjongHall();
          }}
          className="
            group relative flex h-full min-h-0 w-full flex-col items-center justify-between
            overflow-hidden rounded-[20px] sm:rounded-[24px] border-[2.5px] border-[#96f7d2]
            bg-gradient-to-b from-[#34c395] via-[#27a87d] to-[#1a825f]
            px-2 pt-1.5 pb-1.5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.4)]
            transition-transform duration-150 active:scale-[0.985] [@media(hover:hover)]:hover:brightness-105 cursor-pointer
            landscape:flex-row landscape:justify-between landscape:px-3 landscape:py-1.5
          "
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.24)_0%,transparent_68%)] landscape:bg-[radial-gradient(circle_at_28%_50%,rgba(255,255,255,0.22)_0%,transparent_65%)]" />

          {/* Top-Right Online Counter Pill */}
          <div className="absolute top-2 right-2.5 z-20 flex items-center gap-1 rounded-full bg-[#115e42]/85 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-xs">
            <img src="/assets/ui/icon_online.png" alt="在线" className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain" />
            <span className="font-mono tabular-nums">3824</span>
          </div>

          {/* Hero Artwork */}
          <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center p-1 landscape:h-full landscape:w-[48%] landscape:flex-none landscape:p-0">
            <img
              src="/assets/hall/hero-puer.png"
              alt="普洱麻将"
              className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_6px_14px_rgba(6,55,38,0.38)] transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105 pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Title & Quick Play */}
          <div className="relative z-20 flex shrink-0 items-center justify-center pb-1 pt-0.5 landscape:flex-1 landscape:pt-1 landscape:pr-1">
            <span
              className="font-display text-[clamp(1.15rem,4.2vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,3vw,1.75rem)]"
              style={{
                textShadow:
                  '0 1.5px 0 #0e593e, 0 -1px 0 #0e593e, 1.5px 0 0 #0e593e, -1.5px 0 0 #0e593e, 1px 1px 0 #0e593e, -1px -1px 0 #0e593e, 1px -1px 0 #0e593e, -1px 1px 0 #0e593e, 0 3px 0 #073524, 0 5px 8px rgba(0,0,0,0.48)',
              }}
            >
              普洱麻将
            </span>

            <div
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playCardPlace(true);
                hapticEngine.playCard();
                onQuickStartMahjong?.();
              }}
              className="absolute right-1 bottom-0.5 z-30 hidden sm:flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-black text-[#18181B] shadow-md active:scale-95 cursor-pointer"
              title="一键秒开匹配"
            >
              <span>秒开</span>
            </div>
          </div>
        </button>

        {/* ===================================================================
            CARD 2: 斗地主 (Dou Dizhu - Primary Flagship)
           =================================================================== */}
        <button
          type="button"
          onClick={onEnterDdzHall}
          className="
            group relative flex h-full min-h-0 w-full flex-col items-center justify-between
            overflow-hidden rounded-[20px] sm:rounded-[24px] border-[2.5px] border-[#ffd2a6]
            bg-gradient-to-b from-[#f89259] via-[#f0753a] to-[#df5b22]
            px-2 pt-1.5 pb-1.5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.4)]
            transition-transform duration-150 active:scale-[0.985] [@media(hover:hover)]:hover:brightness-105 cursor-pointer
            landscape:flex-row landscape:justify-between landscape:px-3 landscape:py-1.5
          "
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,240,205,0.26)_0%,transparent_68%)] landscape:bg-[radial-gradient(circle_at_26%_50%,rgba(255,240,205,0.26)_0%,transparent_65%)]" />

          {/* Top-Right Online Counter Pill */}
          <div className="absolute top-2 right-2.5 z-20 flex items-center gap-1 rounded-full bg-[#9e380e]/85 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-xs">
            <img src="/assets/ui/icon_online.png" alt="在线" className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain" />
            <span className="font-mono tabular-nums">9999+</span>
          </div>

          {/* Hero Artwork */}
          <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center p-1 landscape:h-full landscape:w-[48%] landscape:flex-none landscape:p-0">
            <img
              src="/assets/hall/hero-ddz.png"
              alt="斗地主"
              className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_5px_12px_rgba(120,35,5,0.4)] transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105 pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Title */}
          <div className="relative z-20 flex shrink-0 items-center justify-center pb-1 pt-0.5 landscape:flex-1 landscape:pt-1 landscape:pr-1">
            <span
              className="font-display text-[clamp(1.15rem,4.2vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,3vw,1.75rem)]"
              style={{
                textShadow:
                  '0 1.5px 0 #8c2c06, 0 -1px 0 #8c2c06, 1.5px 0 0 #8c2c06, -1.5px 0 0 #8c2c06, 1px 1px 0 #8c2c06, -1px -1px 0 #8c2c06, 1px -1px 0 #8c2c06, -1px 1px 0 #8c2c06, 0 3px 0 #5e1c03, 0 5px 8px rgba(0,0,0,0.45)',
              }}
            >
              斗地主
            </span>
          </div>
        </button>

        {/* ===================================================================
            CARD 3: 抢庄斗牛 (Bullfight Niu-Niu - NEW FLAGSHIP)
           =================================================================== */}
        <button
          type="button"
          onClick={() => {
            if (onEnterNiuniuHall) {
              soundEngine.playCardPlace(true);
              hapticEngine.playCard();
              onEnterNiuniuHall();
            } else {
              handleOpenPreview('niuniu');
            }
          }}
          className="
            group relative flex h-full min-h-0 w-full flex-col items-center justify-between
            overflow-hidden rounded-[20px] sm:rounded-[24px] border-[2.5px] border-[#ffc7a6]
            bg-gradient-to-b from-[#e54538] via-[#c72d24] to-[#991b15]
            px-2 pt-1.5 pb-1.5 text-left shadow-[0_8px_20px_rgba(153,27,21,0.4)]
            transition-transform duration-150 active:scale-[0.985] [@media(hover:hover)]:hover:brightness-105 cursor-pointer
            landscape:flex-row landscape:justify-between landscape:px-3 landscape:py-1.5
          "
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,220,200,0.24)_0%,transparent_68%)] landscape:bg-[radial-gradient(circle_at_26%_50%,rgba(255,220,200,0.22)_0%,transparent_65%)]" />

          {/* Top-Left Ribbon */}
          <div className="pointer-events-none absolute top-0 left-0 z-20 overflow-hidden rounded-tl-[17px] rounded-br-xl bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-black shadow">
            抢庄倍数
          </div>

          {/* Top-Right Online Counter Pill */}
          <div className="absolute top-2 right-2.5 z-20 flex items-center gap-1 rounded-full bg-[#70120c]/85 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-xs">
            <img src="/assets/ui/icon_online.png" alt="在线" className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain" />
            <span className="font-mono tabular-nums">6820</span>
          </div>

          {/* Hero Artwork with Fallback */}
          <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center p-1 landscape:h-full landscape:w-[48%] landscape:flex-none landscape:p-0">
            <img
              src="/assets/hall/hero-niuniu.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/hall/hero-niuniu.svg';
              }}
              alt="斗牛"
              className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_5px_14px_rgba(70,10,10,0.5)] transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105 pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Title */}
          <div className="relative z-20 flex shrink-0 items-center justify-center pb-1 pt-0.5 landscape:flex-1 landscape:pt-1 landscape:pr-1">
            <span
              className="font-display text-[clamp(1.15rem,4.2vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,3vw,1.75rem)]"
              style={{
                textShadow:
                  '0 1.5px 0 #75140f, 0 -1px 0 #75140f, 1.5px 0 0 #75140f, -1.5px 0 0 #75140f, 1px 1px 0 #75140f, -1px -1px 0 #75140f, 1px -1px 0 #75140f, -1px 1px 0 #75140f, 0 3px 0 #4a0906, 0 5px 8px rgba(0,0,0,0.45)',
              }}
            >
              抢庄斗牛
            </span>
          </div>
        </button>

        {/* ===================================================================
            CARD 4: 炸金花 (Zha Jin Hua - NEW FLAGSHIP)
           =================================================================== */}
        <button
          type="button"
          onClick={() => {
            if (onEnterZjhHall) {
              soundEngine.playCardPlace(true);
              hapticEngine.playCard();
              onEnterZjhHall();
            } else {
              handleOpenPreview('zhajinhua');
            }
          }}
          className="
            group relative flex h-full min-h-0 w-full flex-col items-center justify-between
            overflow-hidden rounded-[20px] sm:rounded-[24px] border-[2.5px] border-[#ffe89c]
            bg-gradient-to-b from-[#8b3dca] via-[#6f23b2] to-[#4f1285]
            px-2 pt-1.5 pb-1.5 text-left shadow-[0_8px_20px_rgba(79,18,133,0.4)]
            transition-transform duration-150 active:scale-[0.985] [@media(hover:hover)]:hover:brightness-105 cursor-pointer
            landscape:flex-row landscape:justify-between landscape:px-3 landscape:py-1.5
          "
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,230,255,0.24)_0%,transparent_68%)] landscape:bg-[radial-gradient(circle_at_26%_50%,rgba(255,230,255,0.22)_0%,transparent_65%)]" />

          {/* Top-Left Ribbon */}
          <div className="pointer-events-none absolute top-0 left-0 z-20 overflow-hidden rounded-tl-[17px] rounded-br-xl bg-gradient-to-r from-amber-400 to-amber-600 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-black shadow">
            闷牌对决
          </div>

          {/* Top-Right Online Counter Pill */}
          <div className="absolute top-2 right-2.5 z-20 flex items-center gap-1 rounded-full bg-[#3c0968]/85 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-xs">
            <img src="/assets/ui/icon_online.png" alt="在线" className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain" />
            <span className="font-mono tabular-nums">8240</span>
          </div>

          {/* Hero Artwork with Fallback */}
          <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center p-1 landscape:h-full landscape:w-[48%] landscape:flex-none landscape:p-0">
            <img
              src="/assets/hall/hero-zhajinhua.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/hall/hero-zhajinhua.svg';
              }}
              alt="炸金花"
              className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_5px_14px_rgba(40,5,70,0.5)] transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105 pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Title */}
          <div className="relative z-20 flex shrink-0 items-center justify-center pb-1 pt-0.5 landscape:flex-1 landscape:pt-1 landscape:pr-1">
            <span
              className="font-display text-[clamp(1.15rem,4.2vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,3vw,1.75rem)]"
              style={{
                textShadow:
                  '0 1.5px 0 #3b0966, 0 -1px 0 #3b0966, 1.5px 0 0 #3b0966, -1.5px 0 0 #3b0966, 1px 1px 0 #3b0966, -1px -1px 0 #3b0966, 1px -1px 0 #3b0966, -1px 1px 0 #3b0966, 0 3px 0 #240440, 0 5px 8px rgba(0,0,0,0.45)',
              }}
            >
              经典金花
            </span>
          </div>
        </button>

        {/* ===================================================================
            CARD 5: 捞腌菜 (Lao Yan Cai)
           =================================================================== */}
        <button
          type="button"
          onClick={() => handleOpenPreview('laoyancai')}
          className="
            group relative flex h-full min-h-0 w-full flex-col items-center justify-between
            overflow-hidden rounded-[20px] sm:rounded-[24px] border-[2.5px] border-[#e5c7ff]
            bg-gradient-to-b from-[#b88ef0] via-[#9e6ee4] to-[#8350d1]
            px-2 pt-1.5 pb-1.5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.4)]
            transition-transform duration-150 active:scale-[0.985] [@media(hover:hover)]:hover:brightness-105 cursor-pointer
            landscape:flex-row landscape:justify-between landscape:px-3 landscape:py-1.5
          "
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.22)_0%,transparent_68%)] landscape:bg-[radial-gradient(circle_at_26%_50%,rgba(255,255,255,0.22)_0%,transparent_65%)]" />

          {/* Top-Right Online Counter Pill */}
          <div className="absolute top-2 right-2.5 z-20 flex items-center gap-1 rounded-full bg-[#5b2ca8]/85 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-xs">
            <img src="/assets/ui/icon_online.png" alt="在线" className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain" />
            <span className="font-mono tabular-nums">1445</span>
          </div>

          {/* Hero Artwork */}
          <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center p-1 landscape:h-full landscape:w-[48%] landscape:flex-none landscape:p-0">
            <img
              src="/assets/hall/hero-laoyancai.png"
              alt="捞腌菜"
              className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_5px_12px_rgba(68,26,135,0.4)] transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105 pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Title */}
          <div className="relative z-20 flex shrink-0 items-center justify-center pb-1 pt-0.5 landscape:flex-1 landscape:pt-1 landscape:pr-1">
            <span
              className="font-display text-[clamp(1.15rem,4.2vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,3vw,1.75rem)]"
              style={{
                textShadow:
                  '0 1.5px 0 #522299, 0 -1px 0 #522299, 1.5px 0 0 #522299, -1.5px 0 0 #522299, 1px 1px 0 #522299, -1px -1px 0 #522299, 1px -1px 0 #522299, -1px 1px 0 #522299, 0 3px 0 #361369, 0 5px 8px rgba(0,0,0,0.45)',
              }}
            >
              捞腌菜
            </span>
          </div>
        </button>

        {/* ===================================================================
            CARD 6: 双扣 (Shuang Ko)
           =================================================================== */}
        <button
          type="button"
          onClick={() => handleOpenPreview('shuangko')}
          className="
            group relative flex h-full min-h-0 w-full flex-col items-center justify-between
            overflow-hidden rounded-[20px] sm:rounded-[24px] border-[2.5px] border-[#ffc3a0]
            bg-gradient-to-b from-[#e67552] via-[#df6245] to-[#cf4d35]
            px-2 pt-1.5 pb-1.5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.4)]
            transition-transform duration-150 active:scale-[0.985] [@media(hover:hover)]:hover:brightness-105 cursor-pointer
            landscape:flex-row landscape:justify-between landscape:px-3 landscape:py-1.5
          "
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,235,205,0.22)_0%,transparent_68%)] landscape:bg-[radial-gradient(circle_at_26%_50%,rgba(255,235,205,0.22)_0%,transparent_65%)]" />

          {/* Top-Left Ribbon */}
          <div className="pointer-events-none absolute top-0 left-0 z-20 overflow-hidden rounded-tl-[17px] rounded-br-xl bg-gradient-to-r from-[#8b261d] to-[#b93829] px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-200 shadow">
            双扣
          </div>

          {/* Top-Right Online Counter Pill */}
          <div className="absolute top-2 right-2.5 z-20 flex items-center gap-1 rounded-full bg-[#8f291c]/85 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-xs">
            <img src="/assets/ui/icon_online.png" alt="在线" className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 object-contain" />
            <span className="font-mono tabular-nums">2826</span>
          </div>

          {/* Hero Artwork */}
          <div className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center p-1 landscape:h-full landscape:w-[48%] landscape:flex-none landscape:p-0">
            <img
              src="/assets/hall/hero-shuangko.png"
              alt="双扣"
              className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_5px_12px_rgba(115,28,18,0.4)] transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105 pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Title */}
          <div className="relative z-20 flex shrink-0 items-center justify-center pb-1 pt-0.5 landscape:flex-1 landscape:pt-1 landscape:pr-1">
            <span
              className="font-display text-[clamp(1.15rem,4.2vw,1.75rem)] leading-none font-black tracking-wider text-white whitespace-nowrap landscape:text-[clamp(1.15rem,3vw,1.75rem)]"
              style={{
                textShadow:
                  '0 1.5px 0 #832212, 0 -1px 0 #832212, 1.5px 0 0 #832212, -1.5px 0 0 #832212, 1px 1px 0 #832212, -1px -1px 0 #832212, 1px -1px 0 #832212, -1px 1px 0 #832212, 0 3px 0 #581409, 0 5px 8px rgba(0,0,0,0.45)',
              }}
            >
              火拼双扣
            </span>
          </div>
        </button>
      </div>

      {/* =====================================================================
          COMMERCIAL GAME PREVIEW & TIER MODAL
         ===================================================================== */}
      {activePreview && (
        <GamePreviewModal
          gameKey={activePreview}
          myBeans={myBeans}
          onClose={() => setActivePreview(null)}
          onQuickStart={(k, baseScore) => {
            setActivePreview(null);
            handleStartGame(k, baseScore);
          }}
        />
      )}
    </div>
  );
};
