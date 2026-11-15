import { expect, test } from 'vitest';
import { deployToPages } from '../../src/sync/pagesDeploy.ts';
import type { ProcessRunner } from '../../src/sync/processRunner.ts';

test('deploys the site folder to the production branch of the Pages project', async () => {
  const calls: string[][] = [];
  const runner: ProcessRunner = {
    run: async (command, args) => {
      calls.push([command, ...args]);
      return '';
    },
  };
  await deployToPages(runner, '/repo/site', { pagesProject: 'portfolio', pagesBranch: 'main' });
  expect(calls).toEqual([
    ['wrangler', 'pages', 'deploy', '/repo/site', '--project-name', 'portfolio', '--branch', 'main', '--commit-dirty=true'],
  ]);
});
