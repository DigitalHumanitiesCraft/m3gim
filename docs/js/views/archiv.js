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

  // Listen for cross-navigation from Indizes "Alle im Archiv anzeigen" link
  window.addEventListener('m3gim:archiv-filter', (e) => {
    const { type, name } = e.detail || {};
    if (type === 'personen' && name) {
      setPersonFilter(name);
    }
  });
}

/** Programmatically set the person filter (used by Indizes cross-nav) */
function setPersonFilter(name) {
  currentPerson = name;
  // Update combobox input to reflect the filter
  const input = container?.querySelector('.archiv-combobox__input');
  const clearBtn = container?.querySelector('.archiv-combobox__clear');
  if (input) input.value = name;
  if (clearBtn) clearBtn.style.display = '';
  applyFilters();
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
    placeholder: 'Suche (Signatur, Titel, Typ, Datum\u2026)',
    onInput: (e) => { currentSearch = e.target.value.toLowerCase(); applyFilters(); },
  });

  // Doc type filter
  const docTypes = [...store.byDocType.keys()].filter(t => t !== 'konvolut').sort();
  const typeSelect = el('select', {
    className: 'archiv-select',
    onChange: (e) => { currentDocType = e.target.value; applyFilters(); },
  },
    el('option', { value: '' }, '\u2014 Dokumenttyp \u2014'),
    ...docTypes.map(t => el('option', { value: t }, DOKUMENTTYP_LABELS[t] || t))
  );

  // Person filter — Autocomplete Combobox
  const personEntries = [...store.persons.entries()]
    .map(([name, data]) => ({ name, count: data.records.size }))
    .sort((a, b) => b.count - a.count);

  const personCombobox = buildPersonCombobox(personEntries);

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

  // Reset all filters button (hidden when no filters active)
  const resetBtn = el('button', {
    className: 'archiv-reset',
    id: 'archiv-reset-btn',
    title: 'Alle Filter zur\u00fccksetzen',
    onClick: () => resetAllFilters(),
  }, '\u00d7 Zur\u00fccksetzen');
  resetBtn.hidden = true;

  const countEl = el('span', { className: 'archiv-count' });
  countEl.id = 'archiv-count';
  countEl.textContent = `${store.allRecords.length} Objekte \u00b7 ${store.konvolute.size} Konvolute`;

  return el('div', { className: 'archiv-toolbar' }, toggle, search, typeSelect, personCombobox, groupingToggle, resetBtn, countEl);
}

function buildPersonCombobox(personEntries) {
  const wrapper = el('div', { className: 'archiv-combobox' });

  const input = el('input', {
    className: 'archiv-combobox__input',
    type: 'text',
    placeholder: 'Person filtern\u2026',
    title: 'Dokumente nach verkn\u00fcpfter Person filtern',
  });

  const clearBtn = el('button', {
    className: 'archiv-combobox__clear',
    html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    title: 'Filter zur\u00fccksetzen',
    onClick: (e) => {
      e.stopPropagation();
      input.value = '';
      clearBtn.style.display = 'none';
      currentPerson = '';
      dropdown.style.display = 'none';
      applyFilters();
    },
  });
  clearBtn.style.display = 'none';

  const dropdown = el('div', { className: 'archiv-combobox__dropdown' });
  dropdown.style.display = 'none';

  function renderDropdownItems(filtered) {
    clear(dropdown);
    for (const p of filtered.slice(0, 30)) {
      const item = el('div', {
        className: `archiv-combobox__item ${currentPerson === p.name ? 'archiv-combobox__item--active' : ''}`,
        onClick: (e) => {
          e.stopPropagation();
          input.value = p.name;
          currentPerson = p.name;
          clearBtn.style.display = '';
          dropdown.style.display = 'none';
          applyFilters();
        },
      },
        el('span', {}, p.name),
        el('span', { className: 'archiv-combobox__count' }, String(p.count)),
      );
      dropdown.appendChild(item);
    }
    if (filtered.length > 30) {
      dropdown.appendChild(el('div', { className: 'archiv-combobox__more' },
        `\u2026 ${filtered.length - 30} weitere`));
    }
  }

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    const filtered = q
      ? personEntries.filter(p => p.name.toLowerCase().includes(q))
      : personEntries;
    renderDropdownItems(filtered);
    dropdown.style.display = filtered.length ? '' : 'none';
    // If input cleared manually, reset filter
    if (!q && currentPerson) {
      currentPerson = '';
      clearBtn.style.display = 'none';
      applyFilters();
    }
  });

  input.addEventListener('focus', () => {
    const q = input.value.toLowerCase();
    const filtered = q
      ? personEntries.filter(p => p.name.toLowerCase().includes(q))
      : personEntries;
    renderDropdownItems(filtered);
    if (filtered.length) dropdown.style.display = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      input.blur();
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);
  wrapper.appendChild(dropdown);
  return wrapper;
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
    renderBestand(store, viewContainer, filters, (sortKey) => {
      currentSort = sortKey;
      applyFilters();
    });
  } else {
    renderChronik(store, viewContainer, filters);
  }
}

function resetAllFilters() {
  currentSearch = '';
  currentDocType = '';
  currentPerson = '';
  // Reset UI elements
  const searchInput = container?.querySelector('.archiv-search');
  const typeSelect = container?.querySelector('.archiv-select');
  const personInput = container?.querySelector('.archiv-combobox__input');
  const personClear = container?.querySelector('.archiv-combobox__clear');
  if (searchInput) searchInput.value = '';
  if (typeSelect) typeSelect.value = '';
  if (personInput) personInput.value = '';
  if (personClear) personClear.style.display = 'none';
  applyFilters();
}

function applyFilters() {
  const filters = { search: currentSearch, docType: currentDocType, sort: currentSort, person: currentPerson };
  let filteredCount;
  if (activeView === 'bestand') {
    filteredCount = updateBestandView(filters);
  } else {
    filteredCount = updateChronikView(filters);
  }
  updateCounter(filteredCount);

  // Show/hide reset button
  const resetBtn = document.getElementById('archiv-reset-btn');
  if (resetBtn) {
    resetBtn.hidden = !(currentSearch || currentDocType || currentPerson);
  }
}

function updateCounter(filteredCount) {
  const countEl = document.getElementById('archiv-count');
  if (!countEl) return;
  const total = store.allRecords.length;
  const isFiltered = !!(currentSearch || currentDocType || currentPerson);
  if (isFiltered && filteredCount !== undefined) {
    countEl.textContent = `${filteredCount} von ${total} Objekten`;
  } else {
    countEl.textContent = `${total} Objekte \u00b7 ${store.konvolute.size} Konvolute`;
  }
}
