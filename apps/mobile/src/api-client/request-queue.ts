/** What a call answers with when its signal aborted before its request did. */
export const DROPPED = Symbol("dropped");

/**
 * Sends `send` once a place is free, in the order the calls were made, and
 * answers with what it answered.
 *
 * A call whose `signal` aborts answers `DROPPED` at once: still waiting, it is
 * never sent; already sent, it gives its place up without waiting for an answer
 * nobody will read. Stopping the request itself is `send`'s to do, with the
 * same signal.
 */
export type RequestQueue = <T>(
  send: () => Promise<T>,
  signal?: AbortSignal,
) => Promise<T | typeof DROPPED>;

/** `send`, with a throw on the way in turned into the rejection it stands for. */
const attempt = <T>(send: () => Promise<T>): Promise<T> =>
  new Promise<T>((settle) => settle(send()));

/**
 * A FIFO queue letting `places` requests be in flight at once. A place freed is
 * handed straight to whoever has waited longest, so the count never dips and
 * nobody jumps the line.
 */
export const createRequestQueue = (places: number): RequestQueue => {
  let inFlight = 0;
  let waiting: readonly (() => void)[] = [];

  const leave = () => {
    const [next, ...rest] = waiting;
    if (next === undefined) {
      inFlight -= 1;
      return;
    }
    waiting = rest;
    next();
  };

  return <T>(send: () => Promise<T>, signal?: AbortSignal) =>
    new Promise<T | typeof DROPPED>((resolve, reject) => {
      if (signal?.aborted) {
        resolve(DROPPED);
        return;
      }

      let stage: "waiting" | "sent" | "over" = "waiting";

      /** Ends the call once, whichever of the answer and the abort comes first. */
      const end = (settle: () => void) => {
        if (stage === "over") return;
        const heldAPlace = stage === "sent";
        stage = "over";
        signal?.removeEventListener("abort", drop);
        if (heldAPlace) leave();
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
        waiting = waiting.filter((one) => one !== start);
        end(() => resolve(DROPPED));
      };

      signal?.addEventListener("abort", drop, { once: true });

      if (inFlight < places) {
        inFlight += 1;
        start();
      } else {
        waiting = [...waiting, start];
      }
    });
};
