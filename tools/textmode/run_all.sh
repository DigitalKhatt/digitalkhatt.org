#!/bin/sh
# Collect, patch and verify all three layouts.
set -e
SCALES=${SCALES:-0.5:1.2:0.05}
for L in newmadina:madina oldmadina:oldmadina indopak:indopak; do
  layout=${L%%:*}; font=${L##*:}
  node dist/collect.mjs --layout $layout --scales $SCALES
  python3 patch_font.py ../../ClientApp/src/assets/fonts/hb/$font.otf out/$layout-stretch.json out/$font-textmode.otf
  node dist/verify.mjs --layout $layout --font out/$font-textmode.otf --table out/$layout-stretch.json \
    --scales ${VERIFY_SCALES:-1,0.53,0.73,0.88,1.07,1.18} || true
done
