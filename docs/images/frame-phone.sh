#!/usr/bin/env bash
# Wrap a raw screen capture in a phone bezel. Needs ImageMagick 7 (`brew install imagemagick`).
#
#   ./frame-phone.sh capture.png library.png
#
# Give it a *raw* capture, never an already-framed image: the second pass would
# put a bezel around the bezel. See README.md in this directory.
set -euo pipefail
in=$1
out=$2

W=$(magick identify -format '%w' "$in")
H=$(magick identify -format '%h' "$in")

BEZEL_SIDE=16      # the rails, left and right
BEZEL_TOP=32       # thicker: it holds the speaker and the camera
BEZEL_BOTTOM=32    # matched to the top, so the phone reads as symmetrical
RADIUS_SCREEN=28
RADIUS_OUTER=52

CW=$((W + 2 * BEZEL_SIDE))
CH=$((H + BEZEL_TOP + BEZEL_BOTTOM))
MID=$((CW / 2))
EYE=$((BEZEL_TOP / 2))

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Round the capture's own corners, so the screen ends where the glass would.
magick -size "${W}x${H}" xc:none -fill white \
  -draw "roundrectangle 0,0,$((W - 1)),$((H - 1)),$RADIUS_SCREEN,$RADIUS_SCREEN" "$tmp/mask.png"
magick "$in" "$tmp/mask.png" -alpha off -compose CopyOpacity -composite "$tmp/screen.png"

# The body, on transparency: it sits on a light and a dark README alike.
magick -size "${CW}x${CH}" xc:none \
  -fill '#22252c' -stroke '#4b515d' -strokewidth 2 \
  -draw "roundrectangle 1,1,$((CW - 2)),$((CH - 2)),$RADIUS_OUTER,$RADIUS_OUTER" \
  "$tmp/screen.png" -geometry "+${BEZEL_SIDE}+${BEZEL_TOP}" -composite \
  -stroke none \
  -fill '#3a3f49' -draw "roundrectangle $((MID - 38)),$((EYE - 3)),$((MID + 22)),$((EYE + 3)),3,3" \
  -fill '#32363f' -draw "circle $((MID + 36)),${EYE} $((MID + 41)),${EYE}" \
  -depth 8 -strip "$out"
