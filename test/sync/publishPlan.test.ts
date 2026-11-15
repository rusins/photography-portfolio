import { describe, expect, test } from 'vitest';
import { planPublish } from '../../src/sync/publishPlan.ts';

describe('planPublish', () => {
  test('uploads a file that R2 does not have', () => {
    const plan = planPublish([{ path: 'a/info.json', size: 2, md5: 'aa' }], []);
    expect(plan).toEqual({ uploads: ['a/info.json'], unchanged: [], deletions: [], needsConfirmation: false });
  });

  test('leaves a file with the same content alone', () => {
    const plan = planPublish([{ path: 'a/b.jpg', size: 3, md5: 'abc' }], [{ path: 'a/b.jpg', size: 3, md5: 'abc' }]);
    expect(plan).toEqual({ uploads: [], unchanged: ['a/b.jpg'], deletions: [], needsConfirmation: false });
  });

  test('uploads a file whose content changed but whose size did not', () => {
    const plan = planPublish([{ path: 'a/b.jpg', size: 3, md5: 'new' }], [{ path: 'a/b.jpg', size: 3, md5: 'old' }]);
    expect(plan).toEqual({ uploads: ['a/b.jpg'], unchanged: [], deletions: [], needsConfirmation: false });
  });

  test('uploads a file whose content R2 does not know', () => {
    const plan = planPublish([{ path: 'a/b.jpg', size: 3, md5: 'abc' }], [{ path: 'a/b.jpg', size: 3, md5: undefined }]);
    expect(plan.uploads).toEqual(['a/b.jpg']);
  });

  test('deletes a file only R2 has, after confirmation', () => {
    const plan = planPublish([], [{ path: 'gone/info.json', size: 2, md5: 'aa' }]);
    expect(plan).toEqual({ uploads: [], unchanged: [], deletions: ['gone/info.json'], needsConfirmation: true });
  });
});
