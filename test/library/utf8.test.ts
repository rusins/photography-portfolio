import { describe, expect, test } from 'vitest';
import { isUtf8File } from '../../src/library/utf8.ts';
import { fileURLToPath } from 'node:url';

const fixtures = fileURLToPath(new URL('../fixtures/', import.meta.url));

// Ported from Utf8CheckerSpec.scala
describe('isUtf8File', () => {
  test('detects text files as UTF-8', async () => {
    expect(await isUtf8File(fixtures + 'text_file')).toBe(true);
  });

  test('detects image file as NOT UTF-8', async () => {
    expect(await isUtf8File(fixtures + 'example_data_dir/day-night/day-night.jpg')).toBe(false);
  });
});
