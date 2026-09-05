# 退役多维评价与幕后档案实施计划（M10 模块 9）

> **For agentic workers:** TDD。设计以 `docs/superpowers/specs/2026-09-05-retirement-review-dimensions-design.md` 为准。

**目标：** `buildCareerReview` 输出八维评价与幕后档案（潜力兑现、隐藏特质、有据可查的错过机会），回顾页渲染；不改存档 schema、不改模拟规则。

## 工作包 1：simulation

1. 找到现有 career-review 测试（simulation 或 application），先补失败用例：
   - 八维齐全（key/label/score 范围 0–100/ratingLabel 分档正确）；
   - 三个画像（一人一城国脚、多队漂泊平凡、传奇冠军）的维度差异符合设计口径；
   - 幕后档案：潜力/实际数值来自 `development.attributePotential` 与 `attributes`；特质数值揭示；四类错过机会的证据命中；空态不编造。
2. 实现 `dimensions` 与 `behindTheScenes` 生成，保持 `buildCareerReview` 纯函数与既有字段不变。

## 工作包 2：web

1. `apps/web/tests/career-dashboard` 补失败用例：回顾页出现"生涯八维"（8 张维度卡）与"幕后档案"（潜力兑现/隐藏特质/错过的机会）。
2. `CareerReviewPage` 新增两个区块，沿用既有视觉类名；长文案与移动端不破版式。

## 工作包 3：门禁与文档

1. `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e` 全绿。
2. `pnpm balance:youth -- --runs 1000`：回顾生成率 100%、其余分布与模块 8 一致。
3. 更新 `docs/ROADMAP.md`；完成后归档本计划。
