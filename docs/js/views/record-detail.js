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
import { partitionRecord, qualityTipLines, pageNeighbours } from './record-detail-data.js';
import {
  agentChipEls, workChipEls, performanceChipEls, eventChipEls,
  relationChipEls, financeChipEls, datingChipEls, QUALITY_ICON_SVG,
} from './record-chips.js';

/**
 * Build an inline detail DOM element for a record.
 * @param {Object} record - The JSON-LD record; for a Folio the page on show
 * @param {Object} store - The data store
 * @param {{pages?: Array<Object>, onPage?: (recordId: string) => void}} [paging]
 *   the pages of the Folio this record belongs to and the handler that turns to
 *   one; without them the detail carries no page control
 * @returns {HTMLElement}
 */
export function buildInlineDetail(record, store, paging = {}) {
  // Konvolute (rico:RecordSet) get no inline detail; their aggregated metadata
  // is shown as chips in the Bestand row itself.
  const wrapper = el('div', { className: 'inline-detail' });

  // Closing is the business of the row that opened the detail (chevron, row
  // click, Escape), so the detail carries no close control of its own
  // (Projektleitung, 2026-09-05).
  const recordId = record['@id'];
  const inKorb = isInKorb(recordId);
  const actions = el('div', { className: 'inline-detail__actions' },
    el('button', {
      className: `inline-detail__action-btn inline-detail__korb-btn ${inKorb ? 'inline-detail__korb-btn--active' : ''}`,
      // The button sits at the right edge of the table; its tooltip opens to the
      // left so it stays inside the scroll box.
      dataset: { tip: korbTip(inKorb), tipPos: 'bottom-right' },
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
  );

  // Only the full Signatur, because the row above already carries the title and
  // shows the folio alone, while this is the citable identifier. It leads the
  // meta bar instead of taking a line of its own and is where the focus lands
  // when the detail opens, programmatically focusable without entering the tab
  // sequence (Projektleitung, 2026-09-05).
  const identifier = record['rico:identifier'];
  const qualityLines = recordQualityTipLines(record);
  const head = identifier || qualityLines.length
    ? el('div', { className: 'inline-detail__head', tabindex: '-1' },
      identifier ? el('span', { className: 'inline-detail__head-sig' }, String(identifier)) : null,
      qualityLines.length ? qualityFlagMark(qualityLines) : null,
    )
    : null;

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
  wrapper.appendChild(renderMetaBar(
    meta, actions, head, renderPaging(record, paging)));

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

  const foot = renderFoot(record);
  if (foot) wrapper.appendChild(foot);

  return wrapper;
}

/**
 * Data-quality marker of the record itself (design rule 10). The current data
 * carries m3gim-ontology:dataQualityFlag on Annotation, Performance and the
 * nested entities only, never on a rico:Record or a rico:RecordSet, so this
 * stays inert until the source puts one there; tests/frontend/record-quality-flag
 * .test.mjs holds that observation against the shipped file.
 */
export function recordQualityTipLines(record) {
  if (!record) return [];
  return qualityTipLines(
    record['m3gim-ontology:dataQualityFlag'],
    record['rico:generalDescription'],
  );
}

// Same mark and same tooltip wording as the chip flag, so the legend arises
// from sameness rather than from text.
function qualityFlagMark(lines) {
  return el('span', {
    className: 'quality-flag',
    dataset: { tip: lines.join('\n'), tipWrap: '' },
    'aria-label': lines.join(', '),
    html: QUALITY_ICON_SVG,
  });
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

/** Metadata as one narrow horizontal bar, the Signatur leading it, the page
 *  control after the fields and the action button at its right end. */
function renderMetaBar(pairs, actions, head, paging) {
  const bar = el('div', { className: 'inline-detail__meta' });
  if (head) bar.appendChild(head);
  for (const [label, value] of pairs) {
    bar.appendChild(el('span', { className: 'inline-detail__meta-item' },
      el('span', { className: 'inline-detail__meta-label' }, label),
      el('span', { className: 'inline-detail__meta-value' }, String(value)),
    ));
  }
  if (paging) bar.appendChild(paging);
  if (actions) bar.appendChild(actions);
  return bar;
}

/**
 * The page control of a Folio: back, position, forward. It turns the page
 * inside the open detail, so the reader stays on the row of the sheet
 * (Aufgabe 7 des Aufgabensatzes). The ends stop instead of wrapping
 * (pageNeighbours), and the disabled button says so without a word.
 * @returns {?HTMLElement} null for a record that is no page of a Folio
 */
function renderPaging(record, { pages, onPage }) {
  const { index, total, prev, next } = pageNeighbours(pages, record['@id']);
  if (total < 2 || index < 0 || typeof onPage !== 'function') return null;
  const step = (target, dir, label, glyph) => {
    const btn = el('button', {
      className: 'inline-detail__page-btn',
      dataset: { tip: label, tipPos: 'bottom-right', pageStep: dir },
      'aria-label': label,
      onClick: (e) => { e.stopPropagation(); if (target) onPage(target['@id']); },
    }, glyph);
    if (!target) btn.disabled = true;
    return btn;
  };
  return el('div', { className: 'inline-detail__page' },
    step(prev, 'prev', 'Vorherige Seite', '‹'),
    el('span', {
      className: 'inline-detail__page-pos',
      // Without a role the label stands on a generic box and no reader speaks
      // it; as an image the position is read as a sentence instead of as
      // "2 slash 12".
      role: 'img',
      dataset: {
        tip: `Seite ${record['rico:identifier'] || record['@id']} des Blattes`,
        tipWrap: '',
      },
      'aria-label': `Seite ${index + 1} von ${total}`,
    }, `${index + 1} / ${total}`),
    step(next, 'next', 'Nächste Seite', '›'),
  );
}

// Administrative fields, shown as label/value rows in the collapsible foot.
// They document the Erschließungsstand, not the record's content, so they stay
// out of the meta bar (processingStatus is the exception and stays there).
const ADMIN_FIELDS = [
  ['m3gim-ontology:processingNote', 'Bearbeitungsnotiz'],
  ['m3gim-ontology:accessStatus', 'Zugang'],
  ['m3gim-ontology:digitizationStatus', 'Digitalisierung'],
];

/** The collapsible Verwaltung block; null when the record carries no admin
 *  field. The bundled source lines are gone, because the provenance pill of
 *  every chip already names sheet and row per data point
 *  (Projektleitung, 2026-09-05). */
function renderFoot(record) {
  const foot = el('div', { className: 'inline-detail__foot' });

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
