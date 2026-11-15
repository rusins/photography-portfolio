import { mkdir, mkdtemp, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { beforeAll, describe, expect, test } from 'vitest';
import { buildSite, type BuildSummary } from '../../src/site/build.ts';
import type { SiteConfig } from '../../src/config.ts';

const exampleLibrary = fileURLToPath(new URL('../fixtures/example_data_dir', import.meta.url));

const config: SiteConfig = {
  siteTitle: 'Test Photography',
  siteUrl: 'https://photos.example',
  filesUrl: 'https://files.example',
  libraryPath: exampleLibrary,
  previewSize: 640,
  previewQuality: 0.7,
};

const silentLog = { warn: () => {} };

describe('buildSite with the example Library', () => {
  let outputPath: string;
  let previewCachePath: string;
  let firstBuild: BuildSummary;

  beforeAll(async () => {
    outputPath = await mkdtemp(join(tmpdir(), 'site-'));
    previewCachePath = await mkdtemp(join(tmpdir(), 'preview-cache-'));
    firstBuild = await buildSite({ config, outputPath, previewCachePath, log: silentLog });
  });

  /** Cloudflare Pages serves `/image/day-night` from `image/day-night.html`. */
  const readImagePage = () => readFile(join(outputPath, 'image', 'day-night.html'), 'utf8');

  test('writes the day-night page with its description', async () => {
    expect(await readImagePage()).toContain('A composite photo of my backyard');
  });

  test('shows the time and camera details', async () => {
    expect(await readImagePage()).toContain(
      'Tue, December 13. 2022, 19:00:19<br>50mm<br>F1.4<br>1/20s<br>ISO 12800<br>Sony a7 IV',
    );
  });

  test('links Download Photo to the Original on the files domain', async () => {
    expect(await readImagePage()).toMatch(
      /<a [^>]*href="https:\/\/files\.example\/day-night\/day-night\.jpg" download="Raitis_Krikis-day-night-day-night\.jpg"[^>]*>Download Photo<\/a>/,
    );
  });

  test('writes a Preview no larger than the configured size, shown on the page', async () => {
    const { width, height, format } = await sharp(join(outputPath, 'preview', 'day-night.jpg')).metadata();
    expect(format).toBe('jpeg');
    expect(Math.max(width, height)).toBeLessThanOrEqual(640);
    expect(Math.max(width, height)).toBeGreaterThan(0);
    expect(await readImagePage()).toContain('<img src="/preview/day-night.jpg" alt="An image of day night.">');
  });

  test('rebuilding without changes regenerates no Previews', async () => {
    expect(firstBuild.previewsGenerated).toBe(1);
    const rebuild = await buildSite({ config, outputPath, previewCachePath, log: silentLog });
    expect(rebuild.previewsGenerated).toBe(0);
    expect(await readImagePage()).toContain('A composite photo of my backyard');
  });

  test('links the shared assets, which are in the site folder', async () => {
    const page = await readImagePage();
    for (const asset of ['/img/favicon.svg', '/css/unpoly.min.css', '/css/pure-min.css', '/css/custom.css', '/js/unpoly.min.js', '/js/main.js']) {
      expect(page).toContain(`"${asset}"`);
      await expect(stat(join(outputPath, asset))).resolves.toBeTruthy();
    }
    expect(page).toContain('href="https://fonts.googleapis.com/css?family=Raleway"');
  });

  test('has no license note when the Library has no LICENSE file', async () => {
    expect(await readImagePage()).not.toContain('By downloading');
  });
});

describe('buildSite Preview cache', () => {
  const solidJpeg = (red: number) =>
    sharp({ create: { width: 300, height: 200, channels: 3, background: { r: red, g: 0, b: 0 } } }).jpeg().toBuffer();

  async function libraryWithOnePhoto() {
    const libraryPath = await mkdtemp(join(tmpdir(), 'library-'));
    await mkdir(join(libraryPath, 'photo'));
    await writeFile(join(libraryPath, 'photo', 'info.json'), '{}');
    const originalPath = join(libraryPath, 'photo', 'photo.jpg');
    await writeFile(originalPath, await solidJpeg(255));
    const build = async () =>
      buildSite({
        config: { ...config, libraryPath },
        outputPath: await mkdtemp(join(tmpdir(), 'site-')),
        previewCachePath,
        log: silentLog,
      });
    const previewCachePath = await mkdtemp(join(tmpdir(), 'preview-cache-'));
    return { originalPath, build };
  }

  test('a touched but unchanged Original regenerates no Preview', async () => {
    const { originalPath, build } = await libraryWithOnePhoto();
    await build();
    await utimes(originalPath, new Date(), new Date(Date.now() + 60_000));
    expect((await build()).previewsGenerated).toBe(0);
  });

  test('an Original with changed content regenerates its Preview', async () => {
    const { originalPath, build } = await libraryWithOnePhoto();
    await build();
    await writeFile(originalPath, await solidJpeg(0));
    expect((await build()).previewsGenerated).toBe(1);
  });
});

describe('buildSite with a LICENSE, Tags and an Image ID with spaces and non-ASCII', () => {
  let page: string;
  let outputPath: string;

  beforeAll(async () => {
    const libraryPath = await mkdtemp(join(tmpdir(), 'library-'));
    const folder = join(libraryPath, '2023', 'Zvārtes Iezis');
    await mkdir(folder, { recursive: true });
    await writeFile(join(libraryPath, 'LICENSE'), 'All rights reserved.');
    await writeFile(join(folder, 'info.json'), '{"tags": ["autumn", "Gauja valley"]}');
    await writeFile(join(folder, 'Zvārtes Iezis.jpg'), await sharp({ create: { width: 30, height: 20, channels: 3, background: 'red' } }).jpeg().toBuffer());
    await writeFile(join(folder, 'Zvārtes Iezis.ARW'), '');
    outputPath = await mkdtemp(join(tmpdir(), 'site-'));
    const previewCachePath = await mkdtemp(join(tmpdir(), 'preview-cache-'));
    await buildSite({ config: { ...config, libraryPath }, outputPath, previewCachePath, log: silentLog });
    page = await readFile(join(outputPath, 'image', '2023', 'Zvārtes Iezis.html'), 'utf8');
  });

  test('notes the license when the Library has a LICENSE file', () => {
    expect(page).toContain('By downloading, you agree to the the <a href="/license">License Terms</a>');
  });

  test('lists Tags as links to their pages', () => {
    expect(page).toContain('<a class="pure-menu-link" href="/tag/autumn">autumn</a>');
    expect(page).toContain('<a class="pure-menu-link" href="/tag/Gauja%20valley">Gauja valley</a>');
  });

  test('links downloads and the Preview with percent-encoded paths', async () => {
    expect(page).toContain(
      'href="https://files.example/2023/Zv%C4%81rtes%20Iezis/Zv%C4%81rtes%20Iezis.ARW" download="Raitis_Krikis-2023-Zvārtes Iezis-Zvārtes Iezis.ARW">Download Raw File</a>',
    );
    expect(page).toContain('<img src="/preview/2023/Zv%C4%81rtes%20Iezis.jpg" alt="An image of Zvārtes Iezis.">');
    await expect(stat(join(outputPath, 'preview', '2023', 'Zvārtes Iezis.jpg'))).resolves.toBeTruthy();
  });
});
