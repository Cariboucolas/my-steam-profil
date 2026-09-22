import type { Incident } from "./decision";
import type { Target } from "./targets";

/**
 * The incident issues are the monitor's entire memory. A scheduled run has none
 * of its own, and an open issue is state a human can read without a tool, in
 * the register this project already keeps (ADR-0019).
 */
export const INCIDENT_LABEL = "incident";

const API = "https://api.github.com";

const OK_STATUSES = new Set([200, 201]);

type IssuePayload = {
  readonly number: number;
  readonly html_url: string;
  readonly created_at: string;
  readonly title?: string;
};

/** One title per target, which is how a run recognises its own incident. */
const titleFor = (target: Target): string => `Health: ${target.name} is not answering`;

const bodyFor = (target: Target, reason: string, at: Date): string =>
  [
    `\`${target.name}\` stopped answering.`,
    "",
    "| | |",
    "|---|---|",
    `| Probed | ${target.url} |`,
    `| Reason | ${reason} |`,
    `| First seen | ${at.toISOString()} |`,
    "",
    "Three consecutive attempts failed, a minute apart (ADR-0019).",
    "",
    "This issue is the monitor's memory rather than a task: it closes itself when the",
    "target answers again, and a later outage opens a new one, so the history stays a",
    "dated list.",
  ].join("\n");

const asIncident = (issue: IssuePayload): Incident => ({
  number: issue.number,
  url: issue.html_url,
  openedAt: new Date(issue.created_at),
});

/**
 * The tracker, as the four things the probe does to it. The fetch is a
 * parameter so a test can say what GitHub answered.
 */
export const incidentsOn = (repository: string, token: string, send: typeof fetch = fetch) => {
  const call = async (path: string, init: RequestInit = {}): Promise<unknown> => {
    const response = await send(`${API}/repos/${repository}${path}`, {
      ...init,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });

    if (!OK_STATUSES.has(response.status)) {
      throw new Error(
        `GitHub refused ${init.method ?? "GET"} ${path}: HTTP ${response.status}`,
      );
    }

    return response.json();
  };

  return {
    /**
     * Checked before the first probe. Creating the label here instead would let
     * the monitor repair its own configuration during an incident, which is one
     * more way for it to fail at the moment it is needed.
     */
    labelExists: async (): Promise<boolean> => {
      const response = await send(`${API}/repos/${repository}/labels/${INCIDENT_LABEL}`, {
        headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}` },
      });
      return response.status === 200;
    },

    find: async (target: Target): Promise<Incident | undefined> => {
      const open = (await call(
        `/issues?state=open&labels=${INCIDENT_LABEL}&per_page=100`,
      )) as readonly IssuePayload[];

      const mine = open.find((issue) => issue.title === titleFor(target));
      return mine ? asIncident(mine) : undefined;
    },

    raise: async (target: Target, reason: string, at: Date = new Date()): Promise<Incident> =>
      asIncident(
        (await call("/issues", {
          method: "POST",
          body: JSON.stringify({
            title: titleFor(target),
            body: bodyFor(target, reason, at),
            labels: [INCIDENT_LABEL],
          }),
        })) as IssuePayload,
      ),

    /** Closed as completed, and never reopened: the next outage opens its own. */
    resolve: async (incident: Incident): Promise<void> => {
      await call(`/issues/${incident.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed", state_reason: "completed" }),
      });
    },
  };
};
