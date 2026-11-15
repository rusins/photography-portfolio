import { expect, test } from 'vitest';
import { isYes } from '../../src/sync/confirm.ts';

test('only y or yes, in any case, means yes', () => {
  expect(['y', 'Y', 'yes', ' YES '].map(isYes)).toEqual([true, true, true, true]);
  expect(['', 'n', 'no', 'yep', 'sure'].map(isYes)).toEqual([false, false, false, false, false]);
});
