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

  const { $, $$, el, rand, pulseClass, trapFocus, prefersReducedMotion } = window.BD;

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

  /**
   * Fired by hovering *or* clicking "No".
   * Runs exactly once: shows the modal, then rewrites the button to "Yes!".
   */
  function defeatNo() {
    if (noDefeated) return;
    noDefeated = true;

    openModal();

    // Rewrite the label slightly after the modal lands, so the transformation
    // is visible behind the scrim rather than happening off-screen.
    setTimeout(() => {
      noLabel.textContent = 'Yes!';
      noButton.classList.add('is-converted');
      noButton.setAttribute('aria-label', 'Yes!');
      pulseClass(noButton, 'is-converting', 900);
    }, 650);
  }

  /* ══════════════════════════════════════════════════════════════════════
     ANSWERING
     ══════════════════════════════════════════════════════════════════════ */

  /** @param {'yes'|'definitely'|'no'} kind which button won */
  function answer(kind, button) {
    if (button) pulseClass(button, 'is-won', 900);

    celebrate();

    // Swap the choices for the confirmation card the first time only; repeat
    // presses just re-fire the confetti.
    if (hasAnswered) return;
    hasAnswered = true;

    successLine.textContent =
      cfg.copy.rsvpSuccess[kind] || cfg.copy.rsvpSuccess.yes;

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

    /* ── The two honest "yes" buttons ─────────────────────────────── */
    $$('[data-rsvp="yes"], [data-rsvp="definitely"]', choices).forEach((btn) => {
      btn.addEventListener('click', () => answer(btn.dataset.rsvp, btn));
    });

    /* ── The "No" button ──────────────────────────────────────────── */
    if (noButton) {
      // Hover (desktop) and focus (keyboard) both spring the trap.
      noButton.addEventListener('mouseenter', defeatNo);
      noButton.addEventListener('focus', defeatNo);

      noButton.addEventListener('click', () => {
        if (!noDefeated) {
          // Touch devices never fire mouseenter — the tap does both jobs.
          defeatNo();
          return;
        }
        // Already converted: this is now a perfectly ordinary "Yes!".
        answer('no', noButton);
      });
    }

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
