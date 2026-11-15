/** Settings from `site.config.json`. */
export interface SiteConfig {
  /** Shown in the header and page titles. */
  siteTitle: string;
  /** Where the site is hosted, without a trailing slash, e.g. `https://raitis.krikis.id.lv`. */
  siteUrl: string;
  /** Where the Library's files are hosted, without a trailing slash. */
  filesUrl: string;
  libraryPath: string;
  /** Length in pixels of a Preview's longest side. */
  previewSize: number;
  /** JPEG quality of Previews, from 0 to 1. */
  previewQuality: number;
}
