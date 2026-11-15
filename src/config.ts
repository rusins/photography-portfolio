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

/** Where `./publish` publishes to, also from `site.config.json`. Credentials stay in the user's rclone and wrangler config. */
export interface PublishConfig {
  /** Name of the rclone remote (S3 type, pointing at R2) in the user's rclone config. */
  rcloneRemote: string;
  /** The R2 bucket that mirrors the Library and is served at the files URL. */
  r2Bucket: string;
  /** The Cloudflare Pages project the site folder is deployed to. */
  pagesProject: string;
  /** The Pages project's production branch, so a deploy goes live rather than to a preview. */
  pagesBranch: string;
}

/** Reads and checks the site settings of the config file. */
export async function loadConfig(path: string): Promise<SiteConfig> {
  return siteConfig(await fieldReader(path));
}

/** Reads and checks the site and publish settings of the config file. */
export async function loadPublishConfig(path: string): Promise<SiteConfig & PublishConfig> {
  const field = await fieldReader(path);
  return {
    ...siteConfig(field),
    rcloneRemote: field.text('rcloneRemote'),
    r2Bucket: field.text('r2Bucket'),
    pagesProject: field.text('pagesProject'),
    pagesBranch: field.text('pagesBranch'),
  };
}

function siteConfig(field: FieldReader): SiteConfig {
  return {
    siteTitle: field.text('siteTitle'),
    siteUrl: field.text('siteUrl').replace(/\/+$/, ''),
    filesUrl: field.text('filesUrl').replace(/\/+$/, ''),
    libraryPath: field.text('libraryPath'),
    previewSize: field.number('previewSize'),
    previewQuality: field.number('previewQuality'),
  };
}

interface FieldReader {
  text(name: string): string;
  number(name: string): number;
}

async function fieldReader(path: string): Promise<FieldReader> {
  const fields = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  return {
    text(name: string): string {
      const value = fields[name];
      if (typeof value !== 'string' || value === '') throw new Error(`${path}: "${name}" must be a non-empty string`);
      return value;
    },
    number(name: string): number {
      const value = fields[name];
      if (typeof value !== 'number' || value <= 0) throw new Error(`${path}: "${name}" must be a positive number`);
      return value;
    },
  };
}
