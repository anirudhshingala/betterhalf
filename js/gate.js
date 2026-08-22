/**
 * gate.js — the pre-birthday lock screen.
 * ---------------------------------------------------------------------------
 * Until 24 August arrives, the entire site is replaced by a single line and a
 * clock. The moment the clock reaches zero the page unlocks itself *live* —
 * no refresh, no reload — dissolving the gate to reveal the hero behind it.
 *
 * Deciding whether to lock (see BIRTHDAY_CONFIG.gate):
 *   • gate.enabled === false        → never lock
 *   • gate.bypass === true          → never lock (the local-testing switch)
 *   • localhost / 127.0.0.1 / file: → never lock, if bypassOnLocalhost
 *   • ?preview=1 in the URL         → never lock, on any host
 *   • otherwise                     → lock until Countdown.remaining() is 0
 *
 * The date maths is NOT duplicated here: this module renders its own clock but
 * asks js/countdown.js for the number, so there is one source of truth for
 * "is it time yet?".
 *
 * ⚠️  A client-side surprise, not a security boundary. Anyone with devtools
 * can unlock it early. Appropriate for a birthday gift; not for secrets.
 *
 * Public API: window.Gate.{ start, isLocked, unlock, isLocalHost }
 */

window.Gate = (function () {
  'use strict';

  const { $, pad, pulseClass, prefersReducedMotion } = window.BD;

  let cfg = null;
  let root = null;
  let nodes = null;
  let timerId = null;
  let locked = false;
  let unlocked = false;
  let onUnlock = null;
  let previous = { days: null, hours: null, minutes: null, seconds: null };
  let lastAnnouncedMinute = null;

  /* ══════════════════════════════════════════════════════════════════════
     SHOULD WE LOCK?
     ══════════════════════════════════════════════════════════════════════ */

  /** Anything that looks like a developer machine rather than the real site. */
  function isLocalHost() {
    const h = location.hostname;
    return (
      location.protocol === 'file:' ||
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '::1' ||
      h === '0.0.0.0' ||
      h === '' ||
      h.endsWith('.local') ||
      /^192\.168\./.test(h) ||
      /^10\./.test(h)
    );
  }

  /** Is `name` present in the query string? Never throws. */
  function hasParam(name) {
    if (!name) return false;
    try {
      return new URLSearchParams(location.search).has(name);
    } catch (err) {
      // URLSearchParams is everywhere now, but a gate that throws would lock
      // the site permanently — so fail open, never closed.
      return false;
    }
  }

  /**
   * The reason we are (or aren't) locking — logged so it is never a mystery
   * which branch you landed on. Order matters: the force switch wins over
   * every bypass, so you can always preview the real lock screen.
   */
  function decide() {
    if (!cfg) return { lock: false, why: 'no gate config' };
    if (hasParam(cfg.forceParam)) return { lock: true, why: '?' + cfg.forceParam + ' forced' };
    if (cfg.enabled === false) return { lock: false, why: 'gate disabled in config' };
    if (cfg.bypass) return { lock: false, why: 'gate.bypass = true' };
    if (cfg.bypassOnLocalhost && isLocalHost()) return { lock: false, why: 'local host detected' };
    if (hasParam(cfg.previewParam)) return { lock: false, why: '?' + cfg.previewParam + ' preview' };
    if (window.Countdown.remaining() <= 0) return { lock: false, why: 'the day is here' };
    return { lock: true, why: 'waiting for ' + window.BIRTHDAY_CONFIG.event.dateLabel };
  }

  /* ══════════════════════════════════════════════════════════════════════
     RENDERING THE CLOCK
     ══════════════════════════════════════════════════════════════════════ */

  function paint(key, value, node) {
    if (previous[key] === value) return;
    previous[key] = value;
    node.textContent = value;
    pulseClass(node, 'is-tick', 700);
  }

  function render(ms) {
    const t = window.Countdown.breakdown(ms);

    paint('days',    String(t.days),    nodes.days);
    paint('hours',   pad(t.hours, 2),   nodes.hours);
    paint('minutes', pad(t.minutes, 2), nodes.minutes);
    paint('seconds', pad(t.seconds, 2), nodes.seconds);

    // Once a minute rather than once a second — a live region that fires
    // every tick is unusable with a screen reader.
    if (nodes.live && lastAnnouncedMinute !== t.minutes) {
      lastAnnouncedMinute = t.minutes;
      const parts = [];
      if (t.days) parts.push(t.days + (t.days === 1 ? ' day' : ' days'));
      if (t.hours) parts.push(t.hours + (t.hours === 1 ? ' hour' : ' hours'));
      parts.push(t.minutes + (t.minutes === 1 ? ' minute' : ' minutes'));
      nodes.live.textContent = 'A surprise unlocks in ' + parts.join(', ') + '.';
    }
  }

  /**
   * Self-correcting tick, aligned to the real second boundary so the clock
   * never drifts and never skips a number after the tab has been throttled.
   */
  function tick() {
    const ms = window.Countdown.remaining();

    if (ms <= 0) {
      unlock();
      return;
    }

    render(ms);
    timerId = setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
  }

  /* ══════════════════════════════════════════════════════════════════════
     LOCK / UNLOCK
     ══════════════════════════════════════════════════════════════════════ */

  function lock() {
    locked = true;
    document.body.classList.add('is-locked');
    root.hidden = false;

    // Fill in the copy from config so there is one place to edit it.
    if (nodes.title) nodes.title.textContent = cfg.title;
    if (nodes.subtitle) nodes.subtitle.textContent = cfg.subtitle;

    tick();

    // A throttled background tab can leave the clock stale — and, worse,
    // could sail straight past midnight without unlocking. Resync on return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && locked && !unlocked) {
        clearTimeout(timerId);
        tick();
      }
    });
  }

  /**
   * Dissolve the gate and hand the page over.
   * @param {Object}  [opts]
   * @param {boolean} [opts.instant] skip the animation (used by bypasses)
   */
  function unlock(opts) {
    if (unlocked) return;
    unlocked = true;
    locked = false;
    clearTimeout(timerId);

    const instant = (opts || {}).instant || prefersReducedMotion();

    // Releasing the body reveals #main behind the gate, so the hero is
    // already there as the gate fades off the top of it.
    document.body.classList.remove('is-locked');

    if (!root || root.hidden) return;

    if (instant) {
      root.remove();
    } else {
      // The padlock pops open a beat before the whole panel dissolves.
      if (nodes.lock) {
        nodes.lock.textContent = '🔓';
        pulseClass(nodes.lock, 'is-opening', 900);
      }
      root.classList.add('is-unlocking');
      setTimeout(() => root.remove(), 1500);
    }

    if (typeof onUnlock === 'function') onUnlock();
  }

  /* ══════════════════════════════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * @param  {Object}   [options]
   * @param  {Function} [options.onUnlock] fired once, when the gate opens
   * @return {boolean}  true if the site is currently locked
   */
  function start(options) {
    cfg = window.BIRTHDAY_CONFIG.gate;
    onUnlock = (options || {}).onUnlock || null;
    root = $('#gate');

    if (!root || !cfg) return false;

    nodes = {
      title:    $('#gate-title-main'),
      subtitle: $('#gate-subtitle'),
      lock:     $('#gate-lock'),
      days:     $('#gate-cd-days'),
      hours:    $('#gate-cd-hours'),
      minutes:  $('#gate-cd-minutes'),
      seconds:  $('#gate-cd-seconds'),
      live:     $('#gate-live'),
    };

    const verdict = decide();

    if (!verdict.lock) {
      // Never leave the markup in the document when it isn't in use.
      root.remove();
      root = null;
      // An unlocked *deployed* site is almost always a mistake left behind
      // after testing — the whole surprise is spent silently. Shout about
      // it. On localhost, or with an explicit ?preview, stay quiet.
      if (!isLocalHost() && (cfg.bypass || cfg.enabled === false)) {
        console.warn(
          '%c[gate] THE LIVE SITE IS UNLOCKED — everyone sees the full site.\n' +
          'Set gate.bypass back to false in js/config.js to restore the countdown.',
          'color:#ff8fab;font-weight:bold'
        );
      } else if (cfg.enabled !== false) {
        console.info('[gate] open — ' + verdict.why);
      }
      return false;
    }

    console.info('[gate] locked — ' + verdict.why +
      '. Add ?' + cfg.previewParam + '=1 to preview.');
    lock();
    return true;
  }

  const isLocked = () => locked;

  // Exported so js/door.js can ask the same question rather than keeping a
  // second, drifting copy of what counts as a developer machine.
  return { start, isLocked, unlock, isLocalHost };
})();
