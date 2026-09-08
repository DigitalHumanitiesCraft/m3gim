/**
 * Netzwerk, the sources of the result set as a network (F2, decided on the
 * prototype of 2026-09-05, E-256, E-257, E-259).
 *
 * The overview is the two-mode network: every actor of the cut and every linked
 * record is a node, every mention an edge, one to one with the
 * Verknüpfungstabelle. The switch in the filter column takes the record nodes
 * away, leaving the person projection in which two actors share an edge as soon
 * as a record names both. The creator of the fonds is no node, she stands on
 * nearly every record and would join everything to everything. A recorded
 * AgRelOn relation is no edge but a mark at the counterpart node, because its
 * other end is exactly that creator.
 *
 * Operation. The click is what opens anything. The layout stays still, the node
 * and its neighbourhood step forward, and the detail column slides in from the
 * right. A click on empty ground or Escape closes it again.
 *
 * Determinism: projection and layout are pure functions in
 * `_netzwerk-geometry.js`, run to rest before the picture is drawn, so a
 * highlight never moves a node.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { logStamp, IS_DEV } from '../utils/env.js';
import { navigateToView } from '../ui/router.js';
import { splitHash } from '../ui/filter-url.js';
import { familyIcon } from '../ui/family-icons.js';
import { buildRoleChip } from './record-chips.js';
import { AGRELON_LABELS, WIKIDATA_ICON_SVG } from '../data/constants.js';
import {
  buildTwoMode, buildProjection, layoutGraph, graphToGEXF,
  neighboursOfActor, nodeId, recordLabel, NODE_TYPE_META,
} from './_netzwerk-geometry.js';
import {
  renderCanvasSlot, renderZoomControls, drawGraph, applySelection, debugGeometry,
  STAGE_WIDTH, STAGE_HEIGHT,
} from './_netzwerk-canvas.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { createSelectionDetail } from '../ui/selection-detail.js';
import { detailDisclosure } from '../ui/detail-disclosure.js';
import { onViewNavigate } from '../ui/events.js';
import { recordsFor, baseIds, yearBounds, yearOfId } from '../data/records-for.js';
import { getFilter, facetValues } from '../ui/filter-state.js';

/** Facets the log stamp names one by one. */
const FACETS = ['person', 'ort', 'werk', 'institution'];

/** Query parameter carrying the selected node, so a finding is citable. */
const SELECTION_PARAM = 'knoten';

let _store = null;
let _sidebar = null;
let _detail = null;
let _redraw = () => {};

// View-local state. The two switches anchor the picture and cut no documents,
// so they stay out of the shared filter.
const local = {
  showRecords: true,
  fadeSingle: false,
  selection: null,   // { kind: 'node'|'edge', id }
};

let _last = { result: null, graph: null };

/** Time of the first renderNetzwerk, the start of the first-draw measurement. */
let _t0 = 0;

const _zoomRefs = { behavior: null, svg: null };

// A jump from the Indizes names its entity in the navigation context (E-226);
// here it selects that node, the view has no focus entity of its own.
//
// The router uses the same channel for the view parameters of a hash that
// changed while this tab was already open. `renderNetzwerk` runs once per tab,
// so `knoten=` would otherwise only ever be read on the first draw and a link
// pasted into the open view would select nothing.
onViewNavigate('netzwerk', (detail) => {
  if (detail && detail.viewParams !== undefined) { selectFromHash(); return; }
  const focus = detail && detail.focus;
  if (!focus || !focus.name) return;
  local.selection = { kind: 'node', id: nodeId(focus.type === 'institution' ? 'institution' : 'person', focus.name) };
  _redraw();
});

/** The node named in the hash, applied to the drawn picture. Neither projection
 *  nor layout is recomputed, so the picture stands still while the selection
 *  moves; a node the current cut does not carry selects nothing. */
function selectFromHash() {
  const wanted = selectionFromHash();
  const current = local.selection;
  if (wanted && current && wanted.id === current.id) return;
  if (!_last.graph) { local.selection = wanted; return; }
  if (wanted && !_last.graph.byId.has(wanted.id)) return;
  select(wanted);
}

export function renderNetzwerk(store, container) {
  _sidebar?.destroy();
  _store = store;
  if (!_t0) _t0 = performance.now();
  clear(container);
  local.selection = local.selection || selectionFromHash();

  const stage = el('div', { className: 'netzwerk__stage' },
    renderZoomControls(_zoomRefs), exportButton(), renderCanvasSlot());
  const board = el('div', { className: 'netzwerk__board' }, stage);
  const main = el('div', { className: 'view-main view-main--stacked' },
    viewHead(), el('div', { className: 'netzwerk__main view-main__stage' }, board));
  _detail?.destroy();
  _detail = createSelectionDetail({
    host: board,
    onClose: () => {
      if (!local.selection) return;
      local.selection = null;
      applySelection(null);
      writeSelectionToHash();
    },
  });

  if (_sidebar) _sidebar.destroy();
  _sidebar = createSidebar(store, {
    yearSpan: yearBounds(store),
    getCount: () => (_last.result ? _last.result.ids.size : null),
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    sections: [knotenSection()],
    // A filter change answers a different question than the one the open
    // detail asked, so the selection goes with it.
    onChange: () => { local.selection = null; _redraw(); },
  });

  container.appendChild(viewShell(_sidebar.element, main));

  _redraw = () => {
    draw();
    _sidebar.update();
    paintHead();
  };
  _redraw();

  // One listener for the life of the page: renderNetzwerk runs again on every
  // tab return, and a second registration would close the detail twice.
  if (!_escapeBound) {
    document.addEventListener('keydown', onEscape);
    _escapeBound = true;
  }
}

let _escapeBound = false;

function onEscape(ev) {
  if (ev.key !== 'Escape' || !local.selection) return;
  if (!_detail?.element) return;
  clearSelection({ restoreFocus: !!document.activeElement?.closest('.selection-detail__panel') });
}

// ---------------------------------------------------------------------------
// View head: the coverage line and the symbol legend
// ---------------------------------------------------------------------------

let _coverage = null;

/**
 * The seven signs of the drawing, one word each, the rest in the tooltips. The
 * legend stands in the view head and not in the picture, where it would take
 * area from the drawing (Projektleitung, 2026-09-05, superseding the rule that
 * the tooltips alone carry it).
 */
const LEGEND = [
  { mark: 'dot', kind: 'person', label: 'Person',
    tip: 'Ein erwähnter Eintrag des Schnitts; die Größe ist die Zahl seiner Dokumente. Ira Malaniuk ist als Nachlassbildnerin ausgeblendet, weil ihre fast durchgehende Nennung das Netz verbinden würde.' },
  { mark: 'dot', kind: 'institution', label: 'Institution',
    tip: 'Haus, Festival, Sender oder Ensemble, in derselben Lesart wie eine Person.' },
  { mark: 'dot', kind: 'record', label: 'Dokument',
    tip: 'Ein Datensatz des Schnitts; die Größe ist die Zahl seiner erwähnten Einträge.' },
  { mark: 'dot', kind: 'relation', label: 'Beziehung',
    tip: 'Ring am Knoten: eine erfasste Beziehung zur Nachlassbildnerin, belegt in der Detailspalte.' },
  { mark: 'line', kind: 'mention', label: 'Erwähnt',
    tip: 'Nennung ohne eigene Funktion; die Rolle steht im Tooltip der Kante.' },
  { mark: 'line', kind: 'role', label: 'Rolle',
    tip: 'Nennung mit erfasster Rolle, etwa Sänger, Dirigent oder Veranstalter.' },
  { mark: 'dot', kind: 'focus', label: 'Auswahl',
    tip: 'Der angeklickte Knoten und seine Nachbarschaft; alles andere tritt zurück.' },
];

function viewHead() {
  _coverage = el('span', { className: 'netzwerk__coverage' });
  const legend = el('ul', { className: 'netzwerk__legend', 'aria-label': 'Zeichenerklärung' });
  for (const item of LEGEND) {
    legend.appendChild(el('li', {
      className: 'netzwerk__legend-item',
      dataset: { tip: item.tip, tipWrap: '', tipPos: 'bottom' },
    },
      el('span', {
        className: `netzwerk__legend-${item.mark} netzwerk__legend-${item.mark}--${item.kind}`,
        'aria-hidden': 'true',
      }),
      item.label));
  }
  return el('div', { className: 'netzwerk__head' }, _coverage, legend);
}

/** The coverage line counts the linked records of the cut against all records
 *  of the fonds, never against themselves: a share of itself would say nothing
 *  about how much of the Bestand the net can reach at all. What the net can
 *  reach, the linked records, and the data state stand in the tooltip. */
function paintHead() {
  if (!_coverage) return;
  const shown = _last.result ? _last.result.ids.size : 0;
  const linked = baseIds(_store).size;
  const total = _store.allRecords.length;
  _coverage.textContent = `${shown} von ${total} Dokumenten des Bestands`;
  Object.assign(_coverage.dataset, {
    tip: `${linked} Dokumente des Bestands tragen eine Verknüpfung und erreichen`
      + ` damit das Netz. Datenstand ${(_store.exportDate || '').slice(0, 10)}.`,
    tipWrap: '',
  });
}

// ---------------------------------------------------------------------------
// The two view controls
// ---------------------------------------------------------------------------

/** The view section opens collapsed; its state stands in the picture, so
 *  folding it costs no information (Projektleitung, 2026-09-05). */
const startsCollapsed = { collapsible: true, collapsed: () => true };

function knotenSection() {
  const stats = () => (_last.graph ? _last.graph.stats : null);
  return {
    title: 'Knoten',
    ...startsCollapsed,
    tip: () => {
      const s = stats();
      if (!s) return '';
      return `${s.actors} erwähnte Einträge, ${s.recordNodes} Dokumentknoten, ${s.edges} Nennungen.`;
    },
    controls: [
      { kind: 'toggle',
        label: () => {
          const s = stats();
          return s && local.showRecords
            ? `Dokumente als Knoten · ${s.recordNodes}`
            : 'Dokumente als Knoten';
        },
        tip: () => 'Ein Dokument steht als Quadrat im Netz, seine Größe ist die Zahl'
          + ' seiner erwähnten Einträge. Ohne Dokumentknoten steht die Personenprojektion,'
          + ' in der zwei Einträge eine Kante teilen, sobald ein Dokument beide nennt.',
        value: () => local.showRecords,
        onChange: v => { local.showRecords = v; local.selection = null; _redraw(); } },
      { kind: 'toggle',
        label: () => {
          const s = stats();
          return s ? `Einzelbelege blass · ${s.single}` : 'Einzelbelege blass';
        },
        tip: () => 'Einträge mit genau einem Dokument treten zurück; entfernt wird keiner.',
        value: () => local.fadeSingle,
        onChange: v => { local.fadeSingle = v; _redraw(); } },
    ],
  };
}

function exportButton() {
  return el('button', {
    className: 'nz-export-btn', type: 'button',
    dataset: { tip: 'Das gezeichnete Netz als GEXF-Datei laden', tipPos: 'bottom' },
    'aria-label': 'Netzwerk als GEXF laden',
    onClick: () => exportGEXF(),
  }, '↓ GEXF');
}

function exportGEXF() {
  if (!_last.graph) return;
  const xml = graphToGEXF(_last.graph, _store.exportDate || '');
  const blob = new Blob([xml], { type: 'application/gexf+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `m3gim-netzwerk-${(_store.exportDate || '').slice(0, 10) || 'export'}.gexf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// The selection in the address bar
// ---------------------------------------------------------------------------

function selectionFromHash() {
  const { query } = splitHash(window.location.hash);
  for (const part of query.split('&')) {
    const eq = part.indexOf('=');
    // The node id carries a colon and may carry a comma; only the first
    // separator is one, everything behind it is the value.
    if (eq > 0 && part.slice(0, eq) === SELECTION_PARAM) {
      const value = part.slice(eq + 1);
      if (value) return { kind: 'node', id: decodeURIComponent(value) };
    }
  }
  return null;
}

/** The selected node into the query part, beside the shared filter the router
 *  writes there. The router carries the parameter through its own rewrites
 *  (filter-url.js, viewParams); dropping it on a filter change is this view's
 *  decision, made in the sidebar callback, because the selection goes with the
 *  cut it was made in. */
function writeSelectionToHash() {
  const { path, query } = splitHash(window.location.hash);
  const parts = query.split('&').filter(p => p && !p.startsWith(SELECTION_PARAM + '='));
  if (local.selection && local.selection.kind === 'node') {
    parts.push(SELECTION_PARAM + '=' + encodeURIComponent(local.selection.id));
  }
  const next = '#' + path + (parts.length ? '?' + parts.join('&') : '');
  if (window.location.hash !== next) history.replaceState(null, '', next);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/**
 * A selection recomputes neither projection nor layout. It toggles the nodes it
 * touches, repaints the edge layer once and builds the detail column; a full
 * rebuild cost a third of a second and made the click visibly slow.
 */
function select(selection) {
  local.selection = selection;
  applySelection(selection);
  drawDetail();
  writeSelectionToHash();
}

function clearSelection({ restoreFocus = false } = {}) {
  if (!local.selection) return;
  const selected = local.selection;
  const target = restoreFocus
    ? (selected.kind === 'node'
      ? document.querySelector(`.netzwerk-node[data-id="${CSS.escape(selected.id)}"]`)
      : document.querySelector('.netzwerk-node[tabindex="0"]'))
    : null;
  local.selection = null;
  applySelection(null);
  _detail?.close({ restoreFocus: false, notify: false });
  writeSelectionToHash();
  if (target) target.focus();
}

const actions = {
  selectNode: (node) => select({ kind: 'node', id: node.id }),
  selectEdge: (edge) => select({ kind: 'edge', id: edge.id }),
  clearSelection: () => clearSelection(),
};

function draw() {
  const tStart = performance.now();
  const f = getFilter();
  const result = recordsFor(_store, f, { base: baseIds(_store) });
  const full = local.showRecords
    ? buildTwoMode(_store, { records: result.ids })
    : buildProjection(_store, { records: result.ids });

  const graph = full;
  _last = { result, graph };

  if (local.selection && !hasSelection(graph, local.selection)) local.selection = null;

  const slot = document.getElementById('netzwerk-canvas');
  if (graph.nodes.length === 0) {
    if (slot) {
      clear(slot);
      slot.appendChild(el('div', { className: 'empty-state empty-state--italic' },
        'Kein Datensatz im Schnitt nennt einen Eintrag.'));
    }
    drawDetail();
    stamp(graph, result, f, { start: tStart, layout: 0, paint: 0 });
    return;
  }

  const tLayout = performance.now();
  const layout = layoutGraph(graph, { width: STAGE_WIDTH, height: STAGE_HEIGHT });
  const tPaint = performance.now();
  // Every draw builds a fresh SVG and a fresh zoom behaviour, so a new layout
  // starts at the fitted view. Across a selection change nothing is redrawn,
  // which is what keeps the zoom the reader set.
  drawGraph({
    layout,
    view: { fadeSingle: local.fadeSingle },
    selection: local.selection,
    actions, zoomRefs: _zoomRefs,
  });
  const tDone = performance.now();

  drawDetail();
  writeSelectionToHash();
  stamp(graph, result, f,
    { start: tStart, layout: tPaint - tLayout, paint: tDone - tPaint });
}

function hasSelection(graph, selection) {
  return selection.kind === 'node'
    ? graph.byId.has(selection.id)
    : graph.edges.some(e => e.id === selection.id);
}

// ---------------------------------------------------------------------------
// Detail column — absent until a click
// ---------------------------------------------------------------------------

function drawDetail() {
  if (!_detail) return;
  if (!local.selection) {
    _detail.close({ restoreFocus: false, notify: false });
    return;
  }

  const graph = _last.graph;
  if (local.selection.kind === 'node' && graph.byId.has(local.selection.id)) {
    const node = graph.byId.get(local.selection.id);
    const content = el('div', { className: 'netzwerk__detail netzwerk__detail-content' });
    if (node.kind === 'record') drawRecordDetail(content, node);
    else drawActorDetail(content, node);
    _detail.open({
      kicker: node.kind === 'record' ? 'Dokument' : NODE_TYPE_META[node.type].label,
      title: node.name,
      subtitle: node.kind === 'record'
        ? [node.title || '(ohne Titel)', node.date].filter(Boolean).join(' · ') : '',
      content,
      trigger: document.querySelector(`.netzwerk-node[data-id="${CSS.escape(node.id)}"]`),
    });
    return;
  }
  const edge = graph.edges.find(e => e.id === local.selection.id);
  if (!edge) return;
  const a = graph.byId.get(edge.a);
  const b = graph.byId.get(edge.b);
  const content = el('div', { className: 'netzwerk__detail netzwerk__detail-content' });
  drawEdgeDetail(content, graph, edge);
  _detail.open({
    kicker: 'Kante', title: `${a.name} · ${b.name}`,
    subtitle: edge.recordId ? (edge.roles.join(', ') || 'ohne Rolle')
      : `${edge.weight} gemeinsame${edge.weight === 1 ? 's Dokument' : ' Dokumente'}`,
    content,
    trigger: document.querySelector('.netzwerk-node[tabindex="0"]'),
  });
}

function section(title, body) {
  return el('div', { className: 'netzwerk__detail-section' },
    el('h4', { className: 'netzwerk__detail-subtitle' }, title), body);
}

/** A neighbour as a row, with the family mark the register rows and the Bestand
 *  rows carry, so one symbol set names a family everywhere (E-212). */
function nodeRow(node, value) {
  const row = el('li', {
    className: `netzwerk__node-row netzwerk__node-row--${node.type}`,
    tabindex: '0', role: 'button',
    'aria-label': `${NODE_TYPE_META[node.type].label} ${node.name}`,
    onClick: () => actions.selectNode(node),
    onKeyDown: (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); actions.selectNode(node); }
    },
  });
  const mark = familyIcon(node.type, { size: 13, className: `fam-mark fam-mark--${node.type}` });
  if (mark) row.appendChild(mark);
  row.appendChild(el('span', { className: 'netzwerk__node-name' }, node.name));
  row.appendChild(el('span', { className: 'netzwerk__node-value' }, String(value)));
  return row;
}

function drawActorDetail(panel, node) {
  if (node.wikidata && String(node.wikidata).startsWith('wd:')) {
    const qid = String(node.wikidata).replace('wd:', '');
    panel.appendChild(el('a', {
      className: 'badge badge--wikidata',
      href: `https://www.wikidata.org/entity/${qid}`,
      target: '_blank', rel: 'noopener noreferrer',
      dataset: { tip: `Bei Wikidata ansehen (${node.wikidata})` },
      html: WIKIDATA_ICON_SVG,
    }));
  }

  if (node.roles.length > 0) {
    const chips = el('div', { className: 'netzwerk__detail-chips' });
    // The bare count, with its unit in the section title and in the tooltip: as
    // „18 Dokumente" every chip took a row of its own and the column ran past
    // the drawing beside it.
    for (const { role, count } of node.roles) {
      chips.appendChild(buildRoleChip({ prefix: role, value: String(count),
        tip: `${count} Dokument${count === 1 ? '' : 'e'} des Schnitts in dieser Rolle` }));
    }
    panel.appendChild(section(`Rollen · ${node.weight} Dokumente`, chips));
  }

  if (node.relations.length > 0) {
    const chips = el('div', { className: 'netzwerk__detail-chips' });
    for (const rel of node.relations) {
      const record = rel.recordId ? _store.records.get(rel.recordId) : null;
      const label = AGRELON_LABELS[rel.type] || String(rel.type).replace(/^agrelon:/, '');
      // Signature plus document type and year, the same short form the node
      // labels carry, so the chip says what its evidence is and not only where.
      const evidence = record
        ? `${formatSignatur(record['rico:identifier'])} · `
          + recordLabel(_store, record, yearOfId(_store, rel.recordId))
        : (rel.recordId || '—');
      chips.appendChild(buildRoleChip({
        prefix: label,
        value: evidence,
        cluster: 'beziehung',
        tip: 'Erfasste Beziehung zur Nachlassbildnerin, belegt an diesem Dokument',
        onClick: record ? () => navigateToView('bestand', { recordId: record['@id'] }) : undefined,
      }));
    }
    panel.appendChild(section('Erfasste Beziehung', chips));
  }

  // The neighbours are the person-to-person projection, also while the
  // overview draws the record nodes: "who with whom" is the question here.
  const neighbours = neighboursOfActor(_last.graph, node.id);
  if (neighbours.length > 0) {
    const list = el('ul', { className: 'netzwerk__node-list' });
    for (const n of neighbours) list.appendChild(nodeRow(n.node, n.weight));
    panel.appendChild(detailDisclosure(`Nachbarn ansehen (${neighbours.length})`, list));
  }

  const recordIds = [...(node.records || [])].filter(id => _last.result.ids.has(id));
  if (recordIds.length) panel.appendChild(detailDisclosure(
    `Quellen ansehen (${recordIds.length} Dokumente)`, recordList(recordIds)));
}

function drawRecordDetail(panel, node) {
  const chips = el('div', { className: 'netzwerk__detail-chips' });
  const actorIds = node.actorIds || [];
  for (const id of actorIds) {
    const actor = _last.graph.byId.get(id);
    if (!actor) continue;
    const edge = (_last.graph.edgesByNode.get(id) || [])
      .find(e => e.recordId === node.recordId);
    const roles = edge && edge.roles.length ? edge.roles.join(', ') : 'ohne Rolle';
    chips.appendChild(buildRoleChip({
      prefix: roles, value: actor.name, onClick: () => actions.selectNode(actor),
    }));
  }
  panel.appendChild(section(`Im selben Dokument genannte Einträge · ${actorIds.length}`, chips));

  panel.appendChild(bestandButton(() => navigateToView('bestand', { recordId: node.recordId })));
}

function drawEdgeDetail(panel, graph, edge) {
  const a = graph.byId.get(edge.a);
  const b = graph.byId.get(edge.b);

  if (edge.recordId) {
    panel.appendChild(bestandButton(() => navigateToView('bestand', { recordId: edge.recordId })));
    return;
  }

  const chips = el('div', { className: 'netzwerk__detail-chips' });
  for (const [node, roles] of [[a, edge.rolesA], [b, edge.rolesB]]) {
    for (const role of roles) {
      chips.appendChild(buildRoleChip({ prefix: role, value: node.name }));
    }
  }
  if (chips.childNodes.length > 0) panel.appendChild(section('Rollen', chips));

  panel.appendChild(detailDisclosure(`Gemeinsame Dokumente ansehen (${edge.records.length})`, recordList(edge.records)));
}

function recordList(recordIds) {
  const list = el('ul', { className: 'netzwerk__record-list' });
  for (const id of recordIds) {
    const record = _store.records.get(id);
    if (!record) continue;
    list.appendChild(el('li', {
      className: 'netzwerk__record', tabindex: '0', role: 'button',
      onClick: () => navigateToView('bestand', { recordId: id }),
      onKeyDown: (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          navigateToView('bestand', { recordId: id });
        }
      },
    },
      el('span', { className: 'netzwerk__record-sig' },
        formatSignatur(record['rico:identifier']) || '—'),
      el('span', { className: 'netzwerk__record-date' }, record['rico:date'] || ''),
      el('span', { className: 'netzwerk__record-title' }, record['rico:title'] || '(ohne Titel)')));
  }
  return list;
}

function bestandButton(onClick) {
  return el('button', {
    className: 'netzwerk__bestand-btn', type: 'button', onClick,
  }, 'Im Bestand zeigen');
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

/** Facet values for the log stamp; '—' means the facet is inactive. */
function stampFacet(filter, key) {
  const values = facetValues(filter, key);
  return values.length ? values.join('+') : '—';
}

/** Milliseconds, rounded, so the stamp stays readable. */
const ms = (value) => Math.round(value);

/** First draw after the data are ready, measured once; a later draw answers a
 *  filter change and says nothing about the load. */
let _firstDraw = null;

function stamp(graph, result, f, timing) {
  const s = graph.stats;
  const aktiv = FACETS.filter(k => facetValues(f, k).length > 0).length
    + (Array.isArray(f.zeitfenster) ? 1 : 0);
  const total = performance.now() - timing.start;
  if (_firstDraw === null) _firstDraw = performance.now() - _t0;
  const parts = [
    ['facetten', aktiv],
    ['person', stampFacet(f, 'person')],
    ['ort', stampFacet(f, 'ort')],
    ['werk', stampFacet(f, 'werk')],
    ['institution', stampFacet(f, 'institution')],
    ['stand', facetValues(f, 'stand').join('+') || 'alle'],
    ['zeit', Array.isArray(f.zeitfenster) ? f.zeitfenster.join('-') : 'alle'],
    ['modus', graph.mode],
    ['knoten', s.nodes],
    ['akteure', s.actors],
    ['personen', s.persons], ['institutionen', s.institutions],
    ['dokumentknoten', s.recordNodes],
    ['kanten', s.edges],
    ['einzelbelege', s.single],
    ['beziehungen', s.withRelation],
    ['recordsWeit', result.weit],
    ['recordsEng', result.eng],
    ['msLayout', ms(timing.layout)],
    ['msZeichnen', ms(timing.paint)],
    ['msGesamt', ms(total)],
    ['msErstzeichnung', ms(_firstDraw)],
  ];
  logStamp('netzwerk', parts);
  // The same stamp as an object, so the browser test reads the measurement
  // instead of parsing the console line. Dev only, like every other stamp.
  if (IS_DEV) {
    window.m3gim = window.m3gim || {};
    window.m3gim.netzwerkStamp = Object.fromEntries(parts);
    // Geometry hook for the browser test: it asserts that the edge layer and
    // the node layer stand on one transform instead of reading pixels.
    window.m3gim.netzwerkDebug = (sample) => {
      const geo = debugGeometry(sample === undefined ? 20 : sample);
      return geo && { ...geo, selection: local.selection,
                      stamp: window.m3gim.netzwerkStamp };
    };
  }
}

/** Aggregate for the dev console (utils/dev.js). */
export function netzwerkAggregate() {
  if (!_store) return null;
  const result = recordsFor(_store, getFilter(), { base: baseIds(_store) });
  return local.showRecords
    ? buildTwoMode(_store, { records: result.ids })
    : buildProjection(_store, { records: result.ids });
}
