---
SECTION_ID: facts.how_to_run_tests
TYPE: note
---

# 如何运行测试 / 类型检查

- 无自定义用户命令；通过 ToolRunUserCommand 直接执行（需权限）。
- 类型检查: `npx tsc --noEmit`（tsconfig 无 include，会检查 server/ src/ tests/，非 strict）。
- 斗地主服务端测试: `npx tsx --test tests/ddz/ddz_server_test.ts`（node:test，9 项）。
- 斗地主规则关键入口: `DdzRules.identifyPatternFor(cards, wildRanks, target)`（多解释，出牌校验用它）、`identifyAllPatterns`。
- 横屏适配规则: 不弹“请旋转”提示。手机/触屏竖屏 => AutoLandscapeContainer 虚拟旋转(rotationDeg 90/270)；Pixi 的 mapPositionToPoint 在 DdzTableView 中按旋转角度覆写；其他情况统一 contain-fit 等比缩放。新增 Pixi 游戏接入旋转时必须同样覆写指针映射。
- 浏览器测试: 工具里 tab 模式会沿用旧窗口尺寸，要换尺寸用 mode=window + wanted_size + 新 browser id；Pixi 画布点击可用 dispatchEvent(new PointerEvent('pointerdown'...)) 模拟。
- 前端缩放: DdzTableView 用 `computeFitScale` (contain-fit) + `src/shared/utils/safeArea.ts`；AutoLandscapeContainer 同样 contain-fit。
