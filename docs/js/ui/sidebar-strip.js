/**
 * The chip strip above the data: the active values and the reset link. It
 * belongs to the filter column but hangs in the main area, because a chip in
 * the column would move every control below it.
 */

import { el, clear } from '../utils/dom.js';
import {
  getFilter, setFilter, resetFilter, facetValues, isFilterActive, deviatingKeys,
  undoFilter, redoFilter, filterHistoryStatus, removePredicate, buildFacetSelectionPatch,
} from './filter-state.js';
import { predicateLabel } from '../data/query-predicates.js';
import { FACET_META, labelIn } from './sidebar-facets.js';

/** Removable conditions remain grouped by facet to expose their OR/AND semantics. */
export function filterStrip(inventories, localChips) {
  const element = el('div', { className: 'filter-strip' });

  function update() {
    clear(element);
    // A view-local narrowing (the Karte's entity and country, E-223) deviates
    // from the default like a shared facet does, so it keeps the placeholder
    // away and belongs into the same reset.
    const local = (localChips() || []).filter(g => g && g.chips && g.chips.length);
    if (!isFilterActive() && local.length === 0) {
      element.appendChild(emptyHint());
      appendHistory();
      return;
    }
    const filter = getFilter();
    const deviating = new Set(deviatingKeys());
    for (const predicate of filter.predicates || []) {
      element.appendChild(stripGroup(predicate.type === 'invalid' ? 'Filter prüfen' : 'Bedingung',
        [removeChip(displayPredicate(predicate), () => removePredicate(predicate))]));
    }
    for (const [key, meta] of Object.entries(FACET_META)) {
      if (!deviating.has(key)) continue;
      const inventory = inventories.get(key) || [];
      const values = facetValues(filter, key).filter(value => !isImpliedLinkKind(filter, key, value));
      const chips = values.map(value =>
        removeChip(`${meta.title}: ${labelIn(inventory, value)}`,
          () => setFilter({ [key]: facetValues(getFilter(), key).filter(v => v !== value) })));
      if (chips.length > 0) element.appendChild(stripGroup(meta.title, chips));
    }
    if (deviating.has('zeitfenster') && Array.isArray(filter.zeitfenster)) {
      const [von, bis] = filter.zeitfenster;
      element.appendChild(stripGroup('Zeitraum',
        [removeChip(`Zeitraum: ${von}–${bis}`, () => setFilter({ zeitfenster: null }))]));
    }
    const q = (filter.search || '').trim();
    if (deviating.has('search') && q) {
      element.appendChild(stripGroup('Suche', [removeChip(`Text: „${q}“`, () => setFilter({ search: '' }))]));
    }
    for (const group of local) {
      element.appendChild(stripGroup(group.title,
        group.chips.map(c => removeChip(c.label, c.onRemove))));
    }
    const bindable = facetValues(filter, 'verknuepfung').some(value => {
      const family = value.split(':')[0];
      return value.includes(':') && ['ort', 'person', 'institution'].includes(family)
        && facetValues(filter, family).length;
    });
    if (bindable) element.appendChild(el('button', { type: 'button', className: 'vs-status__reset',
      onClick: () => setFilter(buildFacetSelectionPatch(getFilter(), 'verknuepfung',
        facetValues(getFilter(), 'verknuepfung'))) }, 'Dokument-Ko-Erwähnung → Rolle an Entität binden'));
    element.appendChild(el('button', {
      className: 'vs-status__reset', type: 'button',
      onClick: () => { for (const g of local) for (const c of g.chips) c.onRemove(); resetFilter(); },
      html: RESET_GLYPH,
    }, el('span', {}, 'alle zurücksetzen')));
    appendHistory();
  }

  function appendHistory() {
    const state = filterHistoryStatus();
    const undo = el('button', { type: 'button', className: 'filter-history__button',
      onClick: undoFilter }, 'Filter rückgängig');
    const redo = el('button', { type: 'button', className: 'filter-history__button',
      onClick: redoFilter }, 'Filter wiederherstellen');
    undo.disabled = !state.canUndo;
    redo.disabled = !state.canRedo;
    element.append(el('span', { className: 'filter-history', role: 'group', 'aria-label': 'Filterverlauf' }, undo, redo));
  }

  function displayPredicate(predicate) {
    if (predicate.type === 'entity-role') {
      const roles = predicate.roles.map(role => labelIn(inventories.get('verknuepfung') || [], `${predicate.family}:${role}`));
      return `${FACET_META[predicate.family]?.title || ''}: ${predicate.entities.join(' oder ')} · ${roles.join(' oder ')}`;
    }
    if (predicate.type === 'set-membership') {
      const label = item => `${FACET_META[item.facet]?.title || item.facet}: ${labelIn(inventories.get(item.facet) || [], item.value)}`;
      const included = predicate.include.map(label).join(' und ');
      const excluded = predicate.exclude.map(label).join(', ');
      return [included, excluded ? `ohne ${excluded}` : ''].filter(Boolean).join(' · ');
    }
    if (predicate.type === 'records' && predicate.ids.length === 1) {
      return `Dokument ${predicate.ids[0].replace(/^m3gim-data:/, '')}`;
    }
    return predicateLabel(predicate);
  }

  update();
  return { element, update };
}

function isImpliedLinkKind(filter, key, value) {
  return key === 'verknuepfung' && ['ort', 'person', 'institution', 'werk'].includes(value)
    && facetValues(filter, value).length > 0;
}

/** Circular arrow before the reset link, in the tone of the chips' close
 *  crosses: the link keeps its text, the glyph only makes it findable at the
 *  end of a long chip row. */
const RESET_GLYPH = '<svg class="vs-status__reset-icon" width="14" height="14"'
  + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
  + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';

/**
 * The strip while no filter deviates from the default. Design rule 8 forbids
 * standing explanatory text; the Projektleitung waives it here (2026-09-04),
 * because an empty band above the data reads as a broken control rather than as
 * an untouched filter. One quiet line, no chip and no button, and the tooltip
 * carries where the filters actually live.
 */
function emptyHint() {
  return el('span', {
    className: 'filter-strip__empty',
    dataset: { tip: 'Die gemeinsame Suche und die linke Filterspalte wählen Dokumente aus.', tipWrap: '', tipPos: 'bottom-left' },
    html: FILTER_GLYPH,
  }, el('span', {}, 'kein Filter aktiv'));
}

const FILTER_GLYPH = '<svg class="filter-strip__empty-icon" width="14" height="14"'
  + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
  + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>';

/** The rule the grouping encodes, on every group label. */
const STRIP_TIP = 'Mehrere Werte: einer genügt (oder). '
  + 'Zwischen den Filtern: alle müssen zutreffen (und).';

function stripGroup(title, chips) {
  return el('div', { className: 'filter-strip__group' },
    el('span', {
      className: 'filter-strip__key', 'data-tip': STRIP_TIP, 'data-tip-wrap': '',
      // The strip sits on the top edge of the scroll area, so a tip above it
      // would vanish under the brand band; everything in the strip tips down.
      'data-tip-pos': 'bottom-left',
    }, title),
    ...chips);
}

function removeChip(text, onRemove) {
  return el('button', {
    className: 'fs-chip', type: 'button', 'data-tip': 'Aus dem Filter nehmen',
    'data-tip-pos': 'bottom-left',
    onClick: onRemove,
  },
    el('span', { className: 'fs-chip__label' }, text),
    el('span', { className: 'fs-chip__x' }, '×'));
}
