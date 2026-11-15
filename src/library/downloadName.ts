/**
 * The name a downloaded Original or Raw file is saved under, e.g. `Raitis_Krikis-2023-Norway-photo.jpg`.
 * Used by the site's download links and by the Content-Disposition header R2 serves the file with.
 */
export function downloadName(pathInLibrary: string): string {
  return `Raitis_Krikis-${pathInLibrary.replaceAll('/', '-')}`;
}
