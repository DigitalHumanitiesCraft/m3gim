/**
 * Netzwerk — das Beziehungsgeflecht um eine Fokus-Entitaet ueber die
 * Knotentypen Person, Werk, Institution und Ort (E-160, vereinigt die frueheren
 * Ansichten Netzwerk und Verknuepfungen).
 *
 * Steht Malaniuk im Fokus und ist nur der Knotentyp Person eingeschaltet, ist
 * das Bild das alte konzentrische Personennetz: Ringe nach Evidenzstaerke,
 * gerade Radialen fuer annotierte AgRelOn-Beziehungen, geschwungene Baender
 * fuer Ko-Okkurrenz.
 *
 * Bedienung. Fokus, Knotentypen, Regler und Legende stehen in der einen linken
 * Filterspalte (`ui/sidebar.js`); im Bild liegen nur die Zoom-Knoepfe. Ein Klick
 * auf einen Knoten macht ihn zum Fokus, das Detail rechts zeigt immer die
 * Fokus-Entitaet mit ihren datengedeckten Feldern und ihrer Belegliste.
 *
 * Determinismus: Positionen aus reinen Funktionen in `_netzwerk-geometry.js`,
 * keine Force-Simulation (design.md Regel 15).
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { matchesQuery } from '../utils/normalize.js';
import { logStamp } from '../utils/env.js';
import { navigateToView } from '../ui/router.js';
import { buildRoleChip } from './record-chips.js';
import { AGRELON_LABELS, WIKIDATA_ICON_SVG } from '../data/constants.js';
import {
  buildGraph, computeLayout, computeCoOccurrence, focusRecords,
  derivePersonKategorie, isMalaniuk, isPureComposer,
  NODE_TYPES, NODE_TYPE_META, NETZWERK_KATEGORIEN, DEFAULT_FOCUS, DEFAULT_TOP_N,
} from './_netzwerk-geometry.js';
import {
  renderCanvasSlot, renderDetailSlot, renderZoomControls, drawCanvas,
  CANVAS_WIDTH, CANVAS_HEIGHT,
} from './_netzwerk-canvas.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { onViewNavigate } from '../ui/events.js';
import { recordsFor, baseIds, yearBounds } from '../data/records-for.js';
import { getFilter, setFilter, facetValues } from '../ui/filter-state.js';

/** Facetten, die der Log-Stempel einzeln nennt. */
const FACETS = ['person', 'ort', 'werk', 'institution'];

/** Knotentyp -> Facette des geteilten Filters. */
const FACET_FOR_NODE = { person: 'person', ort: 'ort', werk: 'werk', institution: 'institution' };

let _store = null;
let _sidebar = null;
let _redraw = () => {};

// View-lokaler Zustand. Fokus, Knotentypen und Regler verankern das Bild und
// setzen keinen Dokumentschnitt, gehoeren also nicht in den geteilten Filter.
const local = {
  focus: { ...DEFAULT_FOCUS },
  types: { person: true, werk: true, institution: true, ort: true },
  topN: DEFAULT_TOP_N,
  minShared: 3,
  hiddenCategories: new Set(),
};

// Letzter gezeichneter Stand, damit Sidebar-Zaehlstand, Detail und Log-Stempel
// dieselben Zahlen nennen wie das Bild.
let _last = { result: null, graph: null, layout: null };

// Bruecke zur Canvas-Ebene: drawCanvas setzt die Felder, die Zoom-Knoepfe lesen sie.
const _zoomRefs = { behavior: null, svg: null };

// Ein Sprung aus den Indizes nennt seine Fokus-Entitaet im Navigationskontext
// (E-226). Der Kanal wird beim Import belegt, damit der Fokus auch dann steht,
// wenn die Ansicht erst danach zum ersten Mal zeichnet; _redraw ist bis dahin
// eine Leerfunktion.
onViewNavigate('netzwerk', (detail) => {
  const focus = detail && detail.focus;
  if (!focus || !focus.type || !focus.name) return;
  local.focus = { type: focus.type, name: focus.name };
  _redraw();
});

export function renderNetzwerk(store, container) {
  _store = store;
  clear(container);

  const stage = el('div', { className: 'netzwerk__stage' },
    renderZoomControls(_zoomRefs), renderCanvasSlot());
  const detail = renderDetailSlot();
  const board = el('div', { className: 'netzwerk__main view-main__stage' }, stage, detail);
  const main = el('div', { className: 'view-main view-main--stacked' }, board);

  if (_sidebar) _sidebar.destroy();
  _sidebar = createSidebar(store, {
    yearSpan: yearBounds(store),
    getCount: () => (_last.result ? _last.result.ids.size : null),
    search: { placeholder: 'Name' },
    sections: [focusSection(), typeSection(), reglerSection()],
    legend: [kategorienSection(), legendeSection()],
    // Ein Weg fuer alles: die Spalte meldet jede Filteraenderung, eigene wie
    // fremde (etwa einen Ort-Klick in der Karte), ueber onChange.
    onChange: () => redraw(),
  });
  main.insertBefore(_sidebar.strip, main.firstChild);

  container.appendChild(viewShell(_sidebar.element, main));

  _redraw = () => {
    draw(detail);
    _sidebar.update();
  };
  _redraw();
}

function redraw() { _redraw(); }

// ---------------------------------------------------------------------------
// Sidebar-Sektionen der Ansicht
// ---------------------------------------------------------------------------

/** Alle Entitaeten mit Belegen als Vorschlagsliste, haeufigste zuerst. Der
 *  Typ steht als Praefix am Vorschlag, wie in der Entitaetswahl der Karte. */
function focusOptions() {
  const maps = { person: 'persons', werk: 'works', institution: 'organizations', ort: 'locations' };
  const out = [];
  for (const type of NODE_TYPES) {
    const map = _store[maps[type]];
    if (!map) continue;
    for (const [name, entry] of map) {
      const count = entry && entry.records ? entry.records.size : 0;
      if (count === 0) continue;
      if (type === 'person' && isPureComposer(name, entry)) continue;
      out.push({ value: `${type}|${name}`, label: `${NODE_TYPE_META[type].label} · ${name}`, count });
    }
  }
  out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
  return out;
}

/** Die Fokus-Entitaet verankert den Graph und traegt genau einen Wert. */
function focusSection() {
  const options = focusOptions();
  return {
    title: 'Fokus',
    controls: [{
      kind: 'facet', key: 'fokus', single: true,
      options: () => options,
      selected: () => [`${local.focus.type}|${local.focus.name}`],
      onSelect: (values) => {
        const raw = values[0];
        if (!raw) return;
        const [type, ...rest] = raw.split('|');
        local.focus = { type, name: rest.join('|') };
        redraw();
      },
    }],
  };
}

/**
 * Knotentypen als Toggle-Zeilen. Jede Zeile beziffert, wie viele der Kandidaten
 * gezeigt werden, damit die Kappung am Ort ihrer Wirkung steht.
 */
function typeSection() {
  return {
    title: 'Knotentypen',
    controls: [{
      kind: 'custom', className: 'netzwerk__types',
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
    const tip = on
      ? `Gezeigt werden die ${shown} stärksten von ${total} Kandidaten dieses Typs.`
        + (t === 'person' ? ' Personenknoten tragen die Farbe ihrer Kategorie.' : '')
      : 'Dieser Knotentyp ist ausgeblendet.';
    region.appendChild(el('button', {
      className: 'fs-typerow' + (on ? '' : ' fs-typerow--off'),
      type: 'button', 'aria-pressed': String(on),
      dataset: { type: t, tip, tipWrap: '', tipPos: 'bottom-left' },
      onClick: () => { local.types[t] = !local.types[t]; redraw(); },
    },
      dot,
      el('span', { className: 'fs-typerow__label' }, NODE_TYPE_META[t].label),
      el('span', { className: 'fs-typerow__count' }, on ? `${shown} von ${total}` : 'aus')));
  }
}

function reglerSection() {
  return {
    title: 'Regler',
    controls: [
      { kind: 'slider', label: 'Knoten je Typ', min: 6, max: 48, step: 6,
        value: () => local.topN,
        onChange: v => { local.topN = v || DEFAULT_TOP_N; redraw(); } },
      { kind: 'slider', label: 'Verkn. ab (gem. Dok.)', min: 2, max: 12,
        value: () => local.minShared,
        onChange: v => { local.minShared = v || 2; redraw(); } },
    ],
  };
}

/**
 * Personen-Kategorien als Filter. Die Zahl nennt die Personen des Bestands je
 * Kategorie, nicht die des aktuellen Schnitts: die Chipleiste steht damit
 * stabil, waehrend der Fokus wechselt.
 */
function kategorienSection() {
  const counts = new Map();
  for (const [name, entry] of _store.persons) {
    if (isMalaniuk(name, entry) || isPureComposer(name, entry)) continue;
    if (!entry.records || entry.records.size === 0) continue;
    const k = derivePersonKategorie(entry);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const items = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kat, count]) => ({
      id: kat, label: kat, count,
      color: NETZWERK_KATEGORIEN[kat] || NETZWERK_KATEGORIEN.Andere,
      tip: 'Personen dieser Kategorie im Bestand',
    }));
  return {
    title: 'Kategorien',
    controls: [{
      kind: 'legend', items,
      isActive: kat => !local.hiddenCategories.has(kat),
      onToggle: kat => {
        if (local.hiddenCategories.has(kat)) local.hiddenCategories.delete(kat);
        else local.hiddenCategories.add(kat);
        redraw();
      },
    }],
  };
}

function legendeSection() {
  return {
    title: 'Legende',
    controls: [{
      kind: 'staticLegend',
      rows: [
        { markerClass: 'nz-legend__line nz-legend__line--agrelon',
          html: '<strong>gerade Linie</strong> · AgRelOn, <em>explizit annotiert</em>' },
        { markerClass: 'nz-legend__line nz-legend__line--cooc',
          html: '<strong>geschwungene Linie</strong> · Ko-Okkurrenz, <em>aus Dokumenten abgeleitet</em>' },
        { markerClass: 'netzwerk__legend-dot netzwerk__legend-dot--ring1',
          html: '<strong>innerer Ring</strong> · Beziehung annotiert oder Wikidata + ≥ 5 Dok.' },
        { markerClass: 'netzwerk__legend-dot netzwerk__legend-dot--ring2',
          html: '<strong>äußerer Ring</strong> · Ko-Präsenz im Dokument' },
        { markerClass: 'nz-legend__qid', html: 'Wikidata-verknüpft (Stern am Knoten)' },
      ],
    }],
  };
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------

/**
 * Der Schnitt der Ansicht: die Dokumentmenge des Fokus, beschnitten durch den
 * geteilten Filter. Die Basis ist der Schnitt der Fokus-Records mit der
 * Dokumentbasis, damit Zaehlstand und Bild dieselbe Grundmenge meinen wie jede
 * andere Ansicht.
 */
function resolveResult(filter) {
  const base = new Set();
  const inBase = baseIds(_store);
  for (const id of focusRecords(_store, local.focus)) if (inBase.has(id)) base.add(id);
  return recordsFor(_store, filter, { base });
}

function draw(detail) {
  const f = getFilter();
  const result = resolveResult(f);
  const graph = buildGraph(_store, {
    focus: local.focus,
    records: result.ids,
    types: local.types,
    topN: local.topN,
  });

  // Kategorie-Ausblendung und Freitext wirken auf die Knoten, nicht auf den
  // Dokumentschnitt: sie duennen das Bild aus, ohne die Zaehlung zu bewegen.
  const query = (f.search || '').trim();
  const visible = graph.nodes.filter(n => {
    if (n.type === 'person' && local.hiddenCategories.has(n.kategorie)) return false;
    if (query && !matchesQuery(n.name, query)) return false;
    return true;
  });
  const shown = { ...graph, nodes: visible, edges: graph.edges.filter(e => visible.some(n => n.id === e.b)) };

  const layout = computeLayout(shown, {
    cx: CANVAS_WIDTH / 2, cy: CANVAS_HEIGHT / 2, radius: 205,
  });
  const coOccurrence = computeCoOccurrence(visible, graph.effective, {
    minShared: local.minShared, maxEdges: 140,
  });
  // Der gezeigte Stand: Kategorie- und Freitext-Ausduennung wirken auf die
  // Knotenzahlen, die Kandidatenzahlen bleiben die des ungefilterten Graphen,
  // sonst behauptete die Kappungszeile eine Menge, die es nicht gab.
  const shownStats = {
    ...graph.stats,
    total: visible.length,
    byType: Object.fromEntries(NODE_TYPES.map(t => [t, visible.filter(n => n.type === t).length])),
    ringCounts: { 1: visible.filter(n => n.ring === 1).length, 2: visible.filter(n => n.ring === 2).length },
    agrelon: visible.filter(n => n.evidence === 'strong').length,
  };
  _last = { result, graph: { ...graph, stats: shownStats }, layout };

  const slot = document.getElementById('netzwerk-canvas');
  if (!layout.center) {
    if (slot) {
      clear(slot);
      slot.appendChild(el('div', { className: 'empty-state empty-state--italic' },
        `Kein Fokus „${local.focus.name}“ in den Daten gefunden.`));
    }
    clear(detail);
    stamp(graph, result, f);
    return;
  }

  drawCanvas({
    state: { layout, coOccurrence },
    actions: { setFocus: (node) => { local.focus = { type: node.type, name: node.name }; redraw(); } },
    zoomRefs: _zoomRefs,
  });
  drawDetail(detail, layout.center, visible.length);
  stamp(_last.graph, result, f);
}

// ---------------------------------------------------------------------------
// Detail-Panel — immer die Fokus-Entitaet
// ---------------------------------------------------------------------------

/** Signatur eines Datensatzes als Sortier- und Anzeigewert. */
function sigOf(record) {
  return record ? (formatSignatur(record['rico:identifier']) || '') : '';
}

function drawDetail(panel, center, neighbourCount) {
  clear(panel);
  const entry = center.entry || {};

  const titleRow = el('div', { className: 'netzwerk__detail-title-row' },
    el('span', { className: `netzwerk__detail-type netzwerk__detail-type--${center.type}` },
      NODE_TYPE_META[center.type].label),
    el('h3', { className: 'netzwerk__detail-title' }, center.name));
  if (center.wikidata && String(center.wikidata).startsWith('wd:')) {
    const qid = String(center.wikidata).replace('wd:', '');
    titleRow.appendChild(el('a', {
      className: 'badge badge--wikidata',
      href: `https://www.wikidata.org/entity/${qid}`,
      target: '_blank', rel: 'noopener noreferrer',
      dataset: { tip: `Bei Wikidata ansehen (${center.wikidata})` },
      html: WIKIDATA_ICON_SVG,
    }));
  }
  panel.appendChild(titleRow);

  const stats = _last.graph ? _last.graph.stats : { records: 0, eng: 0 };
  const metaBits = [];
  if (center.kategorie) metaBits.push(center.kategorie);
  metaBits.push(`${stats.records} von ${stats.recordsBase} Dokument${stats.recordsBase === 1 ? '' : 'en'}`);
  metaBits.push(`${stats.eng} raumzeitlich belegt`);
  metaBits.push(`${neighbourCount} Nachbarn`);
  panel.appendChild(el('div', { className: 'netzwerk__detail-meta' }, metaBits.join(' · ')));

  // Datengedeckte Felder als Chips im Rolle-Praefix-Muster (design.md Regel 3).
  const m = center.meta || {};
  const chips = el('div', { className: 'netzwerk__detail-chips' });
  const chip = (prefix, value) => chips.appendChild(buildRoleChip({ prefix, value: String(value) }));
  if (m.partie) chip('Partie', m.partie);
  if (m.komponist) chip('Komponist', m.komponist);
  if (m.sitz) chip('Sitz', m.sitz);
  if (m.keyContact) chip('Kontakt', m.keyContact);
  if (m.lifespan) chip('Leben', m.lifespan);
  if (m.voiceType) chip('Stimme', m.voiceType);
  for (const role of (m.roles || []).slice(0, 8)) chip(role, '');
  if (chips.childNodes.length > 0) {
    panel.appendChild(el('div', { className: 'netzwerk__detail-section' },
      el('h4', { className: 'netzwerk__detail-subtitle' }, 'Angaben'), chips));
  }

  // Beweiskette: eine annotierte Beziehung steht in genau einem Dokument, also
  // traegt der Chip dessen Signatur und fuehrt dorthin. Die frueheren
  // Zaehl-Chips (Typ x N) nannten das Dokument nicht und liessen die Belegfrage
  // offen, waehrend die Belegliste daneben die ganze Ko-Okkurrenz zeigt.
  const relations = entry.relations || [];
  const relationRecordIds = new Set(relations.map(r => r.recordId).filter(Boolean));
  if (relations.length > 0) {
    const byType = new Map();
    for (const r of relations) {
      if (!byType.has(r.type)) byType.set(r.type, []);
      byType.get(r.type).push(r);
    }
    const wrap = el('div', { className: 'netzwerk__detail-chips' });
    for (const [type, rels] of byType) {
      const label = AGRELON_LABELS[type] || String(type).replace(/^agrelon:/, '');
      const sorted = rels
        .map(rel => ({ rel, record: rel.recordId ? _store.records.get(rel.recordId) : null }))
        .sort((a, b) => sigOf(a.record).localeCompare(sigOf(b.record), 'de'));
      for (const { rel, record } of sorted) {
        wrap.appendChild(buildRoleChip({
          prefix: label,
          value: record ? sigOf(record) : (rel.recordId || '—'),
          cluster: 'beziehung',
          tip: record
            ? `${label} · ${record['rico:title'] || '(ohne Titel)'}${record['rico:date'] ? ', ' + record['rico:date'] : ''}`
            : label,
          onClick: record ? () => navigateToView('bestand', { recordId: record['@id'] }) : undefined,
        }));
      }
    }
    panel.appendChild(el('div', { className: 'netzwerk__detail-section' },
      el('h4', { className: 'netzwerk__detail-subtitle' }, 'Beziehungen'), wrap));
  }

  if (m.note) panel.appendChild(el('div', { className: 'netzwerk__detail-note' }, m.note));

  if (FACET_FOR_NODE[center.type]) panel.appendChild(buildAddFacet(center));

  // Belegliste: die annotierten Dokumente zuerst, markiert mit demselben
  // geraden Strich, den die Legende der AgRelOn-Kante traegt. Ohne die Marke
  // steht der annotierte Beleg ununterscheidbar in der Ko-Okkurrenz.
  const records = [...(center.records || [])]
    .map(id => _store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (relationRecordIds.has(b['@id']) ? 1 : 0) - (relationRecordIds.has(a['@id']) ? 1 : 0)
      || String(a['rico:date'] || '').localeCompare(String(b['rico:date'] || '')));
  if (records.length > 0) {
    const list = el('ul', { className: 'netzwerk__record-list' });
    for (const r of records) {
      const annotated = relationRecordIds.has(r['@id']);
      const mark = el('span', {
        className: 'netzwerk__record-mark'
          + (annotated ? ' nz-legend__line nz-legend__line--agrelon' : ''),
        ...(annotated
          ? { dataset: { tip: 'Beziehung hier annotiert (AgRelOn)' } }
          : { 'aria-hidden': 'true' }),
      });
      list.appendChild(el('li', {
        className: 'netzwerk__record',
        onClick: (ev) => { ev.stopPropagation(); navigateToView('bestand', { recordId: r['@id'] }); },
      },
        el('span', { className: 'netzwerk__record-sig' }, mark,
          formatSignatur(r['rico:identifier']) || '—'),
        el('span', { className: 'netzwerk__record-title' }, r['rico:title'] || '(ohne Titel)'),
        el('span', { className: 'netzwerk__record-date' }, r['rico:date'] || '')));
    }
    panel.appendChild(el('div', { className: 'netzwerk__detail-section' },
      el('h4', { className: 'netzwerk__detail-subtitle' }, 'Belege'), list));
  }
}

/** Die Fokus-Entitaet als Facette uebernehmen; der Schnitt wandert damit in
 *  jede andere Ansicht mit. */
function buildAddFacet(node) {
  const key = FACET_FOR_NODE[node.type];
  const active = facetValues(getFilter(), key).includes(node.name);
  return el('button', {
    className: 'netzwerk__addfacet', type: 'button',
    onClick: () => {
      const cur = facetValues(getFilter(), key);
      setFilter({ [key]: active ? cur.filter(v => v !== node.name) : [...cur, node.name] });
    },
  }, active ? '× Aus dem Filter nehmen' : '+ In den Filter aufnehmen');
}

// ---------------------------------------------------------------------------
// Telemetrie
// ---------------------------------------------------------------------------

/** Facettenwerte kompakt fuer den Log-Stempel; '—' heisst Facette inaktiv. */
function stampFacet(filter, key) {
  const values = facetValues(filter, key);
  return values.length ? values.join('+') : '—';
}

function stamp(graph, result, f) {
  const s = graph.stats;
  const bt = s.byType || {};
  const rings = s.ringCounts || { 1: 0, 2: 0 };
  const truncN = Object.values(s.truncated || {}).reduce((a, b) => a + b, 0);
  const aktiv = FACETS.filter(k => facetValues(f, k).length > 0).length
    + (Array.isArray(f.zeitfenster) ? 1 : 0);
  logStamp('netzwerk', [
    ['fokus', s.focus || local.focus.name],
    ['facetten', aktiv],
    ['person', stampFacet(f, 'person')],
    ['ort', stampFacet(f, 'ort')],
    ['werk', stampFacet(f, 'werk')],
    ['institution', stampFacet(f, 'institution')],
    ['stand', facetValues(f, 'stand').join('+') || 'alle'],
    ['zeit', Array.isArray(f.zeitfenster) ? f.zeitfenster.join('-') : 'alle'],
    ['knoten', s.total],
    ['k-person', bt.person], ['k-werk', bt.werk],
    ['k-institution', bt.institution], ['k-ort', bt.ort],
    ['ring1', rings[1]], ['ring2', rings[2]],
    ['agrelon', s.agrelon],
    ['recordsWeit', result.weit],
    ['recordsEng', result.eng],
    ['gekappt', truncN],
  ]);
}

/** Aggregat fuer die Dev-Konsole (utils/dev.js). */
export function netzwerkAggregate() {
  if (!_store) return null;
  return buildGraph(_store, { focus: local.focus, types: local.types, topN: local.topN });
}
