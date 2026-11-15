import { localDateTime, type LocalDateTime } from './localDateTime.ts';
import type { PhotoInfo } from './photoEntry.ts';

/** Parses Exif date time text like `2021:10:17 00:33:35`, optionally wrapped in single quotes. */
export function parseExifDateTime(text: string): LocalDateTime | undefined {
  const match = /^'?(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})'?$/.exec(text);
  if (match === null) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number) as [number, number, number, number, number, number];
  return localDateTime(year, month, day, hour, minute, second);
}

const romanDigits: Record<string, string> = {
  '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX',
};

/** Turns a Sony Exif model like `ILCE-7M4` into its marketing name `Sony a7 IV`. */
export function parseSonyModel(exifModel: string): string | undefined {
  if (!exifModel.startsWith('ILCE-')) return undefined;
  const suffix = exifModel.slice('ILCE-'.length);
  return `Sony a${sonyModelName(suffix)}`;
}

function sonyModelName(suffix: string): string {
  const parts = splitDroppingTrailingEmpty(suffix, 'M');
  if (parts.length !== 2) return suffix;
  const [base, version] = parts as [string, string];
  return `${base.toLowerCase()} ${romanDigits[version] ?? version}`;
}

/** Splits like Java's String.split, which drops trailing empty parts. */
function splitDroppingTrailingEmpty(text: string, separator: string): string[] {
  const parts = text.split(separator);
  while (parts.length > 0 && parts.at(-1) === '') parts.pop();
  return parts;
}

/** The Exif tags the old server read, as exifr names them without value conversion. */
export interface ExifTags {
  DateTimeOriginal?: unknown;
  Make?: unknown;
  Model?: unknown;
  FNumber?: unknown;
  ApertureValue?: unknown;
  FocalLength?: unknown;
  ExposureTime?: unknown;
  ShutterSpeedValue?: unknown;
  ISO?: unknown;
}

/** Fills the fields missing from `info` with values from the Original's Exif tags. */
export function fillFromExif(info: PhotoInfo, exif: ExifTags): PhotoInfo {
  const filled: PhotoInfo = { ...info };
  const exifTimeText = text(exif.DateTimeOriginal);
  const time = exifTimeText === undefined ? undefined : parseExifDateTime(exifTimeText);
  const make = text(exif.Make)?.replaceAll("'", '');
  const model = text(exif.Model)?.replaceAll("'", '');
  const fNumber = number(exif.FNumber) ?? number(exif.ApertureValue);
  const focalLength = number(exif.FocalLength);
  const exposureTime = number(exif.ExposureTime) ?? number(exif.ShutterSpeedValue);
  const iso = number(exif.ISO);

  if (time !== undefined) filled.time ??= time;
  if (make !== undefined && model !== undefined) {
    filled.cameraModel ??= (make === 'SONY' ? parseSonyModel(model) : undefined) ?? `${make} ${model}`;
  }
  if (fNumber !== undefined) filled.aperture ??= `F${formatDecimal(fNumber)}`;
  if (focalLength !== undefined) filled.focalLength ??= `${formatDecimal(focalLength)}mm`;
  if (exposureTime !== undefined) filled.shutterSpeed ??= `${formatExposureTime(exposureTime)}s`;
  if (iso !== undefined) filled.iso ??= `ISO ${iso}`;
  return filled;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function number(value: unknown): number | undefined {
  const first = Array.isArray(value) ? (value as unknown[])[0] : value;
  return typeof first === 'number' && Number.isFinite(first) ? first : undefined;
}

/** At most 3 decimals, like the old server's Exif library printed rationals. */
function formatDecimal(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** Exposure times under a second as fractions, e.g. `1/20`. */
function formatExposureTime(seconds: number): string {
  return seconds > 0 && seconds < 1 ? `1/${Math.round(1 / seconds)}` : formatDecimal(seconds);
}
