import {
  MAX_TILE_INDEX,
  TILE_SUIT_HONOR,
  cardToIndex,
  countCards,
  indexToCard,
  isNumericSuit,
  suitOfCard,
  type MjMeld,
} from '../../../src/games/mahjong/types.js';

/** Reference GameLogic constants (GameLogic.h). */
const WIK_PENG = 0x01;
const WIK_GANG = 0x02;
const WIK_SEQ = 0x08;

const MAX_DECOMPOSITIONS = 4000;

export interface WeaveView {
  card: number;
  kind: 'peng' | 'gang';
}

export interface HuContext {
  sendCount: number;
  outCount: number;
  gangStatus: boolean;
  zimo: boolean;
  qiangGang: boolean;
  wallCount: number;
}

export interface HuEvaluation {
  canHu: boolean;
  fan: number;
  fanNames: string[];
}

export interface DiscardHint {
  card: number;
  waits: number[];
}

export interface SelfGangOption {
  card: number;
  kind: 'an_gang' | 'bu_gang';
}

export interface KindItem {
  kind: number;
  card: number;
  indices: number[];
}

export interface Decomposition {
  eye: number;
  kinds: number[];
}

export function meldsToWeaves(melds: MjMeld[]): WeaveView[] {
  return melds.map((m) => ({
    card: m.card ?? m.tiles[0] ?? 0,
    kind: (m.kind ?? m.type) === 'peng' ? 'peng' : 'gang',
  }));
}

/** Port of GameLogic::analyseCard. Enumerates every valid 4-set + pair decomposition. */
export function analyseCard(counts: number[], weaves: WeaveView[]): Decomposition[] {
  let total = 0;
  for (let i = 0; i < MAX_TILE_INDEX; i++) total += counts[i];
  if (total < 2 || total > 14 || (total - 2) % 3 !== 0) return [];

  const lessKindItem = (total - 2) / 3;
  const kindItems: KindItem[] = [];

  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    if (counts[i] >= 3) {
      kindItems.push({ kind: WIK_PENG, card: indexToCard(i), indices: [i, i, i] });
    }
    if (i < MAX_TILE_INDEX - 2 - 7 && counts[i] > 0 && i % 9 < 7) {
      for (let j = 1; j <= counts[i]; j++) {
        if (counts[i + 1] >= j && counts[i + 2] >= j) {
          kindItems.push({
            kind: WIK_SEQ,
            card: indexToCard(i + 1),
            indices: [i, i + 1, i + 2],
          });
        }
      }
    }
  }

  const weaveKinds = weaves.map((w) => (w.kind === 'peng' ? WIK_PENG : WIK_GANG));
  const results: Decomposition[] = [];

  if (lessKindItem === 0) {
    for (let i = 0; i < MAX_TILE_INDEX; i++) {
      if (counts[i] === 2) {
        results.push({ eye: indexToCard(i), kinds: [...weaveKinds] });
      }
    }
    return results;
  }

  if (kindItems.length < lessKindItem) return [];

  const chosen: KindItem[] = [];
  const search = (start: number): void => {
    if (results.length >= MAX_DECOMPOSITIONS) return;
    if (chosen.length === lessKindItem) {
      const work = counts.slice();
      let enough = true;
      for (const item of chosen) {
        for (const idx of item.indices) {
          if (work[idx] === 0) {
            enough = false;
            break;
          }
          work[idx]--;
        }
        if (!enough) break;
      }
      if (enough) {
        let eye = 0;
        for (let i = 0; i < MAX_TILE_INDEX; i++) {
          if (work[i] === 2) {
            eye = indexToCard(i);
            break;
          }
        }
        if (eye !== 0) {
          results.push({
            eye,
            kinds: [...weaveKinds, ...chosen.map((item) => item.kind)],
          });
        }
      }
      return;
    }
    for (let k = start; k < kindItems.length; k++) {
      chosen.push(kindItems[k]);
      search(k + 1);
      chosen.pop();
      if (results.length >= MAX_DECOMPOSITIONS) return;
    }
  };
  search(0);
  return results;
}

export function isSevenPairsCounts(counts: number[], total: number): boolean {
  if (total !== 14) return false;
  let pairs = 0;
  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    const n = counts[i];
    if (n === 0) continue;
    if (n % 2 !== 0) return false;
    pairs += n / 2;
  }
  return pairs === 7;
}

function canFormSets(counts: number[], groups: number): boolean {
  if (groups === 0) return true;
  let i = 0;
  while (i < MAX_TILE_INDEX && counts[i] === 0) i++;
  if (i === MAX_TILE_INDEX) return false;

  if (counts[i] >= 3) {
    counts[i] -= 3;
    if (canFormSets(counts, groups - 1)) {
      counts[i] += 3;
      return true;
    }
    counts[i] += 3;
  }
  if (i < 27 && i % 9 <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
    counts[i]--;
    counts[i + 1]--;
    counts[i + 2]--;
    if (canFormSets(counts, groups - 1)) {
      counts[i]++;
      counts[i + 1]++;
      counts[i + 2]++;
      return true;
    }
    counts[i]++;
    counts[i + 1]++;
    counts[i + 2]++;
  }
  return false;
}

/** Fast canHu used by ting searches / bots; honours only form triplets, seven pairs supported. */
export function canHuFast(counts: number[], meldCount: number): boolean {
  let total = 0;
  for (let i = 0; i < MAX_TILE_INDEX; i++) total += counts[i];
  if (meldCount === 0 && isSevenPairsCounts(counts, total)) return true;
  if (total < 2 || (total - 2) % 3 !== 0) return false;
  const groups = (total - 2) / 3;
  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    if (counts[i] >= 2) {
      counts[i] -= 2;
      if (canFormSets(counts, groups)) {
        counts[i] += 2;
        return true;
      }
      counts[i] += 2;
    }
  }
  return false;
}

function collectSuits(counts: number[], weaves: WeaveView[]): Set<number> {
  const suits = new Set<number>();
  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    if (counts[i] > 0) suits.add(suitOfCard(indexToCard(i)));
  }
  for (const weave of weaves) suits.add(suitOfCard(weave.card));
  return suits;
}

function addUniqueName(names: string[], name: string): void {
  if (!names.includes(name)) names.push(name);
}

export function analyseHu(
  handWithoutWin: number[],
  melds: MjMeld[],
  winCard: number,
  ctx: HuContext
): HuEvaluation {
  const counts = countCards(handWithoutWin);
  counts[cardToIndex(winCard)]++;
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total < 2 || total > 14 || (total - 2) % 3 !== 0) {
    return { canHu: false, fan: 0, fanNames: [] };
  }

  const weaves = meldsToWeaves(melds);
  const sevenPairs = melds.length === 0 && isSevenPairsCounts(counts, total);
  const decompositions = sevenPairs ? [] : analyseCard(counts, weaves);
  const canHu = sevenPairs || decompositions.length > 0;
  if (!canHu) return { canHu: false, fan: 0, fanNames: [] };

  const allTriplets = decompositions.some(
    (d) =>
      d.kinds.every((kind) => kind !== WIK_SEQ) &&
      (d.kinds.some((kind) => kind === WIK_PENG || kind === WIK_GANG) || melds.length > 0)
  );
  const hasSequence = decompositions.some((d) => d.kinds.some((kind) => kind === WIK_SEQ));
  const suits = collectSuits(counts, weaves);
  const pureSuit = suits.size === 1 ? [...suits][0] : -1;
  const isPure = isNumericSuit(pureSuit);
  const isHonors = pureSuit === TILE_SUIT_HONOR;
  const isGoldenHook = allTriplets && total === 2;

  let patternFan = 1;
  const names: string[] = [];

  if (sevenPairs) {
    let quads = 0;
    for (let i = 0; i < MAX_TILE_INDEX; i++) {
      if (counts[i] === 4) quads++;
    }
    patternFan = quads > 0 ? 8 : 4;
    addUniqueName(names, quads > 0 ? '龙七对' : '七对');
    if (isHonors) {
      patternFan = quads > 0 ? 32 : 16;
      addUniqueName(names, '字一色');
    } else if (isPure) {
      patternFan *= 4;
      addUniqueName(names, '清一色');
    }
  } else if (isHonors) {
    patternFan = allTriplets ? 16 : 8;
    addUniqueName(names, '字一色');
    if (allTriplets) addUniqueName(names, '碰碰胡');
  } else if (isPure) {
    patternFan = allTriplets ? 8 : 4;
    addUniqueName(names, '清一色');
    if (allTriplets) addUniqueName(names, '碰碰胡');
  } else if (allTriplets) {
    patternFan = 2;
    addUniqueName(names, '碰碰胡');
  } else if (hasSequence) {
    patternFan = 1;
    addUniqueName(names, '平胡');
  } else {
    patternFan = 1;
    addUniqueName(names, '平胡');
  }

  if (isGoldenHook && !sevenPairs) {
    patternFan = Math.max(patternFan, isPure ? 8 : 4);
    addUniqueName(names, '金钩钓');
  }

  let fan = patternFan;

  if (ctx.zimo) {
    if (ctx.gangStatus) {
      fan += 1;
      addUniqueName(names, '杠上开花');
    } else {
      fan += 1;
      addUniqueName(names, '自摸');
    }
    if (ctx.wallCount === 0) {
      fan += 1;
      addUniqueName(names, '海底捞月');
    }
    if (ctx.sendCount === 1 && ctx.outCount === 0) {
      fan += 8;
      addUniqueName(names, '天胡');
    }
  }
  if (ctx.qiangGang) {
    fan += 1;
    addUniqueName(names, '抢杠胡');
  }
  if (!ctx.zimo && ctx.sendCount === 1 && ctx.outCount === 1) {
    fan += 8;
    addUniqueName(names, '地胡');
  }

  fan = Math.max(1, Math.min(32, fan));
  return { canHu: true, fan, fanNames: names };
}

export function tingCards(hand: number[], melds: MjMeld[]): number[] {
  const base = countCards(hand);
  const waits: number[] = [];
  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    base[i]++;
    if (canHuFast(base, melds.length)) waits.push(indexToCard(i));
    base[i]--;
  }
  return waits;
}

export function discardHints(hand: number[], melds: MjMeld[]): DiscardHint[] {
  const hints: DiscardHint[] = [];
  const seen = new Set<number>();
  for (const card of hand) {
    if (seen.has(card)) continue;
    seen.add(card);
    const remaining = [...hand];
    remaining.splice(remaining.indexOf(card), 1);
    const waits = tingCards(remaining, melds);
    if (waits.length > 0) hints.push({ card, waits });
  }
  return hints.sort((a, b) => b.waits.length - a.waits.length);
}

export function selfGangOptions(
  hand: number[],
  melds: MjMeld[],
  wallCount: number
): SelfGangOption[] {
  if (wallCount <= 0) return [];
  const counts = countCards(hand);
  const options: SelfGangOption[] = [];
  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    if (counts[i] === 4) {
      options.push({ card: indexToCard(i), kind: 'an_gang' });
    }
  }
  const seen = new Set<number>();
  for (const meld of melds) {
    const kind = meld.kind ?? (meld.type as any);
    if (kind !== 'peng') continue;
    const card = meld.card ?? meld.tiles[0];
    if (card === undefined) continue;
    const idx = cardToIndex(card);
    if (counts[idx] >= 1 && !seen.has(card)) {
      seen.add(card);
      options.push({ card, kind: 'bu_gang' });
    }
  }
  return options;
}

/** Human-readable hand shape for bots and debugging. */
export function handStructureScore(hand: number[], melds: MjMeld[]): number {
  const counts = countCards(hand);
  let score = 0;
  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    if (counts[i] >= 3) score += 6;
    else if (counts[i] === 2) score += 2.4;
    if (i < 27 && i % 9 <= 6) {
      if (counts[i] > 0 && counts[i + 1] > 0) score += 1.1;
      if (counts[i] > 0 && counts[i + 2] > 0) score += 0.7;
    }
  }
  const suitCounts = [0, 0, 0, 0];
  for (let i = 0; i < MAX_TILE_INDEX; i++) {
    if (counts[i] > 0) suitCounts[suitOfCard(indexToCard(i))] += counts[i];
  }
  const numeric = Math.max(suitCounts[0], suitCounts[1], suitCounts[2]);
  score += numeric * 0.35;
  score += melds.length * 2.5;
  return score;
}
