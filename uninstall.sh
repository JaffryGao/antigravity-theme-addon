#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$HOME/.gemini/antigravity/theme-patch"
TARGET_USER_DIR="$BASE_DIR/user"

LATEST_BACKUP="$(ls -1dt "$BASE_DIR"/user.bak.* 2>/dev/null | head -n 1 || true)"

if [[ -n "$LATEST_BACKUP" && -d "$LATEST_BACKUP" ]]; then
  rm -rf "$TARGET_USER_DIR"
  cp -R "$LATEST_BACKUP" "$TARGET_USER_DIR"
  echo "[addon] 已从最近备份还原: $LATEST_BACKUP"
else
  : > "$TARGET_USER_DIR/custom.css"
  : > "$TARGET_USER_DIR/custom.js"
  echo "[addon] 未找到备份，已清空 custom.css 与 custom.js，恢复为纯净原版样式。"
fi

echo "[addon] 卸载完成，守护进程将在 2.5 秒内自动热重载还原。"
