#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/Users/evanwawrykow/Documents/Warriors Website/mobile/warriors-hq-app"
EXPO_PORT="8081"
LOCK_FILE="/tmp/warriors-mobile-run.lock"

cleanup() {
  rm -f "$LOCK_FILE" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

if [[ -f "$LOCK_FILE" ]]; then
  old_pid=$(cat "$LOCK_FILE" 2>/dev/null || true)
  if [[ -n "${old_pid}" ]] && ps -p "$old_pid" >/dev/null 2>&1; then
    echo "[mobile-run] Another launcher is already running (pid $old_pid)."
    echo "[mobile-run] If it is stuck, run: kill $old_pid"
    exit 1
  fi
fi
echo "$$" > "$LOCK_FILE"

cd "$APP_DIR"

detect_backend_port() {
  for p in 3000 3001 3002; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${p}/api/public/events" | rg -q '^200$'; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

if BACKEND_PORT=$(detect_backend_port); then
  API_URL="http://localhost:${BACKEND_PORT}"
else
  API_URL="http://localhost:3000"
  echo "[mobile-run] Backend was not detected on :3000/:3001/:3002."
  echo "[mobile-run] Start backend separately, then retry login if it fails."
fi

if [[ -f .env ]]; then
  if rg -q '^EXPO_PUBLIC_API_BASE_URL=' .env; then
    perl -0777 -pe "s#^EXPO_PUBLIC_API_BASE_URL=.*\$#EXPO_PUBLIC_API_BASE_URL=${API_URL}#m" .env > .env.tmp && mv .env.tmp .env
  else
    echo "EXPO_PUBLIC_API_BASE_URL=${API_URL}" >> .env
  fi
else
  cp .env.example .env
  perl -0777 -pe "s#^EXPO_PUBLIC_API_BASE_URL=.*\$#EXPO_PUBLIC_API_BASE_URL=${API_URL}#m" .env > .env.tmp && mv .env.tmp .env
fi

echo "[mobile-run] Using API base URL: $(rg '^EXPO_PUBLIC_API_BASE_URL=' .env | cut -d= -f2-)"
echo "[mobile-run] Starting Expo (iOS). Keep this terminal open."

if lsof -nP -iTCP:${EXPO_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  METRO_PIDS=$(lsof -nP -tiTCP:${EXPO_PORT} -sTCP:LISTEN 2>/dev/null || true)
  for pid in $METRO_PIDS; do
    cmd=$(ps -p "$pid" -o command= || true)
    if [[ "$cmd" == *"expo"* ]] || [[ "$cmd" == *"node"* ]]; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  sleep 1
fi

npx expo start -c --ios --port "${EXPO_PORT}"
