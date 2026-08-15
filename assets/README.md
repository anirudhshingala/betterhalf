# 📸 `assets/` — where the photos go

This folder is where you drop pictures of Jetakshi (and optionally a song).
Nothing here needs a build step: **save the file with the right name, refresh
the page, done.**

Until a photo exists, its tile in the gallery renders as an elegant gold-hatched
placeholder that prints the exact filename it is waiting for — so the site looks
finished even with this folder empty.

---

## 1. The photo filenames

Save eight photos into **this folder** using exactly these names:

| # | Filename | Where it appears | Best shape |
|---|----------|------------------|------------|
| 1 | `jetakshi-01.jpg` | Wide feature tile, top-left | **Landscape** |
| 2 | `jetakshi-02.jpg` | Standard tile | Portrait |
| 3 | `jetakshi-03.jpg` | Tall feature tile | **Portrait** |
| 4 | `jetakshi-04.jpg` | Standard tile | Portrait |
| 5 | `jetakshi-05.jpg` | Standard tile | Portrait |
| 6 | `jetakshi-06.jpg` | Wide feature tile | **Landscape** |
| 7 | `jetakshi-07.jpg` | Standard tile | Portrait |
| 8 | `jetakshi-08.jpg` | Standard tile | Portrait |

> Names are **case-sensitive** on GitHub Pages (but not on your Windows machine).
> `Jetakshi-01.JPG` works locally and then 404s once deployed — always use
> lowercase names and a lowercase `.jpg` extension.

Tiles crop to fill, centred, so keep the subject roughly in the middle.

---

## 2. Dimensions & format

| Setting | Recommendation |
|---|---|
| **Format** | `.jpg` (best size/quality trade-off for photos) |
| **Portrait tiles** | ~1200 × 1500 px (4:5) |
| **Landscape tiles** | ~1920 × 1200 px (8:5) |
| **File size** | Aim for **under 400 KB each**, 1 MB absolute maximum |
| **Colour** | sRGB (the default from any phone) |

Why the size limit: GitHub Pages has no image optimisation, so every visitor
downloads the original bytes. Eight untouched 6 MB phone photos is a 48 MB page.
Run them through [squoosh.app](https://squoosh.app) (drag in, set quality ~78,
download) and the whole gallery lands around 2 MB.

### Want `.png`, `.webp` or a different name?

Edit the `gallery` array in [`../js/config.js`](../js/config.js):

```js
gallery: [
  { src: 'assets/beach-day.webp', caption: 'Goa, last winter', span: 'wide' },
  { src: 'assets/her-laughing.jpg', caption: 'That laugh' },
  // …
],
```

- `src` — path relative to `index.html`. **Never start it with `/`** — a leading
  slash breaks the site when it is served from a sub-path.
- `caption` — the italic line that slides up on hover, and the lightbox caption.
- `span` — `'wide'` (two columns), `'tall'` (two rows), or omit for a 1×1 tile.

Add or remove entries freely; the grid reflows on its own.

---

## 3. Optional: background music

Drop an audio file here named:

```
our-song.mp3
```

A small music button then appears in the bottom-left corner. If the file is
absent, the button never renders — nothing looks broken.

- Format: `.mp3` (widest browser support)
- Keep it **under 5 MB** — trim to a 60–90 second loop rather than uploading a
  full track
- It **never autoplays**. Browsers block that, and it would be obnoxious.
  Jetakshi taps the button if she wants it.

Change the filename or volume in [`../js/config.js`](../js/config.js):

```js
music: { src: 'assets/our-song.mp3', volume: 0.35 },
```

Set `music: null` to remove the feature entirely.

---

## 4. Optional: social share preview

When the link is shared on WhatsApp/iMessage/etc., the preview image is
`assets/jetakshi-01.jpg` (set in the `og:image` meta tag in `index.html`).
Whatever you save as photo #1 becomes the share thumbnail — so pick a good one.

---

## 5. Quick checklist before deploying

- [ ] All eight files present, **lowercase** names, `.jpg` extension
- [ ] Each file under ~400 KB
- [ ] No placeholder tiles left visible on `http://localhost:8080`
- [ ] Captions in `js/config.js` updated to real memories, not the defaults
