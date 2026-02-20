/**
 * M³GIM Archiv Orchestrator — Toggle between Bestand and Chronik views.
 */

import { el, clear } from '../utils/dom.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { renderBestand, updateBestandView } from './archiv-bestand.js';
import { renderChronik, updateChronikView } from './archiv-chronik.js';

let store = null;
let container = null;
let activeView = 'bestand'; // 'bestand' | 'chronik'
let currentSearch = '';
let currentDocType = '';
let currentSort = 'signatur';

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

  const countEl = el('span', { className: 'archiv-count' });
  countEl.id = 'archiv-count';
  countEl.textContent = `${store.allRecords.length} Objekte \u00b7 ${store.konvolute.size} Konvolute`;

  return el('div', { className: 'archiv-toolbar' }, toggle, search, typeSelect, sortSelect, countEl);
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

function updateToggleUI() {
  const btns = container.querySelectorAll('.archiv-view-toggle__btn');
  btns.forEach((btn, i) => {
    const isActive = (i === 0 && activeView === 'bestand') || (i === 1 && activeView === 'chronik');
    btn.classList.toggle('archiv-view-toggle__btn--active', isActive);
  });

  // Show/hide sort dropdown (only relevant for Bestand)
  const sortEl = document.getElementById('archiv-sort-select');
  if (sortEl) sortEl.style.display = activeView === 'bestand' ? '' : 'none';
}

function renderActiveView() {
  const viewContainer = document.getElementById('archiv-view-container');
  if (!viewContainer) return;

  updateToggleUI();

  const filters = { search: currentSearch, docType: currentDocType, sort: currentSort };

  if (activeView === 'bestand') {
    renderBestand(store, viewContainer, filters);
  } else {
    renderChronik(store, viewContainer, filters);
  }
}

function applyFilters() {
  const filters = { search: currentSearch, docType: currentDocType, sort: currentSort };
  if (activeView === 'bestand') {
    updateBestandView(filters);
  } else {
    updateChronikView(filters);
  }
}
