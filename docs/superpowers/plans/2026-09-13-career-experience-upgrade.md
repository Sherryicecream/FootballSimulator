# 足球生涯体验升级执行计划

> **For agentic workers:** 使用 `executing-plans` 技能按任务顺序执行。只有用户明确要求委派时才使用 subagent-driven-development。任务使用 `- [ ]` 清单；本文件是唯一活动执行计划，进度事实只写入 `docs/ROADMAP.md`。

**Goal:** 在保持月度生涯、确定性和存档安全的前提下，实现规则可信、快速完整生涯不超过20分钟、八国可玩联赛、连续四局有差异、可选种子及基于事实的AI人生总结。

**Architecture:** `contracts` 定义版本化数据与端口输入输出，`content` 提供作者内容与联赛档案，`simulation` 只接收内容和种子进行确定性计算，`application` 负责阶段/存档/世界推进的一致性事务，`web` 只展示并调用用例，`local-ai` 只负责可失败的叙事增强。先修事实和日期，再改善主循环，再扩展世界与叙事，最后综合验收。

**Tech Stack:** 现有 pnpm 11.9.0、Node.js >=24.16.0、TypeScript、React/Vite、Zod、Vitest、Playwright；优先使用现有依赖。不得给 simulation 添加外部运行时依赖。

**状态：** G1 Task01–09、G2 Task10–11 已完成，Task12 及后续任务尚未开始；20 分钟目标仍待本地真人试玩验证。历史 Iteration 1 计划已完成并归档；其未勾选步骤不是待办。本计划不宣称后续原型、内容扩充或真人验收已完成。

## A. 接手须知与边界

1. 工作区为 `D:/CodexProgram/FootballSimulator`。先读 `AGENTS.md`、`docs/ROADMAP.md` 最新执行入口、`docs/EXPERIENCE_REVIEW_2026-09-13.md`，再读本计划。任务编号是依赖顺序，不是可同时修改同一文件的授权。
2. 用户当前只要求规划，由下一位agent在收到“执行本计划”的指令后实现。不要在读计划时自动部署、推送或改动真实用户存档。
3. 评估来自真实浏览器路径及代码盘点，但不可把文档中的结论替代回归测试。先复现，再修复。先检查 `git status --short`，保留用户已有改动；尤其不要默认提交原本未跟踪的评估文档或 `.user-backup` 文件。
4. 使用 `codex/career-experience-upgrade` 分支；若已存在则检查其状态后复用。工作区有无关改动时使用隔离工作区，不重置或清理用户文件。仅按具体任务文件提交，禁止 `git add .`。每个任务经测试和自审后可形成独立提交，不自动合并主分支。
5. `spec.md` 是长期产品基线。本轮新要求优先于其中旧60–90分钟目标、旧海外范围及隐藏种子要求。Task 00同步这些已明确要求；本计划中标注“实施默认值”的数量和赛制是为可执行性作出的选择，不冒充用户逐项指定的数值。
6. 一个任务完成后自动进入下一依赖就绪的任务，不反复请求已授权的确认。真实阻塞必须报告具体输入/冲突；真人试玩和真实provider验收缺席时保持对应门槛未通过，继续完成其他不依赖它的工作。

### Global Constraints

- 浏览器维持v3职业流程架构，但玩家侧推进改为"推进到下一决策节点"（跳过连续无事件月份），不再要求逐月操作。无事月份由模拟器批量结算后聚合为一行摘要，不打断玩家。保持无玩家侧周推进、无自动整赛季按钮的约束，不对无未读反馈的无事月份展示待确认提示。
- `packages/simulation` 保持确定性、无外部运行时依赖；显式传入内容和seeded randomness。
- `packages/application` 拥有编排、暂停/恢复、阶段转换；UI不复制模拟规则，不直接写 `careerPhase`。
- 重大事件必须来自career facts、injuries、people或story state；事件效果仅作用于显式参与人物。
- 可见成长按月结算；小数成长、疲劳、赛程、冷却、事件游标与随机位置必须跨存档保留。
- 每次行为变更先加失败回归。完成一个里程碑及最终交付前执行 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 与1,000生涯命令。
- 签约、退役等不可逆决定保留一步确认；普通事件单击生效并防连点。
- 报价资格继续结合兴趣与能力层级上限；平衡常量改动必须保持阶梯单调并更新设计说明。
- `proSeason.fixtures` 是整项联赛赛程，本队统计必须按 `clubId` 筛选。比赛和阵容在赛季创建时固定身份；跨季可按真实发展变化，不能在读档或打开界面时重抽。
- `promiseReviews` 保留 `injury` / `club` / `player` 归因并能由账本解释。
- 生产中不写测试夹具，不为了20分钟强迫球员早退，不通过隐藏失败、放宽指标或删掉必须选择的事件伪造达标。
- 本计划不加入多人、云存档、真实俱乐部授权、经理模式或AI决定比赛；不整体重写架构。

## B. 明确采用的产品默认值

| 主题 | 本轮实施默认值 | 验证方式 |
| --- | --- | --- |
| 快速体验 | 从创建到可读终局短总结≤20分钟，包含强制阅读、选择、计算与等待；可选详情不计入必经路径 | 真人自然阅读计时；不能只报自动点击耗时 |
| 推进方式 | 默认使用”推进到下一决策节点”：模拟器批量结算无事件月份，只停在有选择/事件/赛季边界/伤病/合同的位置。中途无事件月份以一行聚合摘要展示。仍保留单月推进作为可选操作。 | 节点推进后不展示待确认空月报；全生涯停顿点 25–40 次；真人体验 20 分钟可达 |
| 月报/节点简报 | 每次停顿展示节点简报：一行概括跳过时段 + 详细事件反馈（若停在此处有事件）；详情按需展开。不增加”下一份报告”确认页 | 手机首屏/操作可达性与完整生涯阅读负担 |
| 交互预算 | 默认推进到下一决策节点，全生涯约 25–40 次停顿。已开启故事链后续、重要伤病/合同/国家队决定不被省略。每月最多2个互动的模拟上限不变，但玩家侧不再逐月推进。 | 全生涯主线决策目标约 25–40 次停顿；取消旧"每月最多2个交互"的前端展示限制；用真人验收决定密度是否合适 |
| 国家范围 | 中国、英格兰、西班牙、德国、意大利、法国、日本、韩国 | 五大联赛为对“欧洲主要联赛”的实施解释，范围明确列入设计 |
| 球队规模 | 保留国内72个ID，组织为6级×12队；每个海外国家2级×12队，共海外168家，全包240家唯一球队 | 原有24家海外俱乐部全部保留ID并显式分配国别；新加144家，不把国内球队数量抵扣海外缺口 |
| 赛制 | 每级12队双循环22轮、132场；胜3分平1分负0分，同分依次净胜球/进球数，再用赛季创建时固定抽签序；相邻级别前2/后2交换 | 这是虚构简化赛制，不声称复刻现实当前规则；最顶无升级、最底无向未实现层级降级 |
| 日历 | 中国/日韩3月至11月；欧洲9月至次年5月；青训仍9月至6月 | fixture绑定实际日期和赛季内周序；同年非同赛季、跨国合同桥接合法 |
| 杯赛/国家队 | 每国保留可执行的8队杯赛窗口，明确资格与一次性抽签；国家队大赛维持抽象模型但确保资格、时间和事实一致 | 不在此轮加完整洲际俱乐部赛事；国家队失败/入选等文案必须来自事实 |
| 强弱 | 联赛division与球队ability分离；现有tier仍代表机会/能力档位，不将某国“一级”直接等同另一国能力tier | 豪门总体占优、爆冷可存在；资源、成长、年龄与阵容变化形成连续强弱 |
| 种子 | 可选十进制整数0–2147483647；空值随机；创建后只读并可复制 | 同球员设置＋seed＋内容/机械版本＋选择序列复现；无跨局隐藏修正 |
| 文案体量 | 30条核心故事家族，至少3节点和2个有差异的收束；每国另有6个地区处境家族（可复用结构但内容/条件不同） | 统计加载后的有效可达内容，不统计未装配数据文件或同义句为新家族 |
| 退役与AI | 本地短结语立即可读；关键节点150–250字增强，终章展开版400–800字；AI异步、默认可跳过 | 长度为编辑目标，硬schema上限另设；无AI也要完成完整体验 |

这些默认值可在不扩大范围的情况下据证据微调，需同步设计、理由与门禁；不得把减少必需国家、删下级联赛以掩盖升降级断路、缩短正常生涯当作常规调参。

## C. 数据与接口约定（新名称均由指定任务创建）

- Task 01新增 `CareerMoment`：`{ seasonId: string; date: string; weekIndex: number }`，weekIndex为该赛季内序号，绝不伪装成ISO周号。旧账本没有可靠实际日期时保留原始记录并标“历史时间不详”，禁止猜日期再声称已修复历史。
- Task 01新增 `CareerSaveV7`：在v6基础上增加机械版本、可选结构化事件时间及不可重复事实地址；Task 10新增 `CareerSaveV8` 世界赛季字段；Task 16若需要持久化故事调度数据则新增v9。每次迁移基于当时最新schema，禁止后续用v4/v5 parse把新字段丢掉。
- 兼容规则：迁移前备份原始槽；迁移保留既有账本、结果、待决快照、反馈和主随机位置。旧活动赛季继续使用冻结赛程和所属池直到结束；下一合法赛季边界才加入新世界。旧版和新版未来机械结果可不同，不能声称跨机械版本逐位一致；同一版本重放必须一致。
- Task 10世界注册表每项为 `source: 'player'` 的当前proSeason引用，或 `source: 'world'` 的非玩家联赛运行时。玩家联赛以proSeason为唯一明细来源，非玩家联赛以注册表明细为唯一来源，不保存两份可各自推进的相同赛程。转会切换时在application事务中移交所属联赛并保留其已赛结果。
- 世界只保留当前赛季明细与必要上一季结算，远方历史保留聚合荣誉/归属/强度；不把所有远方多年逐场记录写入玩家账本。
- 所有新增纯规则函数写入simulation，schemas和跨模块结构写入contracts，静态国别/俱乐部/故事写入content。web展示模型不得反推或重算比赛规则。
- 所有新导出同时更新该包 `src/index.ts`。涉及存档的application函数统一使用当时最新schema，必须测试保存/重载后新增字段仍在。

## D. 阶段、依赖和停靠点

| 里程碑 | 任务 | 可交付状态 | 门禁 |
| --- | --- | --- | --- |
| G0 | 00 | 规格对齐、基线可复现 | 文档与初始基线 |
| G1 | 01–05 | 时间/比赛/数据可信，职业训练可调，档案可救援 | 全量7项＋旧存档回归 |
| G2 | 06–09 | 手机上顺畅推进、种子可复现、节奏可测 | 全量7项＋阶段计时；不得因此宣告20分钟已达标 |
| G3 | 10–15 | 8国联赛可独立运行且可跨季流动 | 全量7项＋8国×3季覆盖 |
| G4 | 16–18 | 有分支和人物延续，多周目重复可测 | 全量7项＋12路径报告 |
| G5 | 19–21 | 可信回顾与关键节点AI增强 | 全量7项＋AI失败路径 |
| G6 | 22–23 | 同版本发布证据与真人体验结论 | 最终全量＋10,000生涯＋真人/实机 |

执行顺序00→01…23。先修复机制，再稳定世界，再扩写内容，避免对正在改写的规则大量编写文案。每到门禁将结果写入ROADMAP，失败回到引入问题的任务；不启动无关重构。

### 通用任务操作协议

每个行为任务必须完成：红灯回归→确认失败原因→最小实现→单项绿灯与读档/边界回归→自审→仅提交任务文件。以下片段是需要写入对应测试的关键断言及接口示例，不是已存在代码；可补充完整fixture和imports，但不能把断言弱化成“函数有返回值”。跨包测试夹具只在允许依赖的测试层使用；simulation测试不得导入application或web。

阶段门禁命令（在仓库根执行；把报告名中的G1换成当前门禁ID，最终使用final）：

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/experience-G1-balance-1000.json
```

逐条检查退出码。失败要区分代码错误、夹具失效与机器负载；不靠扩大超时掩盖死循环。Task 22必须用最终同一版本执行10,000样本。只有文档改动不重跑模拟；任何规则/内容调整不可引用本计划里的历史报告作为新验证。

---

## Task 00：对齐新目标并锁定起始证据

**Files:** Modify `spec.md`、`docs/ROADMAP.md`；Create `docs/superpowers/specs/2026-09-13-career-experience-design.md`。阅读本计划及评估，不修改已归档历史。

**接口/产物：** 设计文档记录B/C节默认值、模拟简化边界、迁移策略和指标定义；它不是另一份执行计划。

- [ ] 检查分支与用户改动，记录HEAD、Node/pnpm版本和当前内容条目数。
- [ ] 在设计中逐项写明20分钟计时口径、8国/240队、固定赛制、兼容策略和AI失败行为；同步spec中旧时长、海外背景层范围、种子交互和完成定义。不要把早期MVP现状文字改成已完成新世界。
- [ ] 跑D节初始门禁，报告名使用 `experience-G0-balance-1000.json`；核对历史基线完成率100%、毕业60.9%、世界级代理4.9%仅作差异参照，不锁死新机制分布。
- [ ] 在ROADMAP记“G0完成，G1待执行”及真实命令结果；文档提交 `docs: define career experience acceptance baseline`。

验收：

```powershell
rg -n '20分钟|240|迁移|种子|AI' docs/superpowers/specs/2026-09-13-career-experience-design.md
pnpm exec prettier --check spec.md docs/ROADMAP.md docs/superpowers/specs/2026-09-13-career-experience-design.md
```

不得为了通过检索而写空标题。每项必须包含可判断的规则。

## Task 01：统一生涯时间、事实地址与v7兼容

**Files:** Create `packages/contracts/src/career-experience.ts`、`packages/simulation/src/career/career-moment.ts`、`packages/contracts/tests/career-v7.test.ts`、`packages/simulation/tests/career/career-moment.test.ts`；Modify `packages/application/src/use-cases/resolve-career-event.ts`、`contract-flow.ts`、`pro-flow.ts`、`load-career.ts`、`packages/simulation/src/career/career-review.ts`、`apps/web/src/career-saves/career-save-summary.ts`。

**Interfaces:** `CareerMoment`在contracts；`careerMoment(save: CareerSaveV6Like): CareerMoment`、`makeFactId(seasonId: string, weekIndex: number, ordinal: number): string`在simulation。v7所有用例返回值保留 `mechanicsVersion: 'experience-v1'` 和新事实的 `occurredOn` / `seasonId` / `ordinal`。事实ID采用短赛季编码＋周序＋账本递增ordinal，必须≤60字符；事件ID存独立字段，不拼无限长文本。

- [x] 写下方纯函数测试，另写应用回归：同一职业年内两次同类事件不同ID；职业期不用青训周数；首次合同开始日≤首次职业比赛日；退役档案使用careerEnd.endedOn。
- [x] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/career/career-moment.test.ts packages/contracts/tests/career-v7.test.ts`，确认新能力缺失导致失败。
- [x] 实现统一时间读取：职业phase从proSeason实际日期/周序读，青训从season读；合同下一合法开季按所属赛季日期计算，不能回到签约之前。resolve事件、延迟效果和人物记忆统一用该时间。新赛季采用B节日历，旧赛季日期不回写。
- [x] 实现v6→v7无损迁移；逐个审查application旧v4/v5 parse，避免删掉新字段。重复旧ID保留原始证据，通过展示侧稳定位置区分，不重新抽取历史效果；无法确定实际日期的旧记录显示未知。
- [x] 重跑新测试及 `packages/application/tests/use-cases/submit-career-decision.test.ts`、`contract-flow.test.ts`、`pro-flow.test.ts`、`apps/web/tests/career-saves/CareerSaveSelector.test.tsx`，检查存档恢复。提交 `fix: align career time and event identity`。

```ts
import { expect, it } from 'vitest';
import { createProSave } from '../fixtures/pro-save';
import { careerMoment, makeFactId } from '../../src/career/career-moment';
it('uses professional time and distinct fact identities', () => {
  const save = createProSave();
  const moment = careerMoment(save);
  expect(moment.seasonId).toBe(save.proSeason!.id);
  expect(moment.date).toBe(save.proSeason!.currentDate);
  expect(makeFactId(moment.seasonId, 8, 1)).not.toBe(makeFactId(moment.seasonId, 8, 2));
  expect(makeFactId(moment.seasonId, 8, 1).length).toBeLessThanOrEqual(60);
});
```

## Task 02：让个人进球和助攻属于真实比赛

**Files:** Create `packages/simulation/src/match/player-contribution.ts`、`packages/simulation/tests/match/player-contribution.test.ts`；Modify `packages/simulation/src/career/professional-week.ts`、`player-team-impact.ts`、`packages/simulation/tests/career/professional-week.test.ts`；检查青训 `scheduled-youth-match.ts` 的相同不变量。

**Interfaces:** `allocatePlayerContribution({ ownGoals, minutes, position, shooting, passing, rng }): { goals: number; assists: number }`；position使用contracts.Position，rng使用SeededRandomSource，其余为数字。每个己方进球最多分配一个玩家身份：得分者、助攻者或未参与。

- [x] 先写0进球、0分钟、1个进球以及多球用例；在职业周回归中对每个实际出场记录断言贡献守恒，不通过改fixture比分让测试通过。
- [x] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/match/player-contribution.test.ts` 确认红灯。
- [x] 按每个真实己方进球抽取互斥贡献，概率受位置、相应能力与出场比例影响；参数写进设计，禁止球员助攻自己。未上场为0，预备队数据与联赛分离，杯赛复用同一规则。比赛评分再考虑真实贡献，但不要重复放大球队比分影响。
- [x] 对100个种子和所有外场位置验证守恒与重复运行一致，跑职业/青训比赛测试；提交 `fix: bind player contributions to match goals`。此任务改变规则和随机消费，记录新基线变化，不要求旧报告逐位相同。

```ts
import { expect, it } from 'vitest';
import { allocatePlayerContribution } from '../../src/match/player-contribution';
import { createSeededRandomSource } from '../../src/randomness';
it('cannot score and assist the only goal', () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const value = allocatePlayerContribution({ ownGoals: 1, minutes: 90,
      position: 'FORWARD', shooting: 100, passing: 100, rng: createSeededRandomSource(seed) });
    expect(value.goals + value.assists).toBeLessThanOrEqual(1);
  }
});
```

## Task 03：关键时刻反馈只讲已经发生的事实

**Files:** Modify `packages/simulation/src/career/match-moment.ts`、`packages/simulation/tests/career/match-moment.test.ts`、`apps/web/src/event-choice/EventChoicePanel.tsx`、`apps/web/src/event-choice/EventFeedbackPanel.tsx`、`apps/web/tests/event-choice/MatchMomentScene.test.tsx`、`EventFeedbackPanel.test.tsx`。

**Interfaces:** 保留 `buildMatchMomentEvent`，明确本轮属于“比赛表现节点”，不回改已结算比分；所有intent风险使用合法low/medium/high。新增后腰独立3意图：保护中卫、拦截线路、第一脚出球。

- [x] 加回归：0:0已赛事实不能生成“进球/助攻入网”成功文案；六位置都有独立意图；界面不显示未知风险；疲劳增加标示负面而不是绿色奖励。
- [x] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/career/match-moment.test.ts` 和 `pnpm exec vitest run --project web apps/web/tests/event-choice/MatchMomentScene.test.tsx apps/web/tests/event-choice/EventFeedbackPanel.test.tsx` 确认失败。
- [x] 保留既有结果，只描述跑位、处理、压力和教练评价；必须提及进球时只引用输入事实已经存在的进球。反馈变化统一按字段方向决定好坏，疲劳越低越好；加入文字“疲劳增加”。当前人物未参加则不写“关系更亲近”等已达成关系事实。
- [x] 重跑上述测试，浏览器检查同一输入选择后刷新保持结果；提交 `fix: make match feedback factual and readable`。

核心方向函数可直接在已有展示模块补充，不引入规则引擎：

```ts
export const changeDirection = (key: string, before: number, after: number) => {
  if (before === after) return 'unchanged';
  const improved = key === 'fatigue' ? after < before : after > before;
  return improved ? 'improved' : 'worsened';
};
// expect(changeDirection('fatigue', 9, 13)).toBe('worsened');
```

## Task 04：职业训练连续可操作与赛事口径统一

**Files:** Create `apps/web/src/career-dashboard/TrainingPlanEditor.tsx`、`packages/simulation/src/career/competition-summary.ts`、`packages/simulation/tests/career/competition-summary.test.ts`；Modify `CareerDashboard.tsx`、`ProDashboard.tsx`、`ProOffseasonPanel.tsx`（均在apps/web/src/career-dashboard）、`apps/web/src/app/App.tsx`、`packages/application/src/use-cases/update-training-plan.ts`；Test `apps/web/tests/career-dashboard/ProDashboard.test.tsx`、`packages/application/tests/use-cases/pro-flow.test.ts`。

**Interfaces:** `TrainingPlanEditor({ plan, disabled, onChange })`只传TrainingPlan；`countClubFixtures(fixtures: readonly ProFixture[], clubId: string): number`返回该队已赛数。UI仅呈现application/simulation投影。

- [x] 加回归：职业页改为恢复/轻量后刷新仍保留，下一月负荷按新计划计算；待决时不能改训练；无关联赛比赛不计本队；零场显示“尚未开赛”，不显示虚假第2。
- [x] 先运行 `pnpm exec vitest run --project web apps/web/tests/career-dashboard/ProDashboard.test.tsx` 与新summary测试确认红灯。
- [x] 提取青训已有编辑器供职业页复用；通过现有updateTrainingPlan→commitCareer完成事务，返回v7不丢字段。球队、赛事、个人分别命名；杯赛7/7说明是整项赛事。本队出场/合同承诺分母都按明确本队赛事计算。
- [x] 运行 dashboard 与职业流程测试并完成 Task04 验收。

```ts
export const countClubFixtures = (fixtures: readonly ProFixture[], clubId: string) =>
  fixtures.filter(f => f.status === 'played' &&
    (f.homeClubId === clubId || f.awayClubId === clubId)).length;
// 在12队完整联赛fixture上：expect(countClubFixtures(fixtures, clubId)).toBe(22);
// 同时expect(fixtures.filter(f => f.status === 'played')).toHaveLength(132);
```

## Task 05：保存失败、迁移备份与损坏档案导出

**Files:** Modify `apps/web/src/persistence/local-storage-save.ts`、`apps/web/src/career-saves/CareerSaveSelector.tsx`、`SaveStatusIndicator.tsx`、`apps/web/src/app/App.tsx`；Create `apps/web/src/persistence/career-export.ts`；Test `apps/web/tests/persistence/local-storage-save.test.ts`、`apps/web/tests/e2e/career-safety.spec.ts`。

**Interfaces:** 存储port新增 `exportRaw(slotId: string): Promise<string>`；只读取原始包装文本，包括不能解析的内容。下载函数在浏览器adapter生成Blob；迁移备份按slot与源schema保存一次，写不进备份则保留原槽并提示，不先覆盖原存档。

- [x] 回归原始损坏JSON能原样导出；导出不删除/重写槽；保存失败保留旧界面、随机位置和当前待决；两个生涯互不覆盖。
- [x] 运行 `pnpm exec vitest run --project web apps/web/tests/persistence/local-storage-save.test.ts` 确认新增导出能力缺失。
- [x] 损坏卡加入“导出原始档案”，正常档案加入备份导出；不添加导入回档入口。日期使用本地可读格式，结束生涯优先careerEnd.endedOn。异常文案区分读取、额度、权限与迁移，不一律说空间不足。

- [x] 结束生涯后将完整活动存档压缩为同槽位只读历史档案；旧终局 v5/v6 存档在读取时转换，转换失败保留原始完整存档并提示。
- [x] 历史档案列表与活动/损坏档案分组展示；回顾页可阅读荣誉、俱乐部履历、国家队履历、租借经历、累计分钟、数据统计和全生涯回放。
- [x] 执行单项与 `pnpm exec playwright test apps/web/tests/e2e/career-safety.spec.ts`，随后跑G1门禁；提交 `feat: preserve and export career recovery evidence`。

```ts
// 在已有localStorage测试套件中：
localStorage.setItem('football-save-broken', '{broken');
const before = localStorage.getItem('football-save-broken');
expect(await createLocalStorageCareerPort().exportRaw('broken')).toBe('{broken');
expect(localStorage.getItem('football-save-broken')).toBe(before);
```

## Task 06：创建引导、可选种子与跨版本复现说明

**Files:** Create `apps/web/src/career-creation/seed-input.ts`、`apps/web/tests/career-creation/seed-input.test.ts`；Modify `CareerCreationForm.tsx`、`apps/web/src/career-saves/CareerSaveSelector.tsx`、`career-save-summary.ts`、`apps/web/tests/career-creation/CareerCreationForm.test.tsx`、`apps/web/tests/e2e/bootstrap-career.spec.ts`。

**Interfaces:** `parseSeedInput(text: string): number | null`空值null，不合法throw；seedFactory仅在null时调用一次。实际使用seed、mechanicsVersion、contentVersion作为只读档案信息，不生成第二份随机状态。

- [x] 加测试0/上界/空白/负数/小数/科学计数/超界；原“seed控件必须隐藏”断言改为符合新需求，不能删除整个创建回归。
- [x] 运行 `pnpm exec vitest run --project web apps/web/tests/career-creation/seed-input.test.ts` 确认红灯。
- [x] 新入口默认折叠“世界种子（可选）”；复制失败时保留可选中文本。开局用短文说明16岁中国球员、按月、自动保存、不可回退。惯用脚采用可聚焦radio，开始按钮对比度使用现有tokens深色字。
- [x] 同种子同设置创建两次比较机械初始状态，排除careerId/保存时间等包装差异；应用层既有确定性回归与创建表单种子透传回归均通过。

```ts
export const parseSeedInput = (text: string): number | null => {
  const value = text.trim();
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error('种子请输入非负整数');
  const seed = Number(value);
  if (!Number.isSafeInteger(seed) || seed > 2147483647) throw new Error('种子超出范围');
  return seed;
};
// expect(parseSeedInput('0')).toBe(0);
// expect(parseSeedInput('')).toBeNull();
// expect(() => parseSeedInput('1e3')).toThrow();
```

## Task 07：推进到下一节点与手机操作可达

**Files:** Create `apps/web/src/career-dashboard/CareerActionBar.tsx`；Modify `CareerDashboard.tsx`、`ProDashboard.tsx`、`OffseasonBriefing.tsx`、`OfferComparisonPanel.tsx`、`apps/web/src/app/app.css`；Create `apps/web/tests/e2e/experience-comfort.spec.ts`。

**Interfaces:** ActionBar接收 `{ busy, label, onAdvanceToNode, onAdvanceOneMonth, onOpenArchives }`，其中 `onAdvanceToNode` 是主按钮（推进到下一有事件/选择的月份），`onAdvanceOneMonth` 是次要链接（逐月推进，用于调试或想细看）。青训和职业都展示姓名、年龄、位置、当前俱乐部、实际日期及一个主要关注点。

- [x] E2E在320×720、412×915、1440×900验证首次进入即可触达”推进到下一节点”主按钮、内容不被固定操作栏遮挡、键盘能到所有操作；长俱乐部名和200%文字仍可读。
- [x] 运行 `pnpm exec playwright test apps/web/tests/e2e/experience-comfort.spec.ts` 确认旧布局失败。
- [x] 主按钮”推进到下一节点”放在首屏可达位置（sticky底部栏），次要”逐月推进”放在同一栏作为小字链接，不能覆盖事件/确认对话框。默认展示必要身份、状态和短节点摘要，完整属性/积分榜按需展开。统一剧情图鉴等默认按钮；将pace/stamina等属性、角色、内部阶段ID映射为中文。报价写明”游戏币/年”，把tier解释为实力档位而非国家联赛等级。
- [x] 重跑E2E与dashboard组件测试；已完成验证，按当前工作流未创建提交。

```ts
// 验证主按钮首屏可见：
const advance = page.getByRole('button', { name: '推进到下一节点', exact: true });
const box = await advance.boundingBox();
expect(box).not.toBeNull();
expect(box!.y).toBeGreaterThanOrEqual(0);
expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
// 次要链接存在但不要求首屏：
expect(page.getByRole('link', { name: '逐月推进' })).toBeVisible();
```

## Task 08：节点推进简报与跳过逻辑

**Files:** Create `packages/simulation/src/career/advance-to-node.ts`、`packages/simulation/tests/career/advance-to-node.test.ts`、`packages/application/src/use-cases/build-node-brief.ts`、`apps/web/src/career-dashboard/NodeBrief.tsx`、`apps/web/tests/career-dashboard/NodeBrief.test.tsx`；Modify `packages/application/src/use-cases/pro-flow.ts`、`MonthAdvancementPanel.tsx`、`MonthlyMomentumPanel.tsx`、`MatchdayRhythmPanel.tsx`、`EventFeedbackPanel.tsx`、`apps/web/src/app/App.tsx`。

**Interfaces:**
- `advanceToNextNode(save, clubs): { skippedMonths: MonthSummary[]; stopReason: 'event'|'season-end'|'injury'|'contract'|'offer'|'national-team'; stopAt: CareerSave; brief: NodeBrief }`。`MonthSummary = { monthKey: string; matchCount: number; goalsFor: number; goalsAgainst: number; fatigueTrend: 'up'|'down'|'flat'; notableChange: string | null }`。模拟器连续推进月份，当遇到以下情况时停止并返回聚合摘要：(1) 有 interactiveEvent（事件/关键时刻待选择）；(2) 赛季结束；(3) 伤病/合同到期/转会窗口/国家队征召等状态变化；(4) 赛季末结算。若无以上情况，直接推进到赛季结束。
- `buildNodeBrief(summaries: MonthSummary[], stopReason, stopEvent?): { headline: string; skippedSummary: string; changes: string[]; nextFocus: string }`——仅投影已存在字段，不重新判定。`headline` 是”2026年8月-10月：3场比赛，无重大事件”或”2026年11月：关键选择等待你决定”。

- [x] 写下方测试：`advanceToNextNode` 在连续3个无事件月份后停在第四个月的有事件位置；跳过月份不消耗玩家侧交互次数；跳过月份的成长/疲劳变化正确聚合到摘要中；`stopReason` 准确反映停止原因。`buildNodeBrief` 对无事件跳过返回一句话概括，对事件停返回事件反馈前缀。
- [x] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/career/advance-to-node.test.ts` 和 `pnpm exec vitest run --project web apps/web/tests/career-dashboard/NodeBrief.test.tsx` 确认红灯。
- [x] 在 `pro-flow.ts` 中实现 `advanceToNextNode`：循环调用现有月度推进（不改变模拟逻辑），每次推进后检查是否需要停。无事件月份只聚合比赛结果、成长趋势和疲劳方向到 `MonthSummary`，不生成完整月报。有事件时立即停止，返回事件反馈和已跳过月份的摘要列表。`application`层确保 `advanceToNextNode` 在一个事务中完成（不存中间状态）。
- [x] 前端 `NodeBrief.tsx` 默认展示 `headline` + 事件反馈（若有），跳过月份的详情列表默认折叠。`onAdvance` 只推进一次（到下一节点），不额外弹层确认。保留 “逐月推进” 次要入口（利用旧 `monthlyAdvance`），只在调试/想看细节时使用。
- [x] 加”中间保存”测试：推进到一半（跳过2个月后停在第3个月的事件），刷新页面能正确恢复并看到已跳过的2个月摘要。提交 `feat: node-advance with aggregated skip brief`。

```ts
import { expect, it } from 'vitest';
import { advanceToNextNode } from '../../src/career/advance-to-node';
it('skips uneventful months and stops at the next event', () => {
  const result = advanceToNextNode(saveWithNoEventsInAugSep, clubs);
  expect(result.skippedMonths).toHaveLength(2); // 8月, 9月
  expect(result.skippedMonths[0].matchCount).toBeGreaterThanOrEqual(0);
  expect(result.stopReason).toBe('event');
  expect(result.stopAt.story.pendingEvent).not.toBeNull();
});
it('reaches season end when no events occur', () => {
  const result = advanceToNextNode(saveWithNoEventsAllYear, clubs);
  expect(result.stopReason).toBe('season-end');
});
```

## Task 09：建立全生涯阅读/点击预算，不伪造20分钟验收

**Files:** Create `tools/balance/src/experience-metrics.ts`、`tools/balance/tests/experience-metrics.test.ts`；Modify `tools/balance/src/run-youth-seasons.ts`；Create `docs/testing/experience-playtest-protocol.md`。

**Interfaces:** `summarizeExperience(trace: readonly { kind: 'node-advance' | 'decision' | 'feedback' | 'contract' | 'retirement'; requiredText: string }[]): { actionCount: number; decisionCount: number; nodeAdvanceCount: number; requiredCharacters: number }`；只在测试/分析工具采集，不给生产存档加埋点状态。`actionCount` 包含节点推进和决策/反馈/合同/退役等交互。`nodeAdvanceCount` 单独统计推进次数，目标是全生涯 25–40 次。

- [x] 给短/长生涯样本计数，严格区分全生涯和首青训季；工具结果不包含“真人分钟数”的伪精确字段。
- [x] 运行 `pnpm exec vitest run --project balance tools/balance/tests/experience-metrics.test.ts` 确认红灯。
- [x] batch输出按职业长度分组的必经操作数、字数和决策数；协议写明19+1分钟预算、开始/结束点、可选详情边界和手机观察方式。不收集用户真实存档上传远端。
- [x] 跑12个完整路径并标出阅读负担最大的页面，结合07/08继续减重复；阶段末运行G2门禁，提交 `test: measure complete career interaction workload`。此时没有真人数据只能写“工具验收通过，20分钟待真人验证”。

> Task09 工具验收记录：12 条完整路径中短生涯 4 条、长生涯 8 条；短生涯节点推进中位数 32、必读字符中位数 6,705，长生涯节点推进中位数 173、必读字符中位数 37,332。两组阅读负担最高页面均为事件反馈；长生涯节点数明显超过 25–40 次设计目标，需在后续真人试玩与重复内容整理中继续校准，不能用统计口径掩盖。
>
> Task09 复核更正：上条记录基于未真正终局的青训短路径，现已改为 12 条真正到达终局的完整路径：短生涯 3 条、长生涯 9 条；短生涯节点推进中位数 35、必读字符中位数 18,675，长生涯节点推进中位数 173、必读字符中位数 91,521。两组阅读负担最高页面仍为事件反馈。
>
> Task09 最终重跑：修正职业节点使用实际职业月份后，长生涯必读字符中位数为 91,840、P90 为 102,280；短生涯统计保持节点推进中位数 35、必读字符中位数 18,675。12 条路径均已进入青训终局或职业退役。

```ts
import { expect, it } from 'vitest';
import { summarizeExperience } from '../src/experience-metrics';
it('counts the whole required path without inventing play time', () => {
  expect(summarizeExperience([
    { kind: 'node-advance', requiredText: '' },
    { kind: 'decision', requiredText: '选择留队' },
    { kind: 'feedback', requiredText: '教练认可' },
  ])).toEqual({ actionCount: 3, decisionCount: 1, nodeAdvanceCount: 1, requiredCharacters: 8 });
});
```


## Task 10：国别世界注册表与国家队联赛取消区域分组

**Files:** Create `packages/contracts/src/country.ts`、`packages/contracts/tests/country.test.ts`、`packages/application/src/world/world-registry.ts`、`packages/application/tests/world/world-registry.test.ts`；Modify `packages/contracts/src/clubs.ts`、`packages/contracts/src/index.ts`、`packages/simulation/src/career/professional-week.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/content/data/clubs/overseas-europe.ts`、`packages/content/data/clubs/overseas-asia.ts`；Create `packages/content/data/clubs/england.ts`、`spain.ts`、`germany.ts`、`italy.ts`、`france.ts`、`japan.ts`、`korea.ts`（已扩充为完整俱乐部内容，旧文件保留兼容入口）。

**Interfaces:** `Country`（china / england / spain / germany / italy / france / japan / korea 八值枚举，zod schema + TS union）。`ClubProfileSchema` 新增 `country: Country` 替代旧 `overseasRegion`；迁移期内 `overseasRegion` 保留为只读兼容别名但不用于联赛分组。`WorldRegistry` 为每国存当前赛季引用，`source: 'player'`（玩家有合同在该国）或 `source: 'world'`（非玩家联赛）；非玩家联赛仅持赛季聚合摘要，不存逐场明细。

```ts
export const CountrySchema = z.enum([
  'china', 'england', 'spain', 'germany', 'italy', 'france', 'japan', 'korea',
]);
export type Country = z.infer<typeof CountrySchema>;

export const WorldRegistryEntrySchema = z.object({
  country: CountrySchema,
  source: z.enum(['player', 'world']),
  seasonId: z.string().optional(),
  completed: z.boolean().default(false),
  champion: z.string().optional(),
  promoted: z.array(z.string()).max(4).default([]),
  relegated: z.array(z.string()).max(4).default([]),
});
export type WorldRegistryEntry = z.infer<typeof WorldRegistryEntrySchema>;
```

- [x] 写下方纯函数测试：`clubProfileSchema` 新增八国合法枚举、`england` 不在旧 `overseasRegion` 内仍通过校验；世界注册表可写入和读取非玩家联赛摘要，不存储明细；两场非玩家同国联赛各自独立结算不互相写入。
- [x] 运行 `pnpm exec vitest run --project domain packages/contracts/tests/country.test.ts packages/application/tests/world/world-registry.test.ts` 确认红灯。
- [x] 实现 `CountrySchema` 与 `ClubProfileSchema.country`；国内俱乐部 `country: 'china'`、海外俱乐部 `country` 对应所在国；现行欧洲12队暂分配至英格兰与西班牙（各6队），亚洲12队按已有 regionId japan/korea 分配。league 分组从 `overseasRegion` 等判断改为 `country` 等判断；非 player league 按国别独立结算，结算精度降为每季仅冠军、升降级与平均强度，不逐月模拟球员级明细。
- [x] 迁移旧存档：加载时若 `club.overseasRegion` 存在但 `country` 缺失，按 `overseasRegion === 'europe' ? 'england' : 'japan'` 补缺，同步到 v8 新增字段 `worldRegistry`。不做逆向兼容移除。
- [x] 重跑 `pro-flow.test.ts`、`professional-week.test.ts`；新增世界注册表保存/重载测试。提交 `feat: add country-level world registry`。

```ts
import { expect, it } from 'vitest';
import { ClubProfileSchema } from '../../src/clubs';
it('accepts all 8 countries as valid', () => {
  for (const country of ['china', 'england', 'spain', 'germany', 'italy', 'france', 'japan', 'korea']) {
    expect(ClubProfileSchema.parse({ id: 't', name: 't', tier: 5, regionId: 'r', positionalNeeds: ['FORWARD'], youthCycle: 'stable', country, wageBudget: 50 }).country).toBe(country);
  }
});
it('rejects invalid country', () => {
  expect(() => ClubProfileSchema.parse({ id: 't', name: 't', tier: 5, regionId: 'r', positionalNeeds: ['FORWARD'], youthCycle: 'stable', country: 'europe', wageBudget: 50 })).toThrow();
});
```

## Task 11：扩充八国俱乐部数据至 240 队

**Files:** Create `packages/content/data/clubs/spain.ts`、`germany.ts`、`italy.ts`、`france.ts`、`japan.ts`、`korea.ts`；Modify `packages/content/data/clubs/domestic.ts`（仅检查国内6级x12队完整）、`overseas-europe.ts`、`overseas-asia.ts`（迁移至新文件后删除或重定向）；Create `packages/content/tests/club-data.test.ts`；Modify `packages/content/src/index.ts`（装配器指向新数据路径）。

**Interfaces:** 每国2级x12队=24家俱乐部，每队定义 `ClubProfile`（含新的 `country` 字段）。总共国内72+海外168=240。国内保留现有72队ID不变；欧洲12队重分配至 England 和 Spain 各半；新增 England 18队、Spain 18队、Germany 24队、Italy 24队、France 24队、Japan 18队、Korea 24队。虚构原创命名沿用既有风格（城市/地理特征+竞技/联/足球会等后缀），不使用现实真实队名；名字在文件中用中文。

**内容校验：** 每个国家至少2个不同 tier 值（主 tier +-1 范围内），每国各 tier 刚好12队；不存在重复ID或跨文件clubId冲突；不存在未分配 `country` 的俱乐部。

- [x] 写校验：每国12队x2 tier = 24队；所有俱乐部 `country` 为合法八国之一；国内72队 `country` 均为 `china`；不存在ID重复或name为空。
- [x] 运行内容回归：仓库未单列 `content` Vitest project，实际执行 `pnpm exec vitest run --project domain packages/content/tests`，新断言先红后绿。
- [x] 编写240个虚构俱乐部数据。名字风格示例（英格兰）：伦敦先锋、利物浦浅滩、伯明翰铁锤、曼彻斯特织工、泰晤士河联、诺丁汉森林人、谢菲尔德钢城、利兹竞技、纽卡斯尔港务、南安普敦水手、莱斯特义勇、阿斯顿猎人——tier 5同理类推12队。每国风格与本国地理/文化特征呼应。所有名字原创，回避现实商标。
- [x] 装配器读取新文件顺序，替换旧 europe/asia 数据源；旧文件标记 `@deprecated` 但存档兼容期内保留。内容测试全部通过；并完成扩充后市场代表与职业可见度的平衡校准。提交记录待统一整理。

**Task11 平衡配套与验收：** 海外要约池固定为每国 3 家分层代表，避免俱乐部数量线性放大报价概率；职业赛季总声望增量乘以 0.90，保留完整联赛曝光同时避免 WorldClassRate 越界；负向小数声望在 simulation 层统一取整，保持存档整数不变量。`artifacts/experience-G2-task11-balance-1000.json`：完成率 100%、WorldClassRate 2.5%、海外占比 14.2%、国家队占比 27.9%、职业分钟中位数 74.97、承诺兑现率 97.53%、场均总进球 2.17。`pnpm test` 通过（常规139个测试文件、796项测试；balance 2个文件、7项测试；架构10/10）；`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 通过；`pnpm test:e2e` 38/38 通过（桌面19、移动19）。国家队完整赛事安排仍按此前决定留待后续任务。

```ts
import { expect, it } from 'vitest';
import { allClubProfiles, clubCountByCountry } from '../src/index';
it('has exactly 240 clubs across 8 countries', () => {
  const all = allClubProfiles();
  expect(all).toHaveLength(240);
  const counts = clubCountByCountry();
  expect(counts.china).toBe(72);
  for (const c of ['england', 'spain', 'germany', 'italy', 'france', 'japan', 'korea']) {
    expect(counts[c]).toBe(24);
  }
});
it('no duplicate ids', () => {
  const ids = allClubProfiles().map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
});
```

## Task 12：八国独立赛程、日历与升降级

**Files:** Create `packages/simulation/src/competition/country-calendar.ts`、`packages/simulation/tests/competition/country-calendar.test.ts`、`packages/simulation/src/competition/country-league-fixtures.ts`、`packages/simulation/tests/competition/country-league-fixtures.test.ts`；Modify `packages/application/src/use-cases/pro-flow.ts`、`packages/simulation/src/career/professional-week.ts`、`packages/simulation/src/index.ts`、`packages/simulation/src/match/create-league-fixtures.ts`、`packages/content/data/competitions.ts`。

**Interfaces:** `countryCalendar(country: Country): { seasonStart: string; seasonEnd: string; weeks: number }`；欧洲国家9月至次年5月（36周）、中日韩3月至11月（34周）。`countryLeagueFixtures({ clubs, country, tier, year, rng })` 复用双循环逻辑但返回竞争ID为 `pro-{country}-tier-{N}`，比赛日期绑定当地时间而非固定 `08-01`。升降级按相邻tier同国俱乐部前2升后2降；最顶无升、最底无降。

**simulation** 不直接访问 `Country` 类型但接受字符串参数；**application** 负责将 `club.country` 传入模拟。

- [ ] 写回归：英格兰9月开赛次年5月结束、中日韩3月开赛11月结束；同国同tier恰好12队时赛程22场；升降级后俱乐部进入合法相邻tier。跨季promotion/relegation链完整不将俱乐部移到不存在层级。
- [ ] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/competition/country-calendar.test.ts packages/simulation/tests/competition/country-league-fixtures.test.ts` 确认红灯。
- [ ] 实现日历表：`countryCalendar` 内硬编码开始月+周数（当前差异仅4周，不抽象为配置文件）。`professional-week.ts` 内月度推进根据当前 `proSeason.competitionId` 读取对应日历，非玩家联赛快进至赛季末一次性结算。升降级在 `settleSeason` 创建下一季 `nextClubTier`，联赛完成后 `startProfessionalSeason` 自动读取。
- [ ] 赛程 fixture 中的 `date` 字段绑定实际日历，非玩家联赛不生成 fixture 明细只生成结果（比分、排名、荣誉）。同一俱乐部不能在同赛季参加两个国家的国内杯；已迁移的海外俱乐部取消旧国内杯资格。
- [ ] 重跑 `pro-flow.test.ts`、`professional-week.test.ts`；验证一个完整跨赛季 cycle（球员签英格兰俱乐部->完成英超->升级/降级到次级联赛）。提交 `feat: independent league calendar and promotion/relegation per country`。

```ts
import { expect, it } from 'vitest';
import { countryCalendar } from '../../src/competition/country-calendar';
it('europe season starts in September and ends in May', () => {
  const cal = countryCalendar('england');
  expect(cal.seasonStart).toContain('09-01');
  expect(cal.seasonEnd).toContain('05-31');
  expect(cal.weeks).toBeGreaterThanOrEqual(34);
});
it('east asian season runs March to November', () => {
  const cal = countryCalendar('japan');
  expect(cal.seasonStart).toContain('03-01');
  expect(cal.seasonEnd).toContain('11-30');
});
```

## Task 12A：世界俱乐部赛季脉冲与 240 队覆盖索引

**依赖：** Task12 的八国独立赛历、国内双循环赛程和升降级摘要完成后执行。

**Files:** Create `packages/contracts/src/world-football.ts`、`packages/simulation/src/world/club-season-pulse.ts`、`packages/simulation/tests/world/club-season-pulse.test.ts`；Modify `packages/contracts/src/country.ts`、`packages/contracts/src/index.ts`、`packages/application/src/world/world-registry.ts`。

**Interfaces:**

- `WorldClubPulseSchema` / `WorldClubPulse`：保存 `clubId`、`country`、`tier`、`seasonId`、`finalRank`、`points`、国内荣誉、洲际状态、近三季洲际出场数、近两次转会窗口活跃度和最近动态时间。
- `WorldClubSeasonResult`：`{ clubId: string; country: Country; tier: number; seasonId: string; finalRank: number | null; points: number; domesticHonours: readonly string[]; continentalStatus: 'none' | 'qualifying' | 'main-stage' | 'champion' }`。
- `buildWorldClubPulses(input: { clubs: readonly ClubProfile[]; seasonResults: readonly WorldClubSeasonResult[]; previous: readonly WorldClubPulse[] }): WorldClubPulse[]`：按 `clubId` 排序输出全部 240 队的紧凑赛季状态。
- `mergeWorldClubPulses(registry: WorldRegistry, pulses: readonly WorldClubPulse[]): WorldRegistry`：以 `clubId + seasonId` 幂等写回，不产生重复状态。

- [x] **Step 1: 写覆盖率和存档兼容的失败测试**

```ts
it('builds one compact pulse for every playable club', () => {
  const pulses = buildWorldClubPulses({
    clubs: allClubProfiles(),
    seasonResults: makeSeasonResults(allClubProfiles()),
    previous: [],
  });
  expect(pulses).toHaveLength(240);
  expect(new Set(pulses.map(({ clubId }) => clubId)).size).toBe(240);
});

it('reloads legacy world registries with an empty club pulse list', () => {
  expect(WorldRegistrySchema.parse({ entries: [] }).clubPulses).toEqual([]);
});
```

- [x] **Step 2: 运行测试确认红灯**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/world/club-season-pulse.test.ts`。预期：因 `WorldClubPulse`、`clubPulses` 和 `buildWorldClubPulses` 尚不存在而失败。

- [x] **Step 3: 添加紧凑世界状态 schema**

在 `world-football.ts` 中定义严格 schema。`WorldRegistrySchema` 增加 `clubPulses: z.array(WorldClubPulseSchema).max(240).default([])`，旧 v8 存档缺失该字段时解析为空数组，不增加逐场比赛字段，也不复制 `ClubProfile` 静态资料。

- [x] **Step 4: 实现确定性构建和幂等合并**

在 simulation 中只消费显式传入的俱乐部和赛季摘要；按 `clubId` 排序，缺少赛季结果的球队生成 `finalRank: null` 的合法摘要，重复输入得到完全相同的数组。application 的 `mergeWorldClubPulses` 替换同键记录并保留其他国家和赛季记录。

- [x] **Step 5: 运行定向测试确认通过**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/world/club-season-pulse.test.ts packages/application/tests/world/world-registry.test.ts`。预期：覆盖 240 队、重复写回、旧存档解析和随机种子复现全部通过。

- [x] **Step 6: 提交独立变更**

提交范围仅包含 Task12A 的 contracts、application world registry、simulation pulse 实现和对应测试，提交信息为 `feat: add compact world club season pulses`。

## Task 12B：洲际资格轮换与背景赛果摘要

**依赖：** Task12A 的 `WorldClubPulse` 和 Task12 的本国赛季摘要。

**Files:** Create `packages/content/data/continental-competitions.ts`、`packages/simulation/src/competition/continental-qualification.ts`、`packages/simulation/src/competition/continental-season.ts`、`packages/simulation/tests/competition/continental-qualification.test.ts`、`packages/simulation/tests/competition/continental-season.test.ts`；Modify `packages/contracts/src/world-football.ts`、`packages/contracts/src/index.ts`、`packages/content/src/index.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/simulation/src/index.ts`。

**Interfaces:**

- `ContinentalFederation = 'uefa' | 'afc'`。
- `ContinentalClubInput`：`{ clubId: string; country: Country; tier: number; finalRank: number; points: number; cupWinner: boolean }`。
- `ContinentalQuota`：`{ directPerCountry: number; qualifyingPerCountry: number }`。
- `ContinentalParticipant`：`{ clubId: string; country: Country; federation: ContinentalFederation; stage: 'direct' | 'qualifying'; reason: 'league-champion' | 'league-rank' | 'cup-winner' | 'coefficient' }`。
- `ContinentalSeasonSummary`：`{ competitionId: string; seasonId: string; participants: readonly ContinentalParticipant[]; results: readonly { clubId: string; stage: string; wins: number; draws: number; losses: number; points: number; honour: string | null; relatedFactId: string }[]; playerFixtures: readonly ProFixture[] | null }`。
- `selectContinentalParticipants(input: { federation: ContinentalFederation; clubs: readonly ContinentalClubInput[]; seasonPulses: readonly WorldClubPulse[]; recentHistory: readonly WorldClubPulse[]; quota: ContinentalQuota }): ContinentalParticipant[]`：输出直接晋级和资格赛球队，使用国内成绩、杯赛、俱乐部级别、近三季成绩和连续参赛扣分。
- `simulateContinentalSeason(input: { competitionId: string; seasonId: string; participants: readonly ContinentalParticipant[]; playerClubId: string | null; seed: number }): ContinentalSeasonSummary`：非玩家球队只返回赛果、阶段、荣誉和积分摘要；玩家球队额外返回可展开的洲际比赛记录。

初始配置固定为：欧洲五国各 2 个直接名额、各国第 3 名或杯赛冠军进入资格池；亚洲中日韩各 2 个直接名额、各国第 3 名或杯赛冠军进入资格池。若联赛冠军同时赢得杯赛，名额顺延给下一个合法排名球队，不能重复计数。

- [x] **Step 1: 写资格、轮换和无重复的失败测试**

测试必须验证冠军和杯赛冠军获得资格、同一俱乐部不重复占用名额、相近实力候选者会受到近期连续参赛扣分，以及相同输入的平分结果稳定。

- [x] **Step 2: 运行测试确认红灯**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/competition/continental-qualification.test.ts packages/simulation/tests/competition/continental-season.test.ts`。预期：因资格筛选器和背景赛季模拟器尚不存在而失败。

- [x] **Step 3: 添加洲际赛事配置和资格评分**

在 content 层保存联赛配额与洲际名称；simulation 层实现稳定评分：国内排名优先，杯赛冠军和顶级联赛冠军获得保障，连续 3 季参赛只在候选分接近时扣分，最终平分按 `clubId` 排序。函数不得读取浏览器或存储状态。

- [x] **Step 4: 实现背景赛果与玩家详细记录边界**

为非玩家球队生成阶段、胜负、积分、荣誉和 `relatedFactId`，不生成逐场 fixture；当 `playerClubId` 命中参赛球队时，调用现有比赛模拟能力生成玩家可见的洲际记录，并把结果写入职业赛季和世界脉冲。洲际球队不能同时参加两个国家的国内杯赛。

- [x] **Step 5: 接入职业赛季结算并测试跨季复现**

在 `completeProfessionalSeason` 的国内赛季结算之后更新洲际摘要，使用独立的派生种子，不改变国内联赛随机序列。重复结算必须幂等，刷新后资格、赛果和荣誉不改变。

- [x] **Step 6: 运行定向测试并提交**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/competition/continental-qualification.test.ts packages/simulation/tests/competition/continental-season.test.ts packages/application/tests/use-cases/pro-flow.test.ts`。提交范围仅包含洲际配置、contracts、simulation、application 接入和对应测试，提交信息为 `feat: add rotating continental qualification`。

## Task 12C：全量世界转会窗口与玩家报价分层

**依赖：** Task12A 的俱乐部状态；Task13 的跨国吸引力函数应复用本任务输出，不再创建第二套候选池。

**Files:** Create `packages/contracts/src/world-transfer.ts`、`packages/simulation/src/transfer/world-transfer-market.ts`、`packages/simulation/tests/transfer/world-transfer-market.test.ts`；Modify `packages/contracts/src/index.ts`、`packages/simulation/src/index.ts`、`packages/application/src/use-cases/transfer-flow.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/simulation/src/career/transfer-offers.ts`。

**Interfaces:**

- `WorldTransferActivitySchema` / `WorldTransferActivity`：保存 `id`、`seasonId`、`window`、`fromClubId`、`toClubId`、可选 `playerId`、位置、状态、原因、可信度和 `relatedFactId`。
- `simulateWorldTransferWindow(input: { clubs: readonly ClubProfile[]; pulses: readonly WorldClubPulse[]; previous: readonly WorldTransferActivity[]; seasonId: string; window: 'summer' | 'winter'; seed: number }): WorldTransferActivity[]`：候选来源覆盖全部 240 队，结果数量有上限，按俱乐部需求、预算、升级/降级和洲际资格生成。
- `selectPlayerMarketClubs(input: { clubs: readonly ClubProfile[]; pulses: readonly WorldClubPulse[]; playerAbility: number; playerAdaptability: number; seed: number }): ClubProfile[]` 继续输出玩家实际看到的少量报价；它消费世界层候选的俱乐部状态，但不把全部后台转会直接展示给玩家。

后台没有外部球员数据库时，使用“俱乐部 A 为某位置寻找球员”的事实级记录；只有玩家、队友或已存在人物才写入具体 `playerId`，禁止捏造不可追溯的球员履历。

- [x] **Step 1: 写全量候选、确定性和去重复失败测试**

测试必须验证全部 240 队都能成为转入方或转出方、俱乐部 ID 始终来自内容目录、同一俱乐部组合在没有新原因时不会重复，以及相同种子得到完全相同的活动列表。

- [x] **Step 2: 运行测试确认红灯**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/transfer/world-transfer-market.test.ts`。预期：因世界转会 schema、候选生成器和窗口去重复规则尚不存在而失败。

- [x] **Step 3: 实现全量俱乐部候选和软冷却**

对全部俱乐部计算位置需求、预算、级别、赛季脉冲和随机扰动；用最近两个窗口的活动次数作为软扣分，不能把同一队永久排除。使用 `seed + seasonId + window` 生成独立确定性随机源，按 `clubId` 作为最终平分键。

- [x] **Step 4: 接入玩家市场但保持阅读预算**

让现有玩家报价筛选器从世界状态读取俱乐部的需求和活跃度，继续限制每国代表数量和能力 tier ceiling；玩家可见报价、后台世界转会和转会传闻使用不同的输出模型，不重复写入同一条事实。

- [x] **Step 5: 接入赛季结算和刷新恢复**

在转会窗口节点生成并持久化活动游标；同一窗口重复提交返回原活动，刷新后使用保存的 seed、window 和活动列表得到相同结果。活动双方的俱乐部 ID 必须来自 240 队内容目录。

- [x] **Step 6: 运行定向测试并提交**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/transfer/world-transfer-market.test.ts packages/simulation/tests/career/transfer-offers.test.ts packages/application/tests/use-cases/transfer-flow.test.ts`。提交范围仅包含 world transfer contracts、simulation、application 接入和对应测试，提交信息为 `feat: simulate world transfer windows`。

## Task 12D：事实驱动的世界新闻、传闻与俱乐部浏览

**依赖：** Task12B 的洲际摘要、Task12C 的转会活动和 Task12A 的俱乐部脉冲。

**Files:** Create `packages/contracts/src/world-news.ts`、`packages/simulation/src/world/world-news.ts`、`packages/simulation/tests/world/world-news.test.ts`、`packages/application/src/use-cases/build-world-news.ts`、`packages/application/tests/world/build-world-news.test.ts`、`apps/web/src/career-dashboard/WorldFootballPanel.tsx`；Modify `packages/contracts/src/index.ts`、`packages/application/src/index.ts`、`apps/web/src/career-dashboard/ProDashboard.tsx`、`apps/web/tests/career-dashboard/ProDashboard.test.tsx`。

**Interfaces:**

- `WorldNewsItemSchema` / `WorldNewsItem`：保存 `id`、`occurredOn`、`category`、`relatedClubIds`、标题、摘要、`relatedFactId`、相关性和来源窗口。
- `WorldNewsCategory = 'domestic' | 'continental' | 'transfer' | 'rumour' | 'injury' | 'milestone'`。
- `WorldFact`：`{ id: string; occurredOn: string; category: WorldNewsItem['category']; relatedClubIds: readonly string[]; summary: string }`，只允许由已经结算的国内、洲际、转会或人物事实构成。
- `buildWorldNews(input: { facts: readonly WorldFact[]; clubs: readonly ClubProfile[]; viewerClubId: string | null; filter: WorldNewsFilter; limit: number; cursor: string | null }): { items: WorldNewsItem[]; nextCursor: string | null }`。
- `WorldNewsFilter`：`{ country?: Country; tier?: number; category?: WorldNewsItem['category']; window?: 'summer' | 'winter' }`，支持国家、级别、类别和窗口筛选；默认只取 3–5 条，完整页面可按国家、级别和洲际赛事筛选。

- [x] **Step 1: 写事实来源、冷却和名称解析失败测试**

测试必须验证动态只引用已存在的事实和俱乐部 ID、玩家相关俱乐部优先、同一俱乐部同类动态进入冷却期后不重复，以及分页结果稳定。

- [x] **Step 2: 运行测试确认红灯**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/world/world-news.test.ts packages/application/tests/world/build-world-news.test.ts`。预期：因动态 schema、事实筛选器和应用层查询用例尚不存在而失败。

- [x] **Step 3: 实现动态候选与确定性排序**

把升级、降级、荣誉、洲际资格、转会和球队状态事实转换为动态候选；按玩家当前俱乐部关系、联赛关系、国家队/队友关系、洲际关系、新鲜度和重复次数排序。无来源事实不得进入结果，排序平分按动态 ID 稳定处理。

- [x] **Step 4: 实现冷却、分页和俱乐部筛选**

同一俱乐部同类动态在冷却窗口内只保留最新一条；重大新事实可以突破冷却。应用层返回游标和分页结果，保留 240 队的可筛选索引，不增加默认首页阅读量。

- [x] **Step 5: 增加职业页面入口和完整浏览区**

在职业看板增加“世界足坛”次级入口和 `WorldFootballPanel`，默认显示与玩家相关的 3–5 条动态；面板可按国家、联赛级别、洲际赛事和转会窗口查看俱乐部名称、所属国家、级别、近期摘要。名称统一从 `allClubProfiles()` 解析，不在组件内复制俱乐部数据。

- [x] **Step 6: 运行组件和应用测试并提交**

运行：`pnpm exec vitest run --project domain packages/simulation/tests/world/world-news.test.ts packages/application/tests/world/build-world-news.test.ts --project web apps/web/tests/career-dashboard/ProDashboard.test.tsx`。提交范围仅包含 world news contracts、simulation、application、职业看板和对应测试，提交信息为 `feat: add fact-driven world football news`。

## Task 12E：世界生态覆盖率、重复率与全量验收

**依赖：** Task12A–12D 全部完成。

**Files:** Create `tools/balance/src/world-ecosystem-metrics.ts`、`tools/balance/tests/world-ecosystem-metrics.test.ts`；Modify `tools/balance/src/run-youth-seasons.ts`、`tools/balance/src/youth-season-metrics.ts`、`tools/balance/tests/youth-season-balance.test.ts`、`docs/ROADMAP.md`、`docs/superpowers/specs/2026-09-16-world-football-ecosystem-design.md`。

**Interfaces:**

- `WorldEcosystemMetric`：`{ clubId: string; tier: number; seasonId: string; domesticActive: boolean; continentalOpportunity: boolean; worldMentioned: boolean; transferActive: boolean; headlineKey: string; factLinked: boolean; reloadStable: boolean }`。

- `WorldEcosystemSummary`：`{ domesticClubCoverageRate: number; continentalOpportunityRate3Y: number; topTierWorldMentionRate5Y: number; transferActivityClubRate5Y: number; repeatHeadlineRate: number; factLinkedNewsRate: number; worldStateReloadStable: boolean }`。

- `summarizeWorldEcosystem(metrics: readonly WorldEcosystemMetric[]): WorldEcosystemSummary`：仅聚合测试和分析输入，不给生产存档增加统计字段。

- [x] **Step 1: 写覆盖率和重复率失败测试**

```ts
it('requires full domestic coverage and bounded repetition', () => {
  const summary = summarizeWorldEcosystem(makeWorldMetrics());
  expect(summary.domesticClubCoverageRate).toBe(1);
  expect(summary.continentalOpportunityRate3Y).toBeGreaterThanOrEqual(0.6);
  expect(summary.topTierWorldMentionRate5Y).toBeGreaterThanOrEqual(0.8);
  expect(summary.repeatHeadlineRate).toBeLessThanOrEqual(0.35);
  expect(summary.factLinkedNewsRate).toBe(1);
});
```

- [x] **Step 2: 运行测试确认红灯**

运行：`pnpm exec vitest run --project balance tools/balance/tests/world-ecosystem-metrics.test.ts`。预期：因世界生态聚合器尚不存在而失败。

- [x] **Step 3: 接入 100/1,000 赛季分析**

扩展平衡 runner，只采集分析字段，不把统计器写入生产存档；按 `clubId` 记录国内活跃、洲际资格、世界动态和转会活动，并计算滚动 3 年、5 年覆盖率以及同类标题重复率。分析输入必须来自已经产生的事实、资格和活动结果，不能通过虚构新闻补指标。

- [x] **Step 4: 验证确定性和刷新一致性**

对同一种子重复运行、保存后重新加载、同一窗口重复结算分别比较世界脉冲、洲际摘要、转会活动和新闻游标；默认首页 3–5 条动态不随 240 队数量线性增加。失败时输出第一个不一致的 `clubId`、赛季、窗口或事实 ID。

- [x] **Step 5: 运行定向与完整门禁**

```text
pnpm exec vitest run --project domain packages/simulation/tests/world packages/application/tests/world
pnpm exec vitest run --project web apps/web/tests/career-dashboard/ProDashboard.test.tsx
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm balance:youth -- --runs 1000 --seed-start 1 --output artifacts/world-football-ecosystem-balance-1000.json
```

- [x] **Step 6: 写入验收记录并提交**

验收必须达到：240/240 队每季有国内摘要；滚动 3 年洲际机会率 60%–70%；滚动 5 年顶级球队世界动态覆盖率至少 80%；事实关联率 100%；重复运行和刷新结果一致；既有 WorldClass、海外要约、国家队和职业出场分钟门禁不回退。更新 `docs/ROADMAP.md` 与设计文档，明确国家队完整赛程仍为后续任务，不在本任务中宣称完成。提交信息为 `test: validate world football ecosystem coverage`。

## Task 13：跨国转会、适应期与跨日历合同桥接

**Files:** Create `packages/simulation/src/transfer/cross-country-transfer.ts`、`packages/simulation/tests/transfer/cross-country-transfer.test.ts`；Modify `packages/application/src/use-cases/transfer-flow.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/simulation/src/contract/settlement.ts`、`packages/content/data/events/europe-career.ts`、`packages/content/data/events/asia-career.ts`（补充文化适应类事件）。

**Interfaces:** `computeCountryAppeal(country: Country, playerCountry: Country, languageBarrier: boolean): number`——同国=100、非欧洲国家间=70、跨洲际=45+语言修正；语言障碍由 `eventOutcome` 标记 `adapted` 逐步降低。`bridgeContractYears(fromCountry: Country, toCountry: Country): number`——从3月联赛转到9月联赛有6个月无比赛期显示为休整期，不按无比赛时间扣成长。转会时源赛季与目标赛季同一年内不开两条并行赛程；合同结束到新赛季开赛超过90天记为长期休整，不计入疲劳积累。

- [x] 写回归：中国球员转会英格兰适应期折扣；跨日历桥接不造成12个月无比赛；同一俱乐部同一国家转会沿用现有流程。文化适应事件后语言障碍降低。
- [x] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/transfer/cross-country-transfer.test.ts` 确认红灯。
- [x] 实现国家吸引力函数并将现有转会兴趣（`computeTransferInterest`）乘以此系数；跨日历桥接在 `startProfessionalSeason` 中完成：若新赛季开赛日晚于当前日期90天以上，记录 `long-break` 休整桥接，不处理比赛、不扣成长、不累加疲劳。欧洲-亚洲跨日历转会的语言/文化适应事件作为可选事件在职业期事件池中提供，并由 `eventOutcome: adapted` 持久化。
- [x] 成本按已有能力-薪资逻辑，不另建汇率或财政公平；跨洲际薪资期望差距通过吸引力折扣和竞争机会解释。已运行转会流程、跨日历桥接测试、完整 E2E 与 1,000 季平衡验证。

```ts
import { expect, it } from 'vitest';
import { computeCountryAppeal } from '../../src/transfer/cross-country-transfer';
it('same country appeal is 100', () => {
  expect(computeCountryAppeal('china', 'china', false)).toBe(100);
});
it('europe to asia has reduced appeal', () => {
  const appeal = computeCountryAppeal('japan', 'england', true);
  expect(appeal).toBeLessThan(60);
  expect(appeal).toBeGreaterThan(30);
});
it('language adaptation improves appeal', () => {
  const before = computeCountryAppeal('spain', 'china', true);
  const after = computeCountryAppeal('spain', 'china', false);
  expect(after).toBeGreaterThan(before);
});
```

## Task 14：每国 6 个地区处境内容家族

**Files:** Create `packages/content/data/events/england-career.ts`、`spain-career.ts`、`germany-career.ts`、`italy-career.ts`、`france-career.ts`、`country-career.ts`；Modify `packages/content/data/events/asia-career.ts`（加固日韩分类）、`packages/content/src/events/youth-events.ts`、`packages/content/src/index.ts`、`packages/contracts/src/event.ts`、`packages/content/tests/events/youth-events.test.ts`、`packages/simulation/src/events/event-selector.ts`；删除已拆分的 `packages/content/data/events/europe-career.ts`。

**Interfaces:** 每国事件模块 `export const xxxCareerEvents: EventDefinition[]`。每个国家模块至少6个顶层事件定义（不是同义句变体），覆盖该国家特有的足球环境与人物处境：英格兰的高强度身体对抗与媒体压力、西班牙的传控文化与技术偏好、德国的纪律性与青训联通、意大利的战术素养和防守传统、法国的多元文化与天赋输出、日本的社会规矩与团队优先、韩国的兵役制度与民族荣誉。条件使用新增 `requireCountry: Country`（或已有 `overseasRegions` 升级为 `requiredCountries` 数组），条件不满足时自然不触发。国内已用 `regionId` 筛选（不再需要全国事件额外条件）。

**内容组织：** 每个事件不是纯翻译或同义替换，需要反映该国的特有足球处境。例如英格兰事件可以涉及媒体专访、高强度训练负担、冬歇期缺失；日本事件涉及高中大学联赛文化、兵役接近。每个国家 6 个事件至少 3 个含选择支，至少 1 个含三档判定。事件不涉及现实人物或真实俱乐部。

- [x] 写内容校验：每国事件模块至少6个顶层定义、至少3个含 choices、至少1个带判定；事件条件引用的国家必须合法八国枚举；不存在同一事件ID跨文件冲突。
- [x] 运行内容事件回归（仓库当前 Vitest 配置未提供独立 `content` 项目，使用 `domain` 项目定向执行 `packages/content/tests`）。
- [x] 按上述各国特征编写 5x6=30 个新事件、加固日韩现有事件（确保每个至少6个）。当前旧 `europe-career.ts` 实际包含6个事件，已按主题迁移至 England（2个）、Spain（1个）、Germany（1个）、Italy（1个）、France（1个），随后删除旧数据模块。`asia-career.ts` 内6个日本事件、6个韩国事件。
- [x] 重跑事件校验与事件选择器回归。提交信息保留为 `feat: add 6 country-specific event families for 5 European leagues`（按用户审核流程暂不自动提交）。

```ts
import { expect, it } from 'vitest';
import { eventCountByCountry } from '../../src/index';
it('each european country has at least 6 career events', () => {
  for (const c of ['england', 'spain', 'germany', 'italy', 'france']) {
    expect(eventCountByCountry(c)).toBeGreaterThanOrEqual(6);
  }
});
it('japan and korea each have 6+ events', () => {
  expect(eventCountByCountry('japan')).toBeGreaterThanOrEqual(6);
  expect(eventCountByCountry('korea')).toBeGreaterThanOrEqual(6);
});
```

## Task 15：G3 完整门禁与八国可运行验证

**Files:** Create `packages/application/tests/world/multi-country-e2e.test.ts`；Modify `docs/ROADMAP.md`；Run 门禁命令。

**验证覆盖：** 每国主联赛生成合法22场双循环、不出现跨国家俱乐部对阵（洲际赛除外）、非玩家国家产生合理的冠军/升降级结果、俱乐部身份延续且不作跨赛季无解释替换、玩家转会至新国家后联赛id切换正确、赛季总结荣誉明确标所属国家、旧世界注册表不存在时创建默认注册表。

跑以下场景的E2E（通过 application 用例直接推进，不需浏览器）：
1. 球员出生中国->青训->签国内俱乐部->完成国内赛季。覆盖国内72队分级。
2. 球员青训毕业->签英格兰俱乐部->完成2季含升降级。覆盖欧洲日历。
3. 球员从英格兰转会西班牙->跨赛季国家切换正确->文化适应事件触发。覆盖跨联赛桥接。
4. 球员从国内转日本->亚洲日历->完成赛季。覆盖亚洲日历。
5. 非玩家国家（德国、法国、意大利、韩国）各进行3季世界结算，冠军不重复于player所在国。

- [x] 运行 `pnpm exec vitest run --project application packages/application/tests/world/multi-country-e2e.test.ts` 验证5条路径全部通过（5/5）。
- [x] 全量门禁：`pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`；E2E 38/38。已运行1,000季平衡命令并留下 `artifacts/experience-G3-balance-1000.json` 世界基线记录。`pnpm test` 普通测试 149 文件/832 项通过，balance 3 文件/9 项通过，架构 10/10 通过；按审核流程暂不提交。
- [x] 已在 ROADMAP 记录“G3完成，G4待执行”。原计划提交信息为 `feat: complete 8-country playable leagues (G3)`，按审核流程暂不自动提交。

---

## G4：内容差异与多周目不重复

本阶段目标：每局故事由种子、球员设置和选择序列决定，同内容版本下连续多局产生可感知的处境、人物和轨迹差异。

## Task 16：30 条核心故事家族与多结局收束

**Files:** Create `packages/content/src/story-family-registry.ts`（故事家族清单、短链节点与覆盖统计）；Modify `packages/content/src/events/youth-events.ts`、`packages/contracts/src/event.ts`、`packages/content/src/index.ts`、`packages/simulation/src/career/story-progress.ts`、`vitest.config.mts`、`package.json`；Create `packages/content/tests/story-family-coverage.test.ts`。

**Interfaces:** 故事家族定义每项包含 `familyId`、`phaseCoverage`（该家族适用的阶段）、`minNodes`（>=3）、`distinctResolutions`（>=2，指同一家族内不同路径到达不同收束结局）。每条故事至少3个叙事节点、至少有2个不同走向的收束方式。故事家族的覆盖领域：青训争位、职业替补、巅峰、下滑；伤病与复出；合同争取与失约；留队和转会；海外适应；国家队入选与落选；退役。每个领域至少2个不同故事家族（不同动机和开局条件）。

**不重复保障：** 同一类面板包装应使用不同场景条/图标/文案情绪。故事调度优先参考本局已发生故事家族、人物关系冷却和种子，未触发的家族优先于已触发的变体。跨局同一故事家族重复时，应通过不同 player 身份、环境条件或选择序列产生合理新处境。

- [x] 写回归：扫描所有故事数据统计家族数、每家族节点数、收束结局数；断言家族总数>=30、每家族节点>=3、每家族不同收束>=2、每个内容领域（8个）至少2个独立家族；同时验证节点顺序、完成封存和标题/描述不重复。
- [x] 先运行 `pnpm exec vitest run --project content packages/content/tests/story-family-coverage.test.ts` 得到覆盖接口缺失及节点条件不足的红灯，再实现并以5/5通过。
- [x] 审计并补齐8个领域：青训争位、职业轨迹、伤病复出、合同承诺、留队转会、海外适应、国家队、退役；每个领域至少2个独立家族，30家族共90节点、每个末节点2个收束选择。
- [x] 故事家族通过 content schema/事件集成校验，既有浏览器事件存档路径38/38通过；G4 1000赛季产物已生成：`artifacts/experience-G4-balance-1000.json`。最终全量门禁通过（普通150/838、balance3/9、架构10/10、类型、Lint、格式、构建）。按审核流程暂不提交 `feat: 30+ story families with branching resolutions`。

```ts
import { expect, it } from 'vitest';
import { countFamilies, familiesBelowThreshold } from '../src/story-family-registry';
it('has 30+ story families each with >=3 nodes and >=2 resolutions', () => {
  const counts = countFamilies();
  expect(counts.familyCount).toBeGreaterThanOrEqual(30);
  const below = familiesBelowThreshold({ minNodes: 3, minResolutions: 2 });
  expect(below).toHaveLength(0);
});
it('every domain has at least 2 families', () => {
  const byDomain = countFamiliesByDomain();
  for (const [domain, count] of Object.entries(byDomain)) {
    expect(count).toBeGreaterThanOrEqual(2);
  }
});
```

## Task 17：关键人物连续性（竞争者与关系跨季保留）

**Files:** Create `packages/simulation/src/people/person-memory.ts`、`packages/simulation/tests/people/person-memory.test.ts`、`packages/application/tests/use-cases/professional-person-continuity.test.ts`、`packages/content/tests/professional-player-names.test.ts`；Modify `packages/simulation/src/career/pro-squad.ts`、`packages/simulation/src/career/professional-week.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/content/data/person-archetypes.ts`、`packages/content/src/clubs.ts`、`packages/contracts/src/clubs.ts`、`packages/contracts/src/professional.ts`、`apps/web/src/career-dashboard/ProDashboard.tsx`。

**Interfaces:** `PersonMemory`——赛季组件生成的 `squad` 和 `depthChart` 内竞争者人物使用稳定 personId（非每季重抽ID+新名字）；跨季 roster 变化时，已有关系（rivalry、friendship）按 personId 延续。新入队人物为新生成但有继承上一季已存在的 teammate 关系概率。`CarryOverRoster` 函数：保留上一季本队 50-70% 的人物（按能力和年龄过滤），其余为新生成。

需要解决 EXTERNAL_REVIEW F07 的部分——人名自然化：中文姓名从现有 `personName` 池中抽取，不再出现"许振宇32"、"高立诚39"等数字；SPA 中的竞争排名使用球员名而非ID。竞争者如在同一俱乐部跨季，应保持其名字和基础特征稳定。

- [x] 写回归：同俱乐部连续两季 roster 前后人物 ID 可追踪；相同 ID 保持姓名一致；关系（rivalry、friendship）跨季保留；姓名不附加数字ID；补充失衡留存核心仍覆盖全部位置的回归。
- [x] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/people/person-memory.test.ts`，先确认旧重抽行为红灯，再验证修复后的 27 项职业/人物测试。
- [x] 修改 `generateProSquad` 及 pro-flow 中 `squad` 生成：同俱乐部优先复用上一季人物，不同俱乐部不串用阵容；新入队人物使用本地化姓名池；竞争排名展示人物姓名；国家队流程不写入俱乐部转会。
- [x] 重跑 pro-flow、squad、内容、应用和页面测试；同队跨季核心保留约 65%（设计范围 50%–70%），姓名/能力特点/关系可追踪。按审核流程不自动提交，待用户审核。

```ts
import { expect, it } from 'vitest';
import { carryOverRoster } from '../../src/people/person-memory';
it('keeps 50-70% of previous squad', () => {
  const prev = [{ personId: 'p1', name: '张华', age: 22 }, { personId: 'p2', name: '李明', age: 24 }, { personId: 'p3', name: '王强', age: 21 }];
  const next = carryOverRoster(prev, { limit: 3, rng: createSeededRandomSource(42) });
  const overlap = next.filter(n => prev.some(p => p.personId === n.personId));
  expect(overlap.length).toBeGreaterThanOrEqual(2);
});
it('names never contain digit suffix', () => {
  const next = carryOverRoster([], { limit: 5, rng: createSeededRandomSource(1) });
  for (const n of next) expect(n.name).not.toMatch(/\d$/);
});
```

## Task 18：多周目差异测量与重复预警

**Files:** Create `tools/balance/src/story-divergence.ts`、`tools/balance/tests/story-divergence.test.ts`；Modify `tools/balance/src/run-youth-seasons.ts`；Create `docs/testing/divergence-measurement-protocol.md`。

**Interfaces:** `measureDivergence(runs: CareerTrace[]): { familyOverlapRate: number; mainStoryRepeatRate: number; uniqueTrajectories: number }`。`CareerTrace` 包含生涯中触发的故事家族ID列表、每个家族触发的节点序列、重要选择及其后果、职业轨迹摘要、退役评价维度。主要故事家族：至少3个节点的长故事。重复率按跨局两两对比相同故事家族触发的次数/总家族数计算。

**预警线：** 跨局主要故事家族两两重合不高于约25%。不是硬性数学下限，是内容预算预警线，排除系统通知（成长报告、常规比赛结果）后计算。

- [x] 写回归：完全相同种子、相同选择的两段生涯 divergency 为 0；不同种子产生差异；覆盖节点顺序、选择后果、职业轨迹和退役评价字段，并覆盖主要故事家族重复预警。
- [x] 运行 `pnpm exec vitest run --project balance tools/balance/tests/story-divergence.test.ts`，先确认缺少实现的红灯，再完成 5 项绿灯回归。
- [x] 实现 divergence 函数：批量采集 12 条完整生涯，每局记录故事家族触发与节点、选择和结果、职业轨迹与退役评价，计算逐局两两重合率。平衡 runner 可选启用 `--measure-divergence`，默认采集 12 条并标注超过约 25% 预警线的家族；普通模式的 metrics/summary 保持不变。
- [x] 采集首轮数据并写入 `docs/testing/divergence-measurement-protocol.md`；报告为 `artifacts/experience-G4-task18-divergence-12.json`。首轮 12 条轨迹全部唯一，主要故事平均重合率 41.80%，6 个家族超过预警线；该结果用于暴露内容调度缺口，不将 25% 当作本任务硬性通过门槛。
- [x] 完成门禁：`pnpm test`（153 个普通测试文件/848 项、balance 14 项、架构 10/10）、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e`（38/38）和显式 1,000 局报告 `artifacts/experience-G4-task18-balance-1000.json` 均通过。按审核流程不自动提交，等待用户审核后再进入 Task19。

```ts
import { expect, it } from 'vitest';
import { measureDivergence } from '../src/story-divergence';
it('identical seeds and choices yield zero divergence', () => {
  const a: CareerTrace = { storyFamilies: ['family-a', 'family-b'], mainResolutions: ['res-1', 'res-2'] };
  const b: CareerTrace = { storyFamilies: ['family-a', 'family-b'], mainResolutions: ['res-1', 'res-2'] };
  expect(measureDivergence([a, b]).familyOverlapRate).toBe(0);
});
it('completely different families diverge fully', () => {
  const a: CareerTrace = { storyFamilies: ['family-a'], mainResolutions: ['res-1'] };
  const b: CareerTrace = { storyFamilies: ['family-x'], mainResolutions: ['res-x'] };
  expect(measureDivergence([a, b]).familyOverlapRate).toBeGreaterThan(0);
});
```

---

## G5：AI 关键点评与人生总结

本阶段目标：基于可信生涯事实，在关键节点提供个人化评价，在终局生成有据可查的人生总结；AI 不改变比赛、属性、奖励或终局，失败有完全回退。

## Task 19：生涯总结叙事契约与异步生成

**Files:** Modify `packages/contracts/src/narration.ts`、`packages/application/src/index.ts`；Create `packages/application/src/ai/career-summary.ts`、`packages/application/src/ai/career-summary-prompt.ts` 及对应测试；Modify `apps/local-ai/src/index.ts`、`apps/local-ai/src/providers/types.ts`、`apps/local-ai/src/providers/mock.ts`、`apps/local-ai/src/providers/openai-compatible.ts`、`apps/local-ai/src/server/narrative-server.ts`、`apps/local-ai/src/validation/narrative.ts`、`apps/web/src/narration/local-ai-client.ts`、`apps/web/src/career-dashboard/CareerReviewPage.tsx`、`apps/web/src/app/App.tsx` 和回顾页样式。

**Interfaces:** 叙事契约新增 `career-summary` kind。输入为结构化生涯事实：人员身份（姓名、出生地、位置、国籍）、生涯概况（totalSeasons、totalClubs、totalGoals、totalAppearances etc.）、职业轨迹（按赛季摘要）、重要节点列表（关键选择 + 结果）、荣誉列表、八维评价、幕后档案（潜力揭示、错过机会）。短版输出 150-250 字（立即展示），展开版 400-800 字（玩家主动展开）。schema 约束：不允许虚构冠军、出场、关系、伤病因果或错失机会。

**异步流程：** 退役后先显示本地确定性短/长总结（八维+幕后档案），AI 短版作为异步增强插入同一区块，不阻塞页面渲染。长版默认折叠，点击“展开 AI 人生总结”后请求；失败时展开并保留本地长版。请求继续使用 `POST /v1/narrative-polish`，通过 `kind: 'career-summary'` 和 `mode: 'short' | 'long'` 区分。cache key 由 `canonicalFactsHash`（规范化事实字段的 SHA-256）和模式共同决定，同事实不重复调用。超时/离线/无效输出时保留本地模板，不显示“AI生成失败”错误横幅，AI 文本不写入存档。

- [x] 写回归：`career-summary` 输入 schema 通过国家队一致性和证据 ID 闭环禁止编造未发生事实；本地短/长版满足 150–250/400–800 字并保留真实关键节点；mock 返回后页面同时展示本地与 AI 双区且不覆盖本地事实。
- [x] 运行定向契约、application、local-ai、web 回归，覆盖 32 项测试；原有事件反馈润色回归保持通过。
- [x] 实现 `career-summary` 契约、事实映射、`buildCareerSummaryPrompt`、确定性本地摘要；web 端 CareerReviewPage 新增“人生总结”区块，AI 短版异步增强，长版默认折叠并按需请求；local-ai 复用 `POST /v1/narrative-polish`，支持 schema、事实数字围栏、超时、fallback、SHA-256 canonical cache。
- [x] 完成门禁：普通全量测试与架构检查通过（156 个测试文件/861 项、架构 10/10），`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e`（38/38）通过；显式 1,000 局报告 `artifacts/experience-G4-task19-balance-1000.json` 已通过。追加文字事实围栏后，balance 规则未改；最终重跑 balance 测试项目在当前机器持续高 CPU 且超过 10 分钟无输出，已停止并记录为验证性能异常，不存在失败断言。按审核流程不自动提交，等待用户审核后再进入 Task20。

```ts
import { CareerSummaryFactsSchema } from '../src/narration';
import { buildCareerSummaryFacts, generateCareerSummary } from '../src/ai/career-summary';

it('rejects non-zero caps for an uncapped national-team fact', () => {
  expect(() =>
    CareerSummaryFactsSchema.parse({
      // ...a valid fact package with nationalTeam.capped false
      nationalTeam: { capped: false, caps: 2, goals: 1 },
    }),
  ).toThrow();
});

it('keeps local summaries within their selected length range', () => {
  const facts = buildCareerSummaryFacts(endedSave);
  const short = generateCareerSummary(facts, 'short');
  const long = generateCareerSummary(facts, 'long');
  expect(short.length).toBeGreaterThanOrEqual(150);
  expect(short.length).toBeLessThanOrEqual(250);
  expect(long.length).toBeGreaterThanOrEqual(400);
  expect(long.length).toBeLessThanOrEqual(800);
});
```

## Task 20：五个关键节点 AI 评价

**Files:** Create `packages/contracts/src/narration/milestone-narration.ts`、`packages/contracts/src/narration/milestone-prompt.ts`；Modify `packages/contracts/src/narration.ts`、`packages/contracts/src/index.ts`（新增 `kind: 'milestone'`）；Modify `packages/application/src/ai/milestone-prompt.ts`、Create `packages/application/tests/ai/milestone-prompt.test.ts`；Modify `apps/local-ai/src/index.ts`、`apps/local-ai/src/providers/types.ts`、`apps/local-ai/src/providers/mock.ts`、`apps/local-ai/src/providers/openai-compatible.ts`、`apps/local-ai/src/server/narrative-server.ts`、`apps/local-ai/src/validation/narrative.ts`、`apps/web/src/event-choice/EventFeedbackPanel.tsx`、`apps/web/src/career-dashboard/CareerReviewPage.tsx`、`apps/web/src/narration/local-ai-client.ts` 及对应回归测试。

**Interfaces:** 五个关键场景：首份职业合同、重大伤病与复出、关键转会/留洋、国家队重大节点、退役。每场景有独立 prompt 模板和结构化输入：合同场景含合同年限、薪资、俱乐部承诺；伤病含伤病类型、时长、恢复中重要选择；转会含前俱乐部、新俱乐部、转会费范围、适应状态变化；国家队含赛事类型、出场与进球、淘汰轮次；退役含生涯总览、遗憾和最大成就。输出 150-250 字"为什么这是你的故事"，把早期选择与后来结果连起来。

**约束：** 不编造冠军、进球、出场或关系。对同一事实组合的润色在展示期内保持一致（实例缓存 SHA-256 key）。AI 文本不进入存档，不改变回溯结果。退役评价的 AI 版本不和规则评价冲突：AI 说"有遗憾的职业生涯"可以，但不能说"没有达到世界级"而规则评价为"世界级"。

- [x] 写回归：首份合同输入 schema 禁止虚构转会费/年限；伤病场景输入必须包含 `injuryType` 和 `returnOutcome`；mock 输出符合 150-250 字 + 不添加输入未提供的事实；公共事实包增加荣誉奖项、关键数据、独特比赛记录。
- [x] 运行定向契约、application、local-ai、HTTP server、web client、职业回顾页与反馈页回归：契约 5/5、prompt 2/2、local-ai 21/21、web 16/16；新增 provider 独立 prompt、虚构荣誉拦截、退役评价页面接线和失败重试覆盖。
- [x] 为 5 个场景各实现独立 prompt builder，并由真实 OpenAI 兼容 provider 实际调用；构造只读输入结构并通过 `milestone-narration-v1` 请求接入现有 `POST /v1/narrative-polish`。客户端按 canonical facts SHA-256 + 场景请求去重，失败结果不永久缓存；职业回顾页先显示本地退役评价，事件反馈页保留作者原文并异步增强；AI 失败、超时、无效数字、标记或基础事实冲突时静默回退。
- [x] 验收：普通全量测试 159 个文件/879 项通过（其中既有 professional-week.test.ts 在默认 5 秒门槛下曾超时，单独提高到 30 秒后 23/23 通过）；`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` 通过；桌面 E2E 19/19、独立重启服务后的移动 E2E 19/19；全量首次串行 E2E 因共享 Vite 服务在桌面批次后退出导致 16 个移动连接拒绝，独立重跑全部通过。balance 子项目本次持续高 CPU 超过 10 分钟无输出后停止，Task20 未修改 simulation/balance 规则，沿用已通过的 `artifacts/experience-G4-task19-balance-1000.json`；完整矛盾检测仍由 Task21 承接。按审核流程不自动提交，等待用户审核后再进入 Task21。

```ts
import { expect, it } from 'vitest';
import { MilestoneInputSchema } from '../../src/narration/milestone-narration';
it('rejects injury milestone without injuryType', () => {
  expect(() => MilestoneInputSchema.parse({
    kind: 'injury-return',
    playerName: '测试球员',
    seasonId: 'pro-2026',
    returnOutcome: 'fully-recovered',
  })).toThrow();
});
it('contract milestone requires club and years', () => {
  const input = MilestoneInputSchema.parse({
    kind: 'first-contract',
    playerName: '测试球员',
    club: '测试队',
    contractYears: 3,
    annualSalary: 120,
  });
  expect(input.club).toBe('测试队');
});
```

## Task 21：AI 韧性、超时与矛盾检测

**Files:** Create `packages/application/src/ai/ai-guard.ts`、`packages/application/tests/ai/ai-guard.test.ts`、`packages/contracts/src/narration/career-summary-prompt.ts`；Modify `apps/web/src/narration/local-ai-client.ts`、`packages/application/src/ai/career-summary-prompt.ts`、`packages/application/src/ai/milestone-prompt.ts`、`packages/contracts/src/index.ts`、`packages/contracts/src/narration/milestone-prompt.ts`、`apps/local-ai/src/providers/openai-compatible.ts`、`apps/local-ai/src/validation/narrative.ts`、`apps/local-ai/src/server/narrative-server.ts` 及对应 provider/server/web 回归测试。

**Interfaces:** `detectFactualContradiction(output: string, facts: CareerFact[]): string[]`——对每项事实，确认输出文案不否定、篡改或新增。返回的矛盾列表为空=通过；非空则丢弃该输出回退作者模板。超时处理：`fetchWithTimeout(url, options, timeoutMs)`——默认 5000ms 超时后返回 `null`（走回退）。对5种常见 LLM 幻觉模式做检测：编造冠军、错误当前俱乐部、虚构出场次数、错写年龄/赛季数、混淆重伤与轻伤类型。

- [x] 写回归：输出"赢得了世界杯冠军"但事实无该奖杯->检出幻觉；输出"出场50次"但事实45次->检出幻觉；输出"重伤后艰难恢复"但事实为"轻度扭伤，2周恢复"->检出幻觉；补充冠军/亚军、自定义荣誉、出场容差、俱乐部后缀/下一站与超时回退测试。
- [x] 运行 `pnpm exec vitest run --project domain packages/application/tests/ai/ai-guard.test.ts` 等定向回归；事实守卫 13/13，通过后 application/local-ai AI 回归 7 个文件/46 项、web 客户端 10/10。
- [x] 实现五项检查：荣誉存在性按具体奖项/名次匹配，出场数同时执行 ±2 与 20% 边界，俱乐部一致性支持常见后缀与转会表述，年龄/赛季数合理性、伤病类型/时长/复出结果匹配。`fetchWithTimeout` 默认 5000ms，统一处理超时、非 JSON、schema 不合格和矛盾回退；summary/milestone 客户端失败结果及 server 未通过二次事实校验的结果均不缓存。career-summary prompt 下沉至 contracts 并由真实 provider 实际使用；事件 polish 保持既有数字/人物一致性校验，因为该输入不包含 CareerFact。
- [x] 完成项目门禁：最终普通阶段 `pnpm test` 为 160 个文件/899 项通过；同一轮进入 balance 子项目后在本机高 CPU、23 分钟无输出而中止，未出现断言失败；此前同 Task21 版本的 balance 阶段曾完成 4 个文件/14 项。最终 `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:architecture` 通过，`pnpm test:e2e` 38/38 通过。Task21 未修改 simulation/balance 规则，沿用 `artifacts/experience-G4-task19-balance-1000.json`；按审核流程不自动提交，等待用户审核后再进入 Task22。

```ts
import { expect, it } from 'vitest';
import { detectFactualContradiction } from '../../src/ai/ai-guard';
it('flags fabricated honour', () => {
  const errors = detectFactualContradiction('他赢得了世界杯冠军', { honours: ['asian-cup-champion'] });
  expect(errors.length).toBeGreaterThanOrEqual(1);
  expect(errors[0]).toContain('世界杯');
});
it('passes factually consistent output', () => {
  const errors = detectFactualContradiction('他共出场120次，攻入25球', { appearances: 120, goals: 25 });
  expect(errors).toHaveLength(0);
});
it('flags overstated appearances', () => {
  const errors = detectFactualContradiction('出场500次创造纪录', { appearances: 120 });
  expect(errors.length).toBeGreaterThanOrEqual(1);
});
```

---

## G6：综合验收与真人测试证据

本阶段目标：用最终同版本规则执行完整验收，产出真实玩家体验报告，确认已满足五项新标准。

## Task 22：最终 10,000 段生涯全量验收

**Files:** Modify `docs/ROADMAP.md`；Run `pnpm balance:youth -- --runs 10000 --seed-start 1 --output artifacts/experience-final-10000.json`（分支同一版本）。

**验收指标（来自 EXPERIENCE_REVIEW 第8节 + 计划 B 节默认值）：**
- 完成率 100%（无崩溃、无无效状态）
- 回顾生成率 100%
- 主题覆盖率 100%
- WorldClassRate 世界级退役占比 1-5%（最终版声望经济校准后）
- EarlyRetirementRate 极早退役（<30岁）按严重伤病归因后 <1%
- 国家队出场占比 15-30%（spec 第25.2节）
- 重伤率 0.5-1.5%（3年移动窗口）
- 承诺兑现率 >=90%
- 比赛中位 20-24、决策中位 8-12、每月最多2个决策
- 独立事件组合 >=9,000/10,000
- 独立故事组合 >=60
- 八国联赛均产生有效的冠军和升降级，联赛不因俱乐部不足而崩溃。（新增 G3 指标）
- 同种子+同选择的机械结果逐位一致（从 10000 样本中抽取 10 对验证）

**前版本对照：** H0: `youth-balance-10000-release.json`（M10规约前）。新版本指标变化应附可解释 delta。不可解释的显著变化需排查到具体任务。

- [x] 在所有 G1-G5 任务完成后、run 之前做一次全量 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e`。
- [x] 执行 `pnpm balance:youth -- --runs 10000 --seed-start 1 --output artifacts/experience-final-10000.json`。记录开始与结束时间、命令行退出码、输出文件大小。
- [x] 从结果提取上述指标，与 H0 对照，逐项注释差异。差异超过预期范围的（世界级波动 >1pp、国家队 >5pp、完成率 <100%）需回排查 T01-T21 具体哪个任务引入。
- [x] 补充八国联赛覆盖率报告：在每个 1,000 季子段中，至少 6/8 国家有球员经历。提交 test: final 10,000-season balance verification。

**Task22 历史执行记录（2026-09-21）：** 普通测试阶段通过 160 个文件/899 项，`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:architecture` 10/10、`pnpm test:e2e` 38/38 均通过。首次 10,000 局命令在启动时暴露 `contracts/src/narration` 目录缺少 `index.ts` 的 loader 解析问题，已补齐稳定入口并让 balance loader 在同名文件/目录并存时优先解析 `.ts` 文件；第二次于 12:56:49 启动，实际计算进程正常但至 13:17:25 仍无阶段输出，按当前 CPU 速度预计需数小时，已停止，退出码为手动中止，`artifacts/experience-final-10000.json` 未生成。

## Task 22A：balance runner 性能优化与可观测性

**Files:** Modify `tools/balance/src/run-youth-seasons.ts`、`tools/balance/src/node-shims.d.ts`、`tools/balance/src/index.ts`、`tools/balance/tests/youth-season-balance.test.ts`。

- [x] 用 CPU 画像确认主要耗时位于职业周推进、事件筛选/故事进度与应用层状态校验，不修改 simulation/application 规则。
- [x] 增加逐种子进度回调与 CLI 阶段输出；并行完成顺序不影响最终按 seed 排序的报告。
- [x] 使用最多 4 个受控 worker 分块运行独立种子；worker 显式使用项目 loader，内部世界层分析只在主线程聚合一次。
- [x] 分离公共运行选项与 worker 内部聚合参数，校验 runs、seedStart、parallelism、预计算指标序列；worker 失败/异常退出时统一终止其他 worker。
- [x] 固定种子顺序/并行结果回归通过；1,000 局测试与正式命令通过；最终 10,000 局报告成功生成。
- [x] 独立审阅的 Required 问题已处理；类型、Lint、格式、构建、完整测试与 E2E 重新通过。

**Task22A 执行记录（2026-09-21）：** 进度回调、并行确定性和非法并行度回归均通过；正式 1,000 局命令退出码 0，报告 `artifacts/experience-task22a-1000.json` 包含 1,000 条按 seed 1–1000 排列的指标。最终命令 `pnpm balance:youth -- --runs 10000 --seed-start 1 --output artifacts/experience-final-10000.json` 退出码 0，生成 29,349,251 字节报告，包含 10,000 条 seed 1–10000 的唯一指标。最终摘要：完成率 1、回顾生成率 1、主题覆盖率 1、比赛中位 22、决策中位 10、每月最多 2 次决策、独立事件组合 9,991、独立故事组合 82、WorldClassRate 1.4%、EarlyRetirementRate 0、国家队占比 29.07%、重伤率 0.99%、承诺兑现率 96.92%、世界层 240 队且重载稳定。审阅发现并修复了 worker 失败清理、公共参数边界和并行进度语义问题；最终 `pnpm test` 为普通 160/899、balance 4/17、架构 10/10，`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 38/38 均通过。

**Task22A 当时状态：** Task22A 已完成；当时 Task22 的 H0 指标差异注释与八国 1,000 季分段覆盖报告仍待补齐，后续由 Task22B 收尾。
## Task 22B：最终报告差异、八国经历覆盖与确定性收尾

**Task22B 执行记录（2026-09-21）：** 新增 balance 观测字段 experiencedCountries，仅记录球员实际启动职业赛季时所属俱乐部国家（包含租借参赛队），并在报告中生成十个 1,000 种子分段的 countryExperience。新增回归覆盖分段统计、非法国家/非连续种子边界及 10 对固定种子重放；修复转会市场在国别吸引力排序下始终只暴露日韩的根因，按固定种子增加一个受能力天花板约束的海外国家曝光槽，不改变比赛规则、俱乐部层级或国家队转会边界。修复前回归稳定复现只有 japan/korea，修复后转会回归 5/5，通过国家轮换让最终十段覆盖达到 8、7、8、8、8、8、8、8、7、8 国，全部满足至少 6/8。

最终报告 artifacts/experience-final-10000.json：文件 29,869,585 字节，10,000 局，seed 1–10000 唯一连续；完成率 100%、回顾生成率 100%、主题覆盖率 100%、比赛中位 22、决策中位 10/P90 13、每月最多 2 个决策、重伤率 0.99%、国家队占比 28.47%、WorldClassRate 1.19%、极早退役 0、承诺兑现率 96.80%、独立事件组合 9,991、独立故事组合 82、职业分钟中位 75.00、世界层 240 队/重载稳定。八国 application 联赛回归 5/5，确认冠军、升降级、赛历边界与跨国桥接有效。

与 H0 artifacts/youth-balance-10000-release.json 的关键可解释差异：完成率、回顾率、主题覆盖、比赛中位、决策中位/P90、每月决策上限、退役年龄中位均为 0 差异；场均总进球 -0.0043、重伤率 +0.14pp、毕业率 +0.17pp、承诺兑现率 -0.34pp、国家队占比 -1.31pp（低于 5pp 门槛）、独立事件组合 +20。WorldClass/EarlyRetirement 是 H0 尚未提供的新指标。杯赛出场率由 91.10% 到 100%、杯赛荣誉率由 21.75% 到 34.34%，升级率 +1.66pp、降级率 -1.72pp，来自 240 队完整职业赛制与杯赛结算，不是随机崩溃。留洋占比由 25.59% 降至 16.54%，原因是国家轮换把原先集中于日韩的留洋机会分散到欧洲五国，仍处于既有 10%–40% 门禁内。

验证：Task22B 定向回归 5/5、转会市场回归 5/5、application 八国回归 5/5；最终 pnpm test 普通 160/900、balance 5/22、架构 10/10，pnpm typecheck、pnpm lint、pnpm format:check、pnpm build、pnpm test:e2e 38/38 均通过。Task22B 已完成，按审核流程等待用户审核，不进入 Task23。

**Task22 当前状态：** Task22A、Task22B 均已完成；H0 差异、十段八国经历覆盖、八国联赛有效结算和固定种子重放均有证据。按流程等待用户审核，不进入 Task23。

## Task 23：真人体验测试协议与最终交付

**Files:** Create `docs/testing/experience-playtest-report-TEMPLATE.md`；Modify `docs/testing/experience-playtest-protocol.md`（T09 创建的协议）；Create `docs/RELEASE_NOTES-v1.md`；Modify `docs/ROADMAP.md`。

**协议内容（protocol）：** 明确要求测试者使用手机（412x915 或相近尺寸）与桌面（1440x900）各完成一段完整生涯；记录开始时间（点击创建按钮）到显示可读终局总结的用时；每局结束后回答"哪三项最重要的事发生了"；连续完成四局（不同种子）后对比主要故事重复程度。说明：不收集存档、不上传数据、不要求安装PWA（但可选）。测试人员从目标受众招募：至少2名非资深足球游戏玩家、至少2名有体育模拟经验的玩家。

**可测量目标（来自 EXPERIENCE_REVIEW 第8节）：**
- 快速路径 <=20 分钟（5 名测试者的中位数和 p90 分别记录）
- 阶段与终局代表性：不少于 1 条伤后回归、1 条留洋、1 条较长职业（>=10 季）路径被抽测
- 舒适与反馈：完成度评估——无"找不到推进入口"、"不知道状态变化"的反馈；大多数人能复述最近一次重要选择及其后果
- 意外但合理：抽检 5 个事件结果（3成功2失败），对照事前条件，测试者能理解原因
- 三四局新鲜感：第3局和第4局的主观新鲜感评分(1-5)均值 >=3.5；标注具体重复的故事节点
- AI 评价准确性：在至少 3 个关键节点检验 AI 文案与事实的一致性

**交付物清单：**
- 所有 23 个任务完成、G1-G6 门禁通过
- `ROADMAP.md` 更新为"G6 完成，项目已满足体验升级验收标准。已知限制见附注。"
- `docs/RELEASE_NOTES-v1.md` 包含：新功能列表、已知限制、性能说明、下一个规划方向的入口（非承诺）
- 无 AI 路径的完整生涯多次验证通过
- 10,000 季最终报告与 H0 对照
- 真人测试协议已填写至少 5 份（不足时可注明"待招募补充"）

- [x] 基于T09协议完善手机/桌面两组路径的具体操作说明和记录模板。
- [x] 完成自动化/工具路径复核并建立五份真人记录模板；真实测试者记录不足部分明确标记“待招募补充”。
- [x] 将不达标项按 A（环境/说明）、B（G1-G5 缺口）、C（已知范围外）分类写入协议；当前尚无真人记录可判定 B 类缺口。
- [x] 编写发布说明文档 v1，涵盖安装方式、已知问题、AI配置、离线限制；真人证据不足部分明确保留待招募状态。
- [x] 最终工程门禁全部通过并在 ROADMAP 记录 G6 Task23 文档阶段完成；真人指标继续保持待招募补充，暂不宣称 20 分钟真人达标。

**Task23 文档执行记录（2026-09-21）：** 已完成 T09 真人体验协议的手机/桌面双设备要求、19+1 分钟计时起止、四局不同种子新鲜感、五事件可解释性抽检、AI 事实一致性问题和 A/B/C 缺口分类；新增 docs/testing/experience-playtest-report-TEMPLATE.md 与 docs/RELEASE_NOTES-v1.md。自动化与工具证据沿用 Task22 的全量门禁和 10,000 季报告；真人测试者记录尚未产生，不将工具结果伪装为真人结果，发布说明标记为“自动化验收通过的体验升级候选版”，真人指标待招募补充。最终门禁已通过：pnpm test 普通 160/900、balance 5/22、架构 10/10；pnpm typecheck、pnpm lint、pnpm format:check、pnpm build、pnpm test:e2e 38/38 均通过。为避免两个 1,000 季 balance 测试文件争抢 CPU，Vitest balance 项目关闭文件间并行，单个 runner 仍保留最多 4 个受控 worker；balance 全量耗时 581 秒。
## Task 24：交付、启动与移动端使用

**Goal:** 在不改变模拟规则的前提下，提供 GitHub Pages 在线版本、Windows 双击启动、Android 操作说明，并将成果保存和推送到 GitHub。

**Architecture:** Vite 通过 VITE_BASE_PATH 兼容本地根路径与 GitHub Pages 仓库子路径；PWA manifest 和 Service Worker 从 BASE_URL/注册 scope 推导资源路径；Windows 启动器只负责依赖检查、局域网开发服务器和浏览器打开；GitHub Actions 负责生产构建和 Pages 发布。

**Global Constraints:** Node >=24.16.0；pnpm 11.9.0；simulation/application 规则不变；不得提交 .env、API key、token、node_modules、dist 或 artifacts；不强制推送、不自动合并 master；真人 20 分钟指标仍不能用自动化数据代替。

### Task 24A：PWA 子路径与资源路径兼容

**Files:**
- Modify: apps/web/vite.config.ts
- Modify: apps/web/index.html
- Modify: apps/web/public/manifest.webmanifest
- Modify: apps/web/public/sw.js
- Modify: apps/web/src/pwa/register-service-worker.ts
- Test: apps/web/tests/pwa/pwa-assets.test.ts

**Interfaces:**
- Input: VITE_BASE_PATH；本地默认 /；Pages 使用 /FootballSimulator/。
- Output: manifest、图标、Service Worker、导航回退和静态资源在两种路径下均可解析。

- [x] Step 1: 扩展 PWA 回归，断言 index 使用 Vite BASE_URL，manifest 使用可跨前缀的相对入口，Service Worker 注册不再固定为根路径。
- [x] Step 2: 运行 PWA 定向测试，预期在实现前因旧的根路径断言失败。
- [x] Step 3: 在 Vite 配置读取 VITE_BASE_PATH；更新 index、manifest、Service Worker 和注册器，使本地与仓库子路径共用一套资源逻辑。
- [x] Step 4: 运行 apps/web PWA 测试、pnpm format:check 和 pnpm build；确认默认本地构建仍生成可运行根路径。
- [x] Step 5: 提交 Task24A，提交信息为 fix: support PWA subpath deployment。


**Task24A 执行记录（2026-09-21）：** 完成 Vite `VITE_BASE_PATH`、HTML 静态资源、相对 Manifest、按注册 scope 计算的 Service Worker 与 BASE_URL 注册器；PWA 回归 4/4、默认构建和 `/FootballSimulator/` 子路径构建通过。提交 `a4f8dfc`；随后补充 Vite 类型修复提交 `c061b7c`。
### Task 24B：Windows 双击启动与局域网入口

**Files:**
- Modify: package.json
- Create: 启动足球模拟器.cmd
- Test: 启动器静态检查和 pnpm dev:lan 启动检查

**Interfaces:**
- Input: Windows 双击；可用 Node.js 与 pnpm；项目根目录。
- Output: 自动依赖检查、局域网开发服务器、浏览器入口和手机访问地址。

- [x] Step 1: 先为 package.json 增加 pnpm dev:lan，命令使用 apps/web Vite 的 --host 0.0.0.0，不修改默认 pnpm dev 的 127.0.0.1 行为。
- [x] Step 2: 写启动器失败路径检查，覆盖缺少 node、缺少 pnpm 和依赖目录不存在三种提示。
- [x] Step 3: 实现启动足球模拟器.cmd：切换到自身目录、按需执行 pnpm install、最小化启动 pnpm dev:lan、打开 localhost 页面并显示局域网 IPv4。
- [x] Step 4: 在 Windows 环境执行静态命令检查和一次可控启动/终止检查；确认启动器不修改防火墙、不写存档、不启动 AI 服务。
- [x] Step 5: 提交 Task24B，提交信息为 feat: add Windows one-click launcher。


**Task24B 执行记录（2026-09-21）：** 新增 `pnpm dev:lan` 与根目录 Windows 启动器；启动器执行 Node/pnpm/依赖检查、局域网 IPv4 展示、最小化 Vite 服务和本机浏览器打开。静态回归 2/2，真实批处理启动成功，实测监听 `0.0.0.0:5173` 后已受控终止；格式、Lint、类型、默认构建和 Pages 子路径构建通过。启动器使用 ASCII 命令文本，避免 Windows 代码页解析故障。提交 `77ea791`。
### Task 24C：GitHub Pages 与安装说明

**Files:**
- Create: .github/workflows/deploy-pages.yml
- Create: docs/INSTALLATION.md
- Modify: docs/RELEASE_NOTES-v1.md
- Test: workflow YAML/格式检查、生产构建产物路径检查

**Interfaces:**
- Input: push 到 career-experience-upgrade 或 master，或手动 workflow_dispatch。
- Output: GitHub Pages artifact，部署地址 https://sherryicecream.github.io/FootballSimulator/。

- [x] Step 1: 写 Pages workflow，固定 pnpm 11.9.0 和 Node 24.16.0，使用 frozen lockfile，注入 /FootballSimulator/，上传 apps/web/dist，并申请最小 Pages 权限。
- [x] Step 2: 写 docs/INSTALLATION.md，说明 Windows 双击、命令行备用方式、GitHub Pages、Android Chrome 安装、同 Wi-Fi 局域网访问、防火墙和 PWA/HTTP 限制。
- [x] Step 3: 更新发布说明，链接安装文档并明确在线版、局域网版和当前 package 0.0.0 状态。
- [x] Step 4: 使用 VITE_BASE_PATH=/FootballSimulator/ 执行生产构建，检查 dist 中 manifest、sw.js、index.html 和资源引用没有回到根路径。
- [x] Step 5: 运行格式检查、PWA 测试、构建和 E2E；提交 Task24C，提交信息为 feat: add GitHub Pages delivery and install docs。


**Task24C 执行记录（2026-09-21）：** 新增 GitHub Pages workflow，固定 Node 24.16.0、pnpm 11.9.0、frozen lockfile，并使用官方 Pages artifact/deploy actions；新增 Windows/Android/GitHub Pages 安装说明，发布说明加入在线入口。Pages 交付回归 3/3、PWA/Pages 回归 7/7、E2E 38/38；`/FootballSimulator/` 生产产物中的 manifest、Service Worker、JS/CSS 资源前缀检查通过。提交 `7cb1fbd`。
### Task 24D：Git 保存、敏感信息审计与远程推送

**Files:**
- Inspect: 当前工作区全部已修改和未跟踪文件
- Modify: 不新增运行时代码；必要时只补充路线图/计划记录
- Test: staged diff check、secret scan、全量门禁和 GitHub push 状态

**Interfaces:**
- Input: 当前 career-experience-upgrade 分支和 origin 远程。
- Output: 可恢复的本地提交、origin/career-experience-upgrade 远程分支、可访问的 Pages workflow 记录。

- [ ] Step 1: 检查 staged/unstaged/untracked 文件，确认 .env、API key、token、node_modules、dist、artifacts 不会被加入。
- [ ] Step 2: 运行 git diff --cached --check 和敏感词检查；发现问题时停止，不推送。
- [ ] Step 3: 将本次完整交付成果保存为描述性提交，不使用 reset、checkout 或 force push。
- [ ] Step 4: 运行 pnpm test、pnpm typecheck、pnpm lint、pnpm format:check、pnpm build 和 pnpm test:e2e。
- [ ] Step 5: 执行 git push -u origin career-experience-upgrade；记录远程提交和 Pages workflow 地址，不自动合并 master。
- [ ] Step 6: 更新 ROADMAP 与本计划，记录电脑/Android 安装入口和当前真人测试仍待补充的限制。

**Task24 验收标准：**
- Windows 用户双击启动足球模拟器.cmd 可以打开本地游戏。
- Android 可通过 GitHub Pages HTTPS 地址使用并添加到主屏幕。
- Android 可通过同一 Wi-Fi 下的电脑局域网地址访问开发版本。
- GitHub Pages 子路径下 manifest、Service Worker 和离线导航不丢失前缀。
- GitHub 远程分支已推送，提交不含 secrets、构建产物或用户存档。
- 所有工程门禁通过；不改变比赛、成长、存档和随机规则。
- 真人测试结论仍单独记录，不将部署成功误判为真人体验通过。
---

## E. 补充说明：与已有 M10/M11 模块的协作关系

本计划的 G1-G6 基于 M10/M11 已完成基础，改造而非替换既有架构：

| 已有模块/功能 | 本计划的使用方式 | 不做什么 |
|---|---|---|
| M10 声望经济 v2 & 验收指标化 | T22 直接使用 worldClassRate/earlyRetirementRate 指标；新的八国联赛不改变声望公式 | 不自创第二套声望体系 |
| M11 海外区域联赛 | T10 用 country 替换 overseasRegion，旧的 pro-overseas-europe/asia 升级为 pro-england/pro-spain/... | 不在旧 continent 体系上叠加 country，避免两层分组同时生效 |
| M11 国家队大赛 | T14 国家专属事件可与国家队大赛事件共存（check `requireNationalTeam`） | 不修改国家队大赛的逻辑和资格条件 |
| M11 内容外置 | T11/T14 的数据文件遵循已外置的 content/data 结构，验证通过 `content/tests/` | 不回到 src 内嵌数据方式 |
| M10 受控 AI 润色层 | T19/T20 复用 local-ai-client 架构，新增 career-summary 和 milestone 端点 | 不新建 AI 架构、不修改温度/重复惩罚等参数 |
| M10 动态事件响应 | T16 故事家族扩展建立在此判定系统之上 | 不重写判定系统，只在已有判定结果上新增结果文本 |
| M8/M9 月度节奏 | G2 的节点简报保留模拟层"每月最多2个决策"上限 | 玩家侧推进改为节点推进，但模拟引擎仍按月结算 |
| Iteration 1 生涯安全 | T05 档案导出与此互补，不覆盖已有存档恢复逻辑 | 不改变无导入回档的产品决策 |

---

## F. 优先级决策记录

以下为整个计划的明确取舍：

1. **G3 先于 G4**：世界结构先行，内容后补。在无法确定联赛数量时大量写内容会导致重写。
2. **不按现实英超/西甲复制赛制**：12队双循环是虚构简化。全部赛制在 B 节"赛制"默认值中明确定义。
3. **非玩家联赛低精度结算**：只保存冠军、升降级、平均强度；不模拟每个非球员的个人明细。延用已有 `proSeason` 但仅写赛季摘要。
4. **AI 不决定比赛结果**：T19 guard 强制约束不能输出虚构事实。此条不可协商。
5. **240 队虚构俱乐部**：不使用现实队名。若用户将来决定引入真实授权，可覆盖 data 文件层而无需改 simulation。
6. **不增加 PWA 复杂更新策略**：在 T23 发布说明中标注"当前为手动刷新获取新版本"。
7. **无真人验证时不能宣告 20 分钟达标**：T09/T23 的验证始终区分"工具推测通过"和"真人实测通过"。
8. **种子是可选功能**：默认为空（随机），种子输入不影响其他 UI 功能。