import type { RemoteFile } from './files.ts';

/** A Library file to copy to R2, with the Content-Disposition header it is served with, if any. */
export interface Upload {
  path: string;
  contentDisposition: string | undefined;
}

/** The R2 bucket that mirrors the Library. Paths are paths within the Library. */
export interface Remote {
  list(): Promise<RemoteFile[]>;
  upload(uploads: Upload[]): Promise<void>;
  delete(paths: string[]): Promise<void>;
}
