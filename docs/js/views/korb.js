/**
 * M³GIM Wissenskorb View — bookmarked records with full metadata, relations,
 * finances and spatiotemporal events. Cards use the same buildRoleChip()
 * primitive as the Archiv-Inline-Detail (E-77) so the korb tab shares the
 * design language of the main interface.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, formatDocType, getDocTypeId, ensureArray } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS, AGRELON_LABELS, sectionForRole, steChipPrefix, formatLanguage } from '../data/constants.js';
import { buildRoleChip } from './archiv-inline-detail.js';
import { getKorbItems, removeFromKorb, clearKorb, onKorbChange } from '../ui/korb.js';
import { navigateToIndex, applyArchivFilter } from '../ui/router.js';
import { extractXlsxSource } from '../utils/provenance.js';

const GRID_TO_FACET = { personen: 'person', orte: 'location', werke: 'werk' };

function chipClickFor(gridType, name) {
  if (!gridType || !name) return null;
  const facet = GRID_TO_FACET[gridType];
  if (facet) return () => applyArchivFilter(facet, name);
  return () => navigateToIndex(gridType, name);
}

let store = null;
let container = null;

const AGRELON_ROLES = new Set([
  'absender', 'empfänger', 'empfaenger', 'adressat',
  'arbeitgeber', 'agent', 'vermittler', 'auftraggeber',
]);

export function renderKorb(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;

  onKorbChange(() => renderList());
  renderList();
}

function renderList() {
  if (!container) return;
  clear(container);

  const wrapper = el('div', { className: 'korb-page' });
  const ids = getKorbItems();

  wrapper.appendChild(renderHeader(ids));

  if (ids.length === 0) {
    wrapper.appendChild(renderEmpty());
    container.appendChild(wrapper);
    return;
  }

  const list = el('div', { className: 'korb-list' });
  const records = ids
    .map(id => store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true }));

  for (const r of records) list.appendChild(renderCard(r));
  wrapper.appendChild(list);
  container.appendChild(wrapper);
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
  const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';

  const card = el('div', { className: 'korb-card' });
  card.appendChild(renderCardHeader(record, recordId, docType, docLabel));

  const metaLine = renderMetaLine(record);
  if (metaLine) card.appendChild(metaLine);

  const body = renderCardBody(record, recordId);
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

function renderCardBody(record, recordId) {
  const body = el('div', { className: 'korb-card__body' });

  const allAgents = ensureArray(record['m3gim:hasAssociatedAgent']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const works = subjects.filter(s => s['@type'] === 'm3gim:MusicalWork' || s['@type'] === 'm3gim:PerformanceEvent');
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  const performanceRoles = ensureArray(record['m3gim:hasPerformanceRole']);
  const locations = ensureArray(record['rico:hasOrHadLocation']);
  const eventIds = store.recordToEvents?.get(recordId) || [];
  const events = eventIds.map(eid => store.mobilityEvents.get(eid)).filter(Boolean);
  const agentRelations = store.agentRelations?.get(recordId) || [];
  const finances = store.finances?.get(recordId) || [];

  const agrelonAgentKeys = new Set();
  for (const rel of agentRelations) {
    const key = rel.objectWikidata || (rel.objectName || '').toLowerCase();
    if (key) agrelonAgentKeys.add(key);
  }

  const bucket = { produktion: [], mitwirkende: [], erwaehnt: [], weitere: [] };
  for (const a of allAgents) {
    const roleKey = (a.role || '').toLowerCase();
    if (AGRELON_ROLES.has(roleKey)) {
      const agentKey = a['@id'] || (a.name || '').toLowerCase();
      if (agentKey && agrelonAgentKeys.has(agentKey)) continue;
    }
    const section = sectionForRole(a.role) || 'weitere';
    bucket[section].push(a);
  }
  for (const p of mentionedPersons) bucket.erwaehnt.push(p);

  if (bucket.produktion.length) {
    body.appendChild(renderSection('Produktion', renderAgentChips(bucket.produktion, 'personen')));
  }
  if (bucket.mitwirkende.length) {
    body.appendChild(renderSection('Mitwirkende', renderAgentChips(bucket.mitwirkende, 'personen')));
  }

  if (works.length || performanceRoles.length) {
    const chips = el('div', { className: 'korb-chips' });
    for (const w of works) {
      const name = w.name || w['skos:prefLabel'] || '?';
      const komponist = w.komponist || '';
      chips.appendChild(buildRoleChip({
        prefix: w['@type'] === 'm3gim:PerformanceEvent' ? 'EREIGNIS' : 'WERK',
        value: komponist ? `${name} (${komponist})` : name,
        cluster: w['@type'] === 'm3gim:PerformanceEvent' ? 'ort' : 'rolle',
        xlsxSource: extractXlsxSource(w),
        wikidata: w['@id'] && String(w['@id']).startsWith('wd:') ? w['@id'] : null,
        tip: 'Als Filter setzen',
        onClick: chipClickFor('werke', name),
      }));
    }
    for (const r of performanceRoles) {
      const name = r.name || r['skos:prefLabel'] || '?';
      chips.appendChild(buildRoleChip({
        prefix: 'ROLLE',
        value: name,
        cluster: 'rolle',
        xlsxSource: extractXlsxSource(r),
      }));
    }
    body.appendChild(renderSection('Werk & Repertoire', chips));
  }

  if (events.length || locations.length) {
    const chips = el('div', { className: 'korb-chips' });
    for (const ev of events) {
      const dateDisplay = ev.date ? formatDate(ev.date) : '—';
      chips.appendChild(buildRoleChip({
        prefix: steChipPrefix(ev.role),
        value: `${ev.place || '?'}\u00a0\u00b7\u00a0${dateDisplay}`,
        cluster: 'ort',
        xlsxSource: ev.xlsxSource,
        wikidata: ev.placeWikidata,
        tip: ev.place ? 'Als Filter setzen' : null,
        onClick: ev.place ? chipClickFor('orte', ev.place) : null,
      }));
    }
    const eventPlaces = new Set(events.map(e => (e.place || '').toLowerCase()));
    for (const loc of locations) {
      const name = loc.name || loc['skos:prefLabel'] || '?';
      if (eventPlaces.has(name.toLowerCase())) continue;
      chips.appendChild(buildRoleChip({
        prefix: (loc.role || 'ORT').toUpperCase(),
        value: name,
        cluster: 'ort',
        xlsxSource: extractXlsxSource(loc),
        wikidata: loc['@id'] && String(loc['@id']).startsWith('wd:') ? loc['@id'] : null,
        tip: 'Als Filter setzen',
        onClick: chipClickFor('orte', name),
      }));
    }
    if (chips.childNodes.length > 0) {
      body.appendChild(renderSection('Ort & Ereignis', chips));
    }
  }

  if (bucket.erwaehnt.length) {
    body.appendChild(renderSection('Erwähnt', renderAgentChips(bucket.erwaehnt, 'personen')));
  }
  if (bucket.weitere.length) {
    body.appendChild(renderSection('Weitere', renderAgentChips(bucket.weitere, 'personen')));
  }

  if (agentRelations.length) {
    body.appendChild(renderSection('Beziehungen', renderAgentRelations(agentRelations)));
  }
  if (finances.length) {
    body.appendChild(renderSection('Finanzen', renderFinances(finances)));
  }

  return body;
}

function renderSection(title, content) {
  return el('div', { className: 'korb-card__section' },
    el('div', { className: 'korb-card__section-title' }, title),
    content,
  );
}

function renderAgentChips(entities, gridType) {
  const chips = el('div', { className: 'korb-chips' });
  for (const entity of entities) {
    const name = entity.name || entity['skos:prefLabel'] || entity['@id'] || '?';
    const role = entity.role || 'AGENT';
    const wikidata = entity['@id'] && String(entity['@id']).startsWith('wd:') ? entity['@id'] : null;
    chips.appendChild(buildRoleChip({
      prefix: role,
      value: name,
      xlsxSource: extractXlsxSource(entity),
      wikidata,
      tip: gridType ? 'Als Filter setzen' : null,
      onClick: chipClickFor(gridType, name),
    }));
  }
  return chips;
}

function renderAgentRelations(relations) {
  const chips = el('div', { className: 'korb-chips' });
  for (const r of relations) {
    const label = AGRELON_LABELS[r.type] || (r.type || '').replace(/^agrelon:Has/, '');
    const validity = r.validityBegin
      ? ` ${r.validityBegin}${r.validityEnd ? '\u2013' + r.validityEnd : ''}`
      : '';
    chips.appendChild(buildRoleChip({
      prefix: label,
      value: `${r.objectName || '?'}${validity}`,
      cluster: 'beziehung',
      xlsxSource: r.xlsxSource,
      wikidata: r.objectWikidata,
      tip: r.objectName ? 'Als Filter setzen' : null,
      onClick: r.objectName ? chipClickFor('personen', r.objectName) : null,
    }));
  }
  return chips;
}

function renderFinances(entries) {
  const chips = el('div', { className: 'korb-chips' });
  const formatAmount = (n) => Number.isFinite(n) ? n.toLocaleString('de-DE') : '?';
  for (const e of entries) {
    const prefix = e.field || 'FINANZ';
    const valueParts = [`${formatAmount(e.amount)}${e.currency ? '\u00a0' + e.currency : ''}`];
    if (e.role) valueParts.push(`(${e.role})`);
    chips.appendChild(buildRoleChip({
      prefix,
      value: valueParts.join(' '),
      xlsxSource: e.xlsxSource,
    }));
  }
  return chips;
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
    const docType = formatDocType(r) || '';
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
