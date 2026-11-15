/**
 * Splits like Java's String.split, which the old server used: trailing empty parts are dropped,
 * but text without the separator is returned whole, even when empty.
 */
export function splitLikeJava(text: string, separator: string): string[] {
  if (!text.includes(separator)) return [text];
  const parts = text.split(separator);
  while (parts.length > 0 && parts.at(-1) === '') parts.pop();
  return parts;
}
