/**
 * Netzwerk-Sidebar: Filter, Kategorie-Chips, Legende, Reset.
 *
 * Extrahiert aus network.js (E-93, Session 47). Der Haupt-View bleibt
 * State-Eigentuemer, die Sidebar ist reine UI-Produktion: liest aus
 * `state` und ruft `actions`-Callbacks, wenn sich der Filter-Zustand
 * aendert. Keine direkte Mutation globaler State-Variablen hier.
 *
 * Vertrag:
 *   renderSidebar({state, actions}) => HTMLElement (<aside>)
 *
 * state = {
 *   filters,          // laufende Filter-Shape (wird direkt mutiert — bewusst,
 *                     //   da der Top-Level state.filters und filters hier dieselbe
 *                     //   Referenz teilen, Callback signalisiert danach re-render)
 *   layout,           // computeLayout-Ergebnis (fuer Kategorie-Counts)
 *   yearRange,        // {min, max} fuer Zeitfilter-Slider
 * }
 *
 * actions = {
 *   onFilterChange(),          // nach Patch der Filter aufrufen — applyFilters
 *   onMinSharedChanged(),      // Ko-Okkurrenz neu rechnen + SVG-Kanten refreshen
 *   onResetFilters(),          // alle Filter zuruecksetzen + kompletter Re-Draw
 * }
 */

import { el } from '../utils/dom.js';
import { derivePersonKategorie, NETZWERK_KATEGORIEN } from './_network-geometry.js';

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function renderSidebar({ state, actions }) {
  const panel = el('aside', { className: 'netzwerk__sidebar' });

  panel.appendChild(renderCoverageBlock());

  panel.appendChild(el('input', {
    type: 'search',
    className: 'nz-search',
    placeholder: 'Name suchen…',
    value: state.filters.search,
    onInput: (e) => {
      state.filters.search = e.target.value.toLowerCase();
      actions.onFilterChange();
    },
  }));

  panel.appendChild(renderFiltersBlock({ state, actions }));
  panel.appendChild(renderSection('Kategorien', renderCategoriesBlock({ state, actions })));
  panel.appendChild(renderSection('Legende', renderLegendBlock()));
  panel.appendChild(renderResetButton({ actions }));

  return panel;
}

// ---------------------------------------------------------------------------
// Sub-renderer
// ---------------------------------------------------------------------------

function renderSection(title, body) {
  return el('section', { className: 'nz-section' },
    el('h3', { className: 'nz-section__title' }, title),
    body,
  );
}

function renderCoverageBlock() {
  // Nur der Container — Inhalt schreibt network.js::applyFilters() rein.
  return el('div', { className: 'netzwerk__coverage', id: 'netzwerk-coverage' });
}

function renderFiltersBlock({ state, actions }) {
  const wrap = el('div', { className: 'nz-filters' });

  // Mind. Dokumente
  const docsValue = el('span', { className: 'nz-slider__value' }, String(state.filters.minRecords));
  const docsSlider = el('input', {
    type: 'range', min: '1', max: '20', step: '1',
    value: String(state.filters.minRecords),
    className: 'nz-slider',
    onInput: (e) => {
      state.filters.minRecords = parseInt(e.target.value, 10) || 1;
      docsValue.textContent = String(state.filters.minRecords);
      actions.onFilterChange();
    },
  });
  wrap.appendChild(el('label', { className: 'nz-row' },
    el('span', { className: 'nz-row__label' }, 'Mind. Dokumente'),
    docsSlider, docsValue,
  ));

  // Verkn. ab (Mindest-gemeinsame-Records fuer Kante)
  const sharedValue = el('span', { className: 'nz-slider__value' }, String(state.filters.minShared));
  const sharedSlider = el('input', {
    type: 'range', min: '1', max: '6', step: '1',
    value: String(state.filters.minShared),
    className: 'nz-slider',
    onInput: (e) => {
      state.filters.minShared = parseInt(e.target.value, 10) || 2;
      sharedValue.textContent = String(state.filters.minShared);
      actions.onMinSharedChanged();
    },
  });
  wrap.appendChild(el('label', { className: 'nz-row' },
    el('span', { className: 'nz-row__label' }, 'Verkn. ab (gem. Dok.)'),
    sharedSlider, sharedValue,
  ));

  // Toggles — Linientypen explizit trennen:
  //   Ko-Okkurrenz = geschwungen, aus Dokumenten abgeleitet
  //   AgRelOn      = gerade, explizit in den Metadaten annotiert
  wrap.appendChild(buildToggle('Ko-Okkurrenz-Linien (geschwungen)', state.filters.showCoOccurrence, (v) => {
    state.filters.showCoOccurrence = v; actions.onFilterChange();
  }));
  wrap.appendChild(buildToggle('AgRelOn-Linien (gerade, explizit)', state.filters.showAgRelOn, (v) => {
    state.filters.showAgRelOn = v; actions.onFilterChange();
  }));
  wrap.appendChild(buildToggle('Nur Wikidata-verknüpft', state.filters.onlyWikidata, (v) => {
    state.filters.onlyWikidata = v; actions.onFilterChange();
  }));
  wrap.appendChild(buildToggle('Nur AgRelOn-Personen', state.filters.onlyAgRelOn, (v) => {
    state.filters.onlyAgRelOn = v; actions.onFilterChange();
  }));

  wrap.appendChild(renderTimeRangeBlock({ state, actions }));

  return wrap;
}

function renderTimeRangeBlock({ state, actions }) {
  const block = el('div', { className: 'nz-timefilter' });
  block.appendChild(el('div', { className: 'nz-timefilter__head' }, 'Zeitfenster'));
  const valueDisplay = el('span', { className: 'nz-timefilter__value' });
  const updateDisplay = () => {
    const from = state.filters.yearFrom ?? state.yearRange.min;
    const to = state.filters.yearTo ?? state.yearRange.max;
    const isDefault = state.filters.yearFrom == null && state.filters.yearTo == null;
    valueDisplay.textContent = isDefault
      ? `${state.yearRange.min}–${state.yearRange.max} (alle)`
      : `${from}–${to}`;
  };

  const fromSlider = el('input', {
    type: 'range',
    min: String(state.yearRange.min),
    max: String(state.yearRange.max),
    step: '1',
    value: String(state.filters.yearFrom ?? state.yearRange.min),
    className: 'nz-slider nz-timefilter__slider',
  });
  const toSlider = el('input', {
    type: 'range',
    min: String(state.yearRange.min),
    max: String(state.yearRange.max),
    step: '1',
    value: String(state.filters.yearTo ?? state.yearRange.max),
    className: 'nz-slider nz-timefilter__slider',
  });
  fromSlider.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    state.filters.yearFrom = (v === state.yearRange.min) ? null : v;
    if (state.filters.yearTo != null && state.filters.yearFrom != null && state.filters.yearFrom > state.filters.yearTo) {
      state.filters.yearTo = state.filters.yearFrom;
      toSlider.value = String(state.filters.yearFrom);
    }
    updateDisplay();
    actions.onFilterChange();
  });
  toSlider.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    state.filters.yearTo = (v === state.yearRange.max) ? null : v;
    if (state.filters.yearFrom != null && state.filters.yearTo != null && state.filters.yearTo < state.filters.yearFrom) {
      state.filters.yearFrom = state.filters.yearTo;
      fromSlider.value = String(state.filters.yearTo);
    }
    updateDisplay();
    actions.onFilterChange();
  });

  updateDisplay();
  block.appendChild(valueDisplay);
  block.appendChild(el('label', { className: 'nz-timefilter__label' }, 'Von'));
  block.appendChild(fromSlider);
  block.appendChild(el('label', { className: 'nz-timefilter__label' }, 'Bis'));
  block.appendChild(toSlider);
  return block;
}

function renderCategoriesBlock({ state, actions }) {
  const wrap = el('div', { className: 'nz-cats' });
  rebuildCategoryChips(wrap, { state, actions });
  return wrap;
}

function rebuildCategoryChips(wrap, { state, actions }) {
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

  const catCounts = new Map();
  for (const n of state.layout.nodes) {
    const k = derivePersonKategorie(n.entry);
    catCounts.set(k, (catCounts.get(k) || 0) + 1);
  }
  // Sortierung nach Haeufigkeit absteigend — die Chip-Leiste wird selbst zum
  // kleinen Bar-Chart.
  const ordered = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);

  for (const [kat, count] of ordered) {
    const active = state.filters.categories.has(kat);
    const chip = el('button', {
      type: 'button',
      className: `netzwerk__cat-chip ${active ? 'netzwerk__cat-chip--active' : ''}`,
      style: `--cat-color: ${NETZWERK_KATEGORIEN[kat] || NETZWERK_KATEGORIEN.Andere}`,
      onClick: () => {
        if (state.filters.categories.has(kat)) state.filters.categories.delete(kat);
        else state.filters.categories.add(kat);
        rebuildCategoryChips(wrap, { state, actions });
        actions.onFilterChange();
      },
    },
      el('span', { className: 'nz-cat-chip__label' }, kat),
      el('span', { className: 'nz-cat-chip__count' }, String(count)),
    );
    wrap.appendChild(chip);
  }
}

function renderLegendBlock() {
  const wrap = el('div', { className: 'nz-legend' });

  // Ringe — nach Evidenzstaerke
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'netzwerk__legend-dot netzwerk__legend-dot--ring1' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'Ring 1'), ' · harte Beziehung (AgRelOn oder Wikidata + ≥ 5 Dok.)',
    ),
  ));
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'netzwerk__legend-dot netzwerk__legend-dot--ring2' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'Ring 2'), ' · Umfeld (≥ 2 Dokumente)',
    ),
  ));

  // Linientypen — der eigentliche Aha-Moment
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'nz-legend__line nz-legend__line--agrelon' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'gerade Linie'), ' · AgRelOn, ',
      el('em', {}, 'explizit annotiert'),
    ),
  ));
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'nz-legend__line nz-legend__line--cooc' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'geschwungene Linie'), ' · Ko-Okkurrenz, ',
      el('em', {}, 'aus Dokumenten abgeleitet'),
    ),
  ));

  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'nz-legend__qid' }),
    el('span', { className: 'nz-legend__text' }, 'Wikidata-verknüpft (Stern am Knoten)'),
  ));

  return wrap;
}

function renderResetButton({ actions }) {
  return el('button', {
    type: 'button',
    className: 'netzwerk__reset',
    onClick: () => actions.onResetFilters(),
  }, '× Zurücksetzen');
}

function buildToggle(label, value, onChange) {
  const wrap = el('label', { className: 'netzwerk__toggle' });
  const checkbox = el('input', {
    type: 'checkbox',
    onChange: (e) => onChange(e.target.checked),
  });
  if (value) checkbox.checked = true;
  wrap.appendChild(checkbox);
  wrap.appendChild(document.createTextNode(' ' + label));
  return wrap;
}
