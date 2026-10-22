import {
  TileData, MeldData, FanResult, TingInfo, MjSuit,
  HONGZHONG_ID, NORMAL_TILE_IDS, getSuit, getRank, createTile, buildFullDeck,
} from './types.js';

export class MahjongRules {

  // ─── Deck & Deal ────────────────────────────────────────────────────────

  static shuffleDeck(): TileData[] {
    const deck = buildFullDeck();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  static dealTiles(playerCount = 4): { hands: TileData[][]; wall: TileData[] } {
    const deck = this.shuffleDeck();
    const hands: TileData[][] = [];
    for (let p = 0; p < playerCount; p++) {
      hands.push(deck.splice(0, 13));
    }
    return { hands, wall: deck };
  }

  // ─── Meld Decomposition ─────────────────────────────────────────────────

  private static canFormMelds(counts: Map<number, number>, wildCount: number): boolean {
    let first: number | null = null;
    const keys = Array.from(counts.keys()).sort((a, b) => a - b);
    for (const t of keys) {
      if ((counts.get(t) ?? 0) > 0) { first = t; break; }
    }
    if (first === null) return wildCount % 3 === 0;

    const suit = getSuit(first);

    // Branch 1: natural triplet AAA
    if ((counts.get(first) ?? 0) >= 3) {
      counts.set(first, (counts.get(first) ?? 0) - 3);
      if (this.canFormMelds(counts, wildCount)) { counts.set(first, (counts.get(first) ?? 0) + 3); return true; }
      counts.set(first, (counts.get(first) ?? 0) + 3);
    }

    // Branch 2: natural sequence ABC
    if (suit !== MjSuit.Special) {
      const t2 = first + 1, t3 = first + 2;
      if (getSuit(t2) === suit && getSuit(t3) === suit) {
        const c2 = counts.get(t2) ?? 0, c3 = counts.get(t3) ?? 0;
        if (c2 > 0 && c3 > 0) {
          counts.set(first, (counts.get(first) ?? 0) - 1);
          counts.set(t2, c2 - 1);
          counts.set(t3, c3 - 1);
          if (this.canFormMelds(counts, wildCount)) {
            counts.set(first, (counts.get(first) ?? 0) + 1);
            counts.set(t2, c2);
            counts.set(t3, c3);
            return true;
          }
          counts.set(first, (counts.get(first) ?? 0) + 1);
          counts.set(t2, c2);
          counts.set(t3, c3);
        }
      }
    }

    // Branch 3: use 1 wild to complete triplet (AA + wild)
    if (wildCount >= 1 && (counts.get(first) ?? 0) >= 2) {
      counts.set(first, (counts.get(first) ?? 0) - 2);
      if (this.canFormMelds(counts, wildCount - 1)) { counts.set(first, (counts.get(first) ?? 0) + 2); return true; }
      counts.set(first, (counts.get(first) ?? 0) + 2);
    }

    // Branch 4: use 1 wild to complete sequence (A,A+1+wild or A,A+2+wild)
    if (wildCount >= 1 && suit !== MjSuit.Special) {
      for (const offset of [1, 2]) {
        const tOther = first + offset;
        if (getSuit(tOther) === suit && (counts.get(tOther) ?? 0) > 0) {
          counts.set(first, (counts.get(first) ?? 0) - 1);
          counts.set(tOther, (counts.get(tOther) ?? 0) - 1);
          if (this.canFormMelds(counts, wildCount - 1)) {
            counts.set(first, (counts.get(first) ?? 0) + 1);
            counts.set(tOther, (counts.get(tOther) ?? 0) + 1);
            return true;
          }
          counts.set(first, (counts.get(first) ?? 0) + 1);
          counts.set(tOther, (counts.get(tOther) ?? 0) + 1);
        }
      }
    }

    // Branch 5: use 2 wilds with single tile (A + wild + wild)
    if (wildCount >= 2) {
      counts.set(first, (counts.get(first) ?? 0) - 1);
      if (this.canFormMelds(counts, wildCount - 2)) { counts.set(first, (counts.get(first) ?? 0) + 1); return true; }
      counts.set(first, (counts.get(first) ?? 0) + 1);
    }

    return false;
  }

  // ─── Standard Hu Detection ──────────────────────────────────────────────

  static isStandardHu(tiles: number[]): boolean {
    if (tiles.length % 3 !== 2) return false;
    const counts = new Map<number, number>();
    for (const t of tiles) counts.set(t, (counts.get(t) ?? 0) + 1);
    const wildCount = counts.get(HONGZHONG_ID) ?? 0;
    counts.delete(HONGZHONG_ID);

    for (const [t, cnt] of counts) {
      if (cnt >= 2) {
        counts.set(t, cnt - 2);
        if (this.canFormMelds(counts, wildCount)) { counts.set(t, cnt); return true; }
        counts.set(t, cnt);
      }
    }
    // Try pure-wild eye
    if (wildCount >= 2) {
      if (this.canFormMelds(counts, wildCount - 2)) return true;
    }
    return false;
  }

  static isHuWithHand(hand: TileData[], melds: MeldData[]): boolean {
    const tileIds = hand.map(t => t.tileId);
    // Add concealed triplets from angang melds
    for (const m of melds) {
      if (m.type === 'angang') {
        for (const t of m.tiles) tileIds.push(t.tileId);
      }
    }
    return this.isStandardHu(tileIds);
  }

  // ─── QiDui (Seven Pairs) ────────────────────────────────────────────────

  static isQiDui(tiles: number[]): { isQiDui: boolean; longCount: number } {
    if (tiles.length !== 14) return { isQiDui: false, longCount: 0 };
    const counts = new Map<number, number>();
    for (const t of tiles) counts.set(t, (counts.get(t) ?? 0) + 1);
    const wildCount = counts.get(HONGZHONG_ID) ?? 0;
    counts.delete(HONGZHONG_ID);

    let pairsNeeded = 7;
    let longCount = 0;
    let wildUsed = 0;

    for (const [, cnt] of counts) {
      pairsNeeded -= Math.floor(cnt / 2);
      if (cnt % 2 === 1) wildUsed++;
      if (cnt === 4) longCount++;
    }

    // Each odd tile needs 1 wild to pair; remaining pairs come from wilds in pairs
    const remainingPairs = pairsNeeded;
    if (wildUsed + remainingPairs * 2 <= wildCount) {
      return { isQiDui: true, longCount };
    }
    return { isQiDui: false, longCount: 0 };
  }

  // ─── Special Hand Checks ────────────────────────────────────────────────

  static isPengPengHu(hand: TileData[], melds: MeldData[]): boolean {
    // All melds must be peng/gang type, no sequences
    for (const m of melds) {
      if (m.type === 'chi') return false;
    }
    // Hand tiles must form triplets + 1 pair (no sequences possible in hand)
    const tileIds = hand.map(t => t.tileId);
    const counts = new Map<number, number>();
    for (const t of tileIds) counts.set(t, (counts.get(t) ?? 0) + 1);
    const wildCount = counts.get(HONGZHONG_ID) ?? 0;
    counts.delete(HONGZHONG_ID);

    // Every non-wild group must be a triplet (or pair for eye)
    let eyeFound = false;
    for (const [, cnt] of counts) {
      if (cnt === 3) continue;
      if (cnt === 2 && !eyeFound) { eyeFound = true; continue; }
      // Need wilds to fix
      return false; // Simplified: strict check
    }
    return true;
  }

  static isQingYiSe(hand: TileData[], melds: MeldData[]): boolean {
    let targetSuit: MjSuit | null = null;
    const allTiles = [...hand];
    for (const m of melds) allTiles.push(...m.tiles);

    for (const t of allTiles) {
      if (t.tileId === HONGZHONG_ID) continue;
      const s = getSuit(t.tileId);
      if (targetSuit === null) targetSuit = s;
      else if (s !== targetSuit) return false;
    }
    return targetSuit !== null;
  }

  static isJinGouDiao(hand: TileData[], melds: MeldData[]): boolean {
    // 4 exposed melds + 1 tile in hand
    const exposedMelds = melds.filter(m => m.type !== 'angang');
    if (exposedMelds.length !== 4) return false;
    if (hand.length !== 2) return false; // 1 tile + drawn tile
    return true;
  }

  static isShiBaLuoHan(hand: TileData[], melds: MeldData[]): boolean {
    const gangCount = melds.filter(m =>
      m.type === 'minggang' || m.type === 'bugang' || m.type === 'angang' || m.type === 'hongzhonggang'
    ).length;
    return gangCount === 4;
  }

  static isDuanYaoJiu(hand: TileData[], melds: MeldData[]): boolean {
    const allTiles = [...hand];
    for (const m of melds) allTiles.push(...m.tiles);
    for (const t of allTiles) {
      if (t.tileId === HONGZHONG_ID) return false;
      const rank = getRank(t.tileId);
      if (rank === 1 || rank === 9) return false;
    }
    return true;
  }

  static countGen(hand: TileData[], melds: MeldData[]): number {
    const counts = new Map<number, number>();
    const allTiles = [...hand];
    for (const m of melds) allTiles.push(...m.tiles);
    for (const t of allTiles) {
      if (t.tileId !== HONGZHONG_ID) {
        counts.set(t.tileId, (counts.get(t.tileId) ?? 0) + 1);
      }
    }
    let gen = 0;
    for (const [, cnt] of counts) {
      if (cnt === 4) gen++;
    }
    return gen;
  }

  // ─── Fan Calculation ────────────────────────────────────────────────────

  static calculateFans(
    hand: TileData[],
    melds: MeldData[],
    dingqueSuit: number,
    isZimo: boolean,
    winTile: number,
    isFirstDraw: boolean,
    isDealerFirstDiscard: boolean,
    wallEmpty: boolean,
  ): FanResult[] {
    const fans: FanResult[] = [];
    const allTileIds = [...hand.map(t => t.tileId)];
    for (const m of melds) {
      for (const t of m.tiles) allTileIds.push(t.tileId);
    }

    const hasWild = allTileIds.includes(HONGZHONG_ID);
    const isHardHu = !hasWild;
    const qiduiResult = this.isQiDui(allTileIds);
    const isQingYise = this.isQingYiSe(hand, melds);
    const isPengPeng = this.isPengPengHu(hand, melds);
    const genCount = this.countGen(hand, melds);

    // Base hu
    if (qiduiResult.isQiDui) {
      if (qiduiResult.longCount >= 3) {
        fans.push({ fanId: 50, fanName: '三龙七对', factor: 2 });
      } else if (qiduiResult.longCount === 2) {
        fans.push({ fanId: 49, fanName: '双龙七对', factor: 2 });
      } else if (qiduiResult.longCount === 1) {
        fans.push({ fanId: 9, fanName: '龙七对', factor: 2 });
      } else {
        fans.push({ fanId: 8, fanName: '七对', factor: 2 });
      }
      if (isQingYise) fans.push({ fanId: 10, fanName: '清七对', factor: 2 });
    } else {
      fans.push({ fanId: 0, fanName: '平胡', factor: 2 });
    }

    if (isPengPeng && !qiduiResult.isQiDui) {
      fans.push({ fanId: 1, fanName: '碰碰胡', factor: 2 });
      if (isQingYise) fans.push({ fanId: 3, fanName: '清碰', factor: 2 });
    }

    if (isQingYise) {
      fans.push({ fanId: 2, fanName: '清一色', factor: 2 });
    }

    if (this.isJinGouDiao(hand, melds)) {
      fans.push({ fanId: 5, fanName: '金钩钓', factor: 2 });
      if (isQingYise) fans.push({ fanId: 6, fanName: '清金钩钓', factor: 2 });
    }

    if (this.isShiBaLuoHan(hand, melds)) {
      fans.push({ fanId: 14, fanName: '十八罗汉', factor: 2 });
      if (isQingYise) fans.push({ fanId: 15, fanName: '清十八罗汉', factor: 2 });
    }

    if (this.isDuanYaoJiu(hand, melds)) {
      fans.push({ fanId: 17, fanName: '断幺九', factor: 2 });
    }

    if (genCount > 0) {
      fans.push({ fanId: 28, fanName: `根×${genCount}`, factor: 4 * genCount });
    }

    if (isZimo) {
      fans.push({ fanId: 29, fanName: '自摸', factor: 3 });
    }

    const hasExposedMeld = melds.some(m => m.type !== 'angang');
    if (!hasExposedMeld && melds.length === 0) {
      fans.push({ fanId: 30, fanName: '门清', factor: 2 });
    }

    if (isFirstDraw) {
      fans.push({ fanId: 20, fanName: '天胡', factor: 2 });
    }

    if (isDealerFirstDiscard) {
      fans.push({ fanId: 21, fanName: '地胡', factor: 2 });
    }

    if (wallEmpty) {
      fans.push({ fanId: 31, fanName: '海底捞月', factor: 2 });
    }

    if (isHardHu) {
      fans.push({ fanId: 48, fanName: '硬胡', factor: 2 });
    } else {
      fans.push({ fanId: 47, fanName: '软胡', factor: 2 });
    }

    return fans;
  }

  static computeTotalFactor(fans: FanResult[]): number {
    let total = 1;
    for (const f of fans) {
      total *= f.factor;
    }
    return Math.max(total, 2);
  }

  // ─── DingQue Constraint ─────────────────────────────────────────────────

  static hasDingQueSuit(hand: TileData[], dingqueSuit: number): boolean {
    return hand.some(t => t.suit === dingqueSuit && t.tileId !== HONGZHONG_ID);
  }

  static getValidDiscards(hand: TileData[], dingqueSuit: number): TileData[] {
    if (dingqueSuit < 0) return [...hand];
    const dqTiles = hand.filter(t => t.suit === dingqueSuit && t.tileId !== HONGZHONG_ID);
    if (dqTiles.length > 0) return dqTiles;
    return [...hand];
  }

  // ─── Ting Analyzer ──────────────────────────────────────────────────────

  static analyzeTing(
    hand: TileData[],
    melds: MeldData[],
    dingqueSuit: number,
    wallRemain: Map<number, number>,
  ): TingInfo[] {
    if (this.hasDingQueSuit(hand, dingqueSuit)) return [];

    const handIds = hand.map(t => t.tileId);
    const results: TingInfo[] = [];

    for (const cand of NORMAL_TILE_IDS) {
      if (getSuit(cand) === dingqueSuit) continue;

      const testHand = [...handIds, cand];
      const isHu = this.isStandardHu(testHand);
      const qdResult = this.isQiDui(testHand);

      if (isHu || qdResult.isQiDui) {
        const fans: FanResult[] = [];
        if (qdResult.isQiDui) {
          fans.push({ fanId: 8, fanName: '七对', factor: 2 });
        } else {
          fans.push({ fanId: 0, fanName: '平胡', factor: 2 });
        }
        const remain = (wallRemain.get(cand) ?? 4) - handIds.filter(t => t === cand).length;
        results.push({ tileId: cand, fans, remainCount: Math.max(remain, 0) });
      }
    }
    return results;
  }

  // ─── Swap Three Selection ───────────────────────────────────────────────

  static selectSwapThree(hand: TileData[]): { suit: number; tiles: TileData[] } | null {
    const bySuit = new Map<number, TileData[]>();
    for (const t of hand) {
      if (t.tileId === HONGZHONG_ID) continue;
      const s = t.suit;
      if (!bySuit.has(s)) bySuit.set(s, []);
      bySuit.get(s)!.push(t);
    }

    let bestSuit = -1;
    let bestTiles: TileData[] = [];
    let minUsefulness = Infinity;

    for (const [suit, tiles] of bySuit) {
      if (tiles.length < 3) continue;
      // Sort by isolation score (lower = more isolated = better to swap away)
      const scored = tiles.map(t => ({
        tile: t,
        score: this.tileUsefulness(t, tiles),
      })).sort((a, b) => a.score - b.score);

      const selected = scored.slice(0, 3).map(s => s.tile);
      const totalScore = scored.slice(0, 3).reduce((sum, s) => sum + s.score, 0);
      if (totalScore < minUsefulness) {
        minUsefulness = totalScore;
        bestSuit = suit;
        bestTiles = selected;
      }
    }

    if (bestSuit < 0) return null;
    return { suit: bestSuit, tiles: bestTiles };
  }

  private static tileUsefulness(tile: TileData, sameSuitTiles: TileData[]): number {
    let score = 0;
    const rank = tile.rank;
    for (const other of sameSuitTiles) {
      if (other.id === tile.id) continue;
      const diff = Math.abs(other.rank - rank);
      if (diff === 0) score += 3;       // pair/triplet potential
      else if (diff === 1) score += 2;  // adjacent sequence
      else if (diff === 2) score += 1;  // gap sequence
    }
    return score;
  }

  // ─── Response Validation ────────────────────────────────────────────────

  static canPeng(hand: TileData[], discardTile: number): boolean {
    const count = hand.filter(t => t.tileId === discardTile).length;
    return count >= 2;
  }

  static canMingGang(hand: TileData[], discardTile: number): boolean {
    const count = hand.filter(t => t.tileId === discardTile).length;
    return count >= 3;
  }

  static canBugang(hand: TileData[], melds: MeldData[]): MeldData[] {
    const result: MeldData[] = [];
    for (const m of melds) {
      if (m.type !== 'peng') continue;
      const pengTileId = m.tiles[0].tileId;
      if (hand.some(t => t.tileId === pengTileId)) {
        result.push(m);
      }
    }
    return result;
  }

  static canAnGang(hand: TileData[]): number[] {
    const counts = new Map<number, number>();
    for (const t of hand) {
      counts.set(t.tileId, (counts.get(t.tileId) ?? 0) + 1);
    }
    const result: number[] = [];
    for (const [tid, cnt] of counts) {
      if (cnt === 4) result.push(tid);
    }
    return result;
  }

  static canChi(hand: TileData[], discardTile: number, discardSeat: number, mySeat: number): number[][] {
    // Chi only available for the next player (下家)
    if ((discardSeat + 1) % 4 !== mySeat) return [];
    const suit = getSuit(discardTile);
    if (suit === MjSuit.Special) return [];
    const rank = getRank(discardTile);
    const handIds = hand.map(t => t.tileId);
    const combos: number[][] = [];

    // Check three possible sequences containing discardTile
    const candidates = [
      [rank - 2, rank - 1],  // X-2, X-1, X
      [rank - 1, rank + 1],  // X-1, X, X+1
      [rank + 1, rank + 2],  // X, X+1, X+2
    ];

    for (const [r1, r2] of candidates) {
      if (r1 < 1 || r2 < 1 || r1 > 9 || r2 > 9) continue;
      const t1 = suit * 10 + r1;
      const t2 = suit * 10 + r2;
      if (handIds.includes(t1) && handIds.includes(t2)) {
        combos.push([t1, t2]);
      }
    }
    return combos;
  }

  static canHu(
    hand: TileData[],
    melds: MeldData[],
    dingqueSuit: number,
    incomingTile?: number,
  ): boolean {
    if (this.hasDingQueSuit(hand, dingqueSuit)) return false;
    const testHand = [...hand.map(t => t.tileId)];
    if (incomingTile !== undefined) testHand.push(incomingTile);
    return this.isStandardHu(testHand);
  }
}
