import type { SiteConfig } from '../config.ts';
import type { PhotoEntry } from '../library/photoEntry.ts';
import { escapeHtml } from './html.ts';
import { centeredTopText, pageWithNavigation } from './layout.ts';
import { imageGrid } from './photoGrid.ts';
import { tagPageUrl } from './urls.ts';

/** The page at `/tags`: every Tag, linking to its page. */
export function tagsPage(tags: string[], config: SiteConfig): string {
  return pageWithNavigation(config.siteTitle, undefined, tagList(tags));
}

/** The page at `/tag/<tag>`: the Photo entries with that Tag. */
export function tagPage(tag: string, photoEntries: PhotoEntry[], config: SiteConfig): string {
  const tagged = photoEntries.filter((entry) => entry.info.tags?.includes(tag) ?? false);
  return pageWithNavigation(config.siteTitle, undefined, centeredTopText(`Images tagged: ${tag}`) + imageGrid(tagged));
}

/** Links to Tag pages, as a menu. */
export function tagList(tags: string[]): string {
  const items = tags.map(
    (tag) => `<li class="pure-menu-item"><a class="pure-menu-link" href="${escapeHtml(tagPageUrl(tag))}">${escapeHtml(tag)}</a></li>`,
  );
  return `<div class="pure-menu"><ul class="pure-menu-list">${items.join('')}</ul></div>`;
}
