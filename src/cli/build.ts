import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.ts';
import { consoleLog } from '../log.ts';
import { buildSite } from '../site/build.ts';

const repoPath = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

const configPath = process.argv[2] ?? repoPath('site.config.json');
const config = await loadConfig(configPath);
if (!(await stat(config.libraryPath).catch(() => undefined))?.isDirectory()) {
  console.error(`The Library ${config.libraryPath} is not a folder. Set "libraryPath" in ${configPath}.`);
  process.exit(1);
}
const outputPath = repoPath('site');
console.log(`Building ${outputPath} from the Library at ${config.libraryPath}`);
const summary = await buildSite({ config, outputPath, previewCachePath: repoPath('.preview-cache'), log: consoleLog });
console.log(
  `Built ${summary.photoEntries} Photo entry pages and ${summary.albums} Album pages, generated ${summary.previewsGenerated} Previews.`,
);
