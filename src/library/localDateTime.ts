/** A date and time without a time zone, as ISO text: `2022-12-13T19:00:19`. Sorts chronologically as text. */
export type LocalDateTime = string;

/** Builds a LocalDateTime from its parts, or undefined if they don't form a real date and time. */
export function localDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): LocalDateTime | undefined {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const isRealDateTime =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second;
  return isRealDateTime ? date.toISOString().slice(0, 19) : undefined;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formats like the old server's `E, MMMM d. yyyy, HH:mm:ss`, e.g. `Tue, December 13. 2022, 19:00:19`. */
export function formatLocalDateTime(time: LocalDateTime): string {
  const date = new Date(`${time}Z`);
  const day = dayNames[date.getUTCDay()];
  const month = monthNames[date.getUTCMonth()];
  return `${day}, ${month} ${date.getUTCDate()}. ${date.getUTCFullYear()}, ${time.slice(11, 19)}`;
}

/** Orders times chronologically, a missing time first, like the old server's ordering of optional times. */
export function compareTimes(a: LocalDateTime | undefined, b: LocalDateTime | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;
  return a < b ? -1 : 1;
}
