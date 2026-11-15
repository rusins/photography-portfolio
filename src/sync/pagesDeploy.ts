import type { PublishConfig } from '../config.ts';
import type { ProcessRunner } from './processRunner.ts';

/**
 * Uploads the built site folder to Cloudflare Pages with wrangler, using the user's own wrangler login.
 * @returns wrangler's output, which names the deployment
 */
export async function deployToPages(
  runner: ProcessRunner,
  sitePath: string,
  config: Pick<PublishConfig, 'pagesProject' | 'pagesBranch'>,
): Promise<string> {
  return runner.run('wrangler', [
    'pages',
    'deploy',
    sitePath,
    '--project-name',
    config.pagesProject,
    '--branch',
    config.pagesBranch,
    '--commit-dirty=true',
  ]);
}
