import { delimiterPattern } from '../library/patterns.ts';
import { lastIdPart, type ImageId, type PhotoEntry } from '../library/photoEntry.ts';
import { escapeHtml } from './html.ts';
import { imagePageUrl, previewUrl } from './urls.ts';

/** Previews linking to their image pages, which open as Unpoly pop-overs. */
export function photoBoxes(entries: PhotoEntry[]): string {
  return entries.map(photoBox).join('');
}

/** A Preview linking to its image page, which opens as an Unpoly pop-over. */
function photoBox(entry: PhotoEntry): string {
  return `<div class="photo-box animated-padding"><a href="${escapeHtml(imagePageUrl(entry.id))}" up-layer="new" up-history="false" up-size="large"><img src="${escapeHtml(previewUrl(entry.id))}" alt="${escapeHtml(altText(entry.id))}"></a></div>`;
}

/** Photo boxes in columns. */
export function imageGrid(entries: PhotoEntry[]): string {
  return gridContainer('', `<div class="columns">${photoBoxes(entries)}</div>`);
}

/** The margins around an image grid. */
function gridContainer(attributes: string, content: string): string {
  return `<div${attributes} style="margin: 1em 1em 0">${content}</div>`;
}

/** E.g. `An image of my backyard.` for `/2023/my_backyard`. */
export function altText(id: ImageId): string {
  return `An image of ${lastIdPart(id).replaceAll(delimiterPattern, ' ')}.`;
}

/**
 * Empty columns that main.js fills with up to 12 photo boxes, picked at random each time the grid is shown. The boxes'
 * HTML is kept as a JSON array of strings in an attribute, not as elements: browsers would load the Previews of
 * `<img>` elements even inside a `<template>` (Firefox preloads them), i.e. every Preview in the Library.
 */
export function randomImageGrid(entries: PhotoEntry[]): string {
  const boxes = escapeHtml(JSON.stringify(entries.map(photoBox)));
  return gridContainer(` class="random-photos" data-photo-boxes="${boxes}"`, '<div class="columns"></div>');
}
