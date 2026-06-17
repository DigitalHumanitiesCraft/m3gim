/**
 * M3GIM Netzwerk-Tab — Personen im Umfeld Ira Malaniuks als konzentrische
 * Ringe um das Archivsubjekt. Antwortet auf die Forschungsfrage "Mit
 * welchen Personen stand Malaniuk in Beziehung?".
 *
 * Datenquelle: store.persons (inkl. Pass-2.5-Backlinks aus agentRelations).
 * Layout: deterministisch, polar-analytisch — frontend.md § 196
 * "Determinismus vor Schoenheit, KEINE Force-Simulation".
 * Vorbild: alte Kosmos-View (git show 2856daa^:docs/js/views/kosmos.js).
 *
 * Drei Ringe nach Evidenzstaerke (siehe _network-geometry.js):
 *   Ring 1 — harte Beziehung (AgRelOn oder Wikidata+Dokumenten-dicht)
 *   Ring 2 — wiederkehrendes Umfeld
 *   Ring 3 — einmalige Nennungen
 *
 * Filter veraendern nur Opazitaet — Positionen bleiben stabil, damit der
 * "gross anfangen, dann verdichten"-Abstieg ohne Layout-Sprung funktioniert.
 */

/* global d3 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { logStamp } from '../utils/env.js';
import { navigateToView } from '../ui/router.js';
import { buildRoleChip } from './archive-inline-detail.js';
import { AGRELON_LABELS, WIKIDATA_ICON_SVG } from '../data/constants.js';
import {
  computeLayout,
  computeCoOccurrence,
  isMalaniuk,
  isPureComposer,
  classifyRing,
  derivePersonKategorie,
} from './_network-geometry.js';
import { renderSidebar } from './_network-sidebar.js';
import {
  renderCanvasSlot,
  renderDetailSlot,
  renderZoomControls,
  drawCanvas,
  applyHighlight,
} from './_network-canvas.js';

// ---------------------------------------------------------------------------
// Modul-State (bewusst modul-lokal, analog zu anderen Views).
// ---------------------------------------------------------------------------

let _store = null;
let _container = null;
let _layout = null;           // Ergebnis von computeLayout
let _coOccurrence = [];       // Ko-Okkurrenz-Paare {a, b, shared}
let _selected = null;         // aktuell geklickter Knoten
let _filters = {
  minRecords: 1,
  onlyWikidata: false,
  onlyAgRelOn: false,
  search: '',
  categories: new Set(),      // leer = alle zugelassen
  showCoOccurrence: true,      // geschwungene Ko-Okkurrenz-Baender
  showAgRelOn: true,           // gerade AgRelOn-Radials zum Zentrum
  minShared: 2,                // Mindest-geteilte-Records fuer eine Kante
  yearFrom: null,              // Zeitfenster von (null = unbeschraenkt)
  yearTo: null,                // Zeitfenster bis
};
// Cache: personName -> Set<year> (aus Records). Wird bei render einmal gebaut.
let _personYears = new Map();
let _yearRange = { min: 1919, max: 2009 };
let _svgSize = { w: 900, h: 640 };
// Bruecke zur Canvas-Ebene: zoomRefs wird von drawCanvas gesetzt, von den
// Zoom-Controls gelesen; canvasActions sind stabile Callbacks, die die
// aktuellen Werte ueber Closure-Getter freigeben.
const _zoomRefs = { behavior: null, svg: null };
const _canvasActions = {
  getSelected: () => _selected,
  setSelected: (node) => { _selected = node; drawDetail(); },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderNetzwerk(store, container) {
  _store = store;
  _container = container;
  _selected = null;
  _filters = {
    minRecords: 1,
    onlyWikidata: false,
    onlyAgRelOn: false,
    search: '',
    categories: new Set(),
    showCoOccurrence: true,
    showAgRelOn: true,
    minShared: 2,
    yearFrom: null,
    yearTo: null,
  };
  buildPersonYearsIndex();

  draw();
  emitStamp();
}

/**
 * Berechnet das Layout fuer die aktuelle Canvas-Groesse. Wird nach dem
 * DOM-Insert aufgerufen, weil .netzwerk__canvas-container seine Groesse
 * aus dem CSS (calc(100vh - 300px)) zieht — die ist erst ermittelbar,
 * wenn der Container im Baum haengt.
 */
function computeLayoutForCanvas() {
  const slot = document.getElementById('netzwerk-canvas');
  const w = (slot && slot.clientWidth) || 900;
  const h = (slot && slot.clientHeight) || 640;
  layoutFor(w, h);
}

/**
 * Debug-Alias fuer window.m3gim.netzwerkAggregate() — die alte Tabellen-
 * Aggregation bleibt fuer Dev-Konsolen-Diagnose erhalten.
 */
export function netzwerkAggregate() {
  if (!_store) return null;
  const byAgent = new Map();
  for (const [recordId, rels] of _store.agentRelations.entries()) {
    for (const r of rels) {
      const name = r.objectName || '?';
      if (!byAgent.has(name)) {
        byAgent.set(name, { name, wikidata: r.objectWikidata || null, types: new Map(), records: new Set(), summe: 0 });
      }
      const e = byAgent.get(name);
      e.types.set(r.type, (e.types.get(r.type) || 0) + 1);
      e.records.add(recordId);
      e.summe += 1;
    }
  }
  return [...byAgent.values()].sort((a, b) => b.summe - a.summe);
}

// ---------------------------------------------------------------------------
// Rendering-Root
// ---------------------------------------------------------------------------

function draw() {
  clear(_container);

  // Vorab-Layout mit Platzhalter-Dimensionen, damit die Sidebar Kategorien
  // aus _layout.nodes lesen kann. Positionen werden nach DOM-Insert neu
  // berechnet (echte Container-Dimensionen).
  layoutFor(900, 640);

  const shell = el('div', { className: 'netzwerk__shell' });
  shell.appendChild(renderSidebar({
    state: { filters: _filters, layout: _layout, yearRange: _yearRange },
    actions: {
      onFilterChange: () => applyFilters(),
      onMinSharedChanged: () => {
        _coOccurrence = computeCoOccurrence(_store.persons.entries(), {
          minShared: _filters.minShared, maxEdges: 250,
        });
        // Vollstaendiger Canvas-Rebuild ist einfacher und sicherer als das
        // manuelle Nachzeichnen der Edges (das wuerde Tooltips + Hover-
        // Handler verlieren). Tradeoff: Zoom-Transform wird dabei zurueck-
        // gesetzt — akzeptabel fuer einen Slider, der ohnehin die Kanten-
        // topologie umkrempelt.
        drawCanvas({
          state: { layout: _layout, coOccurrence: _coOccurrence, svgSize: _svgSize },
          actions: _canvasActions,
          zoomRefs: _zoomRefs,
        });
        applyFilters();
      },
      onResetFilters: () => {
        _filters = {
          minRecords: 1, onlyWikidata: false, onlyAgRelOn: false,
          search: '', categories: new Set(),
          showCoOccurrence: true, showAgRelOn: true, minShared: 2,
          yearFrom: null, yearTo: null,
        };
        draw();
      },
    },
  }));
  const main = el('div', { className: 'netzwerk__main' });
  main.appendChild(renderCanvasSlot());
  main.appendChild(renderZoomControls(_zoomRefs));
  main.appendChild(renderDetailSlot());
  shell.appendChild(main);
  _container.appendChild(shell);

  // Jetzt ist der Canvas-Slot im DOM — echte Dimensionen lesen, neu rechnen.
  computeLayoutForCanvas();
  drawCanvas({
    state: { layout: _layout, coOccurrence: _coOccurrence, svgSize: _svgSize },
    actions: _canvasActions,
    zoomRefs: _zoomRefs,
  });
  drawDetail();
  applyFilters();
}

/**
 * Pro-Person-Jahresmenge aus den Records extrahieren. Wird einmal pro
 * renderNetzwerk() aufgebaut, damit der Zeitfilter schnell ist.
 */
function buildPersonYearsIndex() {
  _personYears = new Map();
  let minY = Infinity, maxY = -Infinity;
  for (const [name, entry] of _store.persons) {
    const years = new Set();
    for (const rid of entry.records) {
      const rec = _store.records.get(rid);
      if (!rec || !rec['rico:date']) continue;
      const m = /(\d{4})/.exec(String(rec['rico:date']));
      if (m) {
        const y = parseInt(m[1], 10);
        years.add(y);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (years.size > 0) _personYears.set(name, years);
  }
  if (Number.isFinite(minY) && Number.isFinite(maxY)) {
    _yearRange = { min: minY, max: maxY };
  }
}

/** Liegt mindestens ein Record-Jahr der Person im Filter-Zeitfenster? */
function personInTimeRange(name) {
  if (_filters.yearFrom == null && _filters.yearTo == null) return true;
  const ys = _personYears.get(name);
  if (!ys) return false; // Keine datierten Records → bei aktivem Zeitfilter ausblenden
  const from = _filters.yearFrom ?? _yearRange.min;
  const to = _filters.yearTo ?? _yearRange.max;
  for (const y of ys) if (y >= from && y <= to) return true;
  return false;
}

/** Gemeinsamer Rechenkern, wird von layoutFor() und computeLayoutForCanvas() genutzt. */
function layoutFor(w, h) {
  _svgSize = { w, h };
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2;
  // Nur noch 2 Ringe (Ring 3 entfernt). Ring 2 wird breit gesetzt, damit die
  // freigewordene Aussenflaeche genutzt wird.
  const radii = [R * 0.32, R * 0.82];
  _layout = computeLayout(_store.persons.entries(), { cx, cy, radii });

  // Ko-Okkurrenz einmal berechnen (unabhaengig von Canvas-Groesse).
  // Die Name→Node-Lookup-Map lebt jetzt lokal in drawCanvas.
  _coOccurrence = computeCoOccurrence(_store.persons.entries(), {
    minShared: _filters.minShared,
    maxEdges: 250,
  });
}

// ---------------------------------------------------------------------------
// Canvas + Detail-Slot + Rendering leben in _network-canvas.js (E-93,
// Session 47); Sidebar in _network-sidebar.js. Dieses File bleibt
// Orchestrator fuer State, Filter-Anwendung und Detail-Panel.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Filter — aendert nur Opazitaet via CSS-Klassen, nicht Position.
// ---------------------------------------------------------------------------

function applyFilters() {
  if (!_layout) return;

  let visible = 0;
  const ringVisible = { 1: 0, 2: 0, 3: 0 };
  const nodes = d3.selectAll('.netzwerk-node');
  nodes.classed('netzwerk-node--hidden', function (d) {
    const hide = !passesFilter(d);
    if (!hide) {
      visible += 1;
      ringVisible[d.ring] += 1;
    }
    return hide;
  });
  // Radial-AgRelOn-Linien: per Toggle komplett aus, sonst nach Filter.
  d3.selectAll('.netzwerk-link').classed('netzwerk-link--hidden', function (d) {
    if (!_filters.showAgRelOn) return true;
    return !passesFilter(d);
  });

  // Ko-Okkurrenz-Kanten: ein/aus nach Toggle, ausserdem ausblenden wenn
  // einer der beiden Endpunkte durch den Filter verschwindet.
  const nodeVisible = new Map();
  for (const n of _layout.nodes) nodeVisible.set(n.name, passesFilter(n));
  d3.selectAll('.netzwerk-edge').classed('netzwerk-edge--hidden', function () {
    if (!_filters.showCoOccurrence) return true;
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    return !(nodeVisible.get(a) && nodeVisible.get(b));
  });


  // Coverage-Block aktualisieren — prominenter Hauptwert + Detail-Zeile.
  const cov = document.getElementById('netzwerk-coverage');
  if (cov) {
    const total = _layout.nodes.length;
    const r1 = _layout.ringCounts[1];
    const r2 = _layout.ringCounts[2];
    let visibleCoOcc = 0;
    d3.selectAll('.netzwerk-edge').each(function () {
      if (!this.classList.contains('netzwerk-edge--hidden')) visibleCoOcc += 1;
    });
    let visibleAgRelOn = 0;
    d3.selectAll('.netzwerk-link').each(function () {
      if (!this.classList.contains('netzwerk-link--hidden')) visibleAgRelOn += 1;
    });

    while (cov.firstChild) cov.removeChild(cov.firstChild);
    cov.appendChild(el('div', { className: 'netzwerk__coverage-main' },
      `${visible} Personen`,
    ));
    cov.appendChild(el('div', { className: 'netzwerk__coverage-sub' },
      `${visibleAgRelOn} AgRelOn · ${visibleCoOcc} Ko-Okk. · Ring 1: ${r1} · Ring 2: ${r2} · von ${total}`,
    ));
  }
}

function passesFilter(node) {
  const e = node.entry;
  if (e.records.size < _filters.minRecords) return false;
  if (!personInTimeRange(node.name)) return false;
  if (_filters.onlyWikidata && !(e.wikidata && String(e.wikidata).startsWith('wd:'))) return false;
  if (_filters.onlyAgRelOn && !(e.relations && e.relations.length > 0)) return false;
  if (_filters.categories.size > 0) {
    const kat = derivePersonKategorie(e);
    if (!_filters.categories.has(kat)) return false;
  }
  if (_filters.search) {
    if (!String(node.name).toLowerCase().includes(_filters.search)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Detail-Panel
// ---------------------------------------------------------------------------

function drawDetail() {
  const panel = document.getElementById('netzwerk-detail');
  if (!panel) return;
  clear(panel);

  if (!_selected) {
    panel.classList.add('netzwerk__detail--hidden');
    return;
  }
  panel.classList.remove('netzwerk__detail--hidden');

  // Close-X oben rechts — zusaetzlich Highlight entfernen (Regression-Fix:
  // das alte Detail-Panel liess die Hover-Dim-Kette stehen).
  panel.appendChild(el('button', {
    type: 'button',
    className: 'netzwerk__detail-close',
    title: 'Detail schliessen',
    onClick: () => {
      _selected = null;
      d3.selectAll('.netzwerk-node').classed('netzwerk-node--selected', false);
      applyHighlight(null);
      drawDetail();
    },
  }, '×'));

  const { name, entry, ring, evidence } = _selected;

  // Titelzeile mit optionalem Wikidata-Badge.
  const titleRow = el('div', { className: 'netzwerk__detail-title-row' },
    el('h3', { className: 'netzwerk__detail-title' }, name),
  );
  if (entry.wikidata && String(entry.wikidata).startsWith('wd:')) {
    const qid = String(entry.wikidata).replace('wd:', '');
    titleRow.appendChild(el('a', {
      className: 'badge badge--wikidata',
      href: `https://www.wikidata.org/entity/${qid}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      dataset: { tip: `Bei Wikidata ansehen (${entry.wikidata})` },
      html: WIKIDATA_ICON_SVG,
    }));
  }
  panel.appendChild(titleRow);

  // Meta-Zeile.
  const metaBits = [];
  metaBits.push(derivePersonKategorie(entry));
  metaBits.push(`${entry.records.size} Dokument${entry.records.size === 1 ? '' : 'e'}`);
  metaBits.push(`Ring ${ring}`);
  metaBits.push(evidence === 'strong' ? 'strukturierte Beziehung' : 'Umfeld-Nennung');
  panel.appendChild(el('div', { className: 'netzwerk__detail-meta' }, metaBits.join(' · ')));

  // Beziehungs-Chips (aus relations[]).
  if (entry.relations && entry.relations.length > 0) {
    const relCounts = new Map();
    for (const r of entry.relations) {
      relCounts.set(r.type, (relCounts.get(r.type) || 0) + 1);
    }
    const chipWrap = el('div', { className: 'netzwerk__detail-chips' });
    for (const [type, count] of relCounts.entries()) {
      const label = AGRELON_LABELS[type] || String(type).replace(/^agrelon:/, '');
      chipWrap.appendChild(buildRoleChip({
        prefix: label,
        value: '×' + count,
        cluster: 'beziehung',
        tip: label,
      }));
    }
    panel.appendChild(el('div', { className: 'netzwerk__detail-section' },
      el('h4', { className: 'netzwerk__detail-subtitle' }, 'Beziehungen'),
      chipWrap,
    ));
  }

  // Rollen-Chips (aus entry.roles).
  if (entry.roles && entry.roles.size > 0) {
    const rolesWrap = el('div', { className: 'netzwerk__detail-chips' });
    for (const role of entry.roles) {
      rolesWrap.appendChild(buildRoleChip({
        prefix: role,
        value: '',
        // cluster bestimmt sich ueber roleClusterFor innerhalb buildRoleChip
      }));
    }
    panel.appendChild(el('div', { className: 'netzwerk__detail-section' },
      el('h4', { className: 'netzwerk__detail-subtitle' }, 'Rollen im Nachlass'),
      rolesWrap,
    ));
  }

  // Belegliste.
  const records = [...entry.records]
    .map(id => _store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => String(a['rico:date'] || '').localeCompare(String(b['rico:date'] || '')));

  if (records.length > 0) {
    const list = el('ul', { className: 'netzwerk__record-list' });
    for (const r of records) {
      const sig = formatSignatur(r['rico:identifier']);
      list.appendChild(el('li', {
        className: 'netzwerk__record',
        onClick: (ev) => {
          ev.stopPropagation();
          navigateToView('bestand', { recordId: r['@id'] });
        },
      },
        el('span', { className: 'netzwerk__record-sig' }, sig || '—'),
        el('span', { className: 'netzwerk__record-title' }, r['rico:title'] || '(ohne Titel)'),
        el('span', { className: 'netzwerk__record-date' }, r['rico:date'] || ''),
      ));
    }
    panel.appendChild(el('div', { className: 'netzwerk__detail-section' },
      el('h4', { className: 'netzwerk__detail-subtitle' }, 'Belege'),
      list,
    ));
  }
}

// ---------------------------------------------------------------------------
// Telemetrie
// ---------------------------------------------------------------------------

function emitStamp() {
  if (!_layout) return;
  let agrelonNodes = 0;
  for (const n of _layout.nodes) {
    if (n.entry.relations && n.entry.relations.length > 0) agrelonNodes++;
  }
  logStamp('netzwerk', [
    ['total', _layout.nodes.length],
    ['ring1', _layout.ringCounts[1]],
    ['ring2', _layout.ringCounts[2]],
    ['agrelon', agrelonNodes],
  ]);
}

// Hilfs-Re-Export fuer Dev-Debug, falls ausserhalb Bedarf besteht.
export { classifyRing, isMalaniuk, isPureComposer };
