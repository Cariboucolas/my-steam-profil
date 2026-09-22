# An alert crosses a bridge we own, and the bridge cannot alert about itself

Sentry's alerts reach a dedicated Discord server through `apps/alerts`, a Worker of ours that
verifies Sentry's signature and translates one payload into the other. Nothing watches that
Worker. If it stops carrying alerts, the silence is indistinguishable from nothing having gone
wrong — which is the failure ADR-0017 and #108 exist to end, reintroduced one level up, and
accepted here with its eyes open.

## What it binds

- `apps/alerts`, its two secrets, and the job that deploys it.
- The Sentry alert rule, which fires on a new issue and on nothing else.

## Why

**The free path speaks the wrong language.** Sentry's own Discord integration needs the Team
plan, as Slack does. What the Developer plan does allow is a *custom internal integration* with
an alert rule action — a webhook, posting Sentry's JSON to an address of ours. Discord rejects
any body without `content` or `embeds`. So the choice was never "Discord or a bridge": it was a
bridge, or not Discord.

**A dedicated channel is the whole reason for the channel.** Email was reconsidered when the
price of Discord stopped being zero, and declined again: a mailbox already carries noise, so a
rare and important message decays there by sitting next to ordinary ones. A server that only
ever receives this makes every notification in it signal by construction. The cost is sixty
lines and a deployment; what it buys is that the alert still means something in a year.

**It does not belong in `apps/api`.** That Worker exists to hold `STEAM_API_KEY` and expose
three narrow endpoints to the app (ADR-0001, ADR-0003). A public webhook receiver is not of that
domain, and putting it there would widen the surface of the one service that holds the secret.
A separate Worker costs a `wrangler.jsonc`, a job and two secrets, and keeps that boundary
where the earlier ADRs drew it.

**The signature is the only thing between a stranger and a real-looking alert.** The endpoint
must be reachable by Sentry, which is to say by anyone who finds the address. So an unsigned
request is the ordinary case rather than the exception, and `Sentry-Hook-Signature` — HMAC-SHA256
over the raw body with the integration's client secret — is checked before anything else is
read. The *raw* body: Sentry's own example hashes a re-serialised object, which holds only as
long as two JSON encoders agree on key order and whitespace.

## What this does not say

**It does not claim the bridge is monitored.** It is not. Three things see a failure, and none
of them is a notification: Sentry shows failed webhook deliveries in its own UI, the Worker's
own Workers Logs record why it refused, and a 502 is what Sentry is told. All three require
somebody to already suspect something. #120, if it ever ends in a scheduled check, is the
natural place to also probe this Worker — and that is the honest fix, not a claim that this one
is somehow exempt.

**It does not make Discord the only channel.** Sentry's email notifications remain available
and cost nothing to turn on beside this. Should the bridge prove flaky, the answer is to enable
them as a floor rather than to debug in the dark.

**It does not cover what is not a failure.** Sentry posts installation and comment events to
the same endpoint. They are verified, accepted, and dropped: waking someone for them would
spend the one thing this channel has.

## Considered options

**Email only.** Free, native, nothing to write or deploy, and no bridge to go quiet. Rejected
on the decay argument above — and reconsidered once, when Discord turned out to cost something,
which is the right time to have reconsidered it.

**A route in `apps/api`.** No new deployment, and the bridge would have inherited the logging
that #119 put there. Rejected on the boundary: `apps/api` is the one place holding the Steam
key, and a public webhook receiver has no business sharing it.

**The Team plan.** Sentry's Discord integration, supported and maintained by someone else.
Rejected on price for a personal project — not on principle, and worth revisiting if this ever
has more than one reader.

## Consequences

**Two secrets, posted by hand.** `SENTRY_CLIENT_SECRET` proves a request is Sentry's;
`DISCORD_WEBHOOK_URL` *is* a credential, since anyone holding it can post into the channel.
Neither is in `wrangler.jsonc`, and neither is a repository variable. Deploying before they
exist is safe: the Worker answers 503 and says which one is missing.

**A third deployment on every merge.** The release job now waits on all three, on the reasoning
it already carried: a release naming a deployment that failed is worse than no release.

**A revision is shortened the same way everywhere.** The Discord message prints seven characters
of the commit, as the release tag, the update message and the app's own header do (ADR-0016), so
what arrives in the channel can be read against what the app says about itself without
translation.
