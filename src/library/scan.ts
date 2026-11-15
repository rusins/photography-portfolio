import type { Dirent } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import exifr from 'exifr';
import type { Log } from '../log.ts';
import { fillFromExif, type ExifTags } from './exif.ts';
import { originalPattern, rawFilePattern } from './patterns.ts';
import type { PhotoEntry } from './photoEntry.ts';
import { parsePhotoInfo } from './photoInfo.ts';

const exifTagNames: (keyof ExifTags)[] = [
  'DateTimeOriginal',
  'Make',
  'Model',
  'FNumber',
  'ApertureValue',
  'FocalLength',
  'ExposureTime',
  'ShutterSpeedValue',
  'ISO',
];

/** Finds every Photo entry in the Library. Broken entries are skipped with a warning. */
export async function scanLibrary(libraryPath: string, log: Log): Promise<PhotoEntry[]> {
  return scanFolder(libraryPath, '', log);
}

/** @param folderPath the folder's path within the Library: '' for the Library itself, else like `/2023/Norway` */
async function scanFolder(libraryPath: string, folderPath: string, log: Log): Promise<PhotoEntry[]> {
  const folder = join(libraryPath, folderPath);
  let children: Dirent[];
  try {
    children = (await readdir(folder, { withFileTypes: true })).sort((a, b) => compareText(a.name, b.name));
  } catch (error) {
    log.warn(`Failed to scan directory ${folder} - ${String(error)}`);
    return [];
  }

  const fileNames: string[] = [];
  const subFolderNames: string[] = [];
  for (const child of children) {
    const kind = await kindOf(child, folder);
    if (kind === 'file') fileNames.push(child.name);
    if (kind === 'folder') subFolderNames.push(child.name);
  }

  const entries: PhotoEntry[] = [];
  if (folderPath !== '' && fileNames.includes('info.json')) {
    const entry = await readPhotoEntry(libraryPath, folderPath, fileNames, log);
    if (entry !== undefined) entries.push(entry);
  }
  for (const name of subFolderNames) {
    entries.push(...(await scanFolder(libraryPath, `${folderPath}/${name}`, log)));
  }
  return entries;
}

async function readPhotoEntry(
  libraryPath: string,
  folderPath: string,
  fileNames: string[],
  log: Log,
): Promise<PhotoEntry | undefined> {
  const id = folderPath;
  const infoPath = join(libraryPath, folderPath, 'info.json');
  let info;
  try {
    info = parsePhotoInfo(await readFile(infoPath, 'utf8'));
  } catch (error) {
    log.warn(`Failed to decode ${infoPath} - ${String(error)}`);
    return undefined;
  }

  const pathInLibrary = (fileName: string) => `${folderPath.slice(1)}/${fileName}`;
  const originals = fileNames
    .filter((name) => originalPattern.test(name))
    .sort(
      (a, b) =>
        Number(info.primaryImageFile === b) - Number(info.primaryImageFile === a) ||
        b.length - a.length ||
        compareText(b, a),
    )
    .map(pathInLibrary);
  const rawFiles = fileNames
    .filter((name) => rawFilePattern.test(name))
    .sort((a, b) => compareText(b, a))
    .map(pathInLibrary);

  const [firstOriginal, ...otherOriginals] = originals;
  if (firstOriginal === undefined) {
    log.warn(`No image files found for ${id}`);
    return undefined;
  }

  let exif: ExifTags = {};
  try {
    exif = (await exifr.parse(join(libraryPath, firstOriginal), {
      pick: exifTagNames,
      reviveValues: false,
      translateValues: false,
    })) ?? {};
  } catch (error) {
    log.warn(`Failed to read Exif metadata for ${id} - ${String(error)}`);
  }

  return {
    id,
    info: fillFromExif(info, exif),
    originals: [firstOriginal, ...otherOriginals],
    rawFiles,
  };
}

/** Follows symbolic links, like the old server did. */
async function kindOf(child: Dirent, folder: string): Promise<'file' | 'folder' | 'other'> {
  if (child.isSymbolicLink()) {
    try {
      const target = await stat(join(folder, child.name));
      return target.isFile() ? 'file' : target.isDirectory() ? 'folder' : 'other';
    } catch {
      return 'other';
    }
  }
  return child.isFile() ? 'file' : child.isDirectory() ? 'folder' : 'other';
}

/** Compares by UTF-16 code units, like Java's String ordering. */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
