/**
 * Statistik-View — visuelles Porträt des Bestandes.
 *
 * Read-only Showroom: Diagramme aus Store-Aggregaten, keine Filter, keine
 * interne State-Mutation. Der Fokus liegt auf Datenvisualisierung statt
 * Tabellen mit Prozent-Zahlen; Tech-Reporting (Bearbeitungsstand,
 * Wikidata-Abdeckung, Low-Confidence-Policy) wandert in den Markdown-Report
 * `data/reports/quality-snapshot.md`.
 */

/* global d3 */

import { clear, el } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import { getDocTypeId, cityOf } from '../utils/format.js';
import { mobilityClusterFor } from '../data/constants.js';

const PALETTE = [
  '#004A8F',  // KUG-Blau
  '#2E7D4F',  // Signal-Gruen
  '#B8860B',  // Ocker
  '#8B3A3A',  // Weinrot
  '#4B6A8C',  // Staubblau
  '#6B4E7D',  // Aubergine
  '#A67C00',  // Dunkelgold
  '#5F7A61',  // Salbei
  '#7A5245',  // Kastanie
  '#3D5A4F',  // Tannengruen
];

export function renderStatistik(store, container) {
  clear(container);

  const wrap = el('div', { className: 'statistik' });
  wrap.appendChild(buildIntro());

  const body = el('div', { className: 'statistik__sections' });
  body.appendChild(buildBestandSection(store));
  body.appendChild(buildMobilitaetSection(store));
  body.appendChild(buildGeografieSection(store));
  body.appendChild(buildNetzwerkSection(store));
  body.appendChild(buildRepertoireSection(store));
  body.appendChild(buildFinanzenSection(store));
  wrap.appendChild(body);

  container.appendChild(wrap);

  const docTypes = aggregateDocTypes(store);
  const docTypesOhne = docTypes.find(d => d.id === null)?.count || 0;
  const sichten = aggregateSichten(store);
  const places = aggregatePlaces(store);
  const relations = aggregateAgentRelations(store);
  const composers = aggregateComposers(store);
  const finances = aggregateFinances(store);

  logStamp('statistik', [
    ['records', store.allRecords.length],
    ['konvolute', store.konvolute.size],
    ['events', store.mobilityEvents.size],
    ['personen', store.persons.size],
    ['sektionen', body.childElementCount],
    ['doctypes', docTypes.filter(d => d.id !== null).length],
    ['doctypes-ohne', docTypesOhne],
    ['sichten', sichten.filter(s => s.count > 0).length],
    ['orte', places.length],
    ['relationen', relations.total],
    ['komponisten', composers.length],
    ['finanzen', finances.total],
    ['waehrungen', finances.currencies.length],
  ]);
}

// ---------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------

function buildIntro() {
  const intro = el('header', { className: 'statistik__intro' });
  intro.appendChild(el('h2', { className: 'statistik__title' }, 'Statistik'));
  intro.appendChild(el('p', { className: 'statistik__lead' },
    'Visuelles Portr\u00e4t des Bestandes: Umfang, Mobilit\u00e4t, Netzwerk, '
    + 'Repertoire, Finanzen. Kein Forschungswerkzeug \u2014 zeigt, was in den '
    + 'Daten steckt und was damit m\u00f6glich wird.'));
  return intro;
}

// ---------------------------------------------------------------------------
// § 1 Dokumenttypen (Donut)
// ---------------------------------------------------------------------------

function buildBestandSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Dokumenttypen'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Verteilung der Datens\u00e4tze nach m3gim-DFT-Oberklasse. Records ohne Typ '
    + 'erscheinen als eigenes Segment.'));

  const docTypes = aggregateDocTypes(store);
  const donutData = docTypes
    .filter(d => d.count > 0)
    .map((d, i) => ({
      label: d.label,
      value: d.count,
      color: d.id === null ? 'var(--color-text-tertiary)' : PALETTE[i % PALETTE.length],
      muted: d.id === null,
    }));

  section.appendChild(buildDonut(donutData, {
    size: 320,
    ariaLabel: 'Dokumenttypen im Bestand',
  }));
  return section;
}

function aggregateDocTypes(store) {
  const counts = new Map();
  let ohneTyp = 0;
  for (const rec of store.allRecords) {
    const id = getDocTypeId(rec);
    if (!id) { ohneTyp++; continue; }
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const rows = [...counts.entries()]
    .map(([id, count]) => {
      const concept = store.dftHierarchy.get(id);
      const label = concept?.prefLabel || id;
      return { id, count, label };
    })
    .sort((a, b) => b.count - a.count);
  if (ohneTyp > 0) {
    rows.push({ id: null, count: ohneTyp, label: 'ohne Typ' });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// § 2 Mobilitaetssichten
// ---------------------------------------------------------------------------

const SICHTEN = [
  { id: 'performativ',    label: 'Performativ',    desc: 'Auftritte, Gastspiele, Premieren' },
  { id: 'institutionell', label: 'Institutionell', desc: 'Spielzeit-Engagements, Ensemble-Zugehoerigkeit' },
  { id: 'korrespondenz',  label: 'Korrespondenz',  desc: 'Briefverkehr, Reisedaten' },
  { id: 'diskursiv',      label: 'Diskursiv',      desc: 'Rezensionen, Rundfunk, Druckerscheinungen' },
  { id: 'biografisch',    label: 'Biografisch',    desc: 'Ausweise, Wohnsitz, persoenliche Dokumente' },
];

const SICHT_COLOR = {
  performativ:    '#004A8F',
  institutionell: '#2E7D4F',
  korrespondenz:  '#B8860B',
  diskursiv:      '#8B3A3A',
  biografisch:    '#4B6A8C',
  neutral:        'var(--color-text-tertiary)',
};

function aggregateSichten(store) {
  const buckets = new Map(SICHTEN.map(s => [s.id, { ...s, count: 0 }]));
  // Per-role tally for the residual bucket so the description stays factual as
  // the data evolves (e.g. E-97 mobility ortsrollen now dominate it). Hard-coded
  // role lists drift out of sync with the export.
  const unklassifiziertRollen = new Map();
  for (const ev of store.mobilityEvents.values()) {
    const cluster = mobilityClusterFor(ev.role);
    if (cluster && buckets.has(cluster)) {
      buckets.get(cluster).count++;
    } else {
      const role = ev.role || '(ohne Rolle)';
      unklassifiziertRollen.set(role, (unklassifiziertRollen.get(role) || 0) + 1);
    }
  }
  const rows = [...buckets.values()];
  const unklassifiziert = [...unklassifiziertRollen.values()].reduce((s, n) => s + n, 0);
  if (unklassifiziert > 0) {
    const breakdown = [...unklassifiziertRollen.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([role, n]) => `${role} (${n})`)
      .join(', ');
    rows.push({
      id: 'neutral', label: 'Nicht klassifiziert',
      desc: `Rollen ausserhalb der fünf Sichten: ${breakdown}`,
      count: unklassifiziert,
    });
  }
  return rows;
}

function buildMobilitaetSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Mobilit\u00e4tssichten'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Spatiotemporal-Events klassifiziert nach Rolle. F\u00fcnf Sichten plus '
    + 'unklassifizierte Events, sortiert nach H\u00e4ufigkeit.'));

  const rows = aggregateSichten(store).sort((a, b) => b.count - a.count);
  section.appendChild(buildHorizontalBars(rows.map(s => ({
    label: s.label,
    value: s.count,
    color: SICHT_COLOR[s.id] || PALETTE[0],
    hrefTitle: s.desc,
  }))));
  return section;
}

// ---------------------------------------------------------------------------
// § 3 Geografie — Top-Orte + Events-Histogramm
// ---------------------------------------------------------------------------

function aggregatePlaces(store) {
  // Auf Stadt-Ebene aggregieren: adressgenaue Orte ("Zürich, Strasse") und ihre
  // Stadt fallen sonst auseinander (nur die Stadt traegt eine Q-ID). cityOf
  // konsolidiert sie; die Stadt-Q-ID wird uebernommen, sobald ein Event sie hat.
  const map = new Map();
  for (const ev of store.mobilityEvents.values()) {
    if (!ev.place) continue;
    const city = cityOf(ev.place);
    if (!map.has(city)) {
      map.set(city, { name: city, qid: null, count: 0 });
    }
    const entry = map.get(city);
    entry.count++;
    if (!entry.qid && ev.placeWikidata) entry.qid = ev.placeWikidata;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function aggregateEventsPerDecade(store) {
  const buckets = new Map();
  for (const ev of store.mobilityEvents.values()) {
    if (typeof ev.date !== 'string' || ev.date.length < 4) continue;
    const y = parseInt(ev.date.slice(0, 4), 10);
    if (!Number.isFinite(y)) continue;
    const decade = Math.floor(y / 10) * 10;
    buckets.set(decade, (buckets.get(decade) || 0) + 1);
  }
  if (buckets.size === 0) return [];
  const min = Math.min(...buckets.keys());
  const max = Math.max(...buckets.keys());
  const rows = [];
  for (let d = min; d <= max; d += 10) {
    rows.push({ decade: d, count: buckets.get(d) || 0 });
  }
  return rows;
}

function buildGeografieSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Geografie'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Orte aus den Spatiotemporal-Events. Wo und wann belegt der Nachlass '
    + 'Mobilit\u00e4t?'));

  const places = aggregatePlaces(store).slice(0, 10);
  const placesWrap = el('div', { className: 'stat-subsection' });
  placesWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Top 10 Orte'));
  placesWrap.appendChild(buildHorizontalBars(places.map(p => ({
    label: p.name,
    value: p.count,
    href: p.qid ? `https://www.wikidata.org/wiki/${String(p.qid).replace(/^wd:/, '')}` : null,
    hrefTitle: p.qid ? `Wikidata: ${p.qid}` : '',
    color: PALETTE[0],
  }))));
  section.appendChild(placesWrap);

  const decades = aggregateEventsPerDecade(store);
  if (decades.length > 0) {
    const histWrap = el('div', { className: 'stat-subsection' });
    histWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      'Events pro Jahrzehnt'));
    // Datengetriebener Hinweis: datumslose Events (E-97-Ortsrollen) fallen aus
    // dem Histogramm, sonst waere der stille Verlust unsichtbar.
    const datiert = decades.reduce((s, d) => s + d.count, 0);
    const gesamt = store.mobilityEvents.size;
    if (gesamt > datiert) {
      histWrap.appendChild(el('p', { className: 'stat-subsection__note' },
        `${datiert} von ${gesamt} Events mit Jahresangabe — ${gesamt - datiert} `
        + 'ohne datierbares Jahr hier nicht dargestellt.'));
    }
    histWrap.appendChild(buildHistogram(decades, {
      xAccessor: d => d.decade,
      yAccessor: d => d.count,
      xLabel: d => String(d.decade) + 's',
      xAxisLabel: 'Jahrzehnt',
      yAxisLabel: 'Anzahl Events',
      ariaLabel: 'Verteilung der Spatiotemporal-Events pro Jahrzehnt',
    }));
    section.appendChild(histWrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// § 4 Netzwerk — AgRelOn-Donut + Kategorien-Bar
// ---------------------------------------------------------------------------

const AGRELON_LABEL = {
  'agrelon:HasCorrespondent':       'Korrespondenz',
  'agrelon:IsHasPatron':             'F\u00f6rderung / Patronage',
  'agrelon:HasProfessionalContact':  'Beruflicher Kontakt',
  'agrelon:HasIsMember':             'Mitgliedschaft',
  'agrelon:HasEmployeeEmployer':     'Anstellung',
};

function aggregateAgentRelations(store) {
  const counts = new Map();
  let total = 0;
  for (const rels of store.agentRelations.values()) {
    for (const r of rels) {
      const t = r.type || '(unbekannt)';
      counts.set(t, (counts.get(t) || 0) + 1);
      total++;
    }
  }
  const items = [...counts.entries()]
    .map(([type, count]) => ({
      type,
      label: AGRELON_LABEL[type] || type.replace(/^agrelon:Has/, ''),
      count,
    }))
    .sort((a, b) => b.count - a.count);
  return { items, total };
}

function aggregatePersonKategorien(store) {
  const counts = new Map();
  for (const p of store.persons.values()) {
    const k = p.kategorie || 'Andere';
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([kategorie, count]) => ({ kategorie, count }))
    .sort((a, b) => b.count - a.count);
}

function buildNetzwerkSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Netzwerk'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Agent-zu-Agent-Beziehungen nach AgRelOn und Personen nach Rolle im '
    + 'Musikleben der Nachkriegszeit.'));

  const { items: relItems, total: relTotal } = aggregateAgentRelations(store);
  if (relTotal > 0) {
    const relWrap = el('div', { className: 'stat-subsection' });
    relWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      `AgRelOn-Relationen (${relTotal})`));
    relWrap.appendChild(buildDonut(
      relItems.map((item, i) => ({
        label: item.label,
        value: item.count,
        color: PALETTE[i % PALETTE.length],
      })),
      { size: 300, ariaLabel: 'Verteilung der AgRelOn-Relationstypen' },
    ));
    section.appendChild(relWrap);
  }

  const katItems = aggregatePersonKategorien(store);
  if (katItems.length > 0) {
    const katWrap = el('div', { className: 'stat-subsection' });
    katWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      'Personen nach Kategorie'));
    katWrap.appendChild(buildHorizontalBars(katItems.map((item, i) => ({
      label: item.kategorie,
      value: item.count,
      color: PALETTE[i % PALETTE.length],
    }))));
    section.appendChild(katWrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// § 5 Repertoire — Top-Komponisten
// ---------------------------------------------------------------------------

function aggregateComposers(store) {
  const counts = new Map();
  for (const w of store.works.values()) {
    const k = (w.komponist || '').trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([komponist, count]) => ({ komponist, count }))
    .sort((a, b) => b.count - a.count);
}

function buildRepertoireSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Repertoire'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Musikalische Werke im Bestand nach Komponist.'));

  const composers = aggregateComposers(store);
  const top = composers.slice(0, 10);
  const subWrap = el('div', { className: 'stat-subsection' });
  subWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    `Top 10 Komponisten (von ${composers.length})`));
  subWrap.appendChild(buildHorizontalBars(top.map(c => ({
    label: c.komponist,
    value: c.count,
    color: PALETTE[0],
  }))));
  section.appendChild(subWrap);
  return section;
}

// ---------------------------------------------------------------------------
// § 6 Finanzen — Waehrungen als Donut + Detail-Rollen als Bars
// ---------------------------------------------------------------------------

const CURRENCY_LABEL = {
  'S':   'Schilling',
  'Esc': 'Escudo',
  'RM':  'Reichsmark',
  'Fr':  'Franc',
  'DM':  'Deutsche Mark',
};

function aggregateFinances(store) {
  let total = 0;
  let recordsWithFin = 0;
  const currencies = new Map();
  const roles = new Map();
  for (const entries of store.finances.values()) {
    if (entries.length > 0) recordsWithFin++;
    for (const e of entries) {
      total++;
      if (e.currency) currencies.set(e.currency, (currencies.get(e.currency) || 0) + 1);
      if (e.role) roles.set(e.role, (roles.get(e.role) || 0) + 1);
    }
  }
  return {
    total,
    recordsWithFin,
    currencies: [...currencies.entries()]
      .map(([code, count]) => ({ code, label: CURRENCY_LABEL[code] || code, count }))
      .sort((a, b) => b.count - a.count),
    roles: [...roles.entries()]
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count),
  };
}

function buildFinanzenSection(store) {
  const section = el('section', { className: 'stat-section stat-section--minor' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Finanzen'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Monet\u00e4re Nennungen aus Briefen, Vertr\u00e4gen und Abrechnungen, '
    + 'modelliert als DetailAnnotations.'));

  const fin = aggregateFinances(store);

  if (fin.currencies.length > 0) {
    const curWrap = el('div', { className: 'stat-subsection' });
    curWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'W\u00e4hrungen'));
    curWrap.appendChild(buildDonut(
      fin.currencies.map((c, i) => ({
        label: `${c.label} (${c.code})`,
        value: c.count,
        color: PALETTE[i % PALETTE.length],
      })),
      { size: 260, ariaLabel: 'W\u00e4hrungen in den Finanznennungen' },
    ));
    section.appendChild(curWrap);
  }

  if (fin.roles.length > 0) {
    const roleWrap = el('div', { className: 'stat-subsection' });
    roleWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      'Detail-Rollen'));
    roleWrap.appendChild(buildHorizontalBars(fin.roles.map((r, i) => ({
      label: r.role,
      value: r.count,
      color: PALETTE[i % PALETTE.length],
    }))));
    section.appendChild(roleWrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Visual helpers — Donut, Horizontal Bars, Histogram
// ---------------------------------------------------------------------------

/**
 * Donut-Chart mit Legende rechts. data: [{label, value, color, muted?}].
 * Wenn d3 nicht verf\u00fcgbar ist (CDN-Ausfall), f\u00e4llt das Chart auf
 * eine kompakte Liste zur\u00fcck.
 */
function buildDonut(data, { size = 300, ariaLabel = '' } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const wrap = el('div', { className: 'stat-chart stat-chart--donut' });

  if (typeof d3 === 'undefined' || total === 0) {
    wrap.appendChild(buildHorizontalBars(data.map(d => ({
      label: d.label, value: d.value, color: d.color,
    }))));
    return wrap;
  }

  const chartEl = el('div', { className: 'stat-chart__svg-wrap' });
  const radius = size / 2;
  const inner = radius * 0.55;

  const svg = d3.create('svg')
    .attr('viewBox', `${-radius} ${-radius} ${size} ${size}`)
    .attr('width', size)
    .attr('height', size)
    .attr('role', 'img')
    .attr('aria-label', ariaLabel);

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(inner).outerRadius(radius).padAngle(0.006).cornerRadius(2);

  svg.selectAll('path')
    .data(pie(data))
    .join('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('opacity', d => d.data.muted ? 0.5 : 1)
      .append('title')
        .text(d => `${d.data.label}: ${d.data.value} (${Math.round(d.data.value / total * 100)}\u2009%)`);

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.1em')
    .attr('class', 'stat-donut__center-value')
    .text(total);
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.1em')
    .attr('class', 'stat-donut__center-label')
    .text(data.length + ' Kategorien');

  chartEl.appendChild(svg.node());
  wrap.appendChild(chartEl);

  // Legende; lange Labels mit Ellipsis + data-tip fuer Full-Text
  const legend = el('ul', { className: 'stat-chart__legend' });
  for (const d of data) {
    const pct = total ? Math.round(d.value / total * 100) : 0;
    legend.appendChild(el('li', { className: 'stat-chart__legend-item' },
      el('span', { className: 'stat-chart__legend-swatch', style: `background:${d.color}; opacity:${d.muted ? 0.5 : 1}` }),
      el('span', {
        className: 'stat-chart__legend-label',
        dataset: { tip: d.label },
      }, d.label),
      el('span', { className: 'stat-chart__legend-value' }, `${d.value} \u00b7 ${pct}\u2009%`),
    ));
  }
  wrap.appendChild(legend);

  return wrap;
}

/**
 * Horizontale Bar-Liste. Funktional wie die alte `buildBarList`, aber
 * einheitliche API: rows: [{label, value, href?, color?}]. Keine Prozent,
 * kein Bearbeitungsstand-Vokabular.
 */
function buildHorizontalBars(rows) {
  const list = el('ul', { className: 'stat-bars' });
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  for (const row of rows) {
    const li = el('li', { className: 'stat-bars__row' });
    const label = row.href
      ? el('a', {
          className: 'stat-bars__label stat-bars__label--link',
          href: row.href, target: '_blank', rel: 'noopener', title: row.hrefTitle || '',
        }, row.label)
      : el('span', {
          className: 'stat-bars__label',
          title: row.hrefTitle || '',
        }, row.label);
    const track = el('div', { className: 'stat-bars__track' });
    const fill = el('div', { className: 'stat-bars__fill' });
    fill.style.width = `${Math.max(2, Math.round((row.value / max) * 100))}%`;
    if (row.color) fill.style.background = row.color;
    track.appendChild(fill);
    li.appendChild(label);
    li.appendChild(track);
    li.appendChild(el('span', { className: 'stat-bars__count' }, String(row.value)));
    list.appendChild(li);
  }
  return list;
}

/**
 * Einfaches Bar-Chart \u00fcber numerische Achsen (z.B. Jahrzehnte).
 */
function buildHistogram(data, {
  xAccessor, yAccessor, xLabel,
  xAxisLabel = '', yAxisLabel = '',
  ariaLabel = '',
} = {}) {
  const width = 640;
  const height = 220;
  const margin = { top: 10, right: 12, bottom: 46, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const wrap = el('div', { className: 'stat-chart stat-chart--hist' });

  if (typeof d3 === 'undefined' || data.length === 0) {
    wrap.appendChild(buildHorizontalBars(data.map(d => ({
      label: xLabel(d), value: yAccessor(d), color: PALETTE[0],
    }))));
    return wrap;
  }

  const svg = d3.create('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', width)
    .attr('height', height)
    .attr('role', 'img')
    .attr('aria-label', ariaLabel);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const xValues = data.map(xAccessor);
  const xScale = d3.scaleBand()
    .domain(xValues)
    .range([0, innerW])
    .padding(0.15);

  const maxY = d3.max(data, yAccessor) || 1;
  const yScale = d3.scaleLinear()
    .domain([0, maxY])
    .nice()
    .range([innerH, 0]);

  g.append('g')
    .attr('class', 'stat-axis stat-axis--y')
    .call(d3.axisLeft(yScale).ticks(4).tickSize(-innerW));

  // Tick-Ausduennung: bei > 10 Jahrzehnten jedes zweite Label ausblenden,
  // um Ueberlappung zu vermeiden (E-90 Phase E).
  const tickStep = xValues.length > 10 ? 2 : 1;
  const tickValues = xValues.filter((_, i) => i % tickStep === 0);
  g.append('g')
    .attr('class', 'stat-axis stat-axis--x')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat(d => xLabel({ decade: d }) ? xLabel({ decade: d }) : String(d)));

  g.selectAll('rect.stat-hist__bar')
    .data(data)
    .join('rect')
      .attr('class', 'stat-hist__bar')
      .attr('x', d => xScale(xAccessor(d)))
      .attr('y', d => yScale(yAccessor(d)))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerH - yScale(yAccessor(d)))
      .attr('fill', PALETTE[0])
      .append('title')
        .text(d => `${xLabel(d)}: ${yAccessor(d)}`);

  if (yAxisLabel) {
    svg.append('text')
      .attr('class', 'stat-axis__title')
      .attr('transform', `translate(14, ${margin.top + innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .text(yAxisLabel);
  }
  if (xAxisLabel) {
    svg.append('text')
      .attr('class', 'stat-axis__title')
      .attr('x', margin.left + innerW / 2)
      .attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .text(xAxisLabel);
  }

  wrap.appendChild(svg.node());
  return wrap;
}
