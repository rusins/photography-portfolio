/** Compares by UTF-16 code units, like Java's String ordering. */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
