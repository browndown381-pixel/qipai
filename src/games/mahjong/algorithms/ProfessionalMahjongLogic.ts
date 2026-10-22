/**
 * ProfessionalMahjongLogic.ts
 * 移植自商业级 C++ 麻将算法引擎 (D:\gitprojects\mahjong\Classes\GameLogic & AIEngine)
 *
 * 核心机制：
 * 1. 0x01~0x09 (筒子 0..8), 0x11~0x19 (万子 9..17), 0x21~0x29 (条子 18..26), 0x31~0x37 (番子 27..33)
 * 2. 34 维直方图频次索引 cbCardIndex[34]
 * 3. 递归回溯面子提取 (analyseCard) 与全量 CAnalyseItemArray 析出
 * 4. 商业级番型判定与算番 (平胡、碰碰胡、清一色、七对、单钓将、天胡、地胡、杠开、抢杠、自摸、接炮、卡张)
 * 5. 精准听牌与待胡分析 (analyseTingCardResult)
 * 6. 动作优先级权重管理 (getUserActionRank: 胡 3 > 杠 2 > 碰 1 > 过 0)
 */

export const MASK_COLOR = 0xf0; // 花色掩码
export const MASK_VALUE = 0x0f; // 数值掩码

export const MAX_INDEX = 34; // 扑克种类 34
export const MAX_COUNT = 14; // 最大手牌张数 14
export const MAX_WEAVE = 4; // 最大组合数目 4
export const MAX_REPERTORY = 136; // 最大牌库数目 136

// 动作掩码
export const WIK_NULL = 0x00; // 过
export const WIK_P = 0x01; // 碰
export const WIK_G = 0x02; // 杠
export const WIK_H = 0x04; // 胡
export const WIK_S = 0x08; // 吃 / 顺子

// 胡牌类型 (权位位运算)
export const CHR_NULL = 0x00; // 没胡标识
export const CHR_PH = 0x01; // 平胡
export const CHR_PPH = 0x02; // 碰碰胡
export const CHR_QS = 0x04; // 清一色
export const CHR_DY = 0x08; // 钓鱼 / 单钓将
export const CHR_QD = 0x10; // 七对
export const CHR_DH = 0x20; // 地胡
export const CHR_TH = 0x40; // 天胡

// 胡牌方式
export const CHK_NULL = 0x00; // 非胡
export const CHK_ZM = 0x01; // 自摸
export const CHK_JP = 0x02; // 接炮
export const CHK_QG = 0x04; // 抢杠
export const CHK_GK = 0x08; // 杠开 (杠上开花)

// 特殊情况
export const CHS_NULL = 0x00; // 无情况
export const CHS_DZ = 0x01; // 单张
export const CHS_DH = 0x02; // 地胡
export const CHS_TH = 0x04; // 天胡
export const CHS_GP = 0x08; // 有杠
export const CHS_KZ = 0x10; // 卡张

// 类型子项
export interface tagKindItem {
  cbWeaveKind: number; // 组合类型
  cbCenterCard: number; // 中心扑克
  cbCardIndex: [number, number, number]; // 扑克索引
}

// 组合子项 (吃碰杠)
export interface tagWeaveItem {
  cbWeaveKind: number; // 组合类型 (WIK_P, WIK_G, WIK_S)
  cbCenterCard: number; // 中心扑克
  cbPublicCard: boolean; // 公开标志 (明碰/明杠 vs 暗杠)
  cbProvideUser?: number; // 供应玩家椅子号
  cbValid?: boolean; // 有效标识
}

// 杠牌结果
export interface tagGangCardResult {
  cbCardCount: number;
  cbCardData: number[];
  cbPublic: boolean[];
}

// 分析子项
export interface tagAnalyseItem {
  cbCardEye: number; // 牌眼扑克
  cbWeaveKind: number[]; // 组合类型数组 (长度4)
  cbCenterCard: number[]; // 中心扑克数组 (长度4)
}

// 听牌结果
export interface tagTingResult {
  cbTingCount: number;
  cbTingCard: number[];
  cbFanShu: number[];
  cbRemainCount?: number[];
}

export interface HuResultDetails {
  canHu: boolean;
  huKind: number; // 自摸/接炮/抢杠/杠开
  huRight: number; // 平胡/碰碰胡/清一色/七对/单钓等
  huSpecial: number; // 天胡/地胡/卡张/单张等
  cbFanShu: number;
  fanNames: string[];
}

export class ProfessionalMahjongLogic {
  /**
   * 扑克有效性判断
   */
  public static isValidCard(cbCardData: number): boolean {
    const cbValue = cbCardData & MASK_VALUE;
    const cbColor = (cbCardData & MASK_COLOR) >> 4;
    return (
      (cbValue >= 1 && cbValue <= 9 && cbColor <= 2) ||
      (cbValue >= 1 && cbValue <= 7 && cbColor === 3)
    );
  }

  /**
   * 连续索引 (0..33) 转为 16 进制标准牌值
   * 0..8: 0x01..0x09 (筒)
   * 9..17: 0x11..0x19 (万)
   * 18..26: 0x21..0x29 (条)
   * 27..33: 0x31..0x37 (番: 东南西北中发白)
   */
  public static switchToCardData(cbCardIndex: number): number {
    return ((Math.floor(cbCardIndex / 9) << 4) | ((cbCardIndex % 9) + 1)) & 0xff;
  }

  /**
   * 16 进制牌值转为 0..33 连续索引
   */
  public static switchToCardIndex(cbCardData: number): number {
    const color = (cbCardData & MASK_COLOR) >> 4;
    const value = cbCardData & MASK_VALUE;
    return color * 9 + value - 1;
  }

  /**
   * 将任意通用牌 ID (包括十进制 1~9万, 11~19条, 21~29筒, 31红中, 41~44风牌, 46~47字牌) 标准化为 16 进制标准 CardData
   */
  public static normalizeToCardData(rawId: number): number {
    // 优先匹配标准十进制表示 (1..9 万, 11..19 条, 21..29 筒)
    if (rawId >= 1 && rawId <= 9) return 0x10 | rawId; // 万 -> 0x11..0x19
    if (rawId >= 11 && rawId <= 19) return 0x20 | (rawId - 10); // 条 -> 0x21..0x29
    if (rawId >= 21 && rawId <= 29) return 0x00 | (rawId - 20); // 筒 -> 0x01..0x09
    if (rawId === 31 || rawId === 45) return 0x35; // 红中
    if (rawId === 46) return 0x36; // 发财
    if (rawId === 47) return 0x37; // 白板
    if (rawId >= 41 && rawId <= 44) return 0x30 | (rawId - 40); // 东南西北

    // 若已经符合 16 进制标准 CardData 格式
    if (this.isValidCard(rawId)) {
      return rawId;
    }

    // 若在 0..33 索引范围内
    if (rawId >= 0 && rawId < MAX_INDEX) {
      return this.switchToCardData(rawId);
    }
    return 0x01;
  }

  /**
   * 将手牌转换为 34 维频次索引数组 cbCardIndex[34]
   */
  public static switchToCardIndexVector(cards: number[]): number[] {
    const cbCardIndex = new Array<number>(MAX_INDEX).fill(0);
    for (const card of cards) {
      const standard = this.normalizeToCardData(card);
      const idx = this.switchToCardIndex(standard);
      if (idx >= 0 && idx < MAX_INDEX) {
        cbCardIndex[idx]++;
      }
    }
    return cbCardIndex;
  }

  /**
   * 计算手牌总张数
   */
  public static getCardCount(cbCardIndex: number[]): number {
    let count = 0;
    for (let i = 0; i < MAX_INDEX; i++) {
      count += cbCardIndex[i] || 0;
    }
    return count;
  }

  /**
   * 动作等级优先级判断 (胡 3 > 杠 2 > 碰 1 > 吃 0.5 > 过 0)
   */
  public static getUserActionRank(cbUserAction: number): number {
    if ((cbUserAction & WIK_H) !== 0) return 3; // 胡牌优先级最高
    if ((cbUserAction & WIK_G) !== 0) return 2; // 杠牌优先级第二
    if ((cbUserAction & WIK_P) !== 0) return 1; // 碰牌优先级第三
    if ((cbUserAction & WIK_S) !== 0) return 0.5; // 吃牌优先级第四
    return 0;
  }

  /**
   * 碰牌判断
   */
  public static estimatePengCard(cbCardIndex: number[], cbCurrentCard: number): number {
    const idx = this.switchToCardIndex(this.normalizeToCardData(cbCurrentCard));
    return cbCardIndex[idx] >= 2 ? WIK_P : WIK_NULL;
  }

  /**
   * 杠牌判断 (他人打出的牌)
   */
  public static estimateGangCard(cbCardIndex: number[], cbCurrentCard: number): number {
    const idx = this.switchToCardIndex(this.normalizeToCardData(cbCurrentCard));
    return cbCardIndex[idx] === 3 ? WIK_G : WIK_NULL;
  }

  /**
   * 杠牌分析 (包括暗杠与补杠)
   */
  public static analyseGangCard(
    cbCardIndex: number[],
    weaveItems: tagWeaveItem[],
    gangResult: tagGangCardResult
  ): number {
    let cbActionMask = WIK_NULL;
    gangResult.cbCardCount = 0;
    gangResult.cbCardData = [];
    gangResult.cbPublic = [];

    // 1. 手上暗杠 (手牌中有 4 张相同牌)
    for (let i = 0; i < MAX_INDEX; i++) {
      if (cbCardIndex[i] === 4) {
        cbActionMask |= WIK_G;
        gangResult.cbPublic.push(false);
        gangResult.cbCardData.push(this.switchToCardData(i));
        gangResult.cbCardCount++;
      }
    }

    // 2. 碰后补杠 (手牌中有 1 张与已碰组合相同的牌)
    for (let i = 0; i < weaveItems.length; i++) {
      if (weaveItems[i].cbWeaveKind === WIK_P) {
        const centerIdx = this.switchToCardIndex(this.normalizeToCardData(weaveItems[i].cbCenterCard));
        if (cbCardIndex[centerIdx] === 1) {
          cbActionMask |= WIK_G;
          gangResult.cbPublic.push(true);
          gangResult.cbCardData.push(weaveItems[i].cbCenterCard);
          gangResult.cbCardCount++;
        }
      }
    }

    return cbActionMask;
  }

  /**
   * 组合分析核心算法 (C++ GameLogic::analyseCard 原汁原味移植)
   * 穷举析出所有合法的 4 面子 + 1 雀头拆解方案
   */
  public static analyseCard(
    cbCardIndex: number[],
    cbCardCount: number,
    weaveItems: tagWeaveItem[]
  ): tagAnalyseItem[] {
    const analyseItemArray: tagAnalyseItem[] = [];

    // 校验数目：必须为 2, 5, 8, 11, 14 张
    if (cbCardCount < 2 || cbCardCount > MAX_COUNT || (cbCardCount - 2) % 3 !== 0) {
      return analyseItemArray;
    }

    const cbItemCount = weaveItems.length;
    const cbLessKindItem = Math.floor((cbCardCount - 2) / 3);

    // 单钓判断 (手上只剩 2 张牌)
    if (cbLessKindItem === 0) {
      for (let i = 0; i < MAX_INDEX; i++) {
        if (cbCardIndex[i] === 2) {
          const item: tagAnalyseItem = {
            cbCardEye: this.switchToCardData(i),
            cbWeaveKind: weaveItems.map((w) => w.cbWeaveKind),
            cbCenterCard: weaveItems.map((w) => w.cbCenterCard),
          };
          analyseItemArray.push(item);
          return analyseItemArray;
        }
      }
      return analyseItemArray;
    }

    // 提取全部合法的候选面子
    const kindItems: tagKindItem[] = [];
    if (cbCardCount >= 3) {
      for (let i = 0; i < MAX_INDEX; i++) {
        // 同牌判断 (刻子 AAA)
        if (cbCardIndex[i] >= 3) {
          kindItems.push({
            cbCenterCard: this.switchToCardData(i),
            cbCardIndex: [i, i, i],
            cbWeaveKind: WIK_P,
          });
        }
        // 连牌判断 (顺子 ABC，仅限万条筒数牌且 i%9 < 7)
        if (i < MAX_INDEX - 7 && cbCardIndex[i] > 0 && i % 9 < 7) {
          const count = cbCardIndex[i];
          for (let j = 1; j <= count; j++) {
            if (cbCardIndex[i + 1] >= j && cbCardIndex[i + 2] >= j) {
              kindItems.push({
                cbCenterCard: this.switchToCardData(i + 1),
                cbCardIndex: [i, i + 1, i + 2],
                cbWeaveKind: WIK_S,
              });
            }
          }
        }
      }
    }

    // 候选面子数目不足以构成剩余组合
    if (kindItems.length < cbLessKindItem) {
      return analyseItemArray;
    }

    // 递归回溯组合遍历候选面子
    const cbIndex = Array.from({ length: cbLessKindItem }, (_, idx) => idx);
    const cbKindItemCount = kindItems.length;

    do {
      const cbCardIndexTemp = [...cbCardIndex];
      const pKindItem: tagKindItem[] = [];
      for (let i = 0; i < cbLessKindItem; i++) {
        pKindItem.push(kindItems[cbIndex[i]]);
      }

      // 数量扣减检验
      let bEnoughCard = true;
      for (let i = 0; i < cbLessKindItem * 3; i++) {
        const itemIdx = Math.floor(i / 3);
        const cardOffset = i % 3;
        const cbTempCardIndex = pKindItem[itemIdx].cbCardIndex[cardOffset];
        if (cbCardIndexTemp[cbTempCardIndex] === 0) {
          bEnoughCard = false;
          break;
        } else {
          cbCardIndexTemp[cbTempCardIndex]--;
        }
      }

      // 校验剩余牌是否恰为雀头 (对子)
      if (bEnoughCard) {
        let cbCardEye = 0;
        for (let i = 0; i < MAX_INDEX; i++) {
          if (cbCardIndexTemp[i] === 2) {
            cbCardEye = this.switchToCardData(i);
            break;
          }
        }

        if (cbCardEye !== 0) {
          const item: tagAnalyseItem = {
            cbCardEye,
            cbWeaveKind: [
              ...weaveItems.map((w) => w.cbWeaveKind),
              ...pKindItem.map((p) => p.cbWeaveKind),
            ],
            cbCenterCard: [
              ...weaveItems.map((w) => w.cbCenterCard),
              ...pKindItem.map((p) => p.cbCenterCard),
            ],
          };
          analyseItemArray.push(item);
        }
      }

      // 递增组合索引
      if (cbIndex[cbLessKindItem - 1] === cbKindItemCount - 1) {
        let i = cbLessKindItem - 1;
        for (; i > 0; i--) {
          if (cbIndex[i - 1] + 1 !== cbIndex[i]) {
            const cbNewIndex = cbIndex[i - 1];
            for (let j = i - 1; j < cbLessKindItem; j++) {
              cbIndex[j] = cbNewIndex + j - i + 2;
            }
            break;
          }
        }
        if (i === 0) {
          break;
        }
      } else {
        cbIndex[cbLessKindItem - 1]++;
      }
    } while (true);

    return analyseItemArray;
  }

  /**
   * 判断能否胡牌 (支持七对与普通组合胡牌)
   */
  public static canHu(
    cbCardIndexTemp: number[],
    cbCardCountTemp: number,
    weaveItems: tagWeaveItem[],
    analyseItemArray: tagAnalyseItem[]
  ): boolean {
    // 1. 七对检查 (无副牌碰杠，总牌数为 14 张且各牌张数为 2 或 4)
    if (weaveItems.length === 0 && cbCardCountTemp === 14) {
      let duiCount = 0;
      for (let i = 0; i < MAX_INDEX; i++) {
        if (cbCardIndexTemp[i] === 2) duiCount += 1;
        else if (cbCardIndexTemp[i] === 4) duiCount += 2; // 龙七对含四张
        else if (cbCardIndexTemp[i] !== 0) {
          duiCount = -1;
          break;
        }
      }
      if (duiCount === 7) {
        return true;
      }
    }

    // 2. 普通 4 面子 + 1 雀头
    return analyseItemArray.length > 0;
  }

  /**
   * 平胡判定
   */
  public static pingHu(analyseItemArray: tagAnalyseItem[]): number {
    if (analyseItemArray.length > 0) {
      for (const item of analyseItemArray) {
        let bLianCard = false;
        for (const wk of item.cbWeaveKind) {
          if ((wk & WIK_S) !== 0) {
            bLianCard = true;
            break;
          }
        }
        if (bLianCard) {
          return CHR_PH;
        }
      }
    }
    return CHR_NULL;
  }

  /**
   * 碰碰胡判定 (全部为刻子或杠，没有顺子)
   */
  public static pengPengHu(analyseItemArray: tagAnalyseItem[]): number {
    if (analyseItemArray.length > 0) {
      for (const item of analyseItemArray) {
        let bLianCard = false;
        let bPengCard = false;
        for (const wk of item.cbWeaveKind) {
          if ((wk & (WIK_G | WIK_P)) !== 0) bPengCard = true;
          if ((wk & WIK_S) !== 0) bLianCard = true;
        }
        if (!bLianCard && bPengCard) {
          return CHR_PPH;
        }
      }
    }
    return CHR_NULL;
  }

  /**
   * 清一色判定
   */
  public static qingSe(
    cbCardIndexTemp: number[],
    cbCardCountTemp: number,
    weaveItems: tagWeaveItem[],
    analyseItemArray: tagAnalyseItem[]
  ): number {
    let cbCardColor = 0xff;
    for (let i = 0; i < MAX_INDEX; i++) {
      if (cbCardIndexTemp[i] !== 0) {
        const cardColor = (this.switchToCardData(i) & MASK_COLOR) >> 4;
        if (cbCardColor === 0xff) {
          cbCardColor = cardColor;
        }
        if (cardColor !== cbCardColor) {
          return CHR_NULL;
        }
      }
    }

    for (const w of weaveItems) {
      const center = this.normalizeToCardData(w.cbCenterCard);
      const cardColor = (center & MASK_COLOR) >> 4;
      if (cardColor !== cbCardColor) {
        return CHR_NULL;
      }
    }

    if (this.canHu(cbCardIndexTemp, cbCardCountTemp, weaveItems, analyseItemArray)) {
      return CHR_QS;
    }
    return CHR_NULL;
  }

  /**
   * 七对判定
   */
  public static qiDui(
    cbCardIndexTemp: number[],
    cbCardCountTemp: number,
    weaveItems: tagWeaveItem[]
  ): number {
    if (weaveItems.length > 0 || cbCardCountTemp !== 14) return CHR_NULL;
    let pairs = 0;
    for (let i = 0; i < MAX_INDEX; i++) {
      const c = cbCardIndexTemp[i];
      if (c === 2) pairs += 1;
      else if (c === 4) pairs += 2;
      else if (c !== 0) return CHR_NULL;
    }
    return pairs === 7 ? CHR_QD : CHR_NULL;
  }

  /**
   * 单钓将 (钓鱼) 判定
   */
  public static diaoYu(
    cbCardIndexTemp: number[],
    cbCardCountTemp: number,
    analyseItemArray: tagAnalyseItem[]
  ): number {
    if (cbCardCountTemp === 2 && this.pengPengHu(analyseItemArray) === CHR_PPH) {
      return CHR_DY;
    }
    return CHR_NULL;
  }

  /**
   * 天胡判断 (庄家发牌即胡)
   */
  public static tianHu(cbSendCardCount: number, cbOutCardCount: number): number {
    return cbSendCardCount === 1 && cbOutCardCount === 0 ? CHS_TH : CHS_NULL;
  }

  /**
   * 地胡判断 (闲家首巡胡庄家所出之牌)
   */
  public static diHu(cbSendCardCount: number, cbOutCardCount: number): number {
    return cbSendCardCount === 1 && cbOutCardCount === 1 ? CHS_DH : CHS_NULL;
  }

  /**
   * 自摸判断
   */
  public static ziMo(llHuRight: number, bGangStatus: boolean, bZimo: boolean): number {
    return llHuRight !== 0 && bZimo && !bGangStatus ? CHK_ZM : CHK_NULL;
  }

  /**
   * 杠开 (杠上开花) 判断
   */
  public static gangKai(llHuRight: number, bGangStatus: boolean, bZimo: boolean): number {
    return llHuRight !== 0 && bZimo && bGangStatus ? CHK_GK : CHK_NULL;
  }

  /**
   * 抢杠判断
   */
  public static qiangGang(llHuRight: number, bGangStatus: boolean, bZimo: boolean): number {
    return llHuRight !== 0 && !bZimo && bGangStatus ? CHK_QG : CHK_NULL;
  }

  /**
   * 接炮判断
   */
  public static jiePao(llHuRight: number, bGangStatus: boolean, bZimo: boolean): number {
    return llHuRight !== 0 && !bZimo && !bGangStatus ? CHK_JP : CHK_NULL;
  }

  /**
   * 快速判断是否能胡 (供听牌搜索高频遍历调用)
   */
  public static analyseCanHuCard(
    cbCardIndex: number[],
    weaveItems: tagWeaveItem[],
    cbCurrentCard: number
  ): boolean {
    const cbCardIndexTemp = [...cbCardIndex];
    if (cbCurrentCard !== 0) {
      const idx = this.switchToCardIndex(this.normalizeToCardData(cbCurrentCard));
      if (idx >= 0 && idx < MAX_INDEX) {
        cbCardIndexTemp[idx]++;
      }
    }
    const cbCardCountTemp = this.getCardCount(cbCardIndexTemp);
    if ((cbCardCountTemp - 2) % 3 !== 0) return false;

    // 七对快速剪枝
    if (weaveItems.length === 0 && cbCardCountTemp === 14) {
      let is7Dui = true;
      for (let i = 0; i < MAX_INDEX; i++) {
        if (cbCardIndexTemp[i] % 2 !== 0) {
          is7Dui = false;
          break;
        }
      }
      if (is7Dui) return true;
    }

    const analyseItemArray = this.analyseCard(cbCardIndexTemp, cbCardCountTemp, weaveItems);
    return this.canHu(cbCardIndexTemp, cbCardCountTemp, weaveItems, analyseItemArray);
  }

  /**
   * 全面胡牌分析与番型计算
   */
  public static analyseHuCard(
    cbCardIndex: number[],
    weaveItems: tagWeaveItem[],
    cbCurrentCard: number,
    opts: {
      sendCardCount?: number;
      outCardCount?: number;
      gangStatus?: boolean;
      zimo?: boolean;
      qiangGangStatus?: boolean;
      dingQueSuit?: number | null;
    } = {}
  ): HuResultDetails {
    const {
      sendCardCount = 10,
      outCardCount = 10,
      gangStatus = false,
      zimo = false,
      qiangGangStatus = false,
      dingQueSuit = null,
    } = opts;

    // 定缺检查：若定缺花色中仍有牌，则禁止胡牌
    if (dingQueSuit !== null && dingQueSuit !== undefined && dingQueSuit >= 0 && dingQueSuit <= 2) {
      const start = dingQueSuit === 0 ? 0 : dingQueSuit === 1 ? 9 : 18;
      const end = start + 8;
      for (let i = start; i <= end; i++) {
        if (cbCardIndex[i] > 0) {
          return { canHu: false, huKind: CHK_NULL, huRight: CHR_NULL, huSpecial: CHS_NULL, cbFanShu: 0, fanNames: [] };
        }
      }
      const curIdx = this.switchToCardIndex(this.normalizeToCardData(cbCurrentCard));
      if (curIdx >= start && curIdx <= end) {
        return { canHu: false, huKind: CHK_NULL, huRight: CHR_NULL, huSpecial: CHS_NULL, cbFanShu: 0, fanNames: [] };
      }
    }

    const cbCardIndexTemp = [...cbCardIndex];
    if (cbCurrentCard !== 0) {
      const curIdx = this.switchToCardIndex(this.normalizeToCardData(cbCurrentCard));
      cbCardIndexTemp[curIdx]++;
    }

    const cbCardCountTemp = this.getCardCount(cbCardIndexTemp);
    if ((cbCardCountTemp - 2) % 3 !== 0) {
      return { canHu: false, huKind: CHK_NULL, huRight: CHR_NULL, huSpecial: CHS_NULL, cbFanShu: 0, fanNames: [] };
    }

    const analyseItemArray = this.analyseCard(cbCardIndexTemp, cbCardCountTemp, weaveItems);
    const canHu = this.canHu(cbCardIndexTemp, cbCardCountTemp, weaveItems, analyseItemArray);

    if (!canHu) {
      return { canHu: false, huKind: CHK_NULL, huRight: CHR_NULL, huSpecial: CHS_NULL, cbFanShu: 0, fanNames: [] };
    }

    let huRight = CHR_NULL;
    huRight |= this.pingHu(analyseItemArray);
    huRight |= this.pengPengHu(analyseItemArray);
    huRight |= this.qingSe(cbCardIndexTemp, cbCardCountTemp, weaveItems, analyseItemArray);
    huRight |= this.qiDui(cbCardIndexTemp, cbCardCountTemp, weaveItems);
    huRight |= this.diaoYu(cbCardIndexTemp, cbCardCountTemp, analyseItemArray);

    let huKind = CHK_NULL;
    huKind |= this.ziMo(huRight, gangStatus, zimo);
    huKind |= this.gangKai(huRight, gangStatus, zimo);
    huKind |= this.qiangGang(huRight, gangStatus, zimo);
    huKind |= this.jiePao(huRight, gangStatus, zimo);

    let huSpecial = CHS_NULL;
    huSpecial |= this.tianHu(sendCardCount, outCardCount);
    huSpecial |= this.diHu(sendCardCount, outCardCount);

    const fanNames: string[] = [];
    let cbFanShu = 1;

    // 牌型番数核算
    if ((huRight & CHR_QD) !== 0) {
      let quads = 0;
      for (let i = 0; i < MAX_INDEX; i++) {
        if (cbCardIndexTemp[i] === 4) quads++;
      }
      if (quads > 0) {
        cbFanShu = 8 * Math.pow(2, quads - 1);
        fanNames.push(quads === 1 ? '龙七对' : `多龙七对(${quads}龙)`);
      } else {
        cbFanShu = 4;
        fanNames.push('七对');
      }
    } else if ((huRight & CHR_PPH) !== 0) {
      cbFanShu = 2;
      fanNames.push('碰碰胡');
    } else {
      cbFanShu = 1;
      fanNames.push('平胡');
    }

    if ((huRight & CHR_QS) !== 0) {
      cbFanShu *= 4;
      fanNames.push('清一色');
    }

    if ((huRight & CHR_DY) !== 0 && (huRight & CHR_QD) === 0) {
      cbFanShu *= 2;
      fanNames.push('金钩钓');
    }

    if ((huSpecial & CHS_TH) !== 0) {
      cbFanShu += 8;
      fanNames.push('天胡');
    } else if ((huSpecial & CHS_DH) !== 0) {
      cbFanShu += 8;
      fanNames.push('地胡');
    }

    if ((huKind & CHK_GK) !== 0) {
      cbFanShu += 1;
      fanNames.push('杠上开花');
    } else if ((huKind & CHK_ZM) !== 0) {
      cbFanShu += 1;
      fanNames.push('自摸');
    }

    if ((huKind & CHK_QG) !== 0) {
      cbFanShu += 1;
      fanNames.push('抢杠胡');
    }

    return {
      canHu: true,
      huKind,
      huRight,
      huSpecial,
      cbFanShu: Math.max(1, Math.min(64, cbFanShu)),
      fanNames,
    };
  }

  /**
   * 分析听牌结果 (推导听牌列表与番数)
   */
  public static analyseTingCardResult(
    cbCardIndex: number[],
    weaveItems: tagWeaveItem[],
    dingQueSuit?: number | null
  ): tagTingResult {
    const tingResult: tagTingResult = {
      cbTingCount: 0,
      cbTingCard: [],
      cbFanShu: [],
      cbRemainCount: [],
    };

    for (let j = 0; j < MAX_INDEX; j++) {
      const cbCurrentCard = this.switchToCardData(j);
      const res = this.analyseHuCard(cbCardIndex, weaveItems, cbCurrentCard, {
        dingQueSuit,
        zimo: true,
      });
      if (res.canHu) {
        tingResult.cbTingCard.push(cbCurrentCard);
        tingResult.cbFanShu.push(res.cbFanShu);
        tingResult.cbTingCount++;
      }
    }

    return tingResult;
  }

  /**
   * 推导出牌提示列表：打出哪张牌能听哪些牌
   */
  public static evaluateDiscardHints(
    handCards: number[],
    weaveItems: tagWeaveItem[],
    dingQueSuit?: number | null
  ): Array<{ card: number; waits: number[] }> {
    const hints: Array<{ card: number; waits: number[] }> = [];
    const seen = new Set<number>();
    const cardIndex = this.switchToCardIndexVector(handCards);

    for (const card of handCards) {
      const stdCard = this.normalizeToCardData(card);
      if (seen.has(stdCard)) continue;
      seen.add(stdCard);

      const idx = this.switchToCardIndex(stdCard);
      if (cardIndex[idx] === 0) continue;

      cardIndex[idx]--;
      const tingRes = this.analyseTingCardResult(cardIndex, weaveItems, dingQueSuit);
      cardIndex[idx]++;

      if (tingRes.cbTingCount > 0) {
        hints.push({
          card,
          waits: tingRes.cbTingCard,
        });
      }
    }

    return hints.sort((a, b) => b.waits.length - a.waits.length);
  }
}
