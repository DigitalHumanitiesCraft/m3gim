/**
 * M³GIM Archiv Orchestrator — Toggle between Bestand and Chronik views.
 */

import { el, clear } from '../utils/dom.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { renderBestand, updateBestandView } from './archiv-bestand.js';
import { renderChronik, updateChronikView, setChronikGrouping } from './archiv-chronik.js';

let store = null;
let container = null;
let activeView = 'bestand'; // 'bestand' | 'chronik'
let currentSearch = '';
let currentDocType = '';
let currentSort = 'signatur';
let currentGrouping = 'location'; // 'location' | 'person' | 'werk'
let currentPerson = ''; // person name filter

export function renderArchiv(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;
  clear(container);

  container.appendChild(buildToolbar());

  const viewContainer = el('div', { className: 'archiv-view-container' });
  viewContainer.id = 'archiv-view-container';
  container.appendChild(viewContainer);

  renderActiveView();
}

function buildToolbar() {
  // View toggle
  const toggle = el('div', { className: 'archiv-view-toggle' },
    buildToggleBtn('bestand', 'Bestand',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
    ),
    buildToggleBtn('chronik', 'Chronik',
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    ),
  );

  // Search
  const search = el('input', {
    className: 'archiv-search',
    type: 'text',
    placeholder: 'Suche (Signatur, Titel\u2026)',
    onInput: (e) => { currentSearch = e.target.value.toLowerCase(); applyFilters(); },
  });

  // Doc type filter
  const docTypes = [...store.byDocType.keys()].filter(t => t !== 'konvolut').sort();
  const typeSelect = el('select', {
    className: 'archiv-select',
    onChange: (e) => { currentDocType = e.target.value; applyFilters(); },
  },
    el('option', { value: '' }, 'Alle Typen'),
    ...docTypes.map(t => el('option', { value: t }, DOKUMENTTYP_LABELS[t] || t))
  );

  // Person filter
  const personEntries = [...store.persons.entries()]
    .map(([name, data]) => ({ name, count: data.records.size }))
    .sort((a, b) => b.count - a.count);

  const personSelect = el('select', {
    className: 'archiv-select',
    id: 'archiv-person-select',
    onChange: (e) => { currentPerson = e.target.value; applyFilters(); },
  },
    el('option', { value: '' }, `Alle Personen (${personEntries.length})`),
    ...personEntries.map(p => el('option', { value: p.name }, `${p.name} (${p.count})`))
  );

  // Sort (only for Bestand)
  const sortSelect = el('select', {
    className: 'archiv-select archiv-sort-select',
    onChange: (e) => { currentSort = e.target.value; applyFilters(); },
  },
    el('option', { value: 'signatur' }, 'Signatur'),
    el('option', { value: 'titel' }, 'Titel'),
    el('option', { value: 'datum' }, 'Datum'),
    el('option', { value: 'typ' }, 'Typ'),
    el('option', { value: 'links' }, 'Verkn\u00fcpfungen'),
  );
  sortSelect.id = 'archiv-sort-select';

  // Chronik grouping toggle
  const groupingToggle = el('div', {
    className: 'archiv-view-toggle chronik-grouping-toggle',
    id: 'chronik-grouping-toggle',
  },
    buildGroupingBtn('location', 'Ort',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
    ),
    buildGroupingBtn('person', 'Person',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    ),
    buildGroupingBtn('werk', 'Werk',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
    ),
  );

  const countEl = el('span', { className: 'archiv-count' });
  countEl.id = 'archiv-count';
  countEl.textContent = `${store.allRecords.length} Objekte \u00b7 ${store.konvolute.size} Konvolute`;

  return el('div', { className: 'archiv-toolbar' }, toggle, search, typeSelect, personSelect, sortSelect, groupingToggle, countEl);
}

function buildToggleBtn(view, label, iconSvg) {
  return el('button', {
    className: `archiv-view-toggle__btn ${activeView === view ? 'archiv-view-toggle__btn--active' : ''}`,
    onClick: () => {
      if (activeView === view) return;
      activeView = view;
      updateToggleUI();
      renderActiveView();
    },
  },
    el('span', { className: 'archiv-view-toggle__icon', html: iconSvg }),
    el('span', {}, label),
  );
}

function buildGroupingBtn(mode, label, iconSvg) {
  return el('button', {
    className: `archiv-view-toggle__btn ${currentGrouping === mode ? 'archiv-view-toggle__btn--active' : ''}`,
    onClick: () => {
      if (currentGrouping === mode) return;
      currentGrouping = mode;
      setChronikGrouping(mode);
      updateGroupingToggleUI();
      applyFilters();
    },
  },
    el('span', { className: 'archiv-view-toggle__icon', html: iconSvg }),
    el('span', {}, label),
  );
}

function updateGroupingToggleUI() {
  const groupToggle = document.getElementById('chronik-grouping-toggle');
  if (!groupToggle) return;
  const btns = groupToggle.querySelectorAll('.archiv-view-toggle__btn');
  const modes = ['location', 'person', 'werk'];
  btns.forEach((btn, i) => {
    btn.classList.toggle('archiv-view-toggle__btn--active', currentGrouping === modes[i]);
  });
}

function updateToggleUI() {
  const btns = container.querySelectorAll(':scope > .archiv-toolbar .archiv-view-toggle:first-child .archiv-view-toggle__btn');
  btns.forEach((btn, i) => {
    const isActive = (i === 0 && activeView === 'bestand') || (i === 1 && activeView === 'chronik');
    btn.classList.toggle('archiv-view-toggle__btn--active', isActive);
  });

  // Show/hide sort dropdown (only relevant for Bestand)
  const sortEl = document.getElementById('archiv-sort-select');
  if (sortEl) sortEl.style.display = activeView === 'bestand' ? '' : 'none';

  // Show/hide grouping toggle (only relevant for Chronik)
  const groupToggle = document.getElementById('chronik-grouping-toggle');
  if (groupToggle) groupToggle.style.display = activeView === 'chronik' ? '' : 'none';
}

function renderActiveView() {
  const viewContainer = document.getElementById('archiv-view-container');
  if (!viewContainer) return;

  updateToggleUI();

  const filters = { search: currentSearch, docType: currentDocType, sort: currentSort, person: currentPerson };

  if (activeView === 'bestand') {
    renderBestand(store, viewContainer, filters);
  } else {
    renderChronik(store, viewContainer, filters);
  }
}

function applyFilters() {
  const filters = { search: currentSearch, docType: currentDocType, sort: currentSort, person: currentPerson };
  if (activeView === 'bestand') {
    updateBestandView(filters);
  } else {
    updateChronikView(filters);
  }
}
