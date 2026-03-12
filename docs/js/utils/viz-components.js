/**
 * M³GIM Shared Visualization Components
 * Reusable builders for toolbar elements across all D3 views.
 */

import { el } from './dom.js';

/**
 * FF-Badges — research question annotation tags.
 * @param {...string} ffs - FF identifiers, e.g. 'FF1', 'FF3'
 * @returns {HTMLElement}
 */
export function buildFFBadges(...ffs) {
  return el('div', { className: 'ff-badges' },
    ...ffs.map(ff => el('span', { className: 'ff-badges__tag' }, ff))
  );
}

/**
 * Phase Chip Bar — unified Lebensphasen buttons.
 * @param {Array} lebensphasen - [{id, label, von, bis}, ...]
 * @param {Function} onSelect - callback(phase|null) — null = "Alle"
 * @param {Object} [opts]
 * @param {'short'|'full'} [opts.labelMode='short'] - 'short' = "1"–"7", 'full' = "LP5 1950–1955"
 * @returns {{ element: HTMLElement, setActive: Function, chips: Array }}
 */
export function buildPhaseChips(lebensphasen, onSelect, { labelMode = 'short' } = {}) {
  const chips = [];
  const container = el('div', { className: 'viz-toolbar__group' });

  container.appendChild(el('span', { className: 'viz-toolbar__label' }, 'Phase'));

  const alleChip = el('button', { className: 'phase-chip phase-chip--active' }, 'Alle');
  alleChip.addEventListener('click', () => { setActive(null); onSelect(null); });
  container.appendChild(alleChip);
  chips.push({ id: null, el: alleChip });

  for (const phase of lebensphasen) {
    const label = labelMode === 'full'
      ? `${phase.id} ${phase.von}\u2013${phase.bis}`
      : phase.id.replace('LP', '');
    const chip = el('button', {
      className: 'phase-chip',
      title: `${phase.label} (${phase.von}\u2013${phase.bis})`,
    }, label);
    chip.addEventListener('click', () => { setActive(phase.id); onSelect(phase); });
    container.appendChild(chip);
    chips.push({ id: phase.id, el: chip });
  }

  function setActive(activeId) {
    for (const c of chips) {
      c.el.classList.toggle('phase-chip--active', c.id === activeId);
    }
  }

  return { element: container, setActive, chips };
}

/**
 * Coverage Footer — data provenance annotation.
 * @param {string} text
 * @returns {HTMLElement}
 */
export function buildCoverageFooter(text) {
  return el('div', { className: 'data-coverage' }, text);
}
