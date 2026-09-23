# The screenshots in the README

`library.png` and `game.png` are the two screens the main README shows, and each one is a raw
capture already wrapped in a phone bezel by `frame-phone.sh`.

**The bezel is baked into the PNG on purpose.** GitHub strips `style` attributes and `<style>`
blocks out of a README, so there is no border-radius, no shadow and no frame to be had in
markup: an image either arrives with its frame or it does not get one.

**The framed file is the only file.** The raw capture is not kept beside it, which is what keeps
the two from drifting apart — there is no second image to forget to rebuild, and no command
anyone has to remember to run. The price is that the bezel cannot be re-styled without
re-capturing the screen.

## Replacing a screenshot

Capture the screen, then frame the capture before committing it:

```sh
./frame-phone.sh ~/Desktop/capture.png library.png
```

Pass the **raw** capture. Running the script over `library.png` would put a bezel around the
bezel, and the result looks almost right, which is the problem with it.

The script needs ImageMagick 7 (`brew install imagemagick`). Nothing in the repository depends
on it — no test, no workflow, no other command — so it costs nothing to not have installed until
the day a screenshot changes.

Captures run about 450 px wide; the README lays the two out side by side at 46% each.
