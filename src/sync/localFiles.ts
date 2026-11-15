import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { compareText } from '../library/compareText.ts';
import type { LocalFile } from './files.ts';

/** What the hash cache knows about one file, by its path within the Library. */
interface CachedHash {
  size: number;
  modifiedMs: number;
  md5: string;
}

/**
 * Every file in the Library, following symbolic links like the scan does, sorted by path.
 * MD5s are cached at `cachePath` (outside the Library), so only new or modified files are read.
 */
export async function listLibraryFiles(libraryPath: string, cachePath: string): Promise<LocalFile[]> {
  const cache = await readCache(cachePath);
  const newCache: Record<string, CachedHash> = {};
  const files: LocalFile[] = [];
  for (const path of await filePaths(libraryPath, '')) {
    const fullPath = join(libraryPath, path);
    const { size, mtimeMs } = await stat(fullPath);
    const cached = cache[path];
    const md5 = cached?.size === size && cached.modifiedMs === mtimeMs ? cached.md5 : await md5Of(fullPath);
    newCache[path] = { size, modifiedMs: mtimeMs, md5 };
    files.push({ path, size, md5 });
  }
  await writeCache(cachePath, newCache);
  return files.sort((a, b) => compareText(a.path, b.path));
}

/** @param folderPath the folder's path within the Library: '' for the Library itself, else like `2023/Norway` */
async function filePaths(libraryPath: string, folderPath: string): Promise<string[]> {
  const paths: string[] = [];
  for (const child of await readdir(join(libraryPath, folderPath), { withFileTypes: true })) {
    const path = folderPath === '' ? child.name : `${folderPath}/${child.name}`;
    const target = child.isSymbolicLink() ? await stat(join(libraryPath, path)) : child;
    if (target.isFile()) paths.push(path);
    else if (target.isDirectory()) paths.push(...(await filePaths(libraryPath, path)));
  }
  return paths;
}

async function readCache(cachePath: string): Promise<Record<string, CachedHash>> {
  try {
    return JSON.parse(await readFile(cachePath, 'utf8')) as Record<string, CachedHash>;
  } catch {
    return {};
  }
}

async function writeCache(cachePath: string, cache: Record<string, CachedHash>): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(`${cachePath}.unfinished`, JSON.stringify(cache));
  await rename(`${cachePath}.unfinished`, cachePath);
}

async function md5Of(path: string): Promise<string> {
  const hash = createHash('md5');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}
