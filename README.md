# 🎂 Happy Birthday, Jetakshi

### 🔗 **[betterhalf.anirudhshingala.com](https://betterhalf.anirudhshingala.com/)**

An animated single-page birthday keepsake and evening invitation.
Hand-built with HTML5, Tailwind (CDN), custom CSS keyframes, GSAP and vanilla
JavaScript — **no build step, no dependencies to install, no framework.**

> Clone it, open it, and it runs.

---

## Contents

- [Quick start](#quick-start)
- [⚠️ The gate — read this first](#️-the-gate--read-this-first)
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

```bash
python serve.py        # or: npm start
```

Then open <http://localhost:8080>.

You need a local web server — opening `index.html` over `file://` works for
most of the page, but some browsers block audio and image loading under that
scheme.

> **Use `serve.py`, not `python -m http.server`.** The built-in server answers
> with `304 Not Modified` and sets no cache directives, so browsers happily
> reuse a cached `js/config.js` for the rest of the session — you change a
> setting, reload, and see the old site with nothing obviously wrong to point
> at. `serve.py` is the same thing with `no-store` on every response.
>
> Already hit it? **Ctrl+Shift+R** forces a fresh fetch.

Any static server works if you'd rather (`npx --yes serve . -l 8080`), just
remember the caching caveat.

---

## ⚠️ The gate — read this first

**Until 24 August, the entire site is replaced by a lock screen**: one line and
a clock. When the timer hits zero the page unlocks itself *live* — no refresh,
no reload — and dissolves into the real site.

So the four URLs you care about:

| URL | What you get |
|---|---|
| `http://localhost:8080/` | **The lock screen** — localhost is gated too (`bypassOnLocalhost: false`) |
| `http://localhost:8080/?preview=1` | **Full site** — this is your working URL |
| `http://localhost:8080/?gate=1` | The lock screen, forced regardless of any bypass |
| <https://betterhalf.anirudhshingala.com/> | **The lock screen**, until 24 August |
| <https://betterhalf.anirudhshingala.com/?preview=1> | **Full site** on the live URL — check it on your phone without unlocking it for her |

Every branch logs which one it took, so you're never guessing:

```
[gate] open — local host detected
[gate] locked — waiting for August 24. Add ?preview=1 to preview.
```

### Switching it off

In [`js/config.js`](js/config.js):

```js
gate: {
  enabled: true,
  bypass: false,   // ← flip to true to force the full site open EVERYWHERE
  ...
}
```

`bypass: true` opens it on the live URL too. **Set it back to `false` before
she looks.**

> **This is a surprise, not a security control.** It runs in the browser, so
> anyone who opens devtools can unlock it early. Perfectly fine for a birthday
> gift — just don't put anything genuinely private behind it.

The timer resolves against **her** clock, in **her** timezone, so it unlocks at
midnight where she is.

---

## What's on the page

| # | Section | What it does |
|---|---------|--------------|
| 1 | **Hero cover** | "Happy Birthday, Jetakshi ❤️" over a live particle field and floating balloons, with a pulsing **Click to Open Our Story** button that unseals the rest of the page |
| 2 | **Our Story & Journey** | The pull-quote about how you two met, on a glass card under an oversized gold quote mark, followed by a *Total strangers → You & me* journey rail. Sits first so the hero button's promise is kept immediately |
| 3 | **Live countdown** | Days / hours / minutes / seconds to the next **24 August**, computed relative to the visitor's clock — so it keeps working every year, and swaps to a celebration state on the day itself |
| 4 | **Gallery** | *"My Favourites, So Far."* One photo — **the most favourite one** — gets its own stage behind a frosted "Tap to reveal" cover, unveiled with a gold curtain sweep. Below it, a true masonry wall (CSS columns) so every photo keeps its own aspect ratio and **nothing is ever cropped**. Keyboard-navigable lightbox |
| 5 | **Invitation** | A gold-foil framed card addressed to **J2 ❤** — set large, as the name it is — with Date / Time / Location as three separated columns and a **J2** wax seal |
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
name:      'Jetakshi',
birthday:  { month: 8, day: 24, hour: 0, minute: 0 },
gate:      { enabled: true, bypass: false, title: 'Little surprise for you', … },
event:     { dateLabel: 'August 24', timeLabel: '7:30 PM', locationLabel: '…' },
favourite: { src: 'assets/favourite.webp', w: 1199, h: 1440, badge: '…' },
gallery:   [ { src: 'assets/jetakshi-01.jpg', w: 1080, h: 1351, caption: '…' }, … ],
music:     { src: 'assets/our-song.mp3', volume: 0.35 },
balloons:  { maxOnScreen: 14, spawnEveryMs: 1500, hues: [345, 330, …] },
particles: { density: 46, maxCount: 130, heartRatio: 0.42 },
confetti:  { colors: […], durationMs: 4200 },
copy:      { noButtonError: "Error 404: …", rsvpSuccess: { … } },
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
│   ├── gate.js             # the pre-birthday lock screen + auto-unlock
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
├── serve.py                # dev server with caching disabled (`npm start`)
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

Already deployed. Push to `main` and it rebuilds in about a minute.

| | |
|---|---|
| Repo | [`anirudhshingala/betterhalf`](https://github.com/anirudhshingala/betterhalf) |
| Source | Deploy from a branch · `main` · `/ (root)` |
| Live | <https://betterhalf.anirudhshingala.com/> |
| Certificate | Let's Encrypt, auto-renewing · Enforce HTTPS on |

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) is included if
you'd rather publish via Actions — switch **Settings → Pages → Source** to
**GitHub Actions**. Branch deployment is simpler for a site with no build step,
so that's what's active.

### The custom domain, and why it's a subdomain

`CNAME` in the repo root holds `betterhalf.anirudhshingala.com`, and Cloudflare
has one matching record:

```
CNAME   betterhalf   →   anirudhshingala.github.io      (DNS only, grey cloud)
```

> **Keep it grey.** Proxying through Cloudflare (orange cloud) hides the record
> from GitHub's verification, so it can't renew the Let's Encrypt certificate
> and *Enforce HTTPS* stops working.

The obvious-looking alternative, `anirudhshingala.com/betterhalf/`, does **not**
work here. GitHub only nests project repos under a custom domain when that
domain sits on a *user site* (`<user>.github.io`) — and there is no such repo.
`anirudhshingala.com` belongs to `my-profile-website`, which is itself a project
site. Serving this under that path would need a Cloudflare Worker proxying
`/betterhalf/*`, or these files folded into the portfolio repo. A subdomain is
one DNS record and touches nothing that already works.

---

## The relative-path rule

Every internal reference in this project is relative:

```html
<link rel="stylesheet" href="css/main.css">     <!-- ✅ works at any depth -->
<link rel="stylesheet" href="/css/main.css">    <!-- ❌ breaks under a sub-path -->
```

That's what let the identical files survive being moved twice during setup —
from a repo root, into a `bday/` subfolder, and back out to the root — with no
rebuild and no config switch. They serve correctly from:

- `file:///…/index.html`
- `http://localhost:8080/`
- `https://anirudhshingala.github.io/betterhalf/`
- `https://betterhalf.anirudhshingala.com/`
- any sub-path you might move them to later

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
- **Images** — `loading="lazy"` and `decoding="async"` on every gallery tile,
  plus intrinsic `width`/`height` from config so the masonry never jolts as
  photos arrive.

### Mobile

Verified on emulated iPhone SE, iPhone 14 Pro, Pixel 7, Galaxy S8 and iPad
Mini — **zero horizontal overflow on all five** (`scrollWidth === clientWidth`
exactly, not merely clipped).

- **Touch has no hover.** A tap fires `:hover` and leaves it stuck, so
  hover-revealed content would be unreachable. Under `(hover: none)` the
  gallery captions are always visible, lift-on-hover is replaced with a press
  state, and tap targets are floored at 44px.
- **iOS specifics** — `-webkit-backdrop-filter` alongside every
  `backdrop-filter`; `overflow-x: clip` rather than `hidden` on the root
  (`hidden` makes the element a scroll container, which is exactly the quirk
  that lets iOS pan sideways anyway); `100dvh` on the hero so browser chrome
  can't push the CTA off-screen.
- **Notches** — `env(safe-area-inset-*)` offsets keep the fixed controls clear
  of the notch and home indicator.
- **Landscape phones** get their own rules — short, not narrow, so the hero
  stops demanding a full portrait-height screen.
- **Cheaper on phones** — backdrop blurs dropped below 48rem, fewer and smaller
  balloons, half the particle count, DPR capped at 2.

---

## Browser support

Chrome, Edge, Firefox and Safari — current versions, desktop and mobile.

Relies on `IntersectionObserver`, CSS custom properties, `aspect-ratio` and
`clamp()`. Anything older than roughly 2021 will render the content correctly
but lose some of the motion.

---

*Made with far too much love (and a little JavaScript).* ❤️
