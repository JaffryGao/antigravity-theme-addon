#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$HOME/.gemini/antigravity/theme-patch"
TARGET_USER_DIR="$BASE_DIR/user"
MANIFEST_FILE="$BASE_DIR/core/manifest.json"
UPSTREAM_REPO="https://github.com/Anarcadia/chuanban-antigravity-theme-patch.git"
MIN_CORE_VERSION="5.3.0"

KEEP_CONFIG=0
UPGRADE_CORE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-config)
      KEEP_CONFIG=1
      shift
      ;;
    --upgrade-core)
      UPGRADE_CORE=1
      shift
      ;;
    -h|--help)
      echo "Usage: ./install.sh [options]"
      echo "  --keep-config   保留本机已有的 user/config.json"
      echo "  --upgrade-core  即使本机已安装 >= ${MIN_CORE_VERSION} 船板原版，也重新拉取最新上游内核升级"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

check_core_status() {
  if [[ ! -f "$BASE_DIR/install.mjs" || ! -f "$MANIFEST_FILE" ]]; then
    echo "missing"
    return
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "unknown"
    return
  fi
  node -e '
    const fs = require("fs");
    const min = process.argv[2].split(".").map(Number);
    let ver = "";
    try {
      const m = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      ver = String(m.version || "").replace(/^v/i, "").split("-")[0];
    } catch (_) {}
    if (!/^\d+\.\d+\.\d+$/.test(ver)) { console.log("outdated:unknown"); process.exit(0); }
    const cur = ver.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (cur[i] > min[i]) { console.log("ok:" + ver); process.exit(0); }
      if (cur[i] < min[i]) { console.log("outdated:" + ver); process.exit(0); }
    }
    console.log("ok:" + ver);
  ' "$MANIFEST_FILE" "$MIN_CORE_VERSION"
}

CORE_STATUS="$(check_core_status)"
NEED_UPSTREAM=0

if [[ "$UPGRADE_CORE" -eq 1 ]]; then
  echo "[addon] 已指定 --upgrade-core，将拉取最新上游船板内核进行升级..."
  NEED_UPSTREAM=1
elif [[ "$CORE_STATUS" == "missing" ]]; then
  echo "[addon] 未检测到本机船板原版 ($BASE_DIR)，将自动拉取最新版安装..."
  NEED_UPSTREAM=1
elif [[ "$CORE_STATUS" == outdated:* ]]; then
  CUR_VER="${CORE_STATUS#outdated:}"
  echo "[addon] 检测到本机船板版本 (${CUR_VER}) 低于最低要求 v${MIN_CORE_VERSION}，将自动拉取最新上游升级..."
  NEED_UPSTREAM=1
elif [[ "$CORE_STATUS" == ok:* ]]; then
  CUR_VER="${CORE_STATUS#ok:}"
  echo "[addon] 已检测到本机船板原版 v${CUR_VER}（满足 >= v${MIN_CORE_VERSION}），保留现有内核（如需升级可加 --upgrade-core）。"
else
  echo "[addon] 无法识别本机船板版本，将拉取最新上游内核确保兼容..."
  NEED_UPSTREAM=1
fi

# 1. 按需自动安装或升级上游船板补丁
if [[ "$NEED_UPSTREAM" -eq 1 ]]; then
  if ! command -v node >/dev/null 2>&1; then
    echo "[addon] ERROR: 需要 Node.js >= 22.13.0，请先安装 Node.js。" >&2
    exit 1
  fi
  if ! command -v git >/dev/null 2>&1; then
    echo "[addon] ERROR: 需要 git 以自动拉取上游船板补丁。" >&2
    exit 1
  fi

  TMP_UPSTREAM="$(mktemp -d -t chuanban_upstream_XXXXXX)"
  trap 'rm -rf "$TMP_UPSTREAM"' EXIT

  echo "[addon] 正在自动拉取最新上游船板补丁 (Anarcadia/chuanban-antigravity-theme-patch)..."
  GIT_CONFIG_GLOBAL=/dev/null git clone --depth 1 "$UPSTREAM_REPO" "$TMP_UPSTREAM"

  echo "[addon] 正在安装/升级上游船板内核与后台守护进程..."
  (cd "$TMP_UPSTREAM" && node install.mjs install)
fi

# 2. 备份并部署本仓库精修 user/ 层
if [[ -d "$TARGET_USER_DIR" ]]; then
  BACKUP_DIR="$BASE_DIR/user.bak.$(date +%Y%m%d%H%M%S)"
  cp -R "$TARGET_USER_DIR" "$BACKUP_DIR"
  echo "[addon] 已备份原 user/ 目录至: $BACKUP_DIR"
else
  mkdir -p "$TARGET_USER_DIR"
fi

cp -f "$SCRIPT_DIR/user/custom.css" "$TARGET_USER_DIR/custom.css"
cp -f "$SCRIPT_DIR/user/custom.js" "$TARGET_USER_DIR/custom.js"
cp -f "$SCRIPT_DIR/user/i18n.override.json" "$TARGET_USER_DIR/i18n.override.json"

if [[ "$KEEP_CONFIG" -eq 0 ]]; then
  cp -f "$SCRIPT_DIR/user/config.json" "$TARGET_USER_DIR/config.json"
  echo "[addon] 已写入推荐配置 config.json (白天 high-contrast + 黑夜 claude-warm)"
else
  echo "[addon] 已保留原有的 config.json"
fi

echo "[addon] 部署完成！船板守护进程将在 2.5 秒内自动热重载生效。"
echo "[addon] 提示：若需完整书卷字体排版，可执行: brew install --cask font-sarasa-gothic"
