/**
 * Cell builders of the Bestand table.
 *
 * Presentation only: badges, Erschliessungsanzeige, Konvolut meta chips, folio
 * hint, tooltip and the Korb button. The decisions behind them live in
 * bestand-data.js, the row assembly in bestand.js.
 */

import { el } from '../utils/dom.js';
import { ensureArray, dftLabel } from '../utils/format.js';
import { korbIcon } from '../data/constants.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import {
  badgeKindForItem, isStandaloneKonvolut, familiesForRecord,
} from './bestand-data.js';

/**
 * Document type badge of a row, built from the DOM-free badge decision. The
 * type of an object row is plain text with its gloss in the tooltip; a Konvolut
 * head renders nothing here, because chevron, Signatur and type chips already
 * say Konvolut and its tooltip sits on the title (Projektleitung, 2026-09-03).
 */
export function buildDocTypeBadge(item, record, docType, docLabel, docGloss) {
  const kind = badgeKindForItem(item, record, docLabel, isStandaloneKonvolut);
  switch (kind) {
    case 'konvolut-struct':
      if (item.isKonvolut) return null;
      return el('span', { className: 'badge badge--konvolut-struct', dataset: { tip: 'Noch nicht in Einzelobjekte aufgelöst' } }, 'Konvolut');
    case 'standalone-konvolut':
      return el('span', { className: 'badge badge--konvolut-struct', dataset: { tip: 'Noch nicht in Einzelobjekte aufgelöst' } }, 'Konvolut');
    case 'doctype':
      return el('span', { className: 'badge badge--plain', title: docGloss || '' }, docLabel);
    default:
      return el('span', { className: 'badge badge--plain badge--unclassified' }, 'Nicht klassifiziert');
  }
}

/**
 * Typed Erschliessungsanzeige of a record row: one square per content family,
 * filled or empty. The family colours are the ones the inline detail carries on
 * its block titles, so the legend arises from proximity rather than from text
 * (E-158). The tooltip names all four families with their counts, so an empty
 * square reads as a zero rather than as a missing entry.
 */
export function buildErschliessung(store, record) {
  const families = familiesForRecord(record, store);
  const tip = families.some(f => f.count > 0)
    ? families.map(f => `${f.label} ${f.count}`).join('\n')
    : 'keine Verknüpfungen';
  return familySquares(families, tip);
}

function familySquares(families, tip) {
  return el('span', { className: 'archiv-ersch', dataset: { tip, tipWrap: '' } },
    ...families.map(f => el('span', {
      className: `ersch-dot ersch-dot--${f.key} ${f.count > 0 ? 'ersch-dot--on' : 'ersch-dot--off'}`,
    })));
}

/**
 * Meta line under the Konvolut title. The type distribution is the collapsed
 * head's stand-in for its rows, so it goes once the Konvolut is open and the
 * Typ column carries it. The Erschliessungsstand belongs exclusively in the
 * head tooltip (Projektleitung, 2026-09-03).
 * @param {boolean} showTypes  false while the Konvolut is open
 */
export function buildKonvolutChips(store, meta, showTypes = true) {
  if (!meta) return null;
  const chips = [];

  // Beyond three types a "+N weitere" chip follows.
  if (showTypes && meta.docTypeCounts && meta.docTypeCounts.size > 0) {
    const all = [...meta.docTypeCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [dft, count] of all.slice(0, 3)) {
      const label = dftLabel(store, dft);
      chips.push(el('span', {
        className: 'chip chip--compact',
        dataset: { tip: `${count} von ${meta.processedCount} erschlossenen Objekten` },
      }, `${count}× ${label}`));
    }
    const restTypes = all.slice(3);
    if (restTypes.length > 0) {
      const restCount = restTypes.reduce((sum, [, c]) => sum + c, 0);
      const tipLines = restTypes
        .map(([dft, c]) => `${c}× ${dftLabel(store, dft)}`)
        .join(' · ');
      chips.push(el('span', {
        className: 'chip chip--compact chip--rest',
        dataset: { tip: tipLines },
      }, `+${restCount} weitere`));
    }
  }

  if (chips.length === 0) return null;
  return el('span', { className: 'archiv-konvolut-meta' }, ...chips);
}

/** Erschliessungsstand of the processed children, in reading order. */
function standParts(meta) {
  const out = [];
  if (!meta || !meta.statusCounts) return out;
  for (const [value, label] of [
    ['abgeschlossen', 'abgeschlossen'],
    ['begonnen', 'begonnen'],
    ['zurueckgestellt', 'zurückgestellt'],
  ]) {
    const n = meta.statusCounts.get(value);
    if (n) out.push(`${n} ${label}`);
  }
  return out;
}

/** The Erschliessungsstand is detail information of the Konvolut head. */
export function konvolutStandTip(meta) {
  const parts = standParts(meta);
  return parts.length > 0 ? `Erschließungsstand: ${parts.join(' · ')}` : '';
}

/**
 * Distinguishing hint for a child that carries the collective title of its
 * Konvolut: the first linked entity plus its content family, so the dot in
 * front of the hint says where the name comes from.
 * @returns {?{name: string, family: 'person'|'institution'|'ort'}}
 */
export function getFolioHint(store, record, konvolutId) {
  if (!konvolutId) return null;
  const siblings = (store.konvolutChildren.get(konvolutId) || [])
    .filter(cid => !store.folioIds.has(cid))
    .map(cid => store.records.get(cid))
    .filter(Boolean);

  const title = record['rico:title'] || '';
  const dupes = siblings.filter(s => (s['rico:title'] || '') === title);
  if (dupes.length <= 1) return null;

  const named = (obj) => obj && (obj.name || obj['skos:prefLabel'] || '');
  const agents = ensureArray(record['m3gim-ontology:hasAssociatedAgent']);
  if (agents.length > 0 && named(agents[0])) {
    const corporate = ['rico:CorporateBody', 'rico:Group'].includes(agents[0]['@type']);
    return { name: named(agents[0]), family: corporate ? 'institution' : 'person' };
  }
  const mentionedPersons = ensureArray(record['rico:hasOrHadSubject'])
    .filter(s => s['@type'] === 'rico:Person');
  if (mentionedPersons.length > 0 && named(mentionedPersons[0])) {
    return { name: named(mentionedPersons[0]), family: 'person' };
  }
  const locs = ensureArray(record['rico:hasOrHadLocation']);
  if (locs.length > 0 && named(locs[0])) {
    return { name: named(locs[0]), family: 'ort' };
  }
  return null;
}

export function buildKonvolutTooltip(store, konvolutId) {
  const childIds = (store.konvolutChildren.get(konvolutId) || []).filter(cid => !store.folioIds.has(cid));
  const agentCounts = new Map();
  const locationCounts = new Map();

  for (const cid of childIds) {
    const child = store.records.get(cid);
    if (!child) continue;
    for (const agent of ensureArray(child['m3gim-ontology:hasAssociatedAgent'])) {
      const name = agent.name || agent['skos:prefLabel'] || '';
      if (name) agentCounts.set(name, (agentCounts.get(name) || 0) + 1);
    }
    for (const loc of ensureArray(child['rico:hasOrHadLocation'])) {
      const name = loc.name || loc['skos:prefLabel'] || '';
      if (name && !/^\d{4}/.test(name)) locationCounts.set(name, (locationCounts.get(name) || 0) + 1);
    }
  }

  const parts = [];
  if (agentCounts.size > 0) {
    const top = [...agentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    parts.push(`Personen: ${top.join(', ')}`);
  }
  if (locationCounts.size > 0) {
    const top = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    parts.push(`Orte: ${top.join(', ')}`);
  }
  return parts.join('\n');
}

/**
 * Korb button of a row. `onExpandedToggle` lets the caller rebuild the table
 * when the same record is expanded and carries a second Korb control.
 */
export function buildKorbBtn(recordId, onExpandedToggle) {
  const active = isInKorb(recordId);
  return el('button', {
    className: `korb-btn ${active ? 'korb-btn--active' : ''}`,
    title: active ? 'Aus dem Korb entfernen' : 'In den Korb',
    html: korbIcon(14, active),
    onClick: (e) => {
      e.stopPropagation();
      toggleKorb(recordId);
      // Update the button in place instead of redrawing the whole table.
      const btn = e.currentTarget;
      const nowActive = isInKorb(recordId);
      btn.classList.toggle('korb-btn--active', nowActive);
      btn.title = nowActive ? 'Aus dem Korb entfernen' : 'In den Korb';
      btn.innerHTML = korbIcon(14, nowActive);
      if (onExpandedToggle) onExpandedToggle(recordId);
    },
  });
}
