import { mkdir, mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { listLibraryFiles } from '../../src/sync/localFiles.ts';

const md5OfHello = '5d41402abc4b2a76b9719d911017c592';
const md5OfWorld = '7d793037a0760186574b0282f2f435e7';

async function libraryWith(files: Record<string, string>): Promise<string> {
  const libraryPath = await mkdtemp(join(tmpdir(), 'library-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(libraryPath, path, '..'), { recursive: true });
    await writeFile(join(libraryPath, path), content);
  }
  return libraryPath;
}

test('lists every file in the Library with its size and MD5, by path within the Library', async () => {
  const libraryPath = await libraryWith({ 'Best.album': 'hello', '2023/Norway Trip/info.json': 'world' });
  const cachePath = join(await mkdtemp(join(tmpdir(), 'cache-')), 'hashes.json');
  const files = await listLibraryFiles(libraryPath, cachePath);
  expect(files).toEqual([
    { path: '2023/Norway Trip/info.json', size: 5, md5: md5OfWorld },
    { path: 'Best.album', size: 5, md5: md5OfHello },
  ]);
});

test('reuses the cached MD5 of a file whose size and modification time did not change', async () => {
  const libraryPath = await libraryWith({ 'a/info.json': 'hello' });
  const cachePath = join(await mkdtemp(join(tmpdir(), 'cache-')), 'hashes.json');
  const filePath = join(libraryPath, 'a/info.json');
  const mtime = new Date('2024-01-01T00:00:00Z');
  await utimes(filePath, mtime, mtime);
  await listLibraryFiles(libraryPath, cachePath);

  await writeFile(filePath, 'world');
  await utimes(filePath, mtime, mtime);
  expect(await listLibraryFiles(libraryPath, cachePath)).toEqual([{ path: 'a/info.json', size: 5, md5: md5OfHello }]);

  await utimes(filePath, mtime, new Date(mtime.getTime() + 1000));
  expect(await listLibraryFiles(libraryPath, cachePath)).toEqual([{ path: 'a/info.json', size: 5, md5: md5OfWorld }]);
});
