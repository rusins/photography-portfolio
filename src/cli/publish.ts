import { childProcessRunner } from '../sync/childProcessRunner.ts';
import { askInTerminal } from '../sync/confirm.ts';
import { deployToPages } from '../sync/pagesDeploy.ts';
import { publish } from '../sync/publish.ts';
import { hashCachePath, loadSyncSetup, repoPath } from './setup.ts';

// Run by ./publish after the checks and the build.
const { config, remote } = await loadSyncSetup(process.argv[2]);

console.log(`Comparing the Library at ${config.libraryPath} with R2 bucket ${config.r2Bucket}`);
const summary = await publish({
  libraryPath: config.libraryPath,
  hashCachePath,
  remote,
  confirm: askInTerminal,
  deploySite: async () => {
    console.log(`Deploying the site to Cloudflare Pages project ${config.pagesProject}`);
    console.log(await deployToPages(childProcessRunner, repoPath('site'), config));
  },
  print: (line) => console.log(line),
});
if (summary === undefined) {
  console.error('Publish aborted: nothing was changed in R2 or on the site.');
  process.exit(1);
}
console.log(`R2: uploaded ${summary.uploaded}, unchanged ${summary.unchanged}, deleted ${summary.deleted} files.`);
console.log(`Published ${config.siteUrl}`);
