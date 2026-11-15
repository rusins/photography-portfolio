import { fileURLToPath } from 'node:url';
import { loadConfig, loadPublishConfig } from '../config.ts';
import { childProcessRunner } from '../sync/childProcessRunner.ts';
import { pull } from '../sync/pull.ts';
import { RcloneRemote } from '../sync/rcloneRemote.ts';
import { exitUnlessLibraryIsFolder } from './libraryFolder.ts';

// Run by ./pull, with `--force` and the config file as optional arguments.
const repoPath = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

const args = process.argv.slice(2);
const force = args.includes('--force');
const configPath = args.find((arg) => arg !== '--force') ?? repoPath('site.config.json');
const config = await loadConfig(configPath);
const publishConfig = await loadPublishConfig(configPath);
await exitUnlessLibraryIsFolder(config, configPath);

console.log(`Comparing the Library at ${config.libraryPath} with R2 bucket ${publishConfig.r2Bucket}`);
const summary = await pull({
  libraryPath: config.libraryPath,
  hashCachePath: repoPath('.publish-cache/hashes.json'),
  remote: new RcloneRemote(
    { libraryPath: config.libraryPath, rcloneRemote: publishConfig.rcloneRemote, bucket: publishConfig.r2Bucket },
    childProcessRunner,
  ),
  force,
  print: (line) => console.log(line),
});
console.log(
  `Library: downloaded ${summary.downloaded}, overwritten ${summary.overwritten}, differing and left alone ${summary.differing}, ` +
    `unchanged ${summary.unchanged}, only in the Library ${summary.localOnly} files.`,
);
