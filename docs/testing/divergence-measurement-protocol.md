# 多周目差异测量协议

## 目的

这是一套只用于开发验收的重复度检测协议，不是玩家可见的游戏玩法，也不写入正式生涯存档。它用固定种子批量跑完整生涯，保留故事家族、节点顺序、选择及结果、职业轨迹和退役评价，再比较不同生涯是否过度趋同。

## 运行方式

默认采集 12 条生涯，即连续 12 个种子（默认从 1 开始）：

```powershell
pnpm balance:youth -- --measure-divergence --seed-start 1 --output artifacts/experience-G4-task18-divergence-12.json
```

可以用 `--runs` 覆盖样本数进行小样本烟测或扩大样本；不带 `--measure-divergence` 时仍使用普通 1,000 生涯平衡统计，且不附加 divergence 报告。

## 指标口径

- `uniqueTrajectories`：完整轨迹签名的去重数量。签名包含故事家族、节点序列、选择及结果、职业轨迹和退役评价。
- `pairwise`：逐局两两报告，`leftRun` 和 `rightRun` 是报告中的局号；`familyOverlapRate` 是两局主要故事家族的 Jaccard 重合率，`mainStoryOverlapRate` 是同一口径的主要故事重合率，`familyDivergenceRate` 是全故事家族的差异率。
- `mainStoryRepeatRate`：所有局对之间主要故事家族重合率的平均值，用于观察整体重复程度。
- `familyOverlapRate`（顶层）：为了兼容计划接口，顶层字段表示“平均家族差异率”，完全相同为 0，完全不同趋近 1；逐局实际重合率请查看 `pairwise[*].familyOverlapRate`。
- `repeatedStoryFamilies`：按主要故事家族统计出现局数、出现率和两两重复率。两两重复率超过约 25% 时标记 `exceedsWarningLine: true`。

“主要故事家族”按同一局至少触发 3 个节点判定。成长报告、常规比赛结果和其他系统通知不计入主要故事重复度。

## 判定规则

1. 同种子、同选择的轨迹必须完全一致：差异率为 0，轨迹去重数不增加。
2. 不同种子应产生可解释的故事、选择或职业轨迹差异；首轮不要求所有家族立即低于预警线，报告首先用于暴露内容和调度缺口。
3. 主要故事家族两两重复率以约 25% 作为内容预算预警线，而不是硬性发布门槛。
4. divergence 采集不得改变普通平衡报告的 `metrics` 或 `summary`，也不得改写生产存档。

## Task18 首轮采样记录

命令：

```powershell
pnpm balance:youth -- --measure-divergence --seed-start 1 --output artifacts/experience-G4-task18-divergence-12.json
```

结果文件：`artifacts/experience-G4-task18-divergence-12.json`

首轮结果：

| 指标               |   结果 |
| ------------------ | -----: |
| 完整生涯数         |     12 |
| 两两比较数         |     66 |
| 唯一完整轨迹数     |     12 |
| 顶层平均家族差异率 | 55.06% |
| 主要故事平均重合率 | 41.80% |
| 超过预警线的家族   |      6 |

超过预警线的家族为：`youth-rivalry-room`（68.18%）、`youth-rivalry-position`（54.55%）、`retirement-last-season`（42.42%）、`retirement-next-role`（42.42%）、`youth-rivalry-selection`（42.42%）和 `youth-rivalry-captain`（31.82%）。这说明首轮仍有明显的青训竞争与退役故事重复，应在后续内容调度任务中继续处理；不在 Task18 内直接改写模拟规则。
