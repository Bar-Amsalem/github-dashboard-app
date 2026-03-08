#!/usr/bin/env bash
set -euo pipefail

V="v$(node -p "require('./package.json').version")"

if git rev-parse "$V" >/dev/null 2>&1; then
  echo "Error: Tag $V already exists. Bump the version in package.json first."
  exit 1
fi

git tag "$V"
git push origin "$V"
echo "Tagged and pushed $V"
