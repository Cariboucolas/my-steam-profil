# A monitor stands outside what it watches, and remembers in the tracker

`GET /health` has existed since the Worker's first deploy and is printed in every release's
notes, and nobody reads it on a schedule. So the one failure it was built to catch — the
Worker not answering, rather than answering wrongly — is the one nothing reports, because a
Worker that does not answer produces no errors to report either.

A scheduled GitHub Actions workflow probes `apps/api` and `apps/alerts`, opens an issue when
one of them stops answering, and says so in a `health` channel of the Discord server ADR-0018
established. This pays the debt ADR-0018 contracted in writing, and amends nothing in it:
that ADR is still true at its date, and what changes is that its stated limit is now covered.

## What it binds

- `tools/health-probe`, and the two callers that run it: `.github/workflows/health.yml` on a
  schedule, and `deploy.yml` after the Worker goes out.
- What the probe reads `GET /health` as meaning, and therefore what the release notes' link
  is worth. The route itself is unchanged.
- The `incident` label, the issues it marks, and the `DISCORD_HEALTH_WEBHOOK_URL` secret.

## Why

**A monitor on the platform it watches cannot report that platform being down.** A Cloudflare
Cron Trigger would have been precise to the minute, would have had the Discord credential at
hand already, and would have cost no account — and it goes silent at the exact moment its
subject does, which is the silence-indistinguishable-from-success that #108 exists to end.
GitHub Actions is the only candidate that is both off the watched platform and *inside the
repository*: versioned, reviewed in a pull request, and reasoned about here. Its cron is
best-effort and drifts, which is a price worth paying and is why the schedule reads
`7,22,37,52` — a quarter-hour, off the hour, since short intervals and round hours are what
the platform sheds first. Asking for every ten minutes to receive seventeen would make the
stated cadence a fiction.

**Three attempts, in one run.** The rule exists to absorb a transient blip in a runner, not to
be patient with a Worker that is gone. Spread across three crons it would mean three quarters
of an hour before anyone hears; inside a single run, spaced a minute, it means three minutes
and a run that carries its own verdict.

**The memory is an issue, because a cron has none.** "One alert per outage" and "recovery is
announced" both require a run to know what the previous run saw. The Actions cache would have
held it invisibly, and its keys are immutable — the workaround is a rolling key, which is the
sort of cleverness that rots unread. An open issue is state a human can read without a tool,
in the register this project already keeps, and closing it *is* the recovery event. One issue
per target: `apps/api` and `apps/alerts` fail separately, and "the API is gone, the bridge is
fine" has to be expressible. A recovered incident is never reopened — the next outage opens a
new issue, so the history is a dated list rather than one unreadable thread.

**The bridge is probed by its refusal.** `apps/alerts` answers 405 to every GET, by
construction: it accepts a signed POST and nothing else. A Worker that is down cannot answer
405, so the refusal is proof of life and costs nothing. The probe asserts *exactly* 405 rather
than "some answer", and the test in `apps/alerts` that already pinned `GET → 405` now says in
words that a monitor depends on it — otherwise the day someone adds a GET route the probe keeps
passing for a reason nobody chose. Giving that Worker a `/health` was the alternative, and it would have widened
the surface of a public webhook receiver that ADR-0018 deliberately kept narrow.

**`/health` already asserts its configuration, and it was decided here only to find it done.**
The route answers 200 without reaching Steam, by design, so on its own it proves the Worker is
up and not that the app works. The failure worth catching there is not Steam being down — it is
a deploy that went out without `STEAM_API_KEY`, invisible until a reader asks for a profile.
This issue set out to add that check and found it already made, one level higher and better
placed: `createFetchHandler` reads the configuration before it routes anything, so a Worker
without a key answers 503 `{"error":"MISCONFIGURED"}` to *every* address, `/health` among them,
and `worker.test.ts` pins that on the health URL itself. Nothing was added. What changed is
that something now reads the answer.

A probe on a real Steam route was considered and declined: it would spend the key's rate limit
on nobody, and would turn every Steam outage into an alert about something we cannot fix —
the fastest way to unlearn reading a channel.

**The failure is public, the diagnosis is not.** That 503 names nothing a caller could use;
which part of the configuration is missing goes to `console.error`, where the Worker's logging
lives. This is the split `apps/alerts` makes too, and it is why the probe asserts the *body*
and not only the status: `{"status":"ok"}` is the one answer that means healthy, and everything
else — including a 503 that is deliberately uninformative — is down.

**A deploy-time failure is not a Discord message.** The same probe runs at the end of
`deploy.yml`, retrying for up to a minute while a fresh Worker propagates, and then fails the
job. It posts nothing: the workflow going red *is* the notification, and somebody merged a
minute ago, so somebody is watching. The channel #108 bought exists for what nobody is
watching, and the first spoonful of noise in it is an alert about something already seen.

**Its logic is tested, because it is logic.** Three attempts to a verdict, a verdict and a
stored state to an action, a reason to a sentence — none of that is a `curl` invocation, and
this repository tests what decides. `tools/health-probe` follows `tools/repo-checks` exactly:
a `tsx` entry point, vitest beside it, I/O injected the way `apps/alerts` injects its `post`,
so a test can say "the third attempt timed out and the incident was already open" without a
network.

## What this does not say

**It does not claim every failure is caught.** `/health` proves the Worker answers and that it
holds a key. A route that answers wrongly, a Steam response shape that changed, a cache that
poisons — none of those move it. Those failures produce errors, which is what ADR-0017 and
#118 are for. This one covers the failure that produces nothing.

**It does not watch the site.** `apps/mobile`'s bundle is static assets on Cloudflare Pages,
with no failure mode of its own that the API probe would not already reveal.

**It does not distinguish our outage from Steam's.** `ISteamWebAPIUtil/GetServerInfo` answers
200 in a quarter of a second without an API key, and was considered for exactly that. It was
declined because `/health` never touches Steam: a failure of it cannot have been caused by
Steam, so the annotation would answer a question the alert does not raise. Worth revisiting
only if a probe ever reaches a real Steam route.

**It does not make the monitor unfailable.** A workflow that cannot run, a secret that was
rotated and not replaced, a schedule GitHub disabled after sixty days of repository inactivity
— all of those are silence again, one level up. What is bought here is that the silence now has
a named owner and a place to look, not that it is impossible.

## Considered options

**A hosted uptime monitor.** UptimeRobot and its kind check every five minutes on a free tier,
from several regions, with a native Discord integration and no code at all. Rejected because
the configuration would live in someone else's dashboard: unversioned, unreviewable, absent
from this repository, and forgotten the first time it is changed. Precision was never the
constraint; a quarter of an hour of drift costs nothing against a threshold measured in
minutes.

**A Cloudflare Cron Trigger.** Precise, free, and the Discord credential is already on the
platform. Rejected on the only ground that matters for a monitor: it watches from inside.

**Amending ADR-0018.** Rejected. That ADR records a limit taken knowingly, and editing it would
erase the fact that it was taken knowingly. A later decision amends rather than rewrites, which
is what `docs/adr/README.md` says the set is for.

## Consequences

**One secret, one variable and one label, posted by hand.** `DISCORD_HEALTH_WEBHOOK_URL` is a
secret and not a repository variable, on ADR-0018's reasoning: whoever holds a webhook URL can
post into the channel. `ALERTS_URL` is a variable beside `API_URL`, because the bridge's address
is public and deriving it from the API's by string surgery would break the first time either is
renamed. The `incident` label has to exist before the first outage, or the issue creation fails
at the worst possible moment. All three are checked before the first probe, and a missing one
fails the job loudly with the command that fixes it — the shape `deploy.yml` already uses for
`API_URL` and `SENTRY_DSN`. A scheduled workflow that fails notifies the repository owner, so
a monitor mute for want of configuration does not stay mute.

**A second Discord channel.** `health` beside the channel Sentry's issues land in. Both are
signal, and they are read differently: one asks for an action now, the other for triage later.
A separate webhook also means a monitor stuck in a loop cannot bury the crash reports.

**The job writes to the tracker.** `issues: write`, where every other job in this repository
reads. It is scoped to that one workflow, and its `concurrency` group refuses two overlapping
runs — a manual dispatch during a scheduled run would otherwise see a closed incident twice
and alert twice.

**The release notes' link stops being decorative.** `$API_URL/health` is printed in every
release, and can now answer something other than ok. Nobody has to click it; the point is that
clicking it after a doubtful deploy now gives an answer that can be no.
