/**
 * M3GIM Repertoire Tab — parallele Aggregat-Tabellen: Werke x Komponisten.
 *
 * Inline-Breakdown "ERW · AUFF · REP → Summe" pro Zeile. Records sind
 * gruppiert nach Rolle am Werk (erwaehnt vs. performance-ish) plus DFT-Typ
 * "repertoireliste". Klick auf eine Zeile oeffnet die Belegliste im Detail-
 * Panel rechts.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { buildRoleChip } from './archiv-inline-detail.js';
import { navigateToView } from '../ui/router.js';

// ---------------------------------------------------------------------------
// Rollen-Partition
// ---------------------------------------------------------------------------

// Alle Performance-Rollen am Werk (Komposit: aufgefuehrt / auftritt / premiere etc.)
const PERFORMANCE_ROLES = new Set([
  'auffuehrung', 'aufführung',
  'premiere',
  'festvorstellung',
  'wiederaufnahme',
  'auftritt',
]);

const MENTION_ROLE = 'erwähnt';

// DFT-Typ, der einen Record als Repertoire-Eintrag kennzeichnet
const REPERTOIRE_DFT = 'm3gim-dft:repertoireliste';

function roleCategory(role) {
  const r = (role || '').trim().toLowerCase();
  if (!r) return null;
  if (r === MENTION_ROLE || r === 'erwaehnt') return 'erwaehnt';
  if (PERFORMANCE_ROLES.has(r)) return 'auffuehrung';
  return null;
}

function recordIsRepertoire(record) {
  const dft = record['rico:hasDocumentaryFormType'];
  const id = (dft && dft['@id']) || (typeof dft === 'string' ? dft : null);
  return id === REPERTOIRE_DFT;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Laeuft ueber alle Records und tallyt pro Werk + pro Komponist die
 * Belegtypen. Rueckgabe: { works: [...], composers: [...] }.
 *
 * Jedes Eintragsobjekt: { name, erwaehnt, auffuehrung, repertoire, summe,
 * records: Set<recordId>, komponist?: string, wikidata?: string }.
 */
function aggregate(store) {
  const works = new Map();     // workName -> tally
  const composers = new Map(); // composerName -> tally

  const ensureTally = (bucket, key) => {
    if (!bucket.has(key)) {
      bucket.set(key, {
        name: key,
        erwaehnt: 0,
        auffuehrung: 0,
        repertoire: 0,
        summe: 0,
        records: new Set(),
      });
    }
    return bucket.get(key);
  };

  for (const record of store.records.values()) {
    // Konvolute / Folio-Platzhalter ueberspringen
    if (record['@type'] === 'rico:RecordSet') continue;

    const subjects = ensureArray(record['rico:hasOrHadSubject']);
    const isRep = recordIsRepertoire(record);

    for (const subj of subjects) {
      if (!subj || subj['@type'] !== 'm3gim:MusicalWork') continue;
      const workName = subj.name || subj['skos:prefLabel'] || '';
      if (!workName) continue;
      const komponist = subj.komponist || null;
      const category = roleCategory(subj.role);

      const workTally = ensureTally(works, workName);
      if (komponist && !workTally.komponist) workTally.komponist = komponist;
      const wid = subj['@id'] && String(subj['@id']).startsWith('wd:') ? subj['@id'] : null;
      if (wid && !workTally.wikidata) workTally.wikidata = wid;

      if (isRep) workTally.repertoire += 1;
      if (category) workTally[category] += 1;
      workTally.summe += 1;
      workTally.records.add(record['@id']);

      if (komponist) {
        const compTally = ensureTally(composers, komponist);
        if (isRep) compTally.repertoire += 1;
        if (category) compTally[category] += 1;
        compTally.summe += 1;
        compTally.records.add(record['@id']);
      }
    }
  }

  const byTotal = (a, b) => (b.summe - a.summe) || a.name.localeCompare(b.name, 'de');

  return {
    works: [...works.values()].sort(byTotal),
    composers: [...composers.values()].sort(byTotal),
  };
}

function ensureArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let _lastAggregate = null;
let _selected = null; // { pivot: 'work'|'composer', key: string }
let _container = null;
let _store = null;

export function renderRepertoire(store, container) {
  _store = store;
  _container = container;
  _lastAggregate = aggregate(store);
  _selected = null;
  draw();
}

function draw() {
  clear(_container);

  const header = el('header', { className: 'repertoire__header' },
    el('h2', { className: 'repertoire__title' }, 'Repertoire'),
    el('p', { className: 'repertoire__subtitle' },
      'Buehnenrepertoire × Komponisten, aggregiert nach Belegtyp. Inline-Breakdown ',
      el('span', { className: 'repertoire__mono' }, 'ERW · AUFF · REP → Summe'),
      '. Klick auf eine Zeile oeffnet die Belege.'),
  );
  _container.appendChild(header);

  const body = el('div', { className: 'repertoire__body' });

  // Werke-Tabelle (links, dominanter Pivot)
  body.appendChild(buildTable({
    pivot: 'work',
    title: 'Buehnenrepertoire',
    subtitle: '(stage works)',
    entries: _lastAggregate.works,
    showKomponist: true,
  }));

  // Komponisten-Tabelle (rechts, schmaler)
  body.appendChild(buildTable({
    pivot: 'composer',
    title: 'Komponisten',
    subtitle: '(composers)',
    entries: _lastAggregate.composers,
    showKomponist: false,
  }));

  _container.appendChild(body);

  // Detail-Panel (darunter, nicht daneben — macht sich auf Belegliste auf)
  const detail = el('aside', { className: 'repertoire__detail', id: 'repertoire-detail' });
  _container.appendChild(detail);
  drawDetail();
}

function buildTable({ pivot, title, subtitle, entries, showKomponist }) {
  const wrap = el('section', { className: `repertoire__table repertoire__table--${pivot}` });

  wrap.appendChild(el('h3', { className: 'repertoire__section-title' },
    title,
    el('span', { className: 'repertoire__gloss' }, ' ' + subtitle),
    el('span', { className: 'repertoire__count' }, ` (${entries.length})`),
  ));

  const list = el('ol', { className: 'repertoire__list' });

  for (const e of entries) {
    const active = _selected && _selected.pivot === pivot && _selected.key === e.name;
    const li = el('li', {
      className: `repertoire__row${active ? ' repertoire__row--selected' : ''}`,
      onClick: () => {
        _selected = active ? null : { pivot, key: e.name };
        draw();
      },
    });

    // Name + Komponist-Untertitel
    const nameCell = el('div', { className: 'repertoire__name' },
      el('span', { className: 'repertoire__name-main' }, e.name),
      showKomponist && e.komponist
        ? el('span', { className: 'repertoire__name-sub' }, e.komponist)
        : null,
    );
    li.appendChild(nameCell);

    // Breakdown-Chips
    const breakdown = el('div', { className: 'repertoire__breakdown' });
    if (e.erwaehnt)   breakdown.appendChild(chip('ERW',  e.erwaehnt,   'ort'));
    if (e.auffuehrung) breakdown.appendChild(chip('AUFF', e.auffuehrung, 'ort'));
    if (e.repertoire)  breakdown.appendChild(chip('REP',  e.repertoire,  'rolle'));
    li.appendChild(breakdown);

    // Summe
    li.appendChild(el('div', { className: 'repertoire__summe' }, String(e.summe)));

    list.appendChild(li);
  }

  wrap.appendChild(list);
  return wrap;
}

function chip(prefix, count, cluster) {
  return buildRoleChip({ prefix, value: String(count), cluster, compact: true });
}

function drawDetail() {
  const detail = _container.querySelector('#repertoire-detail');
  if (!detail) return;
  clear(detail);

  if (!_selected) {
    detail.appendChild(el('div', { className: 'repertoire__detail-empty' },
      'Keine Auswahl. Klick auf eine Zeile zeigt die zugehoerigen Belege.'));
    return;
  }

  const bucket = _selected.pivot === 'work' ? _lastAggregate.works : _lastAggregate.composers;
  const entry = bucket.find(e => e.name === _selected.key);
  if (!entry) return;

  const headline = _selected.pivot === 'work'
    ? (entry.komponist ? `${entry.name} — ${entry.komponist}` : entry.name)
    : entry.name;
  detail.appendChild(el('h3', { className: 'repertoire__detail-title' }, headline));

  const counts = el('div', { className: 'repertoire__detail-counts' });
  if (entry.erwaehnt)   counts.appendChild(chip('ERW',  entry.erwaehnt, 'ort'));
  if (entry.auffuehrung) counts.appendChild(chip('AUFF', entry.auffuehrung, 'ort'));
  if (entry.repertoire)  counts.appendChild(chip('REP',  entry.repertoire, 'rolle'));
  counts.appendChild(el('span', { className: 'repertoire__detail-total' }, `→ ${entry.summe}`));
  detail.appendChild(counts);

  // Belegliste — gruppiert nach Jahr
  const records = [..._store.records.values()].filter(r => entry.records.has(r['@id']));
  records.sort((a, b) => (a['rico:date'] || '').localeCompare(b['rico:date'] || ''));

  const list = el('ul', { className: 'repertoire__record-list' });
  for (const r of records) {
    const sig = formatSignatur(r['rico:identifier']);
    const title = r['rico:title'] || '(ohne Titel)';
    const date = r['rico:date'] || '';
    list.appendChild(el('li', {
      className: 'repertoire__record',
      onClick: () => navigateToView('archiv', { recordId: r['@id'] }),
    },
      el('span', { className: 'repertoire__record-sig' }, sig),
      el('span', { className: 'repertoire__record-title' }, title),
      el('span', { className: 'repertoire__record-date' }, date),
    ));
  }
  detail.appendChild(list);
}

// ---------------------------------------------------------------------------
// Debug-Helper
// ---------------------------------------------------------------------------

export function repertoireAggregate() {
  if (!_store) return null;
  return aggregate(_store);
}
