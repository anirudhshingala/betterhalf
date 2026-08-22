/**
 * gallery.js — responsive photo grid with graceful placeholders + lightbox.
 * ---------------------------------------------------------------------------
 * Tiles are rendered from BIRTHDAY_CONFIG.gallery. Each entry points at a
 * RELATIVE path such as "assets/jetakshi-01.jpg".
 *
 * The important design decision here: a missing photo is a *normal* state,
 * not an error. Before any pictures have been added, every tile renders as a
 * gold-hatched placeholder printing the exact filename it is waiting for — so
 * the section looks deliberate on day one and self-documents how to fill it.
 *
 * Public API: window.Gallery.{ start, adopt }
 */

window.Gallery = (function () {
  'use strict';

  const { $, $$, el, trapFocus } = window.BD;

  let grid = null;
  let items = [];          // config entries, in render order
  let loaded = [];         // indices whose image actually resolved
  let currentIndex = -1;   // index into `loaded` while the lightbox is open
  let releaseFocus = null;
  let pendingImages = 0;   // images still resolving — see settle()

  /**
   * The "drop your photos into assets/" hint below the grid is scaffolding,
   * not content: it exists to tell you which files are missing. Once every
   * photo has arrived it removes itself, so visitors never see build notes.
   * If a file ever goes missing again, it comes straight back.
   */
  function settle() {
    pendingImages -= 1;
    if (pendingImages > 0) return;

    const stillMissing =
      document.querySelector('.gallery-item.is-empty') ||
      document.querySelector('.favourite.is-missing');

    if (!stillMissing) {
      const note = $('.gallery__note');
      if (note) note.remove();
    }
  }

  /**
   * Attach load/error handling. A cached image can finish before the
   * listeners are wired, so `complete` is checked explicitly afterwards.
   */
  function onSettled(img, onLoad, onError) {
    pendingImages += 1;
    let done = false;
    const once = (fn) => () => {
      if (done) return;
      done = true;
      fn();
      settle();
    };
    img.addEventListener('load', once(onLoad));
    img.addEventListener('error', once(onError));

    if (img.complete) {
      (img.naturalWidth > 0 ? once(onLoad) : once(onError))();
    }
  }

  /* ── Tile construction ────────────────────────────────────────────── */

  /**
   * Build one tile. The <img> starts attached; if it fails to load we swap in
   * the placeholder. Doing it this way (rather than probing first) means a
   * photo that *does* exist paints immediately with no extra round trip.
   */
  function buildTile(entry, index) {
    const tile = el('button', {
      className: 'gallery-item is-empty',
      attrs: {
        type: 'button',
        'data-index': String(index),
        'aria-label': entry.caption || 'Photo ' + (index + 1),
      },
    });

    const img = el('img', {
      className: 'gallery-item__img',
      attrs: {
        src: entry.src,
        alt: entry.caption || 'A photo of ' + window.BIRTHDAY_CONFIG.name,
        loading: 'lazy',
        decoding: 'async',
        // Intrinsic size, when config knows it. The browser reserves the
        // right box up front, so the masonry never reflows as files arrive.
        width: entry.w || false,
        height: entry.h || false,
      },
    });

    const veil = el('div', { className: 'gallery-item__veil' }, [
      el('p', { className: 'gallery-item__caption', text: entry.caption || '' }),
    ]);

    onSettled(
      img,
      () => {
        tile.classList.remove('is-empty');
        tile.appendChild(veil);
        loaded.push(index);
        // Keep viewer order matching visual order regardless of load order.
        loaded.sort((a, b) => a - b);
      },
      () => {
        img.remove();
        tile.appendChild(buildPlaceholder(entry));
        tile.setAttribute('aria-label', 'Empty frame — add ' + entry.src);
        tile.setAttribute('aria-disabled', 'true');
      }
    );

    tile.appendChild(img);
    return tile;
  }

  /** The "drop your photo here" frame shown when a file is missing. */
  function buildPlaceholder(entry) {
    return el('div', { className: 'gallery-placeholder' }, [
      el('div', { className: 'gallery-placeholder__icon', text: '🖼️' }),
      el('p', {
        className: 'gallery-placeholder__title',
        text: entry.caption || 'A photo goes here',
      }),
      el('code', { className: 'gallery-placeholder__file', text: entry.src }),
    ]);
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE FAVOURITE
     ══════════════════════════════════════════════════════════════════════
     A single photo on its own stage, hidden behind a frosted cover until
     she chooses to lift it. Revealing runs a gold curtain sweep across the
     frame, then the photo settles in from a slight zoom.

     Deliberately opt-in rather than auto-revealing on scroll: the small act
     of tapping is what makes it feel like being shown something, and it
     keeps the surprise from being spent while scrolling past.
     ══════════════════════════════════════════════════════════════════════ */

  /** Index into `items` for the favourite, so the lightbox can include it. */
  let favouriteIndex = -1;

  function buildFavourite() {
    const stage = $('#favourite-stage');
    const fav = window.BIRTHDAY_CONFIG.favourite;

    // Feature switched off in config — remove the stage entirely.
    if (!stage || !fav || !fav.src) {
      if (stage) stage.remove();
      return;
    }

    // The favourite joins the lightbox rotation as entry 0, so paging
    // through photos includes it in visual order.
    favouriteIndex = items.length;
    items.push({ src: fav.src, caption: fav.caption || fav.badge || '' });

    const frame = el('div', { className: 'favourite__frame' });

    // Match the frame to the photo's own proportions so the reveal shows the
    // whole picture rather than a crop of it.
    if (fav.w && fav.h) {
      frame.style.setProperty('aspect-ratio', fav.w + ' / ' + fav.h);
    }

    const img = el('img', {
      className: 'favourite__img',
      attrs: {
        src: fav.src,
        alt: fav.caption || 'My favourite photo of ' + window.BIRTHDAY_CONFIG.name,
        decoding: 'async',
        width: fav.w || false,
        height: fav.h || false,
      },
    });

    // The frosted cover: badge, teaser and a sweeping shimmer.
    const cover = el('button', {
      className: 'favourite__cover',
      attrs: { type: 'button', 'aria-expanded': 'false' },
    }, [
      el('span', { className: 'favourite__badge', text: fav.badge || 'My favourite one' }),
      el('span', { className: 'favourite__teaser', text: fav.teaser || 'Tap to reveal' }),
      el('span', { className: 'favourite__shine', attrs: { 'aria-hidden': 'true' } }),
    ]);

    const caption = el('p', {
      className: 'favourite__caption',
      text: fav.caption || '',
    });

    onSettled(
      img,
      () => {
        loaded.push(favouriteIndex);
        loaded.sort((a, b) => a - b);
      },
      // Missing file: say so plainly rather than offering an empty reveal.
      () => {
        stage.classList.add('is-missing');
        img.remove();
        frame.appendChild(
          el('div', { className: 'gallery-placeholder' }, [
            el('div', { className: 'gallery-placeholder__icon', text: '⭐' }),
            el('p', {
              className: 'gallery-placeholder__title',
              text: (fav.badge || 'My favourite one') + ' goes here',
            }),
            el('code', { className: 'gallery-placeholder__file', text: fav.src }),
          ])
        );
        // Nothing to reveal, and nothing to open in the lightbox.
        cover.remove();
        caption.remove();
        loaded = loaded.filter((i) => i !== favouriteIndex);
      }
    );

    let revealed = false;

    cover.addEventListener('click', () => {
      if (revealed) return;
      revealed = true;

      // NOT `is-revealed` — that class belongs to the scroll-reveal system
      // (js/reveal.js adds it to every [data-reveal], including this stage),
      // and reusing it here would un-blur the photo the moment it scrolled
      // into view instead of when she taps it.
      stage.classList.add('is-unveiled');
      cover.setAttribute('aria-expanded', 'true');

      // Let the curtain finish before the cover stops catching clicks, then
      // hand the frame over to the lightbox.
      setTimeout(() => {
        cover.remove();
        frame.classList.add('is-interactive');
      }, 1100);
    });

    // Once revealed, clicking the photo opens it full size.
    frame.addEventListener('click', () => {
      if (!revealed || !frame.classList.contains('is-interactive')) return;
      openLightbox(favouriteIndex);
    });

    frame.appendChild(img);
    frame.appendChild(cover);
    stage.appendChild(frame);
    stage.appendChild(caption);
  }

  /* ── Lightbox ─────────────────────────────────────────────────────── */

  const lb = {};

  function openLightbox(entryIndex) {
    const position = loaded.indexOf(entryIndex);
    if (position === -1) return;   // placeholder tile — nothing to show

    currentIndex = position;
    showCurrent();

    lb.root.hidden = false;
    document.body.style.overflow = 'hidden';
    releaseFocus = trapFocus(lb.root);
  }

  function showCurrent() {
    const entry = items[loaded[currentIndex]];
    lb.img.src = entry.src;
    lb.img.alt = entry.caption || '';
    lb.caption.textContent = entry.caption || '';

    // Hide the arrows when there is nothing to page through.
    const multiple = loaded.length > 1;
    lb.prev.hidden = !multiple;
    lb.next.hidden = !multiple;
  }

  function step(delta) {
    if (!loaded.length) return;
    // Wrap in both directions.
    currentIndex = (currentIndex + delta + loaded.length) % loaded.length;
    showCurrent();
  }

  function closeLightbox() {
    lb.root.hidden = true;
    lb.img.src = '';
    document.body.style.overflow = '';
    if (releaseFocus) {
      releaseFocus();
      releaseFocus = null;
    }
  }

  function bindLightbox() {
    lb.root    = $('#lightbox');
    lb.img     = $('#lightbox-img');
    lb.caption = $('#lightbox-caption');
    lb.prev    = $('#lightbox-prev');
    lb.next    = $('#lightbox-next');

    if (!lb.root) return;

    $$('[data-lightbox-close]', lb.root).forEach((n) =>
      n.addEventListener('click', closeLightbox)
    );
    $('#lightbox-close').addEventListener('click', closeLightbox);
    lb.prev.addEventListener('click', () => step(-1));
    lb.next.addEventListener('click', () => step(1));

    document.addEventListener('keydown', (e) => {
      if (lb.root.hidden) return;
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowLeft')  step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  /**
   * Lend the lightbox to another module.
   *
   * js/moments.js has a photo that belongs in the same viewer — same scrim,
   * same arrows, same focus trap, same Escape key. Rather than grow a second
   * lightbox that has to be kept in visual sync, it hands the entry over here
   * and gets back the two calls it needs. The entry lands at the end of the
   * rotation, so paging order still matches reading order down the page.
   *
   * @param {{src: string, caption?: string}} entry
   * @returns {{markReady: function, open: function}}
   */
  function adopt(entry) {
    const index = items.length;
    items.push(entry);

    return {
      // Called once the file has actually loaded. Until then the entry stays
      // out of `loaded`, so a missing photo can never open a blank lightbox.
      markReady: function () {
        if (loaded.indexOf(index) === -1) {
          loaded.push(index);
          loaded.sort((a, b) => a - b);
        }
      },
      open: function () { openLightbox(index); },
    };
  }

  function start() {
    grid = $('#gallery-grid');
    if (!grid) return;

    const entries = window.BIRTHDAY_CONFIG.gallery || [];
    items = [];
    loaded = [];

    // Build the favourite first so it claims index 0 and therefore leads the
    // lightbox rotation, matching the order on the page.
    buildFavourite();

    // Grid tiles follow it in `items`.
    const offset = items.length;
    entries.forEach((entry) => items.push(entry));

    // One fragment, one reflow.
    const frag = document.createDocumentFragment();
    entries.forEach((entry, i) => frag.appendChild(buildTile(entry, offset + i)));
    grid.appendChild(frag);

    // Delegated click: works for tiles added or swapped at any time.
    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('.gallery-item');
      if (!tile || tile.classList.contains('is-empty')) return;
      openLightbox(Number(tile.dataset.index));
    });

    bindLightbox();
  }

  return { start, adopt };
})();
