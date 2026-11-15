import { escapeHtml } from './html.ts';

/** Open Graph metadata, https://ogp.me/ */
export interface OpenGraph {
  title: string;
  pageUrl: string;
  /** Left out when there is no Photo entry to show. */
  imageUrl?: string;
  description?: string;
}

/** A full HTML page with the shared `<head>`: favicon, Unpoly, Pure CSS, custom.css, Raleway and main.js. */
export function htmlDocument(siteTitle: string, openGraph: OpenGraph | undefined, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(siteTitle)}</title>
<meta name="description" content="${escapeHtml(openGraph?.description ?? '')}">
${openGraph === undefined ? '' : openGraphTags(openGraph)}<link rel="icon" href="/img/favicon.svg">
<link rel="stylesheet" href="/css/unpoly.min.css">
<link rel="stylesheet" href="/css/pure-min.css">
<link rel="stylesheet" href="/css/custom.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Raleway">
<script src="/js/unpoly.min.js"></script>
<script src="/js/main.js"></script>
</head>
<body>${body}</body>
</html>
`;
}

function openGraphTags({ title, pageUrl, imageUrl, description }: OpenGraph): string {
  const property = (name: string, content: string) => `<meta property="${name}" content="${escapeHtml(content)}">\n`;
  const named = (name: string, content: string) => `<meta name="${name}" content="${escapeHtml(content)}">\n`;
  return [
    property('og:title', title),
    property('og:type', 'website'),
    property('og:url', pageUrl),
    imageUrl === undefined ? '' : property('og:image', imageUrl),
    description === undefined ? '' : property('og:description', description),
    named('twitter:card', 'summary_large_image'),
    named('twitter:title', title),
    description === undefined ? '' : named('twitter:description', description),
    imageUrl === undefined ? '' : named('twitter:image', imageUrl),
  ].join('');
}

/** A page with the shared header: the navigation menu and the site title linking home. */
export function pageWithNavigation(siteTitle: string, openGraph: OpenGraph | undefined, content: string): string {
  const menuItem = (unpolyAttribute: string, href: string, text: string) =>
    `<li class="pure-menu-item"><a class="pure-menu-link" ${unpolyAttribute} href="${href}" onclick="toggleMenu()">${text}</a></li>`;
  const header =
    '<header><div id="menuToggle" onclick="toggleMenu()">☰</div><nav id="menu" class="navigation pure-menu"><ul class="pure-menu-list">' +
    '<li id="closeMenu" class="pure-menu-item"><a class="pure-menu-link" href="#" onclick="toggleMenu()">Close Menu</a></li>' +
    menuItem('up-instant', '/recent', 'Recent') +
    menuItem('up-instant', '/albums', 'Albums') +
    menuItem('up-preload', '/tags', 'Tags') +
    `</ul></nav><span class="pure-menu-heading" style="text-align: center"><a href="/" class="pure-menu-link" up-follow style="display: inline">${escapeHtml(siteTitle)}</a></span></header>`;
  return htmlDocument(siteTitle, openGraph, `${header}<main>${content}</main>`);
}

/** A page heading, e.g. an Album's name. */
export function centeredTopText(text: string): string {
  return `<h1 style="text-align: center; font-family: 'Raleway', sans-serif; font-weight: 300">${escapeHtml(text)}</h1>`;
}
