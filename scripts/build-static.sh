#!/usr/bin/env bash
# 정적 웹사이트 빌드 (GitHub Pages 등). 결과물: out/
# 사용: NEXT_PUBLIC_BASE_PATH=/travel_guide NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... bash scripts/build-static.sh
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
# 정적 export 는 서버 API 라우트를 지원하지 않으므로 빌드 동안 잠시 옮겨 둔다
mv app/api "$TMP/api"
trap 'mv "$TMP/api" app/api; rm -rf "$TMP"' EXIT
rm -rf .next out
STATIC_EXPORT=1 NEXT_PUBLIC_STATIC=1 npx next build
touch out/.nojekyll
echo "✓ out/ 폴더에 정적 사이트가 만들어졌습니다"
