/**
 * Discord's SUPPRESS_EMBEDS. Without it Discord unfurls the incident link into
 * a preview of the issue — which restates the reason the line already carries,
 * and makes an outage twice the height of its recovery in the channel. The link
 * is there to be clicked, not to be summarised.
 */
export const SUPPRESS_EMBEDS = 1 << 2;

/**
 * Where an outage is said out loud: the `health` channel of the server ADR-0018
 * established, through a webhook of its own so a monitor stuck in a loop cannot
 * bury the crash reports next door.
 */
export const announceTo =
  (webhook: string, send: typeof fetch = fetch) =>
  async (line: string): Promise<void> => {
    const answer = await send(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: line, flags: SUPPRESS_EMBEDS }),
    });

    // Losing the alert quietly is the failure this whole thing exists to end.
    // Throwing fails the run, and GitHub mails the owner about a failed
    // scheduled workflow, which is the backstop.
    if (!answer.ok) {
      throw new Error(`Discord refused the alert: HTTP ${answer.status}`);
    }
  };
