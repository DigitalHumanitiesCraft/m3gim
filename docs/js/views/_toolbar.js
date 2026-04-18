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
 * API:
 *   buildToolbar(store, { facets, initial?, onChange?, showReset?, showCount?, className? })
 *   -> { element, setFacet(key, value), getState(), setCount(text) }
 */

import { el, clear } from '../utils/dom.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { buildDftTree } from '../utils/format.js';


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
    state[facet.key] = initial[facet.key] != null
      ? initial[facet.key]
      : (facet.kind === 'toggle' ? false : '');
  }

  const emit = () => onChange && onChange({ ...state });
  const isAnyActive = () => facets.some(f => f.key && state[f.key]);

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
      state[facet.key] = facet.kind === 'toggle' ? false : '';
      controls[facet.key]?.reset();
    }
    updateResetVisibility();
    emit();
  }

  function updateResetVisibility() {
    if (resetBtn) resetBtn.hidden = !isAnyActive();
  }

  const element = el('div', { className }, ...children);

  return {
    element,
    setFacet(key, value) {
      const control = controls[key];
      if (!control) return;
      state[key] = value || (facets.find(f => f.key === key)?.kind === 'toggle' ? false : '');
      control.setValue(value);
      updateResetVisibility();
      emit();
    },
    setCount(text) {
      if (countEl) countEl.textContent = text;
    },
    getState() { return { ...state }; },
  };
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
  const input = el('input', {
    className: 'archiv-search',
    type: 'text',
    placeholder: facet.placeholder || 'Suche\u2026',
    value: state[facet.key] || '',
    onInput: (e) => {
      state[facet.key] = e.target.value.toLowerCase();
      notify();
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
    checked: !!state[facet.key],
    onChange: (e) => { state[facet.key] = e.target.checked; notify(); },
  });
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

  let current = state[facet.key] || '';

  const wrapper = el('div', { className: 'archiv-combobox' });
  const input = el('input', {
    className: 'archiv-combobox__input',
    type: 'text',
    placeholder: facet.placeholder || '',
    title: facet.title || '',
    value: current,
  });

  const clearBtn = el('button', {
    className: 'archiv-combobox__clear',
    html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    title: 'Filter zur\u00fccksetzen',
    onClick: (e) => {
      e.stopPropagation();
      input.value = '';
      clearBtn.style.display = 'none';
      current = '';
      state[facet.key] = '';
      dropdown.style.display = 'none';
      notify();
    },
  });
  clearBtn.style.display = current ? '' : 'none';

  const dropdown = el('div', { className: 'archiv-combobox__dropdown' });
  dropdown.style.display = 'none';

  function renderDropdownItems(filtered) {
    clear(dropdown);
    for (const p of filtered.slice(0, 30)) {
      const item = el('div', {
        className: `archiv-combobox__item ${current === p.name ? 'archiv-combobox__item--active' : ''}`,
        onClick: (e) => {
          e.stopPropagation();
          input.value = p.name;
          current = p.name;
          state[facet.key] = p.name;
          clearBtn.style.display = '';
          dropdown.style.display = 'none';
          notify();
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
    const filtered = q ? entries.filter(e => e.name.toLowerCase().includes(q)) : entries;
    renderDropdownItems(filtered);
    dropdown.style.display = filtered.length ? '' : 'none';
    if (!q && current) {
      current = '';
      state[facet.key] = '';
      clearBtn.style.display = 'none';
      notify();
    }
  });

  input.addEventListener('focus', () => {
    const q = input.value.toLowerCase();
    const filtered = q ? entries.filter(e => e.name.toLowerCase().includes(q)) : entries;
    renderDropdownItems(filtered);
    if (filtered.length) dropdown.style.display = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      input.blur();
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
  wrapper.appendChild(clearBtn);
  wrapper.appendChild(dropdown);

  return {
    element: wrapper,
    reset() {
      input.value = '';
      clearBtn.style.display = 'none';
      current = '';
      state[facet.key] = '';
      dropdown.style.display = 'none';
    },
    setValue(name) {
      input.value = name || '';
      clearBtn.style.display = name ? '' : 'none';
      current = name || '';
      state[facet.key] = name || '';
    },
  };
}
