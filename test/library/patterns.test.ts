import { describe, expect, test } from 'vitest';
import { albumPattern, delimiterPattern, originalPattern, rawFilePattern } from '../../src/library/patterns.ts';

// Ported from RegexSpec.scala
describe('patterns', () => {
  test('originalPattern', () => {
    expect('image.jpg').toMatch(originalPattern);
    expect('image.jpeg').toMatch(originalPattern);
    expect('image.JPG').toMatch(originalPattern);
    expect('image.JPEG').toMatch(originalPattern);
    expect('image.jpg.xsf').not.toMatch(originalPattern);
  });

  test('rawFilePattern', () => {
    expect('image.raw').toMatch(rawFilePattern);
    expect('image.arw').toMatch(rawFilePattern);
    expect('image.RAW').toMatch(rawFilePattern);
    expect('image.ARW').toMatch(rawFilePattern);
    expect('image.raw.copy').not.toMatch(rawFilePattern);
  });

  test('albumPattern', () => {
    expect('Norway.album').toMatch(albumPattern);
    expect('Norway').not.toMatch(albumPattern);
  });

  test('delimiterPattern', () => {
    expect('me.enjoying-a_peaceful\\walk'.replaceAll(delimiterPattern, ' ')).toBe('me enjoying a peaceful walk');
  });
});
