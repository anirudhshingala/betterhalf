/**
 * particles.js — the ambient hearts-and-stars field behind everything.
 * ---------------------------------------------------------------------------
 * A single <canvas> rather than hundreds of DOM nodes: one draw call per
 * frame, no layout, and trivially cheap to pause.
 *
 * Behaviour:
 *   • particles drift slowly upward with a gentle sine-wave sway
 *   • each one twinkles on its own phase
 *   • anything that leaves the top is recycled to the bottom (fixed pool —
 *     zero allocation after init, so the GC never stutters the animation)
 *   • the loop stops completely while the tab is hidden
 *   • disabled entirely under prefers-reduced-motion
 *
 * Public API: window.Particles.{ start, stop, pulse }
 */

window.Particles = (function () {
  'use strict';

  const { rand, clamp, prefersReducedMotion, isVisible, debounce, isSmallScreen } = window.BD;

  const HEART_COLORS = ['#ff8fab', '#ffd6e0', '#e8b4a0', '#b76e79'];
  const STAR_COLORS  = ['#f3d998', '#d4af37', '#fdf6ee', '#ffffff'];

  let canvas = null;
  let ctx = null;
  let cfg = null;
  let particles = [];
  let rafId = null;
  let running = false;
  let dpr = 1;
  let width = 0;
  let height = 0;
  let lastTime = 0;
  let energy = 1;   // temporary multiplier used by pulse()

  /* ── Sizing ───────────────────────────────────────────────────────── */

  /**
   * Match the backing store to the device pixel ratio so shapes stay crisp
   * on retina displays, while keeping all drawing maths in CSS pixels.
   * DPR is capped at 2 — beyond that the extra pixels cost far more than
   * they show.
   */
  function resize() {
    if (!canvas) return;

    dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildPool();
  }

  /** Particle count scales with viewport area, then is hard-capped. */
  function targetCount() {
    const area = (width * height) / 1e6;              // megapixels
    const base = Math.round(area * cfg.density);
    const cap = isSmallScreen() ? Math.round(cfg.maxCount * 0.5) : cfg.maxCount;
    return clamp(base, 18, cap);
  }

  function buildPool() {
    const want = targetCount();

    // Grow or shrink in place; existing particles keep their positions so a
    // window resize never causes a visible "reshuffle".
    while (particles.length > want) particles.pop();
    while (particles.length < want) particles.push(makeParticle(true));
  }

  /* ── Particle model ───────────────────────────────────────────────── */

  /**
   * @param {boolean} anywhere  true on init (scatter across the canvas),
   *                            false when recycling (enter from the bottom)
   */
  function makeParticle(anywhere) {
    const isHeart = Math.random() < cfg.heartRatio;
    return {
      isHeart,
      x: rand(0, width),
      y: anywhere ? rand(0, height) : height + rand(10, 90),
      size: rand(cfg.minSize, cfg.maxSize),
      speed: rand(6, 26),                 // px per second, upward
      swayAmp: rand(6, 30),               // px
      swayFreq: rand(0.15, 0.55),         // cycles per second
      phase: rand(0, Math.PI * 2),
      spin: rand(-0.5, 0.5),              // radians per second
      angle: rand(0, Math.PI * 2),
      baseAlpha: rand(0.18, 0.7),
      twinkleFreq: rand(0.3, 1.1),
      color: isHeart
        ? HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]
        : STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    };
  }

  /** Reuse an object instead of allocating a replacement. */
  function recycle(p) {
    Object.assign(p, makeParticle(false));
  }

  /* ── Drawing ──────────────────────────────────────────────────────── */

  /** Heart via two mirrored bezier lobes, drawn around a local origin. */
  function drawHeart(c, s) {
    const w = s;
    const h = s;
    c.beginPath();
    c.moveTo(0, h * 0.32);
    c.bezierCurveTo(0, h * 0.06, -w * 0.5, h * 0.06, -w * 0.5, -h * 0.16);
    c.bezierCurveTo(-w * 0.5, -h * 0.46, -w * 0.12, -h * 0.5, 0, -h * 0.24);
    c.bezierCurveTo(w * 0.12, -h * 0.5, w * 0.5, -h * 0.46, w * 0.5, -h * 0.16);
    c.bezierCurveTo(w * 0.5, h * 0.06, 0, h * 0.06, 0, h * 0.32);
    c.closePath();
    c.fill();
  }

  /** Four-point sparkle — reads better than a five-point star at 6px. */
  function drawStar(c, s) {
    const r = s * 0.5;
    const inner = r * 0.22;
    c.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const radius = i % 2 === 0 ? r : inner;
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
  }

  /* ── Frame loop ───────────────────────────────────────────────────── */

  function frame(now) {
    if (!running) return;

    // Delta time in seconds, clamped so a backgrounded tab returning to the
    // foreground doesn't teleport every particle off-screen.
    const dt = clamp((now - lastTime) / 1000, 0, 0.05);
    lastTime = now;

    // Energy decays back to 1 after a pulse().
    if (energy > 1) energy = Math.max(1, energy - dt * 1.4);

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];

      p.y -= p.speed * energy * dt;
      p.phase += p.swayFreq * dt * Math.PI * 2;
      p.angle += p.spin * dt;

      if (p.y < -p.size * 2) {
        recycle(p);
        continue;
      }

      const x = p.x + Math.sin(p.phase) * p.swayAmp;
      // Twinkle: alpha oscillates between ~40% and 100% of the base value.
      const twinkle = 0.7 + 0.3 * Math.sin(p.phase * p.twinkleFreq * 3);

      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = clamp(p.baseAlpha * twinkle, 0, 1);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 1.1;

      if (p.isHeart) drawHeart(ctx, p.size);
      else drawStar(ctx, p.size);

      ctx.restore();
    }

    rafId = requestAnimationFrame(frame);
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  /** Brief upward surge — called alongside the confetti. */
  function pulse() {
    energy = 4.5;
  }

  function play() {
    if (running || !ctx) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function start() {
    canvas = document.getElementById('particle-canvas');
    cfg = window.BIRTHDAY_CONFIG.particles;

    if (!canvas || prefersReducedMotion()) return;

    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    resize();
    play();

    window.addEventListener('resize', debounce(resize, 180));
    document.addEventListener('visibilitychange', () => {
      if (isVisible()) play();
      else pause();
    });
  }

  function stop() {
    pause();
    particles = [];
    if (ctx) ctx.clearRect(0, 0, width, height);
  }

  return { start, stop, pulse };
})();
