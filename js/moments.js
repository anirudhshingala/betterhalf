/**
 * moments.js — the section that fills itself in.
 * ---------------------------------------------------------------------------
 * Drop a photo into assets/moments/ — any filename, any extension — commit,
 * push. It becomes the centrepiece of the site, stamped with the day it went
 * up. No config to edit, no filename to match.
 *
 * HOW IT KNOWS WHAT IS IN THE FOLDER
 *   It doesn't, and it can't: a static host serves assets/moments/x.jpg
 *   perfectly well but never lists the directory, so there is nothing for the
 *   browser to read. tools/build_moments.py writes the folder's contents to
 *   assets/moments/manifest.json instead, and this file fetches that. The
 *   script runs on every local page load (serve.py) and on every push
 *   (.github/workflows/moments.yml), so the manifest cannot go stale.
 *
 * THE EMPTY CASE IS THE IMPORTANT ONE
 *   No manifest, an unreadable one, or one listing nothing: this module
 *   returns having touched nothing. #moments keeps its `hidden` attribute,
 *   no nav link is added, no request for a photo is made. The page is
 *   byte-for-byte what it was before the feature existed — no placeholder,
 *   no empty frame, no clue that anything is coming. Everything below is
 *   guarded on the manifest actually having a photo in it.
 *
 * Public API: window.Moments.start()
 */

window.Moments = (function () {
  'use strict';

  const { $, el, prefersReducedMotion } = window.BD;

  /* ── Rendering ────────────────────────────────────────────────────── */

  /**
   * Match the site's other headings, where the last word carries the accent:
   * "Today's Best <em>Moment</em>". Splitting on the final space keeps that
   * working for any title put in config, without asking for markup there.
   */
  function accentedTitle(text) {
    const at = text.lastIndexOf(' ');
    if (at === -1) return [el('em', { text: text })];
    return [
      document.createTextNode(text.slice(0, at + 1)),
      el('em', { text: text.slice(at + 1) }),
    ];
  }

  /** The gold date plaque. */
  function buildBadge(cfg, photo) {
    const label =
      cfg.dateLabelOverride ||
      (photo.date && photo.date.label) ||
      null;

    if (!label) return null;

    return el('figcaption', { className: 'moment__stamp' }, [
      el('span', { className: 'moment__stamp-rule', attrs: { 'aria-hidden': 'true' } }),
      el('time', {
        className: 'moment__stamp-date',
        text: label,
        // The machine-readable form, when the manifest knew it.
        attrs: { datetime: (photo.date && photo.date.iso) || false },
      }),
      el('span', { className: 'moment__stamp-rule', attrs: { 'aria-hidden': 'true' } }),
    ]);
  }

  /**
   * The hero frame: one photo, its own stage, gold edge, slow drift.
   *
   * The <img> is attached immediately rather than probed first, matching
   * gallery.js — a file that exists paints with no extra round trip.
   *
   * Nothing is shown until it has actually loaded: `onReady` is what reveals
   * the section, and `onFail` removes it. A photo the browser cannot draw
   * therefore degrades to precisely the empty-folder case — no half-built
   * section, and no nav link left pointing at something that isn't there.
   *
   * @param {function} onReady called once the photo is on screen-ready
   * @param {function} onFail  called if it can never be drawn
   */
  function buildHero(cfg, photo, onReady, onFail) {
    const figure = el('figure', { className: 'moment__figure' });

    const frame = el('div', { className: 'moment__frame' });

    // Reserve the photo's own proportions so the page does not jolt as the
    // (probably large, probably straight off a phone) file arrives. The ratio
    // also goes on the figure as a number, which main.css uses to keep a tall
    // portrait inside one screen without ever cropping it.
    if (photo.w && photo.h) {
      frame.style.setProperty('aspect-ratio', photo.w + ' / ' + photo.h);
      figure.style.setProperty('--moment-ratio', String(photo.w / photo.h));
    }

    const img = el('img', {
      className: 'moment__img',
      attrs: {
        src: photo.src,
        alt: cfg.caption || 'A photo from today',
        decoding: 'async',
        // Deliberately NOT lazy: this is the thing worth loading first.
        fetchpriority: 'high',
        width: photo.w || false,
        height: photo.h || false,
      },
    });

    let viewer = null;
    let settled = false;

    function handleLoad() {
      if (settled) return;
      settled = true;

      // Now that the file is known good, let it open full size.
      if (window.Gallery && window.Gallery.adopt) {
        viewer = window.Gallery.adopt({
          src: photo.src,
          caption: cfg.caption || '',
        });
        viewer.markReady();
        frame.classList.add('is-interactive');
      }
      onReady();
    }

    function handleError() {
      if (settled) return;
      settled = true;

      // A HEIC straight off an iPhone lands here in Chrome and Firefox, which
      // cannot decode it. Rather than show a broken frame on the one section
      // that is meant to be beautiful, the section never appears at all — and
      // says why in the console, where whoever uploaded it will look.
      if (photo.needsConvert) {
        console.warn(
          '[moments] ' + photo.src + ' is HEIC/HEIF, which this browser ' +
          'cannot display. The GitHub Action converts it to .jpg on push; ' +
          'if you are seeing this locally, save it as JPEG instead.'
        );
      } else {
        console.warn('[moments] could not load ' + photo.src);
      }
      onFail();
    }

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // A cached file can finish before those listeners are wired, and then no
    // event ever arrives — the same trap gallery.js guards against in
    // onSettled(). Check the outcome directly rather than waiting for it.
    //
    // Deferred to a microtask, not called straight away: this runs while
    // render() is still mid-appendChild, and onReady() must not unwrap the
    // section before the figure it is about to show has been attached.
    if (img.complete) {
      Promise.resolve().then(img.naturalWidth > 0 ? handleLoad : handleError);
    }

    frame.addEventListener('click', function () {
      if (viewer && frame.classList.contains('is-interactive')) viewer.open();
    });

    frame.appendChild(img);
    frame.appendChild(el('span', {
      className: 'moment__shine',
      attrs: { 'aria-hidden': 'true' },
    }));

    figure.appendChild(el('span', {
      className: 'moment__halo',
      attrs: { 'aria-hidden': 'true' },
    }));
    figure.appendChild(frame);

    const badge = buildBadge(cfg, photo);
    if (badge) figure.appendChild(badge);

    if (cfg.caption) {
      figure.appendChild(el('p', {
        className: 'moment__caption',
        text: cfg.caption,
      }));
    }

    return figure;
  }

  /**
   * Any photos beyond the first, as a row of small frames underneath.
   *
   * "Upload one photo" is the expected case, but the folder is a folder — if
   * several go in, all of them belong here rather than only the newest, and
   * they each join the lightbox so none is a dead end.
   */
  function buildRest(cfg, photos) {
    const strip = el('div', { className: 'moment__more' });

    strip.appendChild(el('p', {
      className: 'moment__more-label',
      text: photos.length === 1 ? 'And one more from today' : 'More from today',
    }));

    const row = el('div', { className: 'moment__thumbs' });

    photos.forEach(function (photo, i) {
      const button = el('button', {
        className: 'moment__thumb',
        attrs: { type: 'button', 'aria-label': 'Open photo ' + (i + 2) + ' from today' },
      });

      const img = el('img', {
        attrs: {
          src: photo.src,
          alt: '',
          loading: 'lazy',
          decoding: 'async',
          width: photo.w || false,
          height: photo.h || false,
        },
      });

      let viewer = null;

      img.addEventListener('load', function () {
        button.classList.add('is-loaded');
        if (window.Gallery && window.Gallery.adopt) {
          viewer = window.Gallery.adopt({ src: photo.src, caption: '' });
          viewer.markReady();
        }
      });

      // One bad file among several removes only itself.
      img.addEventListener('error', function () { button.remove(); });

      button.addEventListener('click', function () {
        if (viewer) viewer.open();
      });

      button.appendChild(img);
      row.appendChild(button);
    });

    strip.appendChild(row);
    return strip;
  }

  /* ── Wiring the section into the page ─────────────────────────────── */

  /**
   * Put the section where config asks for it.
   *
   * The shell is authored at the end of the story in index.html, which is the
   * default, so only the other placement needs a move. Done before the
   * section is revealed, so she never sees it jump.
   */
  function place(cfg, section) {
    // 'end' is where the shell already lives in index.html — the last thing
    // in the story, after the door block and above the footer. Nothing to do.
    if (cfg.placement !== 'after-story') return;

    const story = $('#our-story');
    if (story && story.parentNode) {
      story.parentNode.insertBefore(section, story.nextSibling);
    }
  }

  /**
   * The nav dot. Added here rather than sitting in index.html because a link
   * to a hidden section is a link to nowhere — it would scroll her into blank
   * space on any day the folder is empty.
   */
  function addNavLink(cfg) {
    const nav = $('#section-nav');
    if (!nav || $('a[data-nav="moments"]', nav)) return;

    const link = el('a', {
      attrs: { href: '#moments', 'data-nav': 'moments' },
    }, [el('span', { text: cfg.kicker || 'Today' })]);

    // Mirror the section's own position on the page.
    if (cfg.placement === 'end') {
      nav.appendChild(link);
    } else {
      const after = $('a[data-nav="our-story"]', nav);
      nav.insertBefore(link, after ? after.nextSibling : nav.firstChild);
    }

    // reveal.js collected its nav links at start(), before the manifest had
    // come back. Re-scan so this one lights up with the others.
    if (window.Reveal && window.Reveal.refreshNav) window.Reveal.refreshNav();
  }

  /** Confetti the first time it comes into view, once, then stop watching. */
  function celebrateOnce(section) {
    if (!window.RSVP || !window.RSVP.celebrate) return;
    if (prefersReducedMotion()) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        window.RSVP.celebrate();
      });
    }, { threshold: 0.45 });

    observer.observe(section);
  }

  function render(cfg, photos) {
    const section = $('#moments');
    const stage = $('#moments-stage');
    if (!section || !stage) return;

    /* ── Header, from config ── */
    const head = el('header', {
      className: 'section__head',
      attrs: { 'data-reveal': true },
    }, [
      el('p', { className: 'section__kicker', text: cfg.kicker || 'Today' }),
      el('h2', {
        className: 'section__title',
        attrs: { id: 'moments-title' },
      }, accentedTitle(cfg.title || "Today's Best Moment")),
    ]);

    if (cfg.lede) {
      head.appendChild(el('p', { className: 'section__lede', text: cfg.lede }));
    }

    stage.parentNode.insertBefore(head, stage);

    /* ── Reveal, but only once the photo is really there ──
       Everything below is built while the section is still `hidden`, and the
       section is only unwrapped from inside the hero image's load handler.
       That ordering is the guarantee the whole feature rests on: until there
       is a photo the browser can actually draw, the page is untouched. */
    function onReady() {
      place(cfg, section);
      section.hidden = false;
      addNavLink(cfg);

      // The section was `hidden` when reveal.js swept the page, so it had no
      // layout box and its targets never intersected. Register them now.
      if (window.Reveal && window.Reveal.refresh) window.Reveal.refresh();

      if (cfg.celebrateOnFirstView) celebrateOnce(section);
    }

    function onFail() {
      // Never revealed, so there is no nav link and nothing to tidy but the
      // shell itself.
      section.remove();
    }

    /* ── The photo(s) ── */
    stage.appendChild(buildHero(cfg, photos[0], onReady, onFail));
    if (photos.length > 1) {
      stage.appendChild(buildRest(cfg, photos.slice(1)));
    }
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  function start() {
    const cfg = (window.BIRTHDAY_CONFIG || {}).moments;
    if (!cfg || cfg.enabled === false) return;

    const url = cfg.manifest || 'assets/moments/manifest.json';

    // Cache-bust explicitly. GitHub Pages caches aggressively, and a manifest
    // served from cache is the difference between the photo appearing on the
    // day and appearing whenever a browser happens to feel like revalidating.
    fetch(url + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        // 404 is the ordinary "no photos yet" answer, not an error worth
        // logging: the manifest does not exist until the script has run.
        if (!response.ok) return null;
        return response.json();
      })
      .then(function (manifest) {
        if (!manifest) return;

        const photos = (manifest.photos || []).filter(function (p) {
          return p && p.src;
        });

        // The empty case. Nothing rendered, nothing revealed, no nav link.
        if (!photos.length) return;

        render(cfg, photos);
      })
      .catch(function (err) {
        // Malformed JSON, offline, file:// with no fetch — all end here, and
        // all mean the same thing to the visitor: the section stays away.
        console.warn('[moments] manifest unavailable —', err.message);
      });
  }

  return { start };
})();
