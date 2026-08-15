/**
 * countdown.js — live countdown to the next 24 August.
 * ---------------------------------------------------------------------------
 * The target is computed *relative to now* rather than hard-coded, so:
 *   • the timer keeps working every year with no edits
 *   • it resolves in the visitor's own timezone (no UTC drift surprises)
 *   • the birthday itself gets its own state instead of a frozen 00:00:00
 *
 * The digits tick every second, which is hostile to screen readers, so the
 * visible numbers are aria-hidden and a calm summary is announced once a
 * minute through #countdown-live instead.
 *
 * Public API: window.Countdown.{ start, stop, isBirthdayToday }
 */

window.Countdown = (function () {
  'use strict';

  const { $, pad, pulseClass } = window.BD;

  const MS_SECOND = 1000;
  const MS_MINUTE = 60 * MS_SECOND;
  const MS_HOUR   = 60 * MS_MINUTE;
  const MS_DAY    = 24 * MS_HOUR;

  let cfg = null;
  let nodes = null;
  let timerId = null;
  /** Last rendered value per unit, so we only touch the DOM on change. */
  let previous = { days: null, hours: null, minutes: null, seconds: null };
  let lastAnnouncedMinute = null;
  let onArrive = null;
  let hasArrived = false;

  /* ── Target resolution ────────────────────────────────────────────── */

  /**
   * The next occurrence of the birthday at or after `from`.
   * If today *is* the birthday we return this year's instant (already in the
   * past by definition), which callers detect via a non-positive delta.
   */
  /* ── Timezone ─────────────────────────────────────────────────────────
     The birthday belongs to a place, not to whatever timezone the viewing
     device happens to be set to. Everything below therefore works in the
     celebration's zone (IST) and converts to real instants at the edges,
     so the clock reads identically on every device on earth.             */

  /** Config, readable before start() — gate.js needs the maths during boot. */
  const conf = () => cfg || window.BIRTHDAY_CONFIG.birthday;

  /** The zone's offset from UTC, in ms. 0 means "use the device's clock". */
  function offsetMs() {
    const n = conf().utcOffsetMinutes;
    return typeof n === 'number' ? n * 60000 : null;
  }

  /**
   * The wall-clock calendar date in the celebration's zone for an instant.
   * Shifting by the offset and then reading the UTC fields gives the local
   * fields in that zone — no timezone database required.
   */
  function zonedParts(date) {
    const off = offsetMs();
    if (off === null) {
      return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    }
    const shifted = new Date(date.getTime() + off);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  }

  /** The real instant at which the birthday begins in the given zone-year. */
  function instantFor(year) {
    const c = conf();
    const off = offsetMs();
    if (off === null) {
      return new Date(year, c.month - 1, c.day, c.hour, c.minute, 0, 0).getTime();
    }
    return Date.UTC(year, c.month - 1, c.day, c.hour, c.minute, 0, 0) - off;
  }

  /** The last millisecond of the birthday, in the given zone-year. */
  function endOfBirthday(year) {
    const c = conf();
    const off = offsetMs();
    if (off === null) {
      return new Date(year, c.month - 1, c.day, 23, 59, 59, 999).getTime();
    }
    return Date.UTC(year, c.month - 1, c.day, 23, 59, 59, 999) - off;
  }

  function nextBirthday(from) {
    const here = zonedParts(from);
    // Once the whole birthday *day* is over, roll to next year.
    const year = from.getTime() > endOfBirthday(here.year) ? here.year + 1 : here.year;
    return new Date(instantFor(year));
  }

  /* ── Test override ────────────────────────────────────────────────────
     BIRTHDAY_CONFIG.gate.testCountdownSeconds makes the timer end that many
     seconds after the page loads, so the unlock can actually be watched
     instead of waited for. The target is fixed on first read so it counts
     down rather than perpetually resetting.                               */

  let testTarget = null;

  function testOverride() {
    const gate = window.BIRTHDAY_CONFIG.gate;
    const secs = gate && gate.testCountdownSeconds;
    if (!secs || typeof secs !== 'number') return null;
    if (testTarget === null) {
      testTarget = Date.now() + secs * 1000;
      console.warn(
        '[countdown] TEST MODE — unlocking in ' + secs + 's. ' +
        'Set gate.testCountdownSeconds back to null in js/config.js before going live.'
      );
    }
    return testTarget;
  }

  /**
   * Milliseconds until the birthday begins; 0 once it is here.
   * The single source of truth for "is it time yet?" — js/gate.js renders
   * its own clock but asks this module for the number.
   */
  function remaining(now) {
    const d = now || new Date();
    const test = testOverride();
    if (test !== null) return Math.max(0, test - d.getTime());
    if (isBirthdayToday(d)) return 0;
    return Math.max(0, nextBirthday(d).getTime() - d.getTime());
  }

  /** Split a duration into the four display units. */
  function breakdown(ms) {
    return {
      days:    Math.floor(ms / MS_DAY),
      hours:   Math.floor((ms % MS_DAY) / MS_HOUR),
      minutes: Math.floor((ms % MS_HOUR) / MS_MINUTE),
      seconds: Math.floor((ms % MS_MINUTE) / MS_SECOND),
    };
  }

  /** True for the whole calendar day of 24 August **in IST**. */
  function isBirthdayToday(now) {
    const d = now || new Date();

    // Under the test override, "the day" simply means the timer has run out.
    const test = testOverride();
    if (test !== null) return d.getTime() >= test;

    const c = conf();
    const p = zonedParts(d);
    return p.month === c.month && p.day === c.day;
  }

  /* ── Rendering ────────────────────────────────────────────────────── */

  /** Write a unit only if it changed, and flash it when it does. */
  function paint(key, value, node) {
    if (previous[key] === value) return;
    previous[key] = value;
    node.textContent = value;
    pulseClass(node, 'is-tick', 700);
  }

  function render(remainingMs) {
    const days    = Math.floor(remainingMs / MS_DAY);
    const hours   = Math.floor((remainingMs % MS_DAY) / MS_HOUR);
    const minutes = Math.floor((remainingMs % MS_HOUR) / MS_MINUTE);
    const seconds = Math.floor((remainingMs % MS_MINUTE) / MS_SECOND);

    // Days is not zero-padded to two — a 300-day wait should read "300".
    paint('days',    String(days),      nodes.days);
    paint('hours',   pad(hours, 2),     nodes.hours);
    paint('minutes', pad(minutes, 2),   nodes.minutes);
    paint('seconds', pad(seconds, 2),   nodes.seconds);

    announce(days, hours, minutes);
  }

  /** Polite, once-a-minute summary for assistive technology. */
  function announce(days, hours, minutes) {
    if (!nodes.live) return;
    if (lastAnnouncedMinute === minutes) return;
    lastAnnouncedMinute = minutes;

    const parts = [];
    if (days) parts.push(days + (days === 1 ? ' day' : ' days'));
    if (hours) parts.push(hours + (hours === 1 ? ' hour' : ' hours'));
    parts.push(minutes + (minutes === 1 ? ' minute' : ' minutes'));

    nodes.live.textContent =
      parts.join(', ') + ' until ' + window.BIRTHDAY_CONFIG.name + "'s birthday.";
  }

  /* ── Arrival state ────────────────────────────────────────────────── */

  /** Swap the ticking digits for the "it's today" panel. */
  function showArrived() {
    if (hasArrived) return;
    hasArrived = true;

    if (nodes.grid) nodes.grid.hidden = true;
    if (nodes.arrived) nodes.arrived.hidden = false;
    if (nodes.caption) {
      nodes.caption.textContent = 'No more counting. Today is the day.';
    }
    if (nodes.live) {
      nodes.live.textContent =
        "It is " + window.BIRTHDAY_CONFIG.name + "'s birthday today.";
    }

    stop();
    if (typeof onArrive === 'function') onArrive();
  }

  /* ── Loop ─────────────────────────────────────────────────────────── */

  /**
   * Self-correcting scheduler: each tick is aligned to the next real-world
   * second boundary rather than "now + 1000ms", so the display never drifts
   * and never skips a number after the tab has been throttled.
   */
  function tick() {
    const now = new Date();

    if (isBirthdayToday(now)) {
      showArrived();
      return;
    }

    const remaining = nextBirthday(now).getTime() - now.getTime();

    if (remaining <= 0) {
      showArrived();
      return;
    }

    render(remaining);

    const msToNextSecond = 1000 - (Date.now() % 1000);
    timerId = setTimeout(tick, msToNextSecond + 8);
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  /**
   * @param {Object}   [options]
   * @param {Function} [options.onArrive] fired once if/when the day arrives
   */
  function start(options) {
    cfg = window.BIRTHDAY_CONFIG.birthday;
    onArrive = (options || {}).onArrive || null;

    nodes = {
      days:    $('#cd-days'),
      hours:   $('#cd-hours'),
      minutes: $('#cd-minutes'),
      seconds: $('#cd-seconds'),
      grid:    $('.countdown'),
      arrived: $('#countdown-arrived'),
      caption: $('#countdown-caption'),
      live:    $('#countdown-live'),
    };

    if (!nodes.days) return;

    tick();

    // A throttled background tab can leave the display stale; resync the
    // moment it comes back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !hasArrived) {
        clearTimeout(timerId);
        tick();
      }
    });
  }

  function stop() {
    clearTimeout(timerId);
    timerId = null;
  }

  return { start, stop, isBirthdayToday, remaining, nextBirthday, breakdown };
})();
