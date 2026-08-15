/**
 * reveal.js — scroll-driven chrome.
 * ---------------------------------------------------------------------------
 * Three small, independent jobs:
 *   1. reveal  — fade/rise each [data-reveal] block as it enters the viewport
 *   2. progress — the gold bar across the top of the page
 *   3. nav      — highlight the dot for whichever section is on screen
 *
 * IntersectionObserver does the heavy lifting for 1 and 3 (no scroll handler,
 * no getBoundingClientRect in a loop). The progress bar does need scroll
 * position, so it is throttled to one write per animation frame.
 *
 * Public API: window.Reveal.{ start, refresh }
 */

window.Reveal = (function () {
  'use strict';

  const { $, $$, clamp, prefersReducedMotion } = window.BD;

  let revealObserver = null;
  let navObserver = null;
  let progressBar = null;
  let ticking = false;

  /* ── 1. Reveal on scroll ──────────────────────────────────────────── */

  function initReveal() {
    const targets = $$('[data-reveal]');
    if (!targets.length) return;

    // No IntersectionObserver (or motion is unwelcome): show everything now.
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      targets.forEach((n) => n.classList.add('is-revealed'));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          // One-shot: nothing re-hides on the way back up.
          revealObserver.unobserve(entry.target);
        });
      },
      {
        // Fire slightly before the element is fully on screen so the motion
        // finishes as it settles into view rather than after.
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.08,
      }
    );

    targets.forEach((node, i) => {
      // Stagger siblings within the same section.
      node.style.setProperty('--reveal-delay', String(i % 4));
      revealObserver.observe(node);
    });
  }

  /**
   * Re-scan for [data-reveal] nodes added after start() (the gallery tiles
   * are rendered dynamically, for instance).
   */
  function refresh() {
    if (!revealObserver) return;
    $$('[data-reveal]:not(.is-revealed)').forEach((n) => revealObserver.observe(n));
  }

  /* ── 2. Reading progress ──────────────────────────────────────────── */

  function updateProgress() {
    ticking = false;
    if (!progressBar) return;

    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? doc.scrollTop / scrollable : 0;

    progressBar.style.width = (clamp(ratio, 0, 1) * 100).toFixed(2) + '%';
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateProgress);
  }

  function initProgress() {
    progressBar = $('#scroll-progress-bar');
    if (!progressBar) return;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateProgress();
  }

  /* ── 3. Section nav ───────────────────────────────────────────────── */

  function initNav() {
    const nav = $('#section-nav');
    if (!nav || !('IntersectionObserver' in window)) return;

    const links = $$('a[data-nav]', nav);
    const byId = {};
    links.forEach((a) => { byId[a.dataset.nav] = a; });

    navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = byId[entry.target.id];
          if (!link) return;
          link.classList.toggle('is-active', entry.isIntersecting);
        });
      },
      // A band across the middle of the viewport: whichever section covers
      // it is "current", which matches what the eye considers current.
      { rootMargin: '-45% 0px -45% 0px' }
    );

    links.forEach((a) => {
      const section = document.getElementById(a.dataset.nav);
      if (section) navObserver.observe(section);
    });
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  function start() {
    initReveal();
    initProgress();
    initNav();
  }

  return { start, refresh };
})();
