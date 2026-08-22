# assets/moments/ — today's best moment

Drop a photo in here. That is the whole procedure.

```
assets/moments/whatever-the-camera-called-it.jpg
```

Commit it, push it, and within a minute or two the site has a new section at
the top — **Today's Best Moment** — with that photo as its centrepiece, stamped
with the date it went up.

## What matters and what does not

| | |
|---|---|
| Filename | **Does not matter.** Nothing anywhere refers to a name. |
| Extension | `.jpg` `.jpeg` `.png` `.webp` `.gif` `.avif` all work as-is. `.heic`/`.heif` from an iPhone are converted to JPEG automatically on push. |
| How many | One is expected. Several all appear: the newest leads, the rest sit beneath it as a row of thumbnails. |
| Size / orientation | Any. The frame takes the photo's own proportions, so nothing is ever cropped. |
| Order | Newest first, by the commit that added it. |

## While this folder is empty

The website is exactly what it was before this feature existed. The section is
`hidden` in the markup and stays hidden; no nav link appears, no placeholder,
no empty frame, no request for a photo. There is nothing to give the surprise
away.

Adding a photo only ever **adds** that one section. Nothing else on the page
changes.

## How it works

A static host — GitHub Pages, or `serve.py` locally — will serve
`assets/moments/photo.jpg` perfectly well, but it never lists the directory.
So the browser has no way to find out what is in here. Something has to write
the contents down:

```
assets/moments/*            ->   tools/build_moments.py   ->   manifest.json
                                                                    |
                                                              js/moments.js
                                                                    |
                                                          the section on the page
```

`manifest.json` is generated, never edited by hand. It is rebuilt:

- **locally** — on every page load, by `serve.py`, so dropping a file in here
  and hitting reload is enough; no restart, nothing to remember
- **on push** — by `.github/workflows/moments.yml`, which is what makes
  uploading from a phone through the GitHub web UI work
- **by hand** — `npm run moments`, if you ever want to see it without either

Each photo's date comes from the commit that added it, rendered in IST to match
the rest of the site. Commit on the day and the date is right on its own; to
force a particular one, set `moments.dateLabelOverride` in `js/config.js`.

## Changing the words

Everything the section says lives in `js/config.js` under `moments` — the
kicker, the title, the line underneath, the caption. Nothing there needs
touching to add a photo.

## Testing it before the day

```bash
npm start                                  # http://localhost:8080/
cp some-photo.jpg assets/moments/          # any name, any extension
# reload — the section is there
rm assets/moments/some-photo.jpg
# reload — the site is exactly as it was
```
