import {
  NiuniuCard,
  NiuniuHandResult,
  NiuniuHandType,
  NiuniuSuit,
} from '../types';

export const SUIT_ORDER: Record<NiuniuSuit, number> = {
  spade: 4, // 黑桃最大
  heart: 3, // 红桃次之
  club: 2, // 梅花
  diamond: 1, // 方块最小
};

export const SUIT_NAMES: Record<NiuniuSuit, string> = {
  spade: '黑桃',
  heart: '红桃',
  club: '梅花',
  diamond: '方块',
};

export const RANK_NAMES: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

/**
 * 扑克牌点数计算规则：
 * A为1点，2~9为对应点数，10/J/Q/K统一算作10点（模10为0）
 */
export function getCardValue(rank: number): number {
  if (rank >= 10) return 10;
  return rank;
}

/**
 * 创建一副标准的52张扑克牌（不含大小王）
 */
export function createStandardNiuniuDeck(): NiuniuCard[] {
  const suits: NiuniuSuit[] = ['spade', 'heart', 'club', 'diamond'];
  const deck: NiuniuCard[] = [];
  let id = 0;

  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: id++,
        suit,
        rank,
        value: getCardValue(rank),
      });
    }
  }

  return deck;
}

/**
 * Fisher-Yates洗牌算法
 */
export function shuffleDeck(deck: NiuniuCard[]): NiuniuCard[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 找出牌组中单张最大的牌（先比点数 K>Q>...>A，再比花色 黑>红>梅>方）
 */
export function findMaxCard(cards: NiuniuCard[]): NiuniuCard {
  if (cards.length === 0) {
    throw new Error('手牌不能为空');
  }

  let maxCard = cards[0];
  for (let i = 1; i < cards.length; i++) {
    const current = cards[i];
    if (current.rank > maxCard.rank) {
      maxCard = current;
    } else if (current.rank === maxCard.rank) {
      if (SUIT_ORDER[current.suit] > SUIT_ORDER[maxCard.suit]) {
        maxCard = current;
      }
    }
  }
  return maxCard;
}

/**
 * 商业化牛牛全牌型综合判定与分牌求解
 * 判定等级：五小牛(17) > 炸弹牛(16) > 五花牛(15) > 四花牛(14) > 葫芦牛(13) > 同花牛(12) > 顺子牛(11) > 牛牛(10) > 牛9(9)..牛1(1) > 无牛(0)
 */
export function evaluateNiuniuHand(cards: NiuniuCard[]): NiuniuHandResult {
  if (cards.length !== 5) {
    throw new Error('牛牛算牌必须为严格 5 张牌');
  }

  const sortedCards = [...cards].sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank;
    return SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit];
  });
  const maxCard = findMaxCard(sortedCards);

  // 1. 五小牛：5张牌点数均 <= 4 且总点数 <= 10 (10倍)
  const isFiveSmall =
    sortedCards.every((c) => c.rank <= 4) &&
    sortedCards.reduce((acc, c) => acc + c.value, 0) <= 10;
  if (isFiveSmall) {
    return {
      handType: 'FIVE_SMALL_NIU',
      level: 17,
      multiplier: 10,
      name: '五小牛',
      tenGroup: sortedCards.slice(0, 3),
      bullGroup: sortedCards.slice(3, 5),
      maxCard,
    };
  }

  // 2. 炸弹牛 / 四炸：4张相同点数 (8倍)
  const rankCountMap: Record<number, NiuniuCard[]> = {};
  for (const c of sortedCards) {
    if (!rankCountMap[c.rank]) rankCountMap[c.rank] = [];
    rankCountMap[c.rank].push(c);
  }
  const fourOfKind = Object.values(rankCountMap).find((group) => group.length === 4);
  if (fourOfKind) {
    const singleCard = sortedCards.find((c) => c.rank !== fourOfKind[0].rank)!;
    return {
      handType: 'BOMB_NIU',
      level: 16,
      multiplier: 8,
      name: '炸弹牛',
      tenGroup: fourOfKind.slice(0, 3),
      bullGroup: [fourOfKind[3], singleCard],
      maxCard: fourOfKind[0], // 炸弹比炸弹牌大小
    };
  }

  // 3. 五花牛 / 金牛：5张牌全部为 J/Q/K (6倍)
  const isGoldNiu = sortedCards.every((c) => c.rank >= 11);
  if (isGoldNiu) {
    return {
      handType: 'GOLD_NIU',
      level: 15,
      multiplier: 6,
      name: '五花牛',
      tenGroup: sortedCards.slice(0, 3),
      bullGroup: sortedCards.slice(3, 5),
      maxCard,
    };
  }

  // 4. 四花牛 / 银牛：4张 J/Q/K + 1张 10 (5倍)
  const faceCards = sortedCards.filter((c) => c.rank >= 11);
  const tenCards = sortedCards.filter((c) => c.rank === 10);
  if (faceCards.length === 4 && tenCards.length === 1) {
    return {
      handType: 'SILVER_NIU',
      level: 14,
      multiplier: 5,
      name: '四花牛',
      tenGroup: faceCards.slice(0, 3),
      bullGroup: [faceCards[3], tenCards[0]],
      maxCard,
    };
  }

  // 5. 葫芦牛：3张相同 + 1对相同 (5倍)
  const threeOfKind = Object.values(rankCountMap).find((g) => g.length === 3);
  const pairOfKind = Object.values(rankCountMap).find((g) => g.length === 2);
  if (threeOfKind && pairOfKind) {
    return {
      handType: 'FULL_HOUSE_NIU',
      level: 13,
      multiplier: 5,
      name: '葫芦牛',
      tenGroup: threeOfKind,
      bullGroup: pairOfKind,
      maxCard: threeOfKind[0], // 葫芦比3张同点
    };
  }

  // 6. 同花牛：5张花色相同 (5倍)
  const isFlush = sortedCards.every((c) => c.suit === sortedCards[0].suit);
  if (isFlush) {
    return {
      handType: 'FLUSH_NIU',
      level: 12,
      multiplier: 5,
      name: '同花牛',
      tenGroup: sortedCards.slice(0, 3),
      bullGroup: sortedCards.slice(3, 5),
      maxCard,
    };
  }

  // 7. 顺子牛：5张点数连续 (5倍)
  const ranksAsc = [...sortedCards].map((c) => c.rank).reverse();
  const isNormalStraight = ranksAsc.every(
    (r, idx) => idx === 0 || r === ranksAsc[idx - 1] + 1
  );
  // 特殊 A-10-J-Q-K 顺子
  const isRoyalStraight =
    ranksAsc[0] === 1 &&
    ranksAsc[1] === 10 &&
    ranksAsc[2] === 11 &&
    ranksAsc[3] === 12 &&
    ranksAsc[4] === 13;
  if (isNormalStraight || isRoyalStraight) {
    return {
      handType: 'STRAIGHT_NIU',
      level: 11,
      multiplier: 5,
      name: '顺子牛',
      tenGroup: sortedCards.slice(0, 3),
      bullGroup: sortedCards.slice(3, 5),
      maxCard,
    };
  }

  // 8. 经典组合求解：C(5, 3) = 10 种组合
  let bestBullLevel = -1;
  let bestTenGroup: NiuniuCard[] = [];
  let bestBullGroup: NiuniuCard[] = [];

  for (let i = 0; i < 5; i++) {
    for (let j = i + 1; j < 5; j++) {
      for (let k = j + 1; k < 5; k++) {
        const sum3 = cards[i].value + cards[j].value + cards[k].value;
        if (sum3 % 10 === 0) {
          // 找到凑十的3张，提取其余2张算牛
          const remainIndices = [0, 1, 2, 3, 4].filter(
            (idx) => idx !== i && idx !== j && idx !== k
          );
          const cRemain1 = cards[remainIndices[0]];
          const cRemain2 = cards[remainIndices[1]];
          const sum2 = (cRemain1.value + cRemain2.value) % 10;
          const bullCount = sum2 === 0 ? 10 : sum2;

          if (bullCount > bestBullLevel) {
            bestBullLevel = bullCount;
            bestTenGroup = [cards[i], cards[j], cards[k]];
            bestBullGroup = [cRemain1, cRemain2];
          }
        }
      }
    }
  }

  // 牛牛
  if (bestBullLevel === 10) {
    return {
      handType: 'NIU_NIU',
      level: 10,
      multiplier: 4,
      name: '牛牛',
      tenGroup: bestTenGroup,
      bullGroup: bestBullGroup,
      maxCard,
    };
  }

  // 牛九
  if (bestBullLevel === 9) {
    return {
      handType: 'NIU_9',
      level: 9,
      multiplier: 3,
      name: '牛九',
      tenGroup: bestTenGroup,
      bullGroup: bestBullGroup,
      maxCard,
    };
  }

  // 牛八与牛七 (2倍)
  if (bestBullLevel === 8 || bestBullLevel === 7) {
    const type = bestBullLevel === 8 ? 'NIU_8' : 'NIU_7';
    return {
      handType: type,
      level: bestBullLevel,
      multiplier: 2,
      name: bestBullLevel === 8 ? '牛八' : '牛七',
      tenGroup: bestTenGroup,
      bullGroup: bestBullGroup,
      maxCard,
    };
  }

  // 牛一 ~ 牛六 (1倍)
  if (bestBullLevel >= 1 && bestBullLevel <= 6) {
    const types: NiuniuHandType[] = [
      'NO_NIU',
      'NIU_1',
      'NIU_2',
      'NIU_3',
      'NIU_4',
      'NIU_5',
      'NIU_6',
    ];
    const names = ['', '牛一', '牛二', '牛三', '牛四', '牛五', '牛六'];
    return {
      handType: types[bestBullLevel],
      level: bestBullLevel,
      multiplier: 1,
      name: names[bestBullLevel],
      tenGroup: bestTenGroup,
      bullGroup: bestBullGroup,
      maxCard,
    };
  }

  // 9. 无牛 / 没牛 (1倍)
  return {
    handType: 'NO_NIU',
    level: 0,
    multiplier: 1,
    name: '无牛',
    tenGroup: [],
    bullGroup: sortedCards,
    maxCard,
  };
}

/**
 * 严格全序无平局比牌算法：
 * 返回值 > 0: a 胜出
 * 返回值 < 0: b 胜出
 * （由于单副扑克牌内每张牌的花色+点数全局唯一，故比牌必有胜负，绝无等于0的情况）
 */
export function compareHands(
  a: NiuniuHandResult,
  b: NiuniuHandResult
): number {
  // 1. 优先比牌型等级
  if (a.level !== b.level) {
    return a.level - b.level;
  }

  // 2. 牌型等级相同时比最大牌
  if (a.maxCard.rank !== b.maxCard.rank) {
    return a.maxCard.rank - b.maxCard.rank;
  }

  // 3. 最大牌点数相同时比最大牌花色（黑桃 > 红桃 > 梅花 > 方块）
  return SUIT_ORDER[a.maxCard.suit] - SUIT_ORDER[b.maxCard.suit];
}

/**
 * 玩家智能算牛 / 一键分牌辅助器
 */
export function solveOptimalPartition(cards: NiuniuCard[]): {
  hasNiu: boolean;
  handResult: NiuniuHandResult;
  tenGroup: NiuniuCard[];
  bullGroup: NiuniuCard[];
} {
  const handResult = evaluateNiuniuHand(cards);
  return {
    hasNiu: handResult.level > 0,
    handResult,
    tenGroup: handResult.tenGroup,
    bullGroup: handResult.bullGroup,
  };
}

/**
 * AI 抢庄期望估值决策算法：
 * 输入前 4 张牌，评估成牛（尤其高倍大牛）的前向概率期望
 * 返回推荐抢庄倍数：0 (不抢), 1, 2, 3, 4
 */
export function evaluateCallBankerExpected(first4Cards: NiuniuCard[]): number {
  if (first4Cards.length !== 4) return 0;

  // 1. 检查前 4 张牌中是否存在 3 张和为 10 的倍数（必成牛）
  let guaranteedNiu = false;
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      for (let k = j + 1; k < 4; k++) {
        if ((first4Cards[i].value + first4Cards[j].value + first4Cards[k].value) % 10 === 0) {
          guaranteedNiu = true;
          break;
        }
      }
    }
  }

  // 2. 统计花牌数量与高牌
  const faceCount = first4Cards.filter((c) => c.rank >= 11).length;
  const rankCountMap: Record<number, number> = {};
  for (const c of first4Cards) {
    rankCountMap[c.rank] = (rankCountMap[c.rank] || 0) + 1;
  }
  const hasThreeOfKind = Object.values(rankCountMap).some((cnt) => cnt >= 3);

  // 3. 统计小牌数量（五小牛潜力）
  const smallCardsCount = first4Cards.filter((c) => c.rank <= 4).length;
  const smallSum = first4Cards.reduce((acc, c) => acc + c.value, 0);

  // 决策策略
  if (guaranteedNiu) {
    // 必成牛且有花牌或大牌 -> 抢 3~4 倍
    return faceCount >= 2 ? 4 : 3;
  }

  if (hasThreeOfKind || faceCount === 4) {
    // 炸弹潜力或金牛潜力 -> 抢 4 倍
    return 4;
  }

  if (smallCardsCount === 4 && smallSum <= 8) {
    // 五小牛高概率 -> 抢 3 倍
    return 3;
  }

  if (faceCount >= 2) {
    // 双花牌 -> 抢 1~2 倍
    return Math.random() > 0.4 ? 2 : 1;
  }

  // 散牌且成牛潜力低 -> 不抢或少量抢 1 倍
  return Math.random() > 0.85 ? 1 : 0;
}

/**
 * AI 闲家下注加倍估值决策
 * 返回下注倍数：5, 10, 15, 20
 */
export function evaluateBetMultiplier(first4Cards: NiuniuCard[]): number {
  const callRating = evaluateCallBankerExpected(first4Cards);
  if (callRating >= 3) return 20;
  if (callRating === 2) return 15;
  if (callRating === 1) return 10;
  return 5;
}
