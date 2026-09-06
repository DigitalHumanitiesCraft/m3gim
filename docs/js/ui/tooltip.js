const GAP = 6;
const VIEWPORT_MARGIN = 8;
const TOOLTIP_ID = 'app-tooltip';

/** Position one fixed tooltip inside the viewport, preferring its requested side. */
export function tooltipPosition(anchor, tip, viewport, placement = '') {
  const below = placement === 'bottom' || placement.startsWith('bottom-');
  let top = below ? anchor.bottom + GAP : anchor.top - tip.height - GAP;
  if (!below && top < VIEWPORT_MARGIN) top = anchor.bottom + GAP;
  if (below && top + tip.height > viewport.height - VIEWPORT_MARGIN) {
    top = anchor.top - tip.height - GAP;
  }

  let left = anchor.left + (anchor.width - tip.width) / 2;
  if (placement === 'bottom-left') left = anchor.left;
  if (placement === 'bottom-right') left = anchor.right - tip.width;
  left = Math.max(VIEWPORT_MARGIN,
    Math.min(left, viewport.width - tip.width - VIEWPORT_MARGIN));
  top = Math.max(VIEWPORT_MARGIN,
    Math.min(top, viewport.height - tip.height - VIEWPORT_MARGIN));
  return { left, top };
}

/** Promote data-tip content into one body-level overlay immune to CSS columns. */
export function initTooltips(root = document) {
  const doc = root.ownerDocument || root;
  const tip = doc.createElement('div');
  tip.className = 'tooltip-portal';
  tip.id = TOOLTIP_ID;
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  doc.body.appendChild(tip);
  doc.documentElement.classList.add('has-tooltip-portal');

  let anchor = null;
  const targetFor = target => target instanceof Element ? target.closest('[data-tip]') : null;

  function unlink() {
    if (!anchor) return;
    const ids = (anchor.getAttribute('aria-describedby') || '')
      .split(/\s+/).filter(id => id && id !== TOOLTIP_ID);
    if (ids.length) anchor.setAttribute('aria-describedby', ids.join(' '));
    else anchor.removeAttribute('aria-describedby');
  }

  function show(target) {
    const next = targetFor(target);
    if (!next || !next.dataset.tip) { hide(); return; }
    if (anchor !== next) unlink();
    anchor = next;
    const describedBy = new Set((next.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    describedBy.add(TOOLTIP_ID);
    next.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
    tip.textContent = next.dataset.tip;
    tip.hidden = false;
    const position = tooltipPosition(next.getBoundingClientRect(), tip.getBoundingClientRect(), {
      width: window.innerWidth,
      height: window.innerHeight,
    }, next.dataset.tipPos || '');
    tip.style.left = `${position.left}px`;
    tip.style.top = `${position.top}px`;
  }

  function hide(target) {
    if (!anchor || (target && anchor.contains(target))) return;
    unlink();
    anchor = null;
    tip.hidden = true;
  }

  root.addEventListener('pointerover', event => show(event.target));
  root.addEventListener('pointerout', event => hide(event.relatedTarget));
  root.addEventListener('focusin', event => show(event.target));
  root.addEventListener('focusout', event => hide(event.relatedTarget));
  root.addEventListener('click', () => hide(), true);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
  });
  window.addEventListener('scroll', () => hide(), true);
  window.addEventListener('resize', () => hide());
}
