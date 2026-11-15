import type { Log } from '../log.ts';
import type { Album, AlbumId, LibraryEntry } from './album.ts';
import { compareText } from './compareText.ts';
import type { ImageId, PhotoEntry } from './photoEntry.ts';
import { findMatches } from './selector.ts';

/** The Library's Photo entries and Albums, and which Albums contain what. Like the old server's AppState. */
export class Library {
  readonly entries: LibraryEntry[];
  /** Each Album's Photo entries and sub-Albums, in Selector order. Albums without any are left out. */
  readonly children: Map<AlbumId, LibraryEntry[]>;
  /** The entries not contained in any Album, making them top level. */
  readonly orphans: LibraryEntry[];
  private readonly entriesById: Map<string, LibraryEntry>;

  /** Of entries sharing an ID, only the first is kept, with a warning. */
  constructor(scannedEntries: LibraryEntry[], log: Log) {
    this.entriesById = new Map();
    const duplicateIds = new Set<string>();
    for (const entry of scannedEntries) {
      if (this.entriesById.has(entry.id)) duplicateIds.add(entry.id);
      else this.entriesById.set(entry.id, entry);
    }
    if (duplicateIds.size > 0) {
      log.warn(
        `Duplicate album entries detected! Please check for duplicates for the following IDs: ${[...duplicateIds].join(', ')}`,
      );
    }
    const entries = [...this.entriesById.values()];
    this.entries = entries;
    this.children = new Map();
    const hasParent = new Set<string>();
    for (const entry of entries) {
      if (entry.kind !== 'album') continue;
      const children = findMatches(parentPath(entry.id), entry.selectors, entries).filter((child) => child.id !== entry.id);
      for (const child of children) hasParent.add(child.id);
      if (children.length > 0) this.children.set(entry.id, children);
    }
    this.orphans = entries.filter((entry) => !hasParent.has(entry.id));
  }

  get photoEntries(): PhotoEntry[] {
    return this.entries.filter((entry) => entry.kind === 'photo');
  }

  /** Every Tag of the Photo entries, sorted ignoring case. */
  get tags(): string[] {
    const tags = new Set(this.photoEntries.flatMap((entry) => entry.info.tags ?? []));
    return [...tags].toSorted((a, b) => compareText(a.toLowerCase(), b.toLowerCase()));
  }

  get albums(): Album[] {
    return this.entries.filter((entry) => entry.kind === 'album');
  }

  /** The Album `/Best` or `/best`, whose Photo entries fill the home page. */
  get bestAlbum(): Album | undefined {
    return this.entries.find((entry): entry is Album => entry.kind === 'album' && (entry.id === '/Best' || entry.id === '/best'));
  }

  /** The Photo entry shown for an Album: its first child, or that child's cover image if it is an Album. */
  coverImage(id: AlbumId | ImageId, visited: ReadonlySet<string> = new Set()): ImageId | undefined {
    if (visited.has(id)) return undefined;
    const entry = this.entriesById.get(id);
    if (entry === undefined) return undefined;
    if (entry.kind === 'photo') return entry.id;
    const firstChild = this.children.get(id)?.[0];
    return firstChild === undefined ? undefined : this.coverImage(firstChild.id, new Set([...visited, id]));
  }
}

/** The folder an Album is in, e.g. `/2023` for `/2023/Norway`, or `` for the Library itself. */
function parentPath(id: AlbumId): string {
  return id.slice(0, id.lastIndexOf('/'));
}
