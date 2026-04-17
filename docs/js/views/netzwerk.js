/**
 * M3GIM Netzwerk-Tab — AgRelOn-Beziehungen in Tabellenform (keine Graph-Darstellung).
 *
 * Pivot: pro Agenten-Gegenseite die Liste der Relations-Typen mit Count.
 * Inline-Breakdown "KORRESP · BERUF · PATRON ... → Summe" als Mini-Chips
 * analog zum Repertoire-Tab. Klick auf eine Zeile oeffnet die Belegliste
 * im Detail-Panel; Klick auf einen Beleg navigiert ins Archiv.
 *
 * Begruendung Tabelle vor Graph: knowledge/interface-konzept.md § Tabelle
 * vor Chart fuer Rankings.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { buildRoleChip } from './archiv-inline-detail.js';
import { navigateToView } from '../ui/router.js';
import { AGRELON_LABELS } from '../data/constants.js';

// Kurzschreibung (Uppercase, kurz) fuer die Chips.
const AGRELON_SHORT = {
  'agrelon:HasEmployeeEmployer':    'ARBGBR',
  'agrelon:HasCorrespondent':       'KORRESP',
  'agrelon:HasProfessionalContact': 'BERUF',
  'agrelon:HasIsPatron':            'PATRON',
  'agrelon:HasIsMember':            'MITGLIED',
};

function shortForType(type) {
  if (!type) return '?';
  return AGRELON_SHORT[type] || String(type).replace(/^agrelon:Has/, '').toUpperCase();
}

function labelForType(type) {
  if (!type) return '?';
  return AGRELON_LABELS[type] || String(type).replace(/^agrelon:/, '');
}

// ---------------------------------------------------------------------------
// Aggregation: store.agentRelations (Map<recordId, rel[]>) → pro Objekt-Name
// ---------------------------------------------------------------------------

function aggregate(store) {
  const byAgent = new Map(); // agentKey -> tally
  for (const [recordId, rels] of store.agentRelations.entries()) {
    for (const r of rels) {
      const name = r.objectName || '?';
      if (!byAgent.has(name)) {
        byAgent.set(name, {
          name,
          wikidata: r.objectWikidata || null,
          types: new Map(),   // type -> count
          records: new Set(),
          summe: 0,
        });
      }
      const entry = byAgent.get(name);
      entry.types.set(r.type, (entry.types.get(r.type) || 0) + 1);
      entry.records.add(recordId);
      entry.summe += 1;
      if (r.objectWikidata && !entry.wikidata) entry.wikidata = r.objectWikidata;
    }
  }
  const byTotal = (a, b) => (b.summe - a.summe) || a.name.localeCompare(b.name, 'de');
  return [...byAgent.values()].sort(byTotal);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let _store = null;
let _container = null;
let _data = null;
let _selected = null;

export function renderNetzwerk(store, container) {
  _store = store;
  _container = container;
  _data = aggregate(store);
  _selected = null;
  draw();
}

function draw() {
  clear(_container);
  _container.appendChild(renderHeader());

  const body = el('div', { className: 'netzwerk__body' });
  body.appendChild(renderTable());
  body.appendChild(renderDetail());
  _container.appendChild(body);
}

function renderHeader() {
  return el('header', { className: 'netzwerk__header' },
    el('h2', { className: 'netzwerk__title' }, 'Netzwerk'),
    el('p', { className: 'netzwerk__subtitle' },
      'AgRelOn-Beziehungen aus dem Teilnachlass — als Tabelle, nicht als Graph. ',
      'Jede Zeile zeigt eine Agenten-Gegenseite mit Breakdown nach Beziehungstyp.'),
  );
}

function renderTable() {
  const wrap = el('section', { className: 'netzwerk__table' });
  wrap.appendChild(el('h3', { className: 'netzwerk__section-title' },
    'Agenten & Beziehungen',
    el('span', { className: 'netzwerk__count' }, ` (${_data.length})`),
  ));

  if (_data.length === 0) {
    wrap.appendChild(el('p', { className: 'netzwerk__empty' },
      'Keine AgRelOn-Beziehungen im aktuellen Datenstand. Die Schicht wird im ',
      'Rahmen der Erschliessung weiter aufgebaut.'));
    return wrap;
  }

  const list = el('ol', { className: 'netzwerk__list' });
  for (const e of _data) {
    const active = _selected && _selected.name === e.name;
    const li = el('li', {
      className: `netzwerk__row${active ? ' netzwerk__row--selected' : ''}`,
      onClick: () => {
        _selected = active ? null : e;
        draw();
      },
    });

    // Name + optional Wikidata-Badge
    const nameCell = el('div', { className: 'netzwerk__name' },
      el('span', { className: 'netzwerk__name-main' }, e.name),
    );
    li.appendChild(nameCell);

    // Breakdown-Chips (sortiert nach Count absteigend)
    const breakdown = el('div', { className: 'netzwerk__breakdown' });
    const sortedTypes = [...e.types.entries()].sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes) {
      breakdown.appendChild(buildRoleChip({
        prefix: shortForType(type),
        value: String(count),
        cluster: 'beziehung',
        tip: labelForType(type),
        compact: true,
      }));
    }
    li.appendChild(breakdown);

    // Summe
    li.appendChild(el('div', { className: 'netzwerk__summe' }, String(e.summe)));
    list.appendChild(li);
  }
  wrap.appendChild(list);
  return wrap;
}

function renderDetail() {
  const detail = el('aside', { className: 'netzwerk__detail', id: 'netzwerk-detail' });
  drawDetail(detail);
  return detail;
}

function drawDetail(panel) {
  panel = panel || _container.querySelector('#netzwerk-detail');
  if (!panel) return;
  clear(panel);

  if (!_selected) {
    panel.appendChild(el('div', { className: 'netzwerk__detail-empty' },
      'Klick auf eine Zeile zeigt die zugehoerigen Belege.'));
    return;
  }

  panel.appendChild(el('h3', { className: 'netzwerk__detail-title' }, _selected.name));

  const counts = el('div', { className: 'netzwerk__detail-counts' });
  for (const [type, count] of _selected.types.entries()) {
    counts.appendChild(buildRoleChip({
      prefix: shortForType(type),
      value: String(count),
      cluster: 'beziehung',
      tip: labelForType(type),
    }));
  }
  counts.appendChild(el('span', { className: 'netzwerk__detail-total' }, `→ ${_selected.summe}`));
  panel.appendChild(counts);

  // Belege
  const recs = [..._selected.records]
    .map(id => _store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:date'] || '').localeCompare(b['rico:date'] || ''));

  const list = el('ul', { className: 'netzwerk__record-list' });
  for (const r of recs) {
    const sig = formatSignatur(r['rico:identifier']);
    list.appendChild(el('li', {
      className: 'netzwerk__record',
      onClick: () => navigateToView('archiv', { recordId: r['@id'] }),
    },
      el('span', { className: 'netzwerk__record-sig' }, sig),
      el('span', { className: 'netzwerk__record-title' }, r['rico:title'] || '(ohne Titel)'),
      el('span', { className: 'netzwerk__record-date' }, r['rico:date'] || ''),
    ));
  }
  panel.appendChild(list);
}

// ---------------------------------------------------------------------------
// Debug
// ---------------------------------------------------------------------------

export function netzwerkAggregate() {
  if (!_store) return null;
  return aggregate(_store);
}
