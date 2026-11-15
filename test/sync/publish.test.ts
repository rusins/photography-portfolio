import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { publish, type PublishSteps } from '../../src/sync/publish.ts';
import { FakeRemote } from './fakeRemote.ts';

describe('publish with a fake R2', () => {
  let libraryPath: string;
  let hashCachePath: string;
  let remote: FakeRemote;
  let siteDeploys: number;
  let questions: string[];
  let answer: boolean;
  let printed: string[];

  const writeLibraryFile = async (path: string, content: string) => {
    await mkdir(join(libraryPath, path, '..'), { recursive: true });
    await writeFile(join(libraryPath, path), content);
  };

  const steps = (): PublishSteps => ({
    libraryPath,
    hashCachePath,
    remote,
    confirm: async (question) => {
      questions.push(question);
      return answer;
    },
    deploySite: async () => {
      siteDeploys++;
    },
    print: (line) => printed.push(line),
  });

  beforeEach(async () => {
    libraryPath = await mkdtemp(join(tmpdir(), 'library-'));
    hashCachePath = join(await mkdtemp(join(tmpdir(), 'cache-')), 'hashes.json');
    remote = new FakeRemote(libraryPath);
    siteDeploys = 0;
    questions = [];
    answer = false;
    printed = [];
    await writeLibraryFile('2023/Norway Trip/info.json', '{}');
    await writeLibraryFile('2023/Norway Trip/Day 1.jpg', 'jpeg bytes');
  });

  test('uploads new files, Originals with their download name, then deploys the site', async () => {
    const summary = await publish(steps());
    expect(summary).toEqual({ uploaded: 2, unchanged: 0, deleted: 0 });
    expect(remote.objects.get('2023/Norway Trip/Day 1.jpg')).toEqual({
      content: Buffer.from('jpeg bytes'),
      contentDisposition: `attachment; filename="Raitis_Krikis-2023-Norway Trip-Day 1.jpg"; filename*=UTF-8''Raitis_Krikis-2023-Norway%20Trip-Day%201.jpg`,
    });
    expect(remote.objects.get('2023/Norway Trip/info.json')).toEqual({ content: Buffer.from('{}'), contentDisposition: undefined });
    expect(siteDeploys).toBe(1);
    expect(questions).toEqual([]);
  });

  test('a second publish without changes uploads nothing', async () => {
    await publish(steps());
    expect(await publish(steps())).toEqual({ uploaded: 0, unchanged: 2, deleted: 0 });
  });

  test('uploads a file whose content changed but whose size did not', async () => {
    await publish(steps());
    await writeLibraryFile('2023/Norway Trip/info.json', '[]');
    expect(await publish(steps())).toEqual({ uploaded: 1, unchanged: 1, deleted: 0 });
    expect(remote.objects.get('2023/Norway Trip/info.json')?.content).toEqual(Buffer.from('[]'));
  });

  test('declining the deletions changes neither R2 nor the site', async () => {
    await writeLibraryFile('Old/info.json', '{}');
    await publish(steps());
    await rm(join(libraryPath, 'Old'), { recursive: true });
    await writeLibraryFile('New/info.json', '{}');
    const objectsBefore = new Map(remote.objects);

    expect(await publish(steps())).toBeUndefined();
    expect(questions).toHaveLength(1);
    expect(remote.objects).toEqual(objectsBefore);
    expect(siteDeploys).toBe(1);
  });

  test('confirming the deletions deletes them from R2 and deploys the site', async () => {
    await writeLibraryFile('Old/info.json', '{}');
    await publish(steps());
    await rm(join(libraryPath, 'Old'), { recursive: true });
    answer = true;

    expect(await publish(steps())).toEqual({ uploaded: 0, unchanged: 2, deleted: 1 });
    expect([...remote.objects.keys()].sort()).toEqual(['2023/Norway Trip/Day 1.jpg', '2023/Norway Trip/info.json']);
    expect(printed).toContain('  Old/info.json');
    expect(siteDeploys).toBe(2);
  });
});
