/**
 * music.js — optional background music, with a self-hiding control.
 * ---------------------------------------------------------------------------
 * Deliberately opt-in and fail-quiet:
 *   • the toggle stays hidden until the audio file is confirmed playable, so
 *     a repo without assets/our-song.mp3 shows no broken control at all
 *   • playback is never started automatically (browsers block it, and a
 *     surprise soundtrack is rude) — the visitor presses the button
 *   • volume fades in and out rather than cutting
 *
 * Public API: window.Music.start()
 */

window.Music = (function () {
  'use strict';

  const { $, clamp } = window.BD;

  let audio = null;
  let button = null;
  let cfg = null;
  let fadeTimer = null;

  /* ── Volume fades ─────────────────────────────────────────────────── */

  /**
   * Ramp volume to `to` over `ms`, then optionally run `done`.
   * Uses a simple interval rather than the Web Audio API — one file, one
   * gain change, no need for an AudioContext.
   */
  function fadeTo(to, ms, done) {
    clearInterval(fadeTimer);

    const from = audio.volume;
    const steps = Math.max(1, Math.round(ms / 40));
    let step = 0;

    fadeTimer = setInterval(() => {
      step += 1;
      audio.volume = clamp(from + (to - from) * (step / steps), 0, 1);
      if (step >= steps) {
        clearInterval(fadeTimer);
        if (done) done();
      }
    }, 40);
  }

  /* ── Toggle ───────────────────────────────────────────────────────── */

  function play() {
    audio.volume = 0;
    const attempt = audio.play();

    // play() rejects if the browser still considers this un-gestured.
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        setPressed(false);
      });
    }
    fadeTo(cfg.volume, 900);
    setPressed(true);
  }

  function pause() {
    fadeTo(0, 500, () => audio.pause());
    setPressed(false);
  }

  function setPressed(on) {
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.setAttribute('aria-label', on ? 'Pause background music' : 'Play background music');
    button.classList.toggle('is-playing', on);
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  function start() {
    cfg = window.BIRTHDAY_CONFIG.music;
    audio = $('#bg-music');
    button = $('#music-toggle');

    if (!cfg || !cfg.src || !audio || !button) return;

    // Relative path — resolves correctly under any host sub-path.
    audio.src = cfg.src;
    audio.volume = 0;

    // Only reveal the control once the browser confirms it can actually
    // play the file. A 404 or unsupported codec simply leaves it hidden.
    audio.addEventListener('canplaythrough', () => { button.hidden = false; }, { once: true });
    audio.addEventListener('error', () => { button.hidden = true; });

    // preload="none" in the markup means nothing loads until we ask.
    audio.load();

    button.addEventListener('click', () => {
      if (audio.paused) play();
      else pause();
    });

    // Duck the music out if the visitor leaves the tab, resume on return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !audio.paused) {
        fadeTo(0, 300, () => audio.pause());
      } else if (
        document.visibilityState === 'visible' &&
        audio.paused &&
        button.getAttribute('aria-pressed') === 'true'
      ) {
        audio.play().catch(() => {});
        fadeTo(cfg.volume, 600);
      }
    });
  }

  return { start };
})();
