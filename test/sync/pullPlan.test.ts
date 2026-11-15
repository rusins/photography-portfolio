import { describe, expect, test } from 'vitest';
import { planPull } from '../../src/sync/pullPlan.ts';

describe('planPull', () => {
  test('downloads a file that only R2 has', () => {
    const plan = planPull([], [{ path: '2023/Norway Trip/Diena 1 ā.jpg', size: 3, md5: 'abc' }], { force: false });
    expect(plan).toEqual({ downloads: ['2023/Norway Trip/Diena 1 ā.jpg'], overwrites: [], conflicts: [], unchanged: [], localOnly: [] });
  });

  test('leaves a file with the same content alone', () => {
    const plan = planPull([{ path: 'a/b.jpg', size: 3, md5: 'abc' }], [{ path: 'a/b.jpg', size: 3, md5: 'abc' }], { force: false });
    expect(plan).toEqual({ downloads: [], overwrites: [], conflicts: [], unchanged: ['a/b.jpg'], localOnly: [] });
  });

  test('reports a file whose content differs and leaves it alone', () => {
    const plan = planPull([{ path: 'a/info.json', size: 2, md5: 'new' }], [{ path: 'a/info.json', size: 2, md5: 'old' }], { force: false });
    expect(plan).toEqual({ downloads: [], overwrites: [], conflicts: ['a/info.json'], unchanged: [], localOnly: [] });
  });

  test('with force, overwrites a file whose content differs', () => {
    const plan = planPull([{ path: 'a/info.json', size: 2, md5: 'new' }], [{ path: 'a/info.json', size: 2, md5: 'old' }], { force: true });
    expect(plan).toEqual({ downloads: [], overwrites: ['a/info.json'], conflicts: [], unchanged: [], localOnly: [] });
  });

  test('reports a file whose content R2 does not know, rather than overwriting it unasked', () => {
    const local = [{ path: 'a/b.jpg', size: 3, md5: 'abc' }];
    const remote = [{ path: 'a/b.jpg', size: 3, md5: undefined }];
    expect(planPull(local, remote, { force: false }).conflicts).toEqual(['a/b.jpg']);
    expect(planPull(local, remote, { force: true }).overwrites).toEqual(['a/b.jpg']);
  });

  test('without force, files only the Library has are untouched while others are downloaded or reported', () => {
    const local = [
      { path: 'new/info.json', size: 2, md5: 'aa' },
      { path: 'new/photo.jpg', size: 5, md5: 'bb' },
      { path: 'a/info.json', size: 2, md5: 'new' },
    ];
    const remote = [
      { path: 'a/info.json', size: 2, md5: 'old' },
      { path: 'b/info.json', size: 2, md5: 'cc' },
    ];
    expect(planPull(local, remote, { force: false })).toEqual({
      downloads: ['b/info.json'],
      overwrites: [],
      conflicts: ['a/info.json'],
      unchanged: [],
      localOnly: ['new/info.json', 'new/photo.jpg'],
    });
  });

  test.each([false, true])('leaves a file only the Library has alone (force: %s)', (force) => {
    const plan = planPull([{ path: 'new/info.json', size: 2, md5: 'aa' }], [], { force });
    expect(plan).toEqual({ downloads: [], overwrites: [], conflicts: [], unchanged: [], localOnly: ['new/info.json'] });
  });
});
