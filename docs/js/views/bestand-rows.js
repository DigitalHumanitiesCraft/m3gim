/**
 * Cell builders of the Bestand table.
 *
 * Presentation only: badges, Erschliessungsanzeige, Konvolut meta chips, folio
 * hint, tooltip and the Korb button. The decisions behind them live in
 * bestand-data.js, the row assembly in bestand.js.
 */

import { el } from '../utils/dom.js';
import { ensureArray, dftLabel } from '../utils/format.js';
import { korbIcon, korbTip, CONTENT_FAMILIES } from '../data/constants.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import { familyIcon } from '../ui/family-icons.js';
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
      return el('span', {
        className: 'badge badge--plain',
        dataset: docGloss ? { tip: docGloss, tipWrap: '' } : {},
      }, docLabel);
    default:
      return el('span', { className: 'badge badge--plain badge--unclassified' }, 'Nicht klassifiziert');
  }
}

/**
 * Typed Erschliessungsanzeige of a record row: one icon per content family in
 * family colour where the record carries evidence, a quiet outline where it
 * does not, and the count right after a filled icon. The icons are the ones the
 * Indizes grids carry in their heads, so a family is named by one symbol across
 * the views (Projektleitung, 2026-09-04). The tooltip names all four families
 * with their counts, so an empty icon reads as a zero rather than as a gap.
 */
export function buildErschliessung(store, record) {
  const families = familiesForRecord(record, store);
  const present = families.filter(f => f.count > 0);
  const tip = present.length > 0
    ? families.map(f => `${f.label} ${f.count}`).join('\n')
    : 'keine Verknüpfungen';
  const label = present.length > 0
    ? `Erschließung: ${present.map(f => `${f.label} ${f.count}`).join(', ')}`
    : 'Erschließung: keine Verknüpfungen';
  return familyIcons(families, tip, label);
}

function familyIcons(families, tip, label) {
  // bottom-right: the two last columns sit at the right window edge, where a
  // centred tooltip runs out of the viewport.
  return el('span', {
    className: 'archiv-ersch',
    dataset: { tip, tipWrap: '', tipPos: 'bottom-right' },
    'aria-label': label,
  },
    ...families.map(f => el('span', {
      className: `ersch-fam ersch-fam--${f.key}${f.count > 0 ? ' ersch-fam--on' : ''}`,
    },
      familyIcon(f.key, { size: 13, className: 'ersch-fam__icon' }),
      f.count > 0 ? el('span', { className: 'ersch-fam__count' }, String(f.count)) : null,
    )));
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
 * Konvolut: the name of the first linked entity. The title cell shows no icons
 * (E-217), so the name stands on its own.
 * @returns {?string}
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
  if (agents.length > 0 && named(agents[0])) return named(agents[0]);
  const mentionedPersons = ensureArray(record['rico:hasOrHadSubject'])
    .filter(s => s['@type'] === 'rico:Person');
  if (mentionedPersons.length > 0 && named(mentionedPersons[0])) {
    return named(mentionedPersons[0]);
  }
  const locs = ensureArray(record['rico:hasOrHadLocation']);
  if (locs.length > 0 && named(locs[0])) return named(locs[0]);
  return null;
}

/**
 * Korb button of a row. `onExpandedToggle` lets the caller rebuild the table
 * when the same record is expanded and carries a second Korb control.
 */
export function buildKorbBtn(recordId, onExpandedToggle) {
  const active = isInKorb(recordId);
  return el('button', {
    className: `korb-btn ${active ? 'korb-btn--active' : ''}`,
    dataset: { tip: korbTip(active), tipPos: 'bottom-right' },
    'aria-label': korbTip(active),
    html: korbIcon(14, active),
    onClick: (e) => {
      e.stopPropagation();
      toggleKorb(recordId);
      // Update the button in place instead of redrawing the whole table.
      const btn = e.currentTarget;
      const nowActive = isInKorb(recordId);
      btn.classList.toggle('korb-btn--active', nowActive);
      btn.dataset.tip = korbTip(nowActive);
      btn.setAttribute('aria-label', korbTip(nowActive));
      btn.innerHTML = korbIcon(14, nowActive);
      if (onExpandedToggle) onExpandedToggle(recordId);
    },
  });
}

/**
 * The four family icons as a legend in the .archiv-col-links cell of the open,
 * sticky Konvolut head: it names what the column of its rows below carries,
 * quiet and without numbers (Projektleitung, 2026-09-04).
 */
export function buildKonvolutFamilyLegend() {
  return el('span', {
    className: 'archiv-ersch archiv-ersch--legend',
    dataset: {
      tip: CONTENT_FAMILIES.map(f => f.label).join(' · '),
      tipPos: 'bottom-right',
    },
    'aria-hidden': 'true',
  }, ...CONTENT_FAMILIES.map(f => familyIcon(f.key, {
    size: 13, className: 'ersch-fam__icon',
  })));
}
