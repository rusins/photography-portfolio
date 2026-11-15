import { createInterface } from 'node:readline/promises';

/** Whether an answer to a y/N question is yes. Anything else, including nothing, is no. */
export function isYes(answer: string): boolean {
  return /^y(es)?$/i.test(answer.trim());
}

/** Asks a y/N question in the terminal. Closed input counts as no. */
export async function askInTerminal(question: string): Promise<boolean> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const inputClosed = new Promise<string>((resolve) => terminal.once('close', () => resolve('')));
  try {
    return isYes(await Promise.race([terminal.question(`${question} [y/N] `), inputClosed]));
  } finally {
    terminal.close();
  }
}
