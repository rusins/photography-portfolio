import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadConfig, loadPublishConfig } from '../src/config.ts';

async function configFile(fields: object): Promise<string> {
  const path = join(await mkdtemp(join(tmpdir(), 'config-')), 'site.config.json');
  await writeFile(path, JSON.stringify(fields));
  return path;
}

const siteFields = {
  siteTitle: 'Photos',
  siteUrl: 'https://photos.example/',
  filesUrl: 'https://files.example',
  libraryPath: '/photos/Library',
  previewSize: 640,
  previewQuality: 0.7,
};

test('reads the site settings, without the publish settings, dropping trailing slashes from URLs', async () => {
  expect(await loadConfig(await configFile(siteFields))).toEqual({
    siteTitle: 'Photos',
    siteUrl: 'https://photos.example',
    filesUrl: 'https://files.example',
    libraryPath: '/photos/Library',
    previewSize: 640,
    previewQuality: 0.7,
  });
});

test('reads the site settings and where to publish to', async () => {
  const path = await configFile({ ...siteFields, rcloneRemote: 'r2', r2Bucket: 'photos', pagesProject: 'site', pagesBranch: 'main' });
  expect(await loadPublishConfig(path)).toEqual({
    siteTitle: 'Photos',
    siteUrl: 'https://photos.example',
    filesUrl: 'https://files.example',
    libraryPath: '/photos/Library',
    previewSize: 640,
    previewQuality: 0.7,
    rcloneRemote: 'r2',
    r2Bucket: 'photos',
    pagesProject: 'site',
    pagesBranch: 'main',
  });
});

test('rejects a config without a bucket', async () => {
  const path = await configFile({ ...siteFields, rcloneRemote: 'r2', pagesProject: 'site', pagesBranch: 'main' });
  await expect(loadPublishConfig(path)).rejects.toThrow('"r2Bucket" must be a non-empty string');
});
