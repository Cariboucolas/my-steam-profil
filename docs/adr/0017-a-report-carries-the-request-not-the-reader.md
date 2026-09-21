# A report carries the request, not the reader

An error report leaving this app carries everything that describes **the request**: the SteamID it
was made for, the address it went to, the breadcrumbs that preceded it, the revision that built it.
It adds nothing that describes **the reader**: no IP address, no cookies, no request headers, no
recording of the screen.

## What it binds

- The Sentry configuration in `apps/mobile`. One project, `cdcraft/steam-achievements`, for the
  device build and the web build alike — they are the same bundle, told apart by `environment`.
- `openExternalUrl`, whose `catch` keeps a dead link from taking a screen down, and which now says
  what it swallowed instead of swallowing it silently.
- The Worker's logs, which already carry the same addresses and fall under the same rule.

## Why

**A SteamID64 is published, not confided.** It is the address of a Steam profile —
`steamcommunity.com/profiles/76561198…` — readable by anyone who visits the page it names. It is
not a credential, it unlocks nothing, and the one secret in this system, `STEAM_API_KEY`, has never
been near the client (ADR-0001). Withholding a public identifier is a gesture at privacy, not
privacy.

**The bugs here are bugs about data.** Withheld playtime (#93), a profile that turns out to be
private, a game that publishes no achievements, a library ordered by a field Steam did not send —
each reproduces on one profile and not another. A stack trace that does not name the profile
describes a failure nobody can run again, which is a report that arrives and still costs an hour.
The identifier is not incidental context here; it is the input.

**What the README protects is a different thing, and this does not touch it.** `deploy.yml` forces
`EXPO_PUBLIC_STEAM_ID` to empty so that no personal profile is baked into a public artefact and the
deployed app asks instead. That is about what a *build* contains, not about what a *report*
transmits. ADR-0001, the other document usually cited here, is about the API key and says nothing
about SteamIDs. Neither is amended by this; both were read as forbidding something they never
mentioned.

**An IP address is of another kind, and buys nothing.** It identifies whoever is holding the phone
rather than what they asked for, it is not published anywhere, and it has never helped reproduce a
failure in this app. `sendDefaultPii` stays off — a decision, not an inherited default — and that
is what makes the rule say something: *what identifies the request, not what identifies the
reader*. A rule that admitted everything would be indistinguishable from having no rule.

**One line is what makes it checkable.** The alternative to a rule is a list of scrubbers, and a
list has to be maintained against a schema nobody here controls: a new SDK integration attaches a
field, and the list is silently one entry short. A sentence survives that. Anyone reviewing a
change can ask it of a new field and get an answer.

## What this does not say

**It does not say a SteamID is harmless forever.** It says it is public *while the app asks for
one and trusts the answer*. Steam's official OpenID sign-in would change its nature: the identifier
would stop being a string somebody typed and become the subject of an authenticated session, tied
to a person who logged in rather than to a profile someone looked up. On the day that lands, this
ADR is reopened, not extended by analogy.

**It does not carve Cloudflare out.** The SteamID travels in the request path
(`/api/profile/:steamId`), so Workers Logs has been recording it since the Worker's first deploy.
That is consistent with this decision rather than an exception to it — and worth stating plainly,
because a privacy rule silent about one of its two destinations is a rule that misleads by
omission.

**It does not forbid Session Replay.** It declines it now: a replay records the screen, which is
categorically more than the request, and the web build is the only place it works. If a rendering
bug one day resists everything else, it is a setting to turn on and a paragraph to add here — not a
decision already made in its favour.

## Considered options

**Scrub the SteamID** — rewrite every `\d{17}` to `{steamId}` in URLs, breadcrumbs and messages.
One testable function, and genuinely safe. Rejected because it removes precisely the field that
makes a report actionable in an app whose failures are data-dependent, in exchange for withholding
something already published. It would have left #98's class of report — a swallowed throw with a
stack — no better off, and every future data bug worse.

**Send everything, `sendDefaultPii: true`.** Consistent, and marginally simpler. Rejected because
consistency is not the goal: IP, cookies and headers describe the reader, and adding them buys no
diagnostic power for a failure mode this app has never had.

**Install nothing and keep reading tickets.** The status quo #108 describes, in which three
targets deploy on every merge and none can report a failure. Rejected on the evidence: #98 shipped
an update that called a native module the runtime did not have, every workflow stayed green, and it
surfaced days later by re-reading a ticket.

## Consequences

**The DSN is public, and that is the intended shape.** A client DSN ships inside the bundle by
construction; it accepts events and reads nothing. It therefore lives in a repository *variable*,
`EXPO_PUBLIC_SENTRY_DSN`, beside `API_URL` — not in a secret, which would imply a confidentiality
it does not have. Emptying that variable disables reporting without touching code, the way
`EAS_ENABLED` stops updates: one switch, no revert.

**Errors are never sampled.** `sampleRate` is `1.0`. On this volume, sampling would only make the
reporter reproduce the failure it was installed to end — a crash on a rarely-walked path seen three
times is missed better than three times out of four at a tenth. The ceiling belongs on the quota
side, where it throttles ingestion visibly instead of discarding evidence silently. `tracesSampleRate`
is `0`: performance is not the question this answers.

**Nothing is reported from a build that is not live.** The SDK initialises only under
`EXPO_PUBLIC_LIVE` (ADR-0016), so a development run never files an issue. The channel's whole value
is that a notification arriving in it means something, and the fastest way to destroy that is to
fill it from a laptop.

**A report names its revision.** Sentry releases are the full commit SHA — the same string the app
already states about itself and the workflows already bake in — so the source maps, the alert, and
the line on the profile header are one identifier rather than three that can drift.
