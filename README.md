# Antigravity Theme Addon（船板 v5.5.2+ 视觉精修与上下文圆环扩展包）

面向 [**Anarcadia/chuanban-antigravity-theme-patch**](https://github.com/Anarcadia/chuanban-antigravity-theme-patch)（`v5.5.2+`）的个人无侵入 `user/` 改装层组合包。

零修改上游 `core/` 内核、不触碰客户端 `.asar` 与系统签名；安装后由船板守护进程在 **2.5 秒内热重载生效**，上游升级时 `user/` 层自动保留不被覆盖。

---

## ✨ 包含特性

1. **推荐昼夜双模配置（`user/config.json`）**
   - 白天默认 `high-contrast`（高对比书卷暖白）
   - 黑夜默认 `claude-warm`（Claude 暖纸深夜，可在设置外观点击 📖 切换）
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

## 📦 新机一键部署指南（macOS / Linux）

### 第一步：安装底层船板补丁（如已安装可跳过）
```bash
git clone --depth 1 https://github.com/Anarcadia/chuanban-antigravity-theme-patch.git
cd chuanban-antigravity-theme-patch
node install.mjs install
```
*(建议按上游 README 补齐 Anthropic Serif / Mono 与更纱黑体字体，以获得完整排版体验。)*

### 第二步：一键叠加本扩展包
```bash
git clone --depth 1 https://github.com/JaffryGao/antigravity-theme-addon.git
cd antigravity-theme-addon
chmod +x install.sh uninstall.sh

# 默认安装（自动备份原 user/ 并应用推荐的 high-contrast + claude-warm 配置）
./install.sh

# 如希望保留你现有的 config.json，仅叠加样式与圆环插件：
./install.sh --keep-config
```

等待 **2.5 秒** 即可自动热重载生效，无需重启 Antigravity。

### 卸载还原
```bash
./uninstall.sh
```
会自动从安装前生成的 `user.bak.*` 备份恢复原状。
