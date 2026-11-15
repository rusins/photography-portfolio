import type { Library } from '../library/library.ts';
import { escapeHtml } from './html.ts';
import { albumPageUrl, imagePageUrl } from './urls.ts';

/** The main pages, as listed in the old sitemap, without `/random`. */
const mainPages = ['', '/recent', '/albums', '/tags'];

/** `sitemap.xml`: the main pages, every Album page and every Photo entry page. */
export function sitemap(library: Library, siteUrl: string): string {
  const entryPages = library.entries.map((entry) => (entry.kind === 'album' ? albumPageUrl(entry.id) : imagePageUrl(entry.id)));
  const urls = [...mainPages, ...entryPages].map(
    (path) => `  <url>\n    <loc>${escapeHtml(siteUrl + path)}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

/** `robots.txt`, pointing crawlers at the sitemap. */
export function robotsTxt(siteUrl: string): string {
  return `Sitemap: ${siteUrl}/sitemap.xml`;
}
