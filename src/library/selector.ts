import type { LibraryEntry } from './album.ts';
import { splitLikeJava } from './splitLikeJava.ts';

const tagPrefix = 'tag:';

/**
 * The items matched by any of an Album's Selectors, without duplicates: first everything the first Selector
 * matches, then what the second matches, and so on.
 * @param basePath the Album's folder, which relative Selectors start from, e.g. `/2023` or `` for the Library itself
 */
export function findMatches(basePath: string, selectors: string[], items: LibraryEntry[]): LibraryEntry[] {
  const unmatched = new Set(items);
  const result: LibraryEntry[] = [];
  for (const selector of selectors) {
    const isMatch = selectorMatcher(basePath, selector);
    for (const item of items) {
      if (unmatched.has(item) && isMatch(item)) {
        unmatched.delete(item);
        result.push(item);
      }
    }
  }
  return result;
}

function selectorMatcher(basePath: string, selector: string): (item: LibraryEntry) => boolean {
  if (selector.startsWith(tagPrefix)) {
    const tag = selector.slice(tagPrefix.length);
    return (item) => item.kind === 'photo' && (item.info.tags ?? []).includes(tag);
  }
  const absoluteSelector = selector.startsWith('/') ? selector : `${basePath.replace(/\/$/, '')}/${selector}`;
  const query = splitLikeJava(absoluteSelector, '/');
  return (item) => pathMatches(query, splitLikeJava(item.id, '/'));
}

/** Compares path parts; a `*` part matches one or more remaining parts. */
function pathMatches(query: string[], candidate: string[]): boolean {
  for (let i = 0; ; i++) {
    const q = query[i];
    const c = candidate[i];
    if (q === undefined || c === undefined) return q === undefined && c === undefined;
    if (q === '*') return true;
    if (q !== c) return false;
  }
}
