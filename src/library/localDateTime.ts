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
