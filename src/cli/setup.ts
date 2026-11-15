import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadPublishConfig, type PublishConfig, type SiteConfig } from '../config.ts';
import { childProcessRunner } from '../sync/childProcessRunner.ts';
import { RcloneRemote } from '../sync/rcloneRemote.ts';

// What the commands share: paths in this repository, the config file and the R2 bucket.

/** A path within this repository, e.g. `site` for the site folder. */
export function repoPath(path: string): string {
  return fileURLToPath(new URL(`../../${path}`, import.meta.url));
}

/** Where `./publish` and `./pull` cache Library file MD5s. */
export const hashCachePath = repoPath('.publish-cache/hashes.json');

/** Reads the site settings from the config file, stopping the command if the Library is not a folder. */
export async function loadBuildSetup(configPath = repoPath('site.config.json')): Promise<SiteConfig> {
  const config = await loadConfig(configPath);
  await exitUnlessLibraryIsFolder(config, configPath);
  return config;
}

/**
 * Reads the site and publish settings from the config file, stopping the command if the Library is not a folder.
 * @returns them, and the R2 bucket that mirrors the Library
 */
export async function loadSyncSetup(
  configPath = repoPath('site.config.json'),
): Promise<{ config: SiteConfig & PublishConfig; remote: RcloneRemote }> {
  const config = await loadPublishConfig(configPath);
  await exitUnlessLibraryIsFolder(config, configPath);
  const remote = new RcloneRemote(
    { libraryPath: config.libraryPath, rcloneRemote: config.rcloneRemote, bucket: config.r2Bucket },
    childProcessRunner,
  );
  return { config, remote };
}

async function exitUnlessLibraryIsFolder(config: SiteConfig, configPath: string): Promise<void> {
  if (!(await stat(config.libraryPath).catch(() => undefined))?.isDirectory()) {
    console.error(`The Library ${config.libraryPath} is not a folder. Set "libraryPath" in ${configPath}.`);
    process.exit(1);
  }
}
