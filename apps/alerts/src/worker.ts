import { describeAlert } from "./discord-message";
import { isFromSentry } from "./signature";

/**
 * What Cloudflare hands this Worker. A type alias rather than an interface,
 * for the same reason apps/api gives: only an alias receives TypeScript's
 * implicit index signature.
 *
 * Both are secrets, posted with `wrangler secret put` and never in
 * wrangler.jsonc: the client secret is what proves a request is Sentry's, and
 * the webhook URL *is* the credential — anyone holding it can post into the
 * channel.
 */
export type AlertsEnv = {
  readonly SENTRY_CLIENT_SECRET?: string;
  readonly DISCORD_WEBHOOK_URL?: string;
};

const METHOD_NOT_ALLOWED = 405;
const UNAUTHORIZED = 401;
const NO_CONTENT = 204;
const SERVICE_UNAVAILABLE = 503;
const BAD_GATEWAY = 502;

const nothing = (status: number) => new Response(null, { status });

/**
 * Carries one Sentry issue alert into a Discord channel.
 *
 * It exists because Sentry's own Discord integration needs a paid plan, and a
 * custom internal integration — which the free plan does allow — speaks Sentry
 * JSON, which Discord rejects outright for want of `content` or `embeds`.
 * Sixty lines of translation is the whole of what is being bought.
 *
 * Every refusal here is a status Sentry will show as a failed webhook delivery
 * in its own UI, which is the only place they can be seen. This Worker cannot
 * alert about itself: the thing that carries alerts going quiet is
 * indistinguishable from nothing having gone wrong, and that limit is stated
 * in ADR-0018 rather than papered over.
 *
 * The fetch is injectable so a test can say what Discord answered.
 */
export const createFetchHandler =
  (post: typeof fetch = fetch) =>
  async (request: Request, env: AlertsEnv): Promise<Response> => {
    if (request.method !== "POST") return nothing(METHOD_NOT_ALLOWED);

    const secret = env.SENTRY_CLIENT_SECRET?.trim();
    const webhook = env.DISCORD_WEBHOOK_URL?.trim();
    if (!secret || !webhook) {
      console.error({
        message: "The alert bridge is missing its configuration",
        hasClientSecret: Boolean(secret),
        hasWebhook: Boolean(webhook),
      });
      return nothing(SERVICE_UNAVAILABLE);
    }

    // The text as it arrived, never a re-serialised object: that is what was
    // signed, and what any two JSON encoders would only agree on by luck.
    const body = await request.text();
    if (!(await isFromSentry(secret, body, request.headers.get("sentry-hook-signature") ?? undefined))) {
      return nothing(UNAUTHORIZED);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return nothing(UNAUTHORIZED);
    }

    const message = describeAlert(payload);
    // Signed, and not a failure: an installation or a comment. Accepted and
    // dropped, because waking someone for it would spend the only thing this
    // channel has — that everything in it means something.
    if (!message) return nothing(NO_CONTENT);

    try {
      const answer = await post(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!answer.ok) {
        console.error({
          message: "Discord refused an alert",
          status: answer.status,
          detail: await answer.text().catch(() => ""),
        });
        return nothing(BAD_GATEWAY);
      }
    } catch (error) {
      console.error({ message: "Discord could not be reached" }, error);
      return nothing(BAD_GATEWAY);
    }

    return nothing(NO_CONTENT);
  };

export default { fetch: createFetchHandler() };
