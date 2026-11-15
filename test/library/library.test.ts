import { describe, expect, test } from 'vitest';
import { Library } from '../../src/library/library.ts';
import { album, img } from './entries.ts';

const silentLog = { warn: () => {} };

// Ported from AppStateSpec.scala
describe('Library', () => {
  test('identifies orphans and builds the child tree', () => {
    const img1 = img('/dir/img1');
    const img2 = img('/dir/img2');
    const img3 = img('/dir2/img3');
    const img4 = img('/img4');
    const alb1 = album('/alb1', ['/dir/*', '/img4']);
    const alb2 = album('/dir/alb2', ['/dir/img1']);
    const library = new Library([img1, img2, img3, img4, alb1, alb2], silentLog);
    expect(library.orphans).toEqual([img3, alb1]);
    expect(library.children.get(alb1.id)).toEqual([img1, img2, alb2, img4]);
    expect(library.children.get(alb2.id)).toEqual([img1]);
  });

  test('does not include Albums matching themselves', () => {
    const alb1 = album('/alb1', ['*']);
    const library = new Library([alb1], silentLog);
    expect(library.children.get(alb1.id)).toBeUndefined();
  });

  test('does not duplicate child entries', () => {
    const img1 = img('/dir/img1');
    const alb1 = album('/alb1', ['/dir/*', '/dir/img1']);
    const library = new Library([img1, alb1], silentLog);
    expect(library.children.get(alb1.id)).toEqual([img1]);
  });

  test('coverImage dives head first into a tree of Albums to find the first Photo entry', () => {
    const img1 = img('/img1');
    const alb1 = album('/alb1', ['alb2']);
    const alb2 = album('/alb2', ['/dir/*']);
    const alb3 = album('/dir/alb3', ['/img1']);
    const library = new Library([img1, alb1, alb2, alb3], silentLog);
    expect(library.coverImage(alb3.id)).toBe(img1.id);
  });

  test('coverImage does not get stuck in a loop', () => {
    const alb1 = album('/alb1', ['alb2']);
    const alb2 = album('/alb2', ['alb1']);
    const alb3 = album('/alb3', ['/alb1']);
    const library = new Library([alb1, alb2, alb3], silentLog);
    expect(library.coverImage(alb3.id)).toBeUndefined();
  });

  test('bestAlbum is the Album /Best or /best', () => {
    const best = album('/Best', ['/img1']);
    expect(new Library([img('/img1'), album('/other', []), best], silentLog).bestAlbum).toEqual(best);
    const lowerCaseBest = album('/best', ['/img1']);
    expect(new Library([lowerCaseBest], silentLog).bestAlbum).toEqual(lowerCaseBest);
    expect(new Library([album('/dir/Best', []), img('/Best')], silentLog).bestAlbum).toBeUndefined();
  });

  test('keeps the first of entries sharing an ID, with a warning', () => {
    const warnings: string[] = [];
    const norwayAlbum = album('/Norway', ['/Norway/*']);
    const library = new Library([norwayAlbum, img('/Norway'), img('/Norway/Oslo')], { warn: (message) => warnings.push(message) });
    expect(library.entries).toEqual([norwayAlbum, img('/Norway/Oslo')]);
    expect(library.orphans).toEqual([norwayAlbum]);
    expect(warnings).toEqual([
      'Duplicate album entries detected! Please check for duplicates for the following IDs: /Norway',
    ]);
  });
});
