---
SECTION_ID: docs.zhajinhua.zhajinhua_req
TYPE: note
---

# 炸金花 (Zha Jin Hua) — Requirements

Scope: hall entry, room lifecycle, betting rules, hand ranking, bots, UI.
Rules reference: `meta/facts/zjh_rules.md`.

| ID | Requirement | Code | Test |
|----|-------------|------|------|
| R1 | Hand ranking: triple > straight flush > flush > straight > pair > high card; A high, A-2-3 lowest straight, no wrap (Q-K-2 not a straight); suits never break ties | `algorithms/ZjhLogic.ts` `evaluateHand/compareHands` | TC1-TC5, TC17 (22100-hand census) |
| R2 | Special mode: mixed-suit 2-3-5 beats triple, loses to everything else | `compareHands(mode)` | TC6 |
| R3 | Blind call = 1x stake, seen call = 2x; compare costs 2x call; raise levels 2/5/10x | `callCost/compareCost/raiseOptions` | TC7 |
| R4 | Compare allowed from round 2 or when heads-up; tie => initiator loses | `canCompareNow`, `Room.resolveCompare` | TC8 |
| R5 | Showdown with side pots; chips conserved; odd chip to the seat closest after dealer; no all-in => winner takes all | `resolveShowdown` | TC9-TC13 |
| R6 | Server authoritative: hidden cards never sent to other viewers; looking is not a turn action; out-of-turn actions rejected | `Room.buildSnapshot/visibleCards` | TC14, TC15 |
| R7 | Beans conserved every hand, never negative; short stack is forced all-in then showdown | `Room.settle` | TC16, TC18 |
| R8 | 18 s turn timer: timeout => fold; 2 consecutive timeouts => trusteeship (bot plays); client can cancel | `Room.onTurnTimeout`, `c2s_zjh_ready` | TC19 |
| R9 | Leaving mid-hand folds and forfeits chips in the pot; room closes when no humans remain | `Room.removePlayer/destroy` | TC20 |
| R10 | Bots use only public info + own cards (hand percentile + personality) | `ZjhBotEngine` | TC16 (full hands) |
| R11 | Shuffle via `crypto.randomInt` Fisher-Yates | `Room.shuffle` | - |
| R12 | Hall: card 4 opens ZJH hall (2 modes x 4 tiers), quick start picks highest affordable tier | `ZjhArenaGrid`, `HallView`, `App` | manual (browser) |
| R13 | Table uses `AutoLandscapeContainer` (contain-fit, no rotate prompt, no stretch); card art reused from `/assets/ddz/cards` | `ZhajinhuaTableView` | manual (browser) |

Tests: `npx tsx --test tests/zhajinhua/*.ts` (logic 18 + room 7).
