/** What Discord accepts in an embed title before rejecting the whole message. */
const TITLE_LIMIT = 256;

/** How much of a commit is worth reading — the same seven as everywhere else (ADR-0016). */
const SHORT_SHA_LENGTH = 7;

/** Red for a failure, amber for anything milder. Two colours, so one means something. */
const COLOURS: Readonly<Record<string, number>> = {
  error: 0xd9_3f_3f,
  fatal: 0xd9_3f_3f,
};
const MILDER = 0xd8_a0_3f;

/** One field of a Discord embed. */
export type MessageField = {
  readonly name: string;
  readonly value: string;
  readonly inline: true;
};

/** What Discord is posted, reduced to the part of its schema this uses. */
export type DiscordMessage = {
  readonly embeds: readonly [
    {
      readonly title: string;
      readonly url: string;
      readonly description: string;
      readonly color: number;
      readonly fields: readonly MessageField[];
    },
  ];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** A string, or nothing — never a number Sentry happened to send instead. */
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/**
 * Cut to what Discord accepts, and say that it was cut. Losing the tail of a
 * long error is a smaller loss than the message being refused whole.
 */
const fit = (value: string): string =>
  value.length <= TITLE_LIMIT ? value : `${value.slice(0, TITLE_LIMIT - 1)}…`;

const fieldsOf = (event: Record<string, unknown>, rule: string | undefined): MessageField[] => {
  const environment = text(event["environment"]);
  const release = text(event["release"]);

  return [
    ...(environment ? [{ name: "Environment", value: environment, inline: true as const }] : []),
    ...(release
      ? [{ name: "Revision", value: release.slice(0, SHORT_SHA_LENGTH), inline: true as const }]
      : []),
    ...(rule ? [{ name: "Rule", value: rule, inline: true as const }] : []),
  ];
};

/**
 * Turns one Sentry issue alert into the message Discord will accept.
 *
 * Everything here treats the payload as untrusted, because it is: it crosses
 * the network from a service whose schema nobody in this repository controls,
 * and a field that quietly changed shape would otherwise turn a failure into
 * a Discord rejection — an alert that fails to alert, which is worse than the
 * silence #108 set out to end.
 *
 * Two things are refused outright rather than rendered as best they can be:
 *
 * - **Anything but a triggered alert.** Sentry posts installation and comment
 *   events to the same endpoint. They are not failures and must not wake
 *   anybody.
 * - **An alert with no link.** The message's whole job is to get someone to
 *   the stack; without a URL it is a notification that something happened,
 *   which is what reading a green workflow already told us.
 */
export const describeAlert = (payload: unknown): DiscordMessage | undefined => {
  if (!isObject(payload) || payload["action"] !== "triggered") return undefined;

  const data = payload["data"];
  if (!isObject(data)) return undefined;

  const event = data["event"];
  if (!isObject(event)) return undefined;

  const title = text(event["title"]);
  const url = text(event["web_url"]);
  if (!title || !url) return undefined;

  return {
    embeds: [
      {
        title: fit(title),
        url,
        description: text(event["culprit"]) ?? "",
        color: COLOURS[text(event["level"]) ?? ""] ?? MILDER,
        fields: fieldsOf(event, text(data["triggered_rule"])),
      },
    ],
  };
};
