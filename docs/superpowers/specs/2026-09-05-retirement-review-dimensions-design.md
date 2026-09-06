# 退役多维评价与幕后档案设计（M10 模块 9）

> 状态：按 spec §19 生涯结算与 §5 信息透明度执行。
>
> 日期：2026-09-05
>
> 前置：M10 模块 8 已完成。现有生涯回顾只有 5 档总评 + 时间线 + 回放 + 长期目标。

## 1. 目标

退役回顾页补齐 spec §19 的八维评价与"退役后解锁"的幕后档案，全部由退役存档确定性生成（可对账、无新存档字段、无迁移）。评价不是第二个结局判定：总评级（传奇/世界级/国脚级/稳健/平凡）保持不变，八维表达生涯的形状与取舍。

## 2. 八维评价（`CareerReviewData.dimensions`）

每维 `{ key, label, score(0-100), ratingLabel, evidenceIds[] }`；ratingLabel 分档：卓越 ≥80 / 出色 ≥65 / 合格 ≥45 / 平凡 <45。

| key           | label          | 数据源（全部既有字段）                  | 评分口径                                                  |
| ------------- | -------------- | --------------------------------------- | --------------------------------------------------------- |
| competition   | 竞技水平       | `player.reputation`                     | 直接映射 0-100                                            |
| team-honours  | 团队荣誉       | `seasonHistory[].honours`               | 联赛冠军 25 / 杯赛冠军 18 / 升级 8 / 降级 −5，下限 0      |
| individual    | 个人表现       | `seasonHistory` 的 pro 场均评分与进球季 | (场均 −6.0)×60 + 双位数进球季×10，上、下限 100/0          |
| loyalty       | 忠诚与身份     | `clubHistory` + `loanHistory` 俱乐部数  | 1 队 90 / 2 队 60 / 3–4 队 40 / 5+ 队 25；有租借 −5       |
| national-team | 国家队贡献     | `nationalTeam`                          | caps×2.5 + 国家队进球×1，上限 100                         |
| off-pitch     | 财富与场外人生 | `story.completedStoryIds` + 留洋        | 故事线×8 + 留洋 15，上限 70（当前无财富模拟，诚实封顶）   |
| relationships | 人际关系       | `relationships.persons` 三维均值        | trust/respect/closeness 全人物平均                        |
| legendary     | 传奇时刻       | 账本回放中的高光                        | 进球/助攻/评分≥8 的比赛、国家队首秀、冠军各 +12，上限 100 |

公式为 v1 工程校准，写入设计文档，后续随内容系统（个人荣誉、财富）演进并同步更新本文件。

## 3. 幕后档案（`CareerReviewData.behindTheScenes`，退役解锁）

1. **潜力兑现**：`player.development.attributePotential`（隐藏分项潜力）vs 最终 `player.attributes`，按 technical/physical/mental 三组列出每项 潜力→实际 与组内兑现率。
2. **隐藏特质揭示**：maturationPace（早熟/常规/晚熟）、professionalism、stability、pressureResistance、adaptability、injuryProneness，逐项数值 + 一句解释。
3. **错过的机会**（全部带账本/存档证据，可对账）：
   - 承诺受挫：`promiseReviews` 中 `status: 'broken'` 的条目，按 cause（伤病/俱乐部/球员）归因；
   - 婉拒国家队首召：`completedStoryIds` 含 `national-team-debut` 且 `nationalTeam.capped !== true`；
   - 自由球员滞留：`freeAgentSeasons > 0`；
   - 严重伤病：账本 health 事实摘要含"重伤"。
   - 无命中时明确展示"没有记录在案的错过"，不编造。

## 4. 分层归属

- simulation：`career/career-review.ts` 扩展（纯函数，输入 `CareerSaveV5Like`，不新增存档字段）。
- application：`buildCareerReview` 透传（现有 re-export）。
- web：`CareerReviewPage` 新增"生涯八维"网格（分数条 + 文字标签，不只靠颜色）与"幕后档案"区块（潜力表、特质、错过清单）；沿用既有视觉类名体系。
- 不改比赛、成长、事件、随机序列；退役流程与存档 schema 不动。

## 5. 测试与验收

- simulation：八维齐全且范围合法；单人一城/多队流动、无国家队、传奇档三个画像的维度差异符合口径；潜力兑现与特质数值直接来自存档；四类错过机会的证据命中与空态。
- web：回顾页渲染八维与幕后档案（聚焦测试）。
- 门禁全绿；`pnpm balance:youth -- --runs 1000` 确认回顾生成率 100% 且其余分布与模块 8 一致（本模块不改模拟规则）。
