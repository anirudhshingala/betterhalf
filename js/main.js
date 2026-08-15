/**
 * main.js — bootstrap and orchestration.
 * ---------------------------------------------------------------------------
 * Loads last (see the `defer` chain in index.html) and is the only file that
 * knows about all the others. Responsibilities:
 *   • seal the page behind the hero, then unseal it on "Click to Open Our Story"
 *   • start every subsystem in a safe order
 *   • wire the smooth-scroll navigation
 *   • fire an automatic celebration if today actually is the birthday
 *
 * GSAP is used where it earns its keep (the unseal choreography) and is always
 * optional: every animation here has a plain-CSS fallback, so a blocked CDN
 * degrades the polish, never the function.
 */

(function () {
  'use strict';

  const { $, $$, prefersReducedMotion } = window.BD;

  /** GSAP is loaded from a CDN — never assume it arrived. */
  const gsapReady = () => typeof window.gsap !== 'undefined';

  let storyOpen = false;

  /* ══════════════════════════════════════════════════════════════════════
     SEAL / UNSEAL
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Hide everything below the hero. Applied from JS (never in the markup) so
   * that a browser without JavaScript renders the complete page instead of
   * just a cover it can never open.
   */
  function seal() {
    document.body.classList.add('is-sealed');
  }

  /** The section the hero's CTA hands you off to. */
  const FIRST_SECTION = 'our-story';

  /** Reveal the story: unfurl, choreograph the hero handoff, then scroll. */
  function openStory() {
    if (storyOpen) {
      scrollToSection(FIRST_SECTION);
      return;
    }
    storyOpen = true;

    const body = document.body;
    const hero = $('#hero');
    const story = $('#story');
    const nav = $('#section-nav');
    const cta = $('#open-story');

    body.classList.remove('is-sealed');
    story.classList.add('is-opening');
    hero.classList.add('is-lifted');

    // A handful of balloons released the moment the story opens.
    if (window.Balloons) window.Balloons.burst(6);

    // The CTA has done its job; repurpose it as a scroll affordance.
    if (cta) {
      cta.classList.remove('btn--pulse');
      $('.btn__label', cta).textContent = 'Take Me Down ↓';
      cta.setAttribute('aria-label', 'Scroll to our story');
    }

    // Newly displayed sections need registering with the reveal observer.
    if (window.Reveal) window.Reveal.refresh();

    if (nav) nav.classList.add('is-visible');

    // GSAP handles the extra flourish on the first sections; without it the
    // CSS `story-open` keyframes alone already look right.
    if (gsapReady() && !prefersReducedMotion()) {
      window.gsap.from('#countdown .countdown__unit', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.09,
        delay: 0.45,
        ease: 'power3.out',
        clearProps: 'all',   // hand the elements back to CSS when done
      });
    }

    // Let the unfurl breathe before travelling.
    setTimeout(() => scrollToSection(FIRST_SECTION), 520);
  }

  /* ══════════════════════════════════════════════════════════════════════
     NAVIGATION
     ══════════════════════════════════════════════════════════════════════ */

  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  /** Intercept in-page anchors so a sealed page opens itself first. */
  function wireAnchors() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;

        e.preventDefault();
        if (!storyOpen && id !== 'hero') {
          openStory();
          return;
        }
        scrollToSection(id);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════════════════════════ */

  function boot() {
    // Ambient layers first — they should already be alive behind the hero.
    window.Balloons.start();
    window.Particles.start();

    // Content modules.
    window.Gallery.start();
    window.RSVP.start();
    window.Music.start();
    window.Reveal.start();

    window.Countdown.start({
      // If the page is open when midnight rolls into 24 August, celebrate.
      onArrive: function () {
        if (storyOpen) window.RSVP.celebrate();
      },
    });

    // Seal the page and wire the key that opens it.
    seal();
    const cta = $('#open-story');
    if (cta) cta.addEventListener('click', openStory);

    wireAnchors();

    // If it *is* the big day, greet with confetti a beat after the hero
    // entrance finishes rather than the instant the page paints.
    if (window.Countdown.isBirthdayToday() && !prefersReducedMotion()) {
      setTimeout(() => window.RSVP.celebrate(), 1800);
    }
  }

  // `defer` guarantees the DOM is parsed, but keep the guard for the case
  // where someone drops these scripts into <head> without defer.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
