import type { Outcome } from "./checks";
import {
  verdictOf,
  decide,
  type Incident,
  type NonEmpty,
  type Verdict,
} from "./decision";
import { outageLine, recoveryLine } from "./message";
import type { Target } from "./targets";

/**
 * Three attempts, inside one run. The rule absorbs a blip in a runner; it is
 * not there to be patient with a Worker that is gone. Spread over three
 * schedules it would mean three quarters of an hour before anybody heard
 * (ADR-0019).
 */
export const ATTEMPTS = 3;
export const GAP_MS = 60_000;

/** After a deploy there is no blip to absorb, only propagation to wait out. */
export const DEPLOY_GAP_MS = 5_000;

/**
 * Everything this reaches for, as parameters. The probe's whole job is a
 * decision, and a decision is only testable when what it decides about can be
 * said rather than fetched.
 */
export type Ports = {
  readonly attempt: (target: Target) => Promise<Outcome>;
  readonly pause: (milliseconds: number) => Promise<void>;
  readonly findIncident: (target: Target) => Promise<Incident | undefined>;
  readonly raiseIncident: (target: Target, reason: string) => Promise<Incident>;
  readonly resolveIncident: (incident: Incident, target: Target) => Promise<void>;
  readonly announce: (line: string) => Promise<void>;
  readonly now: () => Date;
};

/** Stops at the first answer: one answer is not three failures. */
const gather = async (
  ports: Pick<Ports, "attempt" | "pause">,
  target: Target,
): Promise<NonEmpty<Outcome>> => {
  let last: Outcome = await ports.attempt(target);
  let collected: NonEmpty<Outcome> = [last];

  while (!last.ok && collected.length < ATTEMPTS) {
    await ports.pause(GAP_MS);
    last = await ports.attempt(target);
    collected = [...collected, last];
  }

  return collected;
};

/**
 * One scheduled pass over one target: probe, compare with what is already
 * known, and act at most once. Answers the verdict so the caller can decide an
 * exit code without repeating the reasoning.
 */
export const watch =
  (ports: Ports) =>
  async (target: Target): Promise<Verdict> => {
    const verdict = verdictOf(await gather(ports, target));
    const action = decide(verdict, await ports.findIncident(target));

    if (action.kind === "raise") {
      // The incident first, so the alert can carry the link to it. If Discord
      // then refuses, the run fails and GitHub mails the owner about a failed
      // scheduled workflow — which is the backstop this relies on.
      const incident = await ports.raiseIncident(target, action.reason);
      await ports.announce(
        outageLine({
          target: target.name,
          reason: action.reason,
          at: ports.now(),
          incidentUrl: incident.url,
        }),
      );
    }

    if (action.kind === "resolve") {
      await ports.resolveIncident(action.incident, target);
      await ports.announce(
        recoveryLine({
          target: target.name,
          lasted: ports.now().getTime() - action.incident.openedAt.getTime(),
        }),
      );
    }

    return verdict;
  };

/**
 * The probe that runs at the end of a deploy. It raises nothing and announces
 * nothing: the workflow going red *is* the notification, and somebody merged a
 * minute ago, so somebody is watching. What it does instead is wait out the
 * propagation of a Worker that has only just gone out.
 */
export const waitUntilHealthy =
  (ports: Pick<Ports, "attempt" | "pause" | "now">, withinMs: number) =>
  async (target: Target): Promise<Outcome> => {
    const deadline = ports.now().getTime() + withinMs;
    let last: Outcome = await ports.attempt(target);

    while (!last.ok && ports.now().getTime() < deadline) {
      await ports.pause(DEPLOY_GAP_MS);
      last = await ports.attempt(target);
    }

    return last;
  };
