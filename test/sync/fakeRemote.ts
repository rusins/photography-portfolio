import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RemoteFile } from '../../src/sync/files.ts';
import type { Remote, Upload } from '../../src/sync/remote.ts';

export interface StoredObject {
  content: Buffer;
  contentDisposition: string | undefined;
}

/** R2 in memory: uploads copy files from the Library folder into `objects`. */
export class FakeRemote implements Remote {
  readonly objects = new Map<string, StoredObject>();
  readonly libraryPath: string;

  constructor(libraryPath: string) {
    this.libraryPath = libraryPath;
  }

  async list(): Promise<RemoteFile[]> {
    return [...this.objects].map(([path, { content }]) => ({
      path,
      size: content.length,
      md5: createHash('md5').update(content).digest('hex'),
    }));
  }

  async upload(uploads: Upload[]): Promise<void> {
    for (const { path, contentDisposition } of uploads) {
      this.objects.set(path, { content: await readFile(join(this.libraryPath, path)), contentDisposition });
    }
  }

  async delete(paths: string[]): Promise<void> {
    for (const path of paths) this.objects.delete(path);
  }
}
