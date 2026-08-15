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
     year after year with no edits.

     The target is pinned to IST, NOT to the viewer's device clock. That
     means the countdown reads the same number everywhere — on her phone,
     on yours, on a laptop left on the wrong timezone, or from abroad — and
     it unlocks at midnight in India rather than midnight wherever the
     device happens to think it is.                                        */
  birthday: {
    month: 8,   // 1-indexed: 8 = August
    day: 24,
    hour: 0,    // countdown target = midnight at the start of the birthday
    minute: 0,

    /* IST = UTC+05:30. India has not observed daylight saving since 1945,
       so a fixed offset is exact — no timezone database needed.
       For a zone that DOES observe DST, this constant would be wrong for
       half the year; you'd want Intl.DateTimeFormat with a `timeZone` name
       instead. Set to null to fall back to the viewer's own clock. */
    utcOffsetMinutes: 330,
    tzLabel: 'IST',
  },

  /* ══════════════════════════════════════════════════════════════════════
     THE GATE — what Jetakshi sees before the big day
     ══════════════════════════════════════════════════════════════════════
     While the gate is locked, the ENTIRE site is replaced by a full-screen
     countdown. The moment it reaches zero the page unlocks itself, live,
     with no refresh needed.

     ── How to see the full site while building ──
     Any ONE of these opens it:
       1. `bypass: true` below            → always unlocked, everywhere
       2. localhost / 127.0.0.1 / file:// → unlocked automatically
       3. ?preview=1 on the URL           → unlocked on any host, incl. live

     ⚠️  This is a surprise, not a security control. It runs in the browser,
     so anyone who opens devtools can bypass it. That is fine for a birthday
     gift — just don't put anything genuinely private behind it.            */
  gate: {
    enabled: true,

    /* ── THE LOCAL-TESTING SWITCH ──────────────────────────────────────
       Flip to `true` to force the full site open everywhere, including the
       deployed URL. Remember to set it back to `false` before she looks.  */
    bypass: false,

    /* Treat localhost / 127.0.0.1 / file:// as "I am the developer".
       Currently ON: the full site opens straight away on your machine,
       while betterhalf.anirudhshingala.com stays locked behind the
       countdown for her.

       This is the safe switch to leave on — it keys off the hostname, so
       it can never unlock the deployed site no matter what. (`bypass`
       above is the dangerous one; that unlocks everywhere.)

       Want to see her lock screen locally? Add ?gate=1 — it overrides
       this and forces the countdown. */
    bypassOnLocalhost: true,

    /* Query-string escape hatch, e.g. …/birthday/?preview=1
       Lets you check the real deployed site on your phone without
       unlocking it for her. Set to null to disable. */
    previewParam: 'preview',

    /* The opposite escape hatch, e.g. http://localhost:8080/?gate=1
       FORCES the lock screen even on localhost, so you can see exactly
       what she sees. Overrides bypass and bypassOnLocalhost. */
    forceParam: 'gate',

    /* TEST MODE — currently OFF (null = use the real 24 August date).
       ─────────────────────────────────────────────────────────────────
       Set to a number of seconds to make the countdown end that soon after
       the page loads, so the unlock can be watched instead of waited for.
       e.g. `60` → one minute from load; reload to run it again.

       ⚠️  Always set it back to null before deploying. Left on, the gate
       opens shortly after she arrives and the surprise is spent. The
       browser console warns loudly whenever it is active. */
    testCountdownSeconds: null,

    /* ── Copy for the locked screen ────────────────────────────────────
       Deliberately just one line and the clock. The whole point is that
       she doesn't know what it is yet, so the page shouldn't explain.
       Reads as one sentence wrapped around the timer:
           "Little surprise for you"
           "loading in this much time"
           [ 08 : 12 : 44 : 20 ]                                          */
    title: 'Little surprise for you',
    subtitle: 'loading in this much time',
  },

  /* ── The evening ──────────────────────────────────────────────────────
     Display strings only. The invitation card itself is plain markup in
     index.html (<section id="invitation">) — keep the two in sync.         */
  event: {
    dateLabel: 'August 24',
    timeLabel: '7:30 PM',
    locationLabel: 'Just me and you',
  },

  /* ── The favourite ────────────────────────────────────────────────────
     One photo gets its own stage above the grid, behind a frosted cover
     that she taps to reveal. Set to null to remove the feature entirely.

     `src` is the file to drop into ./assets/ — change the extension here
     if you use .jpg/.png instead of .webp.                                */
  favourite: {
    src: 'assets/favourite.webp',
    w: 1199,
    h: 1440,
    badge: 'The most favourite one',
    teaser: 'Tap to reveal',
    caption: 'This is the one. It always has been.',
  },

  /* ── Gallery ──────────────────────────────────────────────────────────
     The grid is a true masonry (CSS columns), so every photo keeps its own
     natural aspect ratio and NOTHING is ever cropped. Mixed portraits and
     landscapes can sit side by side without fighting each other.

     `w` and `h` are the file's real pixel dimensions. They are optional,
     but supplying them lets the browser reserve the exact space before the
     image arrives — which is the difference between the gallery settling
     into place and it jolting around as photos load.

     A missing file is not an error: gallery.js renders a labelled
     placeholder naming the file it expected.

     ✏️  The captions below are gentle placeholders. Swap them for the real
     memory behind each photo — that is what turns this from a nice grid
     into something only she would understand.                              */
  gallery: [
    { src: 'assets/jetakshi-01.jpg', w: 1080, h: 1351, caption: 'Lovely' },
    { src: 'assets/jetakshi-02.jpg', w: 960,  h: 1280, caption: 'That Smile' },
    { src: 'assets/jetakshi-03.jpg', w: 832,  h: 1040, caption: 'Never gets old' },
    { src: 'assets/jetakshi-04.jpg', w: 1080, h: 1295, caption: 'My favourite view' },
    { src: 'assets/jetakshi-05.jpg', w: 686,  h: 1260, caption: 'This one' },
    { src: 'assets/jetakshi-06.jpg', w: 832,  h: 1440, caption: 'Always' },
    { src: 'assets/jetakshi-07.jpg', w: 586,  h: 979,  caption: 'Here’s to many more' },
    // The odd one out shape-wise — which the masonry handles without a fuss.
    { src: 'assets/jetakshi-08.jpg', w: 462,  h: 412,  caption: 'The naughty one' },
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
    /* Shown by the 404 modal, once she has chased the "No" button long
       enough to deserve it (see rsvp.noButton.modalAfter). */
    noButtonError: "Error 404: 'No' option not found! You can't say no to me! 😜",

    /* Success line. There is only one winning button now, but answer()
       falls back to `default` if a new one is ever added. */
    rsvpSuccess: {
      definitely: 'DEFINITELY yes. I knew you would say that. 😘',
      default:    'You said yes. I never doubted you for a second.',
    },
  },

  /* ── The RSVP ─────────────────────────────────────────────────────────
     There is exactly one real choice. The "No" button bolts the moment the
     cursor gets near it and can never be clicked — it just taunts you and
     keeps moving.                                                          */
  rsvp: {
    noButton: {
      /* Set false to make it a plain, static, still-unclickable button. */
      flee: true,

      /* How close the cursor may get, in px, before it bolts again. Larger
         = twitchier and harder to corner. */
      panicRadius: 96,

      /* It never lands closer than this to the cursor, so a fast flick of
         the mouse can't accidentally trap it under the pointer. */
      safeDistance: 220,

      /* Label progression. Starts at the first entry and advances one step
         per escape, then stays on the last — so the chase ends on the line
         that says the quiet part out loud. */
      taunts: [
        'No',
        'Catch me if you can! 😜',
        'Nope, too slow!',
        'Not a chance!',
        'Still running 🏃‍♀️',
        "You can't say no to me! 😜",
      ],

      /* Escapes before the "Error 404: 'No' option not found!" modal pops
         up as a reward for persistence.

         0 = never (the default). The modal's scrim covers the whole screen,
         which halts the chase just as it gets fun, and the final taunt
         already says the same thing. Set it to something like 6 if you'd
         rather have the modal as a punchline. */
      modalAfter: 0,
    },
  },
});
