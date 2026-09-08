/**
 * The remaining control factories of the filter column, which a view places
 * through `sections` and `legend`: legend chips, threshold slider, switch,
 * explanatory legend and the region a view fills itself. Each
 * returns `{ node, update? }`; none knows the shared filter, the view connects
 * them through getters and callbacks.
 */

import { el } from '../utils/dom.js';

/** Colour-coded toggle chips (the legend as a filter). The view defines what
 *  "active" means through isActive/onToggle, the module stays semantics-free. */
export function legendControl({ items = [], isActive, onToggle }) {
  const wrap = el('div', { className: 'vs-legend', role: 'group' });
  const chips = [];
  for (const it of items) {
    const chip = el('button', {
      className: 'vs-chip', type: 'button',
      dataset: it.tip ? { tip: it.tip, tipWrap: '', tipPos: 'bottom-left' } : {},
    },
      el('span', { className: 'vs-chip__swatch' }),
      el('span', { className: 'vs-chip__label' }, it.label),
      it.count != null ? el('span', { className: 'vs-chip__count' }, String(it.count)) : null);
    chip.querySelector('.vs-chip__swatch').style.background = it.color || 'var(--color-text-tertiary)';
    chip.addEventListener('click', () => { if (onToggle) onToggle(it.id); refresh(); });
    chips.push({ el: chip, id: it.id });
    wrap.appendChild(chip);
  }
  function refresh() {
    for (const c of chips) {
      const on = isActive ? !!isActive(c.id) : true;
      c.el.classList.toggle('vs-chip--off', !on);
      c.el.setAttribute('aria-pressed', String(on));
    }
  }
  refresh();
  return { node: wrap, update: refresh };
}

/** A single threshold slider with its value beside it. */
export function sliderControl({ label, min, max, step = 1, value, onChange, format }) {
  const fmt = v => (format ? format(v) : String(v));
  const valueEl = el('span', { className: 'vs-slider__value' }, fmt(value()));
  const input = el('input', { className: 'vs-slider__input', type: 'range',
    min: String(min), max: String(max), step: String(step), value: String(value()),
    'aria-label': label });
  input.addEventListener('input', () => {
    onChange(parseFloat(input.value));
    valueEl.textContent = fmt(value());
  });
  const node = el('label', { className: 'vs-slider' },
    el('span', { className: 'vs-slider__label' }, label),
    el('span', { className: 'vs-slider__row' }, input, valueEl));
  function update() { input.value = String(value()); valueEl.textContent = fmt(value()); }
  return { node, update };
}

/** Boolean switch. `label` and `tip` may be functions where the caption
 *  carries a number of the current cut (E-227). */
export function toggleControl({ label, value, onChange, tip = null }) {
  const input = el('input', { type: 'checkbox' });
  if (value()) input.checked = true;
  input.addEventListener('change', () => onChange(input.checked));
  const text = el('span', { className: 'vs-toggle__label' });
  const node = el('label', { className: 'vs-toggle' }, input, text);
  function paint() {
    text.textContent = typeof label === 'function' ? label() : String(label);
    if (tip) Object.assign(node.dataset, { tip: tip(), tipWrap: '' });
  }
  paint();
  function update() { input.checked = !!value(); paint(); }
  return { node, update };
}

/** Non-interactive explanatory legend. A marker carries either a colour or a
 *  view-owned CSS class (rings, lines), the text optionally as HTML. */
export function staticLegendControl({ rows = [] }) {
  const wrap = el('div', { className: 'vs-static' });
  for (const r of rows) {
    const marker = el('span', { className: 'vs-static__marker' + (r.markerClass ? ' ' + r.markerClass : '') });
    if (r.color) marker.style.background = r.color;
    const text = el('span', { className: 'vs-static__text' });
    if (r.html != null) text.innerHTML = r.html;
    else if (r.label != null) text.textContent = r.label;
    const row = el('div', { className: 'vs-static__row' }, marker, text);
    if (r.count != null) row.appendChild(el('span', { className: 'vs-static__count' }, String(r.count)));
    wrap.appendChild(row);
  }
  return { node: wrap };
}

/** Bespoke region. Either a finished node, or a container (with an optional
 *  id/className) the view fills itself. build() runs once, update() on every
 *  sidebar update(). */
export function customControl({ id, className, node, build, update }) {
  const region = node || el('div', { className: className || 'vs-custom' });
  if (id) region.id = id;
  if (build) build(region);
  return { node: region, update: update ? () => update(region) : undefined };
}
