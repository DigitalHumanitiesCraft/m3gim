/** Source evidence and progressive navigation in the place view. */
import { el } from '../utils/dom.js';
import { formatDate } from '../utils/date-parser.js';
import { sortOcc, placeRoleLabel } from './karte-data.js';

const dated = value => value ? (formatDate(value) || value) : 'nicht erfasst';
const recordLabel = (record, id) => record?.['rico:identifier'] || id;
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const sortedRoles = group => group.roles.slice().sort((a, b) => b.count - a.count
  || a.label.localeCompare(b.label, 'de'));

function documentButton(store, recordId, navigate) {
  const record = store.records.get(recordId);
  return el('button', { type: 'button', className: 'places-source',
    onClick: () => navigate('bestand', { recordId, preserveFilter: true }) },
  el('span', { className: 'places-signature' }, recordLabel(record, recordId)),
  el('span', {}, record?.['rico:title'] || 'Dokument öffnen'));
}

function isMatchingWitness(occurrence, witnesses) {
  return (witnesses || []).some(witness => {
    if (witness.recordId !== occurrence.recordId) return false;
    const source = witness.sourceRef;
    const observed = occurrence.xlsxSource;
    if (source?.sheet && source?.row && observed?.sheet && observed?.row) {
      return source.sheet === observed.sheet && source.row === observed.row
        && (source.datenpunkt ?? null) === (observed.datenpunkt ?? null);
    }
    return source?.nodeId === occurrence.id;
  });
}

function evidenceRow(occurrence, group, actions) {
  const location = occurrence.placement === 'unlocatable'
    ? 'Ohne Koordinaten im Datenstand; der Beleg bleibt über das Dokument zugänglich.'
    : 'Kartenpunkt aus dem Ortsabgleich; Darstellung auf Ortsebene.';
  const documentDate = occurrence.documentDate || occurrence.recordDate;
  return el('article', { className: 'places-evidence', dataset: {
    evidenceId: occurrence.id, recordId: occurrence.recordId,
  } },
  isMatchingWitness(occurrence, actions.matchingWitnesses)
    ? el('p', { className: 'places-match' }, 'Trifft die Filterbedingung') : null,
  el('p', { className: 'places-evidence__role' }, placeRoleLabel(occurrence)),
  el('p', { className: 'places-original' },
    el('span', { className: 'places-field-label' }, 'Erfasste Ortsangabe'),
    el('span', {}, occurrence.place || group.city)),
  el('dl', { className: 'places-dates' },
    el('dt', {}, 'Datum der Ortsaussage'),
    el('dd', { className: occurrence.date ? '' : 'places-absent' }, dated(occurrence.date)),
    el('dt', {}, 'Dokumentdatum'),
    el('dd', { className: documentDate ? '' : 'places-absent' }, dated(documentDate))),
  occurrence.qualityFlag ? el('p', { className: 'places-source-note' },
    `Datenqualität: ${occurrence.qualityFlag}`) : null,
  occurrence.description ? el('p', { className: 'places-source-note' }, occurrence.description) : null,
  el('p', { className: 'places-location-note' }, location),
  /^wd:Q\d+$/.test(occurrence.placeWikidata || '') ? el('a', { className: 'places-authority',
    href: `https://www.wikidata.org/entity/${occurrence.placeWikidata.slice(3)}`,
    target: '_blank', rel: 'noopener noreferrer' }, 'Ort in Wikidata ↗') : null);
}

function relatedEntries(index, recordIds) {
  const entries = [];
  for (const [name, entry] of index || []) {
    const supporting = [...entry.records].filter(id => recordIds.has(id));
    if (supporting.length) entries.push({ name, supporting });
  }
  return entries.sort((a, b) => b.supporting.length - a.supporting.length
    || a.name.localeCompare(b.name, 'de'));
}

function relatedSection(store, group, actions) {
  const specs = [
    { title: 'Werke', register: 'werke', entries: relatedEntries(store.works, group.records) },
    { title: 'Personen', register: 'personen', entries: relatedEntries(store.persons, group.records) },
    { title: 'Institutionen', register: 'organisationen', entries: relatedEntries(store.organizations, group.records) },
  ].filter(spec => spec.entries.length);
  if (!specs.length) return null;
  const disclosure = el('details', { className: 'places-related' },
    el('summary', {}, 'Im selben Dokument genannt'),
    el('p', { className: 'places-related__note' },
      'Die Aussagekraft ist auf den gemeinsamen Dokumentkontext begrenzt; Aufenthalt, Auftritt oder Beziehung am gewählten Ort bleiben offen.'));
  for (const spec of specs) {
    const family = el('details', { className: 'places-related__family' },
      el('summary', {}, `${spec.title} · ${spec.entries.length}`));
    for (const item of spec.entries) {
      family.appendChild(el('details', { className: 'places-related__entry' },
        el('summary', {}, `${item.name} · ${plural(item.supporting.length, 'Dokument', 'Dokumente')}`),
        el('button', { type: 'button', className: 'places-related__jump',
          onClick: () => actions.navigate('indizes', { register: spec.register, entry: item.name }) },
        'Im Register öffnen'),
        el('div', { className: 'places-related__records' },
          ...item.supporting.map(recordId => documentButton(store, recordId, actions.navigate)))));
    }
    disclosure.appendChild(family);
  }
  return disclosure;
}

export function buildPlaceOverview(store, group, actions) {
  const datedEvidence = group.evidence.filter(item => item.date);
  const roles = sortedRoles(group);
  const coordinateNote = !group.located ? 'Ohne Koordinaten im Datenstand.'
    : 'Kartenpunkt aus dem Ortsabgleich; Darstellung auf Ortsebene.';
  const roleButtons = roles.map(role => el('button', {
    type: 'button', className: 'places-role-button',
    onClick: event => actions.openSources(role.label, event.currentTarget),
  }, el('span', {}, role.label), el('span', {}, plural(role.count, 'Dokument', 'Dokumente'))));
  const content = el('div', { className: 'places-detail places-detail--overview' },
    el('p', { className: 'places-overview__coverage' },
      `${plural(datedEvidence.length, 'Ortsbeleg', 'Ortsbelege')} mit eigenem Datum`),
    el('p', { className: 'places-overview__coordinates' }, coordinateNote),
    el('div', { className: 'places-detail-actions' },
      el('button', { type: 'button', className: 'ui-action places-action',
        onClick: event => actions.openSources(null, event.currentTarget) }, 'Quellen ansehen'),
      el('button', { type: 'button', className: 'ui-action places-action', onClick: actions.filter },
        'Nach diesem Ort filtern'),
      el('button', { type: 'button', className: 'ui-action places-action', onClick: actions.chronik },
        'Ort in Chronik öffnen')),
    el('section', { className: 'places-overview__roles', 'aria-label': 'Rollen der Ortsbelege' },
      el('h4', {}, 'Häufigste Rollen'), ...roleButtons.slice(0, 3),
      roles.length > 3 ? el('details', { className: 'places-role-more' },
        el('summary', {}, `Alle ${roles.length} Rollen`), ...roleButtons.slice(3)) : null));
  const related = relatedSection(store, group, actions);
  if (related) content.appendChild(related);
  return content;
}

export function buildPlaceSources(store, group, actions, selectedRole = null) {
  const evidence = sortOcc(group.evidence).filter(item =>
    !selectedRole || placeRoleLabel(item) === selectedRole);
  const byDocument = new Map();
  for (const occurrence of evidence) {
    if (!byDocument.has(occurrence.recordId)) byDocument.set(occurrence.recordId, []);
    byDocument.get(occurrence.recordId).push(occurrence);
  }
  const content = el('div', { className: 'places-detail places-detail--sources' },
    el('p', { className: 'places-source-list__summary' },
      `${plural(byDocument.size, 'Dokument', 'Dokumente')} · ${plural(evidence.length, 'Ortsbeleg', 'Ortsbelege')}`));
  for (const [recordId, rows] of byDocument) {
    const record = store.records.get(recordId);
    const roles = [...new Set(rows.map(placeRoleLabel))].join(', ');
    content.appendChild(el('details', { className: 'places-source-document' },
      el('summary', {},
        el('span', { className: 'places-signature' }, recordLabel(record, recordId)),
        el('span', { className: 'places-source-document__title' }, record?.['rico:title'] || 'Ohne Titel'),
        el('span', { className: 'places-source-document__meta' },
          `${roles} · ${plural(rows.length, 'Beleg', 'Belege')}`)),
      el('div', { className: 'places-source-document__rows' },
        ...rows.map(row => evidenceRow(row, group, actions)),
        documentButton(store, recordId, actions.navigate))));
  }
  return content;
}
