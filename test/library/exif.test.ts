import { describe, expect, test } from 'vitest';
import { parseExifDateTime, parseSonyModel } from '../../src/library/exif.ts';

// Ported from ExifHelperSpec.scala
describe('parseExifDateTime', () => {
  test('correctly parses Exif date time', () => {
    expect(parseExifDateTime("'2021:10:17 00:33:35'")).toBe('2021-10-17T00:33:35');
  });
});

describe('parseSonyModel', () => {
  test('names Sony Alpha models like Sony does', () => {
    expect(parseSonyModel('ILCE-7M4')).toBe('Sony a7 IV');
    expect(parseSonyModel('ILCE-7RM3')).toBe('Sony a7r III');
    expect(parseSonyModel('ILCE-6400')).toBe('Sony a6400');
    expect(parseSonyModel('DSC-RX100')).toBeUndefined();
  });
});
