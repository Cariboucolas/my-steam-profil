# A story shows a state, the device settles how it looks

Storybook runs on the web, through `react-native-web`, and never on the device. What a story is
trusted for is the state it puts a component in — a withheld Playtime, an undated Unlock, a
shortened headline — not the pixels it draws. Whenever the two disagree, the app on a phone is
right and the story is an approximation.

## What it binds

Nothing yet: this is decided in #75, ahead of the work. The decision binds:

- The Storybook framework, `@storybook/react-native-web-vite`, and every story written for it.
- Every question of rendering — typography, measured widths, shadows, safe areas — which is
  settled on a device or in the running app, never in Storybook alone. ADR-0011 to ADR-0014 are
  the kind of decision this keeps out of it.
- The `prototype/*` branch practice #29 used, which remains the instrument for a question about
  the room a screen actually leaves.

## Why

**Its readers need an address.** The gallery is read by the maintainer and by agents. An agent can
open `?path=/story/...` in a browser and look at one state, reproducibly; it cannot reliably drive
an on-device Storybook inside a simulator. A story that has a URL is a state anyone can point at.

**The web target is already paid for.** `react-native-web` is a dependency, `pnpm build:web` runs
in CI, and every pull request already deploys to Pages. The on-device variant would ship
Storybook inside the app behind a flag, to buy a fidelity this decision does not ask the gallery
for.

**What is hard to reach is the state, not the rendering.** A private profile, a library whose
hours Steam withholds, a calendar on 1 January — these take setup to see in the app and one click
in a gallery. The rendering of any of them is reachable on a phone in seconds once the state is.

## What this does not say

It does not say the web rendering is wrong. It says it is not the reference, so a story that looks
off is a question to ask on a device before it is a bug.

It does not make Storybook a regression net. No pixel of a story is compared against anything;
what guards the stories is that each one renders, in Jest.

## Considered options

**On-device, through `@storybook/react-native`.** Native pixels, at the cost of the address:
rejected because its readers could not reach it.

**Both.** Two configurations to keep in step for one gallery, and a standing question of which one
a disagreement belongs to. Rejected; the device already answers that question.
