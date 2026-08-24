# The API runs on Cloudflare Workers, without its code knowing

`createApp` returns a Hono app whose `app.fetch` has exactly the signature of a Module Worker.
`worker.ts` therefore does nothing but read the environment in the right place — the second
argument of `fetch` rather than `process.env` — and build the app once per isolate. `server.ts`
stays the entry point for local development. No existing file changed to make this port
possible: `loadConfig` already took an arbitrary `Record` rather than `process.env`.

## Considered options

A container on Fly.io or Render would have kept `server.ts` as the single entry point. Rejected:
Fly asks for a credit card, and Render's free tier puts the service to sleep — around fifty
seconds to wake on the first call, which ruins the point of a URL you open to check a merge.
Workers cold-starts in milliseconds.

## Consequences

The API code must stay free of Node APIs. `steam-client.ts` uses only the global `fetch`;
introducing `node:fs`, `node:crypto` or a package that depends on one would require the
`nodejs_compat` flag and should be a conscious choice, not one more import.

Two entry points means two ways to be misconfigured, and they answer differently on purpose.
`server.ts` exits, because an operator is watching a terminal. A Worker has neither terminal
nor exit: it answers 503 with a body that names nothing, and puts the reason in the log where
only `wrangler tail` will find it (ADR-0001).
