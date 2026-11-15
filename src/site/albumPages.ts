import type { SiteConfig } from '../config.ts';
import type { Album, LibraryEntry } from '../library/album.ts';
import { compareText } from '../library/compareText.ts';
import type { Library } from '../library/library.ts';
import { compareTimes } from '../library/localDateTime.ts';
import { lastIdPart } from '../library/photoEntry.ts';
import { escapeHtml } from './html.ts';
import { centeredTopText, pageWithNavigation } from './layout.ts';
import { altText, photoBoxes } from './photoGrid.ts';
import { albumPageUrl, previewUrl } from './urls.ts';

/** Shown for an Album without a cover image. */
const imageNotFoundUrl = '/img/image-not-found.jpg';

const maxWidth = '120em';

/** The page at `/albums`: the top-level Albums. */
export function albumsPage(library: Library, config: SiteConfig): string {
  const topLevelAlbums = library.orphans.filter((entry) => entry.kind === 'album');
  return pageWithNavigation(config.siteTitle, undefined, albumView(library, '', topLevelAlbums));
}

/** The page at `/album/<Album ID>`: its sub-Albums and Photo entries. */
export function albumPage(library: Library, album: Album, config: SiteConfig): string {
  const children = library.children.get(album.id);
  if (children === undefined) {
    return pageWithNavigation(config.siteTitle, undefined, `<h1>Album entries for ${escapeHtml(album.id)} not found! D:</h1>`);
  }
  const coverId = library.coverImage(album.id);
  const openGraph = {
    title: `${albumName(album)} | ${config.siteTitle}`,
    pageUrl: config.siteUrl + albumPageUrl(album.id),
    ...(coverId === undefined ? {} : { imageUrl: config.siteUrl + previewUrl(coverId) }),
  };
  return pageWithNavigation(config.siteTitle, openGraph, albumView(library, albumName(album), children));
}

/** Sub-Albums as links with their cover images, sorted by name, then Photo entries sorted by time. */
function albumView(library: Library, title: string, entries: LibraryEntry[]): string {
  const albums = entries.filter((entry) => entry.kind === 'album').toSorted((a, b) => compareText(albumName(a), albumName(b)));
  const photoEntries = entries
    .filter((entry) => entry.kind === 'photo')
    .toSorted((a, b) => compareTimes(a.info.time, b.info.time));
  return `<div>${centeredTopText(title)}<div class="center" style="max-width: ${maxWidth}"><div>${albums
    .map((album, index) => albumLink(library, album, index % 2 === 0 ? 'left' : 'right'))
    .join('')}</div></div><div class="center" style="max-width: ${maxWidth}">${photoBoxes(photoEntries)}</div></div>`;
}

/** The Album's name and cover image on a grey band, the cover on the given side. */
function albumLink(library: Library, album: Album, coverSide: 'left' | 'right'): string {
  const coverId = library.coverImage(album.id);
  const cover =
    `<div style="align: ${coverSide}; flex-shrink: 1" class="photo-box"><img style="max-height: 36em" ` +
    (coverId === undefined
      ? `src="${imageNotFoundUrl}" alt="Image not found."`
      : `src="${escapeHtml(previewUrl(coverId))}" alt="${escapeHtml(altText(coverId))}"`) +
    '></div>';
  const name = `<div style="width: 48em; flex-grow: 1; text-align: center; font-family: 'Raleway', sans-serif" up-transition="move-left"><h1 class="album-link-text">${escapeHtml(albumName(album))}</h1></div>`;
  return `<a up-transition="move-left" style="color: black; text-decoration: none" href="${escapeHtml(albumPageUrl(album.id))}"><div style="display: flex; align-items: center; background-color: lightgrey; margin: 1em">${
    coverSide === 'left' ? cover + name : name + cover
  }</div></a>`;
}

function albumName(album: Album): string {
  return lastIdPart(album.id);
}
