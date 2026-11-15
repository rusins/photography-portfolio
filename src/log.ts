/** Where the build reports problems that don't stop it. */
export interface Log {
  warn(message: string): void;
}

export const consoleLog: Log = {
  warn: (message) => console.warn(`WARN: ${message}`),
};
