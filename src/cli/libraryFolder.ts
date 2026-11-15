import { stat } from 'node:fs/promises';
import type { SiteConfig } from '../config.ts';

/** Stops the command if the configured Library is not a folder. */
export async function exitUnlessLibraryIsFolder(config: SiteConfig, configPath: string): Promise<void> {
  if (!(await stat(config.libraryPath).catch(() => undefined))?.isDirectory()) {
    console.error(`The Library ${config.libraryPath} is not a folder. Set "libraryPath" in ${configPath}.`);
    process.exit(1);
  }
}
