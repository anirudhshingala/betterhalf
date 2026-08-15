# 📸 `assets/` — the photos

This folder holds the pictures and (optionally) a song. No build step: **save
the file with the right name, refresh, done.**

---

## 1. What's here now

| File | Where it appears |
|---|---|
| `favourite.webp` | **The most favourite one** — its own stage above the grid, behind a "Tap to reveal" cover |
| `jetakshi-01.jpg` … `jetakshi-07.jpg` | The masonry grid below it |

Names are **lowercase on purpose**. GitHub Pages is case-sensitive; Windows is
not. `Jetakshi-01.JPG` works perfectly on your laptop and then 404s for her.

---

## 2. Swapping or adding a photo

Everything is wired through the `gallery` and `favourite` blocks in
[`../js/config.js`](../js/config.js):

```js
favourite: {
  src: 'assets/favourite.webp',
  w: 1199, h: 1440,                  // real pixel size — see below
  badge: 'The most favourite one',
  teaser: 'Tap to reveal',
  caption: 'This is the one. It always has been.',
},

gallery: [
  { src: 'assets/jetakshi-01.jpg', w: 1080, h: 1351, caption: 'Us' },
  // …
],
```

- **`src`** — path relative to `index.html`. **Never start it with `/`** — a
  leading slash breaks the site when served from a sub-path.
- **`w` / `h`** — the file's true pixel dimensions. Optional, but supplying
  them lets the browser reserve the exact space before the image downloads,
  which is the difference between the gallery settling into place and it
  jolting around as photos load. Right-click → Properties → Details on
  Windows, or just open the file in any viewer.
- **`caption`** — the italic line that slides up on hover, and the lightbox
  caption.

Add or remove entries freely — the grid reflows on its own.

### Any format works

`.jpg`, `.webp`, `.png` — just match the extension in `src`. WebP is roughly
30% smaller than JPEG at the same quality, so it's worth preferring.

---

## 3. Nothing gets cropped

The grid is a **true masonry** (CSS columns), not a fixed grid. Every photo
keeps its own aspect ratio, so portraits, landscapes and squares can sit side
by side and none of them are cut off. You don't need to crop anything to a
particular shape before adding it.

The one thing worth doing is **compressing**. GitHub Pages serves your files
byte-for-byte with no optimisation, so an untouched 6 MB phone photo is a 6 MB
download for her.

| | Target |
|---|---|
| File size | **Under ~400 KB each** |
| Long edge | ~1400–1600 px is plenty |
| Colour | sRGB (the default from any phone) |

[squoosh.app](https://squoosh.app) — drag in, pick WebP, quality ~78, download.

> Current album: **8 photos, ~3.6 MB total.** Fine on wifi, and the grid is
> lazy-loaded so only what's on screen downloads. If you want it snappier on
> mobile data, `jetakshi-06.jpg` (867 KB) and `jetakshi-01.jpg` (698 KB) are
> the two worth compressing.

---

## 4. Optional: background music

Drop an audio file here named:

```
our-song.mp3
```

A small music button then appears in the bottom-left corner. **If the file is
absent the button never renders** — nothing looks broken, which is why you're
seeing a `404 our-song.mp3` in the console right now and can safely ignore it.

- Format: `.mp3` (widest browser support)
- Keep it **under 5 MB** — trim to a 60–90 second loop
- It **never autoplays**. Browsers block that, and it would be obnoxious.

Change the filename or volume in [`../js/config.js`](../js/config.js):

```js
music: { src: 'assets/our-song.mp3', volume: 0.35 },
```

Set `music: null` to remove the feature entirely.

---

## 5. Social share preview

When the link is shared on WhatsApp/iMessage, the preview image comes from the
`og:image` meta tag in `index.html`. Point it at whichever photo you'd want
showing up in a chat bubble.

---

## 6. If a photo goes missing

Nothing breaks. The tile renders as a gold-hatched placeholder printing the
exact filename it expected, and the "drop your photos into `assets/`" hint
reappears under the grid until every file is present again.
