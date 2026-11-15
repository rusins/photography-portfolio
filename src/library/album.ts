import type { PhotoEntry } from './photoEntry.ts';

/** An Album's folder path plus its file name without `.album`, starting with `/`, e.g. `/2023/Norway`. */
export type AlbumId = string;

export interface Album {
  kind: 'album';
  id: AlbumId;
  /** The Album file's lines. */
  selectors: string[];
}

/** What the Library is made of: Photo entries and Albums. */
export type LibraryEntry = PhotoEntry | Album;
