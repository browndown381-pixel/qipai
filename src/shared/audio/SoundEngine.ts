import { DdzDebugLogger } from '../../games/ddz/utils/DdzDebugLogger';
import { legacyIdToTileIndex } from '../../games/mahjong/algorithms/TileEngine';

export function resolveMahjongTileVoiceUrl(
  tileId: number,
  gender: 'female' | 'male' = 'female'
): string {
  const idx = legacyIdToTileIndex(tileId);
  let file = 'mjt2_1.mp3';
  if (idx >= 18 && idx <= 26) {
    // 筒子 (18~26) -> mjt1_1 ~ mjt1_9
    file = `mjt1_${idx - 18 + 1}.mp3`;
  } else if (idx >= 0 && idx <= 8) {
    // 万子 (0~8) -> mjt2_1 ~ mjt2_9
    file = `mjt2_${idx - 0 + 1}.mp3`;
  } else if (idx >= 9 && idx <= 17) {
    // 条子 (9~17) -> mjt3_1 ~ mjt3_9
    file = `mjt3_${idx - 9 + 1}.mp3`;
  } else if (idx >= 27 && idx <= 30) {
    // 东南西北 (27~30) -> mjt4_1 ~ mjt4_4
    file = `mjt4_${idx - 27 + 1}.mp3`;
  } else if (idx === 31) {
    // 红中 (31) -> mjt4_5
    file = 'mjt4_5.mp3';
  } else if (idx === 32) {
    // 发财 (32) -> mjt4_6
    file = 'mjt4_6.mp3';
  } else if (idx === 33) {
    // 白板 (33) -> mjt4_7
    file = 'mjt4_7.mp3';
  }
  return `/assets/mahjong/audio/voice/${gender}/${file}`;
}

export function resolveMahjongActionVoiceUrl(
  action: 'chi' | 'peng' | 'gang' | 'hu' | 'zimo' | string,
  gender: 'female' | 'male' = 'female'
): string {
  const actFile = action === 'chi' ? 'peng' : action;
  return `/assets/mahjong/audio/voice/${gender}/${actFile}.mp3`;
}

interface MahjongVoiceQueueItem {
  url: string;
  priority: number; // 10: 报牌语音, 20: 吃碰杠动作语音, 30: 胡/自摸高优语音
  label?: string;
}

class SoundEngine {
  private enabled = true;
  private bgmEnabled = true;
  private audioCtx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmType: 'lobby' | 'table' | null = null;

  // 麻将专属独占语音通道与优先级队列 (防止报牌声与吃/碰/杠/胡并发重叠)
  private mjCurrentVoiceAudio: HTMLAudioElement | null = null;
  private mjVoiceQueue: MahjongVoiceQueueItem[] = [];
  private mjVoicePlaying = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('h5_sound_enabled');
        if (saved !== null) {
          this.enabled = saved === 'true';
          this.bgmEnabled = this.enabled;
        }
      } catch {
        // Ignore storage error
      }
    }
  }

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isBgmEnabled(): boolean {
    return this.bgmEnabled && this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    this.bgmEnabled = this.enabled;
    try {
      localStorage.setItem('h5_sound_enabled', String(this.enabled));
    } catch {
      // Ignore
    }
    if (this.enabled) {
      if (this.currentBgmType) this.startBgm(this.currentBgmType);
    } else {
      this.stopBgm();
      this.clearMahjongVoiceQueue();
    }
    return this.enabled;
  }

  toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      if (this.enabled && this.currentBgmType) this.startBgm(this.currentBgmType);
    } else {
      this.stopBgm();
    }
    return this.bgmEnabled;
  }

  startBgm(type: 'lobby' | 'table' = 'lobby'): void {
    this.currentBgmType = type;
    if (!this.enabled || !this.bgmEnabled || typeof window === 'undefined') return;
    try {
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio('/assets/audio/bgm_lobby.wav');
        this.bgmAudio.loop = true;
      }
      this.bgmAudio.volume = type === 'lobby' ? 0.22 : 0.12;
      if (this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }
    } catch {
      // Ignore autoplay block
    }
  }

  stopBgm(): void {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
      } catch {
        // Ignore
      }
    }
  }

  playAudioFile(url: string, volume = 0.85): void {
    if (!this.enabled || typeof window === 'undefined') return;
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch(() => {});
    } catch {
      // Ignore
    }
  }

  clearMahjongVoiceQueue(): void {
    this.mjVoiceQueue = [];
    this.mjVoicePlaying = false;
    if (this.mjCurrentVoiceAudio) {
      try {
        this.mjCurrentVoiceAudio.pause();
        this.mjCurrentVoiceAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.mjCurrentVoiceAudio = null;
    }
  }

  enqueueMahjongVoice(url: string, priority: number, replaceEqualOrLower = false): void {
    if (!this.enabled || typeof window === 'undefined') return;
    if (replaceEqualOrLower) {
      // 移除队列中尚未播放的低优先级报牌语音，防止快速出牌产生积压延迟
      this.mjVoiceQueue = this.mjVoiceQueue.filter((item) => item.priority > priority);
    }
    this.mjVoiceQueue.push({ url, priority });
    this.mjVoiceQueue.sort((a, b) => b.priority - a.priority);

    if (!this.mjVoicePlaying) {
      this.processNextMahjongVoice();
    }
  }

  private processNextMahjongVoice(): void {
    if (!this.enabled || this.mjVoiceQueue.length === 0) {
      this.mjVoicePlaying = false;
      this.mjCurrentVoiceAudio = null;
      return;
    }

    const nextItem = this.mjVoiceQueue.shift()!;
    this.mjVoicePlaying = true;

    try {
      const audio = new Audio(nextItem.url);
      audio.volume = 0.95;
      this.mjCurrentVoiceAudio = audio;

      const onFinish = () => {
        audio.onended = null;
        audio.onerror = null;
        this.mjCurrentVoiceAudio = null;
        this.processNextMahjongVoice();
      };

      audio.onended = onFinish;
      audio.onerror = onFinish;
      audio.play().catch(() => {
        onFinish();
      });
    } catch {
      this.mjVoicePlaying = false;
      this.processNextMahjongVoice();
    }
  }

  preloadMahjongAudio(): void {
    if (typeof window === 'undefined') return;
    const urls = [
      '/assets/mahjong/audio/Sepcial_Mahjong_Deal.wav',
      '/assets/mahjong/audio/Sepcial_Mahjong_DrawCard.wav',
      '/assets/mahjong/audio/Sepcial_Mahjong_GiveCard.wav',
      '/assets/mahjong/audio/Sepcial_Mahjong_BeanFly.wav',
      '/assets/mahjong/audio/Sepcial_Mahjong_Win.wav',
      '/assets/mahjong/audio/Sepcial_Mahjong_Win_Zimo.wav',
    ];
    for (const u of urls) {
      if (!this.audioCache.has(u)) {
        const a = new Audio();
        a.preload = 'auto';
        a.src = u;
        this.audioCache.set(u, a);
      }
    }
  }

  playMahjongDeal(): void {
    this.playAudioFile('/assets/mahjong/audio/Sepcial_Mahjong_Deal.wav', 0.75);
  }

  playMahjongDraw(): void {
    this.playAudioFile('/assets/mahjong/audio/Sepcial_Mahjong_DrawCard.wav', 0.7);
  }

  playMahjongWild(): void {
    this.playAudioFile('/assets/mahjong/audio/Sepcial_Mahjong_DrawGiveWild.wav', 0.8);
  }

  playMahjongGive(): void {
    this.playAudioFile('/assets/mahjong/audio/Sepcial_Mahjong_GiveCard.wav', 0.85);
  }

  playMahjongBeanFly(): void {
    this.playAudioFile('/assets/mahjong/audio/Sepcial_Mahjong_BeanFly.wav', 0.8);
  }

  playMahjongWin(isZimo = false): void {
    const url = isZimo
      ? '/assets/mahjong/audio/Sepcial_Mahjong_Win_Zimo.wav'
      : '/assets/mahjong/audio/Sepcial_Mahjong_Win.wav';
    this.playAudioFile(url, 0.9);
  }

  playTileVoice(tileId: number, gender: 'female' | 'male' = 'female'): string {
    const url = resolveMahjongTileVoiceUrl(tileId, gender);
    this.enqueueMahjongVoice(url, 10, true);
    return url;
  }

  playActionVoice(
    action: 'chi' | 'peng' | 'gang' | 'hu' | 'zimo' | string,
    gender: 'female' | 'male' = 'female'
  ): string {
    const url = resolveMahjongActionVoiceUrl(action, gender);
    const priority = action === 'hu' || action === 'zimo' ? 30 : 20;
    this.enqueueMahjongVoice(url, priority, false);
    return url;
  }

  preloadDdzAudio(): void {}

  playDdzSfx(type: 'discard' | 'landlord' | 'spring' | 'alert' | 'bomb' | 'plane' | string): void {
    const map: Record<string, string> = {
      discard: '/assets/audio/ddz/Special_Discard.wav',
      landlord: '/assets/audio/ddz/Special_querendizhu.wav',
      spring: '/assets/audio/ddz/Special_Chuntian.wav',
      alert: '/assets/audio/ddz/Special_alert.wav',
      bomb: '/assets/audio/ddz/Special_Bomb_New.wav',
      plane: '/assets/audio/ddz/Special_plane.wav',
    };
    if (map[type]) {
      this.playAudioFile(map[type], 0.85);
    }
  }

  playDdzActionVoice(action: string): void {
    if (action === 'pass') {
      const idx = Math.floor(Math.random() * 4) + 1;
      this.playAudioFile(`/assets/audio/ddz/buyao${idx}.wav`, 0.9);
    } else {
      this.playAudioFile(`/assets/audio/ddz/${action}.wav`, 0.9);
    }
  }

  playDdzCardVoice(patternType: string, mainValue: number): void {
    const file = DdzDebugLogger.resolveVoiceFile(patternType, mainValue);
    if (file && file !== 'unknown.wav') {
      this.playAudioFile(`/assets/audio/ddz/${file}`, 0.92);
    }
    if (patternType === 'BOMB' || patternType === 'ROCKET') {
      this.playDdzSfx('bomb');
    } else if (patternType.startsWith('AIRPLANE')) {
      this.playDdzSfx('plane');
    }
  }

  playTap(freq = 720): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // Ignore
    }
  }

  playCardPlace(accent = false): void {
    this.playTap(accent ? 820 : 660);
  }

  playCardFly(index = 0): void {
    this.playTap(580 + (index % 8) * 35);
  }

  playGlissando(): void {
    this.playTap(880);
  }

  playRiffleShuffle(): void {
    this.playAudioFile('/assets/audio/ddz/Special_Dispatch_2D.wav', 0.75);
  }

  playPowerChime(level = 2): void {
    this.playTap(660 + level * 80);
  }

  playVictoryFanfare(): void {
    this.playTap(980);
  }

  playDefeatTone(): void {
    this.playTap(360);
  }

  playDiceRoll(): void {
    this.playTap(740);
  }

  playCountdownTick(urgent = false): void {
    this.playTap(urgent ? 940 : 620);
  }

  playPropWhoosh(): void {
    this.playTap(700);
  }

  playPropImpact(negative = false): void {
    this.playTap(negative ? 320 : 560);
  }

  preloadNiuniuAudio(): void {
    if (typeof window === 'undefined') return;
    const urls = [
      '/assets/audio/niuniu/chip_bet.wav',
      '/assets/audio/niuniu/banker_tick.wav',
      '/assets/audio/niuniu/banker_lock.wav',
      '/assets/audio/niuniu/card_reveal.wav',
      '/assets/audio/niuniu/high_niu_fanfare.wav',
      '/assets/audio/ddz/Special_Dispatch_2D.wav',
    ];
    for (const u of urls) {
      if (!this.audioCache.has(u)) {
        const a = new Audio();
        a.preload = 'auto';
        a.src = u;
        this.audioCache.set(u, a);
      }
    }
  }

  preloadZjhAudio(): void {
    if (typeof window === 'undefined') return;
    const urls = [
      '/assets/audio/zjh/chip_toss.wav',
      '/assets/audio/zjh/chip_allin.wav',
      '/assets/audio/zjh/card_peek.wav',
      '/assets/audio/zjh/vs_lightning.wav',
      '/assets/audio/zjh/fold_slide.wav',
      '/assets/audio/ddz/Special_Dispatch_2D.wav',
    ];
    for (const u of urls) {
      if (!this.audioCache.has(u)) {
        const a = new Audio();
        a.preload = 'auto';
        a.src = u;
        this.audioCache.set(u, a);
      }
    }
  }

  playNiuniuDeal(): void {
    this.playAudioFile('/assets/audio/ddz/Special_Dispatch_2D.wav', 0.72);
  }

  playNiuniuBankerTick(): void {
    this.playAudioFile('/assets/audio/niuniu/banker_tick.wav', 0.78);
  }

  playNiuniuBankerLock(): void {
    this.playAudioFile('/assets/audio/niuniu/banker_lock.wav', 0.88);
  }

  playNiuniuCall(multiplier = 1): void {
    this.playAudioFile('/assets/audio/niuniu/banker_tick.wav', 0.82);
    const label = multiplier <= 0 ? '不抢' : `抢${multiplier}倍`;
    this.enqueuePokerVoice(label, 15, true);
  }

  playNiuniuChip(multiplier?: number): void {
    this.playAudioFile('/assets/audio/niuniu/chip_bet.wav', 0.85);
    if (multiplier && multiplier > 0) {
      this.enqueuePokerVoice(`下${multiplier}倍`, 12, true);
    }
  }

  playNiuniuHandReveal(level = 0, handName?: string): void {
    if (level >= 10) {
      this.playAudioFile('/assets/audio/niuniu/high_niu_fanfare.wav', 0.9);
    } else {
      this.playAudioFile('/assets/audio/niuniu/card_reveal.wav', 0.82);
    }
    if (handName) {
      this.enqueuePokerVoice(handName, level >= 10 ? 25 : 18, false);
    }
  }

  playZjhChip(): void {
    this.playAudioFile('/assets/audio/zjh/chip_toss.wav', 0.84);
  }

  playZjhAllIn(): void {
    this.playAudioFile('/assets/audio/zjh/chip_allin.wav', 0.92);
  }

  playZjhLook(): void {
    this.playAudioFile('/assets/audio/zjh/card_peek.wav', 0.85);
  }

  playZjhCompareClash(): void {
    this.playAudioFile('/assets/audio/zjh/vs_lightning.wav', 0.92);
  }

  playZjhFold(): void {
    this.playAudioFile('/assets/audio/zjh/fold_slide.wav', 0.78);
  }

  playZjhActionVoice(
    action: 'look' | 'call' | 'blind' | 'raise' | 'compare' | 'fold' | 'allin',
    handLabel?: string
  ): void {
    switch (action) {
      case 'look':
        this.playZjhLook();
        this.enqueuePokerVoice(handLabel ? `看牌，${handLabel}` : '看牌', 16, true);
        break;
      case 'blind':
        this.playZjhChip();
        this.enqueuePokerVoice('闷牌', 14, true);
        break;
      case 'call':
        this.playZjhChip();
        this.enqueuePokerVoice('跟注', 14, true);
        break;
      case 'raise':
        this.playZjhChip();
        this.enqueuePokerVoice('加注', 18, true);
        break;
      case 'compare':
        this.playZjhCompareClash();
        this.enqueuePokerVoice('比牌', 24, false);
        break;
      case 'allin':
        this.playZjhAllIn();
        this.enqueuePokerVoice('全押', 28, false);
        break;
      case 'fold':
        this.playZjhFold();
        this.enqueuePokerVoice('弃牌', 12, true);
        break;
    }
  }

  private pokerVoiceQueue: Array<{ text: string; priority: number }> = [];
  private pokerVoiceSpeaking = false;

  enqueuePokerVoice(text: string, priority = 15, replaceLower = true): void {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (replaceLower) {
        this.pokerVoiceQueue = this.pokerVoiceQueue.filter((item) => item.priority > priority);
      }
      this.pokerVoiceQueue.push({ text, priority });
      this.pokerVoiceQueue.sort((a, b) => b.priority - a.priority);
      if (!this.pokerVoiceSpeaking) {
        this.processNextPokerVoice();
      }
    } catch {
      // Ignore speech synthesis errors
    }
  }

  private processNextPokerVoice(): void {
    if (!this.enabled || this.pokerVoiceQueue.length === 0 || typeof window === 'undefined') {
      this.pokerVoiceSpeaking = false;
      return;
    }
    const next = this.pokerVoiceQueue.shift()!;
    this.pokerVoiceSpeaking = true;
    try {
      const utter = new SpeechSynthesisUtterance(next.text);
      utter.lang = 'zh-CN';
      utter.rate = 1.18;
      utter.pitch = 1.05;
      utter.volume = 0.9;
      const done = () => {
        utter.onend = null;
        utter.onerror = null;
        this.processNextPokerVoice();
      };
      utter.onend = done;
      utter.onerror = done;
      window.speechSynthesis.speak(utter);
    } catch {
      this.pokerVoiceSpeaking = false;
    }
  }

  speak(text: string): void {
    this.enqueuePokerVoice(text, 15, true);
  }
}

export const soundEngine = new SoundEngine();

