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
 * Public API: window.Gallery.start()
 */

window.Gallery = (function () {
  'use strict';

  const { $, $$, el, trapFocus } = window.BD;

  let grid = null;
  let items = [];          // config entries, in render order
  let loaded = [];         // indices whose image actually resolved
  let currentIndex = -1;   // index into `loaded` while the lightbox is open
  let releaseFocus = null;

  /* ── Tile construction ────────────────────────────────────────────── */

  /**
   * Build one tile. The <img> starts attached; if it fails to load we swap in
   * the placeholder. Doing it this way (rather than probing first) means a
   * photo that *does* exist paints immediately with no extra round trip.
   */
  function buildTile(entry, index) {
    const spanClass = entry.span ? ' gallery-item--' + entry.span : '';

    const tile = el('button', {
      className: 'gallery-item is-empty' + spanClass,
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
      },
    });

    const veil = el('div', { className: 'gallery-item__veil' }, [
      el('p', { className: 'gallery-item__caption', text: entry.caption || '' }),
    ]);

    img.addEventListener('load', () => {
      tile.classList.remove('is-empty');
      tile.appendChild(veil);
      loaded.push(index);
      // Keep viewer order matching visual order regardless of load order.
      loaded.sort((a, b) => a - b);
    });

    img.addEventListener('error', () => {
      img.remove();
      tile.appendChild(buildPlaceholder(entry));
      tile.setAttribute('aria-label', 'Empty frame — add ' + entry.src);
      tile.setAttribute('aria-disabled', 'true');
    });

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

  function start() {
    grid = $('#gallery-grid');
    if (!grid) return;

    items = window.BIRTHDAY_CONFIG.gallery || [];
    loaded = [];

    // One fragment, one reflow.
    const frag = document.createDocumentFragment();
    items.forEach((entry, i) => frag.appendChild(buildTile(entry, i)));
    grid.appendChild(frag);

    // Delegated click: works for tiles added or swapped at any time.
    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('.gallery-item');
      if (!tile || tile.classList.contains('is-empty')) return;
      openLightbox(Number(tile.dataset.index));
    });

    bindLightbox();
  }

  return { start };
})();
