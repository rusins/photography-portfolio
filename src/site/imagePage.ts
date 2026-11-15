import type { SiteConfig } from '../config.ts';
import { downloadName } from '../library/downloadName.ts';
import { formatLocalDateTime } from '../library/localDateTime.ts';
import { lastIdPart, type PhotoEntry } from '../library/photoEntry.ts';
import { escapeHtml } from './html.ts';
import { htmlDocument } from './layout.ts';
import { altText } from './photoGrid.ts';
import { tagList } from './tagPages.ts';
import { imagePageUrl, libraryFileUrl, previewUrl } from './urls.ts';

const downloadLinkStyle = "font-family: 'Raleway', sans-serif; font-weight: 200; font-size: 2em; color: black";

/**
 * The page for one Photo entry, at `/image/<Image ID>`. Like the old server's image page it has no navigation,
 * as it is mostly opened as an Unpoly pop-over.
 * @param showLicenseNote whether the Library has a LICENSE file
 */
export function imagePage(entry: PhotoEntry, config: SiteConfig, showLicenseNote: boolean): string {
  const { info } = entry;
  const details = [
    info.time === undefined ? '' : formatLocalDateTime(info.time),
    info.focalLength ?? '',
    info.aperture ?? '',
    info.shutterSpeed ?? '',
    info.iso ?? '',
    info.cameraModel ?? '',
  ];
  const downloadLink = (pathInLibrary: string, text: string) =>
    `<div><a style="${downloadLinkStyle}" href="${escapeHtml(libraryFileUrl(config.filesUrl, pathInLibrary))}" download="${escapeHtml(downloadName(pathInLibrary))}">${text}</a></div>`;
  const licenseNote = showLicenseNote
    ? '<div style="text-align: center; margin: 0.5em"><span>By downloading, you agree to the <a href="/license">License Terms</a></span></div>'
    : '<div></div>';
  const openGraph = {
    title: `${lastIdPart(entry.id)} | ${config.siteTitle}`,
    pageUrl: config.siteUrl + imagePageUrl(entry.id),
    imageUrl: config.siteUrl + previewUrl(entry.id),
    ...(info.description === undefined ? {} : { description: info.description }),
  };

  return htmlDocument(
    config.siteTitle,
    openGraph,
    `<main>
<div class="photo-box center" style="max-width: 100%; max-height: 75vh"><img src="${escapeHtml(previewUrl(entry.id))}" alt="${escapeHtml(altText(entry.id))}"></div>
<h1 style="text-align: center; font-family: 'Raleway', sans-serif; font-weight: 500">${escapeHtml(info.description ?? '')}</h1>
<p style="text-align: center; font-family: 'Raleway', sans-serif; font-weight: 200">${details.map(escapeHtml).join('<br>')}</p>
<div class="center">
<div style="text-align: center">${entry.originals.map((path) => downloadLink(path, 'Download Photo')).join('')}</div>
<div style="text-align: center">${entry.rawFiles.map((path) => downloadLink(path, 'Download Raw File')).join('')}</div>
${licenseNote}
</div>
${tagList(info.tags ?? [])}
</main>`,
  );
}
