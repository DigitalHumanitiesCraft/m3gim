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
 * Drei Ringe nach Evidenzstaerke (siehe _netzwerk-geometry.js):
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
import { buildRoleChip } from './archiv-inline-detail.js';
import { AGRELON_LABELS, WIKIDATA_ICON_SVG } from '../data/constants.js';
import {
  computeLayout,
  computeCoOccurrence,
  labelGeometry,
  isMalaniuk,
  isPureComposer,
  classifyRing,
  derivePersonKategorie,
  NETZWERK_KATEGORIEN,
} from './_netzwerk-geometry.js';

// ---------------------------------------------------------------------------
// Modul-State (bewusst modul-lokal, analog zu anderen Views).
// ---------------------------------------------------------------------------

let _store = null;
let _container = null;
let _layout = null;           // Ergebnis von computeLayout
let _coOccurrence = [];       // Ko-Okkurrenz-Paare {a, b, shared}
let _nodeByName = new Map();  // Lookup name -> node (fuer Edge-Rendering)
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
let _zoomBehavior = null;  // d3.zoom(), fuer Reset-Button
let _zoomSvg = null;       // Selection, auf der die Zoom-Transition laeuft

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
  shell.appendChild(renderSidebar());
  const main = el('div', { className: 'netzwerk__main' });
  main.appendChild(renderCanvasSlot());
  main.appendChild(renderZoomControls());
  main.appendChild(renderDetailSlot());
  shell.appendChild(main);
  _container.appendChild(shell);

  // Jetzt ist der Canvas-Slot im DOM — echte Dimensionen lesen, neu rechnen.
  computeLayoutForCanvas();
  drawCanvas();
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

  // Lookup-Map fuer Edge-Rendering (Name -> Node).
  _nodeByName = new Map();
  for (const n of _layout.nodes) _nodeByName.set(n.name, n);

  // Ko-Okkurrenz einmal berechnen (unabhaengig von Canvas-Groesse).
  _coOccurrence = computeCoOccurrence(_store.persons.entries(), {
    minShared: _filters.minShared,
    maxEdges: 250,
  });
}

// ---------------------------------------------------------------------------
// Sidebar — vertikales Panel links, nimmt alle Controls + Legende + Zaehler.
// Canvas bekommt dadurch die volle verbleibende Flaeche (kein Titel/Subtitle,
// keine horizontale Toolbar mehr).
// ---------------------------------------------------------------------------

function renderSidebar() {
  const panel = el('aside', { className: 'netzwerk__sidebar' });

  // Coverage — prominent oben
  panel.appendChild(renderCoverageBlock());

  // Suche — ohne Section-Titel, Icon-Feel reicht
  panel.appendChild(el('input', {
    type: 'search',
    className: 'nz-search',
    placeholder: 'Name suchen…',
    value: _filters.search,
    onInput: (e) => {
      _filters.search = e.target.value.toLowerCase();
      applyFilters();
    },
  }));

  // Filter — direkt, ohne Titel
  panel.appendChild(renderFiltersBlock());

  // Kategorien — mit Titel (Chips brauchen Gruppierung)
  panel.appendChild(renderSection('Kategorien', renderCategoriesBlock()));

  // Legende — immer ausgeklappt, explizit aufgeschlüsselt nach Ringen
  // und Linientypen, damit sofort erkennbar ist, was im Canvas liegt.
  panel.appendChild(renderSection('Legende', renderLegendBlock()));

  // Reset
  panel.appendChild(el('button', {
    type: 'button',
    className: 'netzwerk__reset',
    onClick: () => {
      _filters = {
        minRecords: 1, onlyWikidata: false, onlyAgRelOn: false,
        search: '', categories: new Set(),
        showCoOccurrence: true, showAgRelOn: true, minShared: 2,
        yearFrom: null, yearTo: null,
      };
      draw();
    },
  }, '× Zurücksetzen'));

  return panel;
}

function renderSection(title, body) {
  return el('section', { className: 'nz-section' },
    el('h3', { className: 'nz-section__title' }, title),
    body,
  );
}

function renderCoverageBlock() {
  return el('div', { className: 'netzwerk__coverage', id: 'netzwerk-coverage' });
}

function renderFiltersBlock() {
  const wrap = el('div', { className: 'nz-filters' });

  // Mind. Dokumente
  const docsValue = el('span', { className: 'nz-slider__value' }, String(_filters.minRecords));
  const docsSlider = el('input', {
    type: 'range', min: '1', max: '20', step: '1',
    value: String(_filters.minRecords),
    className: 'nz-slider',
    onInput: (e) => {
      _filters.minRecords = parseInt(e.target.value, 10) || 1;
      docsValue.textContent = String(_filters.minRecords);
      applyFilters();
    },
  });
  wrap.appendChild(el('label', { className: 'nz-row' },
    el('span', { className: 'nz-row__label' }, 'Mind. Dokumente'),
    docsSlider, docsValue,
  ));

  // Verkn. ab (Mindest-gemeinsame-Records fuer Kante)
  const sharedValue = el('span', { className: 'nz-slider__value' }, String(_filters.minShared));
  const sharedSlider = el('input', {
    type: 'range', min: '1', max: '6', step: '1',
    value: String(_filters.minShared),
    className: 'nz-slider',
    onInput: (e) => {
      _filters.minShared = parseInt(e.target.value, 10) || 2;
      sharedValue.textContent = String(_filters.minShared);
      _coOccurrence = computeCoOccurrence(_store.persons.entries(), {
        minShared: _filters.minShared, maxEdges: 250,
      });
      const cx = _layout.center.x, cy = _layout.center.y;
      const g = document.querySelector('.netzwerk-cooccurrence');
      if (g) {
        while (g.firstChild) g.removeChild(g.firstChild);
        d3.select(g).selectAll('path')
          .data(_coOccurrence).enter().append('path')
          .attr('class', 'netzwerk-edge')
          .attr('data-a', d => d.a).attr('data-b', d => d.b)
          .attr('stroke-width', d => Math.min(2.6, 0.6 + Math.sqrt(d.shared) * 0.55))
          .attr('d', d => edgePath(d, cx, cy));
      }
      applyFilters();
    },
  });
  wrap.appendChild(el('label', { className: 'nz-row' },
    el('span', { className: 'nz-row__label' }, 'Verkn. ab (gem. Dok.)'),
    sharedSlider, sharedValue,
  ));

  // Toggles — Linientypen explizit trennen:
  //   Ko-Okkurrenz = geschwungen, aus Dokumenten abgeleitet
  //   AgRelOn      = gerade, explizit in den Metadaten annotiert
  wrap.appendChild(buildToggle('Ko-Okkurrenz-Linien (geschwungen)', _filters.showCoOccurrence, (v) => {
    _filters.showCoOccurrence = v; applyFilters();
  }));
  wrap.appendChild(buildToggle('AgRelOn-Linien (gerade, explizit)', _filters.showAgRelOn, (v) => {
    _filters.showAgRelOn = v; applyFilters();
  }));
  wrap.appendChild(buildToggle('Nur Wikidata-verknüpft', _filters.onlyWikidata, (v) => {
    _filters.onlyWikidata = v; applyFilters();
  }));
  wrap.appendChild(buildToggle('Nur AgRelOn-Personen', _filters.onlyAgRelOn, (v) => {
    _filters.onlyAgRelOn = v; applyFilters();
  }));

  // Zeitfenster (Von/Bis) — filtert Personen auf Records im Zeitraum.
  wrap.appendChild(renderTimeRangeBlock());

  return wrap;
}

function renderTimeRangeBlock() {
  const block = el('div', { className: 'nz-timefilter' });
  block.appendChild(el('div', { className: 'nz-timefilter__head' }, 'Zeitfenster'));
  const valueDisplay = el('span', { className: 'nz-timefilter__value' });
  const updateDisplay = () => {
    const from = _filters.yearFrom ?? _yearRange.min;
    const to = _filters.yearTo ?? _yearRange.max;
    const isDefault = _filters.yearFrom == null && _filters.yearTo == null;
    valueDisplay.textContent = isDefault
      ? `${_yearRange.min}–${_yearRange.max} (alle)`
      : `${from}–${to}`;
  };

  const fromSlider = el('input', {
    type: 'range',
    min: String(_yearRange.min),
    max: String(_yearRange.max),
    step: '1',
    value: String(_filters.yearFrom ?? _yearRange.min),
    className: 'nz-slider nz-timefilter__slider',
  });
  const toSlider = el('input', {
    type: 'range',
    min: String(_yearRange.min),
    max: String(_yearRange.max),
    step: '1',
    value: String(_filters.yearTo ?? _yearRange.max),
    className: 'nz-slider nz-timefilter__slider',
  });
  fromSlider.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    _filters.yearFrom = (v === _yearRange.min) ? null : v;
    if (_filters.yearTo != null && _filters.yearFrom != null && _filters.yearFrom > _filters.yearTo) {
      _filters.yearTo = _filters.yearFrom;
      toSlider.value = String(_filters.yearFrom);
    }
    updateDisplay();
    applyFilters();
  });
  toSlider.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    _filters.yearTo = (v === _yearRange.max) ? null : v;
    if (_filters.yearFrom != null && _filters.yearTo != null && _filters.yearTo < _filters.yearFrom) {
      _filters.yearFrom = _filters.yearTo;
      fromSlider.value = String(_filters.yearTo);
    }
    updateDisplay();
    applyFilters();
  });

  updateDisplay();
  block.appendChild(valueDisplay);
  block.appendChild(el('label', { className: 'nz-timefilter__label' }, 'Von'));
  block.appendChild(fromSlider);
  block.appendChild(el('label', { className: 'nz-timefilter__label' }, 'Bis'));
  block.appendChild(toSlider);
  return block;
}

function renderCategoriesBlock() {
  const wrap = el('div', { className: 'nz-cats' });
  rebuildCategoryChips(wrap);
  return wrap;
}

function rebuildCategoryChips(wrap) {
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

  // Counts pro Kategorie aus den Nodes.
  const catCounts = new Map();
  for (const n of _layout.nodes) {
    const k = derivePersonKategorie(n.entry);
    catCounts.set(k, (catCounts.get(k) || 0) + 1);
  }
  // Sortieren nach Haeufigkeit absteigend — die Chip-Leiste wird so selbst
  // zum kleinen Bar-Chart.
  const ordered = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);

  for (const [kat, count] of ordered) {
    const active = _filters.categories.has(kat);
    const chip = el('button', {
      type: 'button',
      className: `netzwerk__cat-chip ${active ? 'netzwerk__cat-chip--active' : ''}`,
      style: `--cat-color: ${NETZWERK_KATEGORIEN[kat] || NETZWERK_KATEGORIEN.Andere}`,
      onClick: () => {
        if (_filters.categories.has(kat)) _filters.categories.delete(kat);
        else _filters.categories.add(kat);
        rebuildCategoryChips(wrap);
        applyFilters();
      },
    },
      el('span', { className: 'nz-cat-chip__label' }, kat),
      el('span', { className: 'nz-cat-chip__count' }, String(count)),
    );
    wrap.appendChild(chip);
  }
}

function renderLegendBlock() {
  const wrap = el('div', { className: 'nz-legend' });

  // Ringe — nach Evidenzstaerke
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'netzwerk__legend-dot netzwerk__legend-dot--ring1' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'Ring 1'), ' · harte Beziehung (AgRelOn oder Wikidata + ≥ 5 Dok.)',
    ),
  ));
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'netzwerk__legend-dot netzwerk__legend-dot--ring2' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'Ring 2'), ' · Umfeld (≥ 2 Dokumente)',
    ),
  ));

  // Linientypen — der eigentliche Aha-Moment
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'nz-legend__line nz-legend__line--agrelon' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'gerade Linie'), ' · AgRelOn, ',
      el('em', {}, 'explizit annotiert'),
    ),
  ));
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'nz-legend__line nz-legend__line--cooc' }),
    el('span', { className: 'nz-legend__text' },
      el('strong', {}, 'geschwungene Linie'), ' · Ko-Okkurrenz, ',
      el('em', {}, 'aus Dokumenten abgeleitet'),
    ),
  ));

  // Marker
  wrap.appendChild(el('div', { className: 'nz-legend__row' },
    el('span', { className: 'nz-legend__qid' }),
    el('span', { className: 'nz-legend__text' }, 'Wikidata-verknüpft (Stern am Knoten)'),
  ));

  return wrap;
}

function buildToggle(label, value, onChange) {
  const wrap = el('label', { className: 'netzwerk__toggle' });
  const checkbox = el('input', {
    type: 'checkbox',
    onChange: (e) => onChange(e.target.checked),
  });
  if (value) checkbox.checked = true;
  wrap.appendChild(checkbox);
  wrap.appendChild(document.createTextNode(' ' + label));
  return wrap;
}

// ---------------------------------------------------------------------------
// Canvas (SVG) + Detail-Slot — werden in draw() gebaut, dann via D3 befuellt.
// ---------------------------------------------------------------------------

function renderCanvasSlot() {
  return el('div', { className: 'netzwerk__canvas-container', id: 'netzwerk-canvas' });
}

function renderDetailSlot() {
  return el('aside', { className: 'netzwerk__detail netzwerk__detail--hidden', id: 'netzwerk-detail' });
}

function renderZoomControls() {
  const group = el('div', { className: 'netzwerk__zoom-controls' });
  const zoomBy = (factor) => {
    if (_zoomSvg && _zoomBehavior) {
      _zoomSvg.transition().duration(180).call(_zoomBehavior.scaleBy, factor);
    }
  };
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn', title: 'Hineinzoomen',
    onClick: () => zoomBy(1.4),
  }, '+'));
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn', title: 'Herauszoomen',
    onClick: () => zoomBy(1 / 1.4),
  }, '−'));
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn nz-zoom-btn--reset', title: 'Zoom zurücksetzen',
    onClick: () => {
      if (_zoomSvg && _zoomBehavior) {
        _zoomSvg.transition().duration(220).call(_zoomBehavior.transform, d3.zoomIdentity);
      }
    },
  }, '⊙'));
  return group;
}

// ---------------------------------------------------------------------------
// D3-SVG-Rendering
// ---------------------------------------------------------------------------

function drawCanvas() {
  const slot = document.getElementById('netzwerk-canvas');
  if (!slot || !_layout) return;
  clear(slot);

  const { w, h } = _svgSize;
  const svg = d3.create('svg')
    .attr('class', 'netzwerk-svg')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Zoom-Wrapper: alle Inhalte kommen in eine Group, die via d3.zoom
  // transformiert wird. Background-Rect fuer Pan-Erkennung.
  const zoomBg = svg.append('rect')
    .attr('class', 'netzwerk-zoom-bg')
    .attr('width', w).attr('height', h)
    .attr('fill', 'transparent');
  const zoomG = svg.append('g').attr('class', 'netzwerk-zoom-group');

  _zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 4])
    .on('zoom', (ev) => zoomG.attr('transform', ev.transform));
  svg.call(_zoomBehavior);
  _zoomSvg = svg;
  // Doppelklick-Zoom abschalten (Doppelklick ist unser Detail-Toggle).
  svg.on('dblclick.zoom', null);

  // Hintergrund-Ringe (schwach, nur als Orientierungslinien).
  const ringsG = zoomG.append('g').attr('class', 'netzwerk-rings');
  const cx = _layout.center.x;
  const cy = _layout.center.y;
  for (const [i, node] of [[1, _layout.nodes.find(n => n.ring === 1)], [2, _layout.nodes.find(n => n.ring === 2)]]) {
    if (!node) continue;
    const R = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2);
    ringsG.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', R)
      .attr('class', `netzwerk-ring netzwerk-ring--${i}`);
  }

  // Ko-Okkurrenz-Kanten zwischen Knoten: wer tauchte mit wem in denselben
  // Dokumenten auf? Das ist die eigentlich interessante Netzwerk-Schicht.
  // Gezeichnet als quadratische Beziers mit Kontrollpunkt nahe am Zentrum
  // — die Kurven buendeln sich sanft in Richtung Malaniuk, ohne das
  // Hub-Sternchen wieder zu erzeugen.
  const edgesG = zoomG.append('g').attr('class', 'netzwerk-cooccurrence');
  const edgeSel = edgesG.selectAll('path')
    .data(_coOccurrence)
    .enter()
    .append('path')
    .attr('class', 'netzwerk-edge')
    .attr('data-a', d => d.a)
    .attr('data-b', d => d.b)
    .attr('stroke-width', d => Math.min(2.6, 0.6 + Math.sqrt(d.shared) * 0.55))
    .attr('d', d => edgePath(d, cx, cy));
  // Native SVG-Tooltip: erklaert, warum die Kante da ist.
  edgeSel.append('title')
    .text(d => `${d.a}  ↔  ${d.b}\n${d.shared} gemeinsame Dokument${d.shared === 1 ? '' : 'e'}\n(Ko-Okkurrenz, aus den Archivdatensätzen abgeleitet)`);

  // Schwache Radial-Linien fuer die 5 AgRelOn-strukturierten Knoten, um
  // die harten Malaniuk-Beziehungen sichtbar zu halten (Hub fuer Ring 1
  // with evidence=strong, nicht fuer alle).
  const strongG = zoomG.append('g').attr('class', 'netzwerk-links');
  const strongSel = strongG.selectAll('line')
    .data(_layout.nodes.filter(n => n.evidence === 'strong'))
    .enter()
    .append('line')
    .attr('x1', d => d.x).attr('y1', d => d.y)
    .attr('x2', cx).attr('y2', cy)
    .attr('class', 'netzwerk-link netzwerk-link--strong')
    .attr('stroke-width', 1.6);
  // Tooltip: zeigt AgRelOn-Typ(en), mit denen die Person mit Malaniuk verknuepft ist.
  strongSel.append('title')
    .text(d => {
      const types = (d.entry.relations || [])
        .map(r => AGRELON_LABELS[r.type] || String(r.type).replace(/^agrelon:/, ''))
        .filter((v, i, a) => a.indexOf(v) === i);
      const typeLine = types.length ? types.join(' · ') : 'AgRelOn-Beziehung';
      return `Malaniuk, Ira  ↔  ${d.name}\n${typeLine}\n(explizit in den Metadaten annotiert, AgRelOn)`;
    });

  // Knoten-Gruppen (Kreis + optional Stern + Label).
  const nodesG = zoomG.append('g').attr('class', 'netzwerk-nodes');
  const nodeSel = nodesG.selectAll('g.netzwerk-node')
    .data(_layout.nodes, d => d.name)
    .enter()
    .append('g')
    .attr('class', d => `netzwerk-node netzwerk-node--ring${d.ring} netzwerk-node--${d.evidence}`)
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .attr('data-name', d => d.name)
    .on('mouseenter', function (_ev, d) { onHover(d, true); })
    .on('mouseleave', function (_ev, d) { onHover(d, false); })
    .on('click', function (ev, d) {
      ev.stopPropagation();
      _selected = (_selected && _selected.name === d.name) ? null : d;
      // Klassenwechsel + Highlight-Pin in einem.
      d3.selectAll('.netzwerk-node').classed('netzwerk-node--selected', false);
      if (_selected) {
        d3.selectAll('.netzwerk-node').filter(n => n.name === _selected.name).classed('netzwerk-node--selected', true);
        applyHighlight(_selected);
      } else {
        applyHighlight(null);
      }
      drawDetail();
    });

  nodeSel.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => d.color)
    .attr('class', d => d.evidence === 'weak' ? 'netzwerk-node__circle netzwerk-node__circle--weak' : 'netzwerk-node__circle');

  // Wikidata-Stern oben rechts (kleines Dreieck, unobtrusive).
  // Nur Ring 1+2 — auf Ring 3 sind die Knoten zu klein, Sterne wuerden das
  // Bild zerknittern.
  nodeSel.filter(d => d.ring !== 3 && d.entry.wikidata && String(d.entry.wikidata).startsWith('wd:'))
    .append('path')
    .attr('class', 'netzwerk-node__qid')
    .attr('d', d => {
      const r = d.r;
      const x = r * 0.70;
      const y = -r * 0.70;
      return `M ${x},${y - 2.5} L ${x + 2.5},${y + 1.8} L ${x - 2.5},${y + 1.8} Z`;
    });

  // Labels: an jeden Knoten appendet, aber per CSS gesteuert, welche immer
  // sichtbar sind (Ring 1; Ring 2 ab >=3 Records) und welche nur on-hover
  // bzw. on-pin (alle anderen). So koennen wir beim Pin dynamisch die
  // Nachbarn beschriften, ohne SVG neu zu zeichnen.
  nodeSel.append('text')
    .attr('class', d => {
      let cls = 'netzwerk-label';
      if (d.ring === 1) cls += ' netzwerk-label--always';
      else if (d.ring === 2 && d.entry.records.size >= 3) cls += ' netzwerk-label--always';
      return cls;
    })
    .attr('text-anchor', d => labelGeometry(d.labelAngle, d.r).anchor)
    .attr('dx', d => labelGeometry(d.labelAngle, d.r).dx)
    .attr('dy', d => labelGeometry(d.labelAngle, d.r).dy)
    .text(d => shortenLabel(d.name));

  // Zentrum zuletzt, damit es ueber den Ring-Kanten liegt.
  const centerG = zoomG.append('g').attr('class', 'netzwerk-center')
    .attr('transform', `translate(${cx}, ${cy})`);
  centerG.append('circle')
    .attr('r', _layout.center.r)
    .attr('class', 'netzwerk-center__circle');
  centerG.append('text')
    .attr('class', 'netzwerk-center__label')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text('Malaniuk, Ira');

  // Reset-Klick aufs leere Canvas (nur wenn wirklich das SVG selbst getroffen
  // wird, nicht ein Child — sonst werden Node-Klicks geschluckt).
  svg.on('click', function (ev) {
    if (ev.target !== this) return;
    _selected = null;
    d3.selectAll('.netzwerk-node').classed('netzwerk-node--selected', false);
    applyHighlight(null);
    drawDetail();
  });

  slot.appendChild(svg.node());
}

/**
 * Quadratischer Bezier-Pfad zwischen zwei Knoten mit Kontrollpunkt, der
 * den Midpoint zum Zentrum hin zieht. Macht die Kanten geschwungen, so
 * dass sie bei vielen ueberlagerten Paaren nicht als geradlinige
 * Diagonalenmenge durchs Bild schneiden, sondern als sanfte Baender
 * vom Zentrum in Richtung Ring fliessen.
 */
function edgePath(edge, cx, cy) {
  const a = _nodeByName.get(edge.a);
  const b = _nodeByName.get(edge.b);
  if (!a || !b) return '';
  // Midpoint, dann 55% in Richtung Zentrum — Bezier-Kontrollpunkt.
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const controlX = mx + (cx - mx) * 0.55;
  const controlY = my + (cy - my) * 0.55;
  // Kantenanfang/-ende genau auf die Knoten-Boundary schieben, damit die
  // Linien nicht durch die Kreise hindurchschneiden.
  const ax = a.x + unit(controlX - a.x, controlY - a.y) * a.r;
  const ay = a.y + unitY(controlX - a.x, controlY - a.y) * a.r;
  const bx = b.x + unit(controlX - b.x, controlY - b.y) * b.r;
  const by = b.y + unitY(controlX - b.x, controlY - b.y) * b.r;
  return `M ${ax} ${ay} Q ${controlX} ${controlY} ${bx} ${by}`;
}

function unit(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return dx / len;
}
function unitY(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return dy / len;
}

/**
 * Label-Kuerzung: maximal 22 Zeichen, sonst Nachname + ggf. erster
 * Vorname-Initial.
 */
function shortenLabel(name) {
  if (!name) return '';
  if (name.length <= 22) return name;
  const parts = name.split(',');
  if (parts.length >= 2) {
    const last = parts[0].trim();
    const firstInitial = parts[1].trim().charAt(0);
    return `${last}, ${firstInitial}.`;
  }
  return name.slice(0, 20) + '…';
}

// ---------------------------------------------------------------------------
// Hover
// ---------------------------------------------------------------------------

function onHover(node, on) {
  // Pinned: wenn ein Knoten per Click selektiert ist, ignoriert Hover.
  // Damit bleibt der User im fixierten Zustand und wird beim Mausbewegen
  // nicht staendig vom Highlight auf Nachbarknoten rausgezogen.
  if (_selected) return;
  applyHighlight(on ? node : null);
}

function applyHighlight(node) {
  if (!node) {
    d3.selectAll('.netzwerk-node')
      .classed('netzwerk-node--dim', false)
      .classed('netzwerk-node--hover', false)
      .classed('netzwerk-node--neighbour', false);
    d3.selectAll('.netzwerk-edge')
      .classed('netzwerk-edge--dim', false)
      .classed('netzwerk-edge--active', false);
    return;
  }
  // Nachbarschaft aus den Ko-Okkurrenz-Kanten ableiten.
  const neighbours = new Set([node.name]);
  d3.selectAll('.netzwerk-edge').each(function () {
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    if (a === node.name || b === node.name) { neighbours.add(a); neighbours.add(b); }
  });
  d3.selectAll('.netzwerk-edge').classed('netzwerk-edge--dim', function () {
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    return !(a === node.name || b === node.name);
  }).classed('netzwerk-edge--active', function () {
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    return a === node.name || b === node.name;
  });
  d3.selectAll('.netzwerk-node')
    .classed('netzwerk-node--dim', n => !neighbours.has(n.name))
    .classed('netzwerk-node--neighbour', n => neighbours.has(n.name) && n.name !== node.name);
  d3.selectAll('.netzwerk-node').filter(n => n.name === node.name).classed('netzwerk-node--hover', true);
}

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

  // Close-X oben rechts.
  panel.appendChild(el('button', {
    type: 'button',
    className: 'netzwerk__detail-close',
    title: 'Detail schliessen',
    onClick: () => {
      _selected = null;
      d3.selectAll('.netzwerk-node').classed('netzwerk-node--selected', false);
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
