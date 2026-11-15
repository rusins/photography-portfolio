import { access, copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SiteConfig } from '../config.ts';
import type { PhotoEntry } from '../library/photoEntry.ts';
import { Library } from '../library/library.ts';
import { scanLibrary } from '../library/scan.ts';
import type { Log } from '../log.ts';
import { homePage } from './homePage.ts';
import { imagePage } from './imagePage.ts';
import { updatePreview } from './previews.ts';

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
  previewsGenerated: number;
}

/** Reads the Library and writes the static site folder. */
export async function buildSite({ config, outputPath, previewCachePath, log }: BuildOptions): Promise<BuildSummary> {
  const library = new Library(await scanLibrary(config.libraryPath, log), log);
  const entries = library.photoEntries;
  await rm(outputPath, { recursive: true, force: true });
  await cp(assetsPath, outputPath, { recursive: true });
  const hasLicense = await exists(join(config.libraryPath, 'LICENSE'));
  let previewsGenerated = 0;
  for (const entry of entries) {
    if (await writePreview(entry, config, outputPath, previewCachePath)) previewsGenerated++;
    await writeOutputFile(join(outputPath, 'image', `${entry.id}.html`), imagePage(entry, config, hasLicense));
  }
  await writeOutputFile(join(outputPath, 'index.html'), homePage(library, config));
  return { photoEntries: entries.length, previewsGenerated };
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

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
