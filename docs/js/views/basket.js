/**
 * M³GIM Wissenskorb View — bookmarked records with full metadata, relations,
 * finances and spatiotemporal events. Cards reuse buildRecordBlocks() from the
 * Archiv-Inline-Detail (E-77) so the korb tab shares the exact block logic and
 * design language of the main interface (single-column, no count suffix).
 */

import { el, clear } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import { formatSignatur, formatDocType, getDocTypeId, ensureArray, dftLabel } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { AGRELON_LABELS, formatLanguage } from '../data/constants.js';
import { buildRecordBlocks } from './archive-inline-detail.js';
import { getKorbItems, removeFromKorb, clearKorb, onKorbChange } from '../ui/basket.js';

let store = null;
let container = null;
let unsubscribeKorbChange = null;

export function renderKorb(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;

  // Vorheriges Abonnement abmelden — renderKorb laeuft bei jeder Korb-Aenderung
  // erneut (main.js rendert den Tab neu), sonst akkumulieren sich Listener.
  if (unsubscribeKorbChange) unsubscribeKorbChange();
  unsubscribeKorbChange = onKorbChange(() => renderList());
  renderList();
}

function renderList() {
  if (!container) return;
  clear(container);

  const wrapper = el('div', { className: 'korb-page' });
  const ids = getKorbItems();

  wrapper.appendChild(renderHeader(ids));

  const records = ids
    .map(id => store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true }));

  if (ids.length === 0) {
    wrapper.appendChild(renderEmpty());
  } else {
    const list = el('div', { className: 'korb-list' });
    for (const r of records) list.appendChild(renderCard(r));
    wrapper.appendChild(list);
  }

  container.appendChild(wrapper);
  logKorbStamp(ids, records);
}

/**
 * Strukturierter State-Stempel wie die uebrigen Tab-Views (env.logStamp), damit
 * der Korb smoke-testbar wird (vorher nur "[korb] geoeffnet" ohne Kennzahlen).
 */
function logKorbStamp(ids, records) {
  let events = 0;
  let finanzen = 0;
  for (const r of records) {
    events += (store.recordToEvents?.get(r['@id']) || []).length;
    finanzen += (store.finances?.get(r['@id']) || []).length;
  }
  logStamp('korb', [
    ['eintraege', ids.length],
    ['aufgeloest', records.length],
    ['events', events],
    ['finanzen', finanzen],
  ]);
}

function renderHeader(ids) {
  return el('div', { className: 'korb-header' },
    el('h2', { className: 'korb-title' }, ids.length > 0 ? `Wissenskorb (${ids.length})` : 'Wissenskorb'),
    ids.length > 0
      ? el('div', { className: 'korb-header__actions' },
          el('button', {
            className: 'korb-export',
            title: 'Als CSV exportieren',
            onClick: () => exportCSV(ids),
          }, '\u2193 CSV'),
          el('button', {
            className: 'korb-export',
            title: 'Als BibTeX exportieren',
            onClick: () => exportBibTeX(ids),
          }, '\u2193 BibTeX'),
          el('button', {
            className: 'korb-clear',
            onClick: () => { clearKorb(); },
          }, 'Korb leeren'),
        )
      : null,
  );
}

function renderEmpty() {
  return el('div', { className: 'korb-empty' },
    el('span', {
      html: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    }),
    el('p', { className: 'korb-empty__text' }, 'Der Korb ist eine Merkliste für Ihre Recherche.'),
    el('p', { className: 'korb-empty__hint' }, 'Klicken Sie das Lesezeichen-Symbol \u{1F516} rechts neben einem Dokument im Bestand oder den Indizes, um es hier zu sammeln. Die Auswahl lässt sich als CSV oder BibTeX exportieren.'),
  );
}

function renderCard(record) {
  const recordId = record['@id'];
  const docType = getDocTypeId(record) || '';
  const docLabel = dftLabel(store, docType) || '';

  const card = el('div', { className: 'korb-card' });
  card.appendChild(renderCardHeader(record, recordId, docType, docLabel));

  const metaLine = renderMetaLine(record);
  if (metaLine) card.appendChild(metaLine);

  const body = renderCardBody(record);
  if (body.childNodes.length > 0) {
    card.appendChild(body);
  } else {
    card.appendChild(el('div', { className: 'korb-card__empty' }, 'Noch nicht erschlossen'));
  }

  const konvolutFoot = renderKonvolutFoot(recordId);
  if (konvolutFoot) card.appendChild(konvolutFoot);

  return card;
}

function renderCardHeader(record, recordId, docType, docLabel) {
  const sigEl = el('a', {
    className: 'korb-card__sig',
    href: '#bestand/' + encodeURIComponent(recordId),
    title: 'Im Bestand anzeigen',
  }, formatSignatur(record['rico:identifier']));

  const removeBtn = el('button', {
    className: 'korb-card__remove',
    title: 'Aus Korb entfernen',
    onClick: (e) => { e.stopPropagation(); removeFromKorb(recordId); },
    html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  });

  return el('div', { className: 'korb-card__header' },
    sigEl,
    el('span', { className: 'korb-card__title' }, record['rico:title'] || '(ohne Titel)'),
    docLabel && docType !== 'konvolut'
      ? el('span', { className: `badge badge--${docType}` }, docLabel)
      : null,
    removeBtn,
  );
}

function renderMetaLine(record) {
  const parts = [];
  const date = formatDate(record['rico:date']);
  if (date) parts.push(date);
  const lang = record['rico:hasOrHadLanguage'];
  if (lang) parts.push(formatLanguage(lang));
  const extent = record['rico:hasExtent'];
  if (extent) parts.push(typeof extent === 'string' ? extent : String(extent));
  const status = record['m3gim:bearbeitungsstand'];
  if (status) parts.push(status);
  if (!parts.length) return null;
  return el('div', { className: 'korb-card__meta' }, parts.join(' \u00b7 '));
}

function renderCardBody(record) {
  const body = el('div', { className: 'korb-card__body' });
  // Gemeinsame Block-Logik mit dem Inline-Detail (Tier 2.4): im Korb ohne
  // Count-Suffix und einspaltig gerendert.
  for (const block of buildRecordBlocks(record, store)) {
    const chips = el('div', { className: 'korb-chips' }, ...block.chips);
    body.appendChild(renderSection(block.title, chips));
  }
  return body;
}

function renderSection(title, content) {
  return el('div', { className: 'korb-card__section' },
    el('div', { className: 'korb-card__section-title' }, title),
    content,
  );
}

function renderKonvolutFoot(recordId) {
  const konvolutId = store.childToKonvolut?.get(recordId);
  if (!konvolutId) return null;
  const konvolut = store.konvolute.get(konvolutId);
  if (!konvolut) return null;
  return el('div', { className: 'korb-card__konvolut' },
    'Teil von Konvolut ' + formatSignatur(konvolut['rico:identifier']),
  );
}

/* === Exports === */

function exportCSV(ids) {
  const records = ids.map(id => store.records.get(id)).filter(Boolean);
  const header = [
    'Signatur', 'Titel', 'Typ', 'Datierung', 'Konvolut',
    'Personen', 'Orte', 'Werke', 'Beziehungen', 'Finanzen',
  ];
  const rows = [header];

  for (const r of records) {
    const rid = r['@id'];
    const sig = r['rico:identifier'] || '';
    const title = r['rico:title'] || '';
    const docType = formatDocType(r, store) || '';
    const date = formatDate(r['rico:date']) || '';
    const konvolutId = store.childToKonvolut?.get(rid);
    const konvolut = konvolutId ? (store.konvolute.get(konvolutId)?.['rico:identifier'] || '') : '';

    const agents = ensureArray(r['m3gim:hasAssociatedAgent']);
    const persons = agents
      .filter(a => a['@type'] === 'rico:Person' || !a['@type'])
      .map(a => (a.role ? `${a.role}: ${a.name || ''}` : (a.name || '')))
      .filter(Boolean)
      .join('; ');

    const eventIds = store.recordToEvents?.get(rid) || [];
    const events = eventIds.map(eid => store.mobilityEvents.get(eid)).filter(Boolean);
    const eventStrings = events.map(ev => {
      const d = ev.date ? formatDate(ev.date) : '';
      const role = ev.role || '';
      return [role, ev.place, d].filter(Boolean).join(' ');
    });
    const recordLocations = ensureArray(r['rico:hasOrHadLocation']).map(l => l.name || '').filter(Boolean);
    const places = [...eventStrings, ...recordLocations].join('; ');

    const works = ensureArray(r['rico:hasOrHadSubject'])
      .filter(s => s['@type'] === 'm3gim:MusicalWork')
      .map(s => s.komponist ? `${s.name || ''} (${s.komponist})` : (s.name || ''))
      .filter(Boolean)
      .join('; ');

    const agentRels = (store.agentRelations?.get(rid) || []).map(rel => {
      const label = AGRELON_LABELS[rel.type] || rel.type || '';
      return `${label}: ${rel.objectName || ''}`;
    }).join('; ');

    const formatAmount = (n) => Number.isFinite(n) ? n.toLocaleString('de-DE') : '';
    const financesCol = (store.finances?.get(rid) || []).map(e => {
      const amount = `${formatAmount(e.amount)}${e.currency ? ' ' + e.currency : ''}`.trim();
      const role = e.role ? ` (${e.role})` : '';
      return `${e.field || 'Finanz'}: ${amount}${role}`.trim();
    }).join('; ');

    rows.push([sig, title, docType, date, konvolut, persons, places, works, agentRels, financesCol]);
  }

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  downloadFile(csv, 'm3gim-korb.csv', 'text/csv;charset=utf-8');
}

function csvEscape(value) {
  const s = String(value ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

function exportBibTeX(ids) {
  const records = ids.map(id => store.records.get(id)).filter(Boolean);
  const entries = [];

  for (const r of records) {
    const rid = r['@id'];
    const sig = r['rico:identifier'] || 'unknown';
    const key = sig.replace(/[^a-zA-Z0-9]/g, '_');
    const title = r['rico:title'] || 'Ohne Titel';
    const date = formatDate(r['rico:date']) || '';
    const year = date.match(/\d{4}/)?.[0] || '';
    const agents = ensureArray(r['m3gim:hasAssociatedAgent']);

    let author = agents
      .filter(a => a.role === 'verfasser:in' || a.role === 'verfasser')
      .map(a => a.name || '')
      .filter(Boolean)
      .join(' and ');

    if (!author) {
      const senderRel = (store.agentRelations?.get(rid) || [])
        .find(rel => rel.type === 'agrelon:HasCorrespondent' && rel.objectName);
      if (senderRel) author = senderRel.objectName;
    }

    const fields = [];
    if (author) fields.push(`  author    = {${bibtexEscape(author)}}`);
    fields.push(`  title     = {${bibtexEscape(title)}}`);
    if (year) fields.push(`  year      = {${year}}`);
    fields.push(`  note      = {${bibtexEscape(sig)}}`);
    fields.push(`  howpublished = {Teilnachlass Ira Malaniuk, UAKUG/NIM, KUG Graz}`);

    entries.push(`@misc{${key},\n${fields.join(',\n')}\n}`);
  }

  downloadFile(entries.join('\n\n'), 'm3gim-korb.bib', 'application/x-bibtex');
}

function bibtexEscape(s) {
  return String(s ?? '').replace(/([{}])/g, '\\$1');
}

function downloadFile(content, filename, mimeType) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
