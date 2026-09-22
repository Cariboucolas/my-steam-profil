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

const field = (name: string, value: string | undefined): MessageField[] =>
  value ? [{ name, value, inline: true as const }] : [];

/**
 * What is worth reading beside the title, from whichever shape carried it.
 *
 * An event knows which build and which target it came from; an issue does not
 * — `environment` and `release` belong to an occurrence, not to the group of
 * them. Nothing is invented to fill the gap: the link leads to where Sentry
 * shows it, and a field that guessed would be worse than one that is absent.
 */
const fieldsOf = (
  source: Record<string, unknown>,
  rule: string | undefined,
): MessageField[] => [
  ...field("Environment", text(source["environment"])),
  ...field("Revision", text(source["release"])?.slice(0, SHORT_SHA_LENGTH)),
  ...field("Issue", text(source["shortId"])),
  ...field("Rule", rule),
];

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
/**
 * The two shapes Sentry sends that are worth waking somebody for, and the one
 * field of each that decides it.
 *
 * `issue.created` is the one actually in use: Sentry's own Discord integration
 * needs a paid plan, so the free path is an issue webhook rather than an alert
 * rule action (ADR-0018). `event_alert` is kept because an alert rule action
 * remains the documented route and costs four lines to accept.
 *
 * Routing is on the body rather than on the `Sentry-Hook-Resource` header, and
 * deliberately: the signature covers the body alone, so the body is the part
 * that was proved to be Sentry's. The action alone would not do either —
 * `comment.created` and `issue.created` both say "created".
 */
const subjectOf = (
  action: unknown,
  data: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const event = data["event"];
  if (action === "triggered" && isObject(event)) return event;

  const issue = data["issue"];
  // Subscribing to issues subscribes to every state change too — resolved,
  // assigned, archived, unresolved — including the ones you cause yourself
  // while triaging. Only the first sighting is a failure.
  if (action === "created" && isObject(issue)) return issue;

  return undefined;
};

/**
 * Turns one Sentry notification into the message Discord will accept, or
 * refuses it.
 *
 * Everything here treats the payload as untrusted, because it is: it crosses
 * the network from a service whose schema nobody in this repository controls,
 * and a field that quietly changed shape would otherwise turn a failure into
 * a Discord rejection — an alert that fails to alert, which is worse than the
 * silence #108 set out to end.
 *
 * Two things are refused outright rather than rendered as best they can be:
 *
 * - **Anything that is not a new failure.** Installations, comments and issue
 *   state changes all reach the same endpoint. They must not wake anybody.
 * - **Anything with nowhere to link to.** The message's whole job is to get
 *   someone to the stack; without a URL it is a notification that something
 *   happened, which is what reading a green workflow already told us.
 */
export const describeAlert = (payload: unknown): DiscordMessage | undefined => {
  if (!isObject(payload)) return undefined;

  const data = payload["data"];
  if (!isObject(data)) return undefined;

  const subject = subjectOf(payload["action"], data);
  if (!subject) return undefined;

  const title = text(subject["title"]);
  const url = text(subject["web_url"]) ?? text(subject["permalink"]);
  if (!title || !url) return undefined;

  return {
    embeds: [
      {
        title: fit(title),
        url,
        description: text(subject["culprit"]) ?? "",
        color: COLOURS[text(subject["level"]) ?? ""] ?? MILDER,
        fields: fieldsOf(subject, text(data["triggered_rule"])),
      },
    ],
  };
};
