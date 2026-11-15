import type { SiteConfig } from '../config.ts';
import type { Library } from '../library/library.ts';
import { pageWithNavigation } from './layout.ts';
import { imageGrid, randomImageGrid } from './photoGrid.ts';
import { previewUrl } from './urls.ts';

/** How many Photo entries `/recent` shows, and the home page when there is no Best album. */
const newestCount = 12;

/** The page at `/`: the Best album's Photo entries, or the newest Photo entries if there is no Best album. */
export function homePage(library: Library, config: SiteConfig): string {
  const bestAlbum = library.bestAlbum;
  const bestChildren = bestAlbum === undefined ? undefined : library.children.get(bestAlbum.id);
  const entries =
    bestChildren === undefined
      ? library.newestPhotoEntries(newestCount)
      : bestChildren.filter((child) => child.kind === 'photo');
  const ogImage = bestAlbum !== undefined && bestChildren !== undefined ? library.coverImage(bestAlbum.id) : entries[0]?.id;
  const openGraph = {
    title: config.siteTitle,
    pageUrl: config.siteUrl,
    ...(ogImage === undefined ? {} : { imageUrl: config.siteUrl + previewUrl(ogImage) }),
  };
  return pageWithNavigation(config.siteTitle, openGraph, imageGrid(entries));
}

/** The page at `/recent`: the newest Photo entries, newest first. */
export function recentPage(library: Library, config: SiteConfig): string {
  return pageWithNavigation(config.siteTitle, undefined, imageGrid(library.newestPhotoEntries(newestCount)));
}

/** The page at `/random`: every Photo entry, shuffled in the browser. */
export function randomPage(library: Library, config: SiteConfig): string {
  const noScript = '<noscript>Random needs JavaScript. See the <a href="/recent">Recent</a> photos instead.</noscript>';
  return pageWithNavigation(config.siteTitle, undefined, noScript + randomImageGrid(library.photoEntries));
}
