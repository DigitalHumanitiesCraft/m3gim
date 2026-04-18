/**
 * Statistik-View (Session 37).
 *
 * Read-only Showroom des Bestandes: aggregiert alle Store-Maps zu einer
 * Zusammenschau. Kein Forschungstool -- keine Filter, keine Suche, keine
 * internen Module-Variablen. Jede Sektion ist eine reine Funktion, die
 * store-Daten in DOM-Knoten umwandelt.
 */

import { clear, el } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import { getDocTypeId } from '../utils/format.js';
import { mobilityClusterFor } from '../data/constants.js';

export function renderStatistik(store, container) {
  clear(container);

  const wrap = el('div', { className: 'statistik' });
  wrap.appendChild(buildIntro(store));

  wrap.appendChild(buildHeroRow(store));

  const body = el('div', { className: 'statistik__sections' });
  body.appendChild(buildBestandSection(store));
  body.appendChild(buildMobilitaetSection(store));
  body.appendChild(buildGeografieSection(store));
  body.appendChild(buildNetzwerkSection(store));
  body.appendChild(buildRepertoireSection(store));
  body.appendChild(buildQualitaetSection(store));
  body.appendChild(buildFinanzenSection(store));
  wrap.appendChild(body);

  container.appendChild(wrap);

  const docTypes = aggregateDocTypes(store);
  const docTypesOhne = docTypes.find(d => d.id === null)?.count || 0;
  const status = aggregateBearbeitungsstatus(store);
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
    ['abgeschlossen', status.abgeschlossen],
    ['unbearbeitet', status.unbearbeitet],
    ['sichten', sichten.filter(s => s.count > 0).length],
    ['orte', places.length],
    ['relationen', relations.total],
    ['komponisten', composers.length],
    ['finanzen', finances.total],
    ['waehrungen', finances.currencies.length],
  ]);
}

// ---------------------------------------------------------------------------
// Intro + Hero
// ---------------------------------------------------------------------------

function buildIntro(store) {
  const status = aggregateBearbeitungsstatus(store);
  const total = store.allRecords.length;
  const bearbeitet = status.abgeschlossen + status.begonnen + status.zurueckgestellt;
  const pct = total ? Math.round((bearbeitet / total) * 100) : 0;

  const intro = el('header', { className: 'statistik__intro' });
  intro.appendChild(el('h2', { className: 'statistik__title' }, 'Statistik'));
  intro.appendChild(el('p', { className: 'statistik__lead' },
    'Zusammenschau des Bestandes: Umfang, Verknuepfungen, Datenqualitaet. '
    + 'Kein Forschungswerkzeug -- zeigt, was in den Daten steckt und was damit moeglich wird.'));
  intro.appendChild(el('p', { className: 'statistik__caveat' },
    `Der Bestand ist kuratiert, nicht fertig: ${bearbeitet} von ${total} `
    + `Datensaetzen (${pct}\u2009%) tragen einen Bearbeitungsstand, der `
    + `Rest wartet auf Erschliessung. Details siehe "Bestand in Zahlen".`));
  return intro;
}

function buildHeroRow(store) {
  const hero = el('div', { className: 'statistik-hero', 'aria-label': 'Kennzahlen' });
  hero.appendChild(heroCard({
    value: store.allRecords.length,
    label: 'Datensaetze',
    caption: 'Einzelverzeichnungen aus UAKUG/NIM (Plakate, Tontraeger und Folios zusammen)',
    href: '#bestand',
  }));
  hero.appendChild(heroCard({
    value: store.konvolute.size,
    label: 'Konvolute',
    caption: 'Archivische Sammlungseinheiten. Der Bestand-Tab zeigt nur Konvolute mit bearbeiteten Folios.',
    href: '#bestand',
  }));
  hero.appendChild(heroCard({
    value: store.mobilityEvents.size,
    label: 'Spatiotemporal-Events',
    caption: 'Datierte Ereignisse mit Ort und Rolle -- Basis der Chronik',
    href: '#chronik',
  }));
  hero.appendChild(heroCard({
    value: store.persons.size,
    label: 'Personen',
    caption: 'Im Personenindex gefuehrt -- aktive Agent:innen und rein Erwaehnte zusammen',
    href: '#indizes',
  }));
  return hero;
}

function heroCard({ value, label, caption, href }) {
  const card = el('a', { className: 'statistik-hero__card', href });
  card.appendChild(el('span', { className: 'statistik-hero__value' }, String(value)));
  card.appendChild(el('span', { className: 'statistik-hero__label' }, label));
  card.appendChild(el('span', { className: 'statistik-hero__caption' }, caption));
  return card;
}

// ---------------------------------------------------------------------------
// § 1 Bestand in Zahlen
// ---------------------------------------------------------------------------

function buildBestandSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Bestand in Zahlen'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Verteilung nach Dokumenttyp und Bearbeitungsstand. Der Erschliessungsstand '
    + 'wird ehrlich gezeigt -- der Bestand ist kuratiert, nicht fertig.'));

  // Dokumenttypen
  const docTypes = aggregateDocTypes(store);
  const docWrap = el('div', { className: 'stat-subsection' });
  docWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Dokumenttypen'));
  docWrap.appendChild(buildBarList(docTypes.map(d => ({
    label: d.label,
    count: d.count,
    total: store.allRecords.length,
    tone: d.tone,
  }))));
  section.appendChild(docWrap);

  // Bearbeitungsstatus
  const status = aggregateBearbeitungsstatus(store);
  const statusWrap = el('div', { className: 'stat-subsection' });
  statusWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Bearbeitungsstand'));
  const total = store.allRecords.length;
  const statusRows = [
    { label: 'abgeschlossen',  count: status.abgeschlossen,  total, tone: 'complete' },
    { label: 'begonnen',       count: status.begonnen,       total, tone: 'progress' },
    { label: 'zurueckgestellt', count: status.zurueckgestellt, total, tone: 'deferred' },
    { label: 'ohne Status-Feld', count: status.ohneFeld, total, tone: 'unprocessed' },
  ];
  statusWrap.appendChild(buildBarList(statusRows));
  section.appendChild(statusWrap);

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
    rows.push({ id: null, count: ohneTyp, label: 'ohne Typ', tone: 'missing' });
  }
  return rows;
}

function aggregateBearbeitungsstatus(store) {
  const out = { abgeschlossen: 0, begonnen: 0, zurueckgestellt: 0, ohneFeld: 0, unbearbeitet: 0 };
  for (const rec of store.allRecords) {
    const s = rec['m3gim:bearbeitungsstand'];
    if (s === 'abgeschlossen') out.abgeschlossen++;
    else if (s === 'begonnen') out.begonnen++;
    else if (s === 'zurueckgestellt') out.zurueckgestellt++;
    else out.ohneFeld++;
    if (store.unprocessedIds.has(rec['@id'])) out.unbearbeitet++;
  }
  return out;
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

function aggregateSichten(store) {
  const buckets = new Map(SICHTEN.map(s => [s.id, { ...s, count: 0, example: null }]));
  let unklassifiziert = 0;
  let unklassifiziertExample = null;
  for (const ev of store.mobilityEvents.values()) {
    const cluster = mobilityClusterFor(ev.role);
    if (cluster && buckets.has(cluster)) {
      const b = buckets.get(cluster);
      b.count++;
      if (!b.example) b.example = ev;
    } else {
      unklassifiziert++;
      if (!unklassifiziertExample) unklassifiziertExample = ev;
    }
  }
  const rows = [...buckets.values()];
  if (unklassifiziert > 0) {
    rows.push({
      id: 'neutral', label: 'Nicht klassifiziert',
      desc: 'Rollen ausserhalb der fuenf Sichten (erwaehnt, auftrag, entstehung)',
      count: unklassifiziert, example: unklassifiziertExample,
    });
  }
  return rows;
}

function buildMobilitaetSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' },
    'Die fuenf Mobilitaetssichten'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Spatiotemporal-Events werden nach der '
    + 'Rolle im Forschungsrahmen klassifiziert. Die Farben entsprechen den '
    + 'Chronik-Chips -- orthogonal zu den Mobilitaetstypen in '
    + 'forschungsrahmen.md.'));

  const grid = el('div', { className: 'statistik-sichten' });
  const total = store.mobilityEvents.size;
  for (const s of aggregateSichten(store)) {
    grid.appendChild(buildSichtCard(s, total, store));
  }
  section.appendChild(grid);

  return section;
}

function buildSichtCard(sicht, total, store) {
  const pct = total ? Math.round((sicht.count / total) * 100) : 0;
  const card = el('article', {
    className: `statistik-sicht statistik-sicht--${sicht.id}`,
  });
  card.appendChild(el('h4', { className: 'statistik-sicht__label' }, sicht.label));
  card.appendChild(el('div', { className: 'statistik-sicht__value' },
    String(sicht.count)));
  card.appendChild(el('div', { className: 'statistik-sicht__pct' },
    `${pct}\u2009% der Events`));
  card.appendChild(el('p', { className: 'statistik-sicht__desc' }, sicht.desc));
  if (sicht.example && sicht.example.recordId) {
    const exRec = store.records.get(sicht.example.recordId);
    const title = (exRec && exRec['rico:title']) || sicht.example.recordId;
    const snippet = title.length > 72 ? title.slice(0, 70) + '...' : title;
    const link = el('a', {
      className: 'statistik-sicht__example',
      href: `#bestand/${encodeURIComponent(sicht.example.recordId)}`,
      title: 'Beispiel-Datensatz oeffnen',
    }, `Beispiel: ${snippet}`);
    card.appendChild(link);
  }
  return card;
}

// ---------------------------------------------------------------------------
// § 3 Geografie
// ---------------------------------------------------------------------------

function aggregatePlaces(store) {
  const map = new Map();
  for (const ev of store.mobilityEvents.values()) {
    if (!ev.place) continue;
    const key = ev.placeWikidata || ev.place;
    if (!map.has(key)) {
      map.set(key, { name: ev.place, qid: ev.placeWikidata || null, count: 0 });
    }
    map.get(key).count++;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function eventYearSpan(store) {
  let minY = Infinity, maxY = -Infinity, datedCount = 0;
  for (const ev of store.mobilityEvents.values()) {
    if (typeof ev.date !== 'string' || ev.date.length < 4) continue;
    const y = parseInt(ev.date.slice(0, 4), 10);
    if (!Number.isFinite(y)) continue;
    datedCount++;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!datedCount) return null;
  return { from: minY, to: maxY, datedCount };
}

function buildGeografieSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Geografie'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Aus den Spatiotemporal-Events abgeleitet: welche Orte wie oft als '
    + 'Ereignisort belegt sind, plus die Zeitspanne der datierten Events.'));

  const places = aggregatePlaces(store).slice(0, 10);
  const placesWrap = el('div', { className: 'stat-subsection' });
  placesWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    'Top 10 Orte'));
  const list = el('ul', { className: 'stat-bars' });
  const max = places[0]?.count || 1;
  for (const p of places) {
    const li = el('li', { className: 'stat-bars__row' });
    const label = p.qid
      ? el('a', {
          className: 'stat-bars__label stat-bars__label--link',
          href: `https://www.wikidata.org/wiki/${String(p.qid).replace(/^wd:/, '')}`,
          target: '_blank',
          rel: 'noopener',
          title: `Wikidata: ${p.qid}`,
        }, p.name)
      : el('span', { className: 'stat-bars__label' }, p.name);
    const track = el('div', { className: 'stat-bars__track' });
    const fill = el('div', { className: 'stat-bars__fill' });
    fill.style.width = `${Math.max(2, Math.round((p.count / max) * 100))}%`;
    track.appendChild(fill);
    const count = el('span', { className: 'stat-bars__count' }, String(p.count));
    li.appendChild(label);
    li.appendChild(track);
    li.appendChild(count);
    list.appendChild(li);
  }
  placesWrap.appendChild(list);
  section.appendChild(placesWrap);

  const span = eventYearSpan(store);
  const spanWrap = el('div', { className: 'stat-subsection' });
  spanWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    'Zeitspanne der Events'));
  if (span) {
    spanWrap.appendChild(el('p', { className: 'statistik-span' },
      `${span.from} \u2013 ${span.to}`));
    spanWrap.appendChild(el('p', { className: 'statistik-span__caption' },
      `${span.datedCount} von ${store.mobilityEvents.size} Events mit Datum`));
  } else {
    spanWrap.appendChild(el('p', { className: 'statistik-span__caption' },
      'Keine datierten Events im Store.'));
  }
  section.appendChild(spanWrap);

  return section;
}

// ---------------------------------------------------------------------------
// § 4 Netzwerk
// ---------------------------------------------------------------------------

const AGRELON_LABEL = {
  'agrelon:HasCorrespondent':       'Korrespondenz',
  'agrelon:HasIsPatron':             'Foerderung / Patronage',
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
    'Agent-zu-Agent-Beziehungen nach AgRelOn (typisierte Relationen wie '
    + 'Korrespondenz, Foerderung, Mitgliedschaft) und Personen nach Rolle im '
    + 'Musikleben der Nachkriegszeit. Organisationen werden ergaenzend gezaehlt.'));

  const { items: relItems, total: relTotal } = aggregateAgentRelations(store);
  const relWrap = el('div', { className: 'stat-subsection' });
  relWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    `AgRelOn-Relationen (${relTotal})`));
  const relRow = el('div', { className: 'statistik-chips' });
  for (const item of relItems) {
    relRow.appendChild(buildCountChip({
      label: item.label,
      count: item.count,
      title: item.type,
      tone: 'relation',
    }));
  }
  relWrap.appendChild(relRow);
  section.appendChild(relWrap);

  const katItems = aggregatePersonKategorien(store);
  const katWrap = el('div', { className: 'stat-subsection' });
  katWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    'Personen nach Kategorie'));
  const katRow = el('div', { className: 'statistik-chips' });
  for (const item of katItems) {
    katRow.appendChild(buildCountChip({
      label: item.kategorie,
      count: item.count,
      tone: 'kategorie-' + String(item.kategorie).toLowerCase().replace(/[^a-z]/g, ''),
    }));
  }
  katWrap.appendChild(katRow);
  section.appendChild(katWrap);

  const orgCount = store.organizations.size;
  const orgRow = el('p', { className: 'statistik-note' },
    `Organisationen im Index: `);
  orgRow.appendChild(el('strong', {}, String(orgCount)));
  orgRow.appendChild(document.createTextNode(
    ' (Opernhaeuser, Festspiele, Verbaende; in Indizes als eigener Register sichtbar).'));
  section.appendChild(orgRow);

  return section;
}

function buildCountChip({ label, count, title = '', tone = '' }) {
  const chip = el('span', {
    className: 'statistik-chip' + (tone ? ` statistik-chip--${tone}` : ''),
    ...(title ? { title } : {}),
  });
  chip.appendChild(el('span', { className: 'statistik-chip__label' }, label));
  chip.appendChild(el('span', { className: 'statistik-chip__count' }, String(count)));
  return chip;
}

// ---------------------------------------------------------------------------
// § 5 Repertoire
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
    'Musikalische Werke im Bestand, aggregiert nach Komponist. Basis ist '
    + '`rico:hasOrHadSubject` mit `@type: m3gim:MusicalWork`; das Komponisten-'
    + 'Mapping normalisiert Namensvarianten.'));

  const composers = aggregateComposers(store);
  const top = composers.slice(0, 10);
  const subWrap = el('div', { className: 'stat-subsection' });
  subWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    `Top 10 Komponisten (von ${composers.length})`));
  subWrap.appendChild(buildBarList(top.map(c => ({
    label: c.komponist,
    count: c.count,
    total: 0,
  }))));
  section.appendChild(subWrap);

  const summary = el('p', { className: 'statistik-note' });
  summary.appendChild(el('strong', {}, String(store.works.size)));
  summary.appendChild(document.createTextNode(
    ` einzigartige Werke im Repertoire, verteilt auf ${composers.length} `
    + `Komponisten.`));
  if (top.length > 0) {
    summary.appendChild(document.createTextNode(
      ` Fuehrend: ${top[0].komponist} (${top[0].count} Werke).`));
  }
  section.appendChild(summary);

  return section;
}

// ---------------------------------------------------------------------------
// § 6 Verlinkung & Qualitaet
// ---------------------------------------------------------------------------

function wikidataCoverage(map) {
  let withQid = 0;
  for (const entry of map.values()) {
    if (entry.wikidata && String(entry.wikidata).startsWith('wd:')) withQid++;
  }
  return { withQid, total: map.size };
}

function provenanceCoverage(store) {
  let withSource = 0;
  for (const rec of store.allRecords) {
    if (rec['m3gim:xlsxSource']) withSource++;
  }
  return { withSource, total: store.allRecords.length };
}

function buildQualitaetSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' },
    'Verlinkung & Qualitaet'));
  section.appendChild(el('p', { className: 'stat-section__lead' },
    'Anteil der Wikidata-verknuepften Entitaeten und Nachvollziehbarkeit '
    + 'ueber die ursprunglichen XLSX-Zeilen. Der ehrliche Blick auf die Daten.'));

  const wikidata = [
    { label: 'Personen',       ...wikidataCoverage(store.persons) },
    { label: 'Organisationen', ...wikidataCoverage(store.organizations) },
    { label: 'Orte',           ...wikidataCoverage(store.locations) },
    { label: 'Werke',          ...wikidataCoverage(store.works) },
  ];
  const wdWrap = el('div', { className: 'stat-subsection' });
  wdWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    'Wikidata-Abdeckung nach Entitaetstyp'));
  const wdList = el('ul', { className: 'stat-bars' });
  for (const row of wikidata) {
    const pct = row.total ? Math.round((row.withQid / row.total) * 100) : 0;
    const li = el('li', { className: 'stat-bars__row' });
    li.appendChild(el('span', { className: 'stat-bars__label' }, row.label));
    const track = el('div', { className: 'stat-bars__track' });
    const fill = el('div', { className: 'stat-bars__fill stat-bars__fill--complete' });
    fill.style.width = `${Math.max(2, pct)}%`;
    track.appendChild(fill);
    li.appendChild(track);
    li.appendChild(el('span', { className: 'stat-bars__count' },
      `${row.withQid}\u2009/\u2009${row.total} (${pct}\u2009%)`));
    wdList.appendChild(li);
  }
  wdWrap.appendChild(wdList);
  section.appendChild(wdWrap);

  const prov = provenanceCoverage(store);
  const provWrap = el('div', { className: 'stat-subsection' });
  provWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Provenienz'));
  const provBadge = el('p', { className: 'statistik-note' });
  provBadge.appendChild(el('strong', {}, `${prov.withSource}\u2009/\u2009${prov.total}`));
  provBadge.appendChild(document.createTextNode(
    ' Records tragen `m3gim:xlsxSource` mit Sheet + Zeile. Jeder Datenpunkt '
    + 'ist in der Quell-Tabelle nachvollziehbar; verschachtelte Entities '
    + '(Agent-Relationen, DetailAnnotations, Spatiotemporal-Events) haben '
    + 'eigene xlsxSource-Einträge.'));
  provWrap.appendChild(provBadge);
  section.appendChild(provWrap);

  return section;
}

// ---------------------------------------------------------------------------
// § 7 Finanzen
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
      if (e.currency) {
        currencies.set(e.currency, (currencies.get(e.currency) || 0) + 1);
      }
      if (e.role) {
        roles.set(e.role, (roles.get(e.role) || 0) + 1);
      }
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
    'Monetäre Nennungen aus Briefen, Vertraegen und Abrechnungen, modelliert '
    + 'als DetailAnnotations mit `m3gim:monetaryAmount`. Eine Teilerschliessung '
    + '-- vollstaendige Auswertung braucht weitere Sichtung.'));

  const fin = aggregateFinances(store);

  const totalRow = el('p', { className: 'statistik-note' });
  totalRow.appendChild(el('strong', {}, String(fin.total)));
  totalRow.appendChild(document.createTextNode(
    ` monetäre Eintraege in ${fin.recordsWithFin} Records.`));
  section.appendChild(totalRow);

  if (fin.currencies.length > 0) {
    const curWrap = el('div', { className: 'stat-subsection' });
    curWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      'Waehrungen'));
    const curRow = el('div', { className: 'statistik-chips' });
    for (const c of fin.currencies) {
      curRow.appendChild(buildCountChip({
        label: `${c.label} (${c.code})`,
        count: c.count,
        tone: 'finance',
      }));
    }
    curWrap.appendChild(curRow);
    section.appendChild(curWrap);
  }

  if (fin.roles.length > 0) {
    const roleWrap = el('div', { className: 'stat-subsection' });
    roleWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      'Detail-Rollen'));
    const roleRow = el('div', { className: 'statistik-chips' });
    for (const r of fin.roles) {
      roleRow.appendChild(buildCountChip({
        label: r.role,
        count: r.count,
        tone: 'finance',
      }));
    }
    roleWrap.appendChild(roleRow);
    section.appendChild(roleWrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Shared: horizontale Balken-Liste
// ---------------------------------------------------------------------------

function buildBarList(rows) {
  const list = el('ul', { className: 'stat-bars' });
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  for (const row of rows) {
    const li = el('li', { className: 'stat-bars__row' });
    const label = el('span', { className: 'stat-bars__label' }, row.label);
    const track = el('div', { className: 'stat-bars__track' });
    const fill = el('div', {
      className: 'stat-bars__fill' + (row.tone ? ` stat-bars__fill--${row.tone}` : ''),
    });
    fill.style.width = `${Math.max(2, Math.round((row.count / max) * 100))}%`;
    track.appendChild(fill);
    const countTxt = row.total
      ? `${row.count} (${Math.round((row.count / row.total) * 100)}\u2009%)`
      : String(row.count);
    const count = el('span', { className: 'stat-bars__count' }, countTxt);
    li.appendChild(label);
    li.appendChild(track);
    li.appendChild(count);
    list.appendChild(li);
  }
  return list;
}

