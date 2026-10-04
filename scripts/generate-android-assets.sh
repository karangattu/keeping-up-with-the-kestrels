#!/usr/bin/env bash
#
# Regenerates the Android launcher icons and splash screens from the web app's
# badge (public/icons/icon-512.png). Run after changing the badge:
#
#   ./scripts/generate-android-assets.sh
#
# Output is committed to the repo, so CI never has to run this.
# Requires ImageMagick (`brew install imagemagick`).

set -euo pipefail

cd "$(dirname "$0")/.."

SRC="public/icons/icon-512.png"
RES="android/app/src/main/res"

# Colours sampled from the badge artwork.
BG_TOP="#214951"
BG_BOTTOM="#0E2A2E"

command -v magick >/dev/null || {
  echo "ImageMagick 'magick' not found. Install it with: brew install imagemagick" >&2
  exit 1
}
[ -f "$SRC" ] || { echo "Missing source badge: $SRC" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# A square, gradient-filled background matching the badge.
gradient() {
  magick -size "$1x$2" "gradient:${BG_TOP}-${BG_BOTTOM}" "$3"
}

# The badge with everything outside its circular rim made transparent.
gradient 512 512 "$WORK/bg.png"
magick "$SRC" \
  \( -size 512x512 xc:none -fill white -draw "circle 256,256 256,4" \) \
  -alpha off -compose CopyOpacity -composite "$WORK/badge.png"

# Legacy launcher icons: the full square badge (mdpi 48 -> xxxhdpi 192).
for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir="${pair%%:*}"
  size="${pair##*:}"
  magick "$SRC" -filter Lanczos -resize "${size}x${size}" \
    -strip PNG32:"$RES/mipmap-$dir/ic_launcher.png"
  magick "$WORK/badge.png" -filter Lanczos -resize "${size}x${size}" \
    -background none -strip PNG32:"$RES/mipmap-$dir/ic_launcher_round.png"
done

# Adaptive icon foregrounds (108dp canvas -> mdpi 108 -> xxxhdpi 432).
# The badge is scaled to 64/108 so it survives every launcher mask.
for pair in mdpi:108 hdpi:162 xhdpi:216 xxhdpi:324 xxxhdpi:432; do
  dir="${pair%%:*}"
  size="${pair##*:}"
  inner=$((size * 64 / 108))
  magick -size "${size}x${size}" xc:none \
    \( "$WORK/badge.png" -filter Lanczos -resize "${inner}x${inner}" \) \
    -gravity center -composite -strip PNG32:"$RES/mipmap-$dir/ic_launcher_foreground.png"
done

# Splash screens: gradient background with the badge centred at 32% of the
# shorter edge. Capacitor expects these exact bucket sizes.
splash() {
  local out="$1" w="$2" h="$3" short
  short=$((w < h ? w : h))
  gradient "$w" "$h" "$WORK/splash-bg.png"
  magick "$WORK/splash-bg.png" \
    \( "$WORK/badge.png" -filter Lanczos -resize "$((short * 32 / 100))x$((short * 32 / 100))" \) \
    -gravity center -composite -strip PNG32:"$out"
}

for pair in mdpi:480x320 hdpi:800x480 xhdpi:1280x720 xxhdpi:1600x960 xxxhdpi:1920x1280; do
  dir="${pair%%:*}"; dims="${pair##*:}"
  splash "$RES/drawable-land-$dir/splash.png" "${dims%x*}" "${dims#*x}"
done

for pair in mdpi:320x480 hdpi:480x800 xhdpi:720x1280 xxhdpi:960x1600 xxxhdpi:1280x1920; do
  dir="${pair%%:*}"; dims="${pair##*:}"
  splash "$RES/drawable-port-$dir/splash.png" "${dims%x*}" "${dims#*x}"
done

splash "$RES/drawable/splash.png" 480 320

echo "Android launcher icons and splash screens regenerated."