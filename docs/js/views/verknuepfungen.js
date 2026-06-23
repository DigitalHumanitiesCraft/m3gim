/**
 * Verknuepfungen — heterogener (multivariater) Graph ueber Person/Ort/Werk/
 * Institution. Beantwortet "Malaniuk 1952 in Bayreuth, welche Werke, wer war
 * beteiligt" als generalisierten, filterbaren Schnitt: Fokus-Entitaet plus
 * geteilte Facetten (Ort/Zeit/Schaerfe) plus lokale Knotentyp-Toggles.
 *
 * Zwei Schaerfegrade sichtbar getrennt (visualisierung-bayreuth.md):
 *   weit = im selben Dokument genannt (Ko-Okkurrenz, KEIN Auftrittsnachweis),
 *   eng  = nur ereignis-/auffuehrungs-belegte Records (raumzeitlich/Performance).
 * Die Differenz wird benannt, nicht geglaettet.
 *
 * Determinismus: Positionen aus _verknuepfungen-geometry.js (reine Funktionen,
 * keine Force-Simulation). Erst statisch lesbar, dann Interaktion (design.md).
 */

import { el, clear } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import {
  buildGraph, computeLayout, nodeId, NODE_TYPES, NODE_TYPE_META, DEFAULT_FOCUS,
} from './_verknuepfungen-geometry.js';
import { getFilter, setFilter, subscribe } from '../ui/filter-state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 920;
const HEIGHT = 660;
const TOP_N = 12;

let _store = null;
let _unsubscribe = null;
// Lokaler View-State (nicht im geteilten Filter): Fokus + Knotentyp-Toggles.
const local = {
  focus: { ...DEFAULT_FOCUS },
  types: { person: true, werk: true, institution: true, ort: true },
};
let _selectedNodeId = null;

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

  const root = el('div', { className: 'vk-root' });

  const controls = el('div', { className: 'vk-controls' });
  const caption = el('div', { className: 'vk-caption' });
  const stage = el('div', { className: 'vk-stage' });
  const svgWrap = el('div', { className: 'vk-svg-wrap' });
  const detail = el('div', { className: 'vk-detail' });

  stage.append(svgWrap, detail);
  root.append(controls, caption, stage);
  container.appendChild(root);

  buildControls(controls);
  draw(svgWrap, caption, detail);

  // Geteilter Filter (M4): externe Aenderung (z. B. Ort-Klick anderswo) zeichnet neu.
  if (_unsubscribe) _unsubscribe();
  _unsubscribe = subscribe(() => {
    syncControlsFromFilter(controls);
    draw(svgWrap, caption, detail);
  }, { immediate: false });
}

// --- Controls -------------------------------------------------------------

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
  return [min === Infinity ? 1900 : min, max === -Infinity ? 2009 : max];
}

function buildControls(controls) {
  clear(controls);
  const f = getFilter();

  // Fokus-Entitaet (lokal): Top-Personen + Top-Orte (deckt die Bayreuth-Leitfrage).
  const focusSel = el('select', {
    className: 'vk-select',
    onChange: (e) => {
      const [type, ...rest] = e.target.value.split('|');
      local.focus = { type, name: rest.join('|') };
      redraw();
    },
  });
  focusSel.append(optgroupFor('Person', 'person', topEntities(_store.persons, 14)));
  focusSel.append(optgroupFor('Ort', 'ort', topEntities(_store.locations, 10)));
  for (const opt of focusSel.querySelectorAll('option')) {
    if (opt.value === `${local.focus.type}|${local.focus.name}`) opt.selected = true;
  }
  controls.append(labeled('Fokus', focusSel));

  // Schaerfegrad (geteilt): weit / eng.
  const schaerfeSel = el('select', {
    className: 'vk-select', dataset: { facet: 'schaerfe' },
    onChange: (e) => setFilter({ schaerfe: e.target.value }),
  },
    el('option', { value: 'weit' }, 'weit — im Dokument genannt'),
    el('option', { value: 'eng' }, 'eng — raumzeitlich/Auffuehrung belegt'),
  );
  schaerfeSel.value = f.schaerfe;
  controls.append(labeled('Schärfegrad', schaerfeSel));

  // Ort-Filter (geteilt), Stadt-konsolidiert.
  const ortSel = el('select', {
    className: 'vk-select', dataset: { facet: 'ort' },
    onChange: (e) => setFilter({ ort: e.target.value }),
  }, el('option', { value: '' }, '— alle Orte —'));
  for (const o of topEntities(_store.locations, 18)) {
    ortSel.append(el('option', { value: o.name }, `${o.name} (${o.count})`));
  }
  ortSel.value = f.ort || '';
  controls.append(labeled('Ort', ortSel));

  // Zeitfenster (geteilt).
  const [ymin, ymax] = yearBounds(_store);
  const zf = Array.isArray(f.zeitfenster) ? f.zeitfenster : [ymin, ymax];
  const vonInput = el('input', { className: 'vk-year', type: 'number', min: ymin, max: ymax, value: zf[0], dataset: { facet: 'zf-von' } });
  const bisInput = el('input', { className: 'vk-year', type: 'number', min: ymin, max: ymax, value: zf[1], dataset: { facet: 'zf-bis' } });
  const onZf = () => {
    const von = parseInt(vonInput.value, 10);
    const bis = parseInt(bisInput.value, 10);
    if (Number.isFinite(von) && Number.isFinite(bis) && (von > ymin || bis < ymax)) {
      setFilter({ zeitfenster: [Math.min(von, bis), Math.max(von, bis)] });
    } else {
      setFilter({ zeitfenster: null });
    }
  };
  vonInput.addEventListener('change', onZf);
  bisInput.addEventListener('change', onZf);
  const zfBox = el('div', { className: 'vk-zf' }, vonInput, el('span', { className: 'vk-zf-dash' }, '–'), bisInput);
  controls.append(labeled('Zeitfenster', zfBox));

  // Knotentyp-Toggles (lokal): Einzelansichten einzeln abschaltbar (Partnervorgabe).
  const toggleBox = el('div', { className: 'vk-toggles' });
  for (const t of NODE_TYPES) {
    const cb = el('input', {
      type: 'checkbox',
      onChange: (e) => { local.types[t] = e.target.checked; redraw(); },
    });
    cb.checked = local.types[t];
    const chip = el('label', { className: `vk-toggle vk-toggle--${t}` },
      cb, el('span', { className: 'vk-toggle-dot' }), el('span', {}, NODE_TYPE_META[t].label));
    toggleBox.append(chip);
  }
  controls.append(labeled('Knotentypen', toggleBox));

  // Reset
  controls.append(el('button', {
    className: 'vk-reset',
    onClick: () => {
      local.focus = { ...DEFAULT_FOCUS };
      local.types = { person: true, werk: true, institution: true, ort: true };
      setFilter({ ort: '', zeitfenster: null, schaerfe: 'weit' });
      // setFilter loest re-draw via subscribe aus; Controls dort neu gesynct.
      redraw();
    },
  }, '× Zurücksetzen'));
}

function optgroupFor(label, type, entries) {
  const og = document.createElement('optgroup');
  og.label = label;
  for (const e of entries) {
    og.append(el('option', { value: `${type}|${e.name}` }, `${e.name} (${e.count})`));
  }
  return og;
}

function labeled(label, control) {
  return el('div', { className: 'vk-field' },
    el('span', { className: 'vk-field-label' }, label), control);
}

/** Controls an den (extern geaenderten) geteilten Filter angleichen. */
function syncControlsFromFilter(controls) {
  const f = getFilter();
  const set = (sel, val) => { const c = controls.querySelector(sel); if (c) c.value = val; };
  set('[data-facet="schaerfe"]', f.schaerfe);
  set('[data-facet="ort"]', f.ort || '');
  const [ymin, ymax] = yearBounds(_store);
  const zf = Array.isArray(f.zeitfenster) ? f.zeitfenster : [ymin, ymax];
  set('[data-facet="zf-von"]', zf[0]);
  set('[data-facet="zf-bis"]', zf[1]);
}

// Re-Draw-Helfer, die die DOM-Referenzen aus dem Render-Closure brauchen.
let _redraw = () => {};
function redraw() { _redraw(); }

// --- Zeichnen -------------------------------------------------------------

function draw(svgWrap, caption, detail) {
  _redraw = () => draw(svgWrap, caption, detail);
  const f = getFilter();
  const graph = buildGraph(_store, {
    focus: local.focus,
    schaerfe: f.schaerfe,
    filter: { ort: f.ort || null, zeitfenster: f.zeitfenster || null },
    types: local.types,
    topN: TOP_N,
  });
  const layout = computeLayout(graph, { cx: WIDTH / 2, cy: HEIGHT / 2 + 8, radius: 200 });

  clear(svgWrap);
  if (!layout.center) {
    svgWrap.append(el('div', { className: 'vk-empty' },
      `Kein Fokus "${local.focus.name}" in den Daten gefunden.`));
    renderCaption(caption, graph, f);
    return;
  }
  svgWrap.append(renderSvg(layout, detail));
  renderCaption(caption, graph, f);
  renderDetail(detail, layout, _selectedNodeId);

  stamp(graph, f);
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

function renderCaption(caption, graph, f) {
  clear(caption);
  const s = graph.stats;
  const schaerfeLabel = f.schaerfe === 'eng'
    ? 'eng (raumzeitlich/Aufführung belegt)'
    : 'weit (im Dokument genannt)';
  const bits = [
    el('strong', {}, s.focus || local.focus.name),
    document.createTextNode(` — Schärfegrad ${schaerfeLabel}. `),
  ];
  // Differenznennung weit vs. eng — die zentrale Ehrlichkeits-Geste.
  if (f.schaerfe === 'eng') {
    bits.push(document.createTextNode(
      `${s.recordsEng} von ${s.recordsWeit} Records sind raumzeitlich/Aufführungs-belegt; nur diese tragen den engen Graph.`));
  } else {
    bits.push(document.createTextNode(
      `${s.recordsWeit} Dokumente im Fokus, davon ${s.recordsEng} mit raumzeitlichem/Aufführungs-Beleg. Kanten heißen „im selben Dokument genannt", nicht „zusammen aufgetreten".`));
  }
  const trunc = Object.entries(s.truncated || {});
  if (trunc.length) {
    bits.push(el('span', { className: 'vk-trunc' },
      ' Gekappt (Top ' + TOP_N + '/Typ): ' + trunc.map(([t, n]) => `${NODE_TYPE_META[t].label} +${n}`).join(', ') + '.'));
  }
  caption.append(...bits);
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
  detail.append(buildLegend());
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

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function stamp(graph, f) {
  const s = graph.stats;
  const bt = s.byType || {};
  const truncN = Object.values(s.truncated || {}).reduce((a, b) => a + b, 0);
  logStamp('verknuepfungen', [
    ['fokus', s.focus || local.focus.name],
    ['schaerfe', f.schaerfe],
    ['ort', f.ort || '—'],
    ['zeit', Array.isArray(f.zeitfenster) ? f.zeitfenster.join('-') : 'alle'],
    ['knoten', s.total],
    ['person', bt.person], ['werk', bt.werk], ['institution', bt.institution], ['ort_n', bt.ort],
    ['recordsWeit', s.recordsWeit],
    ['recordsEng', s.recordsEng],
    ['gekappt', truncN],
  ]);
}

/** Aggregat fuer Debug/Tests (analog netzwerkAggregate). */
export function verknuepfungenAggregate() {
  if (!_store) return null;
  return buildGraph(_store, { focus: local.focus, types: local.types, topN: TOP_N });
}
