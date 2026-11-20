---
name: antigravity-theme-addon
description: 基于船板 Antigravity 主题补丁（v5.3.0+ / v5.5.2+）的无侵入 user/ 视觉精修与功能扩展包：外观设置原生 6 键主题切换（放出全部 3 套白天主题 + 2 套黑夜主题）、可视化上下文容量圆环与分段仪表盘、昼夜双模五色文件胶囊、行内代码强化与间距修复。当用户把本仓库链接发给 AI 要求“帮我安装这个 Antigravity 主题/扩展”时触发。
---

# Antigravity Theme Addon — AI Agent 全自动部署指南

> **给执行端 AI Agent 的一句话目标**：自动兼容「未安装船板原版」「已安装 `< 5.3.0` 旧版」「已安装 `>= 5.3.0` 新版」三种本机状态，零改动上游 `core/` 内核，完成无损部署与实机验收。

---

## 执行红线

1. **严禁篡改上游 `core/` 内核或直接修改 `Antigravity.app` 的 `app.asar`**。本扩展 100% 运行在 `user/` 层。
2. **防自断会话**：如果当前你正运行在 Antigravity 客户端内部对话中，且 `doctor` 返回 `"cdpStatus": "missing_opt_in_flag"`，**严禁强杀或同步重启 Antigravity**；请完成文件部署后提示用户手动退出重开一次 Antigravity（M2 守护进程会自动接力生效）。
3. **部署前必须备份原有 `user/` 目录**，保证随时可 100% 还原。

---

## 标准部署流程（全平台兼容）

### 场景 1：macOS / Linux（推荐直接运行 `install.sh`）

本仓库自带的 `install.sh` 已完整内置三种状态判断（未安装 / `< 5.3.0` / `>= 5.3.0`）：

```bash
chmod +x install.sh uninstall.sh
./install.sh
```

- **未安装原版船板**：脚本自动拉取最新 `Anarcadia/chuanban-antigravity-theme-patch` 并执行 `node install.mjs install`（自动检测本机 Antigravity 并注册后台服务），再叠加本仓库 `user/`。
- **已安装原版但版本 `< 5.3.0`**：自动拉取最新上游升级内核，再叠加本仓库 `user/`。
- **已安装原版且版本 `>= 5.3.0`**：保留原版内核不动，自动备份旧 `user/` 为 `user.bak.<时间戳>`，写入本仓库 `user/` 4 件套（2.5 秒热重载生效）。
- 如用户希望保留自己原有的 `config.json`（不切默认配色），改用 `./install.sh --keep-config`。

### 场景 2：Windows (PowerShell)

1. 检查 `$HOME\.gemini\antigravity\theme-patch\core\manifest.json` 是否存在且 `version >= 5.3.0`：
   - 若不存在或低于 `5.3.0`：先克隆 `https://github.com/Anarcadia/chuanban-antigravity-theme-patch.git` 到临时目录并运行 `node install.mjs install`。
2. 备份并叠加本仓库 `user/` 目录：
   ```powershell
   $u = "$env:USERPROFILE\.gemini\antigravity\theme-patch\user"
   if (Test-Path $u) { Copy-Item $u "$u.bak.$(Get-Date -Format yyyyMMddHHmmss)" -Recurse -Force }
   New-Item -ItemType Directory -Force -Path $u | Out-Null
   Copy-Item ".\user\*" $u -Force
   ```

---

## 验收与可选字体补齐

部署完成后，执行：

```bash
# macOS / Linux
node ~/.gemini/antigravity/theme-patch/install.mjs verify
node ~/.gemini/antigravity/theme-patch/install.mjs doctor
```

1. **实机验证**：若 `verify` 输出 `"ok": true` 且 `"hasUserStyle": true`，说明 6 键外观胶囊、上下文圆环与五色文件胶囊已热重载生效。
2. **端口未开启提示**：若 `doctor` 显示 `cdpStatus: "missing_opt_in_flag"`，告知用户补丁与后台守护已就绪，退出重开一次 Antigravity 即可自动生效。
3. **字体检查**：若 `doctor` 的 `fonts.allRequiredInstalled === false`，可主动询问用户是否需要顺手补装：
   - macOS 更纱黑体：`brew install --cask font-sarasa-gothic`（或下载精简简中拆分包）
   - Anthropic Serif / Mono：可从上游 Google Drive 资源包下载后用 `node ~/.gemini/antigravity/theme-patch/install.mjs install-fonts --from "<目录>"` 一键注册。
