# 🎂 Happy Birthday, Jetakshi

An animated single-page birthday keepsake and evening invitation.
Hand-built with HTML5, Tailwind (CDN), custom CSS keyframes, GSAP and vanilla
JavaScript — **no build step, no dependencies to install, no framework.**

> Clone it, open it, and it runs.

---

## Contents

- [Quick start](#quick-start)
- [What's on the page](#whats-on-the-page)
- [Adding your photos](#adding-your-photos)
- [Customising](#customising)
- [Project structure](#project-structure)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [The relative-path rule](#the-relative-path-rule)
- [Accessibility & performance notes](#accessibility--performance-notes)
- [Browser support](#browser-support)

---

## Quick start

You need a local web server — opening `index.html` with a `file://` URL works
for most of the page, but some browsers block the audio and image loading rules
under that scheme.

**Python** (installed on most machines):

```bash
python -m http.server 8080
```

**Node**:

```bash
npx --yes serve . -l 8080
```

**npm script** (thin wrapper around the Node one):

```bash
npm start
```

Then open <http://localhost:8080>.

---

## What's on the page

| # | Section | What it does |
|---|---------|--------------|
| 1 | **Hero cover** | "Happy Birthday, Jetakshi ❤️" over a live particle field and floating balloons, with a pulsing **Click to Open Our Story** button that unseals the rest of the page |
| 2 | **Our Story & Journey** | The pull-quote about how you two met, on a glass card under an oversized gold quote mark, followed by a *Total strangers → You & me* journey rail. Sits first so the hero button's promise is kept immediately |
| 3 | **Live countdown** | Days / hours / minutes / seconds to the next **24 August**, computed relative to the visitor's clock — so it keeps working every year, and swaps to a celebration state on the day itself |
| 4 | **Gallery** | Responsive grid with gold gradient borders, hover-zoom, rising captions, and a keyboard-navigable lightbox |
| 5 | **Invitation** | A gold-foil framed card addressed *"To my better half, J2"*, with Date / Time / Location as three separated columns and a **J2** wax seal |
| 6 | **RSVP** | Two ways to say yes, one tiny "No" that triggers an **Error 404** modal and then rewrites itself into "Yes!" — any answer sets off a full-screen confetti celebration |

Running behind all of it: an automated balloon system (randomised size, colour,
speed, opacity, sway and tilt), a canvas heart-and-star particle field, a
drifting aurora gradient, and a gold scroll-progress bar.

---

## Adding your photos

Drop eight images into [`assets/`](assets/) named `jetakshi-01.jpg` through
`jetakshi-08.jpg`. That's it — refresh and they appear.

Until then each tile shows a labelled placeholder naming the file it expects, so
nothing looks broken.

📖 **Full instructions, sizes and formats: [`assets/README.md`](assets/README.md)**

---

## Customising

Almost everything lives in one file: **[`js/config.js`](js/config.js)**.

```js
name: 'Jetakshi',
birthday: { month: 8, day: 24, hour: 0, minute: 0 },
event:    { dateLabel: 'August 24', timeLabel: '7:30 PM' },
gallery:  [ { src: 'assets/jetakshi-01.jpg', caption: '…', span: 'wide' }, … ],
music:    { src: 'assets/our-song.mp3', volume: 0.35 },
balloons: { maxOnScreen: 14, spawnEveryMs: 1500, hues: [345, 330, …] },
particles:{ density: 46, maxCount: 130, heartRatio: 0.42 },
confetti: { colors: […], durationMs: 4200 },
copy:     { noButtonError: "Error 404: …", rsvpSuccess: { … } },
```

**Colours** are CSS custom properties at the top of
[`css/main.css`](css/main.css) — change `--gold`, `--sunset`, `--midnight` etc.
in one place and the whole site follows, including the animated gradients.

**Prose** — the *Our Story & Journey* quote and the invitation wording are
plain markup in `index.html`, under `<section id="our-story">` and
`<section id="invitation">`. They're prose, not settings, so they live where
you can see them in context rather than as strings in a config file.

**Turn the balloons down** for a calmer feel: lower `balloons.maxOnScreen` and
raise `balloons.spawnEveryMs`.

---

## Project structure

```
.
├── index.html              # all markup, one page
├── css/
│   ├── main.css            # design tokens, layout, components
│   └── animations.css      # every @keyframes + reduced-motion fallbacks
├── js/
│   ├── config.js           # ← edit this; everything configurable lives here
│   ├── utils.js            # shared helpers (window.BD)
│   ├── balloons.js         # automated floating-balloon system
│   ├── particles.js        # canvas hearts & stars field
│   ├── countdown.js        # relative-date countdown + birthday state
│   ├── gallery.js          # grid rendering, placeholders, lightbox
│   ├── rsvp.js             # RSVP logic, Error 404 gag, confetti
│   ├── reveal.js           # scroll reveal, progress bar, section nav
│   ├── music.js            # optional, self-hiding audio toggle
│   └── main.js             # bootstrap + seal/unseal choreography
├── assets/
│   └── README.md           # ← where the photos go
├── .github/workflows/
│   └── deploy.yml          # optional GitHub Pages deployment
├── .nojekyll               # stop Pages from running Jekyll over the files
└── package.json            # `npm start` convenience script only, no deps
```

Modules are IIFEs that publish a single global each (`window.Balloons`,
`window.Countdown`, …) rather than ES modules. That's deliberate: it keeps the
site working when opened directly off the filesystem, where `<script type=
"module">` hits CORS restrictions.

### Third-party libraries (all CDN, all optional)

| Library | Used for | If the CDN is blocked |
|---|---|---|
| Tailwind Play CDN | layout utilities | Custom CSS carries the design; layout degrades slightly |
| GSAP 3.12 | unseal choreography | CSS keyframes take over |
| canvas-confetti 1.9 | the celebration | Balloons and particles still react |

---

## Deploying to GitHub Pages

### Option A — deploy from a branch (simplest)

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch** · Branch: **`main`** · Folder: **`/ (root)`**
4. Save. First build takes about a minute.

### Option B — deploy with Actions

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) is included and
publishes on every push to `main`. To use it, set
**Settings → Pages → Source** to **GitHub Actions** instead.

### Custom domain

If `anirudhshingala.com` is already configured on your **user site** repo
(`anirudhshingala.github.io`), every project repo is automatically served
underneath it — this one lands at:

```
https://anirudhshingala.com/birthday/
```

> **Note on `anirudhshingala.com/betterhalf/birthday`**
> GitHub Pages maps one repository to one path segment, so a repo named
> `birthday` can only serve `/birthday/`. To get the nested `/betterhalf/birthday`
> path you have two options:
>
> 1. **Rename the repo to `betterhalf`** and move these files into a `birthday/`
>    subfolder inside it → serves at `/betterhalf/birthday/`.
> 2. Keep this repo as-is and add a redirect or a `betterhalf/` folder in your
>    user-site repo pointing here.
>
> Either way **no code changes are needed** — every path in this project is
> relative, so it works at any depth.

Do **not** add a `CNAME` file to this repo; the custom domain belongs to the
user-site repo, and a duplicate here will fight with it.

---

## The relative-path rule

Every internal reference in this project is relative:

```html
<link rel="stylesheet" href="css/main.css">     <!-- ✅ works at any depth -->
<link rel="stylesheet" href="/css/main.css">    <!-- ❌ breaks under a sub-path -->
```

That's what lets the identical files serve correctly from:

- `file:///…/birthday/index.html`
- `http://localhost:8080/`
- `https://anirudhshingala.github.io/birthday/`
- `https://anirudhshingala.com/birthday/`
- `https://anirudhshingala.com/betterhalf/birthday/`

**If you add anything** — a photo, a script, a stylesheet — keep it relative.
The only absolute URLs in the codebase are the third-party CDNs, which have to be.

`.nojekyll` is present so GitHub Pages copies files verbatim instead of running
them through Jekyll (which would silently drop anything starting with `_`).

---

## Accessibility & performance notes

These weren't afterthoughts, so they're worth knowing before you edit:

- **`prefers-reduced-motion`** — balloons and particles don't spawn at all,
  every keyframe collapses, content reveals instantly instead of sliding.
- **No-JavaScript** — the "hidden until revealed" states are scoped to
  `html.js`, so the whole page renders normally with scripting off.
- **Screen readers** — the ticking countdown digits are `aria-hidden`; a calm
  once-a-minute summary is announced through a live region instead.
- **Keyboard** — skip link, visible focus rings throughout, focus trapping in
  both overlays, arrow-key navigation in the lightbox, Escape to close.
- **Frame budget** — only `transform`/`opacity`/`filter` are animated, so
  nothing triggers layout. The particle field uses a fixed object pool (zero
  allocation per frame), caps device pixel ratio at 2, and halts entirely while
  the tab is hidden. Balloons are capped and reduced on small screens.
- **Images** — `loading="lazy"` and `decoding="async"` on every gallery tile.

---

## Browser support

Chrome, Edge, Firefox and Safari — current versions, desktop and mobile.

Relies on `IntersectionObserver`, CSS custom properties, `aspect-ratio` and
`clamp()`. Anything older than roughly 2021 will render the content correctly
but lose some of the motion.

---

*Made with far too much love (and a little JavaScript).* ❤️
