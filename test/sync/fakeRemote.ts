import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { RemoteFile } from '../../src/sync/files.ts';
import type { Remote, Upload } from '../../src/sync/remote.ts';

export interface StoredObject {
  content: Buffer;
  contentDisposition: string | undefined;
}

/** R2 in memory: uploads copy files from the Library folder into `objects`, downloads copy them back. */
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

  async download(paths: string[]): Promise<void> {
    for (const path of paths) {
      const object = this.objects.get(path);
      if (object === undefined) throw new Error(`R2 has no ${path}`);
      await mkdir(dirname(join(this.libraryPath, path)), { recursive: true });
      await writeFile(join(this.libraryPath, path), object.content);
    }
  }

  async delete(paths: string[]): Promise<void> {
    for (const path of paths) this.objects.delete(path);
  }
}
