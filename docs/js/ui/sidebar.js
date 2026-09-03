/**
 * The one sidebar of every view (design.md Regel 7, E-158).
 *
 * `createSidebar` builds a fixed order and every tab gets the same column
 * (Projektleitung, 2026-09-03):
 *
 *   (a) search      free text into the shared filter, no title, the view names
 *                   its searchable fields in the placeholder
 *   (b) Zeitraum    the two-thumb year window, its years at the ends of the rail
 *   (c) facets      the shared facets, Dokumenttyp first, Erschliessungsstand
 *                   directly under it
 *   (d) sections    view-specific controls the view passes in
 *   (e) legend      view-specific legend sections
 *
 * The result line is not a block of its own: it is the root row of the
 * Dokumenttyp tree ("Dokumente · 161 von 187"). The active values and the reset
 * link live outside the column, in the strip `createSidebar` returns beside the
 * element: a filter change must not make the column jump.
 *
 * A view passes only (d), (e) and an optional search config; the rest comes
 * from the scaffold and reads `filter-state.js`. Exactly three rules exist in
 * the column, before (c), (d) and (e); inside a block only spacing separates
 * (design.md Regel 11).
 *
 * The view stays owner of its local state. Controls read it through getters and
 * report back through callbacks; afterwards the view redraws and calls
 * `update()`. Every filter change, whether from this column or from another
 * view, arrives as exactly one `onChange` call, so a click never triggers two
 * render passes. `destroy()` drops the subscription when a view rebuilds.
 *
 * viewShell(sidebarEl, mainEl) is the grid the sidebar and the canvas hang in.
 */

import { el, clear } from '../utils/dom.js';
import { matchesQuery, matchRanges } from '../utils/normalize.js';
import {
  getFilter, setFilter, resetFilter, subscribe, facetValues, isFilterActive,
  deviatingKeys,
} from './filter-state.js';
import {
  facetInventory, facetCounts, docTypeGroups, recordsFor, baseIds,
  YEAR_MIN, YEAR_MAX, STAND_VALUES,
} from '../data/records-for.js';

// ---------------------------------------------------------------------------
// Geruest + Builder
// ---------------------------------------------------------------------------

export function viewShell(sidebarEl, mainEl) {
  return el('div', { className: 'view-shell' }, sidebarEl, mainEl);
}

/**
 * Display form of the shared facets, in column order (Projektleitung,
 * 2026-09-03). The title is the accessible label of the input. `family` names
 * the content family whose colour dot precedes the title, the same dot the
 * block titles of the inline detail carry. `marker` can distinguish a related
 * concept from a family of its own without introducing another colour.
 */
export const FACET_META = Object.freeze({
  docType:     { title: 'Dokumenttyp' },
  stand:       { title: 'Erschließungsstand' },
  person:      { title: 'Person', family: 'person' },
  ort:         { title: 'Ort', family: 'ort' },
  werk:        { title: 'Werk', family: 'werk' },
  institution: { title: 'Institution', family: 'institution' },
});

/** The shared facets every view carries. */
export const SHARED_FACETS = Object.freeze([
  'docType', 'person', 'ort', 'werk', 'institution',
]);

/** Suggestions shown per open facet while the input has focus, and rows shown
 *  in the Dokumenttyp list before "mehr …". The column must fit one screen. */
const OPTION_LIMIT = 8;

let titleSeq = 0;
let listSeq = 0;

/**
 * @param {Object} store
 * @param {Object} [opts]
 * @param {string[]} [opts.facets]     shared facet keys, in column order
 * @param {{min:number,max:number}} [opts.yearSpan]
 * @param {() => ?number} [opts.getCount]  documents of the view's current cut;
 *   without it the scaffold resolves the shared filter itself
 * @param {boolean|{placeholder?: string}} [opts.search]  free-text field (a);
 *   `false` leaves it out, which is what a view without a text cut needs
 * @param {Array} [opts.sections]      view-specific sections (d)
 * @param {Array} [opts.legend]        view-specific legend sections (e)
 * @param {() => void} [opts.onChange] after every filter change, own or foreign
 * @returns {{element: HTMLElement, update: () => void, destroy: () => void}}
 */
export function createSidebar(store, {
  facets = SHARED_FACETS,
  yearSpan = { min: YEAR_MIN, max: YEAR_MAX },
  getCount = null,
  search = true,
  sections = [],
  legend = [],
  onChange = () => {},
} = {}) {
  const inventories = new Map();
  for (const key of facets) {
    inventories.set(key, key === 'docType' ? docTypeGroups(store) : facetInventory(store, key));
  }
  // The Erschliessungsstand is a closed value set and no open facet, so it is
  // not in `facets`; the strip still needs its display forms.
  inventories.set('stand', standInventory(store));

  // Dokumenttyp does not get a section of its own: its tree hangs under the
  // result line, which is the root row of the same tree.
  const facetSpecs = [
    dokumenteSection(store, inventories, getCount, facets.includes('docType')),
    standSection(store, inventories.get('stand')),
    ...facets.filter(key => key !== 'docType')
      .map(key => sharedFacetSection(store, key, inventories.get(key))),
  ];

  const specs = [
    search === false ? null : searchSection(search && search.placeholder),
    zeitSection(yearSpan),
    ...facetSpecs.map((spec, i) => withRule(spec, i === 0)),
    ...withLeadingRule(sections),
    ...withLeadingRule(legend),
  ];

  const built = buildColumn(specs);
  const strip = filterStrip(inventories);

  // A cut from another view must arrive here without the consumer thinking of
  // it; otherwise the column shows a state the shared filter no longer has.
  const unsubscribe = subscribe(() => onChange(), { immediate: false });

  return {
    element: built.element,
    strip: strip.element,
    update() { built.update(); strip.update(); },
    destroy: unsubscribe,
  };
}

/** The rule sits on the first real section of a block, so an empty block adds
 *  no line of its own. */
function withLeadingRule(specs) {
  const list = (specs || []).filter(Boolean);
  return list.map((spec, i) => withRule(spec, i === 0));
}

function withRule(spec, on) {
  return on && spec ? { ...spec, rule: true } : spec;
}

function buildColumn(specs) {
  const aside = el('aside', { className: 'view-sidebar' });
  const updaters = [];

  for (const spec of specs) {
    if (!spec) continue;
    const sec = el('section', { className: 'vs-section' });
    if (spec.rule) sec.classList.add('vs-section--rule');
    if (spec.className) sec.classList.add(spec.className);
    // An open facet is one row: the title names the axis, the input is the whole
    // control. Stacking them cost a line per facet and the column ran long.
    if ((spec.controls || []).some(c => c && c.kind === 'facet')) {
      sec.classList.add('vs-section--inline');
    }

    const body = el('div', { className: 'vs-section__body' });
    let head = null;
    let labelEl = null;
    let collapsed = !!(spec.collapsed && spec.collapsed());

    if (spec.title != null) {
      labelEl = el('span', { className: 'vs-section__label' });
      const dot = spec.family
        ? el('span', {
            className: `ersch-dot ersch-dot--on ersch-dot--${spec.family}`
              + (spec.marker ? ` ersch-dot--${spec.marker}` : ''),
            'aria-hidden': 'true',
          })
        : null;
      const id = `vs-title-${++titleSeq}`;
      if (spec.collapsible) {
        head = el('button', {
          className: 'vs-section__title vs-section__title--toggle', type: 'button', id,
          onClick: () => { collapsed = !collapsed; paintHead(); },
        }, dot, labelEl, el('span', { className: 'vs-section__chevron', 'aria-hidden': 'true' }, '›'));
      } else {
        head = el('h2', { className: 'vs-section__title', id }, dot, labelEl);
      }
      spec.titleId = id;
      sec.appendChild(head);
    }
    sec.appendChild(body);

    function paintHead() {
      if (!head) return;
      const title = typeof spec.title === 'function' ? spec.title() : spec.title;
      labelEl.textContent = title == null ? '' : String(title);
      head.classList.toggle('vs-section__title--active',
        !!(spec.titleActive && spec.titleActive()));
      if (spec.collapsible) {
        head.classList.toggle('vs-section__title--collapsed', collapsed);
        head.setAttribute('aria-expanded', String(!collapsed));
        body.hidden = collapsed;
      }
    }

    for (const control of spec.controls || []) {
      if (!control) continue;
      const make = FACTORIES[control.kind];
      if (!make) continue;
      const { node, update } = make({ ...control, labelledBy: spec.titleId });
      if (node) body.appendChild(node);
      if (update) updaters.push(update);
    }

    paintHead();
    updaters.push(() => {
      paintHead();
      if (spec.hidden) sec.hidden = spec.hidden();
    });
    if (spec.hidden) sec.hidden = spec.hidden();

    aside.appendChild(sec);
  }

  return { element: aside, update() { for (const u of updaters) u(); } };
}

// ---------------------------------------------------------------------------
// (a) Suche, (b) Zeitraum
// ---------------------------------------------------------------------------

/** The free text sits above everything and carries no title; the placeholder
 *  names the fields the view actually searches (design.md Regel 8). */
function searchSection(placeholder) {
  return {
    className: 'vs-section--search',
    controls: [{
      kind: 'search',
      ariaLabel: 'Suche',
      placeholder: placeholder || '',
      value: () => getFilter().search || '',
      onChange: (v) => setFilter({ search: v }),
    }],
  };
}

/**
 * The result line as the root row of the Dokumenttyp tree: "Dokumente" with the
 * count of the current cut, the four DFT groups as its children. A view without
 * the Dokumenttyp facet keeps the root row alone.
 */
function dokumenteSection(store, inventories, getCount, withTree) {
  const total = () => baseIds(store).size;
  const count = () => {
    if (getCount) {
      const n = getCount();
      if (typeof n === 'number' && Number.isFinite(n)) return n;
    }
    return recordsFor(store, getFilter()).ids.size;
  };
  const labelId = `vs-root-${++titleSeq}`;
  const paint = region => paintRoot(region, labelId, total, count);

  const spec = {
    className: 'vs-section--dokumente',
    titleId: labelId,
    controls: [{ kind: 'custom', className: 'vs-status', build: paint, update: paint }],
  };
  if (withTree) {
    const entries = inventories.get('docType') || [];
    spec.controls.push({
      kind: 'facetTree', key: 'docType', options: () => entries,
      counts: () => facetCounts(store, getFilter(), 'docType', flatValues(entries)),
      selected: () => facetValues(getFilter(), 'docType'),
      onSelect: (values) => setFilter({ docType: values }),
    });
  }
  return spec;
}

function paintRoot(region, labelId, total, count) {
  clear(region);
  region.appendChild(el('div', { className: 'fs-option fs-option--group vs-status__count' },
    el('span', { className: 'fs-tree__chevron fs-tree__chevron--none', 'aria-hidden': 'true' }),
    el('span', { className: 'fs-option__label', id: labelId }, 'Dokumente'),
    el('span', { className: 'fs-option__count' }, countLabel(count(), total()))));
}

/**
 * The Erschliessungsstand as a closed, ordered value set. The Belegzahl-sorted
 * inventory is re-sorted into the reading order of STAND_VALUES, because the
 * states form a sequence and their order is part of the information.
 */
function standInventory(store) {
  return facetInventory(store, 'stand')
    .sort((a, b) => STAND_VALUES.indexOf(a.value) - STAND_VALUES.indexOf(b.value));
}

/**
 * Erschliessungsstand as a facet of its own, directly under the Dokumenttyp
 * tree (Projektleitung, 2026-09-03). The set is small and closed, so it stands
 * open in the row form of the tree instead of behind a search field, and the
 * strip names the chosen states positively like any other facet.
 */
function standSection(store, inventory) {
  const entries = inventory || [];
  const selected = () => facetValues(getFilter(), 'stand');
  return {
    title: FACET_META.stand.title,
    titleActive: () => selected().length > 0,
    controls: [{
      kind: 'optionList', key: 'stand', options: () => entries,
      counts: () => facetCounts(store, getFilter(), 'stand', entries.map(e => e.value)),
      selected,
      onSelect: (values) => setFilter({ stand: values }),
    }],
  };
}

/**
 * The active values above the data, grouped by facet: the facet name once, then
 * one removable chip per value. The grouping is what states the semantics, that
 * several values of one facet act as OR and different facets as AND (E-151); a
 * flat row of "Facette: Wert" chips could not show it.
 *
 * The strip hangs above the data in the main area and not in the column,
 * because a chip that appears there would move every control under it
 * (Projektleitung, 2026-09-03); empty it takes no room.
 */
function filterStrip(inventories) {
  const element = el('div', { className: 'filter-strip' });

  function update() {
    clear(element);
    if (!isFilterActive()) return;
    const filter = getFilter();
    const deviating = new Set(deviatingKeys());
    for (const [key, meta] of Object.entries(FACET_META)) {
      if (!deviating.has(key)) continue;
      const inventory = inventories.get(key) || [];
      const chips = facetValues(filter, key).map(value =>
        removeChip(labelIn(inventory, value),
          () => setFilter({ [key]: facetValues(getFilter(), key).filter(v => v !== value) })));
      if (chips.length > 0) element.appendChild(stripGroup(meta.title, chips));
    }
    if (deviating.has('zeitfenster') && Array.isArray(filter.zeitfenster)) {
      const [von, bis] = filter.zeitfenster;
      element.appendChild(stripGroup('Zeitraum',
        [removeChip(`${von}–${bis}`, () => setFilter({ zeitfenster: null }))]));
    }
    const q = (filter.search || '').trim();
    if (deviating.has('search') && q) {
      element.appendChild(stripGroup('Suche', [removeChip(q, () => setFilter({ search: '' }))]));
    }
    element.appendChild(el('button', {
      className: 'vs-status__reset', type: 'button', onClick: () => resetFilter(),
    }, 'alle zurücksetzen'));
  }

  update();
  return { element, update };
}

/** The rule the grouping encodes, on every group label. */
const STRIP_TIP = 'Mehrere Werte: einer genügt (oder). '
  + 'Zwischen den Filtern: alle müssen zutreffen (und).';

function stripGroup(title, chips) {
  return el('div', { className: 'filter-strip__group' },
    el('span', {
      className: 'filter-strip__key', 'data-tip': STRIP_TIP, 'data-tip-wrap': '',
    }, title),
    ...chips);
}

/** Count of the cut in the root row: the share while a filter cuts, the plain
 *  base size while none does. */
export function countLabel(n, m) {
  return n < m ? `${n} von ${m}` : String(m);
}

function removeChip(text, onRemove) {
  return el('button', {
    className: 'fs-chip', type: 'button', title: `${text} aus dem Filter nehmen`,
    onClick: onRemove,
  },
    el('span', { className: 'fs-chip__label' }, text),
    el('span', { className: 'fs-chip__x' }, '×'));
}

function zeitSection(span) {
  const windowOf = () => {
    const zf = getFilter().zeitfenster;
    if (!Array.isArray(zf)) return [span.min, span.max];
    return [Math.max(span.min, zf[0] ?? span.min), Math.min(span.max, zf[1] ?? span.max)];
  };
  return {
    title: 'Zeitraum',
    titleActive: () => Array.isArray(getFilter().zeitfenster),
    controls: [{
      kind: 'range', min: span.min, max: span.max,
      from: () => windowOf()[0],
      to: () => windowOf()[1],
      onChange: (from, to) => {
        const full = from <= span.min && to >= span.max;
        setFilter({ zeitfenster: full ? null : [from, to] });
      },
    }],
  };
}

// ---------------------------------------------------------------------------
// (d) Die geteilten Facetten
// ---------------------------------------------------------------------------

/**
 * A shared facet as its own section: an open value set that only autocompletion
 * makes operable. Dokumenttyp is no section of its own, it hangs under the
 * result line.
 *
 * The title takes the accent colour while active. Selected values live only in
 * the chip strip above the data; repeating them or their count here would make
 * the same state compete in two places. A facet without any value in this
 * view's inventory collapses to its title line instead of showing an empty
 * control.
 */
function sharedFacetSection(store, key, inventory) {
  const meta = FACET_META[key] || { title: key };
  const entries = inventory || [];
  const empty = entries.length === 0;
  const selected = () => facetValues(getFilter(), key);
  // Belegzahlen are relative to the current cut, so a value states what it
  // would leave standing, not how often it occurs somewhere in the Bestand.
  const counts = () => facetCounts(store, getFilter(), key, flatValues(entries));

  return {
    title: meta.title,
    family: meta.family,
    marker: meta.marker,
    titleActive: () => selected().length > 0,
    collapsible: empty,
    collapsed: () => empty,
    controls: [{
      kind: 'facet', key, options: () => entries, counts, selected,
      placeholder: `${meta.title} filtern…`,
      onSelect: (values) => setFilter({ [key]: values }),
    }],
  };
}

/** Every selectable value of an inventory, group parents included. */
function flatValues(entries) {
  const out = [];
  for (const entry of entries || []) {
    out.push(entry.value);
    for (const child of entry.children || []) out.push(child.value);
  }
  return out;
}

/** Display form of a value from an inventory; the raw value if it has none. */
function labelIn(entries, value) {
  for (const entry of entries || []) {
    if (entry.value === value) return entry.label;
    for (const child of entry.children || []) if (child.value === value) return child.label;
  }
  return String(value);
}

/** The label with the matched query words in `mark`. */
function labelNode(label, query, className = 'fs-option__label') {
  const node = el('span', { className });
  const chars = [...String(label)];
  const ranges = query ? matchRanges(label, query) : [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) node.appendChild(document.createTextNode(chars.slice(at, start).join('')));
    node.appendChild(el('mark', {}, chars.slice(start, end).join('')));
    at = end;
  }
  node.appendChild(document.createTextNode(chars.slice(at).join('')));
  return node;
}

// ---------------------------------------------------------------------------
// Control-Fabriken — jede liefert { node, update? }
// ---------------------------------------------------------------------------

/**
 * Open value set: an input with suggestions below it. Selected values appear
 * only in the shared chip strip; the open list repeats them solely as checked
 * options so they can be toggled without creating a second persistent display.
 * Nothing is suggested before focus — the set is too large for a standing list
 * to say anything.
 *
 * `single` turns it into a chooser with exactly one selected value, which is
 * what the Karte needs for its Entität.
 */
function facetControl({
  key, options, counts, selected, onSelect, single = false, labelledBy, limit = OPTION_LIMIT,
  placeholder = '',
}) {
  const listId = `fs-list-${++listSeq}`;
  const list = el('div', { className: 'fs-options', role: 'listbox', id: listId });
  const inputAttrs = {
    type: 'search', className: 'fs-search', role: 'combobox',
    autocomplete: 'off', 'aria-autocomplete': 'list', 'aria-controls': listId,
    'aria-expanded': 'false', placeholder,
  };
  if (labelledBy) inputAttrs['aria-labelledby'] = labelledBy;
  const input = el('input', inputAttrs);
  // The list is anchored to the field so it opens without affecting the
  // surrounding facet rows.
  const field = el('div', { className: 'fs-facet__field' }, input, list);
  const node = el('div', { className: 'fs-facet' }, field);
  if (key) node.dataset.facet = key;

  let focused = false;
  let active = -1;      // highlighted suggestion
  let rows = [];        // { value, el } in list order

  input.addEventListener('focus', () => { focused = true; active = -1; paint(); });
  input.addEventListener('blur', () => { focused = false; paint(); });
  input.addEventListener('input', () => { active = -1; paint(); });
  input.addEventListener('keydown', onKeyDown);
  // Swallowed so the input keeps focus while an option is toggled.
  list.addEventListener('mousedown', (e) => e.preventDefault());

  const write = (values) => { onSelect(single ? values.slice(-1) : values); paint(); };
  const toggle = (value) => {
    const chosen = selected() || [];
    // The query is consumed by the choice; leaving it behind would make the
    // freshly checked option look like the only available value.
    input.value = '';
    active = -1;
    write(chosen.includes(value) ? chosen.filter(v => v !== value) : [...chosen, value]);
  };

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      input.value = '';
      active = -1;
      focused = false;
      paint();
      input.blur();
      e.preventDefault();
      return;
    }
    if (rows.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const step = e.key === 'ArrowDown' ? 1 : -1;
      active = (active + step + rows.length + (active === -1 && step === -1 ? 1 : 0)) % rows.length;
      paintActive();
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && active >= 0) {
      toggle(rows[active].value);
      e.preventDefault();
    }
  }

  function paintActive() {
    rows.forEach((row, i) => row.el.classList.toggle('fs-option--active', i === active));
    const row = rows[active];
    input.setAttribute('aria-activedescendant', row ? row.el.id : '');
    if (row) row.el.scrollIntoView({ block: 'nearest' });
  }

  function paint() {
    const entries = options() || [];
    const chosen = selected() || [];
    const countOf = counts ? counts() : null;
    const q = input.value.trim();

    clear(list);
    rows = [];
    const open = focused || q.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) { input.removeAttribute('aria-activedescendant'); return; }

    for (const entry of entries) {
      if (rows.length >= limit) break;
      if (!matchesQuery(entry.label, q)) continue;
      const n = countOf ? (countOf.get(entry.value) ?? 0) : entry.count;
      const on = chosen.includes(entry.value);
      if (countOf && n === 0 && !on) continue;
      const row = optionRow(entry, q, n, on, () => toggle(entry.value), true);
      rows.push({ value: entry.value, el: row });
      list.appendChild(row);
    }
    if (rows.length === 0) list.appendChild(el('div', { className: 'fs-more' }, 'kein Treffer'));
    if (active >= rows.length) active = rows.length - 1;
    paintActive();
  }

  paint();
  return { node, update: paint };
}

/**
 * One suggestion row of a listbox. `implied` marks a value the cut already
 * carries without it being chosen itself (a child of a selected Oberbegriff).
 * Such a row is information and no target: it keeps the muted check, stays
 * unselected for assistive technology and takes no click, because choosing it
 * would add a value the Oberbegriff already carries.
 */
function optionRow(entry, query, count, on, onClick, checkable = false, implied = false) {
  const row = el('div', {
    className: 'fs-option' + (checkable ? ' fs-option--checkable' : '')
      + (on ? ' fs-option--on' : '') + (implied ? ' fs-option--implied' : ''),
    role: 'option', id: `fs-opt-${++listSeq}`, 'aria-selected': String(on),
    ...(implied ? { 'aria-disabled': 'true' } : { onClick }),
  },
    checkable
      ? el('span', {
          className: 'fs-option__check' + (implied ? ' fs-option__check--implied' : ''),
          'aria-hidden': 'true',
        }, on || implied ? '✓' : '')
      : null,
    labelNode(entry.label, query),
    el('span', { className: 'fs-option__count' }, count ? String(count) : ''));
  return row;
}

/**
 * Dokumenttyp: the DFT tree stands open, because it is small and its shape is
 * the information. A group head is selectable when the broader term carries
 * records of its own; its chevron opens the leaves. Beyond OPTION_LIMIT rows
 * the list folds behind "mehr …". No search field: the closed set is short
 * enough that the chevrons and "mehr …" reach every value.
 */
function facetTreeControl({ key, options, counts, selected, onSelect }) {
  const tree = el('div', { className: 'fs-tree' });
  const more = el('button', { className: 'fs-more fs-more--button', type: 'button' });
  const node = el('div', { className: 'fs-facet fs-facet--tree' }, tree, more);
  if (key) node.dataset.facet = key;

  const opened = new Set();
  let expanded = false;

  more.addEventListener('click', () => { expanded = !expanded; paint(); });

  const write = (values) => { onSelect(values); paint(); };
  const toggle = (value) => {
    const chosen = selected() || [];
    write(chosen.includes(value) ? chosen.filter(v => v !== value) : [...chosen, value]);
  };

  function paint() {
    const entries = options() || [];
    const chosen = selected() || [];
    const countOf = counts ? counts() : null;
    const countFor = (entry) => (countOf ? (countOf.get(entry.value) ?? 0) : entry.count);

    clear(tree);
    let shown = 0;
    let hidden = 0;
    for (const entry of entries) {
      const kids = entry.children || [];
      // A synthetic group head (the DFT tree's "Sonstige") resolves to no leaf
      // of its own: it counts as the sum of its children and selecting it
      // selects them, otherwise the whole group vanishes from the facet.
      const ownCount = countFor(entry);
      const synthetic = ownCount === 0 && kids.length > 0;
      const groupCount = synthetic ? kids.reduce((n, c) => n + countFor(c), 0) : ownCount;
      const kidValues = kids.map(c => c.value);
      const groupOn = synthetic
        ? kidValues.length > 0 && kidValues.every(v => chosen.includes(v))
        : chosen.includes(entry.value);
      if (groupCount === 0 && !groupOn) continue;
      if (!expanded && shown >= OPTION_LIMIT) { hidden += 1; continue; }

      const isOpen = opened.has(entry.value) || kids.some(c => chosen.includes(c.value));
      const toggleGroup = () => {
        if (synthetic) {
          write(groupOn ? chosen.filter(v => !kidValues.includes(v))
            : [...chosen, ...kidValues.filter(v => !chosen.includes(v))]);
          return;
        }
        // The Oberbegriff already carries its leaves (expandDftFilter), so an
        // explicitly chosen child would stand redundantly in the strip.
        write(groupOn ? chosen.filter(v => v !== entry.value)
          : [...chosen.filter(v => !kidValues.includes(v)), entry.value]);
      };
      const kidTotal = kids.reduce((n, c) => n + countFor(c), 0);
      const head = groupRow(entry, groupCount, groupOn, isOpen,
        kids.length > 0,
        toggleGroup,
        () => { if (isOpen) opened.delete(entry.value); else opened.add(entry.value); paint(); },
        kids.length > 0 ? groupTip(groupCount, kidTotal) : '');
      tree.appendChild(head);
      shown += 1;
      if (!isOpen) continue;
      for (const child of kids) {
        const n = countFor(child);
        const childOn = chosen.includes(child.value);
        const implied = impliedByGroup(chosen, entry.value, child.value, synthetic);
        if (n === 0 && !childOn) continue;
        const row = optionRow(child, '', n, childOn,
          implied ? null : () => toggle(child.value), true, implied);
        row.classList.add('fs-option--child');
        tree.appendChild(row);
      }
    }
    // Without a query this is not a miss but an empty cut.
    if (shown === 0) tree.appendChild(el('div', { className: 'fs-more' }, 'nichts im Schnitt'));

    more.hidden = hidden === 0 && !expanded;
    more.textContent = expanded ? 'weniger' : `mehr … (${hidden})`;
  }

  paint();
  return { node, update: paint };
}

/**
 * A closed value set as standing rows: the row form of the tree, no search
 * field and no cut-off. A value with count zero stays visible, because the set
 * is the axis; a state that disappeared would read as one the Bestand does not
 * know.
 */
function optionListControl({ key, options, counts, selected, onSelect }) {
  const list = el('div', { className: 'fs-tree' });
  const node = el('div', { className: 'fs-facet fs-facet--tree' }, list);
  if (key) node.dataset.facet = key;

  const toggle = (value) => {
    const chosen = selected() || [];
    onSelect(chosen.includes(value) ? chosen.filter(v => v !== value) : [...chosen, value]);
    paint();
  };

  function paint() {
    const entries = options() || [];
    const chosen = selected() || [];
    const countOf = counts ? counts() : null;
    clear(list);
    for (const entry of entries) {
      const n = countOf ? (countOf.get(entry.value) ?? 0) : entry.count;
      list.appendChild(optionRow(entry, '', n, chosen.includes(entry.value),
        () => toggle(entry.value), true));
    }
  }

  paint();
  return { node, update: paint };
}

function groupRow(entry, count, on, isOpen, hasKids, onToggle, onOpen, tip = '') {
  const chevron = hasKids
    ? el('button', {
        className: 'fs-tree__chevron' + (isOpen ? ' fs-tree__chevron--open' : ''),
        type: 'button', 'aria-expanded': String(isOpen),
        'aria-label': isOpen ? 'Untertypen ausblenden' : 'Untertypen einblenden',
        // The row itself is the selection target, so opening must not select.
        onClick: (e) => { e.stopPropagation(); onOpen(); },
      }, '›')
    : el('span', { className: 'fs-tree__chevron fs-tree__chevron--none', 'aria-hidden': 'true' });
  const row = el('div', {
    className: 'fs-option fs-option--group' + (on ? ' fs-option--on' : ''),
    role: 'option', 'aria-selected': String(on), 'data-tip': tip, onClick: onToggle,
  },
    chevron,
    labelNode(entry.label, ''),
    el('span', { className: 'fs-option__check', 'aria-hidden': 'true' }, on ? '✓' : ''),
    el('span', { className: 'fs-option__count' }, count ? String(count) : ''));
  return row;
}

/**
 * A child of a selected Oberbegriff is in the cut without being chosen itself,
 * because recordsFor resolves the group over expandDftFilter. A synthetic group
 * writes its leaves into the selection instead, so nothing is implied there.
 */
export function impliedByGroup(chosen, groupValue, childValue, synthetic) {
  if (synthetic) return false;
  return chosen.includes(groupValue) && !chosen.includes(childValue);
}

/**
 * Tooltip of a group row. The tree only carries subtree totals (docTypeGroups
 * counts each node over expandDftFilter), so the count typed exactly as the
 * group is the total minus its children.
 */
export function groupTip(total, kidTotal) {
  return `${Math.max(total - kidTotal, 0)} direkt · ${kidTotal} in Untertypen`;
}

/** Farbcodierte Toggle-Chips (Legende als Filter). Die View definiert ueber
 *  isActive/onToggle, was "aktiv" bedeutet, das Modul bleibt semantik-frei. */
function legendControl({ items = [], isActive, onToggle }) {
  const wrap = el('div', { className: 'vs-legend', role: 'group' });
  const chips = [];
  for (const it of items) {
    const chip = el('button', { className: 'vs-chip', type: 'button', title: it.title || '' },
      el('span', { className: 'vs-chip__swatch' }),
      el('span', { className: 'vs-chip__label' }, it.label),
      it.count != null ? el('span', { className: 'vs-chip__count' }, String(it.count)) : null);
    chip.querySelector('.vs-chip__swatch').style.background = it.color || 'var(--color-text-tertiary)';
    chip.addEventListener('click', () => { if (onToggle) onToggle(it.id); refresh(); });
    chips.push({ el: chip, id: it.id });
    wrap.appendChild(chip);
  }
  function refresh() {
    for (const c of chips) {
      const on = isActive ? !!isActive(c.id) : true;
      c.el.classList.toggle('vs-chip--off', !on);
      c.el.setAttribute('aria-pressed', String(on));
    }
  }
  refresh();
  return { node: wrap, update: refresh };
}

/** Beidseitiges Jahresfenster: zwei Daumen auf einer Linie (zwei ueberlagerte
 *  native Range-Inputs, nur die Daumen sind klickbar). Die beiden Jahreszahlen
 *  stehen an den Enden der Schiene und wandern mit den Daumen — kein Zahlenfeld
 *  daneben, der Regler traegt seinen Zustand selbst. */
function rangeControl({ min, max, from, to, onChange }) {
  const wrap = el('div', { className: 'vs-range' });

  const fromR = el('input', { className: 'vs-range__input vs-range__input--from', type: 'range',
    'aria-label': 'Von', min: String(min), max: String(max), step: '1', value: String(from()) });
  const toR = el('input', { className: 'vs-range__input vs-range__input--to', type: 'range',
    'aria-label': 'Bis', min: String(min), max: String(max), step: '1', value: String(to()) });
  const fromLabel = el('span', { className: 'vs-range__end' }, String(from()));
  const toLabel = el('span', { className: 'vs-range__end vs-range__end--to' }, String(to()));

  wrap.appendChild(el('div', { className: 'vs-range__row' },
    fromLabel,
    el('div', { className: 'vs-range__dual' },
      el('div', { className: 'vs-range__rail' }), fromR, toR),
    toLabel));

  function sync() {
    const a = String(from()), b = String(to());
    fromR.value = a; toR.value = b;
    fromLabel.textContent = a;
    toLabel.textContent = b;
  }

  fromR.addEventListener('input', () => { onChange(Math.min(parseInt(fromR.value, 10), to()), to()); sync(); });
  toR.addEventListener('input', () => { onChange(from(), Math.max(parseInt(toR.value, 10), from())); sync(); });

  sync();
  return { node: wrap, update: sync };
}

/** Einzelner Schwellen-Slider mit Wertanzeige. */
function sliderControl({ label, min, max, step = 1, value, onChange, format }) {
  const fmt = v => (format ? format(v) : String(v));
  const valueEl = el('span', { className: 'vs-slider__value' }, fmt(value()));
  const input = el('input', { className: 'vs-slider__input', type: 'range',
    min: String(min), max: String(max), step: String(step), value: String(value()),
    'aria-label': label });
  input.addEventListener('input', () => {
    onChange(parseFloat(input.value));
    valueEl.textContent = fmt(value());
  });
  const node = el('label', { className: 'vs-slider' },
    el('span', { className: 'vs-slider__label' }, label),
    el('span', { className: 'vs-slider__row' }, input, valueEl));
  function update() { input.value = String(value()); valueEl.textContent = fmt(value()); }
  return { node, update };
}

/** Boolescher Schalter. */
function toggleControl({ label, value, onChange }) {
  const input = el('input', { type: 'checkbox' });
  if (value()) input.checked = true;
  input.addEventListener('change', () => onChange(input.checked));
  const node = el('label', { className: 'vs-toggle' }, input,
    el('span', { className: 'vs-toggle__label' }, label));
  function update() { input.checked = !!value(); }
  return { node, update };
}

/** Freitext-Suche. `debounce` (ms) buendelt onChange, wo ein Tastendruck einen
 *  teuren Rebuild ausloest; ohne Angabe meldet das Feld sofort. */
function searchControl({ value, onChange, debounce = 0, labelledBy, ariaLabel, placeholder }) {
  const attrs = { type: 'search', className: 'vs-search', value: value ? value() : '' };
  if (labelledBy) attrs['aria-labelledby'] = labelledBy;
  if (ariaLabel) attrs['aria-label'] = ariaLabel;
  if (placeholder) attrs.placeholder = placeholder;
  const input = el('input', attrs);
  let timer = null;
  input.addEventListener('input', () => {
    if (!debounce) { onChange(input.value); return; }
    if (timer) clearTimeout(timer);
    const v = input.value;
    timer = setTimeout(() => { timer = null; onChange(v); }, debounce);
  });
  function update() {
    if (value && document.activeElement !== input) input.value = value();
  }
  return { node: input, update };
}

/** Nicht-interaktive Erklaer-Legende. Marker kann eine Farbe oder eine
 *  view-eigene CSS-Klasse (Ringe, Linien) tragen, Text optional als HTML. */
function staticLegendControl({ rows = [] }) {
  const wrap = el('div', { className: 'vs-static' });
  for (const r of rows) {
    const marker = el('span', { className: 'vs-static__marker' + (r.markerClass ? ' ' + r.markerClass : '') });
    if (r.color) marker.style.background = r.color;
    const text = el('span', { className: 'vs-static__text' });
    if (r.html != null) text.innerHTML = r.html;
    else if (r.label != null) text.textContent = r.label;
    const row = el('div', { className: 'vs-static__row' }, marker, text);
    if (r.count != null) row.appendChild(el('span', { className: 'vs-static__count' }, String(r.count)));
    wrap.appendChild(row);
  }
  return { node: wrap };
}

/** Bespoke-Region. Entweder ein fertiger node, oder ein Container (mit
 *  optionaler id/className), den die View selbst fuellt. build()/update()
 *  laufen einmalig bzw. bei jedem Sidebar-update(). */
function customControl({ id, className, node, build, update }) {
  const region = node || el('div', { className: className || 'vs-custom' });
  if (id) region.id = id;
  if (build) build(region);
  return { node: region, update: update ? () => update(region) : undefined };
}

const FACTORIES = {
  facet: facetControl,
  facetTree: facetTreeControl,
  optionList: optionListControl,
  legend: legendControl,
  range: rangeControl,
  slider: sliderControl,
  toggle: toggleControl,
  search: searchControl,
  staticLegend: staticLegendControl,
  custom: customControl,
};
