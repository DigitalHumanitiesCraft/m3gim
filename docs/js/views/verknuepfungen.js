/**
 * Verknuepfungen — heterogener (multivariater) Graph ueber Person/Ort/Werk/
 * Institution. Beantwortet "Malaniuk 1952 in Bayreuth, welche Werke, wer war
 * beteiligt" als generalisierten, filterbaren Schnitt: Fokus-Entitaet plus die
 * geteilten Facetten plus lokale Knotentyp-Toggles.
 *
 * Zwei Schaerfegrade sichtbar getrennt (knowledge/frontend-architecture.md, Abschnitt Schaerfegrade):
 *   weit = im selben Dokument genannt (Ko-Okkurrenz, KEIN Auftrittsnachweis),
 *   eng  = nur ereignis-/auffuehrungs-belegte Records (raumzeitlich/Performance).
 * Die Differenz wird benannt, nicht geglaettet.
 *
 * Bedienung. Seit dem 2026-08-31 traegt der Tab die geteilte linke
 * Filterspalte (`_facet-sidebar.js`) statt der Controls-Zeile ueber dem Bild.
 * Zaehlstand, Deckung, Schaerfegrad und die Kappung je Knotentyp stehen dort
 * als strukturierte Zeilen; die frueher darueber laufende Fliesstext-Caption
 * ist damit abgeloest, ihre Aussagen bleiben vollstaendig erhalten.
 *
 * Determinismus: Positionen aus _verknuepfungen-geometry.js (reine Funktionen,
 * keine Force-Simulation). Erst statisch lesbar, dann Interaktion (design.md).
 */

import { el, clear } from '../utils/dom.js';
import { truncate } from '../utils/format.js';
import { logStamp } from '../utils/env.js';
import {
  buildGraph, computeLayout, focusRecords, NODE_TYPES, NODE_TYPE_META, DEFAULT_FOCUS,
} from './_verknuepfungen-geometry.js';
import { buildFacetSidebar } from './_facet-sidebar.js';
import { viewShell } from '../ui/sidebar.js';
import { recordsFor } from '../data/records-for.js';
import {
  getFilter, setFilter, facetValues, applyViewDefault,
} from '../ui/filter-state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 920;
const HEIGHT = 660;
const TOP_N = 12;

/** Facetten der Spalte, in der Reihenfolge der Vorgabe. */
const FACETS = ['person', 'ort', 'werk', 'institution', 'rolle'];

/** Der Graph ist eine Ko-Okkurrenz-Ansicht und damit intrinsisch weit. */
const VIEW_DEFAULTS = { schaerfe: 'weit' };

let _store = null;
let _sidebar = null;
// Lokaler View-State (nicht im geteilten Filter): Fokus + Knotentyp-Toggles.
const local = {
  focus: { ...DEFAULT_FOCUS },
  types: { person: true, werk: true, institution: true, ort: true },
};
let _selectedNodeId = null;
// Letzter gezeichneter Stand, damit Sidebar-Status und Log-Stempel dieselben
// Zahlen nennen wie das Bild.
let _last = { result: null, graph: null };

function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function renderVerknuepfungen(store, container) {
  _store = store;
  clear(container);
  applyViewDefault(VIEW_DEFAULTS);

  const svgWrap = el('div', { className: 'vk-svg-wrap' });
  const detail = el('div', { className: 'vk-detail' });
  const main = el('div', { className: 'view-main vk-main' }, svgWrap, detail);

  if (_sidebar) _sidebar.destroy();
  const sidebar = buildFacetSidebar(store, {
    facets: FACETS,
    yearSpan: yearBounds(store),
    getResult: () => _last.result,
    statusRows: () => statusRows(),
    leadSections: [focusSection()],
    sections: [typeSection()],
    onChange: () => redraw(),
  });

  _sidebar = sidebar;
  container.appendChild(viewShell(sidebar.element, main));

  // Ein Weg fuer alles: die Spalte meldet jede Filteraenderung (eigene wie
  // fremde, etwa einen Ort-Klick in der Karte) ueber onChange, die lokalen
  // Controls rufen redraw direkt.
  _redraw = () => {
    drawGraph(svgWrap, detail);
    sidebar.update();
  };
  _redraw();
}

// --- View-eigene Sidebar-Sektionen ----------------------------------------

function topEntities(map, n) {
  return [...map.entries()]
    .map(([name, e]) => ({ name, count: e.records ? e.records.size : 0 }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'))
    .slice(0, n);
}

function yearBounds(store) {
  let min = Infinity, max = -Infinity;
  for (const y of store.byYear.keys()) {
    if (y < min) min = y;
    if (y > max) max = y;
  }
  return { min: min === Infinity ? 1900 : min, max: max === -Infinity ? 2009 : max };
}

/** Fokus-Entitaet: view-lokal, weil sie den Graph verankert und keinen
 *  Dokumentschnitt setzt. */
function focusSection() {
  return {
    title: 'Fokus',
    controls: [{
      kind: 'custom', className: 'vk-focus',
      build: region => {
        const select = el('select', {
          className: 'vk-select', dataset: { facet: 'fokus' },
          onChange: (e) => {
            const [type, ...rest] = e.target.value.split('|');
            local.focus = { type, name: rest.join('|') };
            _selectedNodeId = null;
            redraw();
          },
        });
        select.append(optgroupFor('Person', 'person', topEntities(_store.persons, 14)));
        select.append(optgroupFor('Ort', 'ort', topEntities(_store.locations, 10)));
        for (const opt of select.querySelectorAll('option')) {
          if (opt.value === `${local.focus.type}|${local.focus.name}`) opt.selected = true;
        }
        region.appendChild(select);
      },
    }],
  };
}

/**
 * Knotentypen als Toggle-Zeilen. Jede Zeile beziffert, wie viele der
 * Kandidaten gezeigt werden ("12 von 436"); die Kappung steht damit am Ort
 * ihrer Wirkung statt in einem Satz unter dem Bild.
 */
function typeSection() {
  return {
    title: 'Knotentypen',
    controls: [{
      kind: 'custom', className: 'vk-types',
      build: region => paintTypes(region),
      update: region => paintTypes(region),
    }],
  };
}

function paintTypes(region) {
  clear(region);
  const stats = _last.graph ? _last.graph.stats : null;
  for (const t of NODE_TYPES) {
    const on = local.types[t];
    const shown = stats && stats.byType ? (stats.byType[t] || 0) : 0;
    const total = stats && stats.candidates ? (stats.candidates[t] || 0) : 0;
    const dot = el('span', { className: 'fs-typerow__dot' });
    dot.style.background = NODE_TYPE_META[t].color;
    const row = el('button', {
      className: 'fs-typerow' + (on ? '' : ' fs-typerow--off'),
      type: 'button',
      'aria-pressed': String(on),
      dataset: {
        type: t,
        tip: on
          ? `Gezeigt werden die ${shown} staerksten von ${total} Kandidaten dieses Typs.`
          : 'Dieser Knotentyp ist ausgeblendet.',
        tipWrap: '',
      },
      onClick: () => { local.types[t] = !local.types[t]; redraw(); },
    },
      dot,
      el('span', { className: 'fs-typerow__label' }, NODE_TYPE_META[t].label),
      el('span', { className: 'fs-typerow__count' }, on ? `${shown} von ${total}` : 'aus'));
    region.appendChild(row);
  }
}

/** Zusatzzeilen des Status-Schlitzes: Fokus und Kappungssumme. */
function statusRows() {
  const stats = _last.graph ? _last.graph.stats : null;
  if (!stats) return [];
  const gekappt = Object.values(stats.truncated || {}).reduce((a, b) => a + b, 0);
  const rows = [
    { label: 'Fokus', value: truncate(stats.focus || local.focus.name, 22),
      tip: 'Die Entitaet, deren Nachbarschaft der Graph zeigt.' },
    { label: 'Knoten', value: String(stats.total),
      tip: 'Gezeigte Nachbarn ueber alle eingeschalteten Knotentypen.' },
  ];
  if (gekappt > 0) {
    rows.push({ label: 'gekappt', value: String(gekappt),
      tip: `Je Knotentyp rendert der Graph nur die ${TOP_N} staerksten Nachbarn. `
        + 'Die Zahl nennt, wie viele darueber hinaus vorhanden sind.' });
  }
  return rows;
}

function optgroupFor(label, type, entries) {
  const og = document.createElement('optgroup');
  og.label = label;
  for (const e of entries) {
    og.append(el('option', { value: `${type}|${e.name}` }, `${e.name} (${e.count})`));
  }
  return og;
}

// Re-Draw-Helfer, die die DOM-Referenzen aus dem Render-Closure brauchen.
let _redraw = () => {};
function redraw() { _redraw(); }

// --- Zeichnen -------------------------------------------------------------

/**
 * Der Schnitt der Ansicht: die Dokumentmenge des Fokus, durch den geteilten
 * Filter beschnitten. `opts.base` macht die Zaehlung fokusrelativ, sodass
 * Zaehlstand und Deckung dasselbe meinen wie das Bild.
 */
function resolveResult(filter) {
  return recordsFor(_store, filter, { base: focusRecords(_store, local.focus) });
}

function drawGraph(svgWrap, detail) {
  const f = getFilter();
  const result = resolveResult(f);
  const graph = buildGraph(_store, {
    focus: local.focus,
    records: result.ids,
    types: local.types,
    topN: TOP_N,
  });
  _last = { result, graph };

  const layout = computeLayout(graph, { cx: WIDTH / 2, cy: HEIGHT / 2 + 8, radius: 200 });

  clear(svgWrap);
  if (!layout.center) {
    svgWrap.append(el('div', { className: 'vk-empty' },
      `Kein Fokus "${local.focus.name}" in den Daten gefunden.`));
    stamp(graph, result, f);
    return;
  }
  svgWrap.append(renderSvg(layout, detail));
  renderDetail(detail, layout, _selectedNodeId);

  stamp(graph, result, f);
}

function renderSvg(layout, detail) {
  const svg = svgEl('svg', {
    class: 'vk-svg', viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    preserveAspectRatio: 'xMidYMid meet', role: 'img',
    'aria-label': 'Heterogener Verknuepfungsgraph um die Fokus-Entitaet',
  });

  // Kanten zuerst (unter den Knoten).
  const edgeLayer = svgEl('g', { class: 'vk-edges' });
  const byId = new Map(layout.nodes.map(n => [n.id, n]));
  for (const e of layout.edges) {
    const target = byId.get(e.b);
    if (!target) continue;
    edgeLayer.append(svgEl('line', {
      x1: layout.center.x, y1: layout.center.y, x2: target.x, y2: target.y,
      class: 'vk-edge', 'stroke-width': Math.max(1, Math.min(4, Math.sqrt(e.shared))),
    }));
  }
  svg.append(edgeLayer);

  // Knoten + Labels.
  const nodeLayer = svgEl('g', { class: 'vk-nodes' });
  for (const n of layout.nodes) {
    nodeLayer.append(renderNode(n, detail));
  }
  svg.append(nodeLayer);

  // Zentrum zuletzt (oben).
  svg.append(renderCenter(layout.center));

  return svg;
}

function renderNode(n, detail) {
  const rightHalf = Math.sin(n.angle) >= 0;
  const g = svgEl('g', {
    class: `vk-node vk-node--${n.type}${_selectedNodeId === n.id ? ' is-selected' : ''}`,
    role: 'button', tabindex: '0',
    onClick: () => { _selectedNodeId = n.id; redraw(); },
    onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _selectedNodeId = n.id; redraw(); } },
  });
  g.append(svgEl('circle', { cx: n.x, cy: n.y, r: n.r, fill: n.color, class: 'vk-node-circle' }));
  g.append(svgEl('title', {}, `${NODE_TYPE_META[n.type].label}: ${n.name} — ${n.weight} gemeinsame${n.weight === 1 ? 's Dokument' : ' Dokumente'}`));
  const label = svgEl('text', {
    x: n.x + (rightHalf ? n.r + 5 : -(n.r + 5)),
    y: n.y + 4,
    class: 'vk-node-label',
    'text-anchor': rightHalf ? 'start' : 'end',
  }, truncate(n.name, 26));
  g.append(label);
  return g;
}

function renderCenter(c) {
  const g = svgEl('g', { class: 'vk-center' });
  g.append(svgEl('circle', { cx: c.x, cy: c.y, r: c.r, fill: c.color, class: 'vk-center-circle' }));
  g.append(svgEl('text', { x: c.x, y: c.y + 4, class: 'vk-center-label', 'text-anchor': 'middle' },
    truncate(c.name, 22)));
  g.append(svgEl('title', {}, `Fokus: ${c.name}`));
  return g;
}

function renderDetail(detail, layout, selId) {
  clear(detail);
  const node = selId ? layout.nodes.find(n => n.id === selId) : null;
  if (!node) {
    detail.append(el('div', { className: 'vk-detail-empty' }, 'Knoten wählen für Details.'));
    detail.append(buildLegend());
    return;
  }
  const head = el('div', { className: 'vk-detail-head' },
    el('span', { className: `vk-detail-type vk-detail-type--${node.type}` }, NODE_TYPE_META[node.type].label),
    el('span', { className: 'vk-detail-name' }, node.name));
  detail.append(head);

  const chips = el('div', { className: 'vk-chips' });
  chips.append(chip('GEMEINSAM', `${node.weight} Dok.`));
  const m = node.meta || {};
  if (m.partie) chips.append(chip('PARTIE', m.partie));
  if (m.komponist) chips.append(chip('KOMPONIST', m.komponist));
  if (m.sitz) chips.append(chip('SITZ', m.sitz));
  if (m.keyContact) chips.append(chip('KONTAKT', m.keyContact));
  if (m.lifespan) chips.append(chip('LEBEN', m.lifespan));
  if (m.voiceType) chips.append(chip('STIMME', m.voiceType));
  for (const r of (m.roles || []).slice(0, 6)) chips.append(chip('ROLLE', r));
  detail.append(chips);
  if (m.note) detail.append(el('div', { className: 'vk-detail-note' }, m.note));
  // Ein Knoten laesst sich als Facette uebernehmen; der Schnitt wandert damit
  // in jede andere Ansicht mit.
  if (FACET_FOR_NODE[node.type]) detail.append(buildAddFacet(node));
  detail.append(buildLegend());
}

/** Knotentyp -> Facette des geteilten Filters. */
const FACET_FOR_NODE = { person: 'person', ort: 'ort', werk: 'werk', institution: 'institution' };

function buildAddFacet(node) {
  const key = FACET_FOR_NODE[node.type];
  const active = facetValues(getFilter(), key).includes(node.name);
  return el('button', {
    className: 'vk-addfacet', type: 'button',
    onClick: () => {
      const cur = facetValues(getFilter(), key);
      setFilter({ [key]: active ? cur.filter(v => v !== node.name) : [...cur, node.name] });
      redraw();
    },
  }, active ? '× Aus dem Filter nehmen' : '+ In den Filter aufnehmen');
}

function buildLegend() {
  const box = el('div', { className: 'vk-legend' });
  box.append(el('div', { className: 'vk-legend-title' }, 'Knotentypen'));
  for (const t of NODE_TYPES) {
    box.append(el('div', { className: 'vk-legend-row' },
      el('span', { className: `vk-legend-dot vk-legend-dot--${t}` }),
      el('span', {}, NODE_TYPE_META[t].label)));
  }
  box.append(el('div', { className: 'vk-legend-row' },
    el('span', { className: 'vk-legend-dot vk-legend-dot--focus' }),
    el('span', {}, 'Fokus')));
  return box;
}

function chip(prefix, value) {
  return el('span', { className: 'vk-chip' },
    el('span', { className: 'vk-chip-prefix' }, prefix),
    el('span', { className: 'vk-chip-value' }, String(value)));
}

/** Facettenwerte kompakt fuer den Log-Stempel; '—' heisst Facette inaktiv. */
function stampFacet(filter, key) {
  const values = facetValues(filter, key);
  return values.length ? values.join('+') : '—';
}

function stamp(graph, result, f) {
  const s = graph.stats;
  const bt = s.byType || {};
  const truncN = Object.values(s.truncated || {}).reduce((a, b) => a + b, 0);
  const aktiv = FACETS.filter(k => facetValues(f, k).length > 0).length
    + (Array.isArray(f.zeitfenster) ? 1 : 0);
  logStamp('verknuepfungen', [
    ['fokus', s.focus || local.focus.name],
    ['schaerfe', f.schaerfe],
    ['facetten', aktiv],
    ['person', stampFacet(f, 'person')],
    ['ort', stampFacet(f, 'ort')],
    ['werk', stampFacet(f, 'werk')],
    ['institution', stampFacet(f, 'institution')],
    ['rolle', stampFacet(f, 'rolle')],
    ['zeit', Array.isArray(f.zeitfenster) ? f.zeitfenster.join('-') : 'alle'],
    ['knoten', s.total],
    ['k-person', bt.person], ['k-werk', bt.werk],
    ['k-institution', bt.institution], ['k-ort', bt.ort],
    ['recordsWeit', result.weit],
    ['recordsEng', result.eng],
    ['gekappt', truncN],
  ]);
}

/** Aggregat fuer Debug/Tests (analog netzwerkAggregate). */
export function verknuepfungenAggregate() {
  if (!_store) return null;
  return buildGraph(_store, { focus: local.focus, types: local.types, topN: TOP_N });
}
