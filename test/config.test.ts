import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadPublishConfig } from '../src/config.ts';

async function configFile(fields: object): Promise<string> {
  const path = join(await mkdtemp(join(tmpdir(), 'config-')), 'site.config.json');
  await writeFile(path, JSON.stringify(fields));
  return path;
}

test('reads where to publish to', async () => {
  const path = await configFile({ rcloneRemote: 'r2', r2Bucket: 'photos', pagesProject: 'site', pagesBranch: 'main' });
  expect(await loadPublishConfig(path)).toEqual({ rcloneRemote: 'r2', r2Bucket: 'photos', pagesProject: 'site', pagesBranch: 'main' });
});

test('rejects a config without a bucket', async () => {
  const path = await configFile({ rcloneRemote: 'r2', pagesProject: 'site', pagesBranch: 'main' });
  await expect(loadPublishConfig(path)).rejects.toThrow('"r2Bucket" must be a non-empty string');
});
