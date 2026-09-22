const encoder = new TextEncoder();

/**
 * Compares without letting how long it took say how much matched.
 *
 * The length is allowed to leak — a signature of the wrong length is not a
 * near miss, and refusing it early costs an attacker nothing they could not
 * measure from the algorithm's name.
 */
const equalInConstantTime = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
};

const toHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * Whether Sentry sent this body, proved by the integration's client secret.
 *
 * The endpoint has to be reachable by Sentry, which means reachable by anyone
 * who finds the address — so an unsigned request is the ordinary case, not the
 * exception, and this is the only thing standing between a stranger and a
 * notification that looks exactly like a real one.
 *
 * The raw text is signed, never a re-serialised object. Sentry's own example
 * hashes `JSON.stringify(request.body)`, which works only as long as two
 * JSON encoders agree on key order and whitespace — a coincidence, not a
 * contract. Whatever arrived on the wire is what was signed.
 *
 * WebCrypto rather than `node:crypto`: this runs in a Worker (ADR-0003).
 */
export const isFromSentry = async (
  secret: string,
  body: string,
  signature: string | undefined,
): Promise<boolean> => {
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));

  return equalInConstantTime(expected, signature);
};
