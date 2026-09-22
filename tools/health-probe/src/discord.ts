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
      body: JSON.stringify({ content: line }),
    });

    // Losing the alert quietly is the failure this whole thing exists to end.
    // Throwing fails the run, and GitHub mails the owner about a failed
    // scheduled workflow, which is the backstop.
    if (!answer.ok) {
      throw new Error(`Discord refused the alert: HTTP ${answer.status}`);
    }
  };
