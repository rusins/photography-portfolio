# Glossary

**Library** — The local folder holding all Photo entries, Albums and the license; the master copy of everything the website shows.
_Avoid_: data directory, photo folder

**Photo entry** — A folder in the Library containing an `info.json`, one or more Originals and optionally Raw files. Shown on the site as one photo with its own page.
_Avoid_: Photo, Image (for the folder)

**Image ID** — A Photo entry's folder path within the Library, written with `/` separators (e.g. `/2023/Norway/Trondheim`). Used in page addresses and alt text.

**Original** — A full-size JPEG file inside a Photo entry, offered as "Download Photo".
_Avoid_: image file (ambiguous)

**Raw file** — A camera raw file (`.arw`/`.raw`) inside a Photo entry, offered as "Download Raw File".

**Preview** — A smaller JPEG generated from a Photo entry's first Original, used everywhere the site displays the photo.
_Avoid_: thumbnail

**Album** — A `.album` text file in the Library listing Selectors, one per line; its contents are the Photo entries and Albums those Selectors match.

**Album ID** — An Album's folder path plus its file name without `.album` (e.g. `/Best`).

**Selector** — One line of an Album: an absolute or relative ID, optionally with `*` to match everything in a folder, or `tag:<name>` to match Photo entries with that Tag.

**Tag** — A label listed in a Photo entry's `info.json`; each Tag gets its own page.

**Best album** — The Album with ID `/Best` (or `/best`), whose Photo entries fill the home page.

**Publish** — The one command that regenerates the website from the Library, uploads changes to R2 and deploys the site.

**Pull** — The command that brings a Library up to date with what is stored in R2, e.g. on a new computer.
