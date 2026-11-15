import { sameContent, type LocalFile, type RemoteFile } from './files.ts';

/** What publishing changes in R2, as paths within the Library. */
export interface PublishPlan {
  uploads: string[];
  unchanged: string[];
  deletions: string[];
  /** Whether to ask before going ahead, as deleting may mean the Library is incomplete. */
  needsConfirmation: boolean;
}

/** Makes R2 mirror the Library: uploads what's new or changed, deletes what's only in R2. */
export function planPublish(local: LocalFile[], remote: RemoteFile[]): PublishPlan {
  const remoteByPath = new Map(remote.map((file) => [file.path, file]));
  const localPaths = new Set(local.map((file) => file.path));
  const uploads: string[] = [];
  const unchanged: string[] = [];
  for (const file of local) {
    const remoteFile = remoteByPath.get(file.path);
    if (remoteFile !== undefined && sameContent(file, remoteFile)) unchanged.push(file.path);
    else uploads.push(file.path);
  }
  const deletions = remote.filter((file) => !localPaths.has(file.path)).map((file) => file.path);
  return { uploads, unchanged, deletions, needsConfirmation: deletions.length > 0 };
}
