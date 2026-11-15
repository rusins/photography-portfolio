import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
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
  originalSha1: string;
  /** Lets an unchanged Original be recognised without reading all of it. */
  originalSize: number;
  originalModifiedMs: number;
}

/**
 * Makes sure `previewPath` holds a Preview of the Original, generating it only when it is missing,
 * the settings changed, or the Original's content changed.
 * @returns whether a Preview was generated
 */
export async function updatePreview(originalPath: string, previewPath: string, settings: PreviewSettings): Promise<boolean> {
  const sourcePath = `${previewPath}.source.json`;
  const cached = await readPreviewSource(previewPath, sourcePath);
  const original = await stat(originalPath);
  const source: PreviewSource = {
    settings,
    originalSha1: '',
    originalSize: original.size,
    originalModifiedMs: original.mtimeMs,
  };

  const settingsMatch =
    cached !== undefined && cached.settings.size === settings.size && cached.settings.quality === settings.quality;
  if (settingsMatch && cached.originalSize === source.originalSize && cached.originalModifiedMs === source.originalModifiedMs) {
    return false;
  }
  source.originalSha1 = await sha1Of(originalPath);
  if (settingsMatch && cached.originalSha1 === source.originalSha1) {
    await writePreviewSource(sourcePath, source);
    return false;
  }

  await generatePreview(originalPath, previewPath, settings);
  await writePreviewSource(sourcePath, source);
  return true;
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
