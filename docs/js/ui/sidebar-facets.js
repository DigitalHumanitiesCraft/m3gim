/**
 * The shared facets of the filter column: their display form, the sections
 * `sidebar.js` assembles from them, and the three control factories that make a
 * value set operable (open facet with suggestions, tree, closed row list).
 *
 * The count beside a value and the implied check of a child stand here together
 * with their tooltips, because both state the same rule: the count counts
 * against the cut of all other facets, and a broader term carries its leaves.
 */

import { el, clear } from '../utils/dom.js';
import { matchesQuery } from '../utils/normalize.js';
import { getFilter, setFilter, facetValues } from './filter-state.js';
import { facetInventory, facetCounts } from '../data/records-for.js';
import { optionRow, groupRow } from './sidebar-options.js';

/**
 * Display form of the shared facets, in column order (Projektleitung,
 * 2026-09-03). The title is the accessible label of the input. `family` names
 * the content family whose symbol precedes the title, the same symbol the
 * block titles of the inline detail and the Indizes heads carry (E-212).
 */
export const FACET_META = Object.freeze({
  docType:      { title: 'Dokumenttyp' },
  person:       { title: 'Person', family: 'person' },
  ort:          { title: 'Ort', family: 'ort' },
  land:         { title: 'Land' },
  werk:         { title: 'Werk', family: 'werk' },
  institution:  { title: 'Institution', family: 'institution' },
  verknuepfung: { title: 'Verknüpfung' },
});

/** The shared facets every view carries, in column order. */
export const SHARED_FACETS = Object.freeze([
  'docType', 'person', 'ort', 'land', 'werk', 'institution', 'verknuepfung',
]);

/** Suggestions shown per open facet while the input has focus, and rows shown
 *  in the Dokumenttyp list before "mehr …". The column must fit one screen. */
export const OPTION_LIMIT = 8;

let listSeq = 0;

/**
 * What the number next to a value means. It counts against the cut of all
 * OTHER facets (facetCounts drops the own key), so within a facet that already
 * carries a value the number is what the value would add, and in an untouched
 * facet what would remain.
 */
export function countTip(hasSelection) {
  return hasSelection
    ? 'Die Zahl nennt die Dokumente, die dieser Wert zusätzlich in den Schnitt bringt.'
    : 'Die Zahl nennt die Dokumente, die mit diesem Wert im Schnitt blieben.';
}

// Land and Verknuepfung fold at their title. Both are long, and seven open
// sections would push the column past one screen — the reason E-240 already
// folds the view-owned sections.
const startsFolded = { collapsible: true, collapsed: () => true };

/**
 * The country as a closed value set in the row form of the tree. It counts the
 * documents whose places are geocoded to that country, every place role
 * included; the head names that rule, because the Karte's own reach list, which
 * counted evidence of presence only (E-224), is gone with it.
 */
export function landSection(store, inventory) {
  const entries = inventory || [];
  const selected = () => facetValues(getFilter(), 'land');
  return {
    title: FACET_META.land.title,
    tip: () => 'Dokumente, deren Orte in diesem Land liegen. Jede Ortsrolle zählt, '
      + 'Nennung wie Aufenthalt, und ein adressgenauer Ort erbt das Land seiner '
      + 'Stadt.\n' + countTip(selected().length > 0),
    titleActive: () => selected().length > 0,
    ...startsFolded,
    controls: [{
      kind: 'optionList', key: 'land', options: () => entries,
      counts: () => facetCounts(store, getFilter(), 'land', entries.map(e => e.value)),
      selected,
      onSelect: (values) => setFilter({ land: values }),
    }],
  };
}

/**
 * Verknuepfungstyp and role as the tree of the Dokumenttyp: the type with its
 * documents, its roles as children. Choosing a type means any role of it.
 */
export function linkSection(store, inventory) {
  const entries = inventory || [];
  const selected = () => facetValues(getFilter(), 'verknuepfung');
  return {
    title: FACET_META.verknuepfung.title,
    tip: () => 'Die Typen der Verknüpfungstabelle, darunter ihre Rollen. Ein Typ '
      + 'meint jede seiner Rollen, und ein Dokument mit zwei Rollen desselben '
      + 'Typs zählt in beiden.\n' + countTip(selected().length > 0),
    titleActive: () => selected().length > 0,
    ...startsFolded,
    controls: [{
      kind: 'facetTree', key: 'verknuepfung', options: () => entries,
      counts: () => facetCounts(store, getFilter(), 'verknuepfung', flatValues(entries)),
      selected,
      onSelect: (values) => setFilter({ verknuepfung: values }),
    }],
  };
}

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
export function sharedFacetSection(store, key, inventory) {
  if (key === 'land') return landSection(store, inventory);
  if (key === 'verknuepfung') return linkSection(store, inventory);
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
    tip: () => [meta.family ? `Symbol: Inhaltsfamilie ${meta.title}` : '',
      countTip(selected().length > 0)].filter(Boolean).join('\n'),
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
export function flatValues(entries) {
  const out = [];
  for (const entry of entries || []) {
    out.push(entry.value);
    for (const child of entry.children || []) out.push(child.value);
  }
  return out;
}

/** Display form of a value from an inventory; the raw value if it has none. */
export function labelIn(entries, value) {
  for (const entry of entries || []) {
    if (entry.value === value) return entry.label;
    for (const child of entry.children || []) if (child.value === value) return child.label;
  }
  return String(value);
}

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
export function facetControl({
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
 * The tree of a closed value set with two levels, Dokumenttyp and Verknüpfung.
 * It stands without a search field, because its shape is the information and
 * the chevrons reach every value. A group head is selectable when the broader
 * term carries records of its own; its chevron opens the leaves.
 *
 * Both levels cap at OPTION_LIMIT and fold the rest behind "mehr …", the groups
 * once for the whole tree and the leaves per open group. Without the second cap
 * the 36 roles of the Verknüpfungstyp Person alone made the column scroll,
 * which design rule 2 forbids.
 */
export function facetTreeControl({ key, options, counts, selected, onSelect }) {
  const tree = el('div', { className: 'fs-tree' });
  const more = el('button', { className: 'fs-more fs-more--button', type: 'button' });
  const node = el('div', { className: 'fs-facet fs-facet--tree' }, tree, more);
  if (key) node.dataset.facet = key;

  const opened = new Set();
  const shownInFull = new Set();   // groups whose leaves stand without the cap
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
      // The Verknuepfung tree states its rule at the section head and hands an
      // empty tip down, because its type count is not the sum of its roles.
      const tip = entry.tip != null ? entry.tip
        : (kids.length > 0 ? groupTip(groupCount, kidTotal) : '');
      const head = groupRow(entry, groupCount, groupOn, isOpen,
        kids.length > 0,
        toggleGroup,
        () => { if (isOpen) opened.delete(entry.value); else opened.add(entry.value); paint(); },
        tip);
      tree.appendChild(head);
      shown += 1;
      if (!isOpen) continue;
      // A leaf with count zero that nobody chose is out of the cut and out of
      // the list, so the cap counts what is really there.
      const leaves = kids.filter(child =>
        countFor(child) > 0 || chosen.includes(child.value));
      const full = shownInFull.has(entry.value);
      const visible = full ? leaves : leaves.slice(0, OPTION_LIMIT);
      for (const child of visible) {
        const childOn = chosen.includes(child.value);
        const implied = impliedByGroup(chosen, entry.value, child.value, synthetic);
        const row = optionRow(child, '', countFor(child), childOn,
          implied ? null : () => toggle(child.value), true, implied);
        row.classList.add('fs-option--child');
        tree.appendChild(row);
      }
      const restLeaves = leaves.length - visible.length;
      if (restLeaves > 0 || full) {
        tree.appendChild(el('button', {
          className: 'fs-more fs-more--button fs-more--child', type: 'button',
          onClick: () => {
            if (full) shownInFull.delete(entry.value); else shownInFull.add(entry.value);
            paint();
          },
        }, full ? 'weniger' : `mehr … (${restLeaves})`));
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
export function optionListControl({ key, options, counts, selected, onSelect }) {
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
