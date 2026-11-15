import { open } from 'node:fs/promises';

/** Only the start of the file is checked, for efficiency. */
const bytesToCheck = 1024;

/** Whether the file looks UTF-8 encoded. */
export async function isUtf8File(path: string): Promise<boolean> {
  const file = await open(path);
  try {
    const { buffer, bytesRead } = await file.read(Buffer.alloc(bytesToCheck), 0, bytesToCheck, 0);
    // `stream: true` tolerates a character cut off at the end of the checked bytes.
    new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytesRead), { stream: true });
    return true;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  } finally {
    await file.close();
  }
}
