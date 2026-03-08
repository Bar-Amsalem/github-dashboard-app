#!/usr/bin/env bash
set -euo pipefail

V="v$(node -p "require('./package.json').version")"

if git rev-parse "$V" >/dev/null 2>&1; then
  echo "Error: Tag $V already exists. Bump the version in package.json first."
  exit 1
fi

echo "==> Building and packaging..."
yarn run pack

echo "==> Tagging $V..."
git tag "$V"
git push origin "$V"

echo "==> Creating GitHub release $V with DMG..."
gh release create "$V" release/*.dmg \
  --title "$V" \
  --generate-notes \
  --latest

echo "Done! Release $V created with DMG artifacts."
