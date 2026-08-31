/**
 * Generische Filter-Toolbar. Jeder Tab deklariert seine Facetten als Config,
 * die Toolbar baut die Controls, verwaltet den State und emittiert Aenderungen.
 *
 * Facet-Typen:
 *   - { kind: 'search', key, placeholder }
 *   - { kind: 'dftSelect', key }  (hierarchischer Dokumenttyp-Dropdown)
 *   - { kind: 'entityCombobox', key, entityMap, placeholder, title }
 *       entityMap: 'persons' | 'locations' | 'organizations' | 'works'
 *   - { kind: 'select', key, label, options: [{value,label}] }
 *   - { kind: 'toggle', key, label }
 *
 * Die entityCombobox haelt seit E-151 eine Werteliste: mehrere Werte wirken
 * innerhalb der Facette als ODER, zwischen Facetten bleibt es UND. Gewaehlte
 * Werte stehen als entfernbare Chips unter dem Eingabefeld.
 *
 * API:
 *   buildToolbar(store, { facets, initial?, onChange?, showReset?, showCount?, className? })
 *   -> { element, setFacet(key, value), addFacet(key, value), removeFacet(key, value),
 *        getState(), setCount(text) }
 */

import { el, clear } from '../utils/dom.js';
import { buildDftTree } from '../utils/format.js';
import { facetValues } from '../ui/filter-state.js';


const ENTITY_MAP_RESOLVERS = {
  persons:       (store) => store.persons,
  locations:     (store) => store.locations,
  organizations: (store) => store.organizations,
  works:         (store) => store.works,
};


export function buildToolbar(store, {
  facets = [],
  initial = {},
  onChange = null,
  showReset = true,
  showCount = true,
  className = 'archiv-toolbar',
} = {}) {
  const state = {};
  for (const facet of facets) {
    if (!facet.key) continue;
    state[facet.key] = emptyFor(facet);
    if (initial[facet.key] != null) {
      state[facet.key] = facet.kind === 'entityCombobox'
        ? facetValues(initial, facet.key)
        : initial[facet.key];
    }
  }

  const emit = () => onChange && onChange(snapshot(facets, state));
  const isAnyActive = () => facets.some(f => f.key && isFacetActive(f, state[f.key]));

  const controls = {};  // key -> { element, reset, setValue }
  const children = [];

  for (const facet of facets) {
    const control = buildFacet(store, facet, state, () => {
      emit();
      updateResetVisibility();
    });
    controls[facet.key] = control;
    children.push(control.element);
  }

  let resetBtn = null;
  if (showReset) {
    resetBtn = el('button', {
      className: 'archiv-reset',
      title: 'Alle Filter zur\u00fccksetzen',
      onClick: () => resetAll(),
    }, '\u00d7 Zur\u00fccksetzen');
    resetBtn.hidden = !isAnyActive();
    children.push(resetBtn);
  }

  let countEl = null;
  if (showCount) {
    countEl = el('span', {
      className: 'archiv-count',
      dataset: {
        tip: 'Bearbeitet = Record hat mindestens eine Verkn\u00fcpfung. '
          + 'Plakate und Tontr\u00e4ger sind ausgeblendet. '
          + 'Vollst\u00e4ndige Bestandszahlen siehe '
          + 'data/reports/quality-snapshot.md.',
        tipWrap: '',
        tipPos: 'bottom-left',
      },
    });
    children.push(countEl);
  }

  function resetAll() {
    for (const facet of facets) {
      if (!facet.key) continue;
      state[facet.key] = emptyFor(facet);
      controls[facet.key]?.reset();
    }
    updateResetVisibility();
    emit();
  }

  function facetByKey(key) { return facets.find(f => f.key === key) || null; }

  /** Schreibt eine Facette und meldet die Aenderung. mutate erhaelt die
   *  bisherige Auswahl und liefert die neue. */
  function writeFacet(key, mutate) {
    const facet = facetByKey(key);
    const control = controls[key];
    if (!facet || !control) return;
    const next = mutate(state[key]);
    state[key] = next;
    control.setValue(next);
    updateResetVisibility();
    emit();
  }

  function updateResetVisibility() {
    if (resetBtn) resetBtn.hidden = !isAnyActive();
  }

  const element = el('div', { className }, ...children);

  return {
    element,
    /** Ersetzt die Auswahl einer Facette. Listenfacetten nehmen String oder
     *  Liste entgegen, damit jede Altstelle weiter funktioniert. */
    setFacet(key, value) {
      const facet = facetByKey(key);
      if (!facet) return;
      writeFacet(key, () => (facet.kind === 'entityCombobox'
        ? facetValues({ [key]: value }, key)
        : (value || emptyFor(facet))));
    },
    /** Haengt einen Wert an eine Listenfacette an (Mehrfachauswahl). */
    addFacet(key, value) {
      const facet = facetByKey(key);
      if (!facet || facet.kind !== 'entityCombobox' || !value) return;
      writeFacet(key, (cur) => (cur.includes(value) ? cur : [...cur, value]));
    },
    /** Entfernt einen Wert aus einer Listenfacette. */
    removeFacet(key, value) {
      const facet = facetByKey(key);
      if (!facet || facet.kind !== 'entityCombobox') return;
      writeFacet(key, (cur) => cur.filter(v => v !== value));
    },
    setCount(text) {
      if (countEl) countEl.textContent = text;
    },
    getState() { return snapshot(facets, state); },
  };
}

/** Leerwert einer Facette: Liste, Boolean oder leerer String. */
function emptyFor(facet) {
  if (facet.kind === 'entityCombobox') return [];
  if (facet.kind === 'toggle') return false;
  return '';
}

function isFacetActive(facet, value) {
  if (facet.kind === 'entityCombobox') return Array.isArray(value) && value.length > 0;
  return !!value;
}

/** Kopie des States; Listen werden mitkopiert, damit kein Aufrufer den
 *  internen Zustand von aussen mutiert. */
function snapshot(facets, state) {
  const out = { ...state };
  for (const facet of facets) {
    if (facet.key && facet.kind === 'entityCombobox') out[facet.key] = [...state[facet.key]];
  }
  return out;
}


function buildFacet(store, facet, state, notify) {
  switch (facet.kind) {
    case 'search':       return buildSearch(facet, state, notify);
    case 'dftSelect':    return buildDftSelect(store, facet, state, notify);
    case 'entityCombobox': return buildEntityCombobox(store, facet, state, notify);
    case 'select':       return buildSelect(facet, state, notify);
    case 'toggle':       return buildToggle(facet, state, notify);
    default:
      console.warn('[toolbar] unknown facet kind', facet.kind);
      return { element: el('span'), reset: () => {}, setValue: () => {} };
  }
}


function buildSearch(facet, state, notify) {
  let debounceTimer = null;
  const input = el('input', {
    className: 'archiv-search',
    type: 'text',
    placeholder: facet.placeholder || 'Suche\u2026',
    value: state[facet.key] || '',
    onInput: (e) => {
      // State sofort aktualisieren (getState bleibt korrekt), aber den teuren
      // View-Re-Render buendeln -- ein voller Rebuild pro Tastendruck ist in
      // Bestand/Indizes spuerbar.
      state[facet.key] = e.target.value.toLowerCase();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { debounceTimer = null; notify(); }, 150);
    },
  });
  return {
    element: input,
    reset() { input.value = ''; },
    setValue(v) { input.value = v || ''; state[facet.key] = (v || '').toLowerCase(); },
  };
}


function buildDftSelect(store, facet, state, notify) {
  const dftGroups = buildDftTree(store);
  const select = el('select', {
    className: 'archiv-select',
    onChange: (e) => { state[facet.key] = e.target.value; notify(); },
  },
    el('option', { value: '' }, '\u2014 Dokumenttyp \u2014'),
    ...dftGroups.flatMap(group => {
      // group.label/child.label sind bereits die skos:prefLabel (buildDftTree).
      const groupLabel = group.label;
      const options = [];
      if (group.id !== '__sonstige__') {
        options.push(el('option', { value: group.id }, `${groupLabel} (alle)`));
      }
      for (const child of group.children) {
        options.push(el('option', { value: child.id }, child.label));
      }
      return [el('optgroup', { label: groupLabel }, ...options)];
    }),
    // Erschliessungsluecke als waehlbarer Filter (Spezialwert, vgl. _archive-filter).
    el('option', { value: '__none__' }, 'ohne Typ'),
  );
  if (state[facet.key]) select.value = state[facet.key];
  return {
    element: select,
    reset() { select.value = ''; },
    setValue(v) { select.value = v || ''; state[facet.key] = v || ''; },
  };
}


function buildSelect(facet, state, notify) {
  const select = el('select', {
    className: 'archiv-select',
    onChange: (e) => { state[facet.key] = e.target.value; notify(); },
  },
    el('option', { value: '' }, facet.label ? `\u2014 ${facet.label} \u2014` : '\u2014 alle \u2014'),
    ...(facet.options || []).map(opt =>
      el('option', { value: opt.value }, opt.label)),
  );
  if (state[facet.key]) select.value = state[facet.key];
  return {
    element: select,
    reset() { select.value = ''; },
    setValue(v) { select.value = v || ''; state[facet.key] = v || ''; },
  };
}


function buildToggle(facet, state, notify) {
  const input = el('input', {
    type: 'checkbox',
    className: 'archiv-toggle__input',
    onChange: (e) => { state[facet.key] = e.target.checked; notify(); },
  });
  // `checked` muss als Property gesetzt werden, nicht als Attribut: el() nutzt
  // setAttribute, und ein vorhandenes `checked="false"` macht die Box trotzdem
  // angehakt (Boolean-Attribut). Property haelt den sichtbaren Zustand mit dem
  // State synchron.
  input.checked = !!state[facet.key];
  const label = el('label', { className: 'archiv-toggle' }, input, el('span', {}, facet.label || ''));
  return {
    element: label,
    reset() { input.checked = false; state[facet.key] = false; },
    setValue(v) { input.checked = !!v; state[facet.key] = !!v; },
  };
}


function buildEntityCombobox(store, facet, state, notify) {
  const resolver = ENTITY_MAP_RESOLVERS[facet.entityMap];
  const entityMap = resolver ? resolver(store) : new Map();
  const entries = [...entityMap.entries()]
    .map(([name, data]) => ({ name, count: data.records ? data.records.size : 0 }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count);

  const selected = () => (Array.isArray(state[facet.key]) ? state[facet.key] : []);

  const wrapper = el('div', { className: 'archiv-combobox' });
  const input = el('input', {
    className: 'archiv-combobox__input',
    type: 'text',
    placeholder: facet.placeholder || '',
    title: facet.title || '',
  });
  const chipBox = el('div', { className: 'archiv-combobox__chips' });
  const dropdown = el('div', { className: 'archiv-combobox__dropdown' });
  dropdown.style.display = 'none';

  /** Auswahl schreiben und den View benachrichtigen. */
  function commit(values) {
    state[facet.key] = values;
    renderChips();
    notify();
  }

  function renderChips() {
    clear(chipBox);
    for (const name of selected()) {
      chipBox.appendChild(el('span', { className: 'archiv-combobox__chip' },
        el('span', { className: 'archiv-combobox__chip-label' }, name),
        el('button', {
          className: 'archiv-combobox__chip-remove',
          type: 'button',
          title: `${name} aus dem Filter nehmen`,
          'aria-label': `${name} aus dem Filter nehmen`,
          onClick: (e) => {
            e.stopPropagation();
            commit(selected().filter(v => v !== name));
          },
        }, '×')));
    }
    chipBox.hidden = selected().length === 0;
  }

  function renderDropdownItems(filtered) {
    clear(dropdown);
    const active = new Set(selected());
    for (const p of filtered.slice(0, 30)) {
      const on = active.has(p.name);
      const item = el('div', {
        className: `archiv-combobox__item ${on ? 'archiv-combobox__item--active' : ''}`,
        onClick: (e) => {
          e.stopPropagation();
          // Ein zweiter Klick nimmt den Wert wieder heraus; so ist die
          // Mehrfachauswahl ohne zweites Bedienelement umkehrbar.
          commit(on ? selected().filter(v => v !== p.name) : [...selected(), p.name]);
          input.value = '';
          dropdown.style.display = 'none';
        },
      },
        el('span', {}, p.name),
        el('span', { className: 'archiv-combobox__count' }, String(p.count)),
      );
      dropdown.appendChild(item);
    }
    if (filtered.length > 30) {
      dropdown.appendChild(el('div', { className: 'archiv-combobox__more' },
        `… ${filtered.length - 30} weitere`));
    }
  }

  function matching() {
    const q = input.value.toLowerCase();
    return q ? entries.filter(e => e.name.toLowerCase().includes(q)) : entries;
  }

  input.addEventListener('input', () => {
    const filtered = matching();
    renderDropdownItems(filtered);
    dropdown.style.display = filtered.length ? '' : 'none';
  });

  input.addEventListener('focus', () => {
    const filtered = matching();
    renderDropdownItems(filtered);
    if (filtered.length) dropdown.style.display = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      input.blur();
      return;
    }
    // Enter uebernimmt den ersten Treffer; ohne das braeuchte jede Auswahl
    // die Maus.
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = matching()[0];
      if (first && !selected().includes(first.name)) {
        commit([...selected(), first.name]);
        input.value = '';
        dropdown.style.display = 'none';
      }
    }
  });

  if (!buildEntityCombobox._listenerAttached && typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      for (const dd of document.querySelectorAll('.archiv-combobox__dropdown')) {
        const combobox = dd.closest('.archiv-combobox');
        if (combobox && !combobox.contains(e.target)) dd.style.display = 'none';
      }
    });
    buildEntityCombobox._listenerAttached = true;
  }

  wrapper.appendChild(input);
  wrapper.appendChild(chipBox);
  wrapper.appendChild(dropdown);
  renderChips();

  return {
    element: wrapper,
    reset() {
      input.value = '';
      state[facet.key] = [];
      renderChips();
      dropdown.style.display = 'none';
    },
    setValue(values) {
      state[facet.key] = facetValues({ [facet.key]: values }, facet.key);
      input.value = '';
      renderChips();
    },
  };
}
