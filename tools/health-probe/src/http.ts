import type { Outcome } from "./checks";
import type { Target } from "./targets";

/** Long enough for a cold Worker, short enough that three fit in a run. */
export const TIMEOUT_MS = 10_000;

const named = (cause: unknown): string =>
  typeof cause === "object" && cause !== null && "name" in cause
    ? String((cause as { name: unknown }).name)
    : "";

const said = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/**
 * One attempt. A refusal, a timeout and an unreachable host are all the same
 * kind of news here — the target did not answer — so none of them throws, and
 * each carries the word the alert will print.
 *
 * Redirects are not followed: the address in the release notes is the one that
 * has to answer, and a 301 somewhere else is a finding rather than a detour.
 */
export const attemptWith =
  (send: typeof fetch = fetch) =>
  async (target: Target): Promise<Outcome> => {
    try {
      const response = await send(target.url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "manual",
      });
      return await target.check(response);
    } catch (cause) {
      if (named(cause) === "TimeoutError") return { ok: false, reason: "timeout" };
      return { ok: false, reason: `unreachable (${said(cause)})` };
    }
  };
