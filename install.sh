#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_USER_DIR="$HOME/.gemini/antigravity/theme-patch/user"
KEEP_CONFIG=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-config)
      KEEP_CONFIG=1
      shift
      ;;
    -h|--help)
      echo "Usage: ./install.sh [--keep-config]"
      echo "  --keep-config  Keep your existing user/config.json instead of applying default high-contrast + claude-warm"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$HOME/.gemini/antigravity/theme-patch" ]]; then
  echo "[addon] 未检测到 ~/.gemini/antigravity/theme-patch" >&2
  echo "[addon] 请先安装上游框架: https://github.com/Anarcadia/chuanban-antigravity-theme-patch" >&2
  exit 1
fi

if [[ -d "$TARGET_USER_DIR" ]]; then
  BACKUP_DIR="$HOME/.gemini/antigravity/theme-patch/user.bak.$(date +%Y%m%d%H%M%S)"
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

echo "[addon] 部署完成！船板后台守护进程将在 2.5 秒内自动热重载生效（无需重启 Antigravity）。"
