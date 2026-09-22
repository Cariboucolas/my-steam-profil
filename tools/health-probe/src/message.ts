/**
 * The two lines that reach a phone. One line each, and no embeds: the bridge in
 * `apps/alerts` needs them because it translates a rich object, where there are
 * four facts here and a notification preview is where they should be legible.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const twoDigits = (figure: number): string => String(figure).padStart(2, "0");

const atUtc = (moment: Date): string =>
  `${twoDigits(moment.getUTCHours())}:${twoDigits(moment.getUTCMinutes())} UTC`;

/** Said the way somebody would say it, and never more precisely than it is known. */
export const howLong = (milliseconds: number): string => {
  if (milliseconds < MINUTE) return "less than a minute";

  const minutes = Math.floor(milliseconds / MINUTE);
  if (minutes < HOUR / MINUTE) return `${minutes} min`;

  const hours = Math.floor(minutes / (HOUR / MINUTE));
  const rest = minutes % (HOUR / MINUTE);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

/**
 * The reason is in the line on purpose. Without it the first thing to do on
 * reading the alert is to redo by hand what the probe has just done.
 */
export const outageLine = ({
  target,
  reason,
  at,
  incidentUrl,
}: {
  readonly target: string;
  readonly reason: string;
  readonly at: Date;
  readonly incidentUrl: string;
}): string => `🔴 **${target}** stopped answering — ${reason} — ${atUtc(at)} — ${incidentUrl}`;

export const recoveryLine = ({
  target,
  lasted,
}: {
  readonly target: string;
  readonly lasted: number;
}): string => `🟢 **${target}** is answering again — down for ${howLong(lasted)}`;
