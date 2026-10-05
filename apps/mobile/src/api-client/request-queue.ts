/** What a call answers with when its signal aborted before its request did. */
export const DROPPED = Symbol("dropped");

/**
 * Who is waiting on a request. `foreground` is what the player just asked to
 * see — a profile, a library, a game — and waits on one answer. `background`
 * is counting over the whole library, hundreds of answers nobody waits on
 * one at a time.
 */
export type Lane = "foreground" | "background";

/**
 * Sends `send` once a place is free, in the order the calls of its lane were
 * made, and answers with what it answered.
 *
 * A call whose `signal` aborts answers `DROPPED` at once: still waiting, it is
 * never sent; already sent, it gives its place up without waiting for an answer
 * nobody will read. Stopping the request itself is `send`'s to do, with the
 * same signal.
 */
export type RequestQueue = <T>(
  send: () => Promise<T>,
  signal?: AbortSignal,
  lane?: Lane,
) => Promise<T | typeof DROPPED>;

/** `send`, with a throw on the way in turned into the rejection it stands for. */
const attempt = <T>(send: () => Promise<T>): Promise<T> =>
  new Promise<T>((settle) => settle(send()));

/**
 * A queue letting `places` requests be in flight at once. A place freed is
 * handed to whoever has waited longest in the foreground, or else in the
 * background, so the count never dips and nobody jumps the line of their own
 * lane. The background only ever waits on the foreground, which is a handful
 * of requests: a game opened while the library counts is not sent after the
 * whole count (#168).
 *
 * It is handed over once the turn that freed it is over. A screen that leaves
 * aborts what it asked one call after the other, in flight first: handed over
 * at once, the first place would go to a call that screen is about to abort
 * next, and send it to answer nobody (#168).
 */
export const createRequestQueue = (places: number): RequestQueue => {
  let inFlight = 0;
  let waiting: Readonly<Record<Lane, readonly (() => void)[]>> = {
    foreground: [],
    background: [],
  };

  const leave = () => {
    const lane: Lane = waiting.foreground.length > 0 ? "foreground" : "background";
    const [next, ...rest] = waiting[lane];
    if (next === undefined) {
      inFlight -= 1;
      return;
    }
    waiting = { ...waiting, [lane]: rest };
    next();
  };

  return <T>(send: () => Promise<T>, signal?: AbortSignal, lane: Lane = "foreground") =>
    new Promise<T | typeof DROPPED>((resolve, reject) => {
      if (signal?.aborted) {
        resolve(DROPPED);
        return;
      }

      let stage: "waiting" | "sent" | "over" = "waiting";

      /**
       * Ends the call on whichever of the answer and the abort comes first.
       * The one that comes second finds no place left to give up, and a
       * promise already settled.
       */
      const end = (settle: () => void) => {
        const heldAPlace = stage === "sent";
        stage = "over";
        signal?.removeEventListener("abort", drop);
        if (heldAPlace) queueMicrotask(leave);
        settle();
      };

      const start = () => {
        stage = "sent";
        attempt(send).then(
          (answer) => end(() => resolve(answer)),
          (failure: unknown) => end(() => reject(failure)),
        );
      };

      const drop = () => {
        waiting = { ...waiting, [lane]: waiting[lane].filter((one) => one !== start) };
        end(() => resolve(DROPPED));
      };

      signal?.addEventListener("abort", drop, { once: true });

      if (inFlight < places) {
        inFlight += 1;
        start();
      } else {
        waiting = { ...waiting, [lane]: [...waiting[lane], start] };
      }
    });
};
