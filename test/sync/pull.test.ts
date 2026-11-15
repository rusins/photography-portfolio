import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { listLibraryFiles } from '../../src/sync/localFiles.ts';
import { planPublish } from '../../src/sync/publishPlan.ts';
import { pull, type PullSteps } from '../../src/sync/pull.ts';
import { FakeRemote } from './fakeRemote.ts';

describe('pull with a fake R2', () => {
  let libraryPath: string;
  let hashCachePath: string;
  let remote: FakeRemote;
  let printed: string[];

  const libraryFile = (path: string) => readFile(join(libraryPath, path), 'utf8');

  const writeLibraryFile = async (path: string, content: string) => {
    await mkdir(join(libraryPath, path, '..'), { recursive: true });
    await writeFile(join(libraryPath, path), content);
  };

  const steps = (force = false): PullSteps => ({
    libraryPath,
    hashCachePath,
    remote,
    force,
    print: (line) => printed.push(line),
  });

  beforeEach(async () => {
    libraryPath = await mkdtemp(join(tmpdir(), 'library-'));
    hashCachePath = join(await mkdtemp(join(tmpdir(), 'cache-')), 'hashes.json');
    remote = new FakeRemote(libraryPath);
    printed = [];
    remote.objects.set('2023/Norway Trip/info.json', { content: Buffer.from('{"title":"Fjord"}'), contentDisposition: undefined });
    remote.objects.set('2023/Norway Trip/Diena 1 ā.jpg', { content: Buffer.from('jpeg bytes'), contentDisposition: 'attachment' });
    remote.objects.set('LICENSE', { content: Buffer.from('CC BY'), contentDisposition: undefined });
  });

  test('pulling into an empty Library reproduces it, and a publish then wants to delete nothing', async () => {
    expect(await pull(steps())).toEqual({ downloaded: 3, overwritten: 0, differing: 0, unchanged: 0, localOnly: 0 });
    expect(await libraryFile('2023/Norway Trip/Diena 1 ā.jpg')).toBe('jpeg bytes');
    expect(await libraryFile('2023/Norway Trip/info.json')).toBe('{"title":"Fjord"}');
    expect(await libraryFile('LICENSE')).toBe('CC BY');

    const publishPlan = planPublish(await listLibraryFiles(libraryPath, hashCachePath), await remote.list());
    expect(publishPlan).toMatchObject({ uploads: [], deletions: [] });
  });

  test('a pull warns about an edited file and keeps the edit', async () => {
    await pull(steps());
    await writeLibraryFile('2023/Norway Trip/info.json', '{"title":"Fjords"}');
    printed = [];

    expect(await pull(steps())).toEqual({ downloaded: 0, overwritten: 0, differing: 1, unchanged: 2, localOnly: 0 });
    expect(await libraryFile('2023/Norway Trip/info.json')).toBe('{"title":"Fjords"}');
    expect(printed).toEqual([
      'WARNING: these Library files differ from R2 and were left alone. Run ./pull --force to replace them with the R2 version:',
      '  2023/Norway Trip/info.json',
    ]);
  });

  test('a forced pull restores the R2 version of an edited file and keeps files only the Library has', async () => {
    await pull(steps());
    await writeLibraryFile('2023/Norway Trip/info.json', '{"title":"Fjords"}');
    await writeLibraryFile('2024/New/info.json', '{}');
    printed = [];

    expect(await pull(steps(true))).toEqual({ downloaded: 0, overwritten: 1, differing: 0, unchanged: 2, localOnly: 1 });
    expect(await libraryFile('2023/Norway Trip/info.json')).toBe('{"title":"Fjord"}');
    expect(await libraryFile('2024/New/info.json')).toBe('{}');
    expect(printed).toEqual([]);
  });
});
