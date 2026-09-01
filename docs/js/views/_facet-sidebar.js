/**
 * Die eine linke Filter-Sidebar, die jede Visualisierung traegt.
 *
 * Bis hierher trug jede Ansicht ihre Filter woanders: der Bestand in einer
 * Kopfleiste, Netzwerk und Karte in je eigenen Sidebars, der Verknuepfungsgraph
 * in einer Controls-Zeile ueber dem Bild. Wer denselben Schnitt in zwei Tabs
 * setzen wollte, musste zwei verschiedene Bedienungen lernen. Diese Komponente
 * baut die Facetten aus `facetInventory` und schreibt in den geteilten Filter,
 * sodass jede Ansicht dieselbe Spalte an derselben Stelle zeigt.
 *
 * Aufbau der Spalte, von oben:
 *   1. Suche und Scope-Umschalter, die Zaehlwerte stehen in den Segmenten.
 *   2. Die Facetten mit Mehrfachauswahl und entfernbaren Chips. Werte kommen
 *      ausschliesslich aus store.* ueber facetInventory, nie aus einer
 *      redaktionellen Liste (E-87).
 *   3. Zeitfenster und Schaerfegrad.
 *   4. View-eigene Sektionen (Fokus, Knotentypen, Legende). `leadSections`
 *      stehen vor den Facetten, `sections` dahinter.
 *   5. Zuruecksetzen am Fuss.
 *
 * Die Ansicht bleibt Eigentuemerin ihres lokalen States. Die Sidebar schreibt
 * ausschliesslich in `filter-state.js` und abonniert den geteilten Filter
 * selbst; jede Aenderung, ob aus dieser Spalte oder aus einer anderen Ansicht,
 * kommt als ein einziger `onChange`-Aufruf an. Die Ansicht zeichnet daraufhin
 * neu und ruft `update()`, das die Controls am geteilten State nachzieht. Genau
 * ein Weg, damit ein Klick nicht zwei Renderlaeufe ausloest.
 * `destroy()` meldet das Abonnement ab, wenn die Ansicht ihre Spalte neu baut.
 */

import { el, clear } from '../utils/dom.js';
import { createSidebar } from '../ui/sidebar.js';
import {
  getFilter, setFilter, resetFilter, subscribe, facetValues, isFilterActive,
} from '../ui/filter-state.js';
import { facetInventory, docTypeGroups } from '../data/records-for.js';
import { dftLabel } from '../utils/format.js';

/**
 * Anzeigeform der Facetten. Die Reihenfolge ist die der Spalte und folgt der
 * Vorgabe der Projektleitung vom 2026-08-31.
 */
export const FACET_META = Object.freeze({
  docType:     { title: 'Dokumenttyp', placeholder: 'Dokumenttyp suchen…' },
  person:      { title: 'Person',      placeholder: 'Person suchen…' },
  ort:         { title: 'Ort',         placeholder: 'Ort suchen…' },
  werk:        { title: 'Werk',        placeholder: 'Werk suchen…' },
  institution: { title: 'Institution', placeholder: 'Institution suchen…' },
  rolle:       { title: 'Rolle',       placeholder: 'Rolle suchen…' },
});

export const DEFAULT_FACETS = Object.freeze(['person', 'ort', 'werk', 'institution', 'rolle']);

/** Suggestions shown per facet while the input has focus. The sidebar must fit
 *  one screen without scrolling, so the lists open as dropdowns and stay short;
 *  the long tail is reached by typing. */
const OPTION_LIMIT = 8;

/**
 * Dropdown behaviour of a facet: suggestions appear on focus or while typing
 * and close on blur. Returns a getter for the open state. Mousedown inside the
 * list is swallowed so the input keeps focus while an option is toggled.
 */
function dropdown(search, options, repaint) {
  let focused = false;
  search.addEventListener('focus', () => { focused = true; repaint(); });
  search.addEventListener('blur', () => { focused = false; repaint(); });
  options.addEventListener('mousedown', (e) => e.preventDefault());
  return () => focused || search.value.trim().length > 0;
}

const SCHAERFE_OPTIONS = [
  { value: 'weit', label: 'weit',
    tip: 'Weit: im selben Dokument genannt. Ko-Okkurrenz, kein Auftrittsnachweis.' },
  { value: 'eng', label: 'eng',
    tip: 'Eng: raumzeitlich verortet oder ueber eine Auffuehrung belegt.' },
];

/**
 * @param {Object} store
 * @param {Object} opts
 * @param {string[]} [opts.facets]          Facettenschluessel in Spaltenreihenfolge
 * @param {{min:number, max:number}} opts.yearSpan
 * @param {() => {ids:Set<string>, weit:number, eng:number}} opts.getResult
 *   Die aktuelle Dokumentmenge der Ansicht (Ergebnis von recordsFor), fuer
 *   Zaehlstand und Deckungsangabe.
 * @param {Array} [opts.leadSections]       View-eigene Sektionen vor den Facetten
 * @param {Array} [opts.sections]           View-eigene Sektionen nach dem Schaerfegrad
 * @param {boolean} [opts.showSearch]       Freitext-Suchfeld ganz oben (Bestand/
 *   Chronik). Schreibt `search` in den geteilten Filter.
 * @param {{counts: () => {fein:number, gesamt:number}}} [opts.scope]
 *   Blendet den Scope-Umschalter Feinerschlossen/Gesamt mit sichtbaren
 *   Zaehlwerten ein (E-116/E-157). `counts` liefert die beiden Groessen.
 * @param {boolean} [opts.showZeit=true]    Zeitregler zeigen.
 * @param {boolean} [opts.showSchaerfe=true] Schaerfegrad-Segment zeigen.
 * @param {() => void} opts.onChange        nach jeder Filteraenderung, egal
 *   ob sie aus dieser Spalte oder aus einer anderen Ansicht kam
 * @returns {{element: HTMLElement, update: () => void, destroy: () => void}}
 */
export function buildFacetSidebar(store, {
  facets = DEFAULT_FACETS,
  yearSpan,
  getResult,
  leadSections = [],
  sections = [],
  showSearch = false,
  scope = null,
  showZeit = true,
  showSchaerfe = true,
  onChange = () => {},
} = {}) {
  const span = yearSpan || { min: 1900, max: 2009 };
  const inventories = new Map();
  for (const key of facets) {
    // Der Dokumenttyp traegt die DFT-Baumgruppen als gruppierte Vorschlaege;
    // die uebrigen Facetten eine flache Werteliste aus facetInventory.
    inventories.set(key, key === 'docType'
      ? docTypeGroups(store)
      : facetInventory(store, key));
  }
  // Je Facette die Zeichenfunktion, damit sidebar.update() sie ohne Umweg
  // ueber das DOM erreicht.
  const painters = new Map();

  // Die Controls schreiben nur; die Meldung an die Ansicht kommt ueber das
  // Abonnement weiter unten. Ein zweiter Weg wuerde jeden Klick doppelt
  // rendern lassen.
  const notify = () => {};

  // Freitext-Suche ganz oben (Bestand/Chronik). Sie schreibt `search` in den
  // geteilten Filter; die View filtert Signatur/Titel/Typ/Datum daraus.
  const searchSection = showSearch ? {
    controls: [{
      kind: 'custom', className: 'fs-searchbar',
      build: region => buildSearch(region, notify),
      update: region => refreshSearch(region),
    }],
  } : null;

  // Scope-Umschalter mit sichtbaren Zaehlwerten im Bedienelement (E-156):
  // Feinerschlossen zeigt nur erschlossene Bestaende, Gesamt alle (E-157).
  const scopeSection = scope ? {
    title: 'Umfang',
    controls: [{
      kind: 'custom', className: 'fs-scope',
      build: region => buildScope(region, scope, notify),
      update: region => refreshScope(region, scope),
    }],
  } : null;

  const facetSections = facets.map(key => ({
    title: FACET_META[key] ? FACET_META[key].title : key,
    controls: [{
      kind: 'custom', className: 'fs-facet',
      build: region => painters.set(key, key === 'docType'
        ? buildDocTypeFacet(region, inventories.get(key), notify, store)
        : buildFacet(region, key, inventories.get(key), notify)),
      update: () => { const paint = painters.get(key); if (paint) paint(); },
    }],
  }));

  const zeitSection = {
    // Der lexikalische Gate in shared-filter-reach.test.mjs erkennt einen
    // Zeitregler an genau diesem Titel.
    title: 'Zeitraum',
    controls: [{
      kind: 'range', min: span.min, max: span.max, fullLabel: true,
      from: () => windowOf(span)[0],
      to: () => windowOf(span)[1],
      onChange: (from, to) => {
        const full = from <= span.min && to >= span.max;
        setFilter({ zeitfenster: full ? null : [from, to] });
        notify();
      },
    }],
  };

  const schaerfeSection = {
    title: 'Schärfegrad',
    controls: [{
      kind: 'custom', className: 'fs-schaerfe',
      build: region => buildSchaerfe(region, getResult, notify),
      update: region => refreshSchaerfe(region, getResult),
    }],
  };

  const resetSection = {
    stickFooter: true,
    controls: [{
      kind: 'custom', className: 'fs-reset',
      build: region => buildReset(region, notify),
      update: region => refreshReset(region),
    }],
  };

  const sidebar = createSidebar({
    sections: [searchSection, scopeSection, ...leadSections,
      ...facetSections,
      showZeit ? zeitSection : null,
      showSchaerfe ? schaerfeSection : null,
      ...sections, resetSection],
  });
  sidebar.element.classList.add('facet-sidebar');

  // Ein Schnitt aus einer anderen Ansicht muss hier ankommen, ohne dass der
  // Konsument daran denken muss; sonst zeigt die Spalte einen Zustand, den der
  // geteilte Filter nicht mehr hat.
  const unsubscribe = subscribe(() => onChange(), { immediate: false });

  return {
    element: sidebar.element,
    update: sidebar.update,
    destroy: unsubscribe,
  };
}

// --- Freitext-Suche -------------------------------------------------------

function buildSearch(region, notify) {
  const input = el('input', {
    type: 'search', className: 'fs-search fs-search--wide',
    placeholder: 'Suche (Signatur, Titel, Typ, Datum…)',
    'aria-label': 'Bestand durchsuchen',
    value: getFilter().search || '',
  });
  input.addEventListener('input', () => {
    setFilter({ search: input.value });
    notify();
  });
  region.appendChild(input);
  region._input = input;
}

function refreshSearch(region) {
  const input = region._input || region.querySelector('.fs-search');
  if (input && input.value !== (getFilter().search || '')) {
    input.value = getFilter().search || '';
  }
}

// --- Scope (Feinerschlossen / Gesamt) -------------------------------------

const SCOPE_OPTIONS = [
  { value: 'fein', label: 'Feinerschlossen',
    tip: 'Nur erschlossene Einheiten (mindestens eine Verknüpfung).' },
  { value: 'gesamt', label: 'Gesamt',
    tip: 'Alle Bestände, auch nicht erschlossene, Plakate und Tonträger.' },
];

function buildScope(region, scope, notify) {
  for (const opt of SCOPE_OPTIONS) {
    region.appendChild(el('button', {
      className: 'fs-seg fs-scope__seg', type: 'button',
      dataset: { value: opt.value, tip: opt.tip, tipWrap: '' },
      onClick: () => { setFilter({ scope: opt.value }); notify(); },
    },
      el('span', { className: 'fs-scope__label' }, opt.label),
      el('span', { className: 'fs-scope__count' }, '')));
  }
  refreshScope(region, scope);
}

function refreshScope(region, scope) {
  const active = getFilter().scope || 'fein';
  const counts = scope && scope.counts ? scope.counts() : { fein: 0, gesamt: 0 };
  for (const btn of region.querySelectorAll('.fs-scope__seg')) {
    const on = btn.dataset.value === active;
    btn.classList.toggle('fs-seg--on', on);
    btn.setAttribute('aria-pressed', String(on));
    const countEl = btn.querySelector('.fs-scope__count');
    if (countEl) countEl.textContent = String(counts[btn.dataset.value] ?? '');
  }
}

// --- Dokumenttyp-Facette (Baumgruppen als gruppierte Vorschlaege) ---------

function buildDocTypeFacet(region, groups, notify, store) {
  const chips = el('div', { className: 'fs-chips' });
  const options = el('div', { className: 'fs-options' });
  const search = el('input', {
    type: 'search', className: 'fs-search',
    placeholder: FACET_META.docType.placeholder,
    'aria-label': 'Dokumenttyp filtern',
  });
  region.dataset.facet = 'docType';
  region.append(search, chips, options);
  const open = dropdown(search, options, () => paint());

  const write = (values) => { setFilter({ docType: values }); notify(); };
  const labelOf = (value) => {
    for (const g of groups) {
      if (g.value === value) return g.label;
      const c = (g.children || []).find(x => x.value === value);
      if (c) return c.label;
    }
    return dftLabel(store, value) || value;
  };

  search.addEventListener('input', () => paint());

  function paint() {
    const selected = facetValues(getFilter(), 'docType');
    const q = search.value.trim().toLowerCase();

    clear(chips);
    for (const value of selected) {
      chips.appendChild(el('button', {
        className: 'fs-chip', type: 'button',
        title: `${labelOf(value)} aus dem Filter nehmen`,
        onClick: () => write(selected.filter(v => v !== value)),
      },
        el('span', { className: 'fs-chip__label' }, labelOf(value)),
        el('span', { className: 'fs-chip__x' }, '×')));
    }
    chips.hidden = selected.length === 0;

    clear(options);
    options.hidden = !open();
    const match = (label) => !q || label.toLowerCase().includes(q);
    let shown = 0;
    for (const group of groups) {
      const kids = (group.children || []).filter(c => match(c.label));
      const groupHits = match(group.label);
      if (!groupHits && kids.length === 0) continue;
      // Gruppenkopf: selektierbar, wenn der Oberbegriff selbst Belege traegt
      // (expandDftFilter loest ihn in recordsFor auf seine Blaetter auf).
      const groupSelectable = group.count > 0;
      const gOn = selected.includes(group.value);
      options.appendChild(el('button', {
        className: 'fs-option fs-option--group' + (gOn ? ' fs-option--on' : '')
          + (groupSelectable ? '' : ' fs-option--head'),
        type: 'button', disabled: !groupSelectable,
        'aria-pressed': String(gOn),
        onClick: groupSelectable ? () => write(gOn
          ? selected.filter(v => v !== group.value)
          : [...selected, group.value]) : undefined,
      },
        el('span', { className: 'fs-option__label' }, group.label),
        el('span', { className: 'fs-option__count' }, String(group.count || ''))));
      shown += 1;
      for (const child of kids) {
        const on = selected.includes(child.value);
        options.appendChild(el('button', {
          className: 'fs-option fs-option--child' + (on ? ' fs-option--on' : ''),
          type: 'button', 'aria-pressed': String(on),
          onClick: () => write(on
            ? selected.filter(v => v !== child.value)
            : [...selected, child.value]),
        },
          el('span', { className: 'fs-option__label' }, child.label),
          el('span', { className: 'fs-option__count' }, String(child.count))));
        shown += 1;
      }
    }
    if (shown === 0) {
      options.appendChild(el('div', { className: 'fs-more' }, 'kein Treffer'));
    }
  }

  paint();
  return paint;
}

// --- Facette --------------------------------------------------------------

function buildFacet(region, key, inventory, notify) {
  const meta = FACET_META[key] || {};
  const chips = el('div', { className: 'fs-chips' });
  const options = el('div', { className: 'fs-options' });
  const search = el('input', {
    type: 'search', className: 'fs-search',
    placeholder: meta.placeholder || 'Suchen…',
    'aria-label': `${meta.title || key} filtern`,
  });

  region.dataset.facet = key;
  region.append(search, chips, options);
  const open = dropdown(search, options, () => paint());

  const write = (values) => { setFilter({ [key]: values }); notify(); };

  search.addEventListener('input', () => paint());

  function paint() {
    const selected = facetValues(getFilter(), key);
    const q = search.value.trim().toLowerCase();

    clear(chips);
    for (const value of selected) {
      const entry = inventory.find(e => e.value === value);
      chips.appendChild(el('button', {
        className: 'fs-chip', type: 'button',
        title: `${entry ? entry.label : value} aus dem Filter nehmen`,
        onClick: () => write(selected.filter(v => v !== value)),
      },
        el('span', { className: 'fs-chip__label' }, entry ? entry.label : value),
        el('span', { className: 'fs-chip__x' }, '×')));
    }
    chips.hidden = selected.length === 0;

    const matched = q
      ? inventory.filter(e => e.label.toLowerCase().includes(q))
      : inventory;
    clear(options);
    options.hidden = !open();
    for (const entry of matched.slice(0, OPTION_LIMIT)) {
      const on = selected.includes(entry.value);
      options.appendChild(el('button', {
        className: 'fs-option' + (on ? ' fs-option--on' : ''),
        type: 'button',
        'aria-pressed': String(on),
        onClick: () => write(on
          ? selected.filter(v => v !== entry.value)
          : [...selected, entry.value]),
      },
        el('span', { className: 'fs-option__label' }, entry.label),
        el('span', { className: 'fs-option__count' }, String(entry.count))));
    }
    if (matched.length === 0) {
      options.appendChild(el('div', { className: 'fs-more' }, 'kein Treffer'));
    }
  }

  paint();
  return paint;
}

// --- Schaerfegrad ---------------------------------------------------------

function buildSchaerfe(region, getResult, notify) {
  for (const opt of SCHAERFE_OPTIONS) {
    region.appendChild(el('button', {
      className: 'fs-seg fs-scope__seg', type: 'button',
      dataset: { value: opt.value, tip: opt.tip, tipWrap: '' },
      onClick: () => { setFilter({ schaerfe: opt.value }); notify(); },
    },
      el('span', { className: 'fs-scope__label' }, opt.label),
      el('span', { className: 'fs-scope__count' }, '')));
  }
  refreshSchaerfe(region, getResult);
}

/** The counts sit in the segments themselves (E-156): the wide count and its
 *  spatiotemporally or performance-backed subset, so the difference between
 *  the two degrees stays visible without a status line. */
function refreshSchaerfe(region, getResult) {
  const active = getFilter().schaerfe;
  const result = getResult ? getResult() : null;
  const counts = result ? { weit: result.weit, eng: result.eng } : {};
  for (const btn of region.querySelectorAll('.fs-seg')) {
    const on = btn.dataset.value === active;
    btn.classList.toggle('fs-seg--on', on);
    btn.setAttribute('aria-pressed', String(on));
    const countEl = btn.querySelector('.fs-scope__count');
    if (countEl) countEl.textContent = counts[btn.dataset.value] ?? '';
  }
}

// --- Zuruecksetzen --------------------------------------------------------

function buildReset(region, notify) {
  region.appendChild(el('button', {
    className: 'fs-clear', type: 'button',
    onClick: () => { resetFilter(); notify(); },
  }, '× Filter zurücksetzen'));
  refreshReset(region);
}

function refreshReset(region) {
  const btn = region.querySelector('.fs-clear');
  if (btn) btn.disabled = !isFilterActive();
}

// --- Hilfen ---------------------------------------------------------------

/** Das aktive Zeitfenster, auf die Spanne der Ansicht geklemmt. */
function windowOf(span) {
  const zf = getFilter().zeitfenster;
  if (!Array.isArray(zf)) return [span.min, span.max];
  return [
    Math.max(span.min, zf[0] ?? span.min),
    Math.min(span.max, zf[1] ?? span.max),
  ];
}
