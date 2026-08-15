/**
 * rsvp.js — the (entirely rigged) RSVP, its 404 gag, and the confetti.
 * ---------------------------------------------------------------------------
 * Three ways to say yes:
 *   1. "Yes, I'll Be There!"
 *   2. "Definitely, Yes! 😍"
 *   3. "No" — which, on hover *or* click, fires an Error 404 modal and is then
 *      permanently rewritten to "Yes!". Pressing it afterwards counts as a
 *      normal win.
 *
 * Any win triggers a full-screen, multi-stage confetti celebration plus a
 * balloon burst and a particle surge.
 *
 * Public API: window.RSVP.{ start, celebrate }
 */

window.RSVP = (function () {
  'use strict';

  const { $, $$, el, rand, clamp, pulseClass, trapFocus, prefersReducedMotion } = window.BD;

  let cfg = null;
  let noButton = null;
  let noLabel = null;
  let noDefeated = false;      // has the 404 already fired?
  let modal = null;
  let releaseFocus = null;
  let choices = null;
  let successPanel = null;
  let successLine = null;
  let hasAnswered = false;

  /* ══════════════════════════════════════════════════════════════════════
     CONFETTI
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * canvas-confetti loads from a CDN, so treat it as optional. Everything
   * still works without it — the page simply celebrates a little more quietly.
   */
  function hasConfetti() {
    return typeof window.confetti === 'function';
  }

  /**
   * A dedicated full-screen canvas above all content. The library's default
   * canvas is fine, but our own lets us guarantee the z-index and the
   * pointer-events:none, and dispose of it cleanly afterwards.
   */
  function makeConfettiCanvas() {
    const canvas = el('canvas', {
      attrs: { 'aria-hidden': 'true' },
      style: {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        'z-index': '190',
        'pointer-events': 'none',
      },
    });
    document.body.appendChild(canvas);
    return canvas;
  }

  /**
   * The celebration itself: an opening double cannon, a heart shower, a
   * sustained rain from the top, and a final centre burst.
   */
  function celebrate() {
    // Let the rest of the page party even if the CDN was blocked.
    if (window.Balloons) window.Balloons.celebrate();
    if (window.Particles) window.Particles.pulse();

    if (!hasConfetti() || prefersReducedMotion()) return;

    const colors = cfg.confetti.colors;
    const canvas = makeConfettiCanvas();
    const fire = window.confetti.create(canvas, {
      resize: true,
      useWorker: true,   // keeps the main thread free for the rest of the UI
    });

    // Heart-shaped confetti, when the library build supports custom shapes.
    let heart = null;
    if (typeof window.confetti.shapeFromText === 'function') {
      try {
        heart = window.confetti.shapeFromText({ text: '❤️', scalar: 2.2 });
      } catch (err) {
        heart = null;   // older builds — plain squares are fine
      }
    }

    /* 1 — two side cannons, fired immediately. */
    fire({
      particleCount: 130,
      angle: 60,
      spread: 62,
      origin: { x: 0, y: 0.68 },
      startVelocity: 62,
      colors,
    });
    fire({
      particleCount: 130,
      angle: 120,
      spread: 62,
      origin: { x: 1, y: 0.68 },
      startVelocity: 62,
      colors,
    });

    /* 2 — a big soft bloom from centre-bottom. */
    setTimeout(() => {
      fire({
        particleCount: 190,
        spread: 130,
        origin: { x: 0.5, y: 0.75 },
        startVelocity: 48,
        gravity: 0.85,
        scalar: 1.1,
        colors,
      });
    }, 180);

    /* 3 — hearts drifting down, slow and light. */
    if (heart) {
      setTimeout(() => {
        fire({
          particleCount: 44,
          spread: 100,
          origin: { x: 0.5, y: 0.35 },
          shapes: [heart],
          scalar: 2.2,
          gravity: 0.5,
          decay: 0.94,
          startVelocity: 26,
          colors,
        });
      }, 420);
    }

    /* 4 — sustained rain across the full width for the configured duration. */
    const end = Date.now() + cfg.confetti.durationMs;
    (function rain() {
      const remaining = end - Date.now();
      if (remaining <= 0) {
        // Give the last particles time to fall before removing the canvas.
        setTimeout(() => canvas.remove(), 2500);
        return;
      }
      fire({
        particleCount: 5,
        startVelocity: 0,
        ticks: 320,
        gravity: 0.55,
        spread: 90,
        scalar: rand(0.7, 1.3),
        origin: { x: Math.random(), y: -0.05 },
        colors,
      });
      requestAnimationFrame(rain);
    })();

    /* 5 — one last centre burst as the rain finishes. */
    setTimeout(() => {
      fire({
        particleCount: 150,
        spread: 360,
        startVelocity: 34,
        origin: { x: 0.5, y: 0.45 },
        scalar: 1.2,
        colors,
      });
    }, Math.max(0, cfg.confetti.durationMs - 900));
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE 404 MODAL
     ══════════════════════════════════════════════════════════════════════ */

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    releaseFocus = trapFocus(modal);
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (releaseFocus) {
      releaseFocus();
      releaseFocus = null;
    }
    // Return focus to the button that just changed under the visitor's cursor.
    if (noButton) noButton.focus();
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE "NO" BUTTON THAT CANNOT BE CAUGHT
     ══════════════════════════════════════════════════════════════════════
     Two layers of evasion, because one is not enough:

       1. pointerenter — it bolts the instant the cursor touches it.
       2. a document-level pointermove proximity check — a fast enough flick
          of the mouse can jump the cursor *over* the gap between frames and
          land inside the button without ever firing pointerenter. The radius
          check closes that hole, so the button is genuinely uncatchable
          rather than merely difficult.

     It also never lands within `safeDistance` of the cursor, so it cannot
     accidentally teleport underneath the pointer and get clicked.

     Touch devices have no hover, so pointerdown moves it before the tap can
     resolve into a click — and click is preventDefault-ed regardless.
     ══════════════════════════════════════════════════════════════════════ */

  let noCfg = null;
  let slot = null;
  let flying = false;      // has it left the document flow yet?
  let escapes = 0;
  let pos = { x: 0, y: 0 };

  /** Lift the button out of the flow, leaving its footprint behind. */
  function takeOff() {
    const r = noButton.getBoundingClientRect();

    // Freeze the gap it leaves so the row does not lurch sideways.
    if (slot) {
      slot.style.width = r.width + 'px';
      slot.style.height = r.height + 'px';
    }

    // Start life at exactly the spot it already occupies, so the first
    // move reads as the button bolting rather than teleporting.
    pos = { x: r.left, y: r.top };
    noButton.classList.add('is-flying');
    applyPosition(0);
    flying = true;
  }

  function applyPosition(tilt) {
    // Inline transform, which also beats the .btn:hover lift in the
    // stylesheet — the button must never appear to respond to hover.
    noButton.style.transform =
      'translate(' + Math.round(pos.x) + 'px,' + Math.round(pos.y) + 'px)' +
      ' rotate(' + tilt.toFixed(1) + 'deg)';
  }

  /**
   * Pick somewhere new, keeping the whole button on screen and well clear
   * of the cursor. Rejection-samples a handful of times, then falls back to
   * the furthest of the candidates rather than looping forever.
   */
  function relocate(cursorX, cursorY) {
    const w = noButton.offsetWidth;
    const h = noButton.offsetHeight;
    const margin = 14;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);

    let best = null;
    let bestDist = -1;

    for (let i = 0; i < 24; i += 1) {
      const x = rand(margin, maxX);
      const y = rand(margin, maxY);
      // Distance from the cursor to the button's centre at this candidate.
      const dx = x + w / 2 - cursorX;
      const dy = y + h / 2 - cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > bestDist) {
        bestDist = dist;
        best = { x: x, y: y };
      }
      if (dist >= noCfg.safeDistance) break;
    }

    pos = best;
    applyPosition(rand(-14, 14));
  }

  /** Timestamp of the last *counted* escape — see flee(). */
  let lastCounted = 0;

  /** One escape: move, then taunt. */
  function flee(cursorX, cursorY) {
    if (!flying) takeOff();

    // Moving is never throttled. Whatever else happens, the button gets out
    // of the way — that is the one guarantee this whole feature rests on.
    relocate(cursorX, cursorY);

    // Counting, however, is. A single approach usually trips both
    // pointerenter *and* the proximity check, which would burn through the
    // taunts two at a time and reach the punchline before she has read the
    // first one. Only one escape per 250ms counts toward the script.
    const now = Date.now();
    if (now - lastCounted < 250) return;
    lastCounted = now;
    escapes += 1;

    // Advance one line per escape, then hold on the last.
    const taunts = noCfg.taunts || [];
    if (taunts.length) {
      noLabel.textContent = taunts[Math.min(escapes, taunts.length - 1)];
    }

    // Optional payoff for the truly persistent. Off by default: the modal's
    // scrim covers the whole screen, which stops the chase dead just as it
    // gets going, and the last taunt already makes the point.
    if (noCfg.modalAfter && escapes === noCfg.modalAfter && !noDefeated) {
      noDefeated = true;
      openModal();
    }
  }

  /** Proximity guard — closes the gap pointerenter can miss. */
  function onPointerMove(e) {
    if (!flying) return;

    const r = noButton.getBoundingClientRect();
    // Distance from the cursor to the nearest point of the button's box.
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
    const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);

    if (Math.sqrt(dx * dx + dy * dy) < noCfg.panicRadius) {
      flee(e.clientX, e.clientY);
    }
  }

  /**
   * Put it back in its slot and reset the gag.
   *
   * Without this the button stays position:fixed forever: chase it, scroll
   * away, and a floating "You can't say no to me!" now hovers over the photo
   * gallery for the rest of the visit, intercepting taps meant for the page
   * underneath. Landing it when the RSVP section leaves the viewport keeps
   * the joke where it belongs — and resetting the taunts means it starts
   * from "No" again next time she scrolls back, so the chase is repeatable.
   */
  function land() {
    if (!flying) return;
    flying = false;
    escapes = 0;
    lastCounted = 0;

    noButton.classList.remove('is-flying');
    noButton.style.transform = '';
    if (slot) {
      slot.style.width = '';
      slot.style.height = '';
    }
    const taunts = noCfg.taunts || [];
    if (taunts.length) noLabel.textContent = taunts[0];
  }

  /** Keep it on screen if the window is resized mid-chase. */
  function onResize() {
    if (!flying) return;
    const w = noButton.offsetWidth;
    const h = noButton.offsetHeight;
    pos.x = clamp(pos.x, 14, Math.max(14, window.innerWidth - w - 14));
    pos.y = clamp(pos.y, 14, Math.max(14, window.innerHeight - h - 14));
    applyPosition(0);
  }

  function initNoButton() {
    noCfg = (cfg.rsvp && cfg.rsvp.noButton) || {};
    slot = $('#rsvp-no-slot');

    if (!noButton) return;

    // Whatever happens, this button never answers anything.
    noButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (noCfg.flee !== false && !prefersReducedMotion()) {
        flee(e.clientX, e.clientY);
      } else if (!noDefeated) {
        // Static fallback: no chase, just the punchline.
        noDefeated = true;
        openModal();
      }
    });

    // A button that darts around the screen is exactly the kind of motion
    // prefers-reduced-motion exists to prevent. Leave it put.
    if (noCfg.flee === false || prefersReducedMotion()) {
      noButton.classList.add('is-static');
      return;
    }

    noButton.addEventListener('pointerenter', (e) => {
      // A touch tap fires pointerenter *and* pointerdown back to back, which
      // would spend two taunts on one tap. Touch is handled by pointerdown
      // alone; this path is for real hovering.
      if (e.pointerType === 'touch') return;
      flee(e.clientX, e.clientY);
    });

    // Touch has no hover, so the tap is the trigger — but it must fire on
    // `click`, NOT on pointerdown.
    //
    // Moving the button on pointerdown looks right and is quietly broken:
    // the button is gone by the time the tap resolves, so the browser
    // delivers the click to whatever is now underneath. On a narrow screen
    // that is often the "Definitely, Yes!" button, and tapping No silently
    // answers the RSVP. Waiting for click means the button is still under
    // her finger when the tap lands, so its own handler swallows it.
    //
    // Not preventing default on pointerdown also leaves scroll gestures
    // that happen to start on the button working normally.

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    // Land it whenever the RSVP section is off screen, so a chased button
    // never ends up floating over the rest of the page.
    const section = document.getElementById('rsvp');
    if (section && 'IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => entries.forEach((en) => { if (!en.isIntersecting) land(); }),
        { threshold: 0 }
      ).observe(section);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     ANSWERING
     ══════════════════════════════════════════════════════════════════════ */

  /** @param {string} kind which button won — only 'definitely' exists today */
  function answer(kind, button) {
    if (button) pulseClass(button, 'is-won', 900);

    celebrate();

    // Swap the choices for the confirmation card the first time only; repeat
    // presses just re-fire the confetti.
    if (hasAnswered) return;
    hasAnswered = true;

    successLine.textContent =
      cfg.copy.rsvpSuccess[kind] || cfg.copy.rsvpSuccess.default;

    setTimeout(() => {
      choices.hidden = true;
      successPanel.hidden = false;
      successPanel.setAttribute('tabindex', '-1');
      successPanel.focus({ preventScroll: true });
    }, 620);
  }

  /* ══════════════════════════════════════════════════════════════════════
     WIRING
     ══════════════════════════════════════════════════════════════════════ */

  function start() {
    cfg = window.BIRTHDAY_CONFIG;

    choices       = $('#rsvp-choices');
    successPanel  = $('#rsvp-success');
    successLine   = $('#rsvp-success-line');
    noButton      = $('#rsvp-no');
    noLabel       = $('#rsvp-no-label');
    modal         = $('#error-modal');

    if (!choices) return;

    // Copy the 404 message in from config so there is one source of truth.
    const modalBody = $('#error-modal-body');
    if (modalBody) {
      // The heading already reads "Error 404", so strip that prefix here.
      modalBody.textContent = cfg.copy.noButtonError.replace(/^Error 404:\s*/, '');
    }

    /* ── The one button that actually answers ─────────────────────── */
    $$('[data-rsvp]', choices).forEach((btn) => {
      btn.addEventListener('click', () => answer(btn.dataset.rsvp, btn));
    });

    /* ── The "No" that runs away ──────────────────────────────────── */
    initNoButton();

    /* ── Modal dismissal ──────────────────────────────────────────── */
    if (modal) {
      $$('[data-modal-close]', modal).forEach((n) =>
        n.addEventListener('click', closeModal)
      );
      const ok = $('#error-modal-ok');
      if (ok) ok.addEventListener('click', closeModal);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
      });
    }

    /* ── "Do the confetti again" ──────────────────────────────────── */
    const again = $('#rsvp-again');
    if (again) again.addEventListener('click', () => celebrate());
  }

  return { start, celebrate };
})();
