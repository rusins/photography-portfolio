import { consoleLog } from '../log.ts';
import { buildSite } from '../site/build.ts';
import { loadBuildSetup, repoPath } from './setup.ts';

const config = await loadBuildSetup(process.argv[2]);
const outputPath = repoPath('site');
console.log(`Building ${outputPath} from the Library at ${config.libraryPath}`);
const summary = await buildSite({ config, outputPath, previewCachePath: repoPath('.preview-cache'), log: consoleLog });
console.log(
  `Built ${summary.photoEntries} Photo entry pages and ${summary.albums} Album pages, generated ${summary.previewsGenerated} Previews.`,
);
