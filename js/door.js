/**
 * door.js — the knock at the door.
 * ---------------------------------------------------------------------------
 * One section, visible for a few hours only: from midnight IST when the site
 * unlocks, until the window closes (three hours later by default). Before and
 * after that it does not exist on the page.
 *
 * WHY IT IS TIME-BOXED
 *   "There is someone waiting at your door" is true at midnight and false by
 *   morning. A message like that left up is worse than no message — so it
 *   removes itself rather than ageing badly.
 *
 * PINNED TO IST, NOT THE DEVICE CLOCK
 *   The window is computed from Countdown.nextBirthday(), the same maths the
 *   countdown and the gate already use, so it opens at midnight *in India*
 *   rather than midnight wherever the phone thinks it is. A device with a
 *   wrong clock cannot open it early or miss it.
 *
 * IT WATCHES THE CLOCK RATHER THAN TRUSTING ONE READING
 *   If the page is already open when midnight strikes, the section appears on
 *   its own; if it is still open at the end of the window, it leaves on its
 *   own. Timers alone are not enough — a sleeping laptop does not fire them —
 *   so the window is re-checked whenever the tab becomes visible again.
 *
 * LOCALLY IT JUST SHOWS
 *   On localhost the window is almost always closed, which would make the
 *   block impossible to look at without remembering a query string. So
 *   door.bypassOnLocalhost (default on) shows it on a developer machine
 *   regardless of the clock — plain http://localhost:8080/ is enough. It is a
 *   hostname test, so the real site always gets the true midnight window.
 *
 *   ?door=1 forces it open anywhere; ?door=0 forces it shut, which is how to
 *   see the ordinary hidden state locally.
 *
 * Public API: window.Door.start()
 */

window.Door = (function () {
  'use strict';

  const { $, el } = window.BD;

  /* setTimeout overflows past this and fires immediately, which would flash
     the section a year early. Anything further out simply is not scheduled —
     no browser tab stays open for 24 days. */
  const MAX_TIMEOUT = 2147483647;

  let section = null;
  let open = false;
  let timer = null;

  const cfg = () => (window.BIRTHDAY_CONFIG || {}).door;

  /* ── The window ───────────────────────────────────────────────────── */

  /**
   * [start, end] of the visible window, as epoch ms.
   *
   * Countdown.nextBirthday() returns the instant the birthday begins in IST,
   * and keeps returning it for the whole of that day (it only rolls forward
   * once the day is over) — which is exactly the anchor needed here, both
   * before midnight and during the window itself.
   */
  function windowBounds() {
    if (!window.Countdown || !window.Countdown.nextBirthday) return null;

    const startsAt = window.Countdown.nextBirthday(new Date()).getTime();
    const hours = Number(cfg().windowHours);
    const span = (isFinite(hours) && hours > 0 ? hours : 3) * 3600000;

    return [startsAt, startsAt + span];
  }

  /**
   * An explicit override on the URL, or null for "use the clock".
   *   ?door=1  → force it open
   *   ?door=0  → force it shut, to check the ordinary state on localhost
   */
  function urlOverride() {
    const param = cfg().forceParam;
    if (!param) return null;

    const params = new URLSearchParams(window.location.search);
    if (!params.has(param)) return null;

    const value = (params.get(param) || '').toLowerCase();
    return (value === '0' || value === 'false' || value === 'no') ? false : true;
  }

  /**
   * True when the door should ignore the clock and simply show.
   *
   * On a developer machine the three-hour window is nearly always closed, so
   * without this the section could only ever be seen by adding ?door=1 to the
   * URL. The gate solves the same problem the same way (gate.bypassOnLocalhost)
   * and this keys off Gate's own host check, so there is one definition of
   * "developer machine" rather than two that can drift apart.
   *
   * It can never affect the real site: it is a hostname test, so
   * betterhalf.anirudhshingala.com always gets the true midnight window.
   */
  function localBypass() {
    if (cfg().bypassOnLocalhost === false) return false;
    if (!window.Gate || !window.Gate.isLocalHost) return false;
    return window.Gate.isLocalHost();
  }

  /* ── Showing and hiding ───────────────────────────────────────────── */

  function build() {
    const c = cfg();
    const inner = $('.door__inner', section);
    if (!inner || inner.childNodes.length) return;   // already built

    inner.appendChild(el('div', {
      className: 'door__knocker',
      attrs: { 'aria-hidden': 'true' },
      text: c.emoji || '🚪',
    }));

    if (c.kicker) {
      inner.appendChild(el('p', { className: 'door__kicker', text: c.kicker }));
    }

    inner.appendChild(el('h2', {
      className: 'door__title',
      attrs: { id: 'door-title' },
      text: c.title || 'There is someone waiting for you at your door now',
    }));

    if (c.line) {
      inner.appendChild(el('p', { className: 'door__line', text: c.line }));
    }
  }

  function show() {
    if (open || !section) return;
    open = true;

    build();
    section.hidden = false;

    // It was `hidden` when reveal.js swept the page, so it had no layout box
    // and its reveal targets never intersected. Register them now.
    if (window.Reveal && window.Reveal.refresh) window.Reveal.refresh();
  }

  function hide() {
    if (!section) return;
    open = false;
    section.remove();
    section = null;
  }

  /* ── The clock ────────────────────────────────────────────────────── */

  /**
   * Decide the current state and schedule the next change.
   * Safe to call as often as we like — it is idempotent.
   */
  function evaluate() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!section) return;                 // already gone for good

    // An explicit ?door=0/1 wins over everything, including localhost.
    const override = urlOverride();
    if (override === true)  { show(); return; }
    if (override === false) { hide(); return; }

    // On a developer machine, just show it — see localBypass().
    if (localBypass()) { show(); return; }

    const bounds = windowBounds();
    if (!bounds) return;

    const [startsAt, endsAt] = bounds;
    const now = Date.now();

    if (now >= endsAt) {
      // The window has closed. Nothing will reopen it today.
      hide();
      return;
    }

    if (now >= startsAt) {
      show();
      later(endsAt - now);      // leave when the window closes
      return;
    }

    // Still before midnight. The gate is covering the page anyway.
    later(startsAt - now);      // arrive when the window opens
  }

  function later(ms) {
    // +250ms so the timer lands just inside the new state rather than exactly
    // on the boundary, where a rounding error could re-schedule for 0ms.
    if (ms + 250 > MAX_TIMEOUT) return;
    timer = setTimeout(evaluate, ms + 250);
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  function start() {
    const c = cfg();
    section = $('#door');
    if (!section) return;

    if (!c || c.enabled === false) {
      section.remove();
      section = null;
      return;
    }

    evaluate();

    // A laptop asleep across midnight never fires its timers, and a phone
    // with the tab backgrounded throttles them hard. Re-checking on the way
    // back in means the state is right whenever she is actually looking.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') evaluate();
    });
  }

  return { start };
})();
