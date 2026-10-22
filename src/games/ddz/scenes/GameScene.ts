import { Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';
import { CARD_HEIGHT, CARD_WIDTH, getCardBackTexturePath } from '../assets/CardAtlasGenerator';
import { Card } from '../components/Card';
import { HandManager } from '../managers/HandManager';
import { CardData, DdzPhase, PropType, Rank } from '../types';

export const DESIGN_WIDTH = 1334;
export const DESIGN_HEIGHT = 750;

export interface GameSceneCallbacks {
  onCallLandlord: (call: boolean) => void;
  onGrabLandlord: (grab: boolean) => void;
  onPlaySelectedCards: (cards: CardData[]) => void;
  onPassTurn: () => void;
  onRequestHint: () => void;
}

/**
 * PixiJS v8 Commercial 4.0 GameScene.
 * Features carved rosewood mahogany & royal emerald velvet table surface,
 * 3D horizontal flip hole-card tray, parabolic card play physics,
 * and 60fps commercial skill VFX (Rocket Missile Dive, Fuse Bomb Blast, 3D Biplane Flyby, Dragon Ribbon, Spring Blossom).
 */
export class GameScene extends Container {
  private tableBackground: Container = new Container();
  private playerAreas: Container = new Container();
  private bottomPlayer: Container = new Container();
  private leftPlayer: Container = new Container();
  private rightPlayer: Container = new Container();
  private playedCardsArea: Container = new Container();
  private landlordCardsArea: Container = new Container();
  private uiLayer: Container = new Container();
  private effectsLayer: Container = new Container();

  public handManager: HandManager;
  private callbacks: GameSceneCallbacks;
  public virtualWidth: number = DESIGN_WIDTH;

  private bottomThreeNodes: Container[] = [];
  private bottomTagBadge!: Container;
  private bottomTagText!: Text;

  private leftStackContainer!: Container;
  private leftCountText!: Text;
  private leftAlertBadge!: Container;
  private rightStackContainer!: Container;
  private rightCountText!: Text;
  private rightAlertBadge!: Container;

  private playedBottom: Container = new Container();
  private playedLeft: Container = new Container();
  private playedRight: Container = new Container();

  private turnTimerContainer: Container = new Container();
  private turnTimerText!: Text;
  private scoreDisplayText!: Text;

  private countdownInterval: number | null = null;
  private currentTimeoutAt: number = 0;
  private lastTickedSec: number = -1;
  private currentTurnRelativePos: 'bottom' | 'left' | 'right' | null = null;
  private lastSyncedUiScale: number = 1;

  private layoutPcts = {
    holeCardsTopPct: 7.6,
    scoreLineTopPct: 15.2,
    opponentDeckSideXPct: 6.9,
    opponentDeckTopPct: 29.6,
    turnClockSideXPct: 14.8,
    turnClockBottomTopPct: 47.2,
    playedSideXPct: 27.6,
    playedSideTopPct: 30.4,
    playedBottomTopPct: 40.5,
    handCenterYPct: 83.5,
    handWidthPct: 80,
    handCardScale: 1.0,
    comboBannerTopPct: 63.2,
    handBandTopPct: 69.3,
    handBandBottomPct: 98.7,
  };

  constructor(callbacks: GameSceneCallbacks, initialVirtualWidth = DESIGN_WIDTH) {
    super();
    this.callbacks = callbacks;
    this.virtualWidth = initialVirtualWidth;
    soundEngine.preloadDdzAudio();

    // Scene Graph hierarchy
    this.addChild(this.tableBackground);
    this.playerAreas.addChild(this.leftPlayer, this.rightPlayer, this.bottomPlayer);
    this.addChild(this.playerAreas);

    this.playedCardsArea.addChild(this.playedLeft, this.playedRight, this.playedBottom);
    this.addChild(this.playedCardsArea);

    this.addChild(this.landlordCardsArea);
    this.addChild(this.uiLayer);
    this.addChild(this.effectsLayer);

    this.handManager = new HandManager(this.bottomPlayer);

    this.buildTableBackground(this.virtualWidth, DESIGN_HEIGHT);
    this.buildOpponentDecks();
    this.buildLandlordCardsArea();
    this.buildUILayer();
    this.bindStageTouchSlideEvents();
  }

  public setVirtualDimensions(width: number, height: number): void {
    if (this.virtualWidth === width) return;
    this.virtualWidth = width;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.buildTableBackground(width, height);
    this.applyLayoutPercentages(this.layoutPcts);
  }

  private bindStageTouchSlideEvents(): void {
    this.eventMode = 'static';
    this.hitArea = new Rectangle(0, 0, this.virtualWidth, DESIGN_HEIGHT);

    this.on('globalpointermove', (e: FederatedPointerEvent) => {
      if (this.destroyed) return;
      const localPos = this.toLocal(e.global);
      this.handManager.handleScenePointerMove(localPos);
    });

    this.on('pointerup', () => {
      if (this.destroyed) return;
      this.handManager.handleScenePointerUp();
    });

    this.on('pointerupoutside', () => {
      if (this.destroyed) return;
      this.handManager.handleScenePointerUp();
    });
  }

  /**
   * Build luxury Chinese rosewood mahogany & royal emerald velvet felt table.
   */
  private buildTableBackground(w = this.virtualWidth, h = DESIGN_HEIGHT): void {
    while (this.tableBackground.children.length > 0) {
      const ch = this.tableBackground.children[0];
      this.tableBackground.removeChild(ch);
      ch.destroy({ children: true });
    }

    // 1. Deep ambient room backdrop
    const backdrop = new Graphics();
    backdrop.rect(0, 0, w, h).fill({ color: 0x031810 });

    // 2. Carved Rosewood Mahogany Outer Frame (3D beveled wood rail)
    const mahoganyOuter = new Graphics();
    mahoganyOuter
      .roundRect(14, 10, w - 28, h - 20, 44)
      .fill({ color: 0x3b160d })
      .stroke({ color: 0x1f0a05, width: 4 });

    const mahoganyInnerBevel = new Graphics();
    mahoganyInnerBevel
      .roundRect(22, 18, w - 44, h - 36, 38)
      .fill({ color: 0x4e1f13 })
      .stroke({ color: 0xd97706, width: 2, alpha: 0.65 });

    // 3. Royal Emerald Velvet Felt Surface with subtle radial spotlight
    const felt = new Graphics();
    felt
      .roundRect(32, 26, w - 64, h - 52, 32)
      .fill({ color: 0x093d2b })
      .stroke({ color: 0x052419, width: 6 });

    // Inner bright jade spotlight oval
    const spotW = Math.min(560, w * 0.38);
    felt
      .ellipse(w / 2, 330, spotW, 230)
      .fill({ color: 0x0f573e, alpha: 0.45 });
    felt
      .ellipse(w / 2, 320, spotW * 0.6, 140)
      .fill({ color: 0x156c4e, alpha: 0.25 });

    // 4. Clean Gold Hairline Inner Trim (Minimalist commercial poker table frame)
    const goldInlay = new Graphics();
    goldInlay
      .roundRect(46, 38, w - 92, h - 76, 24)
      .stroke({ color: 0xf59e0b, width: 1.2, alpha: 0.24 });

    // 5. Subtle Center Table Watermark
    const mX = w / 2;
    const mY = 278;
    const centerMark = new Text({
      text: '斗 地 主',
      style: {
        fontFamily: 'Outfit, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 26,
        fontWeight: '800',
        fill: 0xfde68a,
        letterSpacing: 12,
      },
    });
    centerMark.alpha = 0.055;
    centerMark.anchor.set(0.5);
    centerMark.position.set(mX, mY);

    felt.eventMode = 'static';
    felt.on('pointerdown', (e: FederatedPointerEvent) => {
      if (this.destroyed) return;
      const localPos = this.toLocal(e.global);
      const startedHandSlide = this.handManager.handleScenePointerDown(localPos);
      if (!startedHandSlide) {
        this.handManager.clearSelection();
      }
    });

    this.tableBackground.addChild(
      backdrop,
      mahoganyOuter,
      mahoganyInnerBevel,
      felt,
      goldInlay,
      centerMark
    );
  }

  private buildOpponentDecks(): void {
    const leftX = Math.round((this.virtualWidth * this.layoutPcts.opponentDeckSideXPct) / 100);
    const deckY = Math.round((DESIGN_HEIGHT * this.layoutPcts.opponentDeckTopPct) / 100);
    const leftStack = this.createCardBackStack(leftX, deckY);
    this.leftStackContainer = leftStack.container;
    this.leftCountText = leftStack.countText;
    this.leftAlertBadge = leftStack.alertBadge;
    this.leftPlayer.addChild(leftStack.container);

    const rightStack = this.createCardBackStack(this.virtualWidth - leftX, deckY);
    this.rightStackContainer = rightStack.container;
    this.rightCountText = rightStack.countText;
    this.rightAlertBadge = rightStack.alertBadge;
    this.rightPlayer.addChild(rightStack.container);
  }

  private createCardBackStack(
    x: number,
    y: number
  ): { container: Container; countText: Text; alertBadge: Container } {
    const container = new Container();
    container.position.set(x, y);

    // 1. Soft Ambient Depth Shadow
    const stackShadow = new Graphics();
    stackShadow
      .roundRect(-28, -34, 56, 74, 8)
      .fill({ color: 0x000000, alpha: 0.32 });
    container.addChild(stackShadow);

    // 2. Cascaded Back Card Layers with Size Stabilization & Vector Fallback
    for (let i = 0; i < 3; i++) {
      const w = CARD_WIDTH * 0.54;
      const h = CARD_HEIGHT * 0.54;

      const layerNode = new Container();
      layerNode.position.set(i * 4 - 4, i * 2 - 2);

      const vectorBack = new Graphics();
      vectorBack
        .roundRect(-w / 2, -h / 2, w, h, 6)
        .fill({ color: 0x1e3a5f })
        .stroke({ color: 0x93c5fd, width: 1.2 });
      layerNode.addChild(vectorBack);

      const backSprite = Sprite.from(getCardBackTexturePath());
      const applySize = () => {
        const tex = backSprite.texture;
        if (tex && tex.width > 1 && tex.height > 1) {
          backSprite.width = w;
          backSprite.height = h;
          backSprite.pivot.set(w / 2, h / 2);
        }
      };
      applySize();
      const tex = backSprite.texture;
      if (tex && (tex.width <= 1 || tex.height <= 1)) {
        tex.source?.once('update', () => {
          if (!container.destroyed && !backSprite.destroyed) {
            applySize();
          }
        });
      }
      layerNode.addChild(backSprite);
      container.addChild(layerNode);
    }

    const countBg = new Graphics();
    countBg
      .roundRect(-24, 10, 48, 26, 9)
      .fill({ color: 0x051c14, alpha: 0.94 })
      .stroke({ color: 0xf59e0b, width: 1.8 });
    container.addChild(countBg);

    const countText = new Text({
      text: '17',
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 16,
        fontWeight: '800',
        fill: 0xfef08a,
      },
    });
    countText.anchor.set(0.5);
    countText.position.set(0, 23);
    container.addChild(countText);

    // Siren Alert Lamp when Opponent has 1~2 Cards Left
    const alertBadge = new Container();
    alertBadge.position.set(0, -48);
    const alertBg = new Graphics();
    alertBg
      .roundRect(-32, -12, 64, 24, 12)
      .fill({ color: 0xdc2626 })
      .stroke({ color: 0xfef08a, width: 1.8 });
    const alertText = new Text({
      text: '预警',
      style: {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0xffffff,
      },
    });
    alertText.anchor.set(0.5);
    alertBadge.addChild(alertBg, alertText);
    alertBadge.visible = false;
    container.addChild(alertBadge);

    return { container, countText, alertBadge };
  }

  private baseScoreValueText!: Text;
  private multiplierValueText!: Text;

  /**
   * Build Integrated Top-Center Console for the 3 Landlord Hole Cards + Base Score & Multiplier.
   */
  private buildLandlordCardsArea(): void {
    this.landlordCardsArea.position.set(this.virtualWidth / 2, 54);

    // Unified commercial top console tray: Left wing (底分) | Center (3张底牌) | Right wing (倍数)
    const tray = new Graphics();
    tray
      .roundRect(-204, -40, 408, 80, 18)
      .fill({ color: 0x041a12, alpha: 0.92 })
      .stroke({ color: 0xf59e0b, width: 1.8, alpha: 0.68 });
    tray
      .roundRect(-108, -35, 216, 70, 12)
      .fill({ color: 0x02120c, alpha: 0.65 })
      .stroke({ color: 0xfef08a, width: 0.8, alpha: 0.22 });
    this.landlordCardsArea.addChild(tray);

    // Left Wing: Base Score (底分)
    const baseLabel = new Text({
      text: '底分',
      style: {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0x6ee7b7,
      },
    });
    baseLabel.anchor.set(0.5);
    baseLabel.position.set(-156, -12);

    this.baseScoreValueText = new Text({
      text: '100',
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 16,
        fontWeight: '800',
        fill: 0xfef08a,
      },
    });
    this.baseScoreValueText.anchor.set(0.5);
    this.baseScoreValueText.position.set(-156, 11);

    // Right Wing: Multiplier (倍数)
    const mulLabel = new Text({
      text: '倍数',
      style: {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0x6ee7b7,
      },
    });
    mulLabel.anchor.set(0.5);
    mulLabel.position.set(156, -12);

    this.multiplierValueText = new Text({
      text: '×1',
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 16,
        fontWeight: '800',
        fill: 0xfbbf24,
      },
    });
    this.multiplierValueText.anchor.set(0.5);
    this.multiplierValueText.position.set(156, 11);

    this.landlordCardsArea.addChild(
      baseLabel,
      this.baseScoreValueText,
      mulLabel,
      this.multiplierValueText
    );

    this.bottomTagBadge = new Container();
    this.bottomTagBadge.position.set(0, 40);
    const tagBg = new Graphics();
    tagBg
      .roundRect(-38, -11, 76, 22, 11)
      .fill({ color: 0xd97706 })
      .stroke({ color: 0xfef08a, width: 1.5 });
    this.bottomTagText = new Text({
      text: '特殊底牌',
      style: {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: 10,
        fontWeight: 'bold',
        fill: 0x18181b,
      },
    });
    this.bottomTagText.anchor.set(0.5);
    this.bottomTagBadge.addChild(tagBg, this.bottomTagText);
    this.bottomTagBadge.visible = false;
    this.landlordCardsArea.addChild(this.bottomTagBadge);

    this.resetBottomThreeCards();
  }

  resetBottomThreeCards(): void {
    if (this.destroyed || this.landlordCardsArea.destroyed) return;
    for (const node of this.bottomThreeNodes) {
      if (!node.destroyed) {
        this.killTweensRecursively(node);
        this.landlordCardsArea.removeChild(node);
        node.destroy({ children: true });
      }
    }
    this.bottomThreeNodes = [];
    if (this.bottomTagBadge && !this.bottomTagBadge.destroyed) {
      this.bottomTagBadge.visible = false;
    }

    for (let i = 0; i < 3; i++) {
      const slotNode = new Container();
      slotNode.position.set((i - 1) * 66, 0);

      const w = CARD_WIDTH;
      const h = CARD_HEIGHT;

      const vectorBack = new Graphics();
      vectorBack
        .roundRect(-w / 2, -h / 2, w, h, 8)
        .fill({ color: 0x1e3a5f })
        .stroke({ color: 0x93c5fd, width: 2 });
      slotNode.addChild(vectorBack);

      const backSprite = Sprite.from(getCardBackTexturePath());
      const applySize = () => {
        const tex = backSprite.texture;
        if (tex && tex.width > 1 && tex.height > 1) {
          backSprite.width = w;
          backSprite.height = h;
          backSprite.pivot.set(w / 2, h / 2);
        }
      };
      applySize();
      const tex = backSprite.texture;
      if (tex && (tex.width <= 1 || tex.height <= 1)) {
        tex.source?.once('update', () => {
          if (!this.destroyed && !slotNode.destroyed && !backSprite.destroyed) {
            applySize();
          }
        });
      }
      slotNode.addChild(backSprite);
      slotNode.scale.set(0.54);

      this.bottomThreeNodes.push(slotNode);
      this.landlordCardsArea.addChildAt(slotNode, 1 + i);
    }
  }

  /**
   * Reveal the 3 Landlord Hole Cards with 3D horizontal flip animation (`scaleX: 0.54 -> 0 -> 0.54`).
   */
  revealBottomThreeCards(
    cards: CardData[],
    animate = true,
    bonusTag: string | null = null
  ): void {
    if (this.destroyed || cards.length !== 3) return;

    cards.forEach((data, i) => {
      const slotNode = this.bottomThreeNodes[i];
      if (!slotNode || slotNode.destroyed) return;

      const swapToFace = () => {
        if (slotNode.destroyed) return;
        while (slotNode.children.length > 0) {
          const ch = slotNode.children[0];
          slotNode.removeChild(ch);
          ch.destroy({ children: true });
        }
        const faceCard = new Card(data, true, false);
        faceCard.pivot.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);

        // Gilded highlight frame on bottom card reveal
        const gildedGlow = new Graphics();
        gildedGlow
          .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
          .stroke({ color: 0xf59e0b, width: 2.2, alpha: 0.9 });
        faceCard.addChild(gildedGlow);
        gsap.fromTo(
          gildedGlow,
          { alpha: 0.2 },
          { alpha: 0.95, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }
        );

        slotNode.addChild(faceCard);
      };

      gsap.killTweensOf(slotNode.scale);
      if (animate) {
        gsap.to(slotNode.scale, {
          x: 0,
          y: 0.6,
          duration: 0.14,
          delay: i * 0.07,
          ease: 'power2.in',
          onComplete: () => {
            swapToFace();
            if (!slotNode.destroyed && slotNode.scale) {
              gsap.to(slotNode.scale, {
                x: 0.54,
                y: 0.54,
                duration: 0.18,
                ease: 'back.out(1.8)',
              });
            }
          },
        });
      } else {
        swapToFace();
        slotNode.scale.set(0.54);
      }
    });

    if (this.bottomTagBadge && !this.bottomTagBadge.destroyed) {
      if (bonusTag) {
        this.bottomTagText.text = bonusTag;
        this.bottomTagBadge.visible = true;
        this.bottomTagBadge.scale.set(0.4);
        gsap.killTweensOf(this.bottomTagBadge.scale);
        gsap.to(this.bottomTagBadge.scale, {
          x: 1,
          y: 1,
          duration: 0.25,
          ease: 'back.out(2)',
        });
      } else {
        this.bottomTagBadge.visible = false;
      }
    }
  }

  private buildUILayer(): void {
    this.scoreDisplayText = new Text({
      text: '',
      style: {
        fontFamily: 'JetBrains Mono, PingFang SC, sans-serif',
        fontSize: 12,
        fontWeight: 'bold',
        fill: 0xfde68a,
      },
    });
    this.scoreDisplayText.anchor.set(0.5);
    this.scoreDisplayText.visible = false;
    this.uiLayer.addChild(this.scoreDisplayText);

    this.buildTurnTimer();
    this.uiLayer.addChild(this.turnTimerContainer);
  }

  private buildTurnTimer(): void {
    const outerGlow = new Graphics();
    outerGlow.circle(0, 0, 29).fill({ color: 0xf59e0b, alpha: 0.18 });

    const circle = new Graphics();
    circle
      .circle(0, 0, 25)
      .fill({ color: 0x051f16, alpha: 0.95 })
      .stroke({ color: 0xfbbf24, width: 2.5 });

    this.turnTimerText = new Text({
      text: '18',
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 18,
        fontWeight: '800',
        fill: 0xfef08a,
      },
    });
    this.turnTimerText.anchor.set(0.5);

    this.turnTimerContainer.addChild(outerGlow, circle, this.turnTimerText);
    this.turnTimerContainer.visible = false;
  }

  updateScoreAndMultiplier(baseScore: number, multiplier: number): void {
    if (this.destroyed) return;
    if (this.baseScoreValueText && !this.baseScoreValueText.destroyed) {
      this.baseScoreValueText.text = String(baseScore);
    }
    if (this.multiplierValueText && !this.multiplierValueText.destroyed) {
      this.multiplierValueText.text = `×${multiplier}`;
    }
  }

  private prevLeftCount: number = 17;
  private prevRightCount: number = 17;

  updateOpponentCardCounts(leftCount: number, rightCount: number): void {
    if (this.destroyed) return;
    if (leftCount > 0 && leftCount <= 2 && this.prevLeftCount > leftCount) {
      soundEngine.playDdzSfx('alert');
      const alertVoice = leftCount === 1 ? 'baojing1' : 'baojing2';
      soundEngine.playDdzActionVoice(alertVoice);
    }
    if (rightCount > 0 && rightCount <= 2 && this.prevRightCount > rightCount) {
      soundEngine.playDdzSfx('alert');
      const alertVoice = rightCount === 1 ? 'baojing1' : 'baojing2';
      soundEngine.playDdzActionVoice(alertVoice);
    }
    this.prevLeftCount = leftCount;
    this.prevRightCount = rightCount;

    if (this.leftPlayer && !this.leftPlayer.destroyed) {
      this.leftPlayer.visible = leftCount > 0;
      if (this.leftCountText && !this.leftCountText.destroyed) {
        this.leftCountText.text = String(leftCount);
        this.leftCountText.style.fill = leftCount <= 2 ? 0xfca5a5 : 0xfef08a;
      }
      if (this.leftAlertBadge && !this.leftAlertBadge.destroyed) {
        const showLeftAlert = leftCount > 0 && leftCount <= 2;
        this.leftAlertBadge.visible = showLeftAlert;
      }
    }

    if (this.rightPlayer && !this.rightPlayer.destroyed) {
      this.rightPlayer.visible = rightCount > 0;
      if (this.rightCountText && !this.rightCountText.destroyed) {
        this.rightCountText.text = String(rightCount);
        this.rightCountText.style.fill = rightCount <= 2 ? 0xfca5a5 : 0xfef08a;
      }
      if (this.rightAlertBadge && !this.rightAlertBadge.destroyed) {
        const showRightAlert = rightCount > 0 && rightCount <= 2;
        this.rightAlertBadge.visible = showRightAlert;
      }
    }
  }

  updateTurnState(
    phase: DdzPhase,
    relativePos: 'bottom' | 'left' | 'right' | null,
    timeoutAt: number,
    _isFreeLead: boolean
  ): void {
    if (this.destroyed || !this.turnTimerContainer || this.turnTimerContainer.destroyed) return;

    this.currentTurnRelativePos = relativePos;

    if (
      !relativePos ||
      (phase !== 'BIDDING' &&
        phase !== 'GRABBING' &&
        phase !== 'DOUBLING' &&
        phase !== 'PLAYING')
    ) {
      this.turnTimerContainer.visible = false;
      this.stopCountdown();
      return;
    }

    const sideClockX = Math.round((this.virtualWidth * this.layoutPcts.turnClockSideXPct) / 100);
    const sideClockY = Math.round((DESIGN_HEIGHT * this.layoutPcts.opponentDeckTopPct) / 100);
    const bottomClockY = Math.round((DESIGN_HEIGHT * this.layoutPcts.turnClockBottomTopPct) / 100);

    if (relativePos === 'bottom') {
      this.clearPlayedSlot(this.playedBottom);
      this.turnTimerContainer.position.set(this.virtualWidth / 2, bottomClockY);
    } else if (relativePos === 'left') {
      this.clearPlayedSlot(this.playedLeft);
      this.turnTimerContainer.position.set(sideClockX, sideClockY);
    } else if (relativePos === 'right') {
      this.clearPlayedSlot(this.playedRight);
      this.turnTimerContainer.position.set(this.virtualWidth - sideClockX, sideClockY);
    }

    this.turnTimerContainer.visible = true;
    this.startCountdown(timeoutAt);
  }

  /**
   * Synchronize PixiJS stage coordinates with resolution-tier percentage matrix.
   */
  public applyLayoutPercentages(pcts: {
    holeCardsTopPct: number;
    scoreLineTopPct: number;
    opponentDeckSideXPct: number;
    opponentDeckTopPct: number;
    turnClockSideXPct: number;
    turnClockBottomTopPct: number;
    playedSideXPct: number;
    playedSideTopPct: number;
    playedBottomTopPct: number;
    handCenterYPct: number;
    handWidthPct: number;
    handCardScale: number;
    comboBannerTopPct: number;
    handBandTopPct: number;
    handBandBottomPct: number;
  }): void {
    if (this.destroyed) return;
    this.layoutPcts = { ...pcts };

    if (this.landlordCardsArea && !this.landlordCardsArea.destroyed) {
      this.landlordCardsArea.position.set(
        this.virtualWidth / 2,
        Math.round((DESIGN_HEIGHT * pcts.holeCardsTopPct) / 100)
      );
    }

    if (this.scoreDisplayText && !this.scoreDisplayText.destroyed) {
      this.scoreDisplayText.position.set(
        this.virtualWidth / 2,
        Math.round((DESIGN_HEIGHT * pcts.scoreLineTopPct) / 100)
      );
    }

    const deckX = Math.round((this.virtualWidth * pcts.opponentDeckSideXPct) / 100);
    const deckY = Math.round((DESIGN_HEIGHT * pcts.opponentDeckTopPct) / 100);
    if (this.leftStackContainer && !this.leftStackContainer.destroyed) {
      this.leftStackContainer.position.set(deckX, deckY);
    }
    if (this.rightStackContainer && !this.rightStackContainer.destroyed) {
      this.rightStackContainer.position.set(this.virtualWidth - deckX, deckY);
    }

    const playedSideX = Math.round((this.virtualWidth * pcts.playedSideXPct) / 100);
    const playedSideY = Math.round((DESIGN_HEIGHT * pcts.playedSideTopPct) / 100);
    const playedBottomY = Math.round((DESIGN_HEIGHT * pcts.playedBottomTopPct) / 100);
    if (this.playedLeft && !this.playedLeft.destroyed) {
      this.playedLeft.position.set(playedSideX, playedSideY);
    }
    if (this.playedRight && !this.playedRight.destroyed) {
      this.playedRight.position.set(this.virtualWidth - playedSideX, playedSideY);
    }
    if (this.playedBottom && !this.playedBottom.destroyed) {
      this.playedBottom.position.set(this.virtualWidth / 2, playedBottomY);
    }

    if (this.turnTimerContainer && !this.turnTimerContainer.destroyed && this.currentTurnRelativePos) {
      const sideClockX = Math.round((this.virtualWidth * pcts.turnClockSideXPct) / 100);
      const bottomClockY = Math.round((DESIGN_HEIGHT * pcts.turnClockBottomTopPct) / 100);
      if (this.currentTurnRelativePos === 'bottom') {
        this.turnTimerContainer.position.set(this.virtualWidth / 2, bottomClockY);
      } else if (this.currentTurnRelativePos === 'left') {
        this.turnTimerContainer.position.set(sideClockX, deckY);
      } else if (this.currentTurnRelativePos === 'right') {
        this.turnTimerContainer.position.set(this.virtualWidth - sideClockX, deckY);
      }
    }

    this.handManager.configureResponsiveZone({
      centerX: this.virtualWidth / 2,
      baseY: Math.round((DESIGN_HEIGHT * pcts.handCenterYPct) / 100),
      availableWidth: Math.round((this.virtualWidth * pcts.handWidthPct) / 100),
      cardScale: pcts.handCardScale,
      comboBannerY: Math.round((DESIGN_HEIGHT * pcts.comboBannerTopPct) / 100),
      handBandTop: Math.round((DESIGN_HEIGHT * pcts.handBandTopPct) / 100),
      handBandBottom: Math.round((DESIGN_HEIGHT * pcts.handBandBottomPct) / 100),
    });
  }

  /**
   * Frame-synchronized scale modulation driven by `--ui-element-scale` inside requestAnimationFrame.
   * Uses a sub-pixel deadzone threshold (0.001) to prevent high-refresh-rate (90Hz/120Hz) matrix jitter.
   */
  public syncFrameUiScale(uiElementScale: number): void {
    if (this.destroyed) return;
    const clamped = Math.max(0.75, Math.min(1.05, uiElementScale));
    // Map --ui-element-scale [0.78..1.0] to a subtle PixiJS widget scale [0.90..1.0]
    const widgetScale = Number((0.9 + ((clamped - 0.78) / 0.22) * 0.1).toFixed(4));
    if (Math.abs(widgetScale - this.lastSyncedUiScale) < 0.001) {
      return;
    }
    this.lastSyncedUiScale = widgetScale;

    if (this.landlordCardsArea && !this.landlordCardsArea.destroyed) {
      this.landlordCardsArea.scale.set(widgetScale);
    }
    if (this.leftStackContainer && !this.leftStackContainer.destroyed) {
      this.leftStackContainer.scale.set(widgetScale);
    }
    if (this.rightStackContainer && !this.rightStackContainer.destroyed) {
      this.rightStackContainer.scale.set(widgetScale);
    }
    if (this.turnTimerContainer && !this.turnTimerContainer.destroyed) {
      this.turnTimerContainer.scale.set(widgetScale);
    }
    if (this.scoreDisplayText && !this.scoreDisplayText.destroyed) {
      this.scoreDisplayText.scale.set(widgetScale);
    }
  }

  /**
   * Render seat action badge or physical card-play trajectory onto the table.
   */
  showSeatAction(
    relativePos: 'bottom' | 'left' | 'right',
    action: {
      type:
        | 'call'
        | 'no_call'
        | 'grab'
        | 'no_grab'
        | 'swap_three'
        | 'double_1'
        | 'double_2'
        | 'double_4'
        | 'play'
        | 'pass';
      cards?: CardData[];
      patternLabel?: string;
      isLandlord?: boolean;
    }
  ): void {
    if (this.destroyed) return;
    const slot =
      relativePos === 'bottom'
        ? this.playedBottom
        : relativePos === 'left'
          ? this.playedLeft
          : this.playedRight;

    if (!slot || slot.destroyed) return;
    this.clearPlayedSlot(slot);

    const playedSideX = Math.round((this.virtualWidth * this.layoutPcts.playedSideXPct) / 100);
    const playedSideY = Math.round((DESIGN_HEIGHT * this.layoutPcts.playedSideTopPct) / 100);
    const playedBottomY = Math.round((DESIGN_HEIGHT * this.layoutPcts.playedBottomTopPct) / 100);

    const anchorPos =
      relativePos === 'bottom'
        ? { x: this.virtualWidth / 2, y: playedBottomY }
        : relativePos === 'left'
          ? { x: playedSideX, y: playedSideY }
          : { x: this.virtualWidth - playedSideX, y: playedSideY };

    slot.position.set(anchorPos.x, anchorPos.y);

    if (action.type !== 'play' || !action.cards || action.cards.length === 0) {
      const textMap: Record<string, { text: string; color: number }> = {
        call: { text: '叫地主', color: 0xfbbf24 },
        no_call: { text: '不 叫', color: 0xcbd5e1 },
        grab: { text: '抢地主!', color: 0xf87171 },
        no_grab: { text: '不 抢', color: 0xcbd5e1 },
        swap_three: { text: '已选三张', color: 0x38bdf8 },
        double_1: { text: '不加倍', color: 0xcbd5e1 },
        double_2: { text: '加倍 ×2', color: 0xfbbf24 },
        double_4: { text: '超级加倍 ×4', color: 0xf87171 },
        pass: { text: '不 出', color: 0x94a3b8 },
      };
      const item = textMap[action.type] ?? { text: '不 出', color: 0x94a3b8 };

      const badge = new Container();
      const w = action.type === 'double_4' ? 136 : 104;
      const bg = new Graphics();
      bg.roundRect(-w / 2, -18, w, 36, 18)
        .fill({ color: 0x051e15, alpha: 0.92 })
        .stroke({ color: item.color, width: 1.8, alpha: 0.85 });

      const label = new Text({
        text: item.text,
        style: {
          fontFamily: 'Outfit, PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: 17,
          fontWeight: 'bold',
          fill: item.color,
        },
      });
      label.anchor.set(0.5);
      badge.addChild(bg, label);
      badge.scale.set(0.5);
      slot.addChild(badge);
      gsap.to(badge.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out(1.7)' });
      return;
    }

    // Sort played cards canonically: main Triples/Quads on the left, kickers/wings on the right
    const freqMap = new Map<number, number>();
    for (const c of action.cards) {
      freqMap.set(c.value, (freqMap.get(c.value) ?? 0) + 1);
    }
    const hasTripleOrQuad = Array.from(freqMap.values()).some((cnt) => cnt >= 3);
    const cards = hasTripleOrQuad
      ? [...action.cards].sort((a, b) => {
          const ca = freqMap.get(a.value) ?? 1;
          const cb = freqMap.get(b.value) ?? 1;
          const ga = ca >= 3 ? ca : 0;
          const gb = cb >= 3 ? cb : 0;
          if (gb !== ga) return gb - ga;
          if (cb !== ca) return cb - ca;
          return b.value - a.value;
        })
      : [...action.cards];

    const count = cards.length;
    const step = 30;
    const totalW = (count - 1) * step;
    const startX = -totalW / 2;

    // Origin offset relative to slot for parabolic card throw onto table
    const originOffset =
      relativePos === 'bottom'
        ? { x: 0, y: 120 }
        : relativePos === 'left'
          ? { x: -130, y: -10 }
          : { x: 130, y: -10 };

    // Subtle table dust impact ring
    const impactRipple = new Graphics();
    impactRipple
      .ellipse(0, 0, Math.max(55, totalW * 0.55), 28)
      .stroke({ color: 0xfde68a, width: 1.5, alpha: 0.55 });
    slot.addChild(impactRipple);
    gsap.to(impactRipple.scale, { x: 1.35, y: 1.35, duration: 0.32, ease: 'power2.out' });
    gsap.to(impactRipple, { alpha: 0, duration: 0.32 });

    cards.forEach((cData, i) => {
      const isLandlordCard = Boolean(action.isLandlord && i === count - 1);
      const card = new Card(cData, true, isLandlordCard);
      card.pivot.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);
      card.scale.set(0.52);
      card.position.set(originOffset.x, originOffset.y);
      card.rotation = (i - (count - 1) / 2) * 0.03;
      slot.addChild(card);

      const finalRot = ((i % 3) - 1) * 0.018;
      gsap.to(card, {
        x: startX + i * step,
        y: 0,
        rotation: finalRot,
        duration: 0.22,
        delay: i * 0.015,
        ease: 'back.out(1.4)',
      });
      gsap.to(card.scale, {
        x: 0.72,
        y: 0.72,
        duration: 0.22,
        delay: i * 0.015,
        ease: 'back.out(1.5)',
      });
    });

    if (action.patternLabel && action.patternLabel !== '单张' && action.patternLabel !== '对子') {
      const tagContainer = new Container();
      tagContainer.position.set(0, 62);
      const tagBg = new Graphics();
      tagBg
        .roundRect(-48, -12, 96, 24, 12)
        .fill({ color: 0x051e15, alpha: 0.9 })
        .stroke({ color: 0xf59e0b, width: 1.4 });
      const tag = new Text({
        text: action.patternLabel,
        style: {
          fontFamily: 'Outfit, PingFang SC, sans-serif',
          fontSize: 13,
          fontWeight: 'bold',
          fill: 0xfde68a,
        },
      });
      tag.anchor.set(0.5);
      tagContainer.addChild(tagBg, tag);
      slot.addChild(tagContainer);
    }
  }

  /**
   * Parabolic Interactive Prop Throw System (鲜花 / 炸弹茶杯 / 敬茶 / 点赞 / 元宝)
   */
  playPropThrowEffect(
    fromRel: 'bottom' | 'left' | 'right',
    toRel: 'bottom' | 'left' | 'right',
    propType: PropType
  ): void {
    if (this.destroyed || !this.effectsLayer || this.effectsLayer.destroyed) return;

    const coords: Record<'bottom' | 'left' | 'right', { x: number; y: number }> = {
      bottom: { x: 130, y: 690 },
      left: { x: 140, y: 140 },
      right: { x: this.virtualWidth - 140, y: 140 },
    };

    const start = coords[fromRel];
    const end = coords[toRel];

    const propConfig: Record<
      PropType,
      { label: string; color: number; secondaryColor: number }
    > = {
      flower: { label: '赠送鲜花', color: 0xf43f5e, secondaryColor: 0xfda4af },
      bomb_cup: { label: '投掷炸弹', color: 0xef4444, secondaryColor: 0xfbbf24 },
      tea: { label: '清茶一盏', color: 0x10b981, secondaryColor: 0x6ee7b7 },
      like: { label: '点赞喝彩', color: 0xf59e0b, secondaryColor: 0xfde047 },
      ingot: { label: '招财进宝', color: 0xeab308, secondaryColor: 0xfef08a },
    };
    const cfg = propConfig[propType] ?? propConfig.flower;

    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 185;

    const trajectoryContainer = new Container();
    this.effectsLayer.addChild(trajectoryContainer);

    const arcDots = 18;
    for (let i = 1; i < arcDots; i++) {
      const t = i / arcDots;
      const omt = 1 - t;
      const px = omt * omt * start.x + 2 * omt * t * midX + t * t * end.x;
      const py = omt * omt * start.y + 2 * omt * t * midY + t * t * end.y;

      const dot = new Graphics();
      dot.circle(0, 0, i % 2 === 0 ? 3 : 2);
      dot.fill({ color: cfg.secondaryColor, alpha: 0.55 * (1 - Math.abs(t - 0.5)) });
      dot.position.set(px, py);
      trajectoryContainer.addChild(dot);
    }

    const flyer = new Container();
    flyer.position.set(start.x, start.y);

    const glow = new Graphics();
    glow.circle(0, 0, 30).fill({ color: cfg.color, alpha: 0.28 });
    glow.stroke({ color: cfg.secondaryColor, width: 2.2 });

    const propIllustration = new Graphics();
    if (propType === 'bomb_cup') {
      propIllustration.roundRect(-16, 2, 32, 18, 7);
      propIllustration.fill({ color: 0xf8fafc });
      propIllustration.stroke({ color: 0x38bdf8, width: 2 });
      propIllustration.circle(0, -5, 13);
      propIllustration.fill({ color: 0x18181b });
      propIllustration.stroke({ color: 0xf59e0b, width: 1.5 });
      propIllustration.circle(6, -18, 4).fill({ color: 0xfbbf24 });
    } else if (propType === 'flower') {
      for (let p = 0; p < 6; p++) {
        const a = (p * Math.PI) / 3;
        propIllustration.circle(Math.cos(a) * 11, Math.sin(a) * 11, 8);
        propIllustration.fill({ color: 0xf43f5e, alpha: 0.9 });
      }
      propIllustration.circle(0, 0, 6).fill({ color: 0xfef08a });
    } else if (propType === 'tea') {
      propIllustration.roundRect(-14, -8, 28, 22, 6);
      propIllustration.fill({ color: 0x10b981 });
      propIllustration.stroke({ color: 0x6ee7b7, width: 2 });
      propIllustration.circle(0, 16, 16).fill({ color: 0x064e3b });
    } else if (propType === 'like') {
      propIllustration.roundRect(-14, -12, 28, 24, 7);
      propIllustration.fill({ color: 0xf59e0b });
      propIllustration.stroke({ color: 0xfde047, width: 2 });
      propIllustration.circle(0, -6, 6).fill({ color: 0xfef08a });
    } else if (propType === 'ingot') {
      propIllustration.ellipse(0, 0, 18, 11).fill({ color: 0xeab308 });
      propIllustration.stroke({ color: 0xfef08a, width: 2 });
      propIllustration.circle(0, -2, 6).fill({ color: 0xfef08a });
    }

    flyer.addChild(glow, propIllustration);
    this.effectsLayer.addChild(flyer);

    const animObj = { t: 0 };
    let stepCounter = 0;

    gsap.to(animObj, {
      t: 1,
      duration: 0.64,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (this.destroyed || flyer.destroyed || !flyer.scale) return;
        const t = animObj.t;
        const omt = 1 - t;
        const nx = omt * omt * start.x + 2 * omt * t * midX + t * t * end.x;
        const ny = omt * omt * start.y + 2 * omt * t * midY + t * t * end.y;

        flyer.x = nx;
        flyer.y = ny;
        flyer.rotation =
          propType === 'bomb_cup' ? t * Math.PI * 3.5 : Math.sin(t * Math.PI * 2) * 0.35;
        const s = 1 + 0.38 * Math.sin(t * Math.PI);
        flyer.scale.set(s);

        stepCounter++;
        if (stepCounter % 2 === 0 && !this.effectsLayer.destroyed) {
          const trail = new Graphics();
          trail.circle(0, 0, propType === 'bomb_cup' ? 4 : 3.5);
          trail.fill({
            color: stepCounter % 4 === 0 ? cfg.color : cfg.secondaryColor,
            alpha: 0.85,
          });
          trail.position.set(nx + (Math.random() - 0.5) * 12, ny + (Math.random() - 0.5) * 12);
          this.effectsLayer.addChild(trail);
          gsap.to(trail, {
            y: trail.y + (propType === 'bomb_cup' ? -14 : 16),
            alpha: 0,
            duration: 0.28,
            onComplete: () => {
              if (!trail.destroyed) {
                if (trail.parent === this.effectsLayer && !this.effectsLayer.destroyed) {
                  this.effectsLayer.removeChild(trail);
                }
                trail.destroy();
              }
            },
          });
        }
      },
      onComplete: () => {
        if (!trajectoryContainer.destroyed) {
          this.killTweensRecursively(trajectoryContainer);
          if (
            trajectoryContainer.parent === this.effectsLayer &&
            !this.effectsLayer.destroyed
          ) {
            this.effectsLayer.removeChild(trajectoryContainer);
          }
          trajectoryContainer.destroy({ children: true });
        }

        if (flyer.destroyed || this.destroyed || this.effectsLayer.destroyed) return;

        this.killTweensRecursively(flyer);
        if (flyer.parent === this.effectsLayer) {
          this.effectsLayer.removeChild(flyer);
        }
        flyer.destroy({ children: true });

        const burst = new Container();
        burst.position.set(end.x, end.y);
        this.effectsLayer.addChild(burst);

        if (propType === 'bomb_cup') {
          this.triggerScreenShake(9, 0.38);
        }

        const shockRing = new Graphics();
        shockRing.circle(0, 0, 24).stroke({
          color: propType === 'bomb_cup' ? 0xef4444 : cfg.color,
          width: propType === 'bomb_cup' ? 4 : 3,
        });
        burst.addChild(shockRing);
        gsap.to(shockRing.scale, {
          x: propType === 'bomb_cup' ? 3.2 : 2.4,
          y: propType === 'bomb_cup' ? 3.2 : 2.4,
          duration: 0.45,
          ease: 'power2.out',
        });
        gsap.to(shockRing, { alpha: 0, duration: 0.45 });

        const particleTotal = propType === 'bomb_cup' ? 18 : 14;
        for (let i = 0; i < particleTotal; i++) {
          const p = new Graphics();
          p.circle(0, 0, propType === 'bomb_cup' ? 5.5 : 4.5).fill({
            color: i % 2 === 0 ? cfg.color : cfg.secondaryColor,
          });
          burst.addChild(p);
          const angle = (Math.PI * 2 * i) / particleTotal;
          const dist = propType === 'bomb_cup' ? 88 + (i % 3) * 16 : 68 + (i % 2) * 14;
          gsap.to(p, {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            alpha: 0,
            duration: 0.52,
            ease: 'power2.out',
          });
        }

        const badgeBg = new Graphics();
        badgeBg
          .roundRect(-96, -52, 192, 30, 15)
          .fill({
            color: propType === 'bomb_cup' ? 0x7f1d1d : 0x062016,
            alpha: 0.94,
          })
          .stroke({ color: cfg.secondaryColor, width: 1.8 });
        burst.addChild(badgeBg);

        const tag = new Text({
          text: cfg.label,
          style: {
            fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: 13,
            fontWeight: 'bold',
            fill: 0xfef08a,
          },
        });
        tag.anchor.set(0.5);
        tag.position.set(0, -37);
        burst.addChild(tag);

        gsap.to(burst, {
          alpha: 0,
          y: end.y - 20,
          delay: 0.58,
          duration: 0.28,
          onComplete: () => {
            if (!burst.destroyed) {
              this.killTweensRecursively(burst);
              if (burst.parent === this.effectsLayer && !this.effectsLayer.destroyed) {
                this.effectsLayer.removeChild(burst);
              }
              burst.destroy({ children: true });
            }
          },
        });
      },
    });
  }

  clearAllPlayedAreas(): void {
    if (this.destroyed) return;
    this.clearPlayedSlot(this.playedBottom);
    this.clearPlayedSlot(this.playedLeft);
    this.clearPlayedSlot(this.playedRight);
  }

  private clearPlayedSlot(slot: Container): void {
    if (!slot || slot.destroyed) return;
    while (slot.children.length > 0) {
      const child = slot.children[0];
      slot.removeChild(child);
      this.killTweensRecursively(child);
      child.destroy({ children: true });
    }
  }

  private killTweensRecursively(node: Container): void {
    gsap.killTweensOf(node);
    if (node.scale) {
      gsap.killTweensOf(node.scale);
    }
    if (node.children) {
      for (const ch of node.children) {
        this.killTweensRecursively(ch as Container);
      }
    }
  }

  private triggerScreenShake(intensity = 12, duration = 0.48): void {
    if (this.destroyed) return;
    gsap.killTweensOf(this);
    gsap.fromTo(
      this,
      { x: -intensity, y: -intensity * 0.65 },
      {
        x: 0,
        y: 0,
        duration,
        ease: 'elastic.out(1.3, 0.18)',
      }
    );
  }

  /**
   * Commercial 4.0 60fps Skill & Pattern VFX Engine:
   * - ROCKET (王炸): Dragon Missile Launch -> Sky Dive -> Double Shockwave + Nuclear Flash
   * - BOMB (炸弹): 3D Iron Sphere Bomb Throw -> Sizzling Fuse -> Shrapnel Explosion
   * - AIRPLANE* (飞机): 3D Twin-Wing Golden Biplane Flyby with Cloud Contrails
   * - STRAIGHT / CONSECUTIVE_PAIRS (顺子/连对): Golden Dragon Ribbon Sweep
   * - SPRING (春天/反春): Full-screen Peach Blossom & Gold Leaf Cascade
   */
  playPatternEffect(patternType: string, patternLabel: string): void {
    if (
      this.destroyed ||
      !this.effectsLayer ||
      this.effectsLayer.destroyed ||
      patternType === 'SINGLE' ||
      patternType === 'PAIR' ||
      patternType === 'TRIPLE' ||
      patternType === 'TRIPLE_SINGLE' ||
      patternType === 'TRIPLE_PAIR' ||
      patternType === 'PASS'
    ) {
      return;
    }

    if (patternType === 'ROCKET') {
      hapticEngine.rocketBlast();
      this.playRocketMissileEffect(patternLabel);
      return;
    }
    if (patternType === 'BOMB') {
      hapticEngine.bombBlast();
      this.playBombFuseBlastEffect(patternLabel);
      return;
    }
    if (patternType.startsWith('AIRPLANE')) {
      this.playBiplaneFlybyEffect(patternLabel);
      return;
    }
    if (patternType === 'SPRING') {
      this.playSpringBlossomEffect(patternLabel);
      return;
    }

    // Default: Straight / Consecutive Pairs / Four-with-Two Golden Dragon Streamer
    this.playGoldenDragonRibbonEffect(patternLabel);
  }

  /**
   * 1. ROCKET (王炸) — Dragon Missile Launch, Sky Dive & Nuclear Shockwave
   */
  private playRocketMissileEffect(patternLabel: string): void {
    const fx = new Container();
    this.effectsLayer.addChild(fx);

    const cx = this.virtualWidth / 2;
    const cy = 310;

    // Build bespoke vector Dragon Missile
    const missile = new Container();
    missile.position.set(cx, DESIGN_HEIGHT + 60);
    const body = new Graphics();
    // Nose cone
    body
      .moveTo(0, -56)
      .quadraticCurveTo(18, -28, 16, 18)
      .lineTo(-16, 18)
      .quadraticCurveTo(-18, -28, 0, -56)
      .fill({ color: 0xdc2626 })
      .stroke({ width: 2.2, color: 0xfef08a });
    // Gold stripes & fins
    body.rect(-14, -12, 28, 8).fill({ color: 0xf59e0b });
    body
      .moveTo(-16, 4)
      .lineTo(-30, 26)
      .lineTo(-16, 18)
      .closePath()
      .fill({ color: 0xf59e0b });
    body
      .moveTo(16, 4)
      .lineTo(30, 26)
      .lineTo(16, 18)
      .closePath()
      .fill({ color: 0xf59e0b });
    // Exhaust flame
    body
      .moveTo(-11, 18)
      .lineTo(0, 52)
      .lineTo(11, 18)
      .closePath()
      .fill({ color: 0xfef08a });
    missile.addChild(body);
    fx.addChild(missile);

    // Phase 1: Ascend into the sky
    gsap.to(missile, {
      y: -90,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => {
        if (fx.destroyed) return;
        // Phase 2: Flip upside down and dive onto table center
        missile.rotation = Math.PI;
        missile.y = -90;
        gsap.to(missile, {
          y: cy,
          duration: 0.18,
          ease: 'power3.in',
          onComplete: () => {
            if (fx.destroyed) return;
            missile.visible = false;
            this.triggerScreenShake(16, 0.55);
            this.spawnExplosionAt(fx, cx, cy, `${patternLabel} ×2`, true);
          },
        });
      },
    });
  }

  /**
   * 2. BOMB (炸弹) — 3D Iron Sphere Bomb Arc, Sizzling Fuse & Shrapnel Explosion
   */
  private playBombFuseBlastEffect(patternLabel: string): void {
    const fx = new Container();
    this.effectsLayer.addChild(fx);

    const cx = this.virtualWidth / 2;
    const cy = 310;

    const bomb = new Container();
    bomb.position.set(cx - 180, cy + 120);

    const sphere = new Graphics();
    sphere
      .circle(0, 0, 28)
      .fill({ color: 0x18181b })
      .stroke({ width: 2.5, color: 0xf59e0b });
    sphere.circle(-9, -9, 7).fill({ color: 0x52525b, alpha: 0.7 });
    // Fuse cord & spark
    sphere
      .moveTo(14, -20)
      .quadraticCurveTo(26, -34, 32, -26)
      .stroke({ width: 3, color: 0xd97706 });
    sphere.circle(32, -26, 6).fill({ color: 0xfef08a });
    bomb.addChild(sphere);
    fx.addChild(bomb);

    // Throw arc to center
    gsap.to(bomb, {
      x: cx,
      y: cy,
      rotation: Math.PI * 2,
      duration: 0.26,
      ease: 'back.out(1.4)',
      onComplete: () => {
        if (fx.destroyed) return;
        // Pulse twice then detonate
        gsap.to(bomb.scale, {
          x: 1.32,
          y: 1.32,
          duration: 0.14,
          onComplete: () => {
            if (fx.destroyed) return;
            bomb.visible = false;
            this.triggerScreenShake(13, 0.48);
            this.spawnExplosionAt(fx, cx, cy, `${patternLabel} ×2`, false);
          },
        });
      },
    });
  }

  private spawnExplosionAt(
    fx: Container,
    cx: number,
    cy: number,
    bannerTitle: string,
    isNuclear: boolean
  ): void {
    const centerNode = new Container();
    centerNode.position.set(cx, cy);
    fx.addChild(centerNode);

    // Full-table flash overlay
    const flash = new Graphics();
    flash
      .rect(-cx, -cy, this.virtualWidth, DESIGN_HEIGHT)
      .fill({ color: isNuclear ? 0xef4444 : 0xf59e0b, alpha: 0.26 });
    centerNode.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.35 });

    // Double Shockwave Rings
    for (let r = 0; r < 2; r++) {
      const ring = new Graphics();
      ring.circle(0, 0, 42 + r * 18).stroke({
        color: r === 0 ? 0xfef08a : 0xef4444,
        width: 5 - r * 1.5,
      });
      centerNode.addChild(ring);
      gsap.to(ring.scale, {
        x: isNuclear ? 5.2 : 4.2,
        y: isNuclear ? 5.2 : 4.2,
        duration: 0.6 + r * 0.12,
        ease: 'power2.out',
      });
      gsap.to(ring, { alpha: 0, duration: 0.6 + r * 0.12 });
    }

    // 28 Shrapnel Sparks
    const total = isNuclear ? 32 : 26;
    for (let i = 0; i < total; i++) {
      const p = new Graphics();
      p.circle(0, 0, i % 3 === 0 ? 7 : 5).fill({
        color: i % 2 === 0 ? 0xfef08a : 0xef4444,
      });
      centerNode.addChild(p);
      const angle = (Math.PI * 2 * i) / total;
      const dist = (isNuclear ? 260 : 210) + (i % 4) * 35;
      gsap.to(p, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: 0,
        duration: 0.68,
        ease: 'power2.out',
      });
    }

    // Heroic Banner
    const banner = this.createSkillBanner(bannerTitle, 0x991b1b);
    banner.scale.set(0.3);
    centerNode.addChild(banner);
    gsap.to(banner.scale, { x: 1.15, y: 1.15, duration: 0.24, ease: 'back.out(2.1)' });

    gsap.to(fx, {
      alpha: 0,
      delay: 0.82,
      duration: 0.28,
      onComplete: () => this.cleanupFxNode(fx),
    });
  }

  /**
   * 3. AIRPLANE (飞机 / 飞机带翅膀) — 3D Golden Biplane Swooping Across Clouds
   */
  private playBiplaneFlybyEffect(patternLabel: string): void {
    const fx = new Container();
    this.effectsLayer.addChild(fx);

    const plane = new Container();
    plane.position.set(-180, 295);
    fx.addChild(plane);

    // Draw Twin-Wing Golden Biplane
    const g = new Graphics();
    // Contrail ribbons
    g.roundRect(-190, -18, 150, 6, 3).fill({ color: 0xfef08a, alpha: 0.55 });
    g.roundRect(-190, 12, 150, 6, 3).fill({ color: 0xfef08a, alpha: 0.55 });
    // Fuselage
    g.roundRect(-55, -14, 110, 28, 14)
      .fill({ color: 0xf59e0b })
      .stroke({ width: 2.5, color: 0xfef08a });
    // Cockpit
    g.ellipse(10, -4, 18, 8).fill({ color: 0x38bdf8 });
    // Top & Bottom Swept Wings
    g.roundRect(-24, -46, 38, 92, 8)
      .fill({ color: 0xdc2626 })
      .stroke({ width: 2, color: 0xfde047 });
    // Tail fin
    g.moveTo(-50, -10)
      .lineTo(-72, -32)
      .lineTo(-42, -10)
      .closePath()
      .fill({ color: 0xdc2626 });
    // Nose spinner
    g.circle(56, 0, 8).fill({ color: 0xfef08a });
    plane.addChild(g);

    const banner = this.createSkillBanner(patternLabel, 0x065f46);
    banner.position.set(0, 68);
    plane.addChild(banner);

    gsap.to(plane, {
      x: this.virtualWidth + 220,
      y: 265,
      duration: 1.15,
      ease: 'power1.inOut',
      onComplete: () => this.cleanupFxNode(fx),
    });
  }

  /**
   * 4. STRAIGHT / CONSECUTIVE PAIRS (顺子 / 连对) — Golden Dragon Ribbon & Starlight
   */
  private playGoldenDragonRibbonEffect(patternLabel: string): void {
    const fx = new Container();
    fx.position.set(this.virtualWidth / 2, 305);
    this.effectsLayer.addChild(fx);

    const ribbon = new Graphics();
    ribbon
      .moveTo(-260, 28)
      .bezierCurveTo(-90, -65, 90, 65, 260, -28)
      .stroke({ width: 8, color: 0xfbbf24, alpha: 0.85 });
    ribbon
      .moveTo(-240, 34)
      .bezierCurveTo(-80, -55, 80, 75, 240, -20)
      .stroke({ width: 3, color: 0xfef08a, alpha: 0.95 });
    fx.addChild(ribbon);

    for (let i = 0; i < 20; i++) {
      const star = new Graphics();
      star.circle(0, 0, i % 2 === 0 ? 5 : 3.5).fill({ color: 0xfef08a });
      star.position.set((i - 10) * 24, Math.sin(i * 0.6) * 26);
      fx.addChild(star);
      gsap.to(star, {
        y: star.y - 38,
        alpha: 0,
        duration: 0.65,
        delay: i * 0.015,
        ease: 'power2.out',
      });
    }

    const banner = this.createSkillBanner(patternLabel, 0x065f46);
    banner.scale.set(0.35);
    fx.addChild(banner);
    gsap.to(banner.scale, { x: 1.08, y: 1.08, duration: 0.24, ease: 'back.out(2)' });

    gsap.to(fx, {
      alpha: 0,
      delay: 0.75,
      duration: 0.28,
      onComplete: () => this.cleanupFxNode(fx),
    });
  }

  /**
   * 5. SPRING (春天 / 反春) — Full-Screen Peach Blossom & Gold Foil Cascade
   */
  private playSpringBlossomEffect(patternLabel: string): void {
    const fx = new Container();
    this.effectsLayer.addChild(fx);

    for (let i = 0; i < 36; i++) {
      const petal = new Graphics();
      const isGold = i % 3 === 0;
      petal
        .ellipse(0, 0, isGold ? 6 : 8, isGold ? 4 : 5)
        .fill({ color: isGold ? 0xfbbf24 : 0xf43f5e, alpha: 0.9 });
      petal.position.set(120 + Math.random() * (this.virtualWidth - 240), -20 - Math.random() * 120);
      fx.addChild(petal);

      gsap.to(petal, {
        x: petal.x + (Math.random() - 0.5) * 180,
        y: DESIGN_HEIGHT + 40,
        rotation: Math.PI * (2 + Math.random() * 2),
        duration: 1.25 + Math.random() * 0.45,
        ease: 'sine.inOut',
      });
    }

    const banner = this.createSkillBanner(patternLabel, 0x9d174d);
    banner.position.set(this.virtualWidth / 2, 300);
    banner.scale.set(0.3);
    fx.addChild(banner);
    gsap.to(banner.scale, { x: 1.2, y: 1.2, duration: 0.3, ease: 'back.out(2)' });

    gsap.to(fx, {
      alpha: 0,
      delay: 1.35,
      duration: 0.35,
      onComplete: () => this.cleanupFxNode(fx),
    });
  }

  private createSkillBanner(text: string, bgColor: number): Container {
    const banner = new Container();
    const bg = new Graphics();
    bg.roundRect(-142, -32, 284, 64, 32)
      .fill({ color: bgColor, alpha: 0.95 })
      .stroke({ color: 0xfef08a, width: 3 });

    const label = new Text({
      text,
      style: {
        fontFamily: 'Outfit, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 28,
        fontWeight: '800',
        fill: 0xfef08a,
      },
    });
    label.anchor.set(0.5);
    banner.addChild(bg, label);
    return banner;
  }

  private cleanupFxNode(fx: Container): void {
    if (fx.destroyed) return;
    this.killTweensRecursively(fx);
    if (this.effectsLayer && !this.effectsLayer.destroyed && fx.parent === this.effectsLayer) {
      this.effectsLayer.removeChild(fx);
    }
    fx.destroy({ children: true });
  }

  private startCountdown(timeoutAt: number): void {
    this.stopCountdown();
    this.currentTimeoutAt = timeoutAt;
    this.lastTickedSec = -1;

    const tick = () => {
      if (
        this.destroyed ||
        !this.turnTimerText ||
        this.turnTimerText.destroyed ||
        !this.turnTimerText.style
      ) {
        this.stopCountdown();
        return;
      }
      const remSec = Math.max(0, Math.ceil((this.currentTimeoutAt - Date.now()) / 1000));
      this.turnTimerText.text = String(remSec);
      this.turnTimerText.tint = remSec <= 5 ? 0xf87171 : 0xfef08a;

      if (remSec > 0 && remSec <= 5 && remSec !== this.lastTickedSec) {
        this.lastTickedSec = remSec;
        soundEngine.playCountdownTick(remSec <= 3);
        if (remSec <= 3) {
          hapticEngine.urgentCountdown();
        }
      }
    };

    tick();
    this.countdownInterval = window.setInterval(tick, 250);
  }

  /**
   * 6. LAIZI REVEAL (星耀赖子揭晓特效)
   */
  public playLaiziRevealEffect(wildRanks: Rank[]): void {
    if (this.destroyed || !this.effectsLayer || this.effectsLayer.destroyed || wildRanks.length === 0) {
      return;
    }

    const fx = new Container();
    fx.position.set(this.virtualWidth / 2, 260);
    this.effectsLayer.addChild(fx);

    const isDual = wildRanks.length >= 2;
    const titleText = isDual
      ? `天地双赖揭晓：天赖 [${wildRanks[0]}] · 地赖 [${wildRanks[1]}]`
      : `百变赖子确定：天赖 [${wildRanks[0]}]`;

    const banner = this.createSkillBanner(titleText, 0x92400e);
    banner.scale.set(0.35);
    fx.addChild(banner);

    for (let i = 0; i < 16; i++) {
      const spark = new Graphics();
      spark.circle(0, 0, i % 2 === 0 ? 5 : 3.5).fill({ color: 0xfef08a });
      const angle = (Math.PI * 2 * i) / 16;
      fx.addChild(spark);
      gsap.to(spark, {
        x: Math.cos(angle) * 180,
        y: Math.sin(angle) * 75,
        alpha: 0,
        duration: 0.65,
        ease: 'power2.out',
      });
    }

    gsap.to(banner.scale, { x: 0.92, y: 0.92, duration: 0.25, ease: 'back.out(2)' });
    gsap.to(fx, {
      alpha: 0,
      y: 235,
      delay: 1.15,
      duration: 0.3,
      onComplete: () => this.cleanupFxNode(fx),
    });
  }

  private stopCountdown(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  destroyScene(): void {
    this.stopCountdown();
    if (!this.destroyed) {
      this.killTweensRecursively(this);
      this.handManager.clearHand();
      this.destroy({ children: true });
    }
  }
}
