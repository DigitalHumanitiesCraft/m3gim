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
 *   1. Status- und Legenden-Schlitz. Zaehlstand der gefilterten Dokumentmenge,
 *      Deckungsangabe (ui/coverage.js) und der Schaerfegrad als Badge mit
 *      erklaerendem Tooltip. Die Ansicht kann eigene Zeilen beisteuern.
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
import { coverage } from '../ui/coverage.js';
import {
  getFilter, setFilter, resetFilter, subscribe, facetValues, isFilterActive,
} from '../ui/filter-state.js';
import { facetInventory } from '../data/records-for.js';

/**
 * Anzeigeform der Facetten. Die Reihenfolge ist die der Spalte und folgt der
 * Vorgabe der Projektleitung vom 2026-08-31.
 */
export const FACET_META = Object.freeze({
  person:      { title: 'Person',      placeholder: 'Person suchen…' },
  ort:         { title: 'Ort',         placeholder: 'Ort suchen…' },
  werk:        { title: 'Werk',        placeholder: 'Werk suchen…' },
  institution: { title: 'Institution', placeholder: 'Institution suchen…' },
  rolle:       { title: 'Rolle',       placeholder: 'Rolle suchen…' },
});

export const DEFAULT_FACETS = Object.freeze(['person', 'ort', 'werk', 'institution', 'rolle']);

/**
 * Wie viele Werte eine Facettenliste ohne Suche zeigt. Kurz gehalten, weil
 * sonst schon drei Facetten die Spalte laenger machen als das Fenster; die
 * Zeile darunter beziffert, wie viele Werte die Facette insgesamt traegt.
 */
const OPTION_LIMIT = 6;

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
 * @param {Array<{title?:string, rows:() => Array}>} [opts.statusRows]
 *   Zusaetzliche Statuszeilen der Ansicht, im selben Schlitz.
 * @param {Array} [opts.leadSections]       View-eigene Sektionen vor den Facetten
 * @param {Array} [opts.sections]           View-eigene Sektionen nach dem Schaerfegrad
 * @param {() => void} opts.onChange        nach jeder Filteraenderung, egal
 *   ob sie aus dieser Spalte oder aus einer anderen Ansicht kam
 * @returns {{element: HTMLElement, update: () => void, destroy: () => void}}
 */
export function buildFacetSidebar(store, {
  facets = DEFAULT_FACETS,
  yearSpan,
  getResult,
  statusRows = null,
  leadSections = [],
  sections = [],
  onChange = () => {},
} = {}) {
  const span = yearSpan || { min: 1900, max: 2009 };
  const inventories = new Map();
  for (const key of facets) inventories.set(key, facetInventory(store, key));
  // Je Facette die Zeichenfunktion, damit sidebar.update() sie ohne Umweg
  // ueber das DOM erreicht.
  const painters = new Map();

  // Die Controls schreiben nur; die Meldung an die Ansicht kommt ueber das
  // Abonnement weiter unten. Ein zweiter Weg wuerde jeden Klick doppelt
  // rendern lassen.
  const notify = () => {};

  const statusSection = {
    title: 'Schnitt',
    controls: [{
      kind: 'custom', className: 'fs-status',
      build: region => renderStatus(store, region, getResult, statusRows),
      update: region => renderStatus(store, region, getResult, statusRows),
    }],
  };

  const facetSections = facets.map(key => ({
    title: FACET_META[key] ? FACET_META[key].title : key,
    controls: [{
      kind: 'custom', className: 'fs-facet',
      build: region => painters.set(key, buildFacet(region, key, inventories.get(key), notify)),
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
      build: region => buildSchaerfe(region, notify),
      update: region => refreshSchaerfe(region),
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
    sections: [statusSection, ...leadSections, ...facetSections,
      zeitSection, schaerfeSection, ...sections, resetSection],
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

// --- Status- und Legenden-Schlitz -----------------------------------------

/**
 * Zaehlstand, Deckung und Schaerfegrad als strukturierte Zeilen statt als
 * Fliesstext. Die Ehrlichkeit bleibt vollstaendig: die enge Teilmenge steht
 * neben der weiten, und die Deckung nennt, welcher Teil des Bestands die
 * Auswertung ueberhaupt traegt (E-87).
 */
function renderStatus(store, region, getResult, statusRows) {
  clear(region);
  const result = getResult ? getResult() : null;
  if (!result) return;

  region.appendChild(el('div', { className: 'fs-figure' },
    el('span', { className: 'fs-figure__n' }, String(result.weit)),
    el('span', { className: 'fs-figure__unit' },
      result.weit === 1 ? 'Dokument im Schnitt' : 'Dokumente im Schnitt')));

  const { used, total } = coverage(store, result.ids);
  region.appendChild(statusRow('Deckung', `${used} von ${total}`,
    `${used} von ${total} Dokumenten des Bestands tragen diese Auswertung.`));

  const schaerfe = getFilter().schaerfe;
  const badge = el('span', {
    className: `fs-badge fs-badge--${schaerfe}`,
    dataset: { tip: SCHAERFE_OPTIONS.find(o => o.value === schaerfe).tip, tipWrap: '' },
  }, schaerfe);
  region.appendChild(el('div', { className: 'fs-row' },
    el('span', { className: 'fs-row__label' }, 'Schärfegrad'),
    el('span', { className: 'fs-row__value' }, badge)));

  region.appendChild(statusRow('davon belegt', `${result.eng} von ${result.weit}`,
    'Raumzeitlich verortet oder ueber eine Auffuehrung belegt. Die Differenz '
    + 'zum weiten Schnitt bleibt sichtbar, statt geglaettet zu werden.'));

  for (const row of (statusRows ? statusRows() : [])) {
    if (!row) continue;
    region.appendChild(statusRow(row.label, row.value, row.tip));
  }
}

function statusRow(label, value, tip) {
  const valueEl = el('span', { className: 'fs-row__value' }, String(value));
  if (tip) {
    valueEl.dataset.tip = tip;
    valueEl.dataset.tipWrap = '';
  }
  return el('div', { className: 'fs-row' },
    el('span', { className: 'fs-row__label' }, label), valueEl);
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
    const rest = matched.length - Math.min(matched.length, OPTION_LIMIT);
    // Die Kappung der Liste wird beziffert, damit die Auswahl nicht als
    // vollstaendig gelesen wird.
    options.appendChild(el('div', { className: 'fs-more' },
      rest > 0
        ? `${rest} weitere — Suchfeld eingrenzen`
        : `${matched.length} von ${inventory.length} Werten`));
  }

  paint();
  return paint;
}

// --- Schaerfegrad ---------------------------------------------------------

function buildSchaerfe(region, notify) {
  for (const opt of SCHAERFE_OPTIONS) {
    region.appendChild(el('button', {
      className: 'fs-seg', type: 'button',
      dataset: { value: opt.value, tip: opt.tip, tipWrap: '' },
      onClick: () => { setFilter({ schaerfe: opt.value }); notify(); },
    }, opt.label));
  }
  refreshSchaerfe(region);
}

function refreshSchaerfe(region) {
  const active = getFilter().schaerfe;
  for (const btn of region.querySelectorAll('.fs-seg')) {
    const on = btn.dataset.value === active;
    btn.classList.toggle('fs-seg--on', on);
    btn.setAttribute('aria-pressed', String(on));
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
