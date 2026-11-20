# Antigravity Theme Addon（船板 v5.5.2+ 视觉精修与上下文圆环扩展包）

### 🤖 懒人安装方式（复制下面这句话直接发给 AI 即可）

```text
请读取 https://github.com/JaffryGao/antigravity-theme-addon 仓库里的 SKILL.md，帮我自动安装这个 Antigravity 主题扩展包。
```

> AI 会自动检测你的本机状态（未装原版 / 老版 `< 5.3.0` / 已装 `>= 5.3.0`）并全自动完成安装与验收。

---

面向 [**Anarcadia/chuanban-antigravity-theme-patch**](https://github.com/Anarcadia/chuanban-antigravity-theme-patch)（`v5.3.0+` / `v5.5.2+`）的个人无侵入 `user/` 改装层组合包。

零修改上游 `core/` 内核、不触碰客户端 `.asar` 与系统签名；安装后由船板守护进程在 **2.5 秒内热重载生效**，上游升级时 `user/` 层自动保留不被覆盖。

---

## ✨ 包含特性

1. **「设置 → 外观 → 主题」原生胶囊 6 键扩展（放出全部白天主题）**
   - 船板原版仅在外观设置胶囊里加入了 1 个深色书卷按钮（4 键），另外两套白天主题需要手动改配置。
   - 本扩展无侵入地在同一个原生主题切换胶囊中补齐另外两套白天主题，形成 **6 键原生图标排布**（对比官方 3 键多出全部 3 套精选主题）：
     - `🖥️ 跟随系统` ｜ `☀️ 书卷暖白` ｜ `✨ Claude 净白` ｜ `📜 复古羊皮纸` ｜ `📖 暖纸深夜` ｜ `🌙 官方冷黑`
   - 点一下 **0ms 秒切** 并自动持久化记住，**零改动 `core/` 内核**，不破坏原版校验。
2. **可视化上下文容量圆环 + 分段仪表盘（`user/custom.js` + `user/custom.css`）**
   - 输入框底栏纯文本升级为 **SVG 环形进度条胶囊** + 精简速度/输出显示。
   - 按占用率自动切换 **四档健康色**（`<50%` 绿 / `50–74%` 琥珀 / `75–89%` 橙 / `≥90%` 红）。
   - 悬停预览、点击固定弹出**分段容量仪表盘**（直观区分缓存命中与本轮新增、三栏容量卡片、四栏速率/缓存指标）。
3. **五色文件胶囊 + 行内代码强化 + 古典衬线数字对齐（`user/custom.css`）**
   - 对话中的可点击文件链接按后缀自动配色：`.js/.mjs`（琥珀金）、`.json`（暖橙）、`.css`（靛蓝）、`.ts/.tsx`（蔚蓝）、`.md`（翠绿）。
   - 强化行内代码（`` `code` ``）边框与对比度，并通过 `lining-nums` 修复 `Anthropic Serif` 衬线体数字高低错位。

---

## 🔧 在上游基础上的二次优化与修复

本仓库并非简单搬运，而是针对实际使用中发现的视觉细节做了以下精修：

1. **修复上下文圆环胶囊点击固定后“四角露绿边” Bug**
   - 原版在 `:hover` 与 `[data-pinned="1"]` 时使用了外扩 `box-shadow: 0 0 0 1.5px`，因底栏父容器 `overflow: hidden` 裁切上下边缘，导致仅露出左右四个深色圆角；现已移除外扩阴影，改为干净的自身边框微加深。
2. **补全五色文件胶囊与行内代码的昼夜双模自适应**
   - 原版配色仅面向浅色模式硬编码，在黑夜模式（`claude-warm` / `onyx`）下底色刺眼；现已拆分为 `body:not(.dark)`（温润纸感）与 `body.dark`（低饱和半透明柔光）两套完整配色。
3. **优化胶囊与行内代码的纵向行距，解决上下行贴死问题**
   - 收紧文件胶囊（`line-height: 1.32`、纵向 `padding: 0`）与行内代码的纵向占位，补充水平微距（`margin: 0 2px`），并为列表项 `li` 增加适度上下呼吸间距，防止上下行同时出现胶囊与代码时边界相撞。
4. **剔除高干扰动画与过时内核依赖**
   - 移除了原扩展中风格冲突的旋转加载光环，且完全剥离旧版 `core/`，100% 运行在船板最新 `v5.5.2+` 的 `user/` 改装层上。

---

## 🙏 来源与开源致谢

本扩展包站在以下三位开源作者的肩膀上二次整合与微调，所有底层框架与原始设计功劳归属原作者：

- **底层主题、字体与 CDP 注入框架**：[Anarcadia/chuanban-antigravity-theme-patch](https://github.com/Anarcadia/chuanban-antigravity-theme-patch)（`v5.5.2+`）
- **上下文进度圆环胶囊与分段仪表盘实现**：[huibozi/antigravity-context-ring](https://github.com/huibozi/antigravity-context-ring)
- **五色文件胶囊、行内代码强化与衬线数字对齐灵感**：[joker124zx/antigravity-full-zh-theme-skill](https://github.com/joker124zx/antigravity-full-zh-theme-skill)

---

## 📦 一键部署指南（macOS / Linux，全自动一步到位）

> **智能检测逻辑**：运行 `./install.sh` 时会自动检测本机环境与 `~/.gemini/antigravity/theme-patch` 状态：
> - **未安装原版船板**：自动从 GitHub 拉取最新 `Anarcadia/chuanban-antigravity-theme-patch` 并完成安装（自动检测本机 Antigravity 客户端并注册后台守护进程），随后自动叠加本扩展。
> - **已安装原版但版本 `< 5.3.0`**：自动拉取最新上游船板内核升级后再叠加本扩展，确保兼容。
> - **已安装原版且版本 `>= 5.3.0`**：保留现有上游内核不动，仅自动备份原 `user/` 目录并写入本扩展（2.5 秒热重载生效）。

```bash
git clone --depth 1 https://github.com/JaffryGao/antigravity-theme-addon.git
cd antigravity-theme-addon
chmod +x install.sh uninstall.sh

# 一键全自动安装（自动补装上游原版 + 叠加本扩展）
./install.sh

# 可选参数：
./install.sh --keep-config    # 保留你现有的 config.json
./install.sh --upgrade-core   # 顺便拉取最新上游船板内核升级
```

等待 **2.5 秒** 即可自动热重载生效。*(首次在新电脑上安装后，如 Antigravity 正在运行，退出重开一次即可由 M2 自动接力生效。)*

### 卸载还原
```bash
./uninstall.sh
```
会自动从安装前生成的 `user.bak.*` 备份恢复原状。
