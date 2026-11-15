import { escapeHtml } from './html.ts';

/** Open Graph metadata, https://ogp.me/ */
export interface OpenGraph {
  title: string;
  pageUrl: string;
  imageUrl: string;
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
    property('og:image', imageUrl),
    description === undefined ? '' : property('og:description', description),
    named('twitter:card', 'summary_large_image'),
    named('twitter:title', title),
    description === undefined ? '' : named('twitter:description', description),
    named('twitter:image', imageUrl),
  ].join('');
}
