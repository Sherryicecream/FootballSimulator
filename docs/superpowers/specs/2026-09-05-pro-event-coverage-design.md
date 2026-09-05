# 职业期事件覆盖扩展设计（M10 模块 6）

> 状态：已获用户批准（按 ROADMAP 声明的下一步边界执行）。
>
> 日期：2026-09-05
>
> 长期产品基准：`spec.md` §15.5 内容包分类、§16 事件系统。
>
> 项目进度入口：`docs/ROADMAP.md`；前置：M10 模块 5 已完成。

## 1. 目标

`asia-career`、`europe-career`、`national-team` 三个内容分类目前没有任何作者化事件，职业期（约 12 个赛季的游玩时间）事件密度远低于青训期。本模块把三个分类从 0 到有补齐，让留洋亚洲、留洋欧洲与国家队阶段的职业月份拥有足球语境的事件内容，同时保持青训期行为、月度推进边界、随机序列语义与存档 schema 完全不变。

## 2. 非目标

- 不新增存档 schema 版本，不做存档迁移。
- 不改动比赛结果公式、要约生成公式或第二套规则引擎。
- 不接入真实 AI provider（后续独立任务）。
- 不实现日韩"活跃层"世界模拟（长期项）。

## 3. 现状与关键事实

- 职业月度推进（`advanceProMonth`）已经复用青训事件系统：每周调用 `pickYouthEventForWeek(events, save)`，事件选择器不区分生涯阶段，同一事件池同时服务青训与职业月。
- 因此新事件必须靠**条件字段** gating，而不是按阶段过滤分类。
- 三个分类为空的原因：条件模型只有青训概念（`firstTeamStages`、`requireRelocation` 等），没有"留洋中""国家队出场"等职业期状态条件。
- 海外俱乐部集团目前只有欧洲系俱乐部；`asia-career` 事件若没有亚洲俱乐部则永远不可触发。

## 4. 机制设计

### 4.1 契约（全部为可选增量）

- `EventConditionSchema` 新增：
  - `requireOverseas: boolean`（可选）——当前处于留洋状态（`overseasSince` 非空）。
  - `overseasRegions: ('europe' | 'asia')[]`（可选）——当前海外俱乐部的区域标记。
  - `requireNationalTeam: boolean`（可选）——已获得国家队出场资格（`nationalTeam.capped`）。
  - `minCaps: number`（可选）——国家队出场次数下限。
- `requireFactType` 枚举增加 `'pro-match'`（职业周比赛事实类型，与既有 `'match'` 并列）。
- `ClubProfileSchema` 新增可选 `overseasRegion: 'europe' | 'asia'`；国内俱乐部不设置。

### 4.2 资格评估（simulation）

- `filterEligibleYouthEvents` 的输入类型扩展可选 `overseasSince` / `nationalTeam` 字段，并接受可选 `currentClub`（当前俱乐部档案，租借目标队优先）作为评估上下文。
- 新条件全部为可选增量：输入中缺失相应字段时按"不满足"处理，因此新事件在青训存档（无 `overseasSince`/`nationalTeam`/`currentClub` 上下文）中天然不可触发；既有事件的资格评估结果不变。
- `pickYouthEventForWeek` 增加可选 context 参数并透传给过滤函数；`advanceProMonth` 用当前俱乐部（`activeLoan.loanClubId ?? contract.clubId`）构造 context 传入。青训月度推进不传 context，行为不变。

### 4.3 内容

- 新增 4 家日本/韩国海外俱乐部（`overseas: true`、`overseasRegion: 'asia'`、层级 6–8）；既有海外俱乐部补标 `overseasRegion: 'europe'`。转会要约池与海外联赛组自动纳入新俱乐部，要约公式与层级天花板不变。
- 新增 17 个作者化事件：
  - `asia-career`（6）：东亚语言课、球迷见面会、洲际远征恢复、饮食与作息、本国媒体关注、冬窗传闻。
  - `europe-career`（6）：更衣室破冰、语言关、战术风格适配、当地媒体首访、思乡与家人、转会聚光灯。
  - `national-team`（5）：国家队更衣室、主帅定位对话、窗口归来恢复、国脚专访、老国脚传帮带。
- 全部事件使用小幅度效果（信心/信任/疲劳/关系键 ±1~3），其中 6 个高频事件为关键选项提供 M10 模块 1/5 的三档 authored resolution（成功/部分/受挫）。
- 事件文本遵守内容校验规则：无替换符、无真实俱乐部品牌、回应角色必须声明在 `participantRoles`。

### 4.4 触发语义

- `requireOverseas` + `overseasRegions` 联合 gating asia/europe 事件：仅在留洋期间且区域匹配时进入候选池。
- `requireNationalTeam` / `minCaps` gating national-team 事件：仅在成为国脚后进入候选池；国家队首召仍由休赛期结算的硬编码事件承载，不迁移。
- 新事件在青训期不可触发；青训期的资格池与随机序列不受影响。

## 5. 测试与平衡

必须验证：

- 契约层：新条件字段、`overseasRegion`、`pro-match` 事实类型通过 schema 校验。
- 模拟层：留洋/区域/国家队条件的正反用例；无上下文（青训）时新事件不可触发；既有事件资格不受影响。
- 内容层：三分类事件非空且通过内容校验；日韩俱乐部通过 schema 与唯一性校验。
- 应用层：`advanceProMonth` 把当前俱乐部传入事件评估（留洋亚洲存档可命中 asia-career 事件）。
- 1,000 季批量：完成率 100%、每月最多 2 个决策、重伤率 ≤1%、毕业率与职业承诺兑现率相对基线（60.9% / 96.72%）的偏移可解释；留洋占比与国家队占比不因新内容出现系统性漂移。

## 6. 工作包

1. **契约层**：条件字段与俱乐部区域标记，先红后绿。
2. **模拟层**：资格评估扩展与 context 透传，先红后绿。
3. **内容层**：日韩俱乐部 + 17 个事件 + 分类覆盖校验，先红后绿。
4. **应用层**：职业月度推进传递 currentClub，先红后绿。
5. **门禁与文档**：完整检查命令、1,000 季平衡对比、ROADMAP 更新。
