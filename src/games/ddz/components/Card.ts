import { Container, DestroyOptions, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import gsap from 'gsap';
import { CardData } from '../types';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  CardAtlasGenerator,
  SUIT_CONFIG,
  getCardTexturePath,
} from '../assets/CardAtlasGenerator';

export type DragHighlightMode =
  | 'none'
  | 'normal'
  | 'covered'
  | 'combo_pick'
  | 'combo_skip';

/**
 * Commercial 5.0 High-Definition Playing Card Component.
 * Utilizes authentic official Tencent HLDDZ card textures with retina rendering.
 * Centered pivot (`CARD_WIDTH / 2, CARD_HEIGHT / 2`) for smooth scaling, fan layout, and 3D flips.
 * Retains Laizi gold badge, Landlord corner seal, combo aura, and selection feedback.
 */
export class Card extends Container {
  public readonly cardData: CardData;
  public selected: boolean = false;
  public comboHighlighted: boolean = false;
  public baseX: number = 0;
  public baseY: number = 626;

  private isFaceUp: boolean = true;
  private shadowGraphic: Graphics;
  private vectorBaseGraphic: Graphics;
  private cardSprite: Sprite;
  private highlightOverlay: Graphics;
  private comboAuraGraphic: Graphics;
  private comboTagBadge: Container;
  private comboTagText: Text;
  private landlordRibbon: Container;
  private wildBadge: Container;

  constructor(data: CardData, faceUp = true, isLandlordCard = false) {
    super();
    this.cardData = { ...data };
    this.isFaceUp = faceUp;
    this.pivot.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);

    // 1. Drop Shadow
    this.shadowGraphic = new Graphics();
    this.drawShadow(false);
    this.addChild(this.shadowGraphic);

    // 2. Combo Aura Glow (behind card body)
    this.comboAuraGraphic = new Graphics();
    this.comboAuraGraphic.visible = false;
    this.addChild(this.comboAuraGraphic);
    this.drawComboAura();

    // 2.5 Vector Fallback Base (Ensures card is immediately rendered with zero blank frame)
    this.vectorBaseGraphic = new Graphics();
    this.addChild(this.vectorBaseGraphic);
    this.drawVectorBase();

    // 3. Official HD Texture Card Face
    const texPath = getCardTexturePath(this.cardData, this.isFaceUp);
    this.cardSprite = Sprite.from(texPath);
    this.stabilizeSpriteSize(this.cardSprite);
    this.addChild(this.cardSprite);

    // 4. Interactive Highlight & Border Overlay
    this.highlightOverlay = new Graphics();
    this.addChild(this.highlightOverlay);
    this.updateHighlightOverlay('none');

    // 5. Landlord Corner Seal
    this.landlordRibbon = new Container();
    this.buildLandlordRibbon();
    this.landlordRibbon.visible = isLandlordCard;
    this.addChild(this.landlordRibbon);

    // 6. Laizi Gilded Seal (Bottom-Left)
    this.wildBadge = new Container();
    this.buildWildBadge();
    this.wildBadge.visible = Boolean(this.cardData.isWild);
    this.addChild(this.wildBadge);

    // 7. Top-Center Combo Pattern Badge ("顺子" / "连对" / "飞机")
    this.comboTagBadge = new Container();
    this.comboTagText = new Text({
      text: '顺子',
      style: {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 10,
        fontWeight: '800',
        fill: '#18181B',
      },
    });
    this.buildComboTagBadge();
    this.comboTagBadge.visible = false;
    this.addChild(this.comboTagBadge);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(0, -24, CARD_WIDTH, CARD_HEIGHT + 34);
  }

  public get isSelected(): boolean {
    return this.selected;
  }

  public get faceUp(): boolean {
    return this.isFaceUp;
  }

  public setFaceUp(faceUp: boolean): void {
    if (this.isFaceUp === faceUp) return;
    this.isFaceUp = faceUp;
    const texPath = getCardTexturePath(this.cardData, this.isFaceUp);
    this.cardSprite.texture = Texture.from(texPath);
    this.stabilizeSpriteSize(this.cardSprite);
    this.drawVectorBase();
    this.wildBadge.visible = faceUp && Boolean(this.cardData.isWild);
  }

  /**
   * Enforces exact commercial card dimensions even if texture is asynchronously loading.
   */
  private stabilizeSpriteSize(sprite: Sprite): void {
    const applySize = () => {
      const tex = sprite.texture;
      if (tex && tex.width > 1 && tex.height > 1) {
        sprite.width = CARD_WIDTH;
        sprite.height = CARD_HEIGHT;
      }
    };

    applySize();

    const tex = sprite.texture;
    if (tex && (tex.width <= 1 || tex.height <= 1)) {
      const source = tex.source;
      if (source) {
        source.once('update', () => {
          if (!this.destroyed && !sprite.destroyed) {
            applySize();
          }
        });
      }
    }
  }

  private drawVectorBase(): void {
    this.vectorBaseGraphic.clear();
    if (!this.isFaceUp) {
      this.vectorBaseGraphic
        .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
        .fill({ color: 0x1e3a5f })
        .stroke({ color: 0x93c5fd, width: 2 });
      this.vectorBaseGraphic
        .roundRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, 6)
        .stroke({ color: 0xf59e0b, width: 1.2, alpha: 0.6 });
      return;
    }

    this.vectorBaseGraphic
      .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
      .fill({ color: 0xfcfbf7 })
      .stroke({ color: 0xd1d5db, width: 1.5 });

    const rank = this.cardData.rank;
    const suit = this.cardData.suit;

    if (rank === 'big_joker' || rank === 'small_joker') {
      const isBig = rank === 'big_joker';
      const color = isBig ? 0xdc2626 : 0x18181b;
      this.vectorBaseGraphic
        .circle(CARD_WIDTH / 2, CARD_HEIGHT / 2 - 10, 16)
        .fill({ color, alpha: 0.15 });
      return;
    }

    if (suit && SUIT_CONFIG[suit]) {
      CardAtlasGenerator.drawSuitPip(this.vectorBaseGraphic, suit, 18, 42, 6);
      CardAtlasGenerator.drawSuitPip(this.vectorBaseGraphic, suit, CARD_WIDTH / 2, CARD_HEIGHT / 2 + 10, 16);
    }
  }

  private drawShadow(selected: boolean): void {
    this.shadowGraphic.clear();
    this.shadowGraphic
      .roundRect(1, selected ? 6 : 3, CARD_WIDTH, CARD_HEIGHT, 8)
      .fill({ color: 0x000000, alpha: selected ? 0.38 : 0.24 });
  }

  private drawComboAura(): void {
    this.comboAuraGraphic.clear();
    this.comboAuraGraphic
      .roundRect(-4, -4, CARD_WIDTH + 8, CARD_HEIGHT + 8, 12)
      .fill({ color: 0xfbbf24, alpha: 0.28 })
      .stroke({ width: 2.5, color: 0xfde047, alpha: 0.95 });
  }

  private buildComboTagBadge(): void {
    const bg = new Graphics();
    bg.roundRect(CARD_WIDTH / 2 - 22, -13, 44, 16, 8)
      .fill({ color: 0xf59e0b })
      .stroke({ width: 1.2, color: 0xfef08a });
    this.comboTagBadge.addChild(bg);

    this.comboTagText.anchor.set(0.5);
    this.comboTagText.x = CARD_WIDTH / 2;
    this.comboTagText.y = -5;
    this.comboTagBadge.addChild(this.comboTagText);
  }

  private buildWildBadge(): void {
    const pill = new Graphics();
    pill
      .roundRect(4, CARD_HEIGHT - 22, 28, 16, 5)
      .fill({ color: 0xd97706 })
      .stroke({ width: 1.2, color: 0xfef08a });

    const label = new Text({
      text: '赖',
      style: {
        fontFamily: 'Outfit, PingFang SC, sans-serif',
        fontSize: 10,
        fontWeight: '800',
        fill: '#FFFBEB',
      },
    });
    label.anchor.set(0.5);
    label.x = 18;
    label.y = CARD_HEIGHT - 14;

    this.wildBadge.addChild(pill, label);
  }

  public setWildBadgeVisible(isWild: boolean): void {
    if (this.destroyed) return;
    this.cardData.isWild = isWild;
    this.wildBadge.visible = this.isFaceUp && Boolean(isWild);
    this.updateHighlightOverlay('none');
  }

  private updateHighlightOverlay(dragMode: DragHighlightMode = 'none'): void {
    this.highlightOverlay.clear();

    const isWild = Boolean(this.cardData.isWild);

    if (dragMode === 'combo_pick') {
      this.highlightOverlay
        .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
        .fill({ color: 0xfef3c7, alpha: 0.22 })
        .stroke({ width: 2.6, color: 0xf59e0b });
    } else if (dragMode === 'covered') {
      this.highlightOverlay
        .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
        .fill({ color: 0xfef08a, alpha: 0.28 })
        .stroke({ width: 2.2, color: 0xfbbf24 });
    } else if (dragMode === 'combo_skip') {
      this.highlightOverlay
        .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
        .fill({ color: 0x000000, alpha: 0.32 });
    } else if (this.selected) {
      this.highlightOverlay
        .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
        .fill({ color: 0xfffbeb, alpha: 0.14 })
        .stroke({ width: 2.4, color: this.comboHighlighted || isWild ? 0xf59e0b : 0xfbbf24 });
    } else if (isWild) {
      this.highlightOverlay
        .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 8)
        .stroke({ width: 1.8, color: 0xf59e0b, alpha: 0.75 });
    }
  }

  private buildLandlordRibbon(): void {
    const badge = new Graphics();
    badge
      .moveTo(CARD_WIDTH - 32, 0)
      .lineTo(CARD_WIDTH, 0)
      .lineTo(CARD_WIDTH, 32)
      .closePath()
      .fill({ color: 0xd97706 });

    badge
      .moveTo(CARD_WIDTH - 32, 0)
      .lineTo(CARD_WIDTH, 32)
      .stroke({ width: 1.2, color: 0xfef08a });

    const label = new Text({
      text: '地主',
      style: {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: 8.5,
        fontWeight: '800',
        fill: '#FFFBEB',
      },
    });
    label.anchor.set(0.5);
    label.x = CARD_WIDTH - 11;
    label.y = 10;
    label.rotation = Math.PI / 4;

    this.landlordRibbon.addChild(badge, label);
  }

  public setLandlordBadgeVisible(visible: boolean): void {
    this.landlordRibbon.visible = visible;
  }

  public moveTo(
    targetX: number,
    targetY: number,
    duration = 0.2,
    targetScale = 1.06
  ): void {
    if (this.destroyed) return;
    this.baseX = targetX;
    this.baseY = targetY;

    const finalY = this.selected ? targetY - 24 : targetY;
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);

    gsap.to(this, {
      x: targetX,
      y: finalY,
      duration,
      ease: 'power2.out',
    });

    if (this.scale) {
      gsap.to(this.scale, {
        x: targetScale,
        y: targetScale,
        duration,
        ease: 'power2.out',
      });
    }
  }

  public setDragHighlight(mode: DragHighlightMode): void {
    if (this.destroyed) return;
    this.updateHighlightOverlay(mode);
    if (mode === 'combo_pick' && !this.selected) {
      this.y = this.baseY - 12;
    } else if ((mode === 'none' || mode === 'normal') && !this.selected) {
      this.y = this.baseY;
    }
  }

  public setComboHighlight(highlighted: boolean, label?: string): void {
    if (this.destroyed) return;
    this.comboHighlighted = highlighted;
    this.comboAuraGraphic.visible = highlighted && this.selected;
    this.comboTagBadge.visible = highlighted && this.selected && Boolean(label);
    if (label) {
      this.comboTagText.text = label;
    }
    gsap.killTweensOf(this.comboAuraGraphic);
    if (highlighted && this.selected) {
      this.comboAuraGraphic.alpha = 0.95;
      gsap.to(this.comboAuraGraphic, {
        alpha: 0.35,
        duration: 0.65,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }
    this.updateHighlightOverlay('none');
  }

  public setSelected(
    selected: boolean,
    comboHighlight = false,
    comboTag?: string
  ): void {
    if (this.destroyed) return;
    this.selected = selected;
    this.drawShadow(selected);
    this.setComboHighlight(selected && comboHighlight, comboTag);

    const targetY = selected ? this.baseY - 24 : this.baseY;
    gsap.killTweensOf(this);
    gsap.to(this, {
      y: targetY,
      duration: 0.18,
      ease: 'back.out(2.0)',
    });
  }

  public override destroy(options?: DestroyOptions): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    gsap.killTweensOf(this.comboAuraGraphic);
    super.destroy(options);
  }
}
