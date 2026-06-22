/**
 * Statistik-View — interaktives Dashboard ueber den Bestand.
 *
 * Geteilte Sidebar-Shell (viewShell/createSidebar) wie Karte und Netzwerk: links
 * ein record-basierter Zeitraum-Filter plus Panel-Schalter, rechts ein Panel-Grid
 * aus sechs Aggregat-Panels (Live-Store, kein Pipeline-Derivat). Der Zeitschnitt
 * rechnet alle Panels gleichzeitig neu. Tech-Reporting (Bearbeitungsstand,
 * Wikidata-Abdeckung) bleibt im Markdown-Report `data/reports/quality-snapshot.md`.
 */

/* global d3 */

import { clear, el } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import { getDocTypeId, cityOf } from '../utils/format.js';
import { mobilityClusterFor, ortColor } from '../data/constants.js';
import { applyArchivFilter, navigateToView } from '../ui/router.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { extractYear } from '../utils/date-parser.js';

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

// Dashboard-Bereiche: jeder wird ein per Sidebar schaltbares Panel. Die Farbe
// dient nur als Wiedererkennungs-Swatch im Sidebar-Chip.
const SECTIONS = [
  { id: 'dokumenttypen', label: 'Dokumenttypen', unit: 'Dok.',   color: PALETTE[0], build: buildBestandSection },
  { id: 'mobilitaet',    label: 'Mobilität',     unit: 'Ereig.', color: 'var(--color-sicht-performativ)', build: buildMobilitaetSection },
  { id: 'geografie',     label: 'Geografie',     unit: 'Orte',   color: PALETTE[2], build: buildGeografieSection },
  { id: 'netzwerk',      label: 'Netzwerk',      unit: 'Rel.',   color: PALETTE[3], build: buildNetzwerkSection },
  { id: 'repertoire',    label: 'Repertoire',    unit: 'Komp.',  color: PALETTE[1], build: buildRepertoireSection },
  { id: 'finanzen',      label: 'Finanzen',      unit: 'Nenn.',  color: PALETTE[5], build: buildFinanzenSection },
];

export function renderStatistik(store, container) {
  clear(container);

  // Jahr-Primitive: kanonisch aus rico:date (wie die Chronik, E-88); null = undatiert.
  const recordYear = (rec) => extractYear(rec['rico:date']);

  // Spektrum + Inventar aus den datierten Records.
  const years = [];
  for (const rec of store.allRecords) {
    const y = recordYear(rec);
    if (y != null) years.push(y);
  }
  const minYear = years.length ? Math.min(...years) : 1900;
  const maxYear = years.length ? Math.max(...years) : 2000;
  const undatedTotal = store.allRecords.length - years.length;

  // Chip-Zahlen bleiben das Gesamtinventar (stabiler Bezug); der Zeitschnitt wirkt
  // auf die Panels und wird in der Status-Zeile beziffert.
  const counts = {
    dokumenttypen: store.allRecords.length,
    mobilitaet:    store.mobilityEvents.size,
    geografie:     aggregatePlaces(store).length,
    netzwerk:      aggregateAgentRelations(store).total,
    repertoire:    aggregateComposers(store).length,
    finanzen:      aggregateFinances(store).total,
  };

  // State.
  const visible = new Set(SECTIONS.map(s => s.id));
  let lo = minYear, hi = maxYear;

  // Record-basierter Zeitfilter: einmal die Record-Menge schneiden, daraus einen
  // gefilterten Sub-Store ableiten. mobilityEvents/agentRelations/finances tragen
  // einen recordId-Bezug, persons/works ein records-Set (loader.js). Bei vollem
  // Fenster bleibt der Store unveraendert, damit undatierte Daten sichtbar bleiben.
  const filteredStore = () => {
    if (lo <= minYear && hi >= maxYear) return store;
    const keep = new Set();
    for (const rec of store.allRecords) {
      const y = recordYear(rec);
      if (y != null && y >= lo && y <= hi) keep.add(rec['@id']);
    }
    const pick = (map, hasKey) => {
      const out = new Map();
      for (const [k, v] of map) if (hasKey(k, v)) out.set(k, v);
      return out;
    };
    const inRecords = (set) => { for (const rid of (set || [])) if (keep.has(rid)) return true; return false; };
    return {
      ...store,
      allRecords:     store.allRecords.filter(r => keep.has(r['@id'])),
      mobilityEvents: pick(store.mobilityEvents, (_, ev) => ev.recordId && keep.has(ev.recordId)),
      agentRelations: pick(store.agentRelations, (k) => keep.has(k)),
      finances:       pick(store.finances, (k) => keep.has(k)),
      persons:        pick(store.persons, (_, p) => inRecords(p.records)),
      works:          pick(store.works, (_, w) => inRecords(w.records)),
    };
  };

  // Panel-Grid: jede Sektion als Dashboard-Karte.
  const grid = el('div', { className: 'statistik__grid' });
  const panels = new Map();
  for (const def of SECTIONS) {
    const panel = el('section', { className: 'stat-panel' });
    panel.id = `stat-panel-${def.id}`;
    panels.set(def.id, panel);
    grid.appendChild(panel);
  }
  const main = el('div', { className: 'view-main statistik-main' }, grid);

  const syncPanels = () => {
    for (const def of SECTIONS) panels.get(def.id).hidden = !visible.has(def.id);
  };

  // Status-Zeile: macht den Zeitschnitt und die ausgeblendeten undatierten Daten
  // sichtbar (Erschliessungsspiegel-Prinzip, E-87).
  const noteEl = el('p', { className: 'stat-filter-note' });
  const updateNote = (fs) => {
    if (fs === store) {
      noteEl.textContent = `Voller Zeitraum · ${store.allRecords.length} Dokumente`
        + (undatedTotal ? ` (inkl. ${undatedTotal} undatierte)` : '');
    } else {
      noteEl.textContent = `Zeitfenster ${lo}–${hi} · ${fs.allRecords.length} von `
        + `${store.allRecords.length} Dokumenten`
        + (undatedTotal ? ` · ${undatedTotal} undatierte ausgeblendet` : '');
    }
  };

  // Neuaufbau der Panel-Inhalte mit dem gefilterten Sub-Store; per rAF gedrosselt,
  // damit das Ziehen des Sliders nicht jeden Pixel sechs D3-Charts neu zeichnet.
  const rebuild = () => {
    const fs = filteredStore();
    for (const def of SECTIONS) {
      const panel = panels.get(def.id);
      clear(panel);
      panel.appendChild(def.build(fs));
    }
    updateNote(fs);
  };
  let raf = 0;
  const scheduleRebuild = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; rebuild(); });
  };

  const sidebar = createSidebar({
    sections: [
      {
        title: 'Zeitraum',
        controls: [
          { kind: 'range', min: minYear, max: maxYear,
            from: () => lo, to: () => hi, fullLabel: true,
            onChange: (a, b) => { lo = a; hi = b; scheduleRebuild(); } },
          { kind: 'custom', node: noteEl },
        ],
      },
      {
      title: 'Ansichten',
      controls: [
        {
          kind: 'legend',
          items: SECTIONS.map(d => ({ id: d.id, label: d.label, color: d.color,
            count: `${counts[d.id]} ${d.unit}` })),
          isActive: (id) => visible.has(id),
          onToggle: (id) => {
            if (visible.has(id)) visible.delete(id); else visible.add(id);
            syncPanels();
          },
        },
        {
          kind: 'buttons',
          items: [
            { label: 'Alle', title: 'Alle Ansichten zeigen',
              onClick: () => { SECTIONS.forEach(d => visible.add(d.id)); sidebar.update(); syncPanels(); } },
            { label: 'Keine', title: 'Alle Ansichten ausblenden',
              onClick: () => { visible.clear(); sidebar.update(); syncPanels(); } },
          ],
        },
      ],
    }],
  });

  container.appendChild(viewShell(sidebar.element, main));
  rebuild();
  syncPanels();

  const docTypes = aggregateDocTypes(store);
  logStamp('statistik', [
    ['records', store.allRecords.length],
    ['events', store.mobilityEvents.size],
    ['personen', store.persons.size],
    ['panels', SECTIONS.length],
    ['sichtbar', visible.size],
    ['spanne', `${minYear}-${maxYear}`],
    ['undatiert', undatedTotal],
    ['doctypes', docTypes.filter(d => d.id !== null).length],
    ['orte', counts.geografie],
    ['relationen', counts.netzwerk],
    ['komponisten', counts.repertoire],
    ['finanzen', counts.finanzen],
  ]);
}

// ---------------------------------------------------------------------------
// § 1 Dokumenttypen (Bar-Rangliste)
// ---------------------------------------------------------------------------

function buildBestandSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Dokumenttypen'));

  const docTypes = aggregateDocTypes(store).filter(d => d.count > 0);
  const typed = docTypes.filter(d => d.id !== null);
  const ohneTyp = docTypes.find(d => d.id === null);
  const total = docTypes.reduce((s, d) => s + d.count, 0);

  section.appendChild(el('p', { className: 'stat-subsection__note' },
    `${total} Dokumente · ${typed.length} Typen`));

  // Viele Typen mit starkem Long-Tail: Rangliste statt Donut-Sliver (Form folgt der
  // Datenlogik — viele Kategorien + Long-Tail lesen sich als horizontale Balken).
  // Klick auf eine Zeile fuehrt in den Bestand, dort nach Dokumenttyp gefiltert.
  const BAR_TOP = 12;
  const rows = typed.slice(0, BAR_TOP).map((d, i) => ({
    label: d.label, value: d.count, color: PALETTE[i % PALETTE.length],
    onClick: () => applyArchivFilter('docType', d.id),
    hrefTitle: `${d.label} im Bestand zeigen`,
  }));
  const tail = typed.slice(BAR_TOP);
  if (tail.length) {
    rows.push({
      label: `Sonstige (${tail.length} Typen)`,
      value: tail.reduce((s, d) => s + d.count, 0),
      color: 'var(--color-sand)',
    });
  }
  if (ohneTyp) {
    rows.push({
      label: 'ohne Typ', value: ohneTyp.count, color: 'var(--color-text-tertiary)',
      onClick: () => applyArchivFilter('docType', '__none__'),
      hrefTitle: 'Records ohne klassifizierten Dokumenttyp im Bestand zeigen',
    });
  }

  section.appendChild(buildHorizontalBars(rows));
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
  { id: 'korrespondenz',  label: 'Reise & Korrespondenz', desc: 'Reisewege (Ziel-, Abreise-, Vertragsort), Korrespondenz-Orte und Briefdaten' },
  { id: 'diskursiv',      label: 'Diskursiv',      desc: 'Rezensionen, Rundfunk, Druckerscheinungen' },
  { id: 'biografisch',    label: 'Biografisch',    desc: 'Ausweise, Wohnsitz, persoenliche Dokumente' },
];

// Eine Quelle fuer die Sichten-Farben: die --color-sicht-*-Tokens (variables.css).
// Karte und Statistik zeigen dieselbe Sicht damit in derselben Farbe.
const SICHT_COLOR = {
  performativ:    'var(--color-sicht-performativ)',
  institutionell: 'var(--color-sicht-institutionell)',
  korrespondenz:  'var(--color-sicht-korrespondenz)',
  diskursiv:      'var(--color-sicht-diskursiv)',
  biografisch:    'var(--color-sicht-biografisch)',
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

  const rows = aggregateSichten(store).sort((a, b) => b.count - a.count);
  section.appendChild(buildHorizontalBars(rows.map(s => ({
    label: s.label,
    value: s.count,
    color: SICHT_COLOR[s.id] || PALETTE[0],
    // Klick fuehrt in die Karte, dort nur diese Sicht aktiv. Die residuale
    // "Nicht klassifiziert"-Gruppe hat kein Karten-Pendant und bleibt statisch.
    onClick: s.id === 'neutral' ? null : () => navigateToView('karte', { sicht: s.id }),
    hrefTitle: s.id === 'neutral' ? s.desc : `${s.label} auf der Karte zeigen`,
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
  const section = el('section', { className: 'stat-section stat-section--split' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Geografie'));

  const places = aggregatePlaces(store).slice(0, 10);
  const placesWrap = el('div', { className: 'stat-subsection' });
  placesWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Top 10 Orte'));
  placesWrap.appendChild(buildHorizontalBars(places.map(p => {
    // Cross-Link nur, wenn der aggregierte Stadtname ein Orts-Eintrag ist
    // (sonst liefe der location-Filter ins Leere; cityOf-Konsolidierung trifft
    // nicht jeden adressgenauen Ortsnamen). Wikidata bleibt als externer Verweis.
    const linkable = store.locations.has(p.name);
    return {
      label: p.name,
      value: p.count,
      onClick: linkable ? () => applyArchivFilter('location', p.name) : null,
      hrefTitle: linkable ? `${p.name} im Bestand zeigen` : p.name,
      extraHref: p.qid ? `https://www.wikidata.org/wiki/${String(p.qid).replace(/^wd:/, '')}` : null,
      extraTitle: p.qid ? `Bei Wikidata ansehen (${p.qid})` : '',
      // Wiederkehrende Orte in ihrer konstanten Wiedererkennungsfarbe, sonst KUG-Blau.
      color: ortColor(p.name) || PALETTE[0],
    };
  })));
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
// § 4 Netzwerk — AgRelOn-Donut + Rollen-Bar
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

function aggregatePersonRollen(store) {
  // Personen nach Rolle aus dem roles-Set (jede Person je distinkter Rolle einmal).
  // Datengetrieben statt der namensbasierten kategorie, die fast alle als "Andere"
  // fuehrte (loader.js getPersonKategorie deckt nur namentlich bekannte Personen ab).
  const counts = new Map();
  for (const p of store.persons.values()) {
    for (const r of (p.roles || [])) {
      if (!r) continue;
      const label = r.charAt(0).toUpperCase() + r.slice(1);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([rolle, count]) => ({ rolle, count }))
    .sort((a, b) => b.count - a.count);
}

function buildNetzwerkSection(store) {
  const section = el('section', { className: 'stat-section stat-section--split' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Netzwerk'));

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

  const rollItems = aggregatePersonRollen(store);
  if (rollItems.length > 0) {
    const top = rollItems.slice(0, 12);
    const rollWrap = el('div', { className: 'stat-subsection' });
    rollWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      `Personen nach Rolle (Top ${top.length} von ${rollItems.length})`));
    rollWrap.appendChild(buildHorizontalBars(top.map((item, i) => ({
      label: item.rolle,
      value: item.count,
      color: PALETTE[i % PALETTE.length],
    }))));
    section.appendChild(rollWrap);
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
  const section = el('section', { className: 'stat-section stat-section--minor stat-section--split' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Finanzen'));

  const fin = aggregateFinances(store);

  // Codes mit Ziffern ("00 DM") sind Erfassungsartefakte, keine Waehrungen \u2014 als
  // eine gedaempfte Sammelgruppe buendeln statt als gleichrangige Waehrung zeigen
  // (Ehrlichkeitsprinzip, siehe datenfehler.md).
  const validCur = fin.currencies.filter(c => !/\d/.test(c.code));
  const suspectCur = fin.currencies.filter(c => /\d/.test(c.code));
  if (validCur.length > 0 || suspectCur.length > 0) {
    const curWrap = el('div', { className: 'stat-subsection' });
    curWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'W\u00e4hrungen'));
    const curData = validCur.map((c, i) => ({
      label: `${c.label} (${c.code})`,
      value: c.count,
      color: PALETTE[i % PALETTE.length],
    }));
    if (suspectCur.length > 0) {
      const sum = suspectCur.reduce((s, c) => s + c.count, 0);
      curData.push({
        label: 'unklar (Erfassung)', value: sum, muted: true,
        color: 'var(--color-text-tertiary)',
        tip: `Fehlerhafte W\u00e4hrungsangaben: ${suspectCur.map(c => `${c.code} (${c.count})`).join(', ')}`,
      });
    }
    curWrap.appendChild(buildDonut(curData,
      { size: 300, ariaLabel: 'W\u00e4hrungen in den Finanznennungen' }));
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
function buildDonut(data, { size = 300, ariaLabel = '', categoryCount = null, categoryNoun = 'Kategorien' } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const wrap = el('div', { className: 'stat-chart stat-chart--donut' });

  if (typeof d3 === 'undefined' || total === 0) {
    // Ohne d3: Segmente plus aufgeloeste Sonstige-Kinder als Balkenliste.
    const flat = data.flatMap(d => Array.isArray(d.sub) ? d.sub : [d]);
    wrap.appendChild(buildHorizontalBars(flat.map(d => ({
      label: d.label, value: d.value, color: d.color, onClick: d.onClick,
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

  // Hover-Verkettung Segment <-> Legende: ein aktiver Index hebt beide hervor,
  // alle anderen werden ueber die CSS-Klasse `is-hovering` gedimmt.
  const arcNodes = [];
  const legendRows = [];
  const setActive = (idx) => {
    wrap.classList.toggle('is-hovering', idx != null);
    arcNodes.forEach((n, i) => n && n.classList.toggle('is-active', i === idx));
    legendRows.forEach((n, i) => n && n.classList.toggle('is-active', i === idx));
  };

  svg.selectAll('path')
    .data(pie(data))
    .join('path')
      .attr('class', d => `stat-donut__arc${d.data.onClick ? ' stat-donut__arc--link' : ''}`)
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('opacity', d => d.data.muted ? 0.5 : 1)
      .each(function (d) { arcNodes[d.index] = this; })
      .on('mouseenter', (_, d) => setActive(d.index))
      .on('mouseleave', () => setActive(null))
      .on('click', (_, d) => { if (d.data.onClick) d.data.onClick(); })
      .append('title')
        .text(d => d.data.tip
          || `${d.data.label}: ${d.data.value} (${Math.round(d.data.value / total * 100)}\u2009%)`);

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.1em')
    .attr('class', 'stat-donut__center-value')
    .text(total);
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.1em')
    .attr('class', 'stat-donut__center-label')
    .text((categoryCount ?? data.length) + ' ' + categoryNoun);

  chartEl.appendChild(svg.node());
  wrap.appendChild(chartEl);

  const legend = el('ul', { className: 'stat-chart__legend' });
  data.forEach((d, i) => {
    const { element, row } = buildLegendItem(d, i, total, setActive);
    legendRows[i] = row;
    legend.appendChild(element);
  });
  wrap.appendChild(legend);

  return wrap;
}

/**
 * Eine Legendenzeile. Mit `onClick` wird sie zum Cross-Link-Button (Drilldown),
 * mit `sub[]` zur aufklappbaren Gruppe ("Sonstige"), deren Kinder selbst
 * wieder Cross-Links sein koennen. `row` ist das Element fuer das Hover-Highlight.
 */
function buildLegendItem(d, idx, total, setActive) {
  const pct = total ? Math.round(d.value / total * 100) : 0;
  const hasSub = Array.isArray(d.sub) && d.sub.length > 0;
  const clickable = typeof d.onClick === 'function';

  const rowAttrs = {
    className: 'stat-chart__legend-row'
      + (clickable ? ' stat-chart__legend-row--link' : '')
      + (hasSub ? ' stat-chart__legend-row--group' : ''),
  };
  if (clickable) {
    rowAttrs.role = 'button';
    rowAttrs.tabindex = '0';
    rowAttrs.onClick = () => d.onClick();
    rowAttrs.onKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.onClick(); }
    };
  }
  const row = el('div', rowAttrs,
    el('span', {
      className: `stat-chart__legend-caret${hasSub ? '' : ' stat-chart__legend-caret--empty'}`,
      'aria-hidden': 'true',
    }, hasSub ? '\u203a' : ''),
    el('span', { className: 'stat-chart__legend-swatch',
      style: `background:${d.color}; opacity:${d.muted ? 0.5 : 1}` }),
    el('span', { className: 'stat-chart__legend-label', dataset: { tip: d.tip || d.label } }, d.label),
    el('span', { className: 'stat-chart__legend-value' }, `${d.value} \u00b7 ${pct}\u2009%`),
  );
  row.addEventListener('mouseenter', () => setActive(idx));
  row.addEventListener('mouseleave', () => setActive(null));

  const li = el('li', { className: 'stat-chart__legend-item' }, row);

  if (hasSub) {
    const subList = el('ul', { className: 'stat-chart__legend-sub' });
    subList.hidden = true;
    for (const s of d.sub) {
      const subPct = total ? Math.round(s.value / total * 100) : 0;
      const subClickable = typeof s.onClick === 'function';
      const subAttrs = {
        className: 'stat-chart__legend-subitem' + (subClickable ? ' stat-chart__legend-row--link' : ''),
      };
      if (subClickable) {
        subAttrs.role = 'button';
        subAttrs.tabindex = '0';
        subAttrs.onClick = () => s.onClick();
        subAttrs.onKeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onClick(); }
        };
      }
      subList.appendChild(el('li', subAttrs,
        el('span', { className: 'stat-chart__legend-swatch', style: `background:${s.color}` }),
        el('span', { className: 'stat-chart__legend-label', dataset: { tip: s.tip || s.label } }, s.label),
        el('span', { className: 'stat-chart__legend-value' }, `${s.value} \u00b7 ${subPct}\u2009%`),
      ));
    }
    row.addEventListener('click', () => {
      const open = subList.hidden;
      subList.hidden = !open;
      row.classList.toggle('is-open', open);
    });
    li.appendChild(subList);
  }

  return { element: li, row };
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

    // Label: in-App-Cross-Link (onClick) als Button, externer Link (href) als
    // Anker, sonst statischer Text.
    let label;
    if (typeof row.onClick === 'function') {
      label = el('span', {
        className: 'stat-bars__label stat-bars__label--link',
        role: 'button', tabindex: '0', title: row.hrefTitle || '',
        onClick: () => row.onClick(),
        onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.onClick(); } },
      }, row.label);
    } else if (row.href) {
      label = el('a', {
        className: 'stat-bars__label stat-bars__label--link',
        href: row.href, target: '_blank', rel: 'noopener', title: row.hrefTitle || '',
      }, row.label);
    } else {
      label = el('span', { className: 'stat-bars__label', title: row.hrefTitle || '' }, row.label);
    }

    const track = el('div', { className: 'stat-bars__track' });
    const fill = el('div', { className: 'stat-bars__fill' });
    fill.style.width = `${Math.max(2, Math.round((row.value / max) * 100))}%`;
    if (row.color) fill.style.background = row.color;
    track.appendChild(fill);

    const ext = row.extraHref
      ? el('a', {
          className: 'stat-bars__ext', href: row.extraHref,
          target: '_blank', rel: 'noopener', title: row.extraTitle || 'Externer Verweis',
          'aria-label': row.extraTitle || 'Externer Verweis',
        }, '↗')
      : null;

    li.appendChild(label);
    li.appendChild(track);
    li.appendChild(el('span', { className: 'stat-bars__count' }, ext, String(row.value)));
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
