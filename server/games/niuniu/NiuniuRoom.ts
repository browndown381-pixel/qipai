import { ConnectionManager } from '../../core/ConnectionManager.js';
import { IGameRoom, RoomPlayerInfo, RoomSummary } from '../../core/RoomManager.js';
import { storageService } from '../../shared/storage.js';
import {
  NiuniuCard,
  NiuniuHandResult,
  NiuniuPhase,
  NiuniuPlayerInfo,
  NiuniuSettlement,
  NiuniuTableSnapshot,
} from '../../../src/games/niuniu/types.js';
import {
  compareHands,
  createStandardNiuniuDeck,
  evaluateNiuniuHand,
  shuffleDeck,
} from '../../../src/games/niuniu/algorithms/NiuniuLogic.js';
import { NiuniuBotEngine } from './NiuniuBotEngine.js';

const BOT_PROFILES = [
  { nickname: '金牛·陆九渊AI', avatarId: 'kashen' },
  { nickname: '锦鲤·贝儿AI', avatarId: 'beier' },
  { nickname: '折扇·柳如风AI', avatarId: 'scholar' },
  { nickname: '财神·金百万AI', avatarId: 'noble' },
  { nickname: '红拂女AI', avatarId: 'heroine' },
  { nickname: '凌霄剑仙AI', avatarId: 'warrior' },
];

export class NiuniuRoom implements IGameRoom {
  roomId: string;
  gameType = 'niuniu';
  hostId: string;
  baseScore: number;
  isPrivate: boolean;
  maxPlayers = 5;
  createdAt: number = Date.now();

  private playMode: 'qiangzhuang' | 'tongbi' | 'crazy';
  private seats: Array<RoomPlayerInfo | null> = [null, null, null, null, null];
  private phase: NiuniuPhase = 'WAITING';
  private connectionManager: ConnectionManager;
  private onRoomDestroyed: (roomId: string) => void;

  // Niuniu Specific Game States
  private hands: NiuniuCard[][] = [[], [], [], [], []];
  private callMultipliers: number[] = [-1, -1, -1, -1, -1];
  private betMultipliers: number[] = [0, 0, 0, 0, 0];
  private dealerSeatId: number = 0;
  private hasShownHand: boolean[] = [false, false, false, false, false];
  private handResults: (NiuniuHandResult | undefined)[] = [undefined, undefined, undefined, undefined, undefined];
  private scoreDeltas: number[] = [0, 0, 0, 0, 0];
  private candidateDealerSeats: number[] = [];
  private currentSettlement?: NiuniuSettlement;

  // Timers
  private phaseTimer: NodeJS.Timeout | null = null;
  private botActionTimer: NodeJS.Timeout | null = null;
  private countdown: number = 0;
  private countdownInterval: NodeJS.Timeout | null = null;

  constructor(options: {
    roomId: string;
    hostId: string;
    baseScore: number;
    isPrivate: boolean;
    mode?: string;
    connectionManager: ConnectionManager;
    onRoomDestroyed: (roomId: string) => void;
  }) {
    this.roomId = options.roomId;
    this.hostId = options.hostId;
    this.baseScore = options.baseScore;
    this.isPrivate = options.isPrivate;
    this.playMode =
      options.mode === 'tongbi' || options.mode === 'crazy'
        ? options.mode
        : 'qiangzhuang';
    this.connectionManager = options.connectionManager;
    this.onRoomDestroyed = options.onRoomDestroyed;
  }

  get mode(): string {
    return this.playMode;
  }

  get status(): string {
    return this.phase;
  }

  addPlayer(player: {
    playerId: string;
    nickname: string;
    avatarId: string;
    beans: number;
    isBot?: boolean;
  }): boolean {
    const existingIndex = this.seats.findIndex((s) => s?.playerId === player.playerId);
    if (existingIndex !== -1) {
      this.seats[existingIndex]!.disconnected = false;
      this.broadcastSnapshot();
      return true;
    }

    const emptyIndex = this.seats.findIndex((s) => s === null);
    if (emptyIndex === -1) return false;

    this.seats[emptyIndex] = {
      playerId: player.playerId,
      nickname: player.nickname,
      avatarId: player.avatarId,
      seatIndex: emptyIndex,
      beans: player.beans,
      ready: player.isBot ? true : false,
      isBot: Boolean(player.isBot),
      disconnected: false,
      trusteeship: false,
    };

    this.broadcastSnapshot();
    this.checkAutoStart();
    return true;
  }

  removePlayer(playerId: string): boolean {
    const seatIndex = this.seats.findIndex((s) => s?.playerId === playerId);
    if (seatIndex === -1) return false;

    if (this.phase !== 'WAITING' && this.phase !== 'ROUND_RESULT') {
      // Mark as disconnected during active round
      this.seats[seatIndex]!.disconnected = true;
      this.broadcastSnapshot();
      return true;
    }

    this.seats[seatIndex] = null;
    this.broadcastSnapshot();

    if (this.isEmptyOfHumans()) {
      this.destroy();
    }
    return true;
  }

  hasPlayer(playerId: string): boolean {
    return this.seats.some((s) => s?.playerId === playerId);
  }

  getPlayerCount(): number {
    return this.seats.filter(Boolean).length;
  }

  isEmptyOfHumans(): boolean {
    return !this.seats.some((s) => s && !s.isBot);
  }

  setPlayerReady(playerId: string, ready: boolean = true): void {
    const seat = this.seats.find((s) => s?.playerId === playerId);
    if (seat) {
      seat.ready = ready;
      this.broadcastSnapshot();
      this.checkAutoStart();
    }
  }

  addBotPlayer(): boolean {
    const emptyIndex = this.seats.findIndex((s) => s === null);
    if (emptyIndex === -1) return false;

    const usedAvatars = this.seats.filter(Boolean).map((s) => s!.avatarId);
    const profile =
      BOT_PROFILES.find((b) => !usedAvatars.includes(b.avatarId)) ??
      BOT_PROFILES[emptyIndex % BOT_PROFILES.length];

    const botId = `bot_nn_${this.roomId}_${emptyIndex}_${Date.now().toString().slice(-4)}`;
    return this.addPlayer({
      playerId: botId,
      nickname: profile.nickname,
      avatarId: profile.avatarId,
      beans: Math.floor(this.baseScore * (40 + Math.random() * 80)),
      isBot: true,
    });
  }

  handlePlayerDisconnect(playerId: string): void {
    const seat = this.seats.find((s) => s?.playerId === playerId);
    if (seat) {
      seat.disconnected = true;
      this.broadcastSnapshot();
    }
  }

  handlePlayerReconnect(playerId: string): void {
    const seat = this.seats.find((s) => s?.playerId === playerId);
    if (seat) {
      seat.disconnected = false;
      this.sendSnapshotToPlayer(playerId);
      this.broadcastSnapshot();
    }
  }

  handleClientEvent(playerId: string, event: string, payload: unknown): void {
    const seatIndex = this.seats.findIndex((s) => s?.playerId === playerId);
    if (seatIndex === -1) return;

    if (event === 'c2s_niuniu_call_banker') {
      const { callMultiplier } = (payload || {}) as { callMultiplier?: number };
      this.handleCallBanker(seatIndex, callMultiplier ?? 0);
    } else if (event === 'c2s_niuniu_bet') {
      const { betMultiplier } = (payload || {}) as { betMultiplier?: number };
      this.handleBet(seatIndex, betMultiplier ?? 5);
    } else if (event === 'c2s_niuniu_show_hand') {
      this.handleShowHand(seatIndex);
    } else if (event === 'c2s_niuniu_ready') {
      this.setPlayerReady(playerId, true);
    }
  }

  getSummary(): RoomSummary {
    return {
      roomId: this.roomId,
      gameType: this.gameType,
      mode: this.playMode,
      hostId: this.hostId,
      baseScore: this.baseScore,
      isPrivate: this.isPrivate,
      status: this.phase,
      playerCount: this.getPlayerCount(),
      maxPlayers: this.maxPlayers,
      players: this.seats.filter(Boolean).map((s) => ({
        nickname: s!.nickname,
        avatarId: s!.avatarId,
        isBot: s!.isBot,
      })),
    };
  }

  destroy(): void {
    this.clearTimers();
    this.onRoomDestroyed(this.roomId);
  }

  // =========================================================================
  // Game Flow Logic (FSM)
  // =========================================================================

  private clearTimers() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    if (this.botActionTimer) {
      clearTimeout(this.botActionTimer);
      this.botActionTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private startCountdown(seconds: number, onComplete: () => void) {
    this.countdown = seconds;
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      this.countdown -= 1;
      this.broadcastSnapshot();
      if (this.countdown <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        onComplete();
      }
    }, 1000);
  }

  private checkAutoStart(): void {
    if (this.phase !== 'WAITING' && this.phase !== 'ROUND_RESULT') return;

    // Fill bots if less than 5 players
    while (this.getPlayerCount() < this.maxPlayers) {
      this.addBotPlayer();
    }

    const readyCount = this.seats.filter((s) => s && s.ready).length;
    if (readyCount === this.maxPlayers) {
      this.startRound();
    }
  }

  private startRound(): void {
    this.clearTimers();
    this.phase = 'DEAL_FIRST_4';
    this.callMultipliers = [-1, -1, -1, -1, -1];
    this.betMultipliers = [0, 0, 0, 0, 0];
    this.hasShownHand = [false, false, false, false, false];
    this.handResults = [undefined, undefined, undefined, undefined, undefined];
    this.scoreDeltas = [0, 0, 0, 0, 0];
    this.candidateDealerSeats = [];
    this.currentSettlement = undefined;

    // Deal 5 cards to each seated player from standard 52 card deck
    const deck = shuffleDeck(createStandardNiuniuDeck());
    this.hands = [[], [], [], [], []];
    for (let c = 0; c < 5; c++) {
      for (let s = 0; s < 5; s++) {
        if (this.seats[s]) {
          this.hands[s].push(deck.pop()!);
        }
      }
    }

    this.broadcastSnapshot();

    // After dealing animation (1.2s), enter CALL_BANKER
    this.phaseTimer = setTimeout(() => {
      this.enterCallBankerPhase();
    }, 1200);
  }

  private enterCallBankerPhase(): void {
    this.phase = 'CALL_BANKER';
    this.broadcastSnapshot();

    // Trigger AI bots to call banker
    this.seats.forEach((seat, idx) => {
      if (seat && seat.isBot && this.callMultipliers[idx] === -1) {
        const delay = 800 + Math.random() * 1200;
        setTimeout(() => {
          if (this.phase === 'CALL_BANKER' && this.callMultipliers[idx] === -1) {
            const call = NiuniuBotEngine.decideCallBanker(this.hands[idx].slice(0, 4));
            this.handleCallBanker(idx, call);
          }
        }, delay);
      }
    });

    this.startCountdown(6, () => {
      // Auto default un-called players to 0 (不抢)
      this.seats.forEach((seat, idx) => {
        if (seat && this.callMultipliers[idx] === -1) {
          this.callMultipliers[idx] = 0;
        }
      });
      this.determineBanker();
    });
  }

  private handleCallBanker(seatIndex: number, multiplier: number): void {
    if (this.phase !== 'CALL_BANKER') return;
    this.callMultipliers[seatIndex] = Math.max(0, Math.min(4, multiplier));
    this.broadcastSnapshot();

    // If all seated players called, proceed immediately
    const allCalled = this.seats.every(
      (s, idx) => !s || this.callMultipliers[idx] !== -1
    );
    if (allCalled) {
      if (this.countdownInterval) clearInterval(this.countdownInterval);
      this.determineBanker();
    }
  }

  private determineBanker(): void {
    this.phase = 'DETERMINE_BANKER';

    // Find highest multiplier
    let maxCall = 0;
    this.seats.forEach((s, idx) => {
      if (s && this.callMultipliers[idx] > maxCall) {
        maxCall = this.callMultipliers[idx];
      }
    });

    const candidateSeats: number[] = [];
    this.seats.forEach((s, idx) => {
      if (s && this.callMultipliers[idx] === maxCall) {
        candidateSeats.push(idx);
      }
    });

    this.candidateDealerSeats = candidateSeats.length > 0 ? candidateSeats : [0];
    const chosenDealer =
      this.candidateDealerSeats[
        Math.floor(Math.random() * this.candidateDealerSeats.length)
      ];
    this.dealerSeatId = chosenDealer;

    this.broadcastSnapshot();

    // 1.5s dealer highlight flash animation, then go to BETTING
    this.phaseTimer = setTimeout(() => {
      this.enterBettingPhase();
    }, 1500);
  }

  private enterBettingPhase(): void {
    this.phase = 'BETTING';
    // Dealer bet is locked to 1
    this.betMultipliers[this.dealerSeatId] = 1;
    this.broadcastSnapshot();

    // Bots bet
    this.seats.forEach((seat, idx) => {
      if (seat && seat.isBot && idx !== this.dealerSeatId && this.betMultipliers[idx] === 0) {
        const delay = 600 + Math.random() * 1200;
        setTimeout(() => {
          if (this.phase === 'BETTING' && this.betMultipliers[idx] === 0) {
            const bet = NiuniuBotEngine.decideBetMultiplier(this.hands[idx].slice(0, 4));
            this.handleBet(idx, bet);
          }
        }, delay);
      }
    });

    this.startCountdown(6, () => {
      this.seats.forEach((seat, idx) => {
        if (seat && idx !== this.dealerSeatId && this.betMultipliers[idx] === 0) {
          this.betMultipliers[idx] = 5; // default 5x
        }
      });
      this.enterShowdownPhase();
    });
  }

  private handleBet(seatIndex: number, multiplier: number): void {
    if (this.phase !== 'BETTING' || seatIndex === this.dealerSeatId) return;
    this.betMultipliers[seatIndex] = multiplier;
    this.broadcastSnapshot();

    const allBet = this.seats.every(
      (s, idx) => !s || idx === this.dealerSeatId || this.betMultipliers[idx] > 0
    );
    if (allBet) {
      if (this.countdownInterval) clearInterval(this.countdownInterval);
      this.enterShowdownPhase();
    }
  }

  private enterShowdownPhase(): void {
    this.phase = 'SHOWDOWN';
    this.broadcastSnapshot();

    // Precalculate all hand evaluations
    this.seats.forEach((seat, idx) => {
      if (seat && this.hands[idx].length === 5) {
        this.handResults[idx] = evaluateNiuniuHand(this.hands[idx]);
      }
    });

    // Bots auto show hand with slight humanized delay
    this.seats.forEach((seat, idx) => {
      if (seat && seat.isBot) {
        const delay = 1000 + Math.random() * 2500;
        setTimeout(() => {
          if (this.phase === 'SHOWDOWN' && !this.hasShownHand[idx]) {
            this.handleShowHand(idx);
          }
        }, delay);
      }
    });

    this.startCountdown(8, () => {
      this.seats.forEach((seat, idx) => {
        if (seat && !this.hasShownHand[idx]) {
          this.handleShowHand(idx);
        }
      });
      this.compareAndSettle();
    });
  }

  private handleShowHand(seatIndex: number): void {
    if (this.phase !== 'SHOWDOWN') return;
    this.hasShownHand[seatIndex] = true;
    this.broadcastSnapshot();

    const allShown = this.seats.every((s, idx) => !s || this.hasShownHand[idx]);
    if (allShown) {
      if (this.countdownInterval) clearInterval(this.countdownInterval);
      this.compareAndSettle();
    }
  }

  private compareAndSettle(): void {
    this.phase = 'COMPARE_AND_SETTLE';

    const dealerResult = this.handResults[this.dealerSeatId];
    if (!dealerResult) return;

    const dealerCall = Math.max(1, this.callMultipliers[this.dealerSeatId] || 1);
    const scoreDeltas = [0, 0, 0, 0, 0];
    let dealerDeltaTotal = 0;

    // Compare each non-dealer against dealer
    this.seats.forEach((seat, idx) => {
      if (!seat || idx === this.dealerSeatId) return;
      const playerResult = this.handResults[idx];
      if (!playerResult) return;

      const playerBet = this.betMultipliers[idx] || 5;
      const cmp = compareHands(playerResult, dealerResult);

      if (cmp > 0) {
        // Player wins
        const winMult = playerResult.multiplier;
        const amount = this.baseScore * dealerCall * playerBet * winMult;
        const capped = Math.min(amount, seat.beans);
        scoreDeltas[idx] = capped;
        dealerDeltaTotal -= capped;
      } else {
        // Dealer wins
        const winMult = dealerResult.multiplier;
        const amount = this.baseScore * dealerCall * playerBet * winMult;
        const capped = Math.min(amount, seat.beans);
        scoreDeltas[idx] = -capped;
        dealerDeltaTotal += capped;
      }
    });

    scoreDeltas[this.dealerSeatId] = dealerDeltaTotal;
    this.scoreDeltas = scoreDeltas;

    // Update player balances
    this.seats.forEach((seat, idx) => {
      if (seat) {
        seat.beans = Math.max(0, seat.beans + scoreDeltas[idx]);
        if (!seat.isBot) {
          storageService.updateBeans(seat.playerId, scoreDeltas[idx]);
        }
      }
    });

    this.currentSettlement = {
      baseScore: this.baseScore,
      dealerSeatIndex: this.dealerSeatId,
      players: this.seats.map((seat, idx) => {
        if (!seat) return null!;
        const res = this.handResults[idx]!;
        return {
          seatIndex: idx,
          playerId: seat.playerId,
          nickname: seat.nickname,
          isDealer: idx === this.dealerSeatId,
          handType: res.handType,
          handName: res.name,
          cards: this.hands[idx],
          scoreDelta: scoreDeltas[idx],
          balance: seat.beans,
          isWinner: scoreDeltas[idx] > 0,
        };
      }).filter(Boolean),
    };

    this.broadcastSnapshot();

    // 2.5s later show round result
    this.phaseTimer = setTimeout(() => {
      this.phase = 'ROUND_RESULT';
      this.broadcastSnapshot();

      // Auto countdown 6s to ready next round
      this.startCountdown(6, () => {
        this.seats.forEach((s) => {
          if (s) s.ready = true;
        });
        this.checkAutoStart();
      });
    }, 2500);
  }

  // =========================================================================
  // Snapshot Serialization
  // =========================================================================

  private buildSnapshot(targetPlayerId?: string): NiuniuTableSnapshot {
    const targetSeatIndex = this.seats.findIndex((s) => s?.playerId === targetPlayerId);

    const mappedSeats: Array<NiuniuPlayerInfo | null> = this.seats.map((s, idx) => {
      if (!s) return null;

      const isSelf = idx === targetSeatIndex;
      const isShowdown = this.phase === 'SHOWDOWN' || this.phase === 'COMPARE_AND_SETTLE' || this.phase === 'ROUND_RESULT';
      const shouldRevealCards = isSelf || isShowdown || this.hasShownHand[idx];

      let visibleCards = this.hands[idx] || [];
      if (!shouldRevealCards) {
        // If not revealed, hide cards as face-down proxies
        visibleCards = visibleCards.map((c, i) => ({
          id: -100 - i,
          suit: 'spade',
          rank: 0,
          value: 0,
        }));
      }

      return {
        playerId: s.playerId,
        nickname: s.nickname,
        avatarId: s.avatarId,
        seatIndex: idx,
        beans: s.beans,
        ready: s.ready,
        isBot: s.isBot,
        disconnected: s.disconnected,
        callMultiplier: this.callMultipliers[idx],
        betMultiplier: this.betMultipliers[idx],
        isDealer: idx === this.dealerSeatId && this.phase !== 'WAITING' && this.phase !== 'DEAL_FIRST_4' && this.phase !== 'CALL_BANKER',
        cards: visibleCards,
        hasShownHand: this.hasShownHand[idx],
        handResult: (isSelf || isShowdown || this.hasShownHand[idx]) ? this.handResults[idx] : undefined,
        scoreDelta: this.scoreDeltas[idx],
      };
    });

    return {
      roomId: this.roomId,
      baseScore: this.baseScore,
      playMode: this.playMode,
      phase: this.phase,
      countdown: this.countdown,
      dealerSeatId: this.dealerSeatId,
      seats: mappedSeats,
      candidateDealerSeats: this.candidateDealerSeats,
      settlement: this.currentSettlement,
    };
  }

  sendSnapshotToPlayer(playerId: string): void {
    const snapshot = this.buildSnapshot(playerId);
    this.connectionManager.emitToPlayer(playerId, 's2c_niuniu_snapshot', snapshot);
  }

  private broadcastSnapshot(): void {
    this.seats.forEach((seat) => {
      if (seat && !seat.isBot) {
        this.sendSnapshotToPlayer(seat.playerId);
      }
    });
  }
}
