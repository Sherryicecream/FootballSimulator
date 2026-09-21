# 交付、启动与移动端使用设计

日期：2026-09-21
状态：待用户审核
范围：GitHub 保存与推送、GitHub Pages、Windows 双击启动、Android 使用说明

## 1. 目标

本设计把当前已经完成的足球生涯模拟器整理为可交付版本：

1. 项目成果可通过 Git 提交保存，并推送到现有 GitHub 远程仓库。
2. Windows 用户无需手动输入命令即可双击启动本地版本。
3. Android 用户可以通过 GitHub Pages HTTPS 地址直接使用，并可添加到主屏幕。
4. 开发者仍可通过同一个 pnpm 入口运行局域网版本，供手机测试和离线开发。
5. 不修改 simulation/application 的比赛、成长、存档和随机规则。

## 2. 方案选择

采用“双模式”交付：

- 在线模式：GitHub Actions 构建 apps/web，并部署到 GitHub Pages。仓库名为 FootballSimulator，因此生产路径为 `/FootballSimulator/`。
- 本地模式：Windows 启动器运行开发服务器，并绑定局域网地址。Android 与电脑连接同一 Wi-Fi 后访问电脑地址。

不采用单独的桌面壳或 Android 原生容器。当前应用已经是 PWA，增加 Electron、Tauri 或 Capacitor 会引入额外打包、更新和权限维护成本，不符合当前“先方便使用”的目标。

## 3. 组件与职责

### 3.1 Vite 构建路径

- `VITE_BASE_PATH` 控制部署前缀；本地默认为 `/`，GitHub Pages 构建时为 `/FootballSimulator/`。
- `index.html` 使用 Vite 的 `BASE_URL` 替换 manifest 与图标地址。
- manifest 使用相对的 `start_url`、`scope` 和图标地址，使根路径与仓库子路径均可安装。

### 3.2 Service Worker

- 注册地址基于 `import.meta.env.BASE_URL`，不再固定为 `/sw.js`。
- 预缓存根路径从 Service Worker 的注册 scope 推导，兼容 `/` 和 `/FootballSimulator/`。
- 离线导航回退到当前部署前缀下的 `index.html`。
- 缓存键继续版本化；更新版本时删除旧缓存。

### 3.3 Windows 启动器

新增根目录双击入口 `启动足球模拟器.cmd`：

- 检查 `node` 和 `pnpm` 是否可用；缺少时给出可读提示。
- 检测依赖目录，不存在时执行一次 `pnpm install`。
- 启动绑定 `0.0.0.0` 的开发服务器。
- 打开 `http://127.0.0.1:5173/`。
- 显示可供 Android 访问的局域网地址；不自动修改 Windows 防火墙。
- 开发服务器保持独立窗口，用户可以关闭该窗口停止服务。

启动器只负责开发/本地使用，不参与 GitHub Pages 构建，也不写入生涯存档。

### 3.4 GitHub Actions

新增 Pages workflow：

- 触发分支：当前交付分支和 `master`，另支持手动触发。
- 使用项目锁定的 pnpm、Node 版本和 frozen lockfile。
- 构建时注入仓库子路径。
- 使用 GitHub Pages 官方 artifact/deploy action 发布 `apps/web/dist`。
- 只申请 `contents: read`、`pages: write`、`id-token: write` 权限。

GitHub 仓库需要在 Settings → Pages 中选择 GitHub Actions 作为发布来源。部署成功后，地址为：

`https://sherryicecream.github.io/FootballSimulator/`

## 4. Git 保存策略

当前工作区已有多个阶段的完整实现改动，不能使用 reset、checkout 或清理命令。保存策略为：

1. 先检查 staged diff、未跟踪文件和敏感文件，确认 `.env`、token、构建产物不会进入提交。
2. 将当前已完成的项目成果建立一个可恢复的基线提交。
3. 将 GitHub Pages、启动器、PWA 子路径适配和安装说明作为独立交付提交。
4. 运行最终验证后，将当前分支推送到 `origin/career-experience-upgrade`。
5. 不强制推送，不自动合并 `master`；是否合并由用户决定。

## 5. Android 操作路径

### 在线版本

1. 等待 GitHub Actions 显示 Pages 部署成功。
2. Android Chrome 打开 GitHub Pages 地址。
3. 选择“安装应用”或“添加到主屏幕”。
4. 从主屏幕进入，应用以 standalone PWA 运行。

### 局域网版本

1. Windows 双击启动器。
2. Android 与电脑连接同一 Wi-Fi。
3. 打开启动器显示的 `http://电脑局域网 IPv4:5173/`。
4. 局域网 HTTP 用于测试，不保证浏览器提供 PWA 安装入口；需要安装到主屏幕时使用 HTTPS 的 GitHub Pages 版本。

## 6. 验证范围

- PWA 资源测试：根路径和 Pages 子路径的 manifest、图标、Service Worker 地址。
- 启动器静态检查：依赖检查、服务器命令、浏览器入口和局域网提示。
- GitHub workflow YAML 格式和构建路径检查。
- `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test:e2e`。
- 生产构建后检查 `apps/web/dist` 中的 manifest、Service Worker 和子路径资源。

## 7. 不做的事

- 不把 GitHub token、AI API key 或 `.env` 推送到仓库。
- 不自动创建或上传真实 Windows `.lnk` 快捷方式；用户可以对 `.cmd` 使用“发送到桌面快捷方式”。
- 不自动修改 Windows 防火墙规则。
- 不把 AI 服务变成在线版本的硬依赖。
- 不宣称真人 20 分钟体验已经通过；该结论仍依赖真人测试记录。

## 8. 回滚与失败处理

- GitHub Pages 构建失败时，保留上一次成功部署，不影响本地启动器。
- Pages 子路径资源失败时，优先检查 `VITE_BASE_PATH`、manifest、Service Worker scope 和仓库 Pages 设置。
- 本地启动器失败时，保留 pnpm dev 和 pnpm dev:lan 作为备用入口。
- Git 推送失败时只保留本地提交，记录远程认证或分支保护原因，不强行覆盖远程历史。
