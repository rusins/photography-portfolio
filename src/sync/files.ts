/** A file in the Library, by its path within the Library, e.g. `2023/Norway/info.json`. */
export interface LocalFile {
  path: string;
  size: number;
  /** MD5 of the content, in lowercase hex. */
  md5: string;
}

/** An object in R2, by the same path as the Library file it mirrors. */
export interface RemoteFile {
  path: string;
  size: number;
  /** MD5 of the content in lowercase hex, or undefined if R2 doesn't know it (e.g. not uploaded by rclone). */
  md5: string | undefined;
}

/** Whether R2 holds the same content as the Library file. Unknown content counts as different. */
export function sameContent(local: LocalFile, remote: RemoteFile): boolean {
  return local.size === remote.size && local.md5 === remote.md5;
}
