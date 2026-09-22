import type { Outcome } from "./checks";

/** At least one, which is what having attempted anything means. */
export type NonEmpty<T> = readonly [T, ...(readonly T[])];

export type Verdict =
  | { readonly up: true }
  | { readonly up: false; readonly reason: string };

/** An outage already known about: the open issue that records it. */
export type Incident = {
  readonly number: number;
  readonly url: string;
  readonly openedAt: Date;
};

export type Action =
  | { readonly kind: "nothing" }
  | { readonly kind: "raise"; readonly reason: string }
  | { readonly kind: "resolve"; readonly incident: Incident };

const UP: Verdict = { up: true };

/**
 * One answer is not three failures. A single miss is a blip — a runner's
 * network, a cold start — and the threshold exists to keep a blip out of a
 * channel whose whole value is that everything in it matters.
 *
 * The reason reported is the last one, because that is the one still true when
 * the probe gave up.
 */
export const verdictOf = ([head, ...rest]: NonEmpty<Outcome>): Verdict =>
  rest.reduce<Verdict>(
    (sofar, one) => (sofar.up || one.ok ? UP : { up: false, reason: one.reason }),
    head.ok ? UP : { up: false, reason: head.reason },
  );

/**
 * What to do about a verdict, given what is already known. The open incident is
 * the whole memory of this thing: a scheduled run has none of its own, so
 * "have I already said this?" is answered by whether an issue is open.
 */
export const decide = (verdict: Verdict, open: Incident | undefined): Action => {
  if (verdict.up) return open ? { kind: "resolve", incident: open } : { kind: "nothing" };
  return open ? { kind: "nothing" } : { kind: "raise", reason: verdict.reason };
};
