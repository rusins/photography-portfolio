import type { SiteConfig } from '../config.ts';
import type { Library } from '../library/library.ts';
import type { PhotoEntry } from '../library/photoEntry.ts';
import { compareTimes } from '../library/localDateTime.ts';
import { pageWithNavigation } from './layout.ts';
import { imageGrid } from './photoGrid.ts';
import { previewUrl } from './urls.ts';

/** How many Photo entries the home page shows when there is no Best album. */
const newestCount = 12;

/** The page at `/`: the Best album's Photo entries, or the newest Photo entries if there is no Best album. */
export function homePage(library: Library, config: SiteConfig): string {
  const bestAlbum = library.bestAlbum;
  const bestChildren = bestAlbum === undefined ? undefined : library.children.get(bestAlbum.id);
  const entries =
    bestChildren === undefined
      ? newestFirst(library.photoEntries).slice(0, newestCount)
      : bestChildren.filter((child) => child.kind === 'photo');
  const ogImage = bestAlbum !== undefined && bestChildren !== undefined ? library.coverImage(bestAlbum.id) : entries[0]?.id;
  const openGraph = {
    title: config.siteTitle,
    pageUrl: config.siteUrl,
    ...(ogImage === undefined ? {} : { imageUrl: config.siteUrl + previewUrl(ogImage) }),
  };
  return pageWithNavigation(config.siteTitle, openGraph, imageGrid(entries));
}

/** Photo entries without a time come last. */
function newestFirst(entries: PhotoEntry[]): PhotoEntry[] {
  return entries.toSorted((a, b) => compareTimes(b.info.time, a.info.time));
}
