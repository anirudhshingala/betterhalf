/**
 * balloons.js — the automated floating-balloon system.
 * ---------------------------------------------------------------------------
 * Balloons drift from below the fold to above it, each with its own size,
 * colour, speed, opacity, horizontal sway and tilt. Everything is driven by
 * CSS custom properties written onto the element at spawn time, so the actual
 * motion runs entirely on the compositor (see animations.css §03) and the main
 * thread only ever creates and removes nodes.
 *
 * Cost control:
 *   • hard cap on concurrent balloons (config.balloons.maxOnScreen)
 *   • spawner pauses while the tab is hidden
 *   • fewer, smaller balloons on small screens
 *   • disabled outright under prefers-reduced-motion
 *
 * Public API: window.Balloons.{ start, stop, burst, celebrate }
 */

window.Balloons = (function () {
  'use strict';

  const { el, rand, randInt, pick, clamp, prefersReducedMotion, isVisible, isSmallScreen } =
    window.BD;

  let layer = null;
  let cfg = null;
  let spawnTimer = null;
  let live = 0;          // balloons currently in the DOM
  let running = false;

  /* ── Spawning ─────────────────────────────────────────────────────── */

  /**
   * Build and release one balloon.
   * Every randomised value is written as a custom property; the keyframes in
   * animations.css read them, so no inline animation strings are needed.
   */
  function spawn() {
    if (!layer || live >= maxOnScreen()) return;

    const small = isSmallScreen();

    // Size — phones get a slightly tighter range so balloons don't dominate.
    const size = rand(cfg.minSize, small ? cfg.maxSize * 0.72 : cfg.maxSize);

    // Larger balloons read as "closer", so they rise faster and sit brighter.
    const nearness = clamp((size - cfg.minSize) / (cfg.maxSize - cfg.minSize), 0, 1);
    const rise = clamp(
      rand(cfg.minRiseSec, cfg.maxRiseSec) - nearness * 4,
      8,
      cfg.maxRiseSec
    );

    // Keep the whole balloon inside the viewport: --x is a percentage and
    // main.css offsets by half the width via margin-left.
    const xPercent = rand(4, 96);

    const balloon = el('div', {
      className: 'balloon',
      style: {
        '--x': xPercent + '%',
        '--size': size.toFixed(1) + 'px',
        '--hue': String(pick(cfg.hues)),
        '--rise': rise.toFixed(2) + 's',
        '--sway': rand(4.5, 9).toFixed(2) + 's',
        '--bob': rand(3.2, 6).toFixed(2) + 's',
        '--drift': rand(14, 46).toFixed(0) + 'px',
        '--tilt': rand(3, 9).toFixed(1) + 'deg',
        // Distant balloons are fainter — cheap depth cue.
        '--peak': (0.34 + nearness * 0.5).toFixed(2),
        // Small stagger so a burst never looks like a rigid row.
        '--delay': rand(0, 1.2).toFixed(2) + 's',
        'z-index': String(Math.round(nearness * 10)),
      },
    }, [
      el('span', { className: 'balloon__sway' }, [
        el('span', { className: 'balloon__body' }),
      ]),
    ]);

    // The rise animation is `forwards` and non-repeating, so animationend
    // fires exactly once — that is our cue to reclaim the node.
    balloon.addEventListener('animationend', function onEnd(e) {
      // sway/bob are infinite alternates; only the rise finishes.
      if (e.animationName !== 'balloon-rise') return;
      balloon.removeEventListener('animationend', onEnd);
      remove(balloon);
    });

    // Safety net: if the animation never fires (tab backgrounded at the wrong
    // moment, animation blocked, etc.) reclaim the node anyway.
    balloon.dataset.reaper = String(
      setTimeout(() => remove(balloon), (rise + 3) * 1000)
    );

    layer.appendChild(balloon);
    live += 1;
  }

  function remove(balloon) {
    if (!balloon.isConnected) return;
    clearTimeout(Number(balloon.dataset.reaper));
    balloon.remove();
    live = Math.max(0, live - 1);
  }

  /** Small screens carry fewer balloons to protect the frame budget. */
  function maxOnScreen() {
    return isSmallScreen() ? Math.ceil(cfg.maxOnScreen * 0.6) : cfg.maxOnScreen;
  }

  /* ── Scheduler ────────────────────────────────────────────────────── */

  function tick() {
    if (!running) return;

    // Hidden tab: stop scheduling entirely and let visibilitychange restart
    // us. Clearing the handle is what makes the restart check work.
    if (!isVisible()) {
      spawnTimer = null;
      return;
    }

    spawn();
    // Jitter the interval so the stream never falls into a visible rhythm.
    spawnTimer = setTimeout(tick, cfg.spawnEveryMs * rand(0.7, 1.4));
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  /** Release `n` balloons at once (used on load and on celebration). */
  function burst(n) {
    if (!running) return;
    for (let i = 0; i < n; i += 1) {
      setTimeout(spawn, i * randInt(90, 260));
    }
  }

  /** Extra balloons + a brief excited wobble, called on a winning RSVP. */
  function celebrate() {
    if (!layer || !running) return;
    burst(10);
    layer.classList.add('is-celebrating');
    setTimeout(() => layer.classList.remove('is-celebrating'), 2600);
  }

  function start() {
    layer = document.getElementById('balloon-layer');
    cfg = window.BIRTHDAY_CONFIG.balloons;

    if (!layer || prefersReducedMotion()) return;

    running = true;
    burst(isSmallScreen() ? Math.ceil(cfg.initialBurst * 0.6) : cfg.initialBurst);
    tick();

    // Don't queue up balloons nobody is watching.
    document.addEventListener('visibilitychange', () => {
      if (isVisible() && running && !spawnTimer) tick();
    });
  }

  function stop() {
    running = false;
    clearTimeout(spawnTimer);
    spawnTimer = null;
    if (layer) layer.innerHTML = '';
    live = 0;
  }

  return { start, stop, burst, celebrate };
})();
