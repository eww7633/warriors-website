#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/release-main.sh \"commit message\""
  exit 1
fi

COMMIT_MESSAGE="$1"

npm run build
git add .

if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

git commit -m "$COMMIT_MESSAGE"
git push origin main

echo "Release push complete."
