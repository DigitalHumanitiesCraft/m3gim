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
 * Konvolut: the first linked entity plus its content family, so the icon in
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
 * Trigger of the jump list, sitting in the Signatur column head. The glyph is
 * the row chevron turned down, so the same symbol means the same thing across
 * the table (Projektleitung, 2026-09-04).
 */
export function buildJumpTrigger(onToggle) {
  return el('button', {
    type: 'button',
    className: 'archiv-jump-btn',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': 'Konvolute des Schnitts',
    dataset: { tip: 'Konvolute des Schnitts' },
    onClick: (e) => { e.stopPropagation(); onToggle(); },
  }, el('span', { className: 'archiv-chevron archiv-chevron--down', 'aria-hidden': 'true' }, '›'));
}

/** Enabled state of the jump trigger. An empty cut has nothing to jump to, so
 *  the trigger says why instead of opening an empty list (Projektleitung,
 *  2026-09-04). aria-disabled rather than `disabled`, so the reason stays
 *  reachable for the keyboard and the tooltip. */
export function setJumpTriggerState(trigger, disabled) {
  if (!trigger) return;
  trigger.setAttribute('aria-disabled', String(disabled));
  trigger.classList.toggle('archiv-jump-btn--disabled', disabled);
  const label = disabled ? 'keine Konvolute im Schnitt' : 'Konvolute des Schnitts';
  trigger.dataset.tip = label;
  trigger.setAttribute('aria-label', label);
}

/**
 * The jump list itself: under the structural view the open/close action row
 * followed by every Konvolut of the cut with its open state, title and number
 * of visible children. `showToggles` false is the flattened filter mode, where
 * there are no heads to open: the chevrons and the action row fall away and the
 * list is pure navigation (Projektleitung, 2026-09-04). The container is built
 * detached; the view anchors and dismisses it.
 * @param {{entries: Array, openIds: Set<string>, currentId: ?string,
 *   allOpen: boolean, showToggles?: boolean, onJump: (id: string) => void,
 *   onToggleAll: () => void}} opts
 */
export function buildJumpList(opts) {
  const { entries, openIds, currentId, allOpen, onJump, onToggleAll } = opts;
  const showToggles = opts.showToggles !== false;
  const list = el('div', {
    className: 'archiv-jump' + (showToggles ? '' : ' archiv-jump--flat'),
    role: 'listbox',
    'aria-label': 'Konvolute des Schnitts',
  });
  if (showToggles) {
    list.appendChild(el('button', {
      type: 'button',
      className: 'archiv-jump__action',
      role: 'option',
      'aria-selected': 'false',
      onClick: () => onToggleAll(),
    }, allOpen ? 'alle zuklappen' : 'alle aufklappen'));
  }

  for (const entry of entries) {
    const isOpen = showToggles && openIds.has(entry.konvolutId);
    const isCurrent = entry.konvolutId === currentId;
    const row = el('button', {
      type: 'button',
      className: 'archiv-jump__entry' + (isCurrent ? ' archiv-jump__entry--current' : ''),
      role: 'option',
      'aria-selected': String(isCurrent),
      dataset: { konvolutJump: entry.konvolutId },
      onClick: () => onJump(entry.konvolutId),
    },
      showToggles
        ? el('span', {
          className: 'archiv-chevron' + (isOpen ? ' archiv-chevron--open' : ''),
          'aria-hidden': 'true',
        }, '›')
        : null,
      el('span', { className: 'archiv-jump__sig' }, entry.signatur),
      el('span', { className: 'archiv-jump__title' }, entry.title),
      el('span', {
        className: 'archiv-jump__count',
        dataset: { tip: `${entry.childCount} Objekte im Schnitt` },
      }, String(entry.childCount)),
    );
    if (isCurrent) row.setAttribute('aria-current', 'true');
    list.appendChild(row);
  }
  return list;
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

/** Close affordance at the right end of the open, sticky Konvolut head. The
 *  whole head closes on click; this says so at the far edge, where the eye is
 *  after reading a row (Projektleitung, 2026-09-04). */
export function buildKonvolutCloseBtn(onClose) {
  return el('button', {
    type: 'button',
    className: 'archiv-konvolut-close',
    'aria-label': 'Konvolut zuklappen',
    dataset: { tip: 'Konvolut zuklappen', tipPos: 'bottom-right' },
    onClick: (e) => { e.stopPropagation(); onClose(); },
  }, el('span', { className: 'archiv-chevron archiv-chevron--up', 'aria-hidden': 'true' }, '›'));
}
