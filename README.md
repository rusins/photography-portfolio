# Portfolio

My photography portfolio website, [raitis.krikis.id.lv](https://raitis.krikis.id.lv).

It is a static site generator written in TypeScript. It reads the **Library** (a local folder of photos, Albums and a
license) and writes a folder of plain HTML pages and Previews, which is hosted on Cloudflare Pages. The Originals and
Raw files themselves are stored in a Cloudflare R2 bucket and downloaded from
[files.raitis.krikis.id.lv](https://files.raitis.krikis.id.lv). There is no server to run.

Terms such as Library, Photo entry, Original, Preview, Album and Selector are defined in [GLOSSARY.md](GLOSSARY.md).

History: this replaces portfolzio, the old Scala/ZIO server that used to run the site. The site
looks and behaves as before. The Library layout is the same, so an existing Library works without changes.

> **Everything in the Library is public.** `./publish` uploads the *whole* Library folder to R2, not just the photos:
> `info.json` files, `.album` files, `LICENSE` and anything else you put there. Anyone who knows or guesses a file's
> exact path can download it from `https://files.raitis.krikis.id.lv/<path within the Library>`. Keep nothing private
> in the Library.

## Contents

- [Commands](#commands)
- [Daily workflow](#daily-workflow)
- [A new computer: `./pull`](#a-new-computer-pull)
- [The Library](#the-library)
- [site.config.json](#siteconfigjson)
- [One-time Cloudflare setup](#one-time-cloudflare-setup)
- [Cost](#cost)
- [Development](#development)

## Commands

All tools (Node.js, rclone, wrangler) come from `shell.nix`. Each command below starts `nix-shell` by itself if the
tools it needs are not on your `PATH`, and installs the npm dependencies (`npm ci`) if `node_modules` is missing. Run
them from the repository folder.

| Command | What it does |
|---|---|
| `./build [config file]` | Builds the site into `./site` from the Library. Changes nothing outside this repository. |
| `./serve [config file]` | Runs `./build`, then serves `./site` at [localhost:8788](http://localhost:8788) the way Cloudflare Pages will, until you press Ctrl+C. Changes nothing outside this repository. |
| `./publish [config file]` | Type checks and tests the code, runs `./build`, makes R2 mirror the Library, then deploys `./site` to Cloudflare Pages. |
| `./pull [--force] [config file]` | Downloads into the Library every file R2 has that the Library is missing. With `--force`, also replaces Library files that differ from R2. |

The config file defaults to `site.config.json` in the repository folder.

Two caches are kept in the repository folder (both git-ignored, both safe to delete; they are rebuilt, just slowly):

- `.preview-cache/` holds the Previews between builds. A Preview is regenerated only when its Original changed, another
  Original became the first one, or `previewSize` / `previewQuality` changed. Previews of Photo entries that are no
  longer in the Library are removed from it.
- `.publish-cache/hashes.json` holds the MD5 of every Library file, so `./publish` and `./pull` only read files that are
  new or modified since the last run.

### Trying the site locally: `./serve`

`./serve` shows the site as it will look after `./publish`, without uploading anything. It builds the site, then
serves `./site` with `wrangler pages dev`, Cloudflare's local stand-in for Pages, so addresses behave as they do live:
`/album/Best` serves `album/Best.html`, `/album/Best.html` redirects to `/album/Best`, and an unknown address gets the
site's 404 page. To use another port:

```sh
PORT=8000 ./serve
```

Two things still point at the live domains:

- "Download Photo" and "Download Raw File" links go to `filesUrl`, i.e. R2. A photo that is not published yet has no
  file there, so its download links fail locally until the next `./publish`.
- `siteUrl` is used in the sitemap, `robots.txt` and link previews, which is harmless locally.

`./serve` does not rebuild when the Library changes: stop it with Ctrl+C and run it again. wrangler keeps some local
state in `.wrangler/` (git-ignored, safe to delete).

### What `./publish` does, step by step

1. Runs the type check and the tests. If either fails, it stops before anything is uploaded.
2. Runs `./build`.
3. Compares every Library file with R2, by size and MD5 content hash.
4. If some files are in R2 but not in the Library, it lists them, warns that the Library may be incomplete (in which
   case answer no and run `./pull` first), and asks `Delete these N files from R2? [y/N]`. Anything other than `y` or
   `yes` aborts the whole publish: nothing is changed in R2 or on the site.
5. Uploads new and changed files to R2. Originals and Raw files are stored with a download name, so that "Download
   Photo" saves e.g. `2023/Norway/Trondheim/photo.jpg` as `Raitis_Krikis-2023-Norway-Trondheim-photo.jpg`. These are
   uploaded four at a time; if any upload fails, the publish stops with an error before deleting or deploying anything.
   Symbolic links in the Library are followed, so R2 gets the files they point to. Only changed files are uploaded, so
   changing how download names are made in the code does not re-upload files that are already up to date in R2: they
   keep the name they were uploaded with until their content changes.
6. Deletes from R2 the files that are no longer in the Library.
7. Deploys `./site` to the Cloudflare Pages project, on its production branch, so it goes live right away.
8. Prints how many files were uploaded, unchanged and deleted, and the site's URL.

A publish with no changes uploads nothing and finishes quickly.

## Daily workflow

```sh
cd ~/Code/portfolio     # wherever this repository is
nix-shell               # optional: the commands start it themselves, but it is faster to stay in it
# ... add or edit Photo entries and Albums in the Library ...
./build                 # optional: check the warnings before publishing
./serve                 # optional: look at the site at http://localhost:8788, Ctrl+C to stop
./publish
```

`./build` and `./publish` print a warning for every broken Photo entry or Album they skip (an `info.json` that is
not valid, a Photo entry without an Original, an Album file that is not UTF-8, duplicate IDs, a Tag that cannot have
a page) and carry on without it.

The Library's old `sync.sh` (rsync to the old server) is obsolete: `./publish` replaces it. Delete it from the
Library, or it is uploaded to R2 like every other file.

## A new computer: `./pull`

R2 holds a full copy of the Library, so a new computer gets the Library from there:

1. Clone this repository and do steps [4 (R2 API token and rclone)](#4-r2-api-token-and-rclone) and
   [5 (wrangler login)](#5-log-wrangler-in) of the Cloudflare setup on the new computer. You don't need to create
   anything in Cloudflare again; you can reuse the R2 API token if you still have its secret, or make a new one.
2. Create the Library folder (it must exist, even if empty) and set `libraryPath` in `site.config.json` to it:
   ```sh
   mkdir -p ~/Pictures/Photos/Website
   ```
3. Run `./pull`. It downloads every file that is only in R2, and never deletes or changes anything else in the Library.
4. Check that `./publish` would delete nothing. If it lists files to delete from R2, answer no: the Library is
   incomplete.

`./pull` can also be run on a computer with a partial or older Library. Files that exist in both places but differ
are left alone and listed with a warning, because they may be local edits not yet published. To throw away those
local versions and take the R2 ones instead:

```sh
./pull --force
```

Files that are only in the Library are never touched by `./pull`, with or without `--force`. They are uploaded on the
next `./publish`.

At the end `./pull` prints how many files were downloaded, overwritten, left alone because they differ, unchanged, and
only in the Library.

## The Library

The Library is the folder named by `libraryPath`. It is the master copy of everything the site shows.

### Photo entries

For each photo you want to show, create a folder. Folders can be nested as deep as you like. The folder's path within
the Library, with `/` as separator (e.g. `/2023/Norway/Trondheim`), is the photo's **Image ID**: it is used in the
page address (`/image/2023/Norway/Trondheim`) and in alt text.

A folder is a Photo entry when it contains:

- one UTF-8 `info.json` file with the photo's details (see below),
- one or more Originals: JPEG files whose name matches `(?i).*\.(jpg|jpeg)$`,
- zero or more Raw files, whose name matches `(?i).*\.(arw|raw)$`.

A folder with an `info.json` but no Original is skipped with a warning. The Library folder itself cannot be a Photo
entry.

The Preview, shown everywhere the site displays the photo, is made from the first Original: the one named by
`primaryImageFile` in `info.json`, otherwise the one with the longest file name. Every Original gets a "Download Photo"
link and every Raw file a "Download Raw File" link.

### info.json example

All fields are optional and can be left out, so `{}` is a valid `info.json`.

```json
{
  "description": "",
  "tags": [
    "",
    ""
  ],
  "primaryImageFile": "",
  "time": "2024-01-27T18:20:54",
  "cameraModel": "Sony a7 IV",
  "aperture": "F2.8",
  "focalLength": "300mm",
  "shutterSpeed": "1/60s",
  "iso": "ISO 100"
}
```

- `time` is a local date and time: `YYYY-MM-DDTHH:MM`, with optional seconds and fractions of a second.
- `tags` are the photo's Tags. Each Tag gets its own page at `/tag/<name>`; a Tag may contain `/`, e.g.
  `places/Riga` is at `/tag/places/Riga`. A Tag that is empty or has an empty, `.` or `..` part gets no page, with a
  warning.
- `time`, `cameraModel`, `aperture`, `focalLength`, `shutterSpeed` and `iso` are read from the first Original's Exif
  metadata when they are not in `info.json`. Write them only to override what the camera recorded.
- A field of the wrong type (e.g. a number instead of a string) makes the whole `info.json` invalid, and the Photo
  entry is skipped with a warning.

### Albums

Any folder can contain Album files: UTF-8 text files whose name ends with `.album`. An Album's ID is its folder path
plus its file name without `.album`, e.g. `Norway.album` in the `2023` folder is the Album `/2023/Norway`, shown at
`/album/2023/Norway`.

Each line of an Album file is a **Selector**. The Album contains the Photo entries and other Albums its Selectors
match, in the order of the Selectors:

| Selector | Matches |
|---|---|
| `/2023/Norway/Trondheim` | The Photo entry or Album with exactly that ID. |
| `Norway/Trondheim` | A relative ID, starting from the Album file's own folder. In `/2023/Favourites.album`, this is `/2023/Norway/Trondheim`. |
| `/2023/*` | Every Photo entry and Album anywhere under `/2023`, at any depth. Relative IDs work too: `Norway/*`. |
| `tag:sunset` | Every Photo entry with the Tag `sunset`. |

For example, `/Best.album` in the root of the Library:

```
2023/Norway/Trondheim
2024/*
tag:portrait
```

Albums can contain other Albums. Entries that are not in any Album are top level: the Albums page (`/albums`) shows
the top-level Albums. An Album page shows its sub-Albums sorted by name, then its Photo entries sorted by time. An
Album's cover is its first entry (or that entry's cover, if it is an Album).

The **Best album** is the Album with ID `/Best` (or `/best`), i.e. `Best.album` in the root of the Library. Its Photo
entries fill the home page. Without a Best album, the home page shows the 12 newest Photo entries, like `/recent`.

### LICENSE

If the root of the Library has a file named `LICENSE`, its text is shown at `/license`, and every photo page links to it
next to the download links.

## site.config.json

Every key is required (`./build` needs only the first six). Text values must be non-empty, numbers must be positive.

| Key | Meaning | Current value |
|---|---|---|
| `siteTitle` | Shown in the header and in page titles. | `Raitis Krikis Photography` |
| `siteUrl` | Where the site is hosted, used in the sitemap, `robots.txt` and link previews. | `https://raitis.krikis.id.lv` |
| `filesUrl` | Where R2 serves the Library's files: the bucket's custom domain. Download links point here. | `https://files.raitis.krikis.id.lv` |
| `libraryPath` | Absolute path of the Library on this computer. | `/home/raitis/Pictures/Photos/Website` |
| `previewSize` | Length in pixels of a Preview's longest side. Smaller Originals are not enlarged. | `2560` |
| `previewQuality` | JPEG quality of Previews, from 0 to 1. | `0.7` |
| `rcloneRemote` | Name of the rclone remote for R2 in your `rclone.conf`. | `r2` |
| `r2Bucket` | Name of the R2 bucket that mirrors the Library. | `photography-portfolio` |
| `pagesProject` | Name of the Cloudflare Pages project. | `photography-portfolio` |
| `pagesBranch` | The Pages project's production branch, so a deploy goes live instead of becoming a preview. | `main` |

**Check these before your first publish; the committed values are placeholders that must match your setup:**

- `libraryPath`: the Library's real location on *this* computer.
- `siteTitle`: the title you want.
- `rcloneRemote`, `r2Bucket`, `pagesProject`, `pagesBranch`: the names you actually chose in the Cloudflare setup
  below. The steps use the committed names, so if you follow them as written, these already match.

A trailing `/` on `siteUrl` or `filesUrl` is ignored. No secrets go in this file: credentials stay in your own rclone
and wrangler config.

## One-time Cloudflare setup

This is done once. It assumes you have never used Cloudflare. The names below (`photography-portfolio`, `r2`, `main`) are
the ones in `site.config.json`; if you pick others, change the config to match.

### 1. Create a Cloudflare account

Sign up at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and verify your email.

### 2. Put the domain on Cloudflare

Custom domains for both R2 and Pages need the domain's DNS to be run by Cloudflare. If `krikis.id.lv` is not already
a site in your Cloudflare account:

1. In the dashboard, choose **Add a domain** (also called "Add a site"), enter `krikis.id.lv`, and pick the **Free**
   plan.
2. Cloudflare scans the domain's current DNS records. Check the list against what your current DNS provider shows and
   add anything missing (mail records especially), so nothing else on the domain breaks.
3. Cloudflare shows two nameservers. At the registrar of `krikis.id.lv`, replace the domain's nameservers with those
   two. It can take from minutes to a day before Cloudflare shows the domain as **Active**.

### 3. Create the R2 bucket and its custom domain

1. In the dashboard, open **R2 Object Storage**. The first time, Cloudflare asks you to enable R2 and add a payment
   method. That is required even though usage stays mostly within the free tier (see [Cost](#cost)).
2. **Create bucket**, named `photography-portfolio` (the `r2Bucket` value). Leave the location on automatic and the storage
   class on Standard.
3. Open the bucket, go to **Settings → Custom Domains → Add**, enter `files.raitis.krikis.id.lv`, and confirm.
   Cloudflare creates the DNS record itself. Wait until the domain's status is **Active**.

This makes every object in the bucket publicly readable at `https://files.raitis.krikis.id.lv/<path>`, which is how
the download links work. Leave the bucket's `r2.dev` public development URL disabled; the custom domain is all that is
needed.

### 4. R2 API token and rclone

`./publish` and `./pull` talk to R2 through [rclone](https://rclone.org), using R2's S3-compatible API.

1. On the **R2 Object Storage** overview page, choose **Manage API tokens** (under "Account details"), then
   **Create API token** (a User API token is fine).
2. Give it a name such as `portfolio rclone`, permission **Object Read & Write**, and under "Specify bucket(s)" apply
   it only to `photography-portfolio`. Create it.
3. The next page shows the **Access Key ID**, the **Secret Access Key** and the S3 endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Copy all three now: the secret is shown only once. (The account ID
   is also in the dashboard URL and on the R2 overview page.)
4. Create or edit `~/.config/rclone/rclone.conf` and add a remote named `r2` (the `rcloneRemote` value):

   ```ini
   [r2]
   type = s3
   provider = Cloudflare
   access_key_id = YOUR_ACCESS_KEY_ID
   secret_access_key = YOUR_SECRET_ACCESS_KEY
   endpoint = https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
   acl = private
   no_check_bucket = true
   ```

   `no_check_bucket = true` is needed because the token may only access objects in the bucket, not create buckets.
   Keep this file to yourself (`chmod 600 ~/.config/rclone/rclone.conf`); never commit it.
5. Check that it works. This only lists the bucket (empty at first, so it prints nothing and no error):

   ```sh
   nix-shell --run 'rclone lsf r2:photography-portfolio'
   ```

### 5. Log wrangler in

```sh
nix-shell --run 'wrangler login'
```

This opens a browser where you allow wrangler to access your Cloudflare account. The login is stored in your home
folder, never in this repository. `nix-shell --run 'wrangler whoami'` shows who is logged in.

### 6. Create the Pages project

The site is hosted by Cloudflare Pages as a "direct upload" project: `./publish` uploads the built `./site` folder with
wrangler, so Pages is not connected to git.

Create it from the command line, with the `pagesProject` and `pagesBranch` values:

```sh
nix-shell --run 'wrangler pages project create photography-portfolio --production-branch main'
```

Or in the dashboard: **Workers & Pages → Create → Pages → Upload assets (direct upload)**, project name
`photography-portfolio`.
A dashboard-created project's production branch is `main`; it must equal `pagesBranch`, or every publish becomes a
preview deployment instead of the live site.

The project is reachable at `https://photography-portfolio.pages.dev` (Cloudflare may add a suffix if the name is
taken) after the first publish.

### 7. Set the real values in site.config.json

Go through [the placeholders above](#siteconfigjson): `libraryPath`, `siteTitle`, and the bucket, remote and project
names if you chose different ones. `siteUrl` and `filesUrl` stay as they are unless the domains change.

### 8. First publish

```sh
./publish
```

The first publish uploads the whole Library (about 13 GB), which takes a while on a home connection. If it is
interrupted, just run it again: files already in R2 with the right content are skipped. The Library's old `sync.sh` is
obsolete; remove it from the Library before this first publish so it is not uploaded.

Check the site at `https://photography-portfolio.pages.dev` and that "Download Photo" works.

### 9. Point raitis.krikis.id.lv at the Pages project

In the dashboard, open **Workers & Pages → portfolio → Custom domains → Set up a custom domain**, enter
`raitis.krikis.id.lv`, and confirm.

**This replaces whatever currently answers at raitis.krikis.id.lv** (the old portfolzio server, if it still runs). If
a DNS record for `raitis` already exists, Cloudflare asks you to remove it first; delete it in **DNS → Records** and
continue. Cloudflare then creates the record pointing at Pages and issues the HTTPS certificate, which can take a few
minutes.

From now on, `./publish` is all it takes to update the site.

## Cost

The Library is about 13 GB. R2's free tier includes 10 GB of storage per month; storage above that costs
$0.015 per GB-month, so about 3 GB × $0.015 ≈ **$0.05 per month**. R2 charges no egress fees, so downloads cost
nothing, and the number of uploads and listings a publish makes stays well within the free tier's operations.
Cloudflare Pages and DNS are free for a site like this.

## Development

```sh
nix-shell
npm ci              # once
npm test            # vitest
npm run typecheck   # tsc
```

`./publish` runs both before it builds anything. The code is in `src/` (`library/` reads the Library, `site/` writes
the pages, `sync/` talks to R2 and Pages, `cli/` holds the commands' entry points and their shared setup); tests are
in `test/`.
