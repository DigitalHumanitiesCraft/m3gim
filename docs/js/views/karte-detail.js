/** Recorded place statements with separate source dates and explicit view actions. */
import { el } from '../utils/dom.js';
import { formatDate } from '../utils/date-parser.js';
import { sortOcc, placeRoleLabel } from './karte-data.js';

const dated = value => value ? (formatDate(value) || value) : 'nicht erfasst';

export function buildPlaceDetail(store, group, actions) {
  const content = el('div', { className: 'places-detail' });
  content.appendChild(el('div', { className: 'places-detail-actions' },
    el('button', { type: 'button', className: 'places-action', onClick: actions.filter }, 'Nach diesem Ort filtern'),
    el('button', { type: 'button', className: 'places-action', onClick: actions.chronik }, 'Ort in Chronik öffnen')));
  for (const o of sortOcc(group.evidence)) {
    const record = store.records.get(o.recordId);
    const role = placeRoleLabel(o);
    const definition = el('dl', { className: 'places-dates' },
      el('dt', {}, 'Datum der Ortsaussage'), el('dd', { className: o.date ? '' : 'places-absent' }, dated(o.date)),
      el('dt', {}, 'Dokumentdatum'), el('dd', {}, dated(o.documentDate)));
    if (o.recordDate && o.recordDate !== o.documentDate) definition.append(
      el('dt', { dataset: { tip: 'Dieser Zeitanker wählt das Dokument im gemeinsamen Zeitfilter aus.' } }, 'Zeitanker des Dokuments'),
      el('dd', {}, dated(o.recordDate)));
    const location = o.placement === 'city' ? 'Kartenpunkt aus gleichnamiger Stadt übernommen'
      : o.placement === 'unlocatable' ? 'Ohne Koordinaten im Datenstand'
      : 'Koordinaten aus dem Ortsabgleich';
    content.appendChild(el('article', { className: 'places-evidence', dataset: { evidenceId: o.id, recordId: o.recordId } },
      el('h4', {}, role),
      o.place !== group.city ? el('p', { className: 'places-original' }, o.place) : null,
      definition,
      o.qualityFlag ? el('p', { className: 'places-source-note' }, `Datenqualität: ${o.qualityFlag}`) : null,
      o.description ? el('p', { className: 'places-source-note' }, o.description) : null,
      el('p', { className: 'places-location-note' }, location),
      /^wd:Q\d+$/.test(o.placeWikidata || '') ? el('a', { className: 'places-authority',
        href: `https://www.wikidata.org/entity/${o.placeWikidata.slice(3)}`,
        target: '_blank', rel: 'noopener noreferrer' }, 'Ort in Wikidata ↗') : null,
      el('button', { type: 'button', className: 'places-source',
        onClick: () => actions.navigate('bestand', { recordId: o.recordId }) },
        el('span', { className: 'places-signature' }, record?.['rico:identifier'] || o.recordId),
        el('span', {}, record?.['rico:title'] || 'Dokument öffnen'))));
  }
  return content;
}
