/**
 * config.js — the single place to change anything about this site.
 * ---------------------------------------------------------------------------
 * Loaded before every other module. Nothing here touches the DOM; it is pure
 * data, so you can safely edit it without reading any of the other files.
 *
 * Every path in this file is RELATIVE (no leading "/") so the site works
 * identically from disk, from localhost, and from a nested host path such as
 * anirudhshingala.com/betterhalf/birthday.
 */

window.BIRTHDAY_CONFIG = Object.freeze({

  /* ── Who this is for ──────────────────────────────────────────────────── */
  name: 'Jetakshi',

  /* ── The date ─────────────────────────────────────────────────────────
     Stored as month/day only, deliberately. countdown.js resolves this to
     the *next* occurrence relative to "now", so the timer keeps working
     year after year with no edits — and it uses the visitor's own local
     timezone rather than a fixed UTC instant.                              */
  birthday: {
    month: 8,   // 1-indexed: 8 = August
    day: 24,
    hour: 0,    // countdown target = midnight at the start of the birthday
    minute: 0,
  },

  /* ── The evening ──────────────────────────────────────────────────────
     Display strings only. The invitation card itself is plain markup in
     index.html (<section id="invitation">) — keep the two in sync.         */
  event: {
    dateLabel: 'August 24',
    timeLabel: '7:30 PM',
    locationLabel: 'Just me and you',
  },

  /* ── Gallery ──────────────────────────────────────────────────────────
     `src` values are the exact filenames to drop into ./assets/.
     A missing file is not an error: gallery.js renders an elegant labelled
     placeholder showing the filename it expected, so the grid always looks
     intentional. `span` controls the desktop grid footprint:
        'wide' → two columns   |   'tall' → two rows   |   omit → 1×1
     See assets/README.md for sizes and formats.                            */
  gallery: [
    { src: 'assets/jetakshi-01.jpg', caption: 'The one that started everything', span: 'wide' },
    { src: 'assets/jetakshi-02.jpg', caption: 'That laugh' },
    { src: 'assets/jetakshi-03.jpg', caption: 'Golden hour, golden you', span: 'tall' },
    { src: 'assets/jetakshi-04.jpg', caption: 'Us, being ridiculous' },
    { src: 'assets/jetakshi-05.jpg', caption: 'My favourite view' },
    { src: 'assets/jetakshi-06.jpg', caption: 'Somewhere worth remembering', span: 'wide' },
    { src: 'assets/jetakshi-07.jpg', caption: 'Unposed and perfect' },
    { src: 'assets/jetakshi-08.jpg', caption: 'Here is to many more' },
  ],

  /* ── Optional background music ────────────────────────────────────────
     Drop a file at this path to make the music button appear. If the file
     is absent, music.js removes the button entirely — nothing looks broken.
     Set to null to disable the feature outright.                           */
  music: {
    src: 'assets/our-song.mp3',
    volume: 0.35,
  },

  /* ── Floating balloons ────────────────────────────────────────────────
     `hues` are HSL hue angles; saturation and lightness are handled in CSS
     so every balloon stays inside the palette no matter the hue.           */
  balloons: {
    maxOnScreen: 14,     // hard ceiling, keeps the compositor comfortable
    spawnEveryMs: 1500,  // one new balloon roughly this often
    initialBurst: 7,     // spawned immediately so the sky is never empty
    minSize: 34,         // px
    maxSize: 92,         // px
    minRiseSec: 17,      // fastest bottom-to-top journey
    maxRiseSec: 34,      // slowest
    hues: [345, 330, 12, 40, 275, 200, 315, 8],
  },

  /* ── Particle field (hearts & stars) ──────────────────────────────────
     `density` is particles per million viewport pixels, so a phone gets
     proportionally fewer than a desktop and the frame cost stays flat.     */
  particles: {
    density: 46,
    maxCount: 130,
    minSize: 4,
    maxSize: 13,
    heartRatio: 0.42,    // remainder are stars/sparkles
  },

  /* ── Confetti ─────────────────────────────────────────────────────────
     Colours are shared by every burst so the celebration reads as one
     coherent palette rather than generic party confetti.                   */
  confetti: {
    colors: ['#d4af37', '#f3d998', '#ff8fab', '#ffd6e0', '#e8b4a0', '#b76e79', '#fdf6ee'],
    durationMs: 4200,
  },

  /* ── Copy ─────────────────────────────────────────────────────────── */
  copy: {
    /* Shown by the 404 modal when the "No" button is hovered or clicked. */
    noButtonError: "Error 404: 'No' option not found! You can't say no to me! 😜",
    /* Success lines, keyed by which button won. */
    rsvpSuccess: {
      yes:        'You said yes. I never doubted you for a second.',
      definitely: 'DEFINITELY yes. Best answer in the history of answers.',
      no:         'See? I told you there was no "No". 😌',
    },
  },
});
