/**
 * M³GIM DOM Utilities
 */

/** Create an element with optional attributes and children. */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.assign(element.dataset, value);
    } else if (key.startsWith('on')) {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  nameOverTip(element, attrs);
  return element;
}

/**
 * Keep a tooltip out of the accessible name. Chromium folds the generated
 * content of `[data-tip]::after` into the name of an element that has none of
 * its own, so a section heading read as its label plus the whole explanation.
 * Where the element carries visible text, that text is the name; the tip stays
 * the description a screen reader may request. An icon-only element has no
 * visible text and keeps the tip as its name, which is the only name it has
 * (Projektleitung, 2026-09-04).
 */
function nameOverTip(element, attrs) {
  const tip = attrs && attrs.dataset ? attrs.dataset.tip : '';
  if (!tip) return;
  if (attrs['aria-label'] || attrs['aria-labelledby']) return;
  const text = element.textContent.trim();
  if (text) element.setAttribute('aria-label', text);
}

/** Clear all children of an element. */
export function clear(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/** Escape a value for interpolation into an HTML string (tooltip markup). */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * Whether the reader asked the system for reduced motion. Every scroll and
 * transition the JS drives asks before it animates; the CSS side has its own
 * media query (Projektleitung, 2026-09-04).
 */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scroll behaviour for a JS-driven scroll: smooth unless motion is reduced. */
export function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
