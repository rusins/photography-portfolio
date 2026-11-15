import { fileURLToPath } from 'node:url';
import { loadConfig, loadPublishConfig } from '../config.ts';
import { childProcessRunner } from '../sync/childProcessRunner.ts';
import { askInTerminal } from '../sync/confirm.ts';
import { deployToPages } from '../sync/pagesDeploy.ts';
import { publish } from '../sync/publish.ts';
import { RcloneRemote } from '../sync/rcloneRemote.ts';
import { exitUnlessLibraryIsFolder } from './libraryFolder.ts';

// Run by ./publish after the checks and the build.
const repoPath = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

const configPath = process.argv[2] ?? repoPath('site.config.json');
const config = await loadConfig(configPath);
const publishConfig = await loadPublishConfig(configPath);
await exitUnlessLibraryIsFolder(config, configPath);

console.log(`Comparing the Library at ${config.libraryPath} with R2 bucket ${publishConfig.r2Bucket}`);
const summary = await publish({
  libraryPath: config.libraryPath,
  hashCachePath: repoPath('.publish-cache/hashes.json'),
  remote: new RcloneRemote(
    { libraryPath: config.libraryPath, rcloneRemote: publishConfig.rcloneRemote, bucket: publishConfig.r2Bucket },
    childProcessRunner,
  ),
  confirm: askInTerminal,
  deploySite: async () => {
    console.log(`Deploying the site to Cloudflare Pages project ${publishConfig.pagesProject}`);
    console.log(await deployToPages(childProcessRunner, repoPath('site'), publishConfig));
  },
  print: (line) => console.log(line),
});
if (summary === undefined) {
  console.error('Publish aborted: nothing was changed in R2 or on the site.');
  process.exit(1);
}
console.log(`R2: uploaded ${summary.uploaded}, unchanged ${summary.unchanged}, deleted ${summary.deleted} files.`);
console.log(`Published ${config.siteUrl}`);
