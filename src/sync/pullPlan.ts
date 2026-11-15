import { sameContent, type LocalFile, type RemoteFile } from './files.ts';

/** What pulling changes in the Library, as paths within the Library. */
export interface PullPlan {
  /** Only in R2. */
  downloads: string[];
  /** Different in R2 and the Library, replaced by the R2 version because of `force`. */
  overwrites: string[];
  /** Different in R2 and the Library, left alone without `force`. */
  conflicts: string[];
  unchanged: string[];
  /** Only in the Library, always left alone. */
  localOnly: string[];
}

/** Brings the Library up to date with R2 without ever deleting from it. */
export function planPull(local: LocalFile[], remote: RemoteFile[], options: { force: boolean }): PullPlan {
  const localByPath = new Map(local.map((file) => [file.path, file]));
  const plan: PullPlan = { downloads: [], overwrites: [], conflicts: [], unchanged: [], localOnly: [] };
  for (const file of remote) {
    const localFile = localByPath.get(file.path);
    if (localFile === undefined) plan.downloads.push(file.path);
    else if (sameContent(localFile, file)) plan.unchanged.push(file.path);
    else if (options.force) plan.overwrites.push(file.path);
    else plan.conflicts.push(file.path);
  }
  const remotePaths = new Set(remote.map((file) => file.path));
  plan.localOnly = local.filter((file) => !remotePaths.has(file.path)).map((file) => file.path);
  return plan;
}
