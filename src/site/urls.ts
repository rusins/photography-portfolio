import type { AlbumId } from '../library/album.ts';
import type { ImageId } from '../library/photoEntry.ts';

/** Percent-encodes each segment of a `/`-separated path, so spaces and non-ASCII work in links. */
export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function imagePageUrl(id: ImageId): string {
  return `/image${encodePath(id)}`;
}

/** Where a file at `pathInLibrary` is downloadable from. */
export function libraryFileUrl(filesUrl: string, pathInLibrary: string): string {
  return `${filesUrl}/${encodePath(pathInLibrary)}`;
}

/** The name a downloaded Original or Raw file is saved under, e.g. `Raitis_Krikis-2023-Norway-photo.jpg`. */
export function downloadName(pathInLibrary: string): string {
  return `Raitis_Krikis-${pathInLibrary.replaceAll('/', '-')}`;
}

export function previewUrl(id: ImageId): string {
  return `/preview${encodePath(id)}.jpg`;
}

export function tagPageUrl(tag: string): string {
  return `/tag/${encodePath(tag)}`;
}

export function albumPageUrl(id: AlbumId): string {
  return `/album${encodePath(id)}`;
}

/**
 * Whether a Tag can have a page of its own at `tag/<tag>.html`: one with an empty, `.` or `..` part
 * would be written outside that folder or over another page.
 */
export function tagCanHavePage(tag: string): boolean {
  return tag.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}
