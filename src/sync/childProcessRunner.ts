import { spawn } from 'node:child_process';
import type { ProcessRunner } from './processRunner.ts';

/** Runs programs for real, with their error output going to this terminal. */
export const childProcessRunner: ProcessRunner = {
  run: (command, args, input) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'inherit'] });
      const output: Buffer[] = [];
      child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve(Buffer.concat(output).toString('utf8'));
        else reject(new Error(`${[command, ...args].join(' ')} failed with exit code ${String(code)}`));
      });
      child.stdin.on('error', () => {}); // a program may exit without reading its input; its exit code tells
      child.stdin.end(input ?? '');
    }),
};
