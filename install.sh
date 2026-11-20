#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$HOME/.gemini/antigravity/theme-patch"
TARGET_USER_DIR="$BASE_DIR/user"
UPSTREAM_REPO="https://github.com/Anarcadia/chuanban-antigravity-theme-patch.git"

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
      echo "  --upgrade-core  即使本机已安装船板原版，也重新拉取最新上游内核升级"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# 1. 自动检测并安装/升级上游船板补丁
if [[ ! -f "$BASE_DIR/install.mjs" || "$UPGRADE_CORE" -eq 1 ]]; then
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

  echo "[addon] 正在安装上游船板内核与后台守护进程..."
  (cd "$TMP_UPSTREAM" && node install.mjs install)
else
  echo "[addon] 已检测到本机船板补丁 ($BASE_DIR)，跳过上游安装（如需升级可加 --upgrade-core）。"
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
