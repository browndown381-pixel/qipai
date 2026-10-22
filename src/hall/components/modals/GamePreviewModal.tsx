import React, { useState } from 'react';
import { X, Play, Shield, Users, Trophy, Award, Flame, Sparkles } from 'lucide-react';
import { soundEngine } from '../../../shared/audio/SoundEngine';
import { hapticEngine } from '../../../shared/haptics/HapticEngine';

export type GameKey = 'niuniu' | 'zhajinhua' | 'laoyancai' | 'shuangko' | 'sihepai';

export interface GameTierInfo {
  id: string;
  name: string;
  baseScore: number;
  minBeans: number;
  multiplierText: string;
  color: string;
}

export interface GameDetailMeta {
  id: GameKey;
  title: string;
  subtitle: string;
  badge: string;
  onlineCount: number;
  heroImg: string;
  heroImgFallback: string;
  accentGradient: string;
  borderColor: string;
  tiers: GameTierInfo[];
  rulePoints: string[];
  handRanks: Array<{ name: string; multiplier: string; desc: string }>;
}

export const GAME_DETAILS: Record<GameKey, GameDetailMeta> = {
  niuniu: {
    id: 'niuniu',
    title: '抢庄斗牛',
    subtitle: '经典抢庄 · 牛牛翻倍 · 通比拼点',
    badge: '火爆高倍',
    onlineCount: 6820,
    heroImg: '/assets/hall/hero-niuniu.png',
    heroImgFallback: '/assets/hall/hero-niuniu.svg',
    accentGradient: 'from-red-600 via-rose-700 to-amber-800',
    borderColor: 'border-red-400/40',
    tiers: [
      { id: 't1', name: '平民场', baseScore: 100, minBeans: 2000, multiplierText: '1~3倍', color: 'from-emerald-600 to-teal-800' },
      { id: 't2', name: '进阶场', baseScore: 500, minBeans: 10000, multiplierText: '1~4倍', color: 'from-blue-600 to-indigo-800' },
      { id: 't3', name: '大师场', baseScore: 2000, minBeans: 50000, multiplierText: '1~5倍', color: 'from-purple-600 to-violet-800' },
      { id: 't4', name: '至尊场', baseScore: 10000, minBeans: 250000, multiplierText: '1~10倍', color: 'from-amber-600 to-orange-800' },
    ],
    rulePoints: [
      '每人发5张手牌，任意3张相加为10的整数倍即为「有牛」，其余2张相加取个位数决定牛几。',
      '支持1~4倍自由叫庄，抢庄倍数最高者当庄；无人抢庄系统随机指定。',
      '闲家下注后与庄家逐一拼点比大小，输赢按对应牌型倍数全场通算。',
    ],
    handRanks: [
      { name: '五小牛', multiplier: '10倍', desc: '5张牌均<5且总和<=10' },
      { name: '四炸', multiplier: '8倍', desc: '4张同点数牌' },
      { name: '五花牛', multiplier: '5倍', desc: '5张牌均为J/Q/K' },
      { name: '牛牛', multiplier: '4倍', desc: '前3张为10倍数，后2张也为10倍数' },
      { name: '牛七~牛九', multiplier: '2~3倍', desc: '后2张点数和为7~9点' },
    ],
  },
  zhajinhua: {
    id: 'zhajinhua',
    title: '经典炸金花',
    subtitle: '心理博弈 · 闷牌到底 · 孤注一掷',
    badge: '极速刺激',
    onlineCount: 8240,
    heroImg: '/assets/hall/hero-zhajinhua.png',
    heroImgFallback: '/assets/hall/hero-zhajinhua.svg',
    accentGradient: 'from-purple-600 via-indigo-700 to-amber-700',
    borderColor: 'border-purple-400/40',
    tiers: [
      { id: 't1', name: '平民场', baseScore: 100, minBeans: 2000, multiplierText: '顶注 2,000', color: 'from-emerald-600 to-teal-800' },
      { id: 't2', name: '精英场', baseScore: 500, minBeans: 10000, multiplierText: '顶注 10,000', color: 'from-blue-600 to-indigo-800' },
      { id: 't3', name: '豪客场', baseScore: 2000, minBeans: 50000, multiplierText: '顶注 40,000', color: 'from-purple-600 to-violet-800' },
      { id: 't4', name: '巅峰场', baseScore: 10000, minBeans: 250000, multiplierText: '顶注 200,000', color: 'from-amber-600 to-orange-800' },
    ],
    rulePoints: [
      '每人发3张暗牌，牌型大小依次为：豹子 > 顺金 > 金花 > 顺子 > 对子 > 单张。',
      '核心心理机制：未看牌前可选择「闷牌」，下注筹码仅为明牌的一半，压制对手。',
      '轮到行动可弃牌、跟注、加注或发起火拼比牌；特殊规则下不同花色「235」克制任何豹子。',
    ],
    handRanks: [
      { name: '豹子', multiplier: '至尊大牌', desc: '三张同点牌(如AAA/KKK)' },
      { name: '顺金', multiplier: '极高倍数', desc: '同花顺(如黑桃Q-K-A)' },
      { name: '金花', multiplier: '高阶牌型', desc: '同花色非连牌' },
      { name: '顺子', multiplier: '普通进阶', desc: '非同花连牌' },
      { name: '235逆袭', multiplier: '绝地翻盘', desc: '特殊克制一切豹子' },
    ],
  },
  laoyancai: {
    id: 'laoyancai',
    title: '滇西捞腌菜',
    subtitle: '滇西南民间最具人气的特色比点扑克',
    badge: '民俗特色',
    onlineCount: 1445,
    heroImg: '/assets/hall/hero-laoyancai.png',
    heroImgFallback: '/assets/hall/hero-laoyancai.png',
    accentGradient: 'from-purple-600 via-indigo-700 to-slate-800',
    borderColor: 'border-purple-400/40',
    tiers: [
      { id: 't1', name: '普洱小馆', baseScore: 100, minBeans: 2000, multiplierText: '1~3倍', color: 'from-emerald-600 to-teal-800' },
      { id: 't2', name: '茶马古道', baseScore: 500, minBeans: 10000, multiplierText: '1~5倍', color: 'from-blue-600 to-indigo-800' },
    ],
    rulePoints: [
      '首轮发2张底牌比点数个位数，点小可捞第3张腌菜，三条3爆坛翻倍。',
    ],
    handRanks: [
      { name: '三条3', multiplier: '爆坛满贯', desc: '独家通吃翻最高倍' },
      { name: '天九', multiplier: '9点天然大牌', desc: '首轮起手两张9点' },
    ],
  },
  shuangko: {
    id: 'shuangko',
    title: '千变双扣',
    subtitle: '2v2 默契配合 · 千变双扣火拼大炸弹',
    badge: '多人对战',
    onlineCount: 2826,
    heroImg: '/assets/hall/hero-shuangko.png',
    heroImgFallback: '/assets/hall/hero-shuangko.png',
    accentGradient: 'from-orange-600 via-rose-700 to-amber-800',
    borderColor: 'border-orange-400/40',
    tiers: [
      { id: 't1', name: '娱乐场', baseScore: 100, minBeans: 2000, multiplierText: '双扣4倍', color: 'from-emerald-600 to-teal-800' },
      { id: 't2', name: '排位场', baseScore: 500, minBeans: 10000, multiplierText: '连炸翻倍', color: 'from-blue-600 to-indigo-800' },
    ],
    rulePoints: [
      '两副牌108张，同队配合包揽第一、二名即为「双扣」翻4倍。',
    ],
    handRanks: [
      { name: '天王炸', multiplier: '8倍', desc: '4张大小王同出' },
      { name: '八相连炸', multiplier: '6倍', desc: '八张连续炸弹' },
    ],
  },
  sihepai: {
    id: 'sihepai',
    title: '传统四合牌',
    subtitle: '敬请期待 · 传统四门花色组合竞技',
    badge: '敬请期待',
    onlineCount: 1395,
    heroImg: '/assets/hall/hero-sihepai.png',
    heroImgFallback: '/assets/hall/hero-sihepai.png',
    accentGradient: 'from-blue-600 via-indigo-700 to-slate-800',
    borderColor: 'border-blue-400/40',
    tiers: [
      { id: 't1', name: '敬请期待', baseScore: 100, minBeans: 2000, multiplierText: '即将开放', color: 'from-slate-600 to-slate-800' },
    ],
    rulePoints: [
      '融合纸牌四合凑坎精髓，即将开放，敬请期待。',
    ],
    handRanks: [],
  },
};

export interface GamePreviewModalProps {
  gameKey: GameKey;
  myBeans: number;
  onClose: () => void;
  onQuickStart: (gameKey: GameKey, baseScore: number) => void;
}

export const GamePreviewModal: React.FC<GamePreviewModalProps> = ({
  gameKey,
  myBeans,
  onClose,
  onQuickStart,
}) => {
  const meta = GAME_DETAILS[gameKey];
  const [selectedTier, setSelectedTier] = useState<GameTierInfo>(meta.tiers[0]);
  const [activeTab, setActiveTab] = useState<'tiers' | 'rules'>('tiers');

  const handleStart = (tier: GameTierInfo) => {
    soundEngine.playCardPlace(true);
    hapticEngine.playCard();
    onQuickStart(gameKey, tier.baseScore);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Dark Blur Overlay */}
      <div
        onClick={() => {
          soundEngine.playTap(480);
          onClose();
        }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Container */}
      <div
        className={`relative flex flex-col w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] rounded-3xl border-2 ${meta.borderColor} bg-gradient-to-b from-[#1c1310] via-[#140c09] to-[#0c0705] shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden text-white z-10`}
      >
        {/* Header Hero Banner */}
        <div className={`relative flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-r ${meta.accentGradient} border-b border-white/10 shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 flex items-center justify-center">
              <img
                src={meta.heroImg}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = meta.heroImgFallback;
                }}
                alt={meta.title}
                className="h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] pointer-events-none"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-black text-amber-300 drop-shadow">
                  {meta.title}
                </h3>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-400/40">
                  {meta.badge}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/80 line-clamp-1 mt-0.5">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(520);
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 active:scale-95 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-white/10 bg-black/30 px-4 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(640);
              setActiveTab('tiers');
            }}
            className={`flex items-center gap-1.5 pb-2 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'tiers'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-white/60 hover:text-white/90'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>场次选择</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playTap(640);
              setActiveTab('rules');
            }}
            className={`flex items-center gap-1.5 pb-2 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-white/60 hover:text-white/90'
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>玩法与倍数</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {activeTab === 'tiers' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {meta.tiers.map((t) => {
                const isSelected = selectedTier.id === t.id;
                const canAfford = myBeans >= t.minBeans;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      soundEngine.playTap(720);
                      hapticEngine.selectCard();
                      setSelectedTier(t);
                    }}
                    className={`relative flex flex-col justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-gradient-to-br from-amber-950/70 to-black/80 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-[1.01]'
                        : 'border-white/10 bg-black/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-black text-amber-200">
                        {t.name}
                      </span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 border border-amber-400/30">
                        {t.multiplierText}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between text-xs">
                      <span className="text-white/60">底分: {t.baseScore}</span>
                      <span className={canAfford ? 'text-amber-300 font-mono font-bold' : 'text-rose-400 font-mono'}>
                        准入: {t.minBeans.toLocaleString()} 豆
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 text-xs text-white/85">
              {/* Rules Points */}
              <div className="rounded-2xl bg-black/40 p-3 border border-white/10 space-y-1.5">
                <span className="font-bold text-amber-300 text-[11px] block mb-1">
                  核心规则机制
                </span>
                {meta.rulePoints.map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <p className="leading-relaxed text-white/80">{r}</p>
                  </div>
                ))}
              </div>

              {/* Hand Ranks Table */}
              {meta.handRanks.length > 0 && (
                <div className="rounded-2xl bg-black/40 p-3 border border-white/10">
                  <span className="font-bold text-amber-300 text-[11px] block mb-2">
                    牌型倍数参考
                  </span>
                  <div className="divide-y divide-white/10">
                    {meta.handRanks.map((hr, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-white/95">{hr.name}</span>
                          <span className="text-[10px] text-white/50">{hr.desc}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400 shrink-0">
                          {hr.multiplier}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-black/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-white/60">当前金豆:</span>
            <span className="font-mono font-black text-amber-300">
              {myBeans.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleStart(selectedTier)}
            className="flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-2 font-display text-xs sm:text-sm font-black text-[#18181B] shadow-[0_4px_16px_rgba(251,191,36,0.6)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>进入 {selectedTier.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
