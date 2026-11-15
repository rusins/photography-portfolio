import { readFile } from 'node:fs/promises';

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

/** Reads and checks the config file. */
export async function loadConfig(path: string): Promise<SiteConfig> {
  const fields = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  const text = (name: keyof SiteConfig) => {
    const value = fields[name];
    if (typeof value !== 'string' || value === '') throw new Error(`${path}: "${name}" must be a non-empty string`);
    return value;
  };
  const number = (name: keyof SiteConfig) => {
    const value = fields[name];
    if (typeof value !== 'number' || value <= 0) throw new Error(`${path}: "${name}" must be a positive number`);
    return value;
  };
  return {
    siteTitle: text('siteTitle'),
    siteUrl: text('siteUrl').replace(/\/+$/, ''),
    filesUrl: text('filesUrl').replace(/\/+$/, ''),
    libraryPath: text('libraryPath'),
    previewSize: number('previewSize'),
    previewQuality: number('previewQuality'),
  };
}
