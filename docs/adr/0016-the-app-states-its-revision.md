# The app states its revision, it does not detect that it is behind

The running app names the commit it was built from. It never asks anyone what the current commit
is, and never announces that a newer one exists. Recognising a stale tab is the reader's act,
performed with information the app has put in front of them.

## What it binds

Nothing yet: this is decided ahead of the work in #106, because the option it rejects is the one a
later reasonable-sounding request will ask for. The decision binds:

- `Revision`, the term `CONTEXT.md` now carries — what the running JavaScript declares about its
  own origin, being a short commit or the word `dev`.
- The profile header, which states it beside the game count.
- The three workflows that publish a bundle, which are the only things that can know it.

## Why

**The question is asked while looking at the app.** #106 spent half an hour proving that code was
not at fault, on a page that was simply older than the deploy that fixed it. The facts needed to
end that in a second — a release list and a `git log` — were available the whole time and in the
wrong place. Moving the answer into the app is the entire fix; detecting anything is a separate
ambition that happens to also end it.

**A screenshot is the artefact that travels.** A stated revision rides along with any picture of
the screen, to a bug report, to a message, to a future reader. A banner that appears when a build
is superseded rides along with nothing: its absence is unfalsifiable, because a screenshot without
a banner and a screenshot taken before the banner could appear are the same image.

**Detection buys a new class of failure to fix the old one.** It needs an endpoint publishing the
current commit, a polling interval, network state the app does not otherwise keep, and answers for
what a bundle does when the endpoint is down or names a commit it cannot interpret. Each of those
can be wrong in a way that looks exactly like the thing it was built to diagnose.

**Ninety seconds of production being behind `main` is correct, not broken.** A deploy takes about
that long, so there is always a window in which the live site legitimately lags the branch. A
detector must either report that window as a problem or learn to tolerate it. A stated revision
describes the window accurately and leaves the judgement to whoever is reading.

**Passive composes, active does not.** Detection can be built later on top of a stated revision —
it needs one to compare against. A revision cannot be recovered from a detector that only ever
says "behind" or stays silent.

## What this does not say

It does not say a build must be silent about what it is. The Revision is a declaration, and a
declaration is allowed to be richer later — naming the channel, or the deployment — as long as it
remains something the artefact says about itself rather than something it learns by asking.

It does not forbid a staleness banner forever. It requires that anyone proposing one first say
what it does about the ninety-second window, about the endpoint being down, and about the
screenshot that shows no banner — and that they build it above a stated revision, not instead of
one.

It does not cover the native binary. No workflow builds one (#115), and `runtimeVersion` already
refuses an update whose native requirements the binary cannot honour (`4efb0a6`). The Revision
names the JavaScript that is running, which on every platform is the layer that moves.

## Considered options

**Detect and announce.** The app fetches the current commit and shows a banner when it is behind.
Rejected on the four grounds above, of which the screenshot is decisive: it fails at the exact
moment the information is most needed, which is when someone is reporting what they saw.

**Answer from outside the app, but make it easier.** A script, or a line in the deploy's summary.
Rejected because it keeps the answer where the question is not: the person looking at a stale page
is not at a terminal, and may not be the person who deployed.

**Name the API and the build time alongside the commit.** Rejected as redundancy with a cost: the
commit is a key that opens all of it, and every copy beside it can go wrong on its own. ADR-0015
made the same call about a figure and its rendering.

## Consequences

A build that does not say it is live announces `dev`. The flag that marks a live deployment is set
by the production workflows only, so forgetting it makes production understate itself — a false
alarm that whoever follows it will correct — rather than letting a preview pass for the live site.
The failure points the safe way, as the fingerprint runtime policy does.

`dev` is therefore a claim about the deployment, not about the machine: a pull-request preview is a
real deployment that says `dev`, because it is not the live site. A local build says `dev` with no
commit beside it, which is the only honest thing it can say.
