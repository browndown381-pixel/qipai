import {
  MAX_TILE_INDEX,
  buildTileDeck,
  cardToIndex,
  countCards,
  indexToCard,
  removeCardsFromHand,
  sortCards,
  type MahjongPhase,
  type MahjongPlayerView,
  type MahjongTableSnapshot,
  type MjActionOption,
  type MjLastAction,
  type MjMeld,
  type MjScoreBill,
  type MjSettlement,
  type MjSettlementWinner,
  type MjWinType,
} from '../../../src/games/mahjong/types.js';
import {
  analyseHu,
  discardHints,
  selfGangOptions,
  tingCards,
  type HuContext,
} from './MahjongLogic.js';

const SEAT_COUNT = 4;
const TURN_DURATION_MS = 15000;
const RESPONSE_DURATION_MS = 8000;

export interface MahjongPlayerMeta {
  playerId: string;
  nickname: string;
  avatarId: string;
  beans: number;
  isBot: boolean;
  trusteeship: boolean;
}

export interface MahjongRoomMeta {
  roomId: string;
  baseScore: number;
  players: MahjongPlayerMeta[];
}

interface WinnerDraft {
  seatId: number;
  winType: MjWinType;
  fan: number;
  fanNames: string[];
  winCard: number;
  fromSeat: number;
}

type ResponseContext = 'discard' | 'qianggang';

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function actionRank(type: string): number {
  if (type === 'hu') return 3;
  if (type === 'gang') return 2;
  if (type === 'peng') return 1;
  return 0;
}

export class MahjongStateMachine {
  phase: MahjongPhase = 'WAITING';
  dealerSeat = 0;
  turnSeat = 0;
  roundIndex = 0;
  baseScore = 100;

  private hands: number[][] = [[], [], [], []];
  private melds: MjMeld[][] = [[], [], [], []];
  private discards: number[][] = [[], [], [], []];
  private drawnCards: Array<number | null> = [null, null, null, null];
  private deck: number[] = [];
  private sendCount = 0;
  private outCount = 0;
  private gangStatus = false;

  private latestDiscard: { seatId: number; card: number } | null = null;
  private discarderSeat = -1;
  private lastAction: MjLastAction | null = null;

  private responseContext: ResponseContext | null = null;
  private responseOptions = new Map<number, MjActionOption[]>();
  private responseChoices = new Map<number, MjActionOption>();
  private responseRequired = new Set<number>();

  private qiangGangSeat = -1;
  private qiangGangCard = 0;
  private passPeng: boolean[][] = Array.from({ length: SEAT_COUNT }, () =>
    new Array<boolean>(MAX_TILE_INDEX).fill(false)
  );

  private bills: MjScoreBill[] = [];
  private billSeq = 0;
  private billDeliveryIndex = 0;
  private roundDeltas = [0, 0, 0, 0];
  private settlementData: MjSettlement | null = null;

  get remainWallCount(): number {
    return this.deck.length;
  }

  get currentTurnSeatId(): number {
    return this.turnSeat;
  }

  get responseDeadlineMs(): number {
    return RESPONSE_DURATION_MS;
  }

  get turnDeadlineMs(): number {
    return TURN_DURATION_MS;
  }

  startRound(options: { dealerSeat: number; roundIndex: number; baseScore: number }): void {
    this.dealerSeat = ((options.dealerSeat % SEAT_COUNT) + SEAT_COUNT) % SEAT_COUNT;
    this.roundIndex = options.roundIndex;
    this.baseScore = options.baseScore;

    this.deck = shuffle(buildTileDeck());
    this.hands = [[], [], [], []];
    this.melds = [[], [], [], []];
    this.discards = [[], [], [], []];
    this.drawnCards = [null, null, null, null];
    this.passPeng = Array.from({ length: SEAT_COUNT }, () =>
      new Array<boolean>(MAX_TILE_INDEX).fill(false)
    );

    for (let seat = 0; seat < SEAT_COUNT; seat++) {
      for (let i = 0; i < 13; i++) {
        const card = this.deck.pop();
        if (card !== undefined) this.hands[seat].push(card);
      }
      this.hands[seat].sort((a, b) => a - b);
    }

    this.sendCount = 0;
    this.outCount = 0;
    this.gangStatus = false;
    this.latestDiscard = null;
    this.discarderSeat = -1;
    this.lastAction = null;
    this.clearResponse();
    this.qiangGangSeat = -1;
    this.qiangGangCard = 0;
    this.bills = [];
    this.billSeq = 0;
    this.billDeliveryIndex = 0;
    this.roundDeltas = [0, 0, 0, 0];
    this.settlementData = null;
    this.turnSeat = this.dealerSeat;
    this.phase = 'PLAYING';

    this.drawForSeat(this.dealerSeat, false);
  }

  getRequiredResponders(): number[] {
    if (this.phase !== 'RESPONSE') return [];
    return [...this.responseRequired].filter((seat) => !this.responseChoices.has(seat));
  }

  isResponsePendingFor(seat: number): boolean {
    return (
      this.phase === 'RESPONSE' &&
      this.responseRequired.has(seat) &&
      !this.responseChoices.has(seat)
    );
  }

  getResponseContext(): ResponseContext | null {
    return this.phase === 'RESPONSE' ? this.responseContext : null;
  }

  discard(seat: number, card: number): { ok: boolean; error?: string } {
    if (this.phase !== 'PLAYING') return { ok: false, error: '当前不能出牌' };
    if (this.turnSeat !== seat) return { ok: false, error: '还没轮到你出牌' };
    if (!this.hands[seat].includes(card)) return { ok: false, error: '手牌中没有这张牌' };

    this.hands[seat] = removeCardsFromHand(this.hands[seat], [card]);
    this.drawnCards[seat] = null;
    this.discards[seat].push(card);
    this.latestDiscard = { seatId: seat, card };
    this.outCount++;
    this.gangStatus = false;
    this.lastAction = { seatId: seat, type: 'discard', card, ts: Date.now() };
    this.buildDiscardResponses(seat, card);
    return { ok: true };
  }

  respond(seat: number, actionType: 'hu' | 'peng' | 'gang' | 'pass'): { ok: boolean; error?: string } {
    if (this.phase !== 'RESPONSE') return { ok: false, error: '当前没有可响应的操作' };
    if (!this.responseRequired.has(seat)) return { ok: false, error: '不需要你操作' };
    if (this.responseChoices.has(seat)) return { ok: false, error: '请等待其他玩家' };

    const options = this.responseOptions.get(seat) ?? [];
    const chosen = actionType === 'pass' ? undefined : options.find((o) => o.type === actionType);
    if (actionType !== 'pass' && !chosen) return { ok: false, error: '无效操作' };

    this.responseChoices.set(
      seat,
      chosen ?? { type: 'pass', card: options[0]?.card ?? 0 }
    );

    if (actionType === 'pass' && this.responseContext === 'discard') {
      const card = options[0]?.card;
      if (card) {
        const hadPeng = options.some((o) => o.type === 'peng');
        if (hadPeng) this.passPeng[seat][cardToIndex(card)] = true;
      }
    }

    if (!this.getRequiredResponders().length) {
      if (this.responseContext === 'qianggang') {
        this.resolveQiangGang();
      } else {
        this.resolveDiscardResponses();
      }
    }
    return { ok: true };
  }

  selfAction(
    seat: number,
    actionType: 'hu' | 'gang',
    card?: number
  ): { ok: boolean; error?: string } {
    if (this.phase !== 'PLAYING' || this.turnSeat !== seat) {
      return { ok: false, error: '当前不能操作' };
    }
    const options = this.getSelfOptions(seat);
    const chosen = options.find(
      (o) => o.type === actionType && (card === undefined || o.card === card)
    );
    if (!chosen) return { ok: false, error: '当前不能进行该操作' };

    if (chosen.type === 'hu') {
      this.settleZimo(seat);
      return { ok: true };
    }

    const gangKind = chosen.gangKind;
    if (gangKind !== 'an_gang' && gangKind !== 'bu_gang') return { ok: false, error: '无效的自摸杠牌' };
    this.startSelfGang(seat, chosen.card, gangKind);
    return { ok: true };
  }

  getSelfOptions(seat: number): MjActionOption[] {
    if (this.phase !== 'PLAYING' || this.turnSeat !== seat) return [];
    const winCard = this.drawnCards[seat];
    if (winCard === null) return [];

    const handWithoutWin = removeCardsFromHand(this.hands[seat], [winCard]);
    const ctx: HuContext = {
      sendCount: this.sendCount,
      outCount: this.outCount,
      gangStatus: this.gangStatus,
      zimo: true,
      qiangGang: false,
      wallCount: this.deck.length,
    };
    const options: MjActionOption[] = [];
    const hu = analyseHu(handWithoutWin, this.melds[seat], winCard, ctx);
    if (hu.canHu) {
      options.push({
        type: 'hu',
        card: winCard,
        fan: { fan: hu.fan, names: hu.fanNames },
      });
    }
    for (const gang of selfGangOptions(this.hands[seat], this.melds[seat], this.deck.length)) {
      options.push({ type: 'gang', card: gang.card, gangKind: gang.kind });
    }
    return options;
  }

  buildSnapshot(
    mySeat: number,
    meta: MahjongRoomMeta,
    turnRemainMs: number
  ): MahjongTableSnapshot {
    const players: MahjongPlayerView[] = meta.players.map((player, seat) => {
      const revealHand = seat === mySeat || this.phase === 'SETTLEMENT';
      const melds = this.melds[seat].map((meld) => {
        if (seat !== mySeat && this.phase !== 'SETTLEMENT' && meld.kind === 'an_gang') {
          return { ...meld, card: 0, hidden: true };
        }
        return { ...meld };
      });
      return {
        seatId: seat,
        playerId: player.playerId,
        nickname: player.nickname,
        avatarId: player.avatarId,
        beans: player.beans,
        isBot: player.isBot,
        trusteeship: player.trusteeship,
        isDealer: seat === this.dealerSeat,
        handCount: this.hands[seat].length,
        handTiles: revealHand ? sortCards(this.hands[seat]) : undefined,
        drawnCard: seat === mySeat ? this.drawnCards[seat] : null,
        melds,
        discards: [...this.discards[seat]],
        scoreDelta: this.roundDeltas[seat],
      };
    });

    const myHand = sortCards(this.hands[mySeat]);
    const isMyTurn = this.phase === 'PLAYING' && this.turnSeat === mySeat;
    const canOfferDiscardHints =
      isMyTurn && myHand.length >= 2 && (myHand.length - 2) % 3 === 0;
    const canOfferTing =
      isMyTurn && myHand.length >= 2 && (myHand.length - 1) % 3 === 0;

    let myActions: MjActionOption[] = [];
    let actionSource: 'response' | 'self' | null = null;
    if (this.phase === 'RESPONSE' && this.isResponsePendingFor(mySeat)) {
      myActions = [...(this.responseOptions.get(mySeat) ?? [])];
      actionSource = 'response';
    } else if (isMyTurn) {
      myActions = this.getSelfOptions(mySeat);
      if (myActions.length) actionSource = 'self';
    }

    let settlement: MjSettlement | null = null;
    if (this.settlementData) {
      settlement = {
        ...this.settlementData,
        beans: meta.players.map((player) => player.beans),
        revealHands: this.settlementData.revealHands.map((hand) => [...hand]),
        melds: this.settlementData.melds.map((row) => row.map((meld) => ({ ...meld }))),
        scoreDeltas: [...this.settlementData.scoreDeltas],
        winners: this.settlementData.winners.map((winner) => ({ ...winner })),
      };
    }

    return {
      roomId: meta.roomId,
      baseScore: this.baseScore,
      roundIndex: this.roundIndex,
      phase: this.phase,
      dealerSeatId: this.dealerSeat,
      currentTurnSeatId: this.turnSeat,
      remainWallCount: this.deck.length,
      mySeatId: mySeat,
      players,
      latestDiscard: this.latestDiscard
        ? {
            seatId: this.latestDiscard.seatId,
            tileId: this.latestDiscard.card,
            card: this.latestDiscard.card,
          }
        : null,
      lastAction: this.lastAction ? { ...this.lastAction } : null,
      bills: this.bills.slice(-24),
      myActions,
      actionSource,
      responseSeats: this.getRequiredResponders(),
      discardHints: canOfferDiscardHints ? discardHints(myHand, this.melds[mySeat]) : [],
      tingWaits: canOfferTing ? tingCards(myHand, this.melds[mySeat]) : [],
      turnRemainMs: this.phase === 'SETTLEMENT' ? 0 : Math.max(0, turnRemainMs),
      settlement,
      mode: 'tuidaohu',
      serverNow: Date.now(),
    };
  }

  consumeNewBills(): MjScoreBill[] {
    const fresh = this.bills.slice(this.billDeliveryIndex);
    this.billDeliveryIndex = this.bills.length;
    return fresh;
  }

  revealAllHands(): number[][] {
    return this.hands.map((hand) => sortCards(hand));
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private drawForSeat(seat: number, afterGang: boolean): void {
    if (this.deck.length === 0) {
      this.settleDraw();
      return;
    }
    const card = this.deck.pop()!;
    this.hands[seat].push(card);
    this.hands[seat].sort((a, b) => a - b);
    this.drawnCards = [null, null, null, null];
    this.drawnCards[seat] = card;
    this.turnSeat = seat;
    this.phase = 'PLAYING';
    this.sendCount++;
    this.gangStatus = afterGang;
    this.latestDiscard = null;
    this.passPeng[seat].fill(false);
  }

  private advanceTurn(fromSeat: number): void {
    this.clearResponse();
    const next = (fromSeat + 1) % SEAT_COUNT;
    this.drawForSeat(next, false);
  }

  private clearResponse(): void {
    this.responseContext = null;
    this.responseOptions.clear();
    this.responseChoices.clear();
    this.responseRequired.clear();
    this.discarderSeat = -1;
  }

  private buildDiscardResponses(discardSeat: number, card: number): void {
    const offers = new Map<number, MjActionOption[]>();
    const countsIdx = cardToIndex(card);

    for (let seat = 0; seat < SEAT_COUNT; seat++) {
      if (seat === discardSeat) continue;
      const options: MjActionOption[] = [];

      const ctx: HuContext = {
        sendCount: this.sendCount,
        outCount: this.outCount,
        gangStatus: this.gangStatus,
        zimo: false,
        qiangGang: false,
        wallCount: this.deck.length,
      };
      const hu = analyseHu(this.hands[seat], this.melds[seat], card, ctx);
      if (hu.canHu) {
        options.push({
          type: 'hu',
          card,
          fan: { fan: hu.fan, names: hu.fanNames },
        });
      }

      const counts = countCards(this.hands[seat]);
      if (counts[countsIdx] === 3 && this.deck.length > 0) {
        options.push({ type: 'gang', card, gangKind: 'ming_gang' });
      }
      if (counts[countsIdx] >= 2 && !this.passPeng[seat][countsIdx]) {
        options.push({ type: 'peng', card });
      }
      if (options.length > 0) {
        options.push({ type: 'pass', card });
        offers.set(seat, options);
      }
    }

    if (offers.size === 0) {
      this.advanceTurn(discardSeat);
      return;
    }

    let topRank = 0;
    for (const options of offers.values()) {
      for (const option of options) {
        topRank = Math.max(topRank, actionRank(option.type));
      }
    }

    this.responseContext = 'discard';
    this.discarderSeat = discardSeat;
    this.responseOptions = offers;
    this.responseChoices.clear();
    this.responseRequired.clear();
    for (const [seat, options] of offers) {
      if (options.some((option) => actionRank(option.type) === topRank)) {
        this.responseRequired.add(seat);
      }
    }
    this.phase = 'RESPONSE';
  }

  private resolveDiscardResponses(): void {
    const declared = [...this.responseChoices.entries()]
      .map(([seat, choice]) => ({ seat, choice }))
      .filter((entry) => entry.choice.type !== 'pass');
    const discardSeat = this.discarderSeat;
    const card = this.latestDiscard?.card ?? 0;

    const huChoices = declared.filter((entry) => entry.choice.type === 'hu');
    if (huChoices.length > 0) {
      this.settleDiscardHu(huChoices.map((entry) => entry.seat), discardSeat, card);
      return;
    }

    const gangChoice = declared.find((entry) => entry.choice.type === 'gang');
    if (gangChoice) {
      this.executeMingGang(gangChoice.seat, discardSeat, gangChoice.choice.card);
      return;
    }

    const pengChoice = declared.find((entry) => entry.choice.type === 'peng');
    if (pengChoice) {
      this.executePeng(pengChoice.seat, discardSeat, pengChoice.choice.card);
      return;
    }

    this.advanceTurn(discardSeat);
  }

  private removeLatestDiscardFromRiver(discardSeat: number, card: number): void {
    const river = this.discards[discardSeat];
    if (river.length > 0 && river[river.length - 1] === card) river.pop();
    if (this.latestDiscard?.seatId === discardSeat && this.latestDiscard.card === card) {
      this.latestDiscard = null;
    }
  }

  private executePeng(seat: number, fromSeat: number, card: number): void {
    this.removeLatestDiscardFromRiver(fromSeat, card);
    this.hands[seat] = removeCardsFromHand(this.hands[seat], [card, card]);
    this.melds[seat].push({
      kind: 'peng',
      type: 'peng',
      card,
      fromSeat,
      triggerSeatId: fromSeat,
      tiles: [card, card, card],
    });
    this.drawnCards[seat] = null;
    this.turnSeat = seat;
    this.phase = 'PLAYING';
    this.gangStatus = false;
    this.lastAction = { seatId: seat, type: 'peng', card, ts: Date.now() };
    this.clearResponse();
  }

  private executeMingGang(seat: number, fromSeat: number, card: number): void {
    this.removeLatestDiscardFromRiver(fromSeat, card);
    this.hands[seat] = removeCardsFromHand(this.hands[seat], [card, card, card]);
    this.melds[seat].push({
      kind: 'ming_gang',
      type: 'ming_gang',
      card,
      fromSeat,
      triggerSeatId: fromSeat,
      tiles: [card, card, card, card],
    });
    this.drawnCards[seat] = null;
    this.gangStatus = true;
    this.lastAction = { seatId: seat, type: 'ming_gang', card, ts: Date.now() };
    this.clearResponse();
    this.recordTransfer(fromSeat, seat, this.baseScore, `明杠 · ${cardName(card)}`, 'gang');
    if (this.deck.length === 0) {
      this.settleDraw();
      return;
    }
    this.drawForSeat(seat, true);
  }

  private startSelfGang(seat: number, card: number, kind: 'an_gang' | 'bu_gang'): void {
    this.drawnCards[seat] = null;

    if (kind === 'an_gang') {
      this.hands[seat] = removeCardsFromHand(this.hands[seat], [card, card, card, card]);
      this.melds[seat].push({
        kind: 'an_gang',
        type: 'an_gang',
        card,
        fromSeat: seat,
        triggerSeatId: seat,
        tiles: [card, card, card, card],
      });
      this.gangStatus = true;
      this.lastAction = { seatId: seat, type: 'an_gang', card, ts: Date.now() };
      for (let other = 0; other < SEAT_COUNT; other++) {
        if (other !== seat) {
          this.recordTransfer(
            other,
            seat,
            this.baseScore * 2,
            `暗杠 · ${cardName(card)}`,
            'gang'
          );
        }
      }
      this.drawForSeat(seat, true);
      return;
    }

    const gangMeld = this.melds[seat].find((meld) => meld.kind === 'peng' && meld.card === card);
    if (!gangMeld) return;

    this.qiangGangSeat = seat;
    this.qiangGangCard = card;

    const offers = new Map<number, MjActionOption[]>();
    for (let other = 0; other < SEAT_COUNT; other++) {
      if (other === seat) continue;
      const ctx: HuContext = {
        sendCount: this.sendCount,
        outCount: this.outCount,
        gangStatus: this.gangStatus,
        zimo: false,
        qiangGang: true,
        wallCount: this.deck.length,
      };
      const hu = analyseHu(this.hands[other], this.melds[other], card, ctx);
      if (hu.canHu) {
        offers.set(other, [
          { type: 'hu', card, fan: { fan: hu.fan, names: hu.fanNames } },
          { type: 'pass', card },
        ]);
      }
    }

    if (offers.size === 0) {
      this.completeBuGang(seat, card);
      return;
    }

    this.responseContext = 'qianggang';
    this.discarderSeat = seat;
    this.responseOptions = offers;
    this.responseChoices.clear();
    this.responseRequired = new Set(offers.keys());
    this.phase = 'RESPONSE';
  }

  private completeBuGang(seat: number, card: number): void {
    this.hands[seat] = removeCardsFromHand(this.hands[seat], [card]);
    const meld = this.melds[seat].find((item) => item.kind === 'peng' && item.card === card);
    if (meld) {
      meld.kind = 'bu_gang';
      meld.type = 'bu_gang';
      meld.tiles = [card, card, card, card];
    }
    this.gangStatus = true;
    this.lastAction = { seatId: seat, type: 'bu_gang', card, ts: Date.now() };
    this.qiangGangSeat = -1;
    this.qiangGangCard = 0;
    this.clearResponse();
    for (let other = 0; other < SEAT_COUNT; other++) {
      if (other !== seat) {
        this.recordTransfer(
          other,
          seat,
          this.baseScore,
          `补杠 · ${cardName(card)}`,
          'gang'
        );
      }
    }
    if (this.deck.length === 0) {
      this.settleDraw();
      return;
    }
    this.drawForSeat(seat, true);
  }

  private resolveQiangGang(): void {
    const gangSeat = this.qiangGangSeat;
    const card = this.qiangGangCard;
    const winners = [...this.responseChoices.entries()]
      .filter(([, choice]) => choice.type === 'hu')
      .map(([seat]) => seat);

    if (winners.length === 0) {
      this.completeBuGang(gangSeat, card);
      return;
    }

    this.hands[gangSeat] = removeCardsFromHand(this.hands[gangSeat], [card]);
    this.hands[gangSeat].sort((a, b) => a - b);
    this.qiangGangSeat = -1;
    this.qiangGangCard = 0;
    this.lastAction = { seatId: winners[0], type: 'qianggang', card, ts: Date.now() };
    this.finishRound(
      winners.map((seat) => {
        const ctx: HuContext = {
          sendCount: this.sendCount,
          outCount: this.outCount,
          gangStatus: this.gangStatus,
          zimo: false,
          qiangGang: true,
          wallCount: this.deck.length,
        };
        const evaluation = analyseHu(this.hands[seat], this.melds[seat], card, ctx);
        this.hands[seat].push(card);
        this.hands[seat].sort((a, b) => a - b);
        return {
          seatId: seat,
          winType: 'qianggang' as MjWinType,
          fan: evaluation.fan,
          fanNames: evaluation.fanNames,
          winCard: card,
          fromSeat: gangSeat,
        };
      }),
      'hu'
    );
  }

  private settleZimo(seat: number): void {
    const winCard = this.drawnCards[seat];
    if (winCard === null) return;
    const handWithoutWin = removeCardsFromHand(this.hands[seat], [winCard]);
    const ctx: HuContext = {
      sendCount: this.sendCount,
      outCount: this.outCount,
      gangStatus: this.gangStatus,
      zimo: true,
      qiangGang: false,
      wallCount: this.deck.length,
    };
    const evaluation = analyseHu(handWithoutWin, this.melds[seat], winCard, ctx);
    if (!evaluation.canHu) return;

    this.lastAction = { seatId: seat, type: 'zimo', card: winCard, ts: Date.now() };
    this.finishRound(
      [
        {
          seatId: seat,
          winType: 'zimo',
          fan: evaluation.fan,
          fanNames: evaluation.fanNames,
          winCard,
          fromSeat: -1,
        },
      ],
      'hu'
    );
  }

  private settleDiscardHu(winnerSeats: number[], discardSeat: number, card: number): void {
    this.removeLatestDiscardFromRiver(discardSeat, card);
    this.lastAction = {
      seatId: winnerSeats[0],
      type: 'hu',
      card,
      ts: Date.now(),
    };
    const winners: WinnerDraft[] = winnerSeats.map((seat) => {
      const ctx: HuContext = {
        sendCount: this.sendCount,
        outCount: this.outCount,
        gangStatus: this.gangStatus,
        zimo: false,
        qiangGang: false,
        wallCount: this.deck.length,
      };
      const evaluation = analyseHu(this.hands[seat], this.melds[seat], card, ctx);
      this.hands[seat].push(card);
      this.hands[seat].sort((a, b) => a - b);
      return {
        seatId: seat,
        winType: 'dianpao',
        fan: evaluation.fan,
        fanNames: evaluation.fanNames,
        winCard: card,
        fromSeat: discardSeat,
      };
    });
    this.finishRound(winners, 'hu');
  }

  private finishRound(winners: WinnerDraft[], endedReason: 'hu' | 'draw'): void {
    for (const winner of winners) {
      const amount = winner.fan * this.baseScore;
      const label =
        winner.winType === 'zimo'
          ? `自摸 · ${winner.fanNames[0] ?? '胡牌'}`
          : winner.winType === 'qianggang'
            ? '抢杠胡'
            : '接炮胡';
      if (winner.winType === 'zimo') {
        for (let other = 0; other < SEAT_COUNT; other++) {
          if (other !== winner.seatId) {
            this.recordTransfer(other, winner.seatId, amount, label, 'zimo');
          }
        }
      } else if (winner.fanNames.includes('地胡')) {
        for (let other = 0; other < SEAT_COUNT; other++) {
          if (other !== winner.seatId) {
            this.recordTransfer(other, winner.seatId, amount, '地胡', 'hu');
          }
        }
      } else {
        this.recordTransfer(
          winner.fromSeat,
          winner.seatId,
          amount,
          label,
          winner.winType === 'qianggang' ? 'qianggang' : 'hu'
        );
      }
    }

    const settlementWinners: MjSettlementWinner[] = winners.map((winner) => ({
      seatId: winner.seatId,
      winType: winner.winType,
      fan: winner.fan,
      fanNames: [...winner.fanNames],
      winCard: winner.winCard,
      fromSeat: winner.fromSeat,
      score: winner.fan * this.baseScore,
    }));

    this.settlementData = {
      endedReason,
      winners: settlementWinners,
      scoreDeltas: [...this.roundDeltas],
      beans: [0, 0, 0, 0],
      revealHands: this.revealAllHands(),
      melds: this.melds.map((row) => row.map((meld) => ({ ...meld }))),
      remainWallCount: this.deck.length,
      nextDealerSeatId: this.pickNextDealer(settlementWinners),
      roundIndex: this.roundIndex,
      timestamp: Date.now(),
    };
    this.phase = 'SETTLEMENT';
    this.turnSeat = -1;
    this.drawnCards = [null, null, null, null];
    this.latestDiscard = null;
    this.clearResponse();
  }

  private settleDraw(): void {
    this.lastAction = null;
    this.settlementData = {
      endedReason: 'draw',
      winners: [],
      scoreDeltas: [...this.roundDeltas],
      beans: [0, 0, 0, 0],
      revealHands: this.revealAllHands(),
      melds: this.melds.map((row) => row.map((meld) => ({ ...meld }))),
      remainWallCount: this.deck.length,
      nextDealerSeatId: this.dealerSeat,
      roundIndex: this.roundIndex,
      timestamp: Date.now(),
    };
    this.phase = 'SETTLEMENT';
    this.turnSeat = -1;
    this.drawnCards = [null, null, null, null];
    this.latestDiscard = null;
    this.clearResponse();
  }

  private pickNextDealer(winners: MjSettlementWinner[]): number {
    if (winners.length === 0) return this.dealerSeat;
    const zimo = winners.find((winner) => winner.winType === 'zimo');
    if (zimo) return zimo.seatId;

    let best = winners[0];
    let bestDistance = -1;
    for (const winner of winners) {
      const distance = (winner.seatId - winner.fromSeat + SEAT_COUNT) % SEAT_COUNT;
      if (distance > bestDistance) {
        bestDistance = distance;
        best = winner;
      }
    }
    return best.seatId;
  }

  private recordTransfer(
    fromSeat: number,
    toSeat: number,
    amount: number,
    label: string,
    kind: MjScoreBill['kind']
  ): void {
    if (fromSeat < 0 || toSeat < 0 || fromSeat === toSeat || amount <= 0) return;
    this.roundDeltas[fromSeat] -= amount;
    this.roundDeltas[toSeat] += amount;
    const timestamp = Date.now();
    this.bills.push({
      id: `mj_bill_${++this.billSeq}`,
      seatId: fromSeat,
      delta: -amount,
      label,
      kind,
      timestamp,
    });
    this.bills.push({
      id: `mj_bill_${++this.billSeq}`,
      seatId: toSeat,
      delta: amount,
      label,
      kind,
      timestamp,
    });
  }
}

function cardName(card: number): string {
  return indexToCard(cardToIndex(card))
    ? `${['筒', '万', '条'][card >> 4] ?? ''}${card & 0x0f}`
    : String(card);
}
