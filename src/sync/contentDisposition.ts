import { downloadName } from '../site/urls.ts';

/**
 * The Content-Disposition header that makes the files domain save a Library file under its download name.
 * `filename` is an ASCII stand-in for old browsers; `filename*` is the exact name (RFC 6266).
 */
export function contentDisposition(pathInLibrary: string): string {
  const name = downloadName(pathInLibrary);
  const asciiName = name.replace(/[^\x20-\x7e]|["\\]/gu, '_');
  const encodedName = encodeURIComponent(name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}
