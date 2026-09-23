# The screenshots in the README

`library.png` and `game.png` are the two screens the main README shows. Each one is a raw capture
put inside a phone by `frame-phone.sh`: metal rail, black bezel, side buttons, a status bar and a
home indicator.

**The phone is baked into the PNG on purpose.** GitHub strips `style` attributes and `<style>`
blocks out of a README, so there is no border-radius, no gradient and no frame to be had in
markup: an image either arrives with its body or it does not get one.

**The framed file is the only file.** The raw capture is not kept beside it, which is what keeps
the two from drifting apart — there is no second image to forget to rebuild, and no command
anyone has to remember to run. The price is that the phone cannot be restyled without
re-capturing the screens.

## What the script adds that the capture does not have

The screen is **19.5:9**, the shape of a real phone, and every capture is cut to it from the top.
That is what makes the two images the same height whatever was captured — the README stands them
side by side, and two phones of different lengths read as a mistake.

The **status bar** is drawn, because the app draws under it and the capture starts below it. Its
background is the capture's own top row stretched upward, so a game's hero image runs up behind
the clock instead of meeting a flat band of colour. The **home indicator** is drawn over the foot
of the content rather than given a band of its own, which is where a phone puts it, and which
avoids stretching a row of achievement icons into a smear of stripes.

## Replacing a screenshot

Capture the screen, then frame the capture before committing it:

```sh
./frame-phone.sh ~/Desktop/capture.png library.png
```

Pass the **raw** capture. Running the script over `library.png` would put a phone around the
phone, and the result looks almost right, which is the problem with it. A capture shorter than
the screen is refused rather than stretched.

The script needs ImageMagick 7 (`brew install imagemagick`) and a font — it reaches for macOS's
`/System/Library/Fonts/SFNS.ttf`, and `PHONE_FRAME_FONT=/path/to/font.ttf` points it elsewhere.
Nothing in the repository depends on either: no test, no workflow, no other command. There is
nothing to install until the day a screenshot changes.

Captures run about 450 px wide, which is the width the screen is cut to.
