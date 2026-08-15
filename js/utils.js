/**
 * utils.js — tiny shared helpers.
 * ---------------------------------------------------------------------------
 * Everything the other modules need in common, exposed on a single global
 * (`window.BD`) so the site stays buildless: no bundler, no import maps, no
 * module/CORS problems when the page is opened straight off the filesystem.
 */

window.BD = (function () {
  'use strict';

  /* ── DOM ────────────────────────────────────────────────────────────── */

  /** querySelector, scoped. */
  const $ = (selector, scope) => (scope || document).querySelector(selector);

  /** querySelectorAll as a real Array. */
  const $$ = (selector, scope) =>
    Array.prototype.slice.call((scope || document).querySelectorAll(selector));

  /**
   * Create an element in one call.
   * @param {string} tag
   * @param {Object} [props] className / textContent / attrs / style / dataset
   * @param {Array<Node>} [children]
   */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    const p = props || {};

    if (p.className) node.className = p.className;
    if (p.text != null) node.textContent = p.text;
    if (p.html != null) node.innerHTML = p.html;

    if (p.attrs) {
      Object.keys(p.attrs).forEach((k) => {
        const v = p.attrs[k];
        if (v === false || v == null) return;
        node.setAttribute(k, v === true ? '' : v);
      });
    }
    if (p.style) {
      Object.keys(p.style).forEach((k) => {
        // setProperty (not style[k]) so CSS custom properties work too.
        node.style.setProperty(k, p.style[k]);
      });
    }
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }

  /* ── Numbers & randomness ───────────────────────────────────────────── */

  /** Random float in [min, max). */
  const rand = (min, max) => min + Math.random() * (max - min);

  /** Random integer in [min, max]. */
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  /** Random element of an array. */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /** Clamp n into [min, max]. */
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  /** Left-pad a number to `width` characters with zeros. */
  const pad = (n, width) => String(n).padStart(width || 2, '0');

  /* ── Motion & visibility preferences ────────────────────────────────── */

  /**
   * Live check (not a cached boolean) so the site responds if the visitor
   * flips the OS setting while the page is open.
   */
  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** True when the tab is visible — used to pause spawners in the background. */
  const isVisible = () => document.visibilityState === 'visible';

  /** Coarse pointer / small screen: worth spending fewer particles. */
  const isSmallScreen = () => window.innerWidth < 768;

  /* ── Timing ─────────────────────────────────────────────────────────── */

  /** Trailing-edge debounce. */
  function debounce(fn, wait) {
    let t;
    return function debounced() {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  /**
   * Add a class, remove it once its animation ends.
   * Falls back to a timer if no animation is actually attached, so the class
   * can never get stuck on the element.
   */
  function pulseClass(node, className, fallbackMs) {
    if (!node) return;
    node.classList.remove(className);
    // Force reflow so re-adding the class restarts the animation.
    void node.offsetWidth;
    node.classList.add(className);

    let done = false;
    const clear = () => {
      if (done) return;
      done = true;
      node.classList.remove(className);
      node.removeEventListener('animationend', clear);
    };
    node.addEventListener('animationend', clear);
    setTimeout(clear, fallbackMs || 1200);
  }

  /* ── Focus management for overlays ──────────────────────────────────── */

  const FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  /**
   * Trap Tab focus inside `container` until the returned function is called.
   * Restores focus to whatever was focused beforehand.
   */
  function trapFocus(container) {
    const previouslyFocused = document.activeElement;

    function onKeydown(e) {
      if (e.key !== 'Tab') return;
      const items = $$(FOCUSABLE, container).filter((n) => n.offsetParent !== null);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKeydown);

    const firstFocusable = $$(FOCUSABLE, container)[0];
    if (firstFocusable) firstFocusable.focus();

    return function release() {
      container.removeEventListener('keydown', onKeydown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }

  return {
    $, $$, el,
    rand, randInt, pick, clamp, pad,
    prefersReducedMotion, isVisible, isSmallScreen,
    debounce, pulseClass, trapFocus,
  };
})();
