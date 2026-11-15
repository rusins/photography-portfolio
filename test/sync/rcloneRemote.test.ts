import { describe, expect, test } from 'vitest';
import type { ProcessRunner } from '../../src/sync/processRunner.ts';
import { RcloneRemote } from '../../src/sync/rcloneRemote.ts';

interface Call {
  command: string;
  args: string[];
  input: string | undefined;
}

/** Records the commands instead of running them, answering with `output`. */
function recordingRunner(output = ''): { runner: ProcessRunner; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    runner: {
      run: async (command, args, input) => {
        calls.push({ command, args, input });
        return output;
      },
    },
  };
}

const settings = { libraryPath: '/photos/Library', rcloneRemote: 'r2', bucket: 'photos' };

describe('RcloneRemote', () => {
  test('lists the bucket with MD5s, which rclone keeps for multipart uploads too', async () => {
    const { runner, calls } = recordingRunner(
      JSON.stringify([
        { Path: '2023/Day 1.jpg', Name: 'Day 1.jpg', Size: 10, Hashes: { md5: 'abc' } },
        { Path: 'Best.album', Name: 'Best.album', Size: 3, Hashes: { md5: '' } },
        { Path: 'LICENSE', Name: 'LICENSE', Size: 4 },
      ]),
    );
    expect(await new RcloneRemote(settings, runner).list()).toEqual([
      { path: '2023/Day 1.jpg', size: 10, md5: 'abc' },
      { path: 'Best.album', size: 3, md5: undefined },
      { path: 'LICENSE', size: 4, md5: undefined },
    ]);
    expect(calls).toEqual([
      {
        command: 'rclone',
        args: ['lsjson', '--recursive', '--files-only', '--fast-list', '--hash-type', 'MD5', 'r2:photos'],
        input: undefined,
      },
    ]);
  });

  test('uploads plain files in one batch and each download with its Content-Disposition, replacing what R2 has', async () => {
    const { runner, calls } = recordingRunner();
    await new RcloneRemote(settings, runner).upload([
      { path: '2023/info.json', contentDisposition: undefined },
      { path: '2023/Day 1.jpg', contentDisposition: 'attachment; filename="x.jpg"' },
      { path: 'LICENSE', contentDisposition: undefined },
    ]);
    expect(calls).toEqual([
      {
        command: 'rclone',
        args: ['copy', '--verbose', '--ignore-times', '--no-traverse', '--files-from-raw', '-', '/photos/Library', 'r2:photos'],
        input: '2023/info.json\nLICENSE\n',
      },
      {
        command: 'rclone',
        args: [
          'copyto',
          '--verbose',
          '--ignore-times',
          '--header-upload',
          'Content-Disposition: attachment; filename="x.jpg"',
          '/photos/Library/2023/Day 1.jpg',
          'r2:photos/2023/Day 1.jpg',
        ],
        input: undefined,
      },
    ]);
  });

  test('downloads files in one batch into the Library at the same paths, replacing what the Library has', async () => {
    const { runner, calls } = recordingRunner();
    await new RcloneRemote(settings, runner).download(['2023/Norway Trip/Diena 1 ā.jpg', 'LICENSE']);
    expect(calls).toEqual([
      {
        command: 'rclone',
        args: ['copy', '--verbose', '--ignore-times', '--no-traverse', '--files-from-raw', '-', 'r2:photos', '/photos/Library'],
        input: '2023/Norway Trip/Diena 1 ā.jpg\nLICENSE\n',
      },
    ]);
  });

  test('runs nothing when there is nothing to upload, download or delete', async () => {
    const { runner, calls } = recordingRunner();
    const remote = new RcloneRemote(settings, runner);
    await remote.upload([]);
    await remote.download([]);
    await remote.delete([]);
    expect(calls).toEqual([]);
  });

  test('deletes each file on its own, so a mistake can never widen to the whole bucket', async () => {
    const { runner, calls } = recordingRunner();
    await new RcloneRemote(settings, runner).delete(['Old/info.json', 'Old/a b.jpg']);
    expect(calls).toEqual([
      { command: 'rclone', args: ['deletefile', '--verbose', 'r2:photos/Old/info.json'], input: undefined },
      { command: 'rclone', args: ['deletefile', '--verbose', 'r2:photos/Old/a b.jpg'], input: undefined },
    ]);
  });
});
