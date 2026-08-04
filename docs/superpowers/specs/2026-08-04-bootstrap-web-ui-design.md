# 足球生涯模拟器 — 引导流程 Web 界面设计

## 1. 概述

本文档描述足球生涯模拟器首个可玩纵向切片的 Web 界面设计。用户通过三个步骤完成从创建球员到选择青训路径的完整引导流程。

## 2. 技术栈

- React 19 + TypeScript
- Vite 8（构建工具）
- Vitest + Testing Library + jsdom（组件测试）
- Playwright（端到端测试）

## 3. 界面架构

### 3.1 布局方案：单页向导式（方案 A）

一个页面，三个步骤渐进展示，不依赖路由：

```
┌──────────────────────────────────┐
│  STEP 1 OF 3 · 创建球员          │  ← 初始显示
│  [表单字段...]                    │
│  [开始生涯 →]                     │
├──────────────────────────────────┤
│  STEP 2 OF 3 · 选择青训路径      │  ← 提交后展开
│  [选项卡片 × 3]                   │
│  [确认选择]                       │
├──────────────────────────────────┤
│  STEP 3 OF 3 · 生涯起点          │  ← 选择后展开
│  [球员身份卡]                     │
│  [属性摘要]                       │
│  [种子指纹]                       │
└──────────────────────────────────┘
```

### 3.2 视觉语言：体育杂志风

| 令牌     | 值               | 用途                     |
| -------- | ---------------- | ------------------------ |
| 画布背景 | `#f8f6f2`        | 米白编辑画布             |
| 油墨文字 | `#1a1a1a`        | 主要文本                 |
| 红色点缀 | `#c0392b`        | 标题下划线、按钮、选中态 |
| 卡片背景 | `#ffffff`        | 表单字段、选项卡片       |
| 边界线   | `#dddddd`        | 卡片分隔                 |
| 字体     | `Georgia, serif` | 杂志风格                 |

正文字号：14-15px，标题：20-24px，小标签：13px。

## 4. 组件树

```
App
├── CareerCreationForm      ← Step 1: 创建球员
│   ├── 球员姓名 (input)
│   ├── 家乡 (select, 14 个地区)
│   ├── 主位置 (select, 6 个位置)
│   ├── 次位置 (select, 可选)
│   ├── 惯用脚 (radio, 左/右/双)
│   ├── 逆足 (select, 1-5)
│   ├── 成长背景 (select)
│   ├── 性格倾向 (select)
│   ├── 随机种子 (input, 可选)
│   └── [开始生涯] 按钮
├── YouthOpportunityPanel   ← Step 2: 选择机会
│   ├── 机会标题 + 日期/地区
│   ├── OfferCard × 2-3
│   │   ├── 学院名称
│   │   ├── 路径描述
│   │   └── 风险标签 (低/中/高)
│   └── [确认选择] 按钮
└── BootstrapCareerSummary  ← Step 3: 生涯摘要
    ├── 球员身份卡（姓名/年龄/位置/家乡）
    ├── 初始属性摘要（6 项关键属性）
    └── 种子指纹
```

## 5. 数据流

```
User Input → CareerCreationForm
  → createCareerSave(params) → CareerSave
  → createAdvanceToDecision(content)(params) → CareerSave (with pendingOpportunity)
  → YouthOpportunityPanel
    → submitYouthChoice(content)(save, offerId) → CareerSave (with academyId)
    → BootstrapCareerSummary
```

- 所有模拟逻辑调用 `@football/application` 的用例
- 内容数据（地区列表）通过 `@football/content` 的 `getRegionProfile`、`getAllRegions` 等函数获取
- UI 只持有不可变的 `CareerSave` 快照，不直接修改模拟状态

## 6. 组件 props 接口

### CareerCreationForm

```ts
interface CareerCreationFormProps {
  onComplete: (save: CareerSave) => void;
  content: BootstrapContentPort;
}
```

### YouthOpportunityPanel

```ts
interface YouthOpportunityPanelProps {
  opportunity: YouthOpportunity;
  onChoose: (offerId: string) => void;
  disabled?: boolean;
}
```

### BootstrapCareerSummary

```ts
interface BootstrapCareerSummaryProps {
  save: CareerSave;
}
```

## 7. 表单字段与校验

| 字段     | 类型   | 必填 | 约束                                      |
| -------- | ------ | ---- | ----------------------------------------- |
| 姓名     | text   | 是   | 1-40 字符                                 |
| 家乡     | select | 是   | 从 14 个地区中选                          |
| 主位置   | select | 是   | 6 个外场位置                              |
| 次位置   | select | 否   | 不能与主位置相同                          |
| 惯用脚   | radio  | 是   | 左/右/双                                  |
| 逆足     | select | 是   | 1-5                                       |
| 成长背景 | select | 是   | academy/school/community/late-bloomer     |
| 性格倾向 | select | 是   | ambitious/composed/disciplined/expressive |
| 种子     | text   | 否   | 留空时自动生成                            |

## 8. 状态管理

使用 React `useState` 管理三个步骤的可见性：

```ts
type FlowStep = 'creation' | 'opportunity' | 'summary';
const [step, setStep] = useState<FlowStep>('creation');
const [save, setSave] = useState<CareerSave | null>(null);
```

不引入全局状态管理库，当前切片不需要。

## 9. 测试

### 组件测试（Vitest + Testing Library）

- 表单渲染所有字段
- 提交有效数据后调用 onComplete
- 显示校验错误消息
- 青年机会面板渲染正确数量的选项
- 选择后按钮禁用
- 生涯摘要显示正确信息

### 端到端测试（Playwright）

- 桌面端（1440×900）完整流程
- 移动端（Pixel 7）完整流程
- 同一种子产生相同结果
- 无水平溢出

## 10. 待实现文件

```
apps/web/
├── index.html
├── vite.config.ts
├── src/
│   ├── index.tsx                      ← 入口（替换 index.ts）
│   ├── app/
│   │   ├── App.tsx                    ← 主组件，管理步骤切换
│   │   ├── app.css                    ← 全局样式
│   │   └── bootstrap-dependencies.ts  ← 依赖装配
│   ├── career-creation/
│   │   ├── CareerCreationForm.tsx
│   │   └── creation-options.ts        ← 选项常量（位置、背景等）
│   ├── event-choice/
│   │   └── YouthOpportunityPanel.tsx
│   ├── career-dashboard/
│   │   └── BootstrapCareerSummary.tsx
│   └── design-system/
│       └── tokens.css                 ← 设计令牌 CSS 变量
├── tests/
│   ├── bootstrap-flow.test.tsx        ← 组件测试
│   └── e2e/
│       └── bootstrap-career.spec.ts   ← E2E 测试
```
