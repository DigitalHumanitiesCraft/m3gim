/**
 * M³GIM Stats Bar — Header statistics chips.
 */

import { el } from '../utils/dom.js';

export function renderStatsBar(store, container) {
  const years = [...store.byYear.keys()].filter(y => y >= 1800 && y <= 2030);
  const minYear = years.length ? Math.min(...years) : '?';
  const maxYear = years.length ? Math.max(...years) : '?';

  const chips = [
    { label: 'Objekte', value: store.allRecords.length },
    { label: 'Konvolute', value: store.konvolute.size },
    { label: 'Zeitraum', value: `${minYear}\u2013${maxYear}` },
    { label: 'Personen', value: store.persons.size },
  ];

  for (const chip of chips) {
    container.appendChild(
      el('span', { className: 'stats-chip' },
        el('span', { className: 'stats-chip__value' }, String(chip.value)),
        ` ${chip.label}`
      )
    );
  }
}
