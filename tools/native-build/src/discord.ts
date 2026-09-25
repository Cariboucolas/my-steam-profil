/**
 * Where a finished build is said out loud: a builds channel of its own, never
 * the health one, whose whole value is that everything in it is an incident.
 */
export const announceTo =
  (webhook: string, send: typeof fetch = fetch) =>
  async (line: string): Promise<void> => {
    const answer = await send(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: line }),
    });

    // A link nobody receives is a phone that stays stranded while the run
    // looks green. Throwing fails it, and GitHub mails the owner.
    if (!answer.ok) {
      throw new Error(`Discord refused the post: HTTP ${answer.status}`);
    }
  };
