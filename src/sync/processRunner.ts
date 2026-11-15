/** Runs other programs, such as rclone and wrangler. */
export interface ProcessRunner {
  /**
   * Runs `command` and waits for it. Its error output goes to the terminal.
   * @param input written to its standard input
   * @returns its standard output
   * @throws if it exits unsuccessfully
   */
  run(command: string, args: string[], input?: string): Promise<string>;
}
