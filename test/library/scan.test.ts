import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { scanLibrary } from '../../src/library/scan.ts';

const exampleLibrary = fileURLToPath(new URL('../fixtures/example_data_dir', import.meta.url));

function recordingLog() {
  const warnings: string[] = [];
  return { warnings, log: { warn: (message: string) => warnings.push(message) } };
}

// Ported from DirectoryScannerSpec.scala
describe('scanLibrary', () => {
  test('warns if info.json is malformed', async () => {
    const { warnings, log } = recordingLog();
    await scanLibrary(exampleLibrary, log);
    expect(warnings).toContainEqual(expect.stringContaining('info.json'));
  });

  test('returns a Photo entry for day-night with fields filled from Exif', async () => {
    const entries = await scanLibrary(exampleLibrary, recordingLog().log);
    expect(entries).toContainEqual({
      kind: 'photo',
      id: '/day-night',
      info: {
        description: 'A composite photo of my backyard',
        time: '2022-12-13T19:00:19',
        cameraModel: 'Sony a7 IV',
        aperture: 'F1.4',
        focalLength: '50mm',
        shutterSpeed: '1/20s',
        iso: 'ISO 12800',
      },
      originals: ['day-night/day-night.jpg'],
      rawFiles: [],
    });
  });

  test('orders Originals primaryImageFile first then longest name, Raw files by name descending', async () => {
    const library = await mkdtemp(join(tmpdir(), 'library-'));
    const folder = join(library, '2023', 'Zvārtes Iezis');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'info.json'), '{"primaryImageFile": "a.jpg"}');
    for (const name of ['a.jpg', 'bb.JPEG', 'ccc.jpg', 'a.arw', 'c.ARW', 'b.raw', 'notes.txt']) {
      await writeFile(join(folder, name), '');
    }

    const entries = (await scanLibrary(library, recordingLog().log)).filter((entry) => entry.kind === 'photo');

    expect(entries.map(({ id, originals, rawFiles }) => ({ id, originals, rawFiles }))).toEqual([
      {
        id: '/2023/Zvārtes Iezis',
        originals: ['2023/Zvārtes Iezis/a.jpg', '2023/Zvārtes Iezis/ccc.jpg', '2023/Zvārtes Iezis/bb.JPEG'],
        rawFiles: ['2023/Zvārtes Iezis/c.ARW', '2023/Zvārtes Iezis/b.raw', '2023/Zvārtes Iezis/a.arw'],
      },
    ]);
  });

  test('skips a Photo entry without Originals with a warning', async () => {
    const library = await mkdtemp(join(tmpdir(), 'library-'));
    await mkdir(join(library, 'empty'));
    await writeFile(join(library, 'empty', 'info.json'), '{}');
    const { warnings, log } = recordingLog();

    const entries = await scanLibrary(library, log);

    expect(entries).toEqual([]);
    expect(warnings).toEqual(['No image files found for /empty']);
  });

  test('returns an Album for random.album', async () => {
    const entries = await scanLibrary(exampleLibrary, recordingLog().log);
    expect(entries).toContainEqual({ kind: 'album', id: '/random', selectors: ['day-night', '/something/*'] });
  });

  test('gives an Album in a folder an ID with the folder path', async () => {
    const entries = await scanLibrary(exampleLibrary, recordingLog().log);
    expect(entries).toContainEqual({ kind: 'album', id: '/folder/recursive', selectors: ['*'] });
  });

  test('skips a non-UTF-8 Album with a warning', async () => {
    const library = await mkdtemp(join(tmpdir(), 'library-'));
    await writeFile(join(library, 'broken.album'), Buffer.from([0x2f, 0xff, 0xfe, 0x0a]));
    const { warnings, log } = recordingLog();

    const entries = await scanLibrary(library, log);

    expect(entries).toEqual([]);
    expect(warnings).toEqual([`Album file ${join(library, 'broken.album')} is not UTF-8 encoded!`]);
  });
});
