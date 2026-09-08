/** Complete place evidence with separate statement, document and anchor dates. */
import { el } from '../utils/dom.js';
import { formatDate } from '../utils/date-parser.js';
import { sortOcc, placeRoleLabel } from './karte-data.js';

const dated = value => value ? (formatDate(value) || value) : 'nicht erfasst';
const recordLabel = (record, recordId) => record?.['rico:identifier'] || recordId;
const plural = (count, singular, pluralForm) => `${count} ${count === 1 ? singular : pluralForm}`;

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

function evidenceRow(store, occurrence, group, actions) {
  const record = store.records.get(occurrence.recordId);
  const definition = el('dl', { className: 'places-dates' },
    el('dt', {}, 'Datum der Ortsaussage'),
    el('dd', { className: occurrence.date ? '' : 'places-absent' }, dated(occurrence.date)),
    el('dt', {}, 'Dokumentdatum'),
    el('dd', { className: occurrence.documentDate ? '' : 'places-absent' }, dated(occurrence.documentDate)),
    el('dt', {}, 'Primärer Zeitanker'),
    el('dd', { className: occurrence.recordDate ? '' : 'places-absent' }, dated(occurrence.recordDate)));
  const location = occurrence.placement === 'city'
    ? 'Kartenpunkt der gleichnamigen Stadt; die Darstellung bleibt auf Stadtebene.'
    : occurrence.placement === 'unlocatable'
      ? 'Ohne Koordinaten im Datenstand; der Beleg bleibt über das Dokument zugänglich.'
      : 'Kartenpunkt aus dem Ortsabgleich; Darstellung auf Ortsebene.';
  return el('article', { className: 'places-evidence', dataset: {
    evidenceId: occurrence.id, recordId: occurrence.recordId,
  } },
  isMatchingWitness(occurrence, actions.matchingWitnesses)
    ? el('p', { className: 'places-match' }, 'Trifft die Filterbedingung') : null,
  el('p', { className: 'places-original' },
    el('span', { className: 'places-field-label' }, 'Erfasste Ortsangabe'),
    el('span', {}, occurrence.place || group.city)),
  definition,
  occurrence.qualityFlag ? el('p', { className: 'places-source-note' },
    `Datenqualität: ${occurrence.qualityFlag}`) : null,
  occurrence.description ? el('p', { className: 'places-source-note' }, occurrence.description) : null,
  el('p', { className: 'places-location-note' }, location),
  /^wd:Q\d+$/.test(occurrence.placeWikidata || '') ? el('a', { className: 'places-authority',
    href: `https://www.wikidata.org/entity/${occurrence.placeWikidata.slice(3)}`,
    target: '_blank', rel: 'noopener noreferrer' }, 'Ort in Wikidata ↗') : null,
  documentButton(store, occurrence.recordId, actions.navigate));
}

function evidenceSections(store, group, actions) {
  const byRole = new Map();
  for (const occurrence of sortOcc(group.evidence)) {
    const role = placeRoleLabel(occurrence);
    if (!byRole.has(role)) byRole.set(role, new Map());
    const ownDate = occurrence.date || '';
    if (!byRole.get(role).has(ownDate)) byRole.get(role).set(ownDate, []);
    byRole.get(role).get(ownDate).push(occurrence);
  }
  const sections = [];
  for (const [role, dates] of byRole) {
    const occurrences = [...dates.values()].flat();
    const recordCount = new Set(occurrences.map(item => item.recordId)).size;
    const section = el('section', { className: 'places-role-group' },
      el('h4', {}, role),
      el('p', { className: 'places-role-summary' },
        `${plural(occurrences.length, 'Ortsbeleg', 'Ortsbelege')} · ${plural(recordCount, 'Dokument', 'Dokumente')}`));
    for (const [ownDate, rows] of dates) {
      section.appendChild(el('section', { className: 'places-date-group' },
        el('h5', {}, ownDate ? `Aussage vom ${dated(ownDate)}` : 'Ortsaussage ohne eigenes Datum',
          el('span', {}, ` · ${plural(rows.length, 'Beleg', 'Belege')}`)),
        ...rows.map(row => evidenceRow(store, row, group, actions))));
    }
    sections.push(section);
  }
  return sections;
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
  const section = el('section', { className: 'places-related' },
    el('h4', {}, 'Im selben Dokument genannt'),
    el('p', { className: 'places-related__note' },
      'Die Aussagekraft ist auf den gemeinsamen Dokumentkontext begrenzt; Aufenthalt, Auftritt oder Beziehung am gewählten Ort bleiben offen.'));
  for (const spec of specs) {
    const family = el('details', { className: 'places-related__family' },
      el('summary', {}, `${spec.title} · ${spec.entries.length}`));
    for (const item of spec.entries) {
      const entry = el('details', { className: 'places-related__entry' },
        el('summary', {}, `${item.name} · ${plural(item.supporting.length, 'Dokument', 'Dokumente')}`),
        el('button', { type: 'button', className: 'places-related__jump',
          onClick: () => actions.navigate('indizes', { register: spec.register, entry: item.name }) },
        'Im Register öffnen'),
        el('div', { className: 'places-related__records' },
          ...item.supporting.map(recordId => documentButton(store, recordId, actions.navigate))));
      family.appendChild(entry);
    }
    section.appendChild(family);
  }
  return section;
}

function overview(group) {
  const datedEvidence = group.evidence.filter(item => item.date);
  const datedRecords = new Set(datedEvidence.map(item => item.recordId));
  return el('section', { className: 'places-overview', 'aria-label': 'Abdeckung der Ortsbelege' },
    el('dl', { className: 'places-overview__facts' },
      el('div', {}, el('dt', {}, 'Dokumente'), el('dd', {}, String(group.records.size))),
      el('div', {}, el('dt', {}, 'Ortsbelege'), el('dd', {}, String(group.evidence.length))),
      el('div', {}, el('dt', {}, 'Mit eigenem Datum'),
        el('dd', {}, `${datedEvidence.length} von ${group.evidence.length}`))),
    el('p', { className: 'places-overview__coverage' },
      `${plural(datedRecords.size, 'Dokument', 'Dokumente')} enthalten mindestens eine ausdrücklich datierte Ortsaussage.`),
    el('div', { className: 'places-overview__roles' },
      ...group.roles.slice().sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'))
        .map(role => el('span', { className: 'places-role' },
          `${role.label} · ${plural(role.count, 'Dokument', 'Dokumente')}`))));
}

export function buildPlaceDetail(store, group, actions) {
  const content = el('div', { className: 'places-detail' });
  content.append(
    el('div', { className: 'places-detail-actions' },
      el('button', { type: 'button', className: 'places-action', onClick: actions.filter },
        'Nach diesem Ort filtern'),
      el('button', { type: 'button', className: 'places-action', onClick: actions.chronik },
        'Ort in Chronik öffnen')),
    overview(group),
    ...evidenceSections(store, group, actions));
  const related = relatedSection(store, group, actions);
  if (related) content.appendChild(related);
  return content;
}
