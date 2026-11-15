import { listLibraryFiles } from './localFiles.ts';
import { planPull } from './pullPlan.ts';
import type { Remote } from './remote.ts';

/** The boundaries pull works through. */
export interface PullSteps {
  libraryPath: string;
  /** Where Library file MD5s are cached, outside the Library. */
  hashCachePath: string;
  remote: Remote;
  /** Whether to replace Library files that differ from R2 with the R2 version. */
  force: boolean;
  print(line: string): void;
}

export interface PullSummary {
  downloaded: number;
  overwritten: number;
  /** Differ from R2 and were left alone. */
  differing: number;
  unchanged: number;
  localOnly: number;
}

/** Brings the Library up to date with R2. Never deletes Library files. */
export async function pull(steps: PullSteps): Promise<PullSummary> {
  const local = await listLibraryFiles(steps.libraryPath, steps.hashCachePath);
  const plan = planPull(local, await steps.remote.list(), { force: steps.force });
  await steps.remote.download([...plan.downloads, ...plan.overwrites]);
  if (plan.conflicts.length > 0) {
    steps.print(
      'WARNING: these Library files differ from R2 and were left alone. Run ./pull --force to replace them with the R2 version:',
    );
    for (const path of plan.conflicts) steps.print(`  ${path}`);
  }
  return {
    downloaded: plan.downloads.length,
    overwritten: plan.overwrites.length,
    differing: plan.conflicts.length,
    unchanged: plan.unchanged.length,
    localOnly: plan.localOnly.length,
  };
}
