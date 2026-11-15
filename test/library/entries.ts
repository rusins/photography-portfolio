import type { Album } from '../../src/library/album.ts';
import type { PhotoEntry, PhotoInfo } from '../../src/library/photoEntry.ts';

// Ported from the Scala tests' package object.

export function img(id: string, info: PhotoInfo = {}): PhotoEntry {
  return { kind: 'photo', id, info, originals: ['/'], rawFiles: [] };
}

export function album(id: string, selectors: string[]): Album {
  return { kind: 'album', id, selectors };
}
