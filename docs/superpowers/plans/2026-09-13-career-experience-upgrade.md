# 足球生涯体验升级执行计划

> **For agentic workers:** 使用 `executing-plans` 技能按任务顺序执行。只有用户明确要求委派时才使用 subagent-driven-development。任务使用 `- [ ]` 清单；本文件是唯一活动执行计划，进度事实只写入 `docs/ROADMAP.md`。

**Goal:** 在保持月度生涯、确定性和存档安全的前提下，实现规则可信、快速完整生涯不超过20分钟、八国可玩联赛、连续四局有差异、可选种子及基于事实的AI人生总结。

**Architecture:** `contracts` 定义版本化数据与端口输入输出，`content` 提供作者内容与联赛档案，`simulation` 只接收内容和种子进行确定性计算，`application` 负责阶段/存档/世界推进的一致性事务，`web` 只展示并调用用例，`local-ai` 只负责可失败的叙事增强。先修事实和日期，再改善主循环，再扩展世界与叙事，最后综合验收。

**Tech Stack:** 现有 pnpm 11.9.0、Node.js >=24.16.0、TypeScript、React/Vite、Zod、Vitest、Playwright；优先使用现有依赖。不得给 simulation 添加外部运行时依赖。

**状态：** 计划已形成，所有实现任务尚未开始。历史 Iteration 1 计划已完成并归档；其未勾选步骤不是待办。本计划不宣称原型、测试、内容扩充或真人验收已完成。

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

- [ ] 写下方纯函数测试，另写应用回归：同一职业年内两次同类事件不同ID；职业期不用青训周数；首次合同开始日≤首次职业比赛日；退役档案使用careerEnd.endedOn。
- [ ] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/career/career-moment.test.ts packages/contracts/tests/career-v7.test.ts`，确认新能力缺失导致失败。
- [ ] 实现统一时间读取：职业phase从proSeason实际日期/周序读，青训从season读；合同下一合法开季按所属赛季日期计算，不能回到签约之前。resolve事件、延迟效果和人物记忆统一用该时间。新赛季采用B节日历，旧赛季日期不回写。
- [ ] 实现v6→v7无损迁移；逐个审查application旧v4/v5 parse，避免删掉新字段。重复旧ID保留原始证据，通过展示侧稳定位置区分，不重新抽取历史效果；无法确定实际日期的旧记录显示未知。
- [ ] 重跑新测试及 `packages/application/tests/use-cases/submit-career-decision.test.ts`、`contract-flow.test.ts`、`pro-flow.test.ts`、`apps/web/tests/career-saves/CareerSaveSelector.test.tsx`，检查存档恢复。提交 `fix: align career time and event identity`。

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

- [ ] 先写0进球、0分钟、1个进球以及多球用例；在职业周回归中对每个实际出场记录断言贡献守恒，不通过改fixture比分让测试通过。
- [ ] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/match/player-contribution.test.ts` 确认红灯。
- [ ] 按每个真实己方进球抽取互斥贡献，概率受位置、相应能力与出场比例影响；参数写进设计，禁止球员助攻自己。未上场为0，预备队数据与联赛分离，杯赛复用同一规则。比赛评分再考虑真实贡献，但不要重复放大球队比分影响。
- [ ] 对100个种子和所有外场位置验证守恒与重复运行一致，跑职业/青训比赛测试；提交 `fix: bind player contributions to match goals`。此任务改变规则和随机消费，记录新基线变化，不要求旧报告逐位相同。

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

- [ ] 加回归：0:0已赛事实不能生成“进球/助攻入网”成功文案；六位置都有独立意图；界面不显示未知风险；疲劳增加标示负面而不是绿色奖励。
- [ ] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/career/match-moment.test.ts` 和 `pnpm exec vitest run --project web apps/web/tests/event-choice/MatchMomentScene.test.tsx apps/web/tests/event-choice/EventFeedbackPanel.test.tsx` 确认失败。
- [ ] 保留既有结果，只描述跑位、处理、压力和教练评价；必须提及进球时只引用输入事实已经存在的进球。反馈变化统一按字段方向决定好坏，疲劳越低越好；加入文字“疲劳增加”。当前人物未参加则不写“关系更亲近”等已达成关系事实。
- [ ] 重跑上述测试，浏览器检查同一输入选择后刷新保持结果；提交 `fix: make match feedback factual and readable`。

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

- [ ] 加回归：职业页改为恢复/轻量后刷新仍保留，下一月负荷按新计划计算；待决时不能改训练；无关联赛比赛不计本队；零场显示“尚未开赛”，不显示虚假第2。
- [ ] 先运行 `pnpm exec vitest run --project web apps/web/tests/career-dashboard/ProDashboard.test.tsx` 与新summary测试确认红灯。
- [ ] 提取青训已有编辑器供职业页复用；通过现有updateTrainingPlan→commitCareer完成事务，返回v7不丢字段。球队、赛事、个人分别命名；杯赛7/7说明是整项赛事。本队出场/合同承诺分母都按明确本队赛事计算。
- [ ] 运行dashboard与职业流程测试；提交 `fix: preserve training controls and season stat scope`。

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

- [ ] 回归原始损坏JSON能原样导出；导出不删除/重写槽；保存失败保留旧界面、随机位置和当前待决；两个生涯互不覆盖。
- [ ] 运行 `pnpm exec vitest run --project web apps/web/tests/persistence/local-storage-save.test.ts` 确认新增导出能力缺失。
- [ ] 损坏卡加入“导出原始档案”，正常档案加入备份导出；不添加导入回档入口。日期使用本地可读格式，结束生涯优先careerEnd.endedOn。异常文案区分读取、额度、权限与迁移，不一律说空间不足。
- [ ] 执行单项与 `pnpm exec playwright test apps/web/tests/e2e/career-safety.spec.ts`，随后跑G1门禁；提交 `feat: preserve and export career recovery evidence`。

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

- [ ] 加测试0/上界/空白/负数/小数/科学计数/超界；原“seed控件必须隐藏”断言改为符合新需求，不能删除整个创建回归。
- [ ] 运行 `pnpm exec vitest run --project web apps/web/tests/career-creation/seed-input.test.ts` 确认红灯。
- [ ] 新入口默认折叠“世界种子（可选）”；复制失败时保留可选中文本。开局用短文说明16岁中国球员、按月、自动保存、不可回退。惯用脚采用可聚焦radio，开始按钮对比度使用现有tokens深色字。
- [ ] 同种子同设置创建两次比较机械初始状态，排除careerId/保存时间等包装差异；提交 `feat: add reproducible optional career seeds`。

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

- [ ] E2E在320×720、412×915、1440×900验证首次进入即可触达”推进到下一节点”主按钮、内容不被固定操作栏遮挡、键盘能到所有操作；长俱乐部名和200%文字仍可读。
- [ ] 运行 `pnpm exec playwright test apps/web/tests/e2e/experience-comfort.spec.ts` 确认旧布局失败。
- [ ] 主按钮”推进到下一节点”放在首屏可达位置（sticky底部栏），次要”逐月推进”放在同一栏作为小字链接，不能覆盖事件/确认对话框。默认展示必要身份、状态和短节点摘要，完整属性/积分榜按需展开。统一剧情图鉴等默认按钮；将pace/stamina等属性、角色、内部阶段ID映射为中文。报价写明”游戏币/年”，把tier解释为实力档位而非国家联赛等级。
- [ ] 重跑E2E与dashboard组件测试；提交 `feat: advance-to-node with accessible action bar`。

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

- [ ] 写下方测试：`advanceToNextNode` 在连续3个无事件月份后停在第四个月的有事件位置；跳过月份不消耗玩家侧交互次数；跳过月份的成长/疲劳变化正确聚合到摘要中；`stopReason` 准确反映停止原因。`buildNodeBrief` 对无事件跳过返回一句话概括，对事件停返回事件反馈前缀。
- [ ] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/career/advance-to-node.test.ts` 和 `pnpm exec vitest run --project web apps/web/tests/career-dashboard/NodeBrief.test.tsx` 确认红灯。
- [ ] 在 `pro-flow.ts` 中实现 `advanceToNextNode`：循环调用现有月度推进（不改变模拟逻辑），每次推进后检查是否需要停。无事件月份只聚合比赛结果、成长趋势和疲劳方向到 `MonthSummary`，不生成完整月报。有事件时立即停止，返回事件反馈和已跳过月份的摘要列表。`application`层确保 `advanceToNextNode` 在一个事务中完成（不存中间状态）。
- [ ] 前端 `NodeBrief.tsx` 默认展示 `headline` + 事件反馈（若有），跳过月份的详情列表默认折叠。`onAdvance` 只推进一次（到下一节点），不额外弹层确认。保留 “逐月推进” 次要入口（利用旧 `monthlyAdvance`），只在调试/想看细节时使用。
- [ ] 加”中间保存”测试：推进到一半（跳过2个月后停在第3个月的事件），刷新页面能正确恢复并看到已跳过的2个月摘要。提交 `feat: node-advance with aggregated skip brief`。

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

- [ ] 给短/长生涯样本计数，严格区分全生涯和首青训季；工具结果不包含“真人分钟数”的伪精确字段。
- [ ] 运行 `pnpm exec vitest run --project balance tools/balance/tests/experience-metrics.test.ts` 确认红灯。
- [ ] batch输出按职业长度分组的必经操作数、字数和决策数；协议写明19+1分钟预算、开始/结束点、可选详情边界和手机观察方式。不收集用户真实存档上传远端。
- [ ] 跑12个完整路径并标出阅读负担最大的页面，结合07/08继续减重复；阶段末运行G2门禁，提交 `test: measure complete career interaction workload`。此时没有真人数据只能写“工具验收通过，20分钟待真人验证”。

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

**Files:** Create `packages/contracts/src/country.ts`、`packages/contracts/tests/country.test.ts`、`packages/application/src/world/world-registry.ts`、`packages/application/tests/world/world-registry.test.ts`；Modify `packages/contracts/src/clubs.ts`、`packages/contracts/src/index.ts`、`packages/simulation/src/career/professional-week.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/content/data/clubs/overseas-europe.ts`、`packages/content/data/clubs/overseas-asia.ts`；Create `packages/content/data/clubs/england.ts`、`spain.ts`、`germany.ts`、`italy.ts`、`france.ts`、`japan.ts`、`korea.ts`（首批每国6队占位）。

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

- [ ] 写下方纯函数测试：`clubProfileSchema` 新增八国合法枚举、`england` 不在旧 `overseasRegion` 内仍通过校验；世界注册表可写入和读取非玩家联赛摘要，不存储明细；两场非玩家同国联赛各自独立结算不互相写入。
- [ ] 运行 `pnpm exec vitest run --project domain packages/contracts/tests/country.test.ts packages/application/tests/world/world-registry.test.ts` 确认红灯。
- [ ] 实现 `CountrySchema` 与 `ClubProfileSchema.country`；国内俱乐部 `country: 'china'`、海外俱乐部 `country` 对应所在国；现行欧洲12队暂分配至英格兰与西班牙（各6队），亚洲12队按已有 regionId japan/korea 分配。league 分组从 `overseasRegion` 等判断改为 `country` 等判断；非 player league 按国别独立结算，结算精度降为每季仅冠军、升降级与平均强度，不逐月模拟球员级明细。
- [ ] 迁移旧存档：加载时若 `club.overseasRegion` 存在但 `country` 缺失，按 `overseasRegion === 'europe' ? 'england' : 'japan'` 补缺，同步到 v8 新增字段 `worldRegistry`。不做逆向兼容移除。
- [ ] 重跑 `pro-flow.test.ts`、`professional-week.test.ts`；新增世界注册表保存/重载测试。提交 `feat: add country-level world registry`。

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

- [ ] 写校验：每国12队x2 tier = 24队；所有俱乐部 `country` 为合法八国之一；国内72队 `country` 均为 `china`；不存在ID重复或name为空。
- [ ] 运行 `pnpm exec vitest run --project content packages/content/tests/club-data.test.ts` 确认新断言数据量不符时红灯。
- [ ] 编写240个虚构俱乐部 JSON 数据。名字风格示例（英格兰）：伦敦先锋、利物浦浅滩、伯明翰铁锤、曼彻斯特织工、泰晤士河联、诺丁汉森林人、谢菲尔德钢城、利兹竞技、纽卡斯尔港务、南安普敦水手、莱斯特义勇、阿斯顿猎人——tier 5同理类推12队。每国风格与本国地理/文化特征呼应。所有名字原创，回避现实商标。
- [ ] 装配器读取新文件顺序，替换旧 europe/asia 数据源；旧文件标记 `@deprecated` 但存档兼容期内保留。运行 `pnpm exec vitest run --project content` 全部通过。提交 `feat: expand to 240 clubs across 8 countries`。

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

## Task 13：跨国转会、适应期与跨日历合同桥接

**Files:** Create `packages/simulation/src/transfer/cross-country-transfer.ts`、`packages/simulation/tests/transfer/cross-country-transfer.test.ts`；Modify `packages/application/src/use-cases/transfer-flow.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/simulation/src/contract/settlement.ts`、`packages/content/data/events/europe-career.ts`、`packages/content/data/events/asia-career.ts`（补充文化适应类事件）。

**Interfaces:** `computeCountryAppeal(country: Country, playerCountry: Country, languageBarrier: boolean): number`——同国=100、非欧洲国家间=70、跨洲际=45+语言修正；语言障碍由 `eventOutcome` 标记 `adapted` 逐步降低。`bridgeContractYears(fromCountry: Country, toCountry: Country): number`——从3月联赛转到9月联赛有6个月无比赛期显示为休整期，不按无比赛时间扣成长。转会时源赛季与目标赛季同一年内不开两条并行赛程；合同结束到新赛季开赛超过90天记为长期休整，不计入疲劳积累。

- [ ] 写回归：中国球员转会英格兰适应期折扣；跨日历桥接不造成12个月无比赛；同一俱乐部同一国家转会沿用现有流程。文化适应事件后语言障碍降低。
- [ ] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/transfer/cross-country-transfer.test.ts` 确认红灯。
- [ ] 实现国家吸引力函数并将现有转会兴趣（`computeTransferInterest`）乘以此系数；跨日历桥接在 `settleSeason` 或 `startProfessionalSeason` 中完成：若新赛季开赛日晚于当前日期90天以上，自动添加 `long-break` 月份（推进但不处理比赛、不扣成长、随机风暴略过）。欧洲-亚洲跨日历转会首次补偿事件（文化差异）作为可选事件插入新赛季第一月。
- [ ] 成本按已有能力-薪资逻辑，不另建汇率或财政公平；跨洲际薪资期望差距可通过吸引力折扣和竞争机会解释。跑 `transfer-flow.test.ts` 与跨日历年桥接 E2E。提交 `feat: cross-country transfers with adaptation and calendar bridging`。

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

**Files:** Create `packages/content/data/events/england-career.ts`、`spain-career.ts`、`germany-career.ts`、`italy-career.ts`、`france-career.ts`；Modify `packages/content/data/events/europe-career.ts`（拆分为各国文件）、`asia-career.ts`（加固日韩分类）、`packages/content/tests/events/youth-events.test.ts`、`packages/simulation/src/events/event-selector.ts`。

**Interfaces:** 每国事件模块 `export const xxxCareerEvents: EventDefinition[]`。每个国家模块至少6个顶层事件定义（不是同义句变体），覆盖该国家特有的足球环境与人物处境：英格兰的高强度身体对抗与媒体压力、西班牙的传控文化与技术偏好、德国的纪律性与青训联通、意大利的战术素养和防守传统、法国的多元文化与天赋输出、日本的社会规矩与团队优先、韩国的兵役制度与民族荣誉。条件使用新增 `requireCountry: Country`（或已有 `overseasRegions` 升级为 `requiredCountries` 数组），条件不满足时自然不触发。国内已用 `regionId` 筛选（不再需要全国事件额外条件）。

**内容组织：** 每个事件不是纯翻译或同义替换，需要反映该国的特有足球处境。例如英格兰事件可以涉及媒体专访、高强度训练负担、冬歇期缺失；日本事件涉及高中大学联赛文化、兵役接近。每个国家 6 个事件至少 3 个含选择支，至少 1 个含三档判定。事件不涉及现实人物或真实俱乐部。

- [ ] 写内容校验：每国事件模块至少6个顶层定义、至少3个含 choices、至少1个带判定；事件条件引用的国家必须合法八国枚举；不存在同一事件ID跨文件冲突。
- [ ] 运行 `pnpm exec vitest run --project content packages/content/tests/events/youth-events.test.ts`。
- [ ] 按上述各国特征编写 5x6=30 个新事件、加固日韩现有事件（确保每个至少6个）。将旧 `europe-career.ts` 的12个事件按主题分配至 England（4个）、Spain（4个）、Germany（2个）、Italy（1个）、France（1个），随后删除旧数据模块。`asia-career.ts` 内6个日本事件、6个韩国事件。
- [ ] 重跑事件校验与 `event-selector.test.ts`。提交 `feat: add 6 country-specific event families for 5 European leagues`。

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

- [ ] 运行 `pnpm exec vitest run --project application packages/application/tests/world/multi-country-e2e.test.ts` 验证5条路径全部通过。
- [ ] 全量门禁：`pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`；E2E 18/18。跑1,000季平衡命令（留下新世界基线记录，标记为 `experience-G3-balance-1000.json`）。
- [ ] 在ROADMAP记"G3完成，G4待执行"。提交 `feat: complete 8-country playable leagues (G3)`。

---

## G4：内容差异与多周目不重复

本阶段目标：每局故事由种子、球员设置和选择序列决定，同内容版本下连续多局产生可感知的处境、人物和轨迹差异。

## Task 16：30 条核心故事家族与多结局收束

**Files:** Create `packages/content/data/events/story-family-registry.ts`（故事家族清单与节点数计数）；Modify `packages/content/data/events/story.ts`、`trajectory.ts`、`branching.ts`、`youth-core.ts`、`one-off.ts`、`legacy-youth.ts`；Create `packages/content/tests/story-family-coverage.test.ts`；Modify `packages/simulation/src/events/story-progress.ts`。

**Interfaces:** 故事家族定义每项包含 `familyId`、`phaseCoverage`（该家族适用的阶段）、`minNodes`（>=3）、`distinctResolutions`（>=2，指同一家族内不同路径到达不同收束结局）。每条故事至少3个叙事节点、至少有2个不同走向的收束方式。故事家族的覆盖领域：青训争位、职业替补、巅峰、下滑；伤病与复出；合同争取与失约；留队和转会；海外适应；国家队入选与落选；退役。每个领域至少2个不同故事家族（不同动机和开局条件）。

**不重复保障：** 同一类面板包装应使用不同场景条/图标/文案情绪。故事调度优先参考本局已发生故事家族、人物关系冷却和种子，未触发的家族优先于已触发的变体。跨局同一故事家族重复时，应通过不同 player 身份、环境条件或选择序列产生合理新处境。

- [ ] 写回归：扫描所有故事数据统计家族数、每家族节点数、收束结局数；断言家族总数>=30、每家族节点>=3、每家族不同收束>=2、每个内容领域（8个）至少2个独立家族。
- [ ] 运行 `pnpm exec vitest run --project content packages/content/tests/story-family-coverage.test.ts` 确认覆盖率不足红灯。
- [ ] 审计当前已有故事家族（M10模块5/6已补齐动态事件），按上述领域分类；标记缺口：各领域当前覆盖数，补充至>=2独立家族。重点是"职业替补->巅峰->下滑"的多阶段长家族、"国家队入选与落选"的竞技压力、"退役后回看"的情绪叙事，这三块从前端实测薄弱。新家族不要求一次性写数千行长线剧本，可以先写3节点+2收束的短家族，保持内容可扩展即可。
- [ ] 每个新故事家族通过内容校验、事件集成测试和至少1条 browser 可见路径。跑 G4 预备门禁（不需平衡命令）。提交 `feat: 30+ story families with branching resolutions`。

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

**Files:** Create `packages/simulation/src/people/person-memory.ts`、`packages/simulation/tests/people/person-memory.test.ts`；Modify `packages/simulation/src/career/generate-pro-squad.ts`、`packages/simulation/src/career/professional-week.ts`、`packages/application/src/use-cases/pro-flow.ts`、`packages/content/data/person-archetypes.ts`。

**Interfaces:** `PersonMemory`——赛季组件生成的 `squad` 和 `depthChart` 内竞争者人物使用稳定 personId（非每季重抽ID+新名字）；跨季 roster 变化时，已有关系（rivalry、friendship）按 personId 延续。新入队人物为新生成但有继承上一季已存在的 teammate 关系概率。`CarryOverRoster` 函数：保留上一季本队 50-70% 的人物（按能力和年龄过滤），其余为新生成。

需要解决 EXTERNAL_REVIEW F07 的部分——人名自然化：中文姓名从现有 `personName` 池中抽取，不再出现"许振宇32"、"高立诚39"等数字；SPA 中的竞争排名使用球员名而非ID。竞争者如在同一俱乐部跨季，应保持其名字和基础特征稳定。

- [ ] 写回归：同俱乐部连续两季 roster 前后人物 ID 可追踪；相同 ID 保持姓名一致；关系（rivalry、friendship）跨季保留；姓名不附加数字ID。
- [ ] 运行 `pnpm exec vitest run --project domain packages/simulation/tests/people/person-memory.test.ts` 确认现有重抽行为红灯。
- [ ] 修改 `generateProSquad` 及 pro-flow 中 `squad` 生成：若有上一季同俱乐部 squad 传入，优先复用已有人物。load 时读 `save.proSeason.squad` 作为上一季参考。新入队人物使用 person-archetypes 内的生成器，避免数字后缀复现。competition ranking 显示时使用 person.name 替代 personId。
- [ ] 重跑 pro-flow 测试与 squad 生成测试；检查跨季 squad 重复姓名率 >60%。提交 `feat: preserve competitor identities across seasons`。

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

- [ ] 写回归：完全相同种子、相同选择的两段生涯 divergency 应为 0（完全相同）；不同种子 diverge 应在合理范围；主要故事家族重合率不超过 25%（3组x4种子做初始抽样）。
- [ ] 运行 `pnpm exec vitest run --project balance tools/balance/tests/story-divergence.test.ts` 确认红灯。
- [ ] 实现 divergence 函数：批量采集12条完整生涯（4组x3种子），每局记录故事家族触发与节点，自动计算两两重合率。平衡 runner 默认可选启用 divergence 模式（`--measure-divergence`），输出应标注超出预警线的家族。输出同时报告"第1局和第2局重合率X%、第1和第3局Y%……"，不以单一平均数掩盖长尾。
- [ ] 采集首轮数据，将结果写入协议文档。此任务的目的是暴露缺口，不强制要求首次测量必须低于25%。提交 `feat: measure replay divergence across multi-playthrough samples`。

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

**Files:** Create `packages/contracts/src/narration/career-summary.ts`；Modify `packages/contracts/src/narration.ts`（新增 `kind: 'career-summary'` 类型）、`packages/contracts/src/index.ts`；Create `packages/application/src/ai/career-summary-prompt.ts`、`packages/application/tests/ai/career-summary-prompt.test.ts`；Modify `apps/web/src/narration/local-ai-client.ts`、`apps/web/src/career-dashboard/CareerReviewPage.tsx`、`apps/web/src/app/App.tsx`。

**Interfaces:** 叙事契约新增 `career-summary` kind。输入为结构化生涯事实：人员身份（姓名、出生地、位置、国籍）、生涯概况（totalSeasons、totalClubs、totalGoals、totalAppearances etc.）、职业轨迹（按赛季摘要）、重要节点列表（关键选择 + 结果）、荣誉列表、八维评价、幕后档案（潜力揭示、错过机会）。短版输出 150-250 字（立即展示），展开版 400-800 字（玩家主动展开）。schema 约束：不允许虚构冠军、出场、关系、伤病因果或错失机会。

**异步流程：** 退役后先显示本地评价模板（八维+幕后档案），AI 短版作为异步增强插入同一区块，不阻塞页面渲染。长版有"展开AI人生总结"按钮，点击后若尚未写入则触发写入。cache key 由 `canonicalFactsHash`（所有事实字段的 SHA-256）决定，同事实不重复调用。超时/离线/无效输出时保留本地模板，不显示"AI生成失败"错误横幅。

- [ ] 写下方回归：`career-summary` 输入 schema 禁止编造未发生事实（如无国家队经历者 `caps` 必须为 0）；输出短版 150-250 字含姓名和关键转折点；mock 返回后页面展示本地+AI双区不遮盖。不要求真实provider连通才通过测试——使用 deterministic mock。
- [ ] 运行 `pnpm exec vitest run --project domain packages/contracts/tests/narration/career-summary.test.ts packages/application/tests/ai/career-summary-prompt.test.ts` 确认 mapping 逻辑与 schema 校验。
- [ ] 实现 `career-summary` 契约定义，`buildCareerSummaryPrompt` 从存档提取结构化事实，组装版本化 prompt。web 端 CareerReviewPage 新增"AI 人生总结"区块：短版在退役页中上部占据显眼但非干扰位置，长版默认折叠。local-ai-client 支持新 kind 及其 `GET /v1/career-summary` 端点。同一个 provider failure 回退路径不变。
- [ ] 跑 review 页面组件测试与异步加载测试。不要求在此任务完成真实 provider 连通调试。提交 `feat: AI career summary with async fallback`。

```ts
import { expect, it } from 'vitest';
import { CareerSummaryInputSchema } from '../../src/narration/career-summary';
it('rejects fabricated national team appearances', () => {
  expect(() => CareerSummaryInputSchema.parse({
    playerName: '测试球员',
    totalSeasons: 10,
    totalCaps: 5,
    honours: [],
    careerPhases: [{ seasonId: 'pro-2026', club: '测试队', appearances: 20 }],
  })).not.toThrow();
  expect(() => CareerSummaryInputSchema.parse({
    playerName: '测试球员',
    totalSeasons: 10,
    totalCaps: 5,
    honours: ['world-cup-champion'],
    careerPhases: [{ seasonId: 'pro-2026', club: '测试队', appearances: 20 }],
  })).toThrow();
});
it('short summary stays within 150-250 characters', () => {
  const result = generateShortSummary({ ...minimalInput });
  expect(result.length).toBeGreaterThanOrEqual(150);
  expect(result.length).toBeLessThanOrEqual(250);
});
```

## Task 20：五个关键节点 AI 评价

**Files:** Create `packages/contracts/src/narration/milestone-narration.ts`；Modify `packages/contracts/src/narration.ts`（新增 `kind: 'milestone'`）；Create `packages/application/src/ai/milestone-prompt.ts`、`packages/application/tests/ai/milestone-prompt.test.ts`；Modify `apps/web/src/event-choice/EventFeedbackPanel.tsx`、`apps/web/src/narration/local-ai-client.ts`。

**Interfaces:** 五个关键场景：首份职业合同、重大伤病与复出、关键转会/留洋、国家队重大节点、退役。每场景有独立 prompt 模板和结构化输入：合同场景含合同年限、薪资、俱乐部承诺；伤病含伤病类型、时长、恢复中重要选择；转会含前俱乐部、新俱乐部、转会费范围、适应状态变化；国家队含赛事类型、出场与进球、淘汰轮次；退役含生涯总览、遗憾和最大成就。输出 150-250 字"为什么这是你的故事"，把早期选择与后来结果连起来。

**约束：** 不编造冠军、进球、出场或关系。对同一事实组合的润色在展示期内保持一致（实例缓存 SHA-256 key）。AI 文本不进入存档，不改变回溯结果。退役评价的 AI 版本不和规则评价冲突：AI 说"有遗憾的职业生涯"可以，但不能说"没有达到世界级"而规则评价为"世界级"。

- [ ] 写回归：首份合同输入 schema 禁止虚构转会费/年限；伤病场景输入必须包含 `injuryType` 和 `returnOutcome`；mock 输出符合 150-250 字 + 不添加输入未提供的事实。
- [ ] 运行 `pnpm exec vitest run --project domain packages/contracts/tests/narration/milestone-narration.test.ts packages/application/tests/ai/milestone-prompt.test.ts`。
- [ ] 为5个场景各实现 prompt builder，提取所在阶段存档事实，构造只读输入结构。客户端在事件反馈页或总结页识别当前场景，发出请求。mock 测试覆盖5场景，真实 provider 连通由 T21 覆盖。
- [ ] 跑 E2E（mock AI 模式下）——检查关键节点页面显示增强文本且不改变反馈核心结构。提交 `feat: AI narration for 5 key career milestones`。

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

**Files:** Create `packages/application/src/ai/ai-guard.ts`、`packages/application/tests/ai/ai-guard.test.ts`；Modify `apps/web/src/narration/local-ai-client.ts`、`packages/application/src/ai/career-summary-prompt.ts`、`packages/application/src/ai/milestone-prompt.ts`。

**Interfaces:** `detectFactualContradiction(output: string, facts: CareerFact[]): string[]`——对每项事实，确认输出文案不否定、篡改或新增。返回的矛盾列表为空=通过；非空则丢弃该输出回退作者模板。超时处理：`fetchWithTimeout(url, options, timeoutMs)`——默认 5000ms 超时后返回 `null`（走回退）。对5种常见 LLM 幻觉模式做检测：编造冠军、错误当前俱乐部、虚构出场次数、错写年龄/赛季数、混淆重伤与轻伤类型。

- [ ] 写回归：输出"赢得了世界杯冠军"但事实无该奖杯->检出幻觉；输出"出场50次"但事实45次->检出幻觉；输出"重伤后艰难恢复"但事实为"轻度扭伤，2周恢复"->检出幻觉。超时5000ms后返回null不抛异常。
- [ ] 运行 `pnpm exec vitest run --project domain packages/application/tests/ai/ai-guard.test.ts`。
- [ ] 实现五项检查：荣誉存在性（输出提及的荣誉必须在输入事实列表）、出场数边界（+-2浮动可接受但>=20%偏差则拒绝）、俱乐部一致性（当前俱乐部名必须匹配）、年龄/赛季数合理性、伤病类型匹配。超时处理在 local-ai-client 请求层实现，与已有 `TIMEOUT_MS` 环境变量共用。当 provider 返回非 JSON、JSON 不合 schema、或 contradiction 非空列表时，均触发同一回退路径：显示作者模板原文，不显示 AI 文案。缓存只在通过 contradiction guard 的内容上写入。
- [ ] 跑全量 AI 相关测试，mock+真实 provider 两组路径（真实如未连通时只跑 mock）。提交 `feat: AI output guard for factual consistency and timeout resilience`。

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

- [ ] 在所有 G1-G5 任务完成后、run 之前做一次全量 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e`。
- [ ] 执行 `pnpm balance:youth -- --runs 10000 --seed-start 1 --output artifacts/experience-final-10000.json`。记录开始与结束时间、命令行退出码、输出文件大小。
- [ ] 从结果提取上述指标，与 H0 对照，逐项注释差异。差异超过预期范围的（世界级波动 >1pp、国家队 >5pp、完成率 <100%）需回排查 T01-T21 具体哪个任务引入。
- [ ] 补充八国联赛覆盖率报告：在每个 1,000 季子段中，至少 6/8 国家有球员经历。提交 `test: final 10,000-season balance verification`。

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

- [ ] 基于T09协议完善手机/桌面两组路径的具体操作说明和记录模板。
- [ ] 联系测试者或自我模拟测试路径；完成测试后汇总各项指标是否达标。
- [ ] 所有不达标项（如果有）区分以下原因：(A) 测试环境/说明不够清晰可重试 (B) G1-G5 任务未覆盖该维度需补新任务 (C) 已知范围外（如PWA离线更新）。仅 (B) 需要创建补充任务并返回对应阶段。
- [ ] 编写发布说明文档 v1，涵盖安装方式、已知问题、AI配置、离线限制。提交 `docs: final release evidence and playtest report (G6)`。
- [ ] 最终门禁命令全部通过后，在 `ROADMAP.md` 记录完成并标记版本。通知用户项目整体体验升级完毕，可收尾此计划。

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
