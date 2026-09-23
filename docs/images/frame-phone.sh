#!/usr/bin/env bash
# Wrap a raw screen capture in a phone. Needs ImageMagick 7 (`brew install imagemagick`).
#
#   ./frame-phone.sh capture.png library.png
#
# Give it a *raw* capture, never an already-framed image: the second pass would
# put a phone around the phone. See README.md in this directory.
#
# Every capture comes out the same size, whatever it was: the screen is a real
# phone's 19.5:9, and a capture taller than that is cut off at the bottom.
set -euo pipefail
in=$1
out=$2

FONT=${PHONE_FRAME_FONT:-/System/Library/Fonts/SFNS.ttf}
[ -f "$FONT" ] || { echo "font not found: $FONT — set PHONE_FRAME_FONT" >&2; exit 1; }

SW=450                        # screen width; captures run about this wide
SH=$((SW * 195 / 90))         # 19.5:9, the aspect ratio of the phones this app runs on
STATUS=46                     # status bar, added above the capture
HOME=26                       # home indicator, drawn over the foot of the capture
BEZEL=10                      # black between glass and rail
RAIL=4                        # the metal edge
R_OUTER=68
R_SCREEN=$((R_OUTER - BEZEL - RAIL))

BODY_W=$((SW + 2 * (BEZEL + RAIL)))
BODY_H=$((SH + 2 * (BEZEL + RAIL)))
BTN=3                         # how far the buttons stand out of the rail
CW=$((BODY_W + 2 * BTN))
CAP_H=$((SH - STATUS))

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# ---------------------------------------------------------------- the screen
# The capture, cut to the screen. A capture shorter than the screen is refused:
# stretching it would lie about the layout.
CAP_HAVE=$(magick identify -format '%h' "$in")
[ "$CAP_HAVE" -ge "$CAP_H" ] || { echo "capture is ${CAP_HAVE}px tall, needs ${CAP_H}" >&2; exit 1; }
magick "$in" -crop "${SW}x${CAP_H}+0+0" +repage "$tmp/cap.png"

# The capture has no status bar. The strip that stands in for it is the
# capture's own top row, stretched, so a hero image runs up behind the clock
# the way it does on the phone instead of meeting a flat band of colour.
magick "$tmp/cap.png" -crop "${SW}x1+0+0" +repage -resize "${SW}x${STATUS}!" "$tmp/status.png"

BAT_X=$((SW - 52))            # battery, then wifi, then signal, right to left
WIFI_X=$((SW - 86))
SIG_X=$((SW - 120))
magick "$tmp/status.png" \
  -font "$FONT" -pointsize 25 -fill white \
  -gravity West -annotate +38+1 '9:41' -gravity None \
  -fill white -stroke none \
  -draw "roundrectangle ${SIG_X},31 $((SIG_X + 3)),35 1,1" \
  -draw "roundrectangle $((SIG_X + 6)),28 $((SIG_X + 9)),35 1,1" \
  -draw "roundrectangle $((SIG_X + 12)),24 $((SIG_X + 15)),35 1,1" \
  -draw "roundrectangle $((SIG_X + 18)),21 $((SIG_X + 21)),35 1,1" \
  -fill none -stroke white -strokewidth 3 \
  -draw "arc ${WIFI_X},22 $((WIFI_X + 22)),44 222,318" \
  -strokewidth 3 -draw "arc $((WIFI_X + 6)),28 $((WIFI_X + 16)),38 216,324" \
  -stroke none -fill white -draw "circle $((WIFI_X + 11)),36 $((WIFI_X + 11)),38" \
  -fill none -stroke '#ffffff' -strokewidth 2 \
  -draw "roundrectangle ${BAT_X},22 $((BAT_X + 34)),$((22 + 16)),5,5" \
  -stroke none -fill '#ffffff' \
  -draw "roundrectangle $((BAT_X + 3)),25 $((BAT_X + 25)),35 2,2" \
  -draw "roundrectangle $((BAT_X + 36)),27 $((BAT_X + 38)),33 1,1" \
  "$tmp/status-drawn.png"

# The island is black on a black UI, which is what it looks like on the phone.
ISL_W=118
magick "$tmp/status-drawn.png" -fill '#000000' -stroke none \
  -draw "roundrectangle $(((SW - ISL_W) / 2)),8 $(((SW + ISL_W) / 2)),38 15,15" \
  "$tmp/status-final.png"

# The home indicator floats over the content, as it does on the phone. Giving
# it a band of its own would mean stretching the foot of the capture, and a row
# of achievement icons stretched 26px tall is a smear of stripes.
magick -background none "$tmp/status-final.png" "$tmp/cap.png" -append \
  -fill 'rgba(255,255,255,0.72)' -stroke none \
  -draw "roundrectangle $(((SW - 134) / 2)),$((SH - 15)) $(((SW + 134) / 2)),$((SH - 10)) 3,3" \
  "$tmp/flat.png"
magick -size "${SW}x${SH}" xc:none -fill white \
  -draw "roundrectangle 0,0,$((SW - 1)),$((SH - 1)),$R_SCREEN,$R_SCREEN" "$tmp/screen-mask.png"
magick "$tmp/flat.png" "$tmp/screen-mask.png" -alpha off -compose CopyOpacity -composite "$tmp/screen.png"

# ------------------------------------------------------------------ the body
# Brushed metal: light at the ends, dark across the middle, the way a rail
# catches a room. A flat grey is what makes a mockup look drawn.
q1=$((BODY_H * 15 / 100)); q2=$((BODY_H * 35 / 100)); q3=$((BODY_H * 35 / 100))
magick \
  \( -size "${BODY_W}x${q1}" gradient:'#e9eaee-#9a9ca2' \) \
  \( -size "${BODY_W}x${q2}" gradient:'#9a9ca2-#5c5e64' \) \
  \( -size "${BODY_W}x${q3}" gradient:'#5c5e64-#9a9ca2' \) \
  \( -size "${BODY_W}x$((BODY_H - q1 - q2 - q3))" gradient:'#9a9ca2-#e9eaee' \) \
  -append "$tmp/metal.png"

# The rail is that metal seen through a ring: the outer corner minus the inner one.
magick -size "${BODY_W}x${BODY_H}" xc:none \
  -fill white -draw "roundrectangle 0,0,$((BODY_W - 1)),$((BODY_H - 1)),$R_OUTER,$R_OUTER" \
  -fill black -draw "roundrectangle ${RAIL},${RAIL},$((BODY_W - 1 - RAIL)),$((BODY_H - 1 - RAIL)),$((R_OUTER - RAIL)),$((R_OUTER - RAIL))" \
  -alpha off "$tmp/rail-mask.png"
magick "$tmp/metal.png" "$tmp/rail-mask.png" -alpha off -compose CopyOpacity -composite "$tmp/rail.png"

magick -size "${BODY_W}x${BODY_H}" xc:none \
  -fill '#0a0a0c' -draw "roundrectangle ${RAIL},${RAIL},$((BODY_W - 1 - RAIL)),$((BODY_H - 1 - RAIL)),$((R_OUTER - RAIL)),$((R_OUTER - RAIL))" \
  "$tmp/screen.png" -geometry "+$((BEZEL + RAIL))+$((BEZEL + RAIL))" -composite \
  "$tmp/rail.png" -compose over -composite \
  "$tmp/body.png"

# --------------------------------------------------------------- the buttons
# Cut from the same metal, so they catch the light with the rail.
button() { # x1 y1 x2 y2
  magick "$tmp/canvas.png" \
    \( "$tmp/metal.png" -crop "$(($3 - $1 + 1))x$(($4 - $2 + 1))+0+$2" +repage \
       \( +clone -alpha transparent -fill white -draw "roundrectangle 0,0,$(($3 - $1)),$(($4 - $2)),2,2" \) \
       -alpha off -compose CopyOpacity -composite \) \
    -geometry "+$1+$2" -compose over -composite "$tmp/next.png"
  mv "$tmp/next.png" "$tmp/canvas.png"
}
magick -size "${CW}x${BODY_H}" xc:none -colorspace sRGB -define png:color-type=6 "$tmp/canvas.png"
button 0 $((BODY_H * 17 / 100)) $((BTN + RAIL + 1)) $((BODY_H * 17 / 100 + 26))     # mute
button 0 $((BODY_H * 23 / 100)) $((BTN + RAIL + 1)) $((BODY_H * 23 / 100 + 56))     # volume up
button 0 $((BODY_H * 30 / 100)) $((BTN + RAIL + 1)) $((BODY_H * 30 / 100 + 56))     # volume down
button $((CW - BTN - RAIL - 2)) $((BODY_H * 26 / 100)) $((CW - 1)) $((BODY_H * 26 / 100 + 84))  # side button
magick "$tmp/canvas.png" "$tmp/body.png" -geometry "+${BTN}+0" -compose over -composite \
  -colorspace sRGB -depth 8 -strip PNG32:"$out"
