---
SECTION_ID: plans.ddz_screen_algo_fix
TYPE: note
---

# 斗地主 / 屏幕适配 全面修复计划

状态标记: [ ] 待办, [x] 完成

## 服务端 (server/games/ddz)
- [x] P1 DdzRoom: call/grab/double 先校验再清计时器（防拖时间）
- [x] P2 StateMachine: 重发牌立即进入 DEALING 阶段; Room 重发定时器可追踪/可清除
- [x] P3 DdzRoom: 超时处理 — 叫/抢超时=不叫/不抢, 加倍超时=不加倍, 出牌超时进入托管; 重连重置计时器
- [x] P4 DdzRoom: 结算守恒(零和)/断线玩家释放座位/托管玩家自动 ready
- [x] P5 DdzRules: identifyPatternFor / identifyAllPatterns 多解释，StateMachine 使用
- [x] P6 DdzRules: wouldBreak* 端点判断修正; 赖子飞机最多 6 连
- [x] P7 Bot: 对手剩 1 张取最大单张; 提示/机器人走法经 identify+canBeat 过滤
- [x] P8 测试 tests/ddz/ddz_server_test.ts (9 项)

## 前端
- [x] F1 DdzTableView 舞台缩放改为 min(宽适配, 高适配) + 安全区居中
- [x] F2 DdzTableView: 每帧 getComputedStyle 改为每 4 帧; 尺寸未变不 setState; orientationchange 延迟复测
- [x] F4 AutoLandscapeContainer: stageScale 取 min、安全区、setState 去重、orientationchange 延迟
- [x] F3 DDZ 竖屏虚拟横屏: 已做。DdzTableView = AutoLandscapeContainer + DdzTableStage；移除 RotatePrompt（App.tsx）；覆写 Pixi events.mapPositionToPoint 反推 90/270° 旋转坐标；实测竖屏点牌选中正确（两个轴向都验证）
- [x] 仅手机/触屏(宽<768 或 pointer:coarse)竖屏才虚拟旋转；桌面高窗口只做等比 contain-fit（不旋转、不提示、不拉伸）

## 未做 / 需 PO 决策（规则类）
- [ ] 炸弹倍数是否区分软/硬/纯赖子炸 (S2)
- [ ] 加倍规则：全局乘 vs 两两加倍 (S3)
- [ ] dealHands 取 2~3 次发牌中强度差最小者（隐性偏置）+ 无种子不可复盘 (A5)
- [ ] 记牌器对所有人免费 (S5)
- [x] 浏览器实测已做（Chromium 窗口，无控制台错误）：DDZ 784x821 / 844x398 / 390x852 竖屏(提示+继续) / 1024x768 / 2560x1080；牛牛(超宽 + 竖屏虚拟旋转)、麻将(超宽) 回归正常；超时进入托管、重开窗口重连恢复牌桌均正常
- [ ] 未实测：真实刘海屏安全区(env inset 在桌面浏览器恒为 0)、iOS orientationchange、触摸选牌、DDZ 竖屏虚拟横屏(F3)
