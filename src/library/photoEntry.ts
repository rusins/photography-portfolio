import type { LocalDateTime } from './localDateTime.ts';

/** A Photo entry's folder path within the Library, starting with `/`, e.g. `/2023/Norway/Trondheim`. */
export type ImageId = string;

/** Metadata from a Photo entry's `info.json`, with missing fields filled from Exif. */
export interface PhotoInfo {
  primaryImageFile?: string;
  time?: LocalDateTime;
  description?: string;
  cameraModel?: string;
  aperture?: string;
  focalLength?: string;
  shutterSpeed?: string;
  iso?: string;
  tags?: string[];
}

export interface PhotoEntry {
  id: ImageId;
  info: PhotoInfo;
  /** Paths within the Library, primaryImageFile first, then longest file name. */
  originals: [string, ...string[]];
  /** Paths within the Library, sorted by name descending. */
  rawFiles: string[];
}
