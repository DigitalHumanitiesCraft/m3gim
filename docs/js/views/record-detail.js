/**
 * M³GIM Archiv Inline Detail — shared component for Bestand and Chronik.
 *
 * buildRecordBlocks() is the single source of the functional blocks; both this
 * detail and the Korb (views/korb.js) consume it. Layout and CSS
 * classes belong to the consumer, the chip logic lives in record-chips.js and
 * the DOM-free partition in record-detail-data.js.
 */

import { el } from '../utils/dom.js';
import { familyIcon } from '../ui/family-icons.js';
import { formatDocType } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import { formatLanguage, korbIcon, korbTip, familyOfBlock } from '../data/constants.js';
import { partitionRecord, sourceSummary } from './record-detail-data.js';
import {
  agentChipEls, workChipEls, performanceChipEls, eventChipEls,
  relationChipEls, financeChipEls, datingChipEls,
} from './record-chips.js';

/**
 * Build an inline detail DOM element for a record.
 * @param {Object} record - The JSON-LD record
 * @param {Object} store - The data store
 * @param {Object} [options]
 * @param {Function} [options.onClose] - Called when close button clicked
 * @returns {HTMLElement}
 */
export function buildInlineDetail(record, store, { onClose } = {}) {
  // Konvolute (rico:RecordSet) get no inline detail; their aggregated metadata
  // is shown as chips in the Bestand row itself.
  const wrapper = el('div', { className: 'inline-detail' });

  // The head line keeps Signatur and Titel of the record in view while the
  // reader scrolls inside a long detail; the two equally sized icon buttons sit
  // at the right end of the meta bar and no longer take a row of their own
  // (Projektleitung, 2026-09-04).
  const recordId = record['@id'];
  const inKorb = isInKorb(recordId);
  const closeIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const actions = el('div', { className: 'inline-detail__actions' },
    el('button', {
      className: `inline-detail__action-btn inline-detail__korb-btn ${inKorb ? 'inline-detail__korb-btn--active' : ''}`,
      dataset: { tip: korbTip(inKorb) },
      'aria-label': korbTip(inKorb),
      onClick: (e) => {
        e.stopPropagation();
        toggleKorb(recordId);
        const btn = e.currentTarget;
        const nowIn = isInKorb(recordId);
        btn.classList.toggle('inline-detail__korb-btn--active', nowIn);
        btn.dataset.tip = korbTip(nowIn);
        btn.setAttribute('aria-label', korbTip(nowIn));
        btn.innerHTML = korbIcon(16, nowIn);
      },
      html: korbIcon(16, inKorb),
    }),
    el('button', {
      className: 'inline-detail__action-btn inline-detail__close',
      dataset: { tip: 'Detail schließen' },
      'aria-label': 'Detail schließen',
      onClick: (e) => {
        e.stopPropagation();
        if (onClose) onClose();
      },
      html: closeIcon,
    })
  );

  const identifier = record['rico:identifier'];
  const title = record['rico:title'];
  if (identifier || title) {
    // The head line is where the focus lands when the detail opens, so it is
    // programmatically focusable without entering the tab sequence
    // (Projektleitung, 2026-09-04).
    wrapper.appendChild(el('div', { className: 'inline-detail__head', tabindex: '-1' },
      identifier ? el('span', { className: 'inline-detail__head-sig' }, String(identifier)) : null,
      title ? el('span', { className: 'inline-detail__head-title' }, String(title)) : null,
    ));
  }

  // Metadata as one narrow full-width bar; the administrative fields sit in the
  // collapsible foot instead. Erschliessung is the Bearbeitungsstand of the
  // record, not a status of the document (Projektleitung, 2026-09-04).
  const meta = [];
  const docType = formatDocType(record, store);
  if (docType) meta.push(['Typ', docType]);
  const date = formatDate(record['rico:date']);
  if (date) meta.push(['Datum', date]);
  const lang = record['rico:hasOrHadLanguage'];
  if (lang) meta.push(['Sprache', formatLanguage(lang)]);
  const extent = record['rico:hasExtent'];
  if (extent) meta.push(['Umfang', typeof extent === 'string' ? extent : String(extent)]);
  const status = record['m3gim-ontology:processingStatus'];
  if (status) meta.push(['Erschließung', status]);
  wrapper.appendChild(renderMetaBar(meta, actions));

  // rico:scopeAndContent is the record's own content description and reads as
  // prose directly under the meta bar, not as a meta item. The data holds none
  // yet, so this stays inert until the source carries it.
  const scope = record['rico:scopeAndContent'];
  if (scope) {
    wrapper.appendChild(el('p', { className: 'inline-detail__description' }, String(scope)));
  }

  // Build the blocks once, then let CSS columns break them across the full
  // width; break-inside keeps a section together, the order stays semantic.
  const blocks = buildRecordBlocks(record, store);
  const byKey = new Map(blocks.map(b => [b.key, b]));
  const ORDER = [
    'produktion', 'mitwirkende', 'institutionen', 'werk', 'auffuehrungen', 'ort',
    'genannte-daten', 'erwaehnt', 'weitere', 'beziehungen', 'finanzen',
  ];
  const body = el('div', { className: 'inline-detail__body' });
  for (const key of ORDER) {
    const b = byKey.get(key);
    if (!b) continue;
    const chipsEl = el('div', { className: 'inline-detail__chips' }, ...b.chips);
    // No count in the title, the chips below carry the quantity and the Bestand
    // row already shows it. "Weitere" collects the roles outside the four
    // content families and therefore gets no family marker, like Finanzen
    // (Projektleitung, 2026-09-04).
    body.appendChild(renderSection(b.title, key === 'weitere' ? null : b.family, chipsEl));
  }

  if (body.childNodes.length > 0) {
    wrapper.appendChild(body);
  } else {
    wrapper.appendChild(el('div', { className: 'inline-detail__empty-state' },
      el('span', {
        dataset: { tip: 'Annotationen werden im Rahmen der Erschließung ergänzt.', tipWrap: '' },
      }, 'Noch nicht erschlossen')
    ));
  }

  const foot = renderFoot(record, store);
  if (foot) wrapper.appendChild(foot);

  return wrapper;
}

/**
 * Section title with the colour dot of its content family. The same family
 * colours carry the Erschließungsanzeige in the Bestand row, so the legend
 * arises from proximity instead of standing text (E-158, design rule 2). A
 * block outside the four families (Finanzen, genannte Daten) gets no marker at
 * all, because an empty square would promise a family colour that does not
 * exist.
 */
function renderSection(title, family, content) {
  const marker = family && family !== 'neutral'
    ? familyIcon(family, { size: 14, className: `fam-mark fam-mark--${family}` })
    : null;
  return el('div', { className: 'inline-detail__section' },
    el('div', { className: 'inline-detail__section-title' }, marker, title),
    content
  );
}

/** Metadata as one narrow horizontal bar, the action buttons at its right end. */
function renderMetaBar(pairs, actions) {
  const bar = el('div', { className: 'inline-detail__meta' });
  for (const [label, value] of pairs) {
    bar.appendChild(el('span', { className: 'inline-detail__meta-item' },
      el('span', { className: 'inline-detail__meta-label' }, label),
      el('span', { className: 'inline-detail__meta-value' }, String(value)),
    ));
  }
  if (actions) bar.appendChild(actions);
  return bar;
}

// Administrative fields, shown as label/value rows in the collapsible foot.
// They document the Erschließungsstand, not the record's content, so they stay
// out of the meta bar (processingStatus is the exception and stays there).
const ADMIN_FIELDS = [
  ['m3gim-ontology:processingNote', 'Bearbeitungsnotiz'],
  ['m3gim-ontology:accessStatus', 'Zugang'],
  ['m3gim-ontology:digitizationStatus', 'Digitalisierung'],
];

/** Bundled source line plus the collapsible Verwaltung block; null when empty. */
function renderFoot(record, store) {
  const foot = el('div', { className: 'inline-detail__foot' });
  const { record: own, linked } = sourceSummary(record, store);

  if (own) {
    foot.appendChild(el('div', { className: 'inline-detail__source' },
      el('span', { className: 'inline-detail__source-label' }, 'Quelle'),
      own.sheet ? `${own.sheet}, Zeile ${own.row}` : `Zeile ${own.row}`,
    ));
  }
  if (linked.length) {
    const text = linked.map(({ sheet, rows }) =>
      rows.length > 1 ? `${sheet}, Zeilen ${rows.join(', ')}` : `${sheet}, Zeile ${rows[0]}`
    ).join(' · ');
    foot.appendChild(el('div', { className: 'inline-detail__source' },
      el('span', { className: 'inline-detail__source-label' }, 'Verknüpfungen'),
      text,
    ));
  }

  const admin = ADMIN_FIELDS
    .map(([key, label]) => [label, record[key]])
    .filter(([, value]) => value);
  if (admin.length) {
    const details = el('details', { className: 'inline-detail__admin' },
      el('summary', {}, 'Verwaltung'),
    );
    for (const [label, value] of admin) {
      details.appendChild(el('div', { className: 'inline-detail__admin-row' },
        el('span', { className: 'inline-detail__admin-label' }, label),
        el('span', {}, String(value)),
      ));
    }
    foot.appendChild(details);
  }

  return foot.childNodes.length ? foot : null;
}

/**
 * Ordered non-empty blocks { key, title, family, chips } built from the
 * partition, chips being finished chip elements. The consumer (inline detail or
 * Korb) picks container class, section markup and title format.
 */
export function buildRecordBlocks(record, store) {
  const {
    bucket, works, performanceRoles, performances, events, locations,
    agentRelations, finances, mentionedDatings, eventDatings,
  } = partitionRecord(record, store);

  const blocks = [];
  const push = (key, title, chips) => {
    if (chips.length) {
      blocks.push({ key, title, family: familyOfBlock(key), chips });
    }
  };
  push('produktion', 'Produktion', agentChipEls(store, bucket.produktion));
  push('mitwirkende', 'Mitwirkende', agentChipEls(store, bucket.mitwirkende));
  push('institutionen', 'Institutionen', agentChipEls(store, bucket.institutionen));
  push('werk', 'Werk & Repertoire', workChipEls(works, performanceRoles, store));
  push('auffuehrungen', 'Aufführungen', performanceChipEls(performances));
  push('ort', 'Ort & Ereignis', eventChipEls(store, events, locations, eventDatings));
  push('genannte-daten', 'Im Dokument genannte Daten', datingChipEls(store, mentionedDatings));
  push('erwaehnt', 'Erwähnt', agentChipEls(store, bucket.erwaehnt));
  push('weitere', 'Weitere', agentChipEls(store, bucket.weitere));
  push('beziehungen', 'Beziehungen', relationChipEls(agentRelations));
  push('finanzen', 'Finanzen', financeChipEls(finances));
  return blocks;
}
