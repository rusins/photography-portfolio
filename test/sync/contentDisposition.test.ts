import { describe, expect, test } from 'vitest';
import { contentDisposition } from '../../src/sync/contentDisposition.ts';

describe('contentDisposition', () => {
  test('downloads an Original in a nested folder with spaces under its download name', () => {
    expect(contentDisposition('2023/Norway Trip/Day 1.jpg')).toBe(
      `attachment; filename="Raitis_Krikis-2023-Norway Trip-Day 1.jpg"; filename*=UTF-8''Raitis_Krikis-2023-Norway%20Trip-Day%201.jpg`,
    );
  });

  test('keeps the plain filename ASCII and gives the exact name in filename*', () => {
    expect(contentDisposition(`Zvārtes Iezis/it's "x".arw`)).toBe(
      `attachment; filename="Raitis_Krikis-Zv_rtes Iezis-it's _x_.arw"; filename*=UTF-8''Raitis_Krikis-Zv%C4%81rtes%20Iezis-it%27s%20%22x%22.arw`,
    );
  });
});
