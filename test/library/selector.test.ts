import { describe, expect, test } from 'vitest';
import { findMatches } from '../../src/library/selector.ts';
import { img } from './entries.ts';

const testEntries = [
  img('/dir/img'),
  img('/dir/img2'),
  img('/dir2/dir3/img'),
  img('/dir2/dir4/img'),
  img('/dir2/dir4/dir5/img'),
];

// Ported from AlbumEntrySpec.scala
describe('findMatches', () => {
  test('a Selector with an absolute path matches specific IDs', () => {
    expect(findMatches('/otherDir', ['/dir/img'], testEntries)).toEqual([img('/dir/img')]);
  });

  test('a Selector with a relative path matches specific IDs', () => {
    expect(findMatches('/dir', ['img'], testEntries)).toEqual([img('/dir/img')]);
    expect(findMatches('/dir2', ['img'], testEntries)).toEqual([]);
  });

  test('a Selector with an absolute path with a wildcard matches relevant IDs', () => {
    expect(findMatches('/dir', ['/dir2/dir4/*'], testEntries)).toEqual([
      img('/dir2/dir4/img'),
      img('/dir2/dir4/dir5/img'),
    ]);
  });

  test('a Selector with a wildcard matches relevant IDs relative to it', () => {
    expect(findMatches('/dir2', ['*'], testEntries)).toEqual([
      img('/dir2/dir3/img'),
      img('/dir2/dir4/img'),
      img('/dir2/dir4/dir5/img'),
    ]);
    expect(findMatches('/dir2/dir4', ['*'], testEntries)).toEqual([img('/dir2/dir4/img'), img('/dir2/dir4/dir5/img')]);
  });

  test('the Selector /* matches all IDs regardless of base path', () => {
    expect(findMatches('/dir2', ['/*'], testEntries)).toEqual(testEntries);
  });

  test('matches items that match the first Selector before the rest', () => {
    const firstItem = img('/dir2/dir3/img');
    const matches = findMatches('/', [firstItem.id, '*'], testEntries);
    expect(matches.length).toBe(testEntries.length);
    expect(matches[0]).toEqual(firstItem);
  });

  test('matches items that match with a Tag', () => {
    const item = img('img', { tags: ['banana'] });
    expect(findMatches('/', ['tag:banana'], [item])).toEqual([item]);
  });
});
