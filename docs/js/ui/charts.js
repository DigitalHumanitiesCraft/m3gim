/**
 * Generic chart primitives.
 *
 * Horizontal bars, the one ranking primitive of the Statistik. It knows
 * nothing about the Bestand: colours, labels and click handlers come from the
 * caller, so the aggregations stay in the data layer.
 */

import { el } from '../utils/dom.js';

/**
 * Horizontal bars. maxValue keeps separately rendered parts on one scale.
 */
export function buildHorizontalBars(rows, { maxValue = null } = {}) {
  const list = el('ul', { className: 'stat-bars' });
  const max = maxValue || rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  for (const row of rows) {
    // The tooltip hangs on the row, not on the label: the label cell is an
    // ellipsis box with overflow hidden and would clip it. The label repeats
    // only past the width of the label column (18ch), where the ellipsis may
    // have cut it; shorter than that it would merely restate the row.
    const cut = String(row.label || '').length > 18 ? row.label : '';
    const tip = [cut, row.tip].filter(Boolean).join('\n');
    const li = el('li', {
      className: 'stat-bars__row',
      dataset: tip ? { tip, tipWrap: '', tipPos: 'bottom' } : {},
    });

    // Label: in-App-Cross-Link (onClick) als Button, externer Link (href) als
    // Anker, sonst statischer Text.
    let label;
    if (typeof row.onClick === 'function') {
      label = el('span', {
        className: 'stat-bars__label stat-bars__label--link',
        role: 'button', tabindex: '0',
        onClick: () => row.onClick(),
        onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.onClick(); } },
      }, row.label);
    } else if (row.href) {
      label = el('a', {
        className: 'stat-bars__label stat-bars__label--link',
        href: row.href, target: '_blank', rel: 'noopener',
      }, row.label);
    } else {
      label = el('span', { className: 'stat-bars__label' }, row.label);
    }

    const track = el('div', { className: 'stat-bars__track' });
    const fill = el('div', { className: 'stat-bars__fill' });
    fill.style.width = `${Math.max(2, Math.round((row.value / max) * 100))}%`;
    if (row.color) fill.style.background = row.color;
    track.appendChild(fill);

    li.appendChild(label);
    li.appendChild(track);
    // countText erlaubt einer Zeile, neben dem Balkenwert die Gegenzahl zu
    // nennen; ein Balken allein liest sich als Erfolg.
    li.appendChild(el('span', { className: 'stat-bars__count' },
      row.countText != null ? String(row.countText) : String(row.value)));
    list.appendChild(li);
  }
  return list;
}
