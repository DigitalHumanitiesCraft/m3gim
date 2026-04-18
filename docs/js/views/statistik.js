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

export function renderStatistik(store, container) {
  clear(container);

  const wrap = el('div', { className: 'statistik' });
  wrap.appendChild(buildIntro());

  wrap.appendChild(buildHeroRow(store));

  const body = el('div', { className: 'statistik__sections' });
  body.appendChild(buildBestandSection(store));
  body.appendChild(placeholderSection('Mobilitaetssichten + Geografie', 'M2'));
  body.appendChild(placeholderSection('Netzwerk + Repertoire', 'M3'));
  body.appendChild(placeholderSection('Qualitaet + Finanzen', 'M4'));
  wrap.appendChild(body);

  container.appendChild(wrap);

  const docTypes = aggregateDocTypes(store);
  const status = aggregateBearbeitungsstatus(store);

  logStamp('statistik', [
    ['records', store.allRecords.length],
    ['konvolute', store.konvolute.size],
    ['events', store.mobilityEvents.size],
    ['personen', store.persons.size],
    ['sektionen', body.childElementCount],
    ['doctypes', docTypes.length],
    ['abgeschlossen', status.abgeschlossen],
    ['unbearbeitet', status.unbearbeitet],
  ]);
}

// ---------------------------------------------------------------------------
// Intro + Hero
// ---------------------------------------------------------------------------

function buildIntro() {
  const intro = el('header', { className: 'statistik__intro' });
  intro.appendChild(el('h2', { className: 'statistik__title' }, 'Statistik'));
  intro.appendChild(el('p', { className: 'statistik__lead' },
    'Zusammenschau des Bestandes: Umfang, Verknuepfungen, Datenqualitaet. '
    + 'Kein Forschungswerkzeug -- zeigt, was in den Daten steckt und was damit moeglich wird.'));
  return intro;
}

function buildHeroRow(store) {
  const hero = el('div', { className: 'statistik-hero', 'aria-label': 'Kennzahlen' });
  hero.appendChild(heroCard({
    value: store.allRecords.length,
    label: 'Datensaetze',
    caption: 'Einzelverzeichnungen aus dem Teilnachlass UAKUG/NIM',
    href: '#bestand',
  }));
  hero.appendChild(heroCard({
    value: store.konvolute.size,
    label: 'Konvolute',
    caption: 'Archivische Sammlungseinheiten (NIM_001 ... NIM_011)',
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
    caption: 'Im Personenindex gefuehrte Agent:innen (Sozio-Netzwerk)',
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
  for (const rec of store.allRecords) {
    const id = getDocTypeId(rec);
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => {
      const concept = store.dftHierarchy.get(id);
      const label = concept?.prefLabel || id;
      return { id, count, label };
    })
    .sort((a, b) => b.count - a.count);
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

// ---------------------------------------------------------------------------
// Placeholder fuer noch nicht umgesetzte Milestones
// ---------------------------------------------------------------------------

function placeholderSection(label, milestone) {
  const section = el('section', { className: 'stat-section stat-section--placeholder' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, label));
  section.appendChild(el('p', { className: 'stat-section__placeholder' },
    `Folgt in Milestone ${milestone}.`));
  return section;
}
