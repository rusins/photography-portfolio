import { delimiterPattern } from '../library/patterns.ts';
import { lastIdPart, type ImageId, type PhotoEntry } from '../library/photoEntry.ts';
import { escapeHtml } from './html.ts';
import { imagePageUrl, previewUrl } from './urls.ts';

/** Previews linking to their image pages, which open as Unpoly pop-overs. */
export function photoBoxes(entries: PhotoEntry[]): string {
  return entries
    .map(
      (entry) =>
        `<div class="photo-box animated-padding"><a href="${escapeHtml(imagePageUrl(entry.id))}" up-layer="new" up-history="false" up-size="large"><img src="${escapeHtml(previewUrl(entry.id))}" alt="${escapeHtml(altText(entry.id))}"></a></div>`,
    )
    .join('');
}

/** Photo boxes in columns. */
export function imageGrid(entries: PhotoEntry[]): string {
  return `<div style="margin: 1em 1em 0"><div class="columns">${photoBoxes(entries)}</div></div>`;
}

/** E.g. `An image of my backyard.` for `/2023/my_backyard`. */
export function altText(id: ImageId): string {
  return `An image of ${lastIdPart(id).replaceAll(delimiterPattern, ' ')}.`;
}

/**
 * Photo boxes kept in a `<template>`, so browsers load none of their Previews, next to empty columns that main.js
 * fills with them in random order.
 */
export function randomImageGrid(entries: PhotoEntry[]): string {
  return `<div class="random-photos" style="margin: 1em 1em 0"><template>${photoBoxes(entries)}</template><div class="columns"></div></div>`;
}
