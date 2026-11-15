import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SiteConfig } from '../config.ts';
import type { PhotoEntry } from '../library/photoEntry.ts';
import { Library } from '../library/library.ts';
import { scanLibrary } from '../library/scan.ts';
import type { Log } from '../log.ts';
import { albumPage, albumsPage } from './albumPages.ts';
import { homePage, recentPage } from './homePage.ts';
import { imagePage } from './imagePage.ts';
import { licensePage } from './licensePage.ts';
import { updatePreview } from './previews.ts';
import { tagPage, tagsPage } from './tagPages.ts';

/** Favicon, CSS and JavaScript, copied as they are to the site folder. */
const assetsPath = fileURLToPath(new URL('../../assets', import.meta.url));

export interface BuildOptions {
  config: SiteConfig;
  /** The site folder to (re)create. */
  outputPath: string;
  /** Where Previews are kept between builds. */
  previewCachePath: string;
  log: Log;
}

export interface BuildSummary {
  photoEntries: number;
  albums: number;
  previewsGenerated: number;
}

/** Reads the Library and writes the static site folder. */
export async function buildSite({ config, outputPath, previewCachePath, log }: BuildOptions): Promise<BuildSummary> {
  const library = new Library(await scanLibrary(config.libraryPath, log), log);
  const entries = library.photoEntries;
  await rm(outputPath, { recursive: true, force: true });
  await cp(assetsPath, outputPath, { recursive: true });
  const license = await readLicense(config.libraryPath);
  let previewsGenerated = 0;
  for (const entry of entries) {
    if (await writePreview(entry, config, outputPath, previewCachePath)) previewsGenerated++;
    await writeOutputFile(join(outputPath, 'image', `${entry.id}.html`), imagePage(entry, config, license !== undefined));
  }
  if (license !== undefined) await writeOutputFile(join(outputPath, 'license.html'), licensePage(license, config));
  await writeOutputFile(join(outputPath, 'index.html'), homePage(library, config));
  await writeOutputFile(join(outputPath, 'recent.html'), recentPage(library, config));
  await writeOutputFile(join(outputPath, 'albums.html'), albumsPage(library, config));
  for (const album of library.albums) {
    await writeOutputFile(join(outputPath, 'album', `${album.id}.html`), albumPage(library, album, config));
  }
  await writeOutputFile(join(outputPath, 'tags.html'), tagsPage(library.tags, config));
  for (const tag of library.tags) {
    await writeOutputFile(join(outputPath, 'tag', `${tag}.html`), tagPage(tag, entries, config));
  }
  return { photoEntries: entries.length, albums: library.albums.length, previewsGenerated };
}

/**
 * Copies the entry's Preview from the cache to `/preview/<Image ID>.jpg`, updating the cache first.
 * @returns whether a Preview was generated
 */
async function writePreview(
  entry: PhotoEntry,
  config: SiteConfig,
  outputPath: string,
  previewCachePath: string,
): Promise<boolean> {
  const cachedPreview = join(previewCachePath, `${entry.id}.jpg`);
  const generated = await updatePreview(join(config.libraryPath, entry.originals[0]), cachedPreview, {
    size: config.previewSize,
    quality: config.previewQuality,
  });
  const outputPreview = join(outputPath, 'preview', `${entry.id}.jpg`);
  await mkdir(dirname(outputPreview), { recursive: true });
  await copyFile(cachedPreview, outputPreview);
  return generated;
}

async function writeOutputFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

/** The contents of the Library's LICENSE file, or undefined if it has none. */
async function readLicense(libraryPath: string): Promise<string | undefined> {
  try {
    return await readFile(join(libraryPath, 'LICENSE'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}
