import { mkdir, mkdtemp, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

  test('without a Best album, the home page shows the newest Photo entries as pop-over links', async () => {
    const home = await readFile(join(outputPath, 'index.html'), 'utf8');
    expect(home).toContain(
      '<div style="margin: 1em"><div class="columns"><div class="photo-box animated-padding"><a href="/image/day-night" up-layer="new" up-history="false" up-size="large"><img src="/preview/day-night.jpg" alt="An image of day night."></a></div></div></div>',
    );
  });

  test('the home page has the old navigation header, without Random', async () => {
    const home = await readFile(join(outputPath, 'index.html'), 'utf8');
    expect(home).toContain(
      '<body><header><div id="menuToggle" onclick="toggleMenu()">☰</div><nav id="menu" class="navigation pure-menu"><ul class="pure-menu-list">' +
        '<li id="closeMenu" class="pure-menu-item"><a class="pure-menu-link" href="#" onclick="toggleMenu()">Close Menu</a></li>' +
        '<li class="pure-menu-item"><a class="pure-menu-link" up-instant href="/recent" onclick="toggleMenu()">Recent</a></li>' +
        '<li class="pure-menu-item"><a class="pure-menu-link" up-instant href="/albums" onclick="toggleMenu()">Albums</a></li>' +
        '<li class="pure-menu-item"><a class="pure-menu-link" up-preload href="/tags" onclick="toggleMenu()">Tags</a></li>' +
        '</ul></nav><span class="pure-menu-heading" style="text-align: center"><a href="/" class="pure-menu-link" up-follow style="display: inline">Test Photography</a></span></header><main><div style="margin: 1em">',
    );
    expect(home).not.toContain('Random');
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

const tinyJpeg = () => sharp({ create: { width: 30, height: 20, channels: 3, background: 'red' } }).jpeg().toBuffer();

/**
 * Builds a temporary Library.
 * @param photos Photo entries by Image ID, with their info.json contents
 * @param albums Album file contents by path in the Library
 */
async function buildLibrary({
  photos = {},
  albums = {},
  license,
}: {
  photos?: Record<string, object>;
  albums?: Record<string, string>;
  /** Contents of the Library's LICENSE file, if it has one. */
  license?: string;
}) {
  const libraryPath = await mkdtemp(join(tmpdir(), 'library-'));
  for (const [id, info] of Object.entries(photos)) {
    await mkdir(join(libraryPath, id), { recursive: true });
    await writeFile(join(libraryPath, id, 'info.json'), JSON.stringify(info));
    await writeFile(join(libraryPath, id, 'photo.jpg'), await tinyJpeg());
  }
  for (const [path, contents] of Object.entries(albums)) {
    await mkdir(dirname(join(libraryPath, path)), { recursive: true });
    await writeFile(join(libraryPath, path), contents);
  }
  if (license !== undefined) await writeFile(join(libraryPath, 'LICENSE'), license);
  const outputPath = await mkdtemp(join(tmpdir(), 'site-'));
  const previewCachePath = await mkdtemp(join(tmpdir(), 'preview-cache-'));
  await buildSite({ config: { ...config, libraryPath }, outputPath, previewCachePath, log: silentLog });
  return { readPage: (path: string) => readFile(join(outputPath, path), 'utf8') };
}

/** The Image IDs of the photo boxes on a page, in order. */
function photoBoxIds(page: string): string[] {
  return [...page.matchAll(/<a href="\/image([^"]*)" up-layer="new"/g)].map((match) => decodeURIComponent(match[1] ?? ''));
}

describe('buildSite home page', () => {
  test('shows the Best album\'s Photo entries in Selector order', async () => {
    const { readPage } = await buildLibrary({
      photos: { '/a': {}, '/b': {}, '/c': {}, '/trips/d': {} },
      albums: { 'Best.album': '/c\ntrips\n/a', 'trips.album': '/trips/*' },
    });
    expect(photoBoxIds(await readPage('index.html'))).toEqual(['/c', '/a']);
  });

  test('with an empty or no Best album, shows the 12 newest Photo entries, newest first', async () => {
    const photos: Record<string, object> = { '/untimed': {} };
    for (let day = 10; day <= 22; day++) photos[`/day${day}`] = { time: `2024-01-${day}T12:00:00` };
    const { readPage } = await buildLibrary({ photos, albums: { 'Best.album': '/nothing' } });
    expect(photoBoxIds(await readPage('index.html'))).toEqual([
      '/day22', '/day21', '/day20', '/day19', '/day18', '/day17', '/day16', '/day15', '/day14', '/day13', '/day12', '/day11',
    ]);
  });

  test('has Open Graph tags with the site title, URL and the first Photo entry\'s Preview', async () => {
    const { readPage } = await buildLibrary({
      photos: { '/a': {}, '/b': {} },
      albums: { 'Best.album': '/b\n/a' },
    });
    const home = await readPage('index.html');
    expect(home).toContain('<meta property="og:title" content="Test Photography">');
    expect(home).toContain('<meta property="og:url" content="https://photos.example">');
    expect(home).toContain('<meta property="og:image" content="https://photos.example/preview/b.jpg">');
  });
});

/** The Album IDs of the Album links on a page, in order. */
function albumLinkIds(page: string): string[] {
  return [...page.matchAll(/ href="\/album(\/[^"]*)"/g)].map((match) => decodeURIComponent(match[1] ?? ''));
}

describe('buildSite Albums page', () => {
  test('lists only the orphan Albums, sorted by name', async () => {
    const { readPage } = await buildLibrary({
      photos: { '/x': {} },
      albums: { 'Zebra.album': 'trips', 'Apple.album': '/x', 'trips.album': '/x', 'folder/Mango.album': '/x' },
    });
    expect(albumLinkIds(await readPage('albums.html'))).toEqual(['/Apple', '/folder/Mango', '/Zebra']);
  });

  test('alternates the cover image between left and right, as before', async () => {
    const { readPage } = await buildLibrary({
      photos: { '/2023/my_backyard': {} },
      albums: { 'Garden.album': 'Year', 'Year.album': '/2023/*', 'Zvārtes Iezis.album': '/nothing' },
    });
    const textStyle = "width: 48em; flex-grow: 1; text-align: center; font-family: 'Raleway', sans-serif";
    expect(await readPage('albums.html')).toContain(
      '<main><div><h1 style="text-align: center; font-family: \'Raleway\', sans-serif; font-weight: 300"></h1><div class="center" style="max-width: 120em"><div>' +
        '<a up-transition="move-left" style="color: black; text-decoration: none" href="/album/Garden"><div style="display: flex; align-items: center; background-color: lightgrey; margin: 1em">' +
        '<div style="align: left; flex-shrink: 1" class="photo-box"><img style="max-height: 36em" src="/preview/2023/my_backyard.jpg" alt="An image of my backyard."></div>' +
        `<div style="${textStyle}" up-transition="move-left"><h1 class="album-link-text">Garden</h1></div></div></a>` +
        '<a up-transition="move-left" style="color: black; text-decoration: none" href="/album/Zv%C4%81rtes%20Iezis"><div style="display: flex; align-items: center; background-color: lightgrey; margin: 1em">' +
        `<div style="${textStyle}" up-transition="move-left"><h1 class="album-link-text">Zvārtes Iezis</h1></div>` +
        '<div style="align: right; flex-shrink: 1" class="photo-box"><img style="max-height: 36em" src="/img/image-not-found.jpg" alt="Image not found."></div></div></a>' +
        '</div></div><div class="center" style="max-width: 120em"></div></div></main>',
    );
  });
});

describe('buildSite Album pages', () => {
  let readPage: (path: string) => Promise<string>;

  beforeAll(async () => {
    ({ readPage } = await buildLibrary({
      photos: {
        '/trip/b': { time: '2024-02-01T12:00:00' },
        '/trip/a': { time: '2024-01-01T12:00:00' },
        '/trip/u1': {},
        '/trip/u2': {},
      },
      albums: {
        'Trip.album': 'trip/u2\ntrip/b\ntrip/Zoo\ntrip/u1\ntrip/a\ntrip/Arctic',
        'trip/Zoo.album': 'a',
        'trip/Arctic.album': '/nothing',
      },
    }));
  });

  test('list sub-Albums by name, then Photo entries by time, untimed ones first in Selector order', async () => {
    const page = await readPage('album/Trip.html');
    expect(page).toContain('<h1 style="text-align: center; font-family: \'Raleway\', sans-serif; font-weight: 300">Trip</h1>');
    expect(albumLinkIds(page)).toEqual(['/trip/Arctic', '/trip/Zoo']);
    expect(photoBoxIds(page)).toEqual(['/trip/u2', '/trip/u1', '/trip/a', '/trip/b']);
  });

  test('have Open Graph tags with the first child\'s Preview', async () => {
    const page = await readPage('album/Trip.html');
    expect(page).toContain('<meta property="og:title" content="Trip | Test Photography">');
    expect(page).toContain('<meta property="og:url" content="https://photos.example/album/Trip">');
    expect(page).toContain('<meta property="og:image" content="https://photos.example/preview/trip/u2.jpg">');
  });

  test('have the navigation header', async () => {
    expect(await readPage('album/trip/Zoo.html')).toContain('<header><div id="menuToggle"');
  });

  test('say so for an Album without entries', async () => {
    expect(await readPage('album/trip/Arctic.html')).toContain('<main><h1>Album entries for /trip/Arctic not found! D:</h1></main>');
  });
});

describe('buildSite Tag pages', () => {
  let readPage: (path: string) => Promise<string>;

  beforeAll(async () => {
    ({ readPage } = await buildLibrary({
      photos: {
        '/a': { tags: ['autumn', 'Gauja valley'] },
        '/b': { tags: ['winter'] },
        '/c': { tags: ['autumn'] },
        '/d': {},
      },
    }));
  });

  test('write a page per Tag with its Photo entries', async () => {
    expect(photoBoxIds(await readPage('tag/autumn.html'))).toEqual(['/a', '/c']);
    expect(photoBoxIds(await readPage('tag/winter.html'))).toEqual(['/b']);
    expect(photoBoxIds(await readPage('tag/Gauja valley.html'))).toEqual(['/a']);
  });

  test('are titled with the Tag, above an image grid, with the navigation header', async () => {
    const page = await readPage('tag/Gauja valley.html');
    expect(page).toContain(
      '<header><div id="menuToggle"',
    );
    expect(page).toContain(
      '<main><h1 style="text-align: center; font-family: \'Raleway\', sans-serif; font-weight: 300">Images tagged: Gauja valley</h1><div style="margin: 1em"><div class="columns"><div class="photo-box animated-padding"><a href="/image/a"',
    );
  });
});

describe('buildSite Tags page', () => {
  test('lists every Tag once, sorted ignoring case, as links to their pages', async () => {
    const { readPage } = await buildLibrary({
      photos: { '/a': { tags: ['beach', 'Zvārtes Iezis', 'Autumn'] }, '/b': { tags: ['autumn', 'beach'] } },
    });
    expect(await readPage('tags.html')).toContain(
      '<main><div class="pure-menu"><ul class="pure-menu-list">' +
        '<li class="pure-menu-item"><a class="pure-menu-link" href="/tag/Autumn">Autumn</a></li>' +
        '<li class="pure-menu-item"><a class="pure-menu-link" href="/tag/autumn">autumn</a></li>' +
        '<li class="pure-menu-item"><a class="pure-menu-link" href="/tag/beach">beach</a></li>' +
        '<li class="pure-menu-item"><a class="pure-menu-link" href="/tag/Zv%C4%81rtes%20Iezis">Zvārtes Iezis</a></li>' +
        '</ul></div></main>',
    );
  });
});

describe('buildSite Recent page', () => {
  test('shows the 12 newest Photo entries, newest first, even with a Best album', async () => {
    const photos: Record<string, object> = { '/untimed': {} };
    for (let day = 10; day <= 22; day++) photos[`/day${day}`] = { time: `2024-01-${day}T12:00:00` };
    const { readPage } = await buildLibrary({ photos, albums: { 'Best.album': '/day10' } });
    const page = await readPage('recent.html');
    expect(page).toContain('<header><div id="menuToggle"');
    expect(photoBoxIds(page)).toEqual([
      '/day22', '/day21', '/day20', '/day19', '/day18', '/day17', '/day16', '/day15', '/day14', '/day13', '/day12', '/day11',
    ]);
  });
});

describe('buildSite License page', () => {
  test('shows the LICENSE file\'s contents as text', async () => {
    const { readPage } = await buildLibrary({ license: 'All rights reserved.\nAsk <me> first & be nice.' });
    expect(await readPage('license.html')).toContain(
      '<main><div style="text-align: center; font-size: 4em; font-family: \'Raleway\', sans-serif; font-weight: 200">License</div>' +
        '<div class="center" style="max-width: 80em">All rights reserved.\nAsk &lt;me&gt; first &amp; be nice.</div></main>',
    );
  });

  test('is not written when the Library has no LICENSE file', async () => {
    const { readPage } = await buildLibrary({});
    await expect(readPage('license.html')).rejects.toThrow('ENOENT');
  });
});

describe('buildSite sitemap and robots.txt', () => {
  let readPage: (path: string) => Promise<string>;

  beforeAll(async () => {
    ({ readPage } = await buildLibrary({
      photos: { '/2023/Zvārtes Iezis': { tags: ['autumn'] }, '/b': {} },
      albums: { 'Trips.album': '/b', '2023/Latvia & more.album': 'Zvārtes Iezis' },
    }));
  });

  test('the sitemap lists the main pages without /random, then every Album and Photo entry page', async () => {
    const sitemap = await readPage('sitemap.xml');
    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
    expect(locs.slice(0, 4)).toEqual([
      'https://photos.example',
      'https://photos.example/recent',
      'https://photos.example/albums',
      'https://photos.example/tags',
    ]);
    expect(locs.slice(4).toSorted()).toEqual([
      'https://photos.example/album/2023/Latvia%20%26%20more',
      'https://photos.example/album/Trips',
      'https://photos.example/image/2023/Zv%C4%81rtes%20Iezis',
      'https://photos.example/image/b',
    ]);
    expect(sitemap).not.toContain('random');
  });

  test('the sitemap has the old format', async () => {
    expect(await readPage('sitemap.xml')).toMatch(
      /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n  <url>\n    <loc>https:\/\/photos\.example<\/loc>\n    <changefreq>monthly<\/changefreq>\n  <\/url>\n  <url>\n[\s\S]*<\/url>\n<\/urlset>$/,
    );
  });

  test('robots.txt points at the sitemap', async () => {
    expect(await readPage('robots.txt')).toBe('Sitemap: https://photos.example/sitemap.xml');
  });
});

describe('buildSite not-found page', () => {
  test('is the old 404 page: the shared head and a centered message, without navigation', async () => {
    const { readPage } = await buildLibrary({});
    const page = await readPage('404.html');
    expect(page).toContain('<link rel="stylesheet" href="/css/custom.css">');
    expect(page).toContain('<body><h1 style="text-align: center">Page not found</h1></body>');
  });
});
