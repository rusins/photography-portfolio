import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

export interface PreviewSettings {
  /** Length in pixels of the longest side. Smaller Originals are not enlarged. */
  size: number;
  /** JPEG quality from 0 to 1. */
  quality: number;
}

/** Stored next to a cached Preview: what it was made from. */
interface PreviewSource {
  settings: PreviewSettings;
  /** The Original's path within the Library. */
  original: string;
  originalSha1: string;
  /** Lets an unchanged Original be recognised without reading all of it. */
  originalSize: number;
  originalModifiedMs: number;
}

/**
 * Makes sure `previewPath` holds a Preview of the Original at `original` within the Library, generating it only
 * when it is missing, the settings changed, it was made from another Original, or the Original's content changed.
 * @returns whether a Preview was generated
 */
export async function updatePreview(
  libraryPath: string,
  original: string,
  previewPath: string,
  settings: PreviewSettings,
): Promise<boolean> {
  const originalPath = join(libraryPath, original);
  const sourcePath = sourcePathOf(previewPath);
  const cached = await readPreviewSource(previewPath, sourcePath);
  const { size: originalSize, mtimeMs: originalModifiedMs } = await stat(originalPath);
  const sameOriginal =
    cached !== undefined &&
    cached.original === original &&
    cached.settings.size === settings.size &&
    cached.settings.quality === settings.quality;
  if (sameOriginal && cached.originalSize === originalSize && cached.originalModifiedMs === originalModifiedMs) {
    return false;
  }
  const originalSha1 = await sha1Of(originalPath);
  const generate = !sameOriginal || cached.originalSha1 !== originalSha1;
  if (generate) await generatePreview(originalPath, previewPath, settings);
  await writePreviewSource(sourcePath, { settings, original, originalSha1, originalSize, originalModifiedMs });
  return generate;
}

/** Removes from the cache everything but these Previews and their sources, and the folders left empty. */
export async function prunePreviewCache(previewCachePath: string, keptPreviewPaths: string[]): Promise<void> {
  const kept = new Set(keptPreviewPaths.flatMap((path) => [path, sourcePathOf(path)]));
  await mkdir(previewCachePath, { recursive: true });
  const entries = await readdir(previewCachePath, { recursive: true, withFileTypes: true });
  const folders: string[] = [];
  for (const entry of entries) {
    const path = join(entry.parentPath, entry.name);
    if (entry.isDirectory()) folders.push(path);
    else if (!kept.has(path)) await rm(path);
  }
  // Deepest first, so a folder whose sub-folders were removed is empty by the time it is checked.
  for (const folder of folders.toSorted((a, b) => b.length - a.length)) {
    if ((await readdir(folder)).length === 0) await rmdir(folder);
  }
}

function sourcePathOf(previewPath: string): string {
  return `${previewPath}.source.json`;
}

async function generatePreview(originalPath: string, previewPath: string, settings: PreviewSettings): Promise<void> {
  await mkdir(dirname(previewPath), { recursive: true });
  const unfinishedPath = `${previewPath}.unfinished`;
  await sharp(originalPath)
    .rotate() // applies the Exif orientation
    .resize(settings.size, settings.size, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: Math.round(settings.quality * 100) })
    .toFile(unfinishedPath);
  await rename(unfinishedPath, previewPath);
}

/** The cached Preview's source, or undefined if there is no usable cached Preview. */
async function readPreviewSource(previewPath: string, sourcePath: string): Promise<PreviewSource | undefined> {
  try {
    await stat(previewPath);
    return JSON.parse(await readFile(sourcePath, 'utf8')) as PreviewSource;
  } catch {
    return undefined;
  }
}

async function writePreviewSource(sourcePath: string, source: PreviewSource): Promise<void> {
  await writeFile(sourcePath, JSON.stringify(source));
}

async function sha1Of(path: string): Promise<string> {
  const hash = createHash('sha1');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}
