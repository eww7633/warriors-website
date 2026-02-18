#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/pgh-warriors"

if [ ! -d "$APP_DIR" ]; then
  echo "Expected app directory $APP_DIR does not exist"
  exit 1
fi

cd "$APP_DIR"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env
  set +a
fi

npm ci
npm run build
npx pm2 startOrReload ecosystem.config.cjs --update-env
npx pm2 save

echo "Deployment complete."
EOF && chmod +x /Users/evanwawrykow/Documents/Warriors\ Website/scripts/deploy-bluehost.sh
