import { join } from 'node:path';
import type { RemoteFile } from './files.ts';
import type { ProcessRunner } from './processRunner.ts';
import type { Remote, Upload } from './remote.ts';

export interface RcloneSettings {
  libraryPath: string;
  /** Name of the rclone remote (an S3 remote for R2) in the user's own rclone config. */
  rcloneRemote: string;
  bucket: string;
}

/** Shape of one entry of `rclone lsjson` output. */
interface ListedObject {
  Path: string;
  Size: number;
  Hashes?: { md5?: string };
}

/** The R2 bucket, through rclone. */
export class RcloneRemote implements Remote {
  readonly settings: RcloneSettings;
  readonly runner: ProcessRunner;

  constructor(settings: RcloneSettings, runner: ProcessRunner) {
    this.settings = settings;
    this.runner = runner;
  }

  /**
   * R2's ETag is the MD5 only for single-part uploads; for multipart uploads rclone stores the MD5 it computed
   * in the object's `md5chksum` metadata and reports that instead. Objects without either have no md5.
   */
  async list(): Promise<RemoteFile[]> {
    const output = await this.runner.run('rclone', [
      'lsjson',
      '--recursive',
      '--files-only',
      '--fast-list',
      '--hash-type',
      'MD5',
      this.bucketPath(),
    ]);
    return (JSON.parse(output) as ListedObject[]).map((object) => ({
      path: object.Path,
      size: object.Size,
      md5: object.Hashes?.md5 || undefined,
    }));
  }

  /** `--ignore-times` because the plan already decided these differ, even if size and time match. */
  async upload(uploads: Upload[]): Promise<void> {
    const plainPaths = uploads.filter((upload) => upload.contentDisposition === undefined).map((upload) => upload.path);
    if (plainPaths.length > 0) {
      await this.runner.run(
        'rclone',
        ['copy', '--verbose', '--ignore-times', '--no-traverse', '--files-from-raw', '-', this.settings.libraryPath, this.bucketPath()],
        plainPaths.map((path) => `${path}\n`).join(''),
      );
    }
    for (const { path, contentDisposition } of uploads) {
      if (contentDisposition === undefined) continue;
      await this.runner.run('rclone', [
        'copyto',
        '--verbose',
        '--ignore-times',
        '--header-upload',
        `Content-Disposition: ${contentDisposition}`,
        join(this.settings.libraryPath, path),
        this.bucketPath(path),
      ]);
    }
  }

  /** One `deletefile` per path: it can only ever delete that one object. */
  async delete(paths: string[]): Promise<void> {
    for (const path of paths) await this.runner.run('rclone', ['deletefile', '--verbose', this.bucketPath(path)]);
  }

  private bucketPath(path?: string): string {
    const bucket = `${this.settings.rcloneRemote}:${this.settings.bucket}`;
    return path === undefined ? bucket : `${bucket}/${path}`;
  }
}
