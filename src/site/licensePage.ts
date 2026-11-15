import type { SiteConfig } from '../config.ts';
import { escapeHtml } from './html.ts';
import { pageWithNavigation } from './layout.ts';

/** The page at `/license`: the Library's LICENSE file, as text. */
export function licensePage(license: string, config: SiteConfig): string {
  return pageWithNavigation(
    config.siteTitle,
    undefined,
    `<div style="text-align: center; font-size: 4em; font-family: 'Raleway', sans-serif; font-weight: 200">License</div><div class="center" style="max-width: 80em">${escapeHtml(license)}</div>`,
  );
}
