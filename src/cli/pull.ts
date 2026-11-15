import { pull } from '../sync/pull.ts';
import { hashCachePath, loadSyncSetup } from './setup.ts';

// Run by ./pull, with `--force` and the config file as optional arguments.
const args = process.argv.slice(2);
const force = args.includes('--force');
const { config, remote } = await loadSyncSetup(args.find((arg) => arg !== '--force'));

console.log(`Comparing the Library at ${config.libraryPath} with R2 bucket ${config.r2Bucket}`);
const summary = await pull({
  libraryPath: config.libraryPath,
  hashCachePath,
  remote,
  force,
  print: (line) => console.log(line),
});
console.log(
  `Library: downloaded ${summary.downloaded}, overwritten ${summary.overwritten}, differing and left alone ${summary.differing}, ` +
    `unchanged ${summary.unchanged}, only in the Library ${summary.localOnly} files.`,
);
