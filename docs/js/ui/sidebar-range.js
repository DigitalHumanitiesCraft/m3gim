/**
 * The year rail of the filter column and where the band of covered years sits
 * on it (E-239). The control does not know the shared filter; the section
 * `zeitSection` in `sidebar.js` connects the two.
 */

import { el } from '../utils/dom.js';

/**
 * Where the covered band sits on a rail that runs from `min` to `max`, as the
 * two percentages the stylesheet needs. Null where the band would say nothing,
 * that is without a band or where it covers the whole rail.
 * @param {{min:number,max:number}} span
 * @param {?{min:number,max:number}} covered
 * @returns {?{from:string,to:string}}
 */
export function coveredBand(span, covered) {
  if (!covered) return null;
  const width = span.max - span.min;
  if (!(width > 0)) return null;
  const lo = Math.max(span.min, Math.min(covered.min, covered.max));
  const hi = Math.min(span.max, Math.max(covered.min, covered.max));
  if (!(hi > lo)) return null;
  if (lo <= span.min && hi >= span.max) return null;
  const pct = y => `${((y - span.min) / width * 100).toFixed(2)}%`;
  return { from: pct(lo), to: pct(hi) };
}

/** A window open on both sides: two thumbs on one line (two overlaid native
 *  range inputs, only the thumbs take the pointer). The two years stand at the
 *  ends of the rail and travel with the thumbs — no number field beside it, the
 *  control carries its own state. `covered` lays over the rail the stretch the
 *  view's data actually reach, so the shared year bounds are not read as an
 *  empty span. */
export function rangeControl({ min, max, from, to, onChange, covered = null }) {
  const wrap = el('div', { className: 'vs-range' });

  const fromR = el('input', { className: 'vs-range__input vs-range__input--from', type: 'range',
    'aria-label': 'Von', min: String(min), max: String(max), step: '1', value: String(from()) });
  const toR = el('input', { className: 'vs-range__input vs-range__input--to', type: 'range',
    'aria-label': 'Bis', min: String(min), max: String(max), step: '1', value: String(to()) });
  const fromLabel = el('span', { className: 'vs-range__end' }, String(from()));
  const toLabel = el('span', { className: 'vs-range__end vs-range__end--to' }, String(to()));

  const band = coveredBand({ min, max }, covered);
  let bandEl = null;
  if (band) {
    const bandTip = covered.tip || `Belegte Jahre: ${covered.min}–${covered.max}`;
    // A band without text would stay invisible to assistive technology, and the
    // covered years are the one thing it says.
    bandEl = el('div', {
      className: 'vs-range__covered', role: 'img', 'aria-label': bandTip,
      dataset: { tip: bandTip, tipPos: 'bottom-left' },
    });
    // Percentages, not a width in pixels: the rail is fluid and the band has to
    // stay on its years when the column is resized.
    bandEl.style.setProperty('--covered-from', band.from);
    bandEl.style.setProperty('--covered-to', band.to);
  }

  wrap.appendChild(el('div', { className: 'vs-range__row' },
    fromLabel,
    el('div', { className: 'vs-range__dual' },
      el('div', { className: 'vs-range__rail' }), bandEl, fromR, toR),
    toLabel));

  function sync() {
    const a = String(from()), b = String(to());
    fromR.value = a; toR.value = b;
    fromLabel.textContent = a;
    toLabel.textContent = b;
  }

  fromR.addEventListener('input', () => { onChange(Math.min(parseInt(fromR.value, 10), to()), to()); sync(); });
  toR.addEventListener('input', () => { onChange(from(), Math.max(parseInt(toR.value, 10), from())); sync(); });

  sync();
  return { node: wrap, update: sync };
}
