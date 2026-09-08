/**
 * The shared facets of the filter column: their display form, the sections
 * `sidebar.js` assembles from them, and the tree and row-list controls that make a value set operable.
 *
 * The count beside a value and the implied check of a child stand here together
 * with their tooltips, because both state the same rule: the count counts
 * against the cut of all other facets, and a broader term carries its leaves.
 */

import { el, clear } from '../utils/dom.js';
import { getFilter, setFilter, facetValues, facetSelectionValues, buildFacetSelectionPatch } from './filter-state.js';
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

/** Rows shown before expanding the remaining facet values. */
export const OPTION_LIMIT = 8;

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

// Land folds at its title because its closed value set can run long. The
// Verknuepfung tree stays visible: its types and roles are a central research
// axis and its own two-level caps keep the column bounded.
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
  const selected = () => facetSelectionValues(getFilter(), 'verknuepfung');
  return {
    title: FACET_META.verknuepfung.title,
    tip: () => 'Die Typen der Verknüpfungstabelle, darunter ihre Rollen. Ein Typ '
      + 'meint jede seiner Rollen, und ein Dokument mit zwei Rollen desselben '
      + 'Typs zählt in beiden.\n' + countTip(selected().length > 0),
    titleActive: () => selected().length > 0,
    controls: [{
      kind: 'facetTree', key: 'verknuepfung', options: () => entries,
      counts: () => facetCounts(store, getFilter(), 'verknuepfung', flatValues(entries)),
      selected,
      onSelect: (values) => setFilter(buildFacetSelectionPatch(getFilter(), 'verknuepfung', values)),
    }],
  };
}

/** A collapsible facet list; selected values stay in the common filter strip. */
export function sharedFacetSection(store, key, inventory) {
  if (key === 'land') return landSection(store, inventory);
  if (key === 'verknuepfung') return linkSection(store, inventory);
  const meta = FACET_META[key] || { title: key };
  const entries = inventory || [];
  const selected = () => facetSelectionValues(getFilter(), key);
  // Belegzahlen are relative to the current cut, so a value states what it
  // would leave standing, not how often it occurs somewhere in the Bestand.
  const counts = () => facetCounts(store, getFilter(), key, flatValues(entries));

  return {
    title: meta.title,
    family: meta.family,
    tip: () => [meta.family ? `Symbol: Inhaltsfamilie ${meta.title}` : '',
      countTip(selected().length > 0)].filter(Boolean).join('\n'),
    titleActive: () => selected().length > 0,
    collapsible: true,
    collapsed: () => true,
    controls: [{
      kind: 'optionList', key, options: () => entries, counts, selected, limit: OPTION_LIMIT,
      onSelect: (values) => setFilter(buildFacetSelectionPatch(getFilter(), key, values)),
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
 * The tree of a closed value set with two levels, Dokumenttyp and Verknüpfung.
 * It stands without a search field, because its shape is the information and
 * the chevrons reach every value. A group head is selectable when the broader
 * term carries records of its own; its chevron opens the leaves.
 *
 * Both levels cap at OPTION_LIMIT and fold the rest behind "mehr …", the groups
 * once for the whole tree and the leaves per open group.
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

  const write = (values) => {
    const focused = tree.contains(document.activeElement) ? document.activeElement.closest('[data-value]')?.dataset.value : null;
    onSelect(values); paint();
    if (focused != null) tree.querySelector(`[data-value="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
  };
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
      const synthetic = entry.count === 0 && kids.length > 0;
      const groupCount = synthetic ? kids.reduce((n, c) => n + countFor(c), 0) : ownCount;
      const kidValues = kids.map(c => c.value);
      const groupOn = synthetic
        ? kidValues.length > 0 && kidValues.every(v => chosen.includes(v))
        : chosen.includes(entry.value);
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
      const leaves = kids;
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
export function optionListControl({ key, options, counts, selected, onSelect, limit = Infinity }) {
  const list = el('div', { className: 'fs-tree' });
  const node = el('div', { className: 'fs-facet fs-facet--tree' }, list);
  if (key) node.dataset.facet = key;
  let shown = limit;

  const toggle = (value) => {
    const chosen = selected() || [];
    const hadFocus = list.contains(document.activeElement);
    onSelect(chosen.includes(value) ? chosen.filter(v => v !== value) : [...chosen, value]);
    paint();
    if (hadFocus) list.querySelector(`[data-value="${CSS.escape(value)}"]`)?.focus({ preventScroll: true });
  };

  function paint() {
    const entries = options() || [];
    const chosen = selected() || [];
    const countOf = counts ? counts() : null;
    clear(list);
    const ordered = [...entries].sort((a, b) => Number(chosen.includes(b.value)) - Number(chosen.includes(a.value)));
    for (const entry of ordered.slice(0, shown)) {
      const n = countOf ? (countOf.get(entry.value) ?? 0) : entry.count;
      const row = optionRow(entry, '', n, chosen.includes(entry.value), () => toggle(entry.value), true);
      list.appendChild(row);
    }
    if (ordered.length > shown) list.appendChild(el('button', { type: 'button',
      className: 'fs-more fs-more--button', onClick: () => { shown += 50; paint(); } },
    `Weitere anzeigen (${ordered.length - shown})`));
    if (shown > limit) list.appendChild(el('button', { type: 'button',
      className: 'fs-more fs-more--button', onClick: () => { shown = limit; paint(); } }, 'Weniger anzeigen'));
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
