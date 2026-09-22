import { announceTo } from "./discord";
import { incidentsOn, INCIDENT_LABEL } from "./github";
import { attemptWith } from "./http";
import { waitUntilHealthy, watch, type Ports } from "./run";
import { targetsOf } from "./targets";

/** How long a freshly deployed Worker is given to start answering. */
const DEPLOY_WINDOW_MS = 60_000;

const FAILED = 1;

const fail = (message: string): never => {
  console.error(`::error::${message}`);
  process.exit(FAILED);
};

const required = (name: string, fix: string): string => {
  const value = process.env[name]?.trim();
  return value ? value : fail(`${name} is not set. ${fix}`);
};

const pause = (milliseconds: number): Promise<void> =>
  new Promise((resume) => setTimeout(resume, milliseconds));

const now = (): Date => new Date();

const attempt = attemptWith();

const targets = targetsOf(
  required("API_URL", "Run: gh variable set API_URL --body <worker url>"),
  required("ALERTS_URL", "Run: gh variable set ALERTS_URL --body <alerts worker url>"),
);

/**
 * After a deploy. Nothing is announced and no incident is opened: the workflow
 * going red *is* the notification, and somebody merged a minute ago (ADR-0019).
 */
const afterDeploy = async (): Promise<void> => {
  const settle = waitUntilHealthy({ attempt, pause, now }, DEPLOY_WINDOW_MS);
  const outcomes = await Promise.all(
    targets.map(async (target) => ({ target, outcome: await settle(target) })),
  );

  for (const { target, outcome } of outcomes) {
    console.log(outcome.ok ? `${target.name} is answering.` : `${target.name}: ${outcome.reason}`);
  }

  const broken = outcomes.filter(({ outcome }) => !outcome.ok);
  if (broken.length > 0) {
    fail(
      `Deployed, but ${broken.map(({ target }) => target.name).join(" and ")} did not answer within ${DEPLOY_WINDOW_MS / 1000}s.`,
    );
  }
};

/**
 * On a schedule. A target being down does *not* fail the run: the alert has
 * already been sent, and a red run every quarter of an hour would mail the
 * owner alongside it, which is the second notification ADR-0019 refused. What
 * fails the run is the probe being unable to do its job — missing
 * configuration, or a tracker or a channel that refused it.
 */
const onSchedule = async (): Promise<void> => {
  const repository = required("GITHUB_REPOSITORY", "It is set by Actions; this is not Actions.");
  const token = required("GITHUB_TOKEN", "Pass secrets.GITHUB_TOKEN with issues: write.");
  const webhook = required(
    "DISCORD_HEALTH_WEBHOOK_URL",
    "Run: gh secret set DISCORD_HEALTH_WEBHOOK_URL",
  );

  const tracker = incidentsOn(repository, token);

  // Before the first probe: a label missing when an incident has to be opened
  // fails at the one moment the monitor exists for.
  if (!(await tracker.labelExists())) {
    fail(`The "${INCIDENT_LABEL}" label does not exist. Run: gh label create ${INCIDENT_LABEL}`);
  }

  const ports: Ports = {
    attempt,
    pause,
    now,
    findIncident: tracker.find,
    raiseIncident: (target, reason) => tracker.raise(target, reason, now()),
    resolveIncident: (incident) => tracker.resolve(incident),
    announce: announceTo(webhook),
  };

  const verdicts = await Promise.all(
    targets.map(async (target) => ({ target, verdict: await watch(ports)(target) })),
  );

  for (const { target, verdict } of verdicts) {
    console.log(verdict.up ? `${target.name} is answering.` : `${target.name}: ${verdict.reason}`);
  }
};

const mode = process.argv[2] ?? "schedule";

if (mode === "deploy") await afterDeploy();
else if (mode === "schedule") await onSchedule();
else fail(`Unknown mode "${mode}". Expected "schedule" or "deploy".`);
