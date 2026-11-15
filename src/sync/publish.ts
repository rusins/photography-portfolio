import { originalPattern, rawFilePattern } from '../library/patterns.ts';
import { contentDisposition } from './contentDisposition.ts';
import { listLibraryFiles } from './localFiles.ts';
import { planPublish } from './publishPlan.ts';
import type { Remote, Upload } from './remote.ts';

/** The boundaries publish works through. */
export interface PublishSteps {
  libraryPath: string;
  /** Where Library file MD5s are cached, outside the Library. */
  hashCachePath: string;
  remote: Remote;
  /** Asks a yes/no question; true only for yes. */
  confirm(question: string): Promise<boolean>;
  /** Deploys the already built site folder. */
  deploySite(): Promise<void>;
  print(line: string): void;
}

export interface PublishSummary {
  uploaded: number;
  unchanged: number;
  deleted: number;
}

/**
 * Makes R2 mirror the Library, then deploys the site.
 * @returns undefined if the user declined the deletions, in which case nothing was changed
 */
export async function publish(steps: PublishSteps): Promise<PublishSummary | undefined> {
  const plan = planPublish(await listLibraryFiles(steps.libraryPath, steps.hashCachePath), await steps.remote.list());
  if (plan.needsConfirmation) {
    steps.print('These files are in R2 but not in the Library, and would be deleted from R2:');
    for (const path of plan.deletions) steps.print(`  ${path}`);
    steps.print('WARNING: the Library may be incomplete. If it is, answer no and run ./pull first.');
    if (!(await steps.confirm(`Delete these ${plan.deletions.length} files from R2?`))) return undefined;
  }
  await steps.remote.upload(plan.uploads.map(upload));
  await steps.remote.delete(plan.deletions);
  await steps.deploySite();
  return { uploaded: plan.uploads.length, unchanged: plan.unchanged.length, deleted: plan.deletions.length };
}

/** Originals and Raw files are saved under their download name. */
function upload(path: string): Upload {
  const fileName = path.slice(path.lastIndexOf('/') + 1);
  const isDownload = originalPattern.test(fileName) || rawFilePattern.test(fileName);
  return { path, contentDisposition: isDownload ? contentDisposition(path) : undefined };
}
