import { expect, test } from 'vitest';
import { childProcessRunner } from '../../src/sync/childProcessRunner.ts';

test('passes input to the program and returns its output', async () => {
  expect(await childProcessRunner.run('cat', [], 'a b\n')).toBe('a b\n');
});

test('fails when the program fails', async () => {
  await expect(childProcessRunner.run('false', [])).rejects.toThrow('false failed with exit code 1');
});
