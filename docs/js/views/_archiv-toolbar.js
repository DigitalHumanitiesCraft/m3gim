/**
 * Geteilte Filter-Toolbar fuer Bestand + Chronik.
 * Enthaelt: Suche, Dokumenttyp-Dropdown (hierarchisch), Person-Combobox,
 * Reset-Button, Count-Anzeige. Grouping-Toggle (Chronik) und View-Toggle
 * (Bestand/Chronik) sind NICHT hier -- die wandern in die jeweilige View.
 *
 * API: buildFilterToolbar(store, { initial, onChange }) -> { element, setPerson, getCount, setCount }
 *   initial: {search, docType, person}
 *   onChange: (state) => void   aufgerufen bei jeder Filter-Aenderung
 */

import { el, clear } from '../utils/dom.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { buildDftTree } from '../utils/format.js';


export function buildFilterToolbar(store, { initial = {}, onChange } = {}) {
  const state = {
    search: initial.search || '',
    docType: initial.docType || '',
    person: initial.person || '',
  };
  const emit = () => onChange && onChange({ ...state });

  const searchInput = el('input', {
    className: 'archiv-search',
    type: 'text',
    placeholder: 'Suche (Signatur, Titel, Typ, Datum\u2026)',
    value: state.search,
    onInput: (e) => { state.search = e.target.value.toLowerCase(); emit(); updateResetVisibility(); },
  });

  const dftGroups = buildDftTree(store);
  const typeSelect = el('select', {
    className: 'archiv-select',
    onChange: (e) => { state.docType = e.target.value; emit(); updateResetVisibility(); },
  },
    el('option', { value: '' }, '\u2014 Dokumenttyp \u2014'),
    ...dftGroups.flatMap(group => {
      const groupLabel = DOKUMENTTYP_LABELS[group.id] || group.label;
      const options = [];
      if (group.id !== '__sonstige__') {
        options.push(el('option', { value: group.id }, `${groupLabel} (alle)`));
      }
      for (const child of group.children) {
        options.push(el('option', { value: child.id }, DOKUMENTTYP_LABELS[child.id] || child.label));
      }
      return [el('optgroup', { label: groupLabel }, ...options)];
    })
  );
  if (state.docType) typeSelect.value = state.docType;

  const personCombobox = buildPersonCombobox(store, {
    initialValue: state.person,
    onSelect: (name) => { state.person = name; emit(); updateResetVisibility(); },
  });

  const resetBtn = el('button', {
    className: 'archiv-reset',
    title: 'Alle Filter zur\u00fccksetzen',
    onClick: () => resetAll(),
  }, '\u00d7 Zur\u00fccksetzen');
  resetBtn.hidden = !(state.search || state.docType || state.person);

  const countEl = el('span', {
    className: 'archiv-count',
    title: 'Bearbeitet = Record hat mindestens eine Verkn\u00fcpfung '
      + '(Schicht 1 + 2 erschlossen). Plakate und Tontr\u00e4ger sind ausgeblendet. '
      + 'Vollst\u00e4ndige Bestandszahlen siehe data/reports/quality-snapshot.md.',
  });

  function resetAll() {
    state.search = '';
    state.docType = '';
    state.person = '';
    searchInput.value = '';
    typeSelect.value = '';
    personCombobox.reset();
    updateResetVisibility();
    emit();
  }

  function updateResetVisibility() {
    resetBtn.hidden = !(state.search || state.docType || state.person);
  }

  const element = el('div', { className: 'archiv-toolbar' },
    searchInput, typeSelect, personCombobox.element, resetBtn, countEl);

  return {
    element,
    setPerson(name) {
      state.person = name || '';
      personCombobox.setValue(name || '');
      updateResetVisibility();
      emit();
    },
    setCount(text) { countEl.textContent = text; },
    getState() { return { ...state }; },
  };
}


function buildPersonCombobox(store, { initialValue = '', onSelect } = {}) {
  const personEntries = [...store.persons.entries()]
    .map(([name, data]) => ({ name, count: data.records.size }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count);

  let currentPerson = initialValue;

  const wrapper = el('div', { className: 'archiv-combobox' });
  const input = el('input', {
    className: 'archiv-combobox__input',
    type: 'text',
    placeholder: 'Person filtern\u2026',
    title: 'Dokumente nach verkn\u00fcpfter Person filtern',
    value: currentPerson,
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
      onSelect && onSelect('');
    },
  });
  clearBtn.style.display = currentPerson ? '' : 'none';

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
          onSelect && onSelect(p.name);
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
    if (!q && currentPerson) {
      currentPerson = '';
      clearBtn.style.display = 'none';
      onSelect && onSelect('');
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

  // Close dropdown on outside click (delegated; one global listener reicht).
  if (!buildPersonCombobox._listenerAttached) {
    document.addEventListener('click', (e) => {
      for (const dd of document.querySelectorAll('.archiv-combobox__dropdown')) {
        const combobox = dd.closest('.archiv-combobox');
        if (combobox && !combobox.contains(e.target)) dd.style.display = 'none';
      }
    });
    buildPersonCombobox._listenerAttached = true;
  }

  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);
  wrapper.appendChild(dropdown);

  return {
    element: wrapper,
    reset() {
      input.value = '';
      clearBtn.style.display = 'none';
      currentPerson = '';
      dropdown.style.display = 'none';
    },
    setValue(name) {
      input.value = name || '';
      clearBtn.style.display = name ? '' : 'none';
      currentPerson = name || '';
    },
  };
}
