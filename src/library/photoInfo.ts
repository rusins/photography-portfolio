import { localDateTime, type LocalDateTime } from './localDateTime.ts';
import type { PhotoInfo } from './photoEntry.ts';

const textFields = [
  'primaryImageFile',
  'description',
  'cameraModel',
  'aperture',
  'focalLength',
  'shutterSpeed',
  'iso',
] as const;

/** Reads `info.json` contents. All fields are optional; a field of the wrong type is an error. */
export function parsePhotoInfo(json: string): PhotoInfo {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected a JSON object');
  }
  const fields = parsed as Record<string, unknown>;
  const info: PhotoInfo = {};
  for (const name of textFields) {
    const value = fields[name];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') throw new Error(`${name}: expected a string`);
    info[name] = value;
  }
  if (fields['time'] !== undefined && fields['time'] !== null) info.time = parseIsoTime(fields['time']);
  if (fields['tags'] !== undefined && fields['tags'] !== null) info.tags = parseTags(fields['tags']);
  return info;
}

/** Accepts ISO local date times like `2024-01-27T18:20:54`, seconds and fractions optional. */
function parseIsoTime(value: unknown): LocalDateTime {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/.exec(value) : null;
  const time =
    match === null
      ? undefined
      : localDateTime(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] ?? 0));
  if (time === undefined) throw new Error('time: expected a date time like 2024-01-27T18:20:54');
  return time;
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((tag) => typeof tag === 'string')) {
    throw new Error('tags: expected a list of strings');
  }
  return value;
}
