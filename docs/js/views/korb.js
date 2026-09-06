/**
 * M³GIM Korb View — bookmarked records with full metadata, relations,
 * finances and located annotations. Cards reuse buildRecordBlocks() from the
 * Archiv-Inline-Detail (E-77) so the korb tab shares the exact block logic and
 * design language of the main interface (single-column, no count suffix).
 */

import { el, clear } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import {
  formatSignatur, formatDocType, getDocTypeId, ensureArray, dftLabel, roleLabel, roleToken,
} from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { primaryYear } from '../data/loader.js';
import { AGRELON_LABELS, formatLanguage, korbIcon } from '../data/constants.js';
import { buildRecordBlocks } from './record-detail.js';
import {
  getKorbItems, removeFromKorb, clearKorb, onKorbChange, reconcileKorb,
} from '../ui/basket.js';
import { navigateToView } from '../ui/router.js';

let store = null;
let container = null;
let unsubscribeKorbChange = null;

export function renderKorb(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;
  reconcileKorb(store.records);

  // Unsubscribe first: renderKorb runs again on every basket change (main.js
  // re-renders the tab), so listeners would otherwise accumulate.
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

  if (records.length === 0) {
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
 * Structured state stamp like the other tab views (env.logStamp), so the Korb
 * becomes smoke-testable; before it logged only that the tab had opened.
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
    el('h2', { className: 'korb-title' }, ids.length > 0 ? `Korb (${ids.length})` : 'Korb'),
    ids.length > 0
      ? el('div', { className: 'korb-header__actions' },
          el('button', {
            className: 'korb-export',
            dataset: { tip: 'Auswahl als CSV-Datei laden' },
            onClick: () => exportCSV(ids),
          }, '\u2193 CSV'),
          el('button', {
            className: 'korb-export',
            dataset: { tip: 'Auswahl als BibTeX-Datei laden' },
            onClick: () => exportBibTeX(ids),
          }, '\u2193 BibTeX'),
          el('button', {
            className: 'korb-export',
            dataset: { tip: 'Auswahl als JSON-LD-Datei laden' },
            onClick: () => exportJSONLD(ids),
          }, '\u2193 JSON-LD'),
          el('button', {
            className: 'korb-export',
            dataset: { tip: 'Auswahl als GEXF-Datei laden' },
            onClick: () => exportGEXF(ids),
          }, '\u2193 GEXF'),
          el('button', {
            className: 'korb-clear',
            onClick: () => { clearKorb(); },
          }, 'Korb leeren'),
        )
      : null,
  );
}

function renderEmpty() {
  // Symbol and state only: the way into the basket stands on the Korb button of
  // the rows, not as explanatory text here (design.md rule 8). The same sign as
  // tab and button, one sign carries one meaning (E-217).
  return el('div', { className: 'korb-empty' },
    el('span', { html: korbIcon(48, false) }),
    el('p', { className: 'korb-empty__text' }, 'Korb leer'),
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
  // The href stays for middle-click; the click goes through the router so the
  // hash keeps the shared cut and the address stays citable (E-208,
  // user-story audit 2026-09-04).
  const sigEl = el('a', {
    className: 'korb-card__sig',
    href: '#bestand/' + encodeURIComponent(recordId),
    dataset: { tip: 'Im Bestand anzeigen' },
    onClick: (e) => { e.preventDefault(); navigateToView('bestand', { recordId }); },
  }, formatSignatur(record['rico:identifier']));

  const removeBtn = el('button', {
    className: 'korb-card__remove',
    dataset: { tip: 'Aus dem Korb entfernen' },
    'aria-label': 'Aus dem Korb entfernen',
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
  const status = record['m3gim-ontology:processingStatus'];
  if (status) parts.push(status);
  if (!parts.length) return null;
  return el('div', { className: 'korb-card__meta' }, parts.join(' \u00b7 '));
}

function renderCardBody(record) {
  const body = el('div', { className: 'korb-card__body' });
  // Shared block logic with the inline detail (Tier 2.4), rendered here in one
  // column and without the count suffix.
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

/* --- Evidence --- */

/**
 * A source cell in the reading form of the interface: sheet, row and, where the
 * row bundles several statements, the data point. The exports spell the words
 * out instead of using the "Z." of the provenance pill, because an exported
 * file is read without the legend the application carries (F7).
 */
function sourceCell(xlsxSource) {
  if (!xlsxSource || !xlsxSource.row) return '';
  const parts = [];
  if (xlsxSource.sheet) parts.push(String(xlsxSource.sheet));
  parts.push(`Zeile ${xlsxSource.row}`);
  if (xlsxSource.datenpunkt) parts.push(`Datenpunkt ${xlsxSource.datenpunkt}`);
  return parts.join(' ');
}

/** Amount and currency of a finance item as one value. */
function financeValue(entry) {
  const amount = Number.isFinite(entry.amount) ? entry.amount.toLocaleString('de-DE') : '';
  return `${amount}${entry.currency ? ' ' + entry.currency : ''}`.trim();
}

/**
 * The evidence of one record as data: its own source cell and one entry per
 * data point with family, role label, value and source cell. Every export
 * format writes this, so a citation taken from the file holds without
 * reopening the application (F7).
 *
 * The data points come from the same store maps the inline detail reads. A
 * place recorded both as `rico:hasOrHadLocation` and as an annotation stands on
 * one source row and would appear twice, so entries equal in family, role,
 * value and source cell collapse into one.
 *
 * @param {Object} record
 * @param {Object} storeRef
 * @returns {{source: ?Object, anchor: Object,
 *   links: Array<{family: string, role: string, value: string, source: ?Object}>}}
 */
function recordEvidence(record, storeRef) {
  const rid = record['@id'];
  const links = [];
  const seen = new Set();
  const add = (family, role, value, source) => {
    if (!value) return;
    const key = [family, role, value, sourceCell(source)].join('\u0000');
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ family, role: role || '', value, source: source || null });
  };

  for (const agent of ensureArray(record['m3gim-ontology:hasAssociatedAgent'])) {
    const family = agentFamily(agent) === 'institution' ? 'Institution' : 'Person';
    add(family, roleLabel(storeRef, agent.role), agent.name || agent['skos:prefLabel'] || '',
      extractXlsxSource(agent));
  }
  for (const subj of ensureArray(record['rico:hasOrHadSubject'])) {
    const family = subj['@type'] === 'rico:Person' ? 'Person' : 'Werk';
    add(family, roleLabel(storeRef, subj.role), subj.name || subj['skos:prefLabel'] || '',
      extractXlsxSource(subj));
  }
  for (const loc of ensureArray(record['rico:hasOrHadLocation'])) {
    add('Ort', roleLabel(storeRef, loc.role), loc.name || loc['skos:prefLabel'] || '',
      extractXlsxSource(loc));
  }
  // The annotations carry place and date of the record. Reading them through
  // recordToAnnotations instead of recordToEvents and recordDatings keeps an
  // annotation that carries both from entering the list twice.
  for (const aid of storeRef.recordToAnnotations?.get(rid) || []) {
    const ann = storeRef.annotations?.get(aid);
    if (!ann) continue;
    const value = [ann.place, ann.date ? formatDate(ann.date) : ''].filter(Boolean).join(', ');
    add(ann.place ? 'Ort' : 'Datierung', ann.roleLabel, value, ann.xlsxSource);
  }
  for (const ref of ensureArray(record['m3gim-ontology:hasPerformance'])) {
    const perf = storeRef.performances?.get(ref && ref['@id']);
    if (!perf) continue;
    const source = extractXlsxSource(perf);
    for (const sr of ensureArray(perf['m3gim-ontology:hasStageRole'])) {
      add('Bühnenrolle', '', storeRef.stageRoles?.get(sr && sr['@id']) || '', source);
    }
  }
  // The direction sits in the role of the relation target; without it
  // "Korrespondenz · Verfasser" becomes an undirected mention. Same form as
  // the chip in the detail (user-story audit 2026-09-04).
  for (const rel of storeRef.agentRelations?.get(rid) || []) {
    const base = AGRELON_LABELS[rel.type] || rel.type || '';
    const role = rel.objectRoleLabel ? `${base} \u00b7 ${rel.objectRoleLabel}` : base;
    add('Beziehung', role, rel.objectName || '', rel.xlsxSource);
  }
  // Field and role both carry meaning here, income against expenditure and the
  // kind of payment; the chip in the detail shows both and so does the export.
  for (const entry of storeRef.finances?.get(rid) || []) {
    const value = `${financeValue(entry)}${entry.role ? ` (${entry.role})` : ''}`.trim();
    add('Finanz', entry.field || 'Finanz', value, entry.xlsxSource);
  }

  return { source: extractXlsxSource(record), links, anchor: yearAnchor(record, storeRef) };
}

/**
 * The year anchor of the record with the source cell it rests on. Since the
 * anchor takes the link dating before `rico:date` (F3), the year of an export
 * can come from a link row, and without that row the year is an assertion
 * without evidence. primaryYear returns the anchor without its provenance, so
 * the Datierung is found again by role and date value.
 *
 * @returns {{year: ?number, label: ?string, source: ?Object}}
 */
function yearAnchor(record, storeRef) {
  const anchor = primaryYear(storeRef, record);
  if (anchor.year == null || anchor.source === 'rico:date') {
    return { year: anchor.year, label: null, source: null };
  }
  const dating = (storeRef.recordDatings?.get(record['@id']) || [])
    .find(d => d.roleId === anchor.roleId && d.date === anchor.date);
  return { year: anchor.year, label: anchor.label, source: dating ? dating.xlsxSource : null };
}

function exportCSV(ids) {
  const csv = buildCSVRows(ids, store).map(r => r.map(csvEscape).join(',')).join('\n');
  downloadFile(csv, 'm3gim-korb.csv', 'text/csv;charset=utf-8');
}

/**
 * The families of recordEvidence as CSV columns, in the reading order of the
 * detail. Every family the model carries gets a column, so no link of the
 * record drops out of the export; institutions and stage roles had none before
 * and were lost on the way (F7).
 */
const CSV_LINK_COLUMNS = [
  ['Personen', 'Person'],
  ['Institutionen', 'Institution'],
  ['Orte', 'Ort'],
  ['Datierungen', 'Datierung'],
  ['Werke', 'Werk'],
  ['Bühnenrollen', 'Bühnenrolle'],
  ['Beziehungen', 'Beziehung'],
  ['Finanzen', 'Finanz'],
];

// The header states how a link cell reads, because a spreadsheet carries no
// legend beside it. The item separator stays the "; " of the earlier columns
// rather than a newline inside the cell, which a line-based reader breaks on.
const CSV_LINK_FORMAT = ' (Rolle: Wert [Quelle]; getrennt durch Semikolon)';

/** The year anchor as a cell: the year, its role and the source cell it rests on. */
function anchorText(anchor) {
  if (!anchor || anchor.year == null) return '';
  return linkText({ role: anchor.label || '', value: String(anchor.year), source: anchor.source });
}

/** One data point as an item of a link cell: role, value and its source cell. */
function linkText(link) {
  const cell = sourceCell(link.source);
  return `${link.role ? link.role + ': ' : ''}${link.value}${cell ? ` [${cell}]` : ''}`;
}

/**
 * The CSV as a row matrix, header first. Separated from the download so the
 * column mapping is testable without DOM.
 * @param {string[]} ids
 * @param {Object} storeRef
 * @returns {string[][]}
 */
export function buildCSVRows(ids, storeRef) {
  const store = storeRef;
  const records = ids.map(id => store.records.get(id)).filter(Boolean);
  const header = [
    'Signatur', 'Titel', 'Typ', 'Datierung', 'Zeitanker (Rolle: Jahr [Quelle])',
    'Konvolut', 'Quelle Blatt', 'Quelle Zeile',
    ...CSV_LINK_COLUMNS.map(([label]) => label + CSV_LINK_FORMAT),
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

    const { source, links, anchor } = recordEvidence(r, store);
    const cells = CSV_LINK_COLUMNS.map(([, family]) => links
      .filter(link => link.family === family)
      .map(linkText)
      .join('; '));

    rows.push([
      sig, title, docType, date, anchorText(anchor), konvolut,
      source ? source.sheet || '' : '', source ? String(source.row) : '',
      ...cells,
    ]);
  }

  return rows;
}

function csvEscape(value) {
  const s = String(value ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

function exportBibTeX(ids) {
  downloadFile(buildBibTeX(ids, store), 'm3gim-korb.bib', 'application/x-bibtex');
}

/**
 * The rows of a record's evidence per sheet, as one line: "Box 1 Zeilen 2966,
 * 2967; Box 2 Zeile 12". Duplicates collapse, because two data points of one
 * row stand on one cell of the recording table.
 */
function sourceRowsBySheet(links) {
  const bySheet = new Map();
  for (const link of links) {
    if (!link.source || !link.source.row) continue;
    const sheet = link.source.sheet || 'XLSX';
    if (!bySheet.has(sheet)) bySheet.set(sheet, new Set());
    bySheet.get(sheet).add(link.source.row);
  }
  return [...bySheet.entries()].map(([sheet, rows]) => {
    const sorted = [...rows].sort((a, b) => a - b);
    return `${sheet} ${sorted.length > 1 ? 'Zeilen' : 'Zeile'} ${sorted.join(', ')}`;
  }).join('; ');
}

/**
 * The BibTeX text of a selection of records. Separated from the download so
 * the field mapping is testable without DOM.
 * @param {string[]} ids
 * @param {Object} storeRef
 * @returns {string}
 */
export function buildBibTeX(ids, storeRef) {
  const records = ids.map(id => storeRef.records.get(id)).filter(Boolean);
  const entries = [];

  for (const r of records) {
    const rid = r['@id'];
    const sig = r['rico:identifier'] || 'unknown';
    const key = sig.replace(/[^a-zA-Z0-9]/g, '_');
    const title = r['rico:title'] || 'Ohne Titel';
    const { source, links, anchor } = recordEvidence(r, storeRef);
    // The time anchor of the record, not its rendered display date: a record
    // without rico:date carries its year on an anchoring Datierung.
    const year = anchor.year ?? '';
    const agents = ensureArray(r['m3gim-ontology:hasAssociatedAgent']);

    let author = agents
      .filter(a => {
        const rolle = roleToken(a.role);
        return rolle === 'verfasser:in' || rolle === 'verfasser';
      })
      .map(a => a.name || '')
      .filter(Boolean)
      .join(' and ');

    if (!author) {
      const senderRel = (storeRef.agentRelations?.get(rid) || [])
        .find(rel => rel.type === 'agrelon:HasCorrespondent' && rel.objectName);
      if (senderRel) author = senderRel.objectName;
    }

    // The note is the one free field a citation manager shows verbatim, so the
    // evidence rides there: the source cell of the record and how many links it
    // carries on which rows (F7).
    const note = [
      sig,
      source ? `Quelle: ${sourceCell(source)}` : null,
      anchor.source ? `Zeitanker: ${anchor.label || 'Datierung'} ${sourceCell(anchor.source)}` : null,
      links.length ? `Verknüpfungen: ${links.length} (${sourceRowsBySheet(links)})` : null,
    ].filter(Boolean).join('. ');

    const fields = [];
    if (author) fields.push(`  author    = {${bibtexEscape(author)}}`);
    fields.push(`  title     = {${bibtexEscape(title)}}`);
    if (year) fields.push(`  year      = {${year}}`);
    fields.push(`  note      = {${bibtexEscape(note)}}`);
    fields.push(`  howpublished = {Teilnachlass Ira Malaniuk, UAKUG/NIM, KUG Graz}`);

    entries.push(`@misc{${key},\n${fields.join(',\n')}\n}`);
  }

  return entries.join('\n\n');
}

/**
 * LaTeX escapes for BibTeX field values. Every Signatur carries an underscore
 * and several titles carry & or %; unescaped the file breaks when typeset
 * (user-story audit 2026-09-04). Keys stay raw, they are already normalised to
 * [A-Za-z0-9_]. One pass over a character class, so a replacement never gets
 * escaped a second time.
 */
const BIBTEX_ESCAPES = {
  '\\': '\\textbackslash{}',
  '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
  '_': '\\_', '{': '\\{', '}': '\\}',
  '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
};

function bibtexEscape(s) {
  return String(s ?? '').replace(/[\\&%$#_{}~^]/g, c => BIBTEX_ESCAPES[c]);
}

/* --- JSON-LD --- */

/** Date part of an export file name, ISO so the files sort by day. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

function exportJSONLD(ids) {
  const json = JSON.stringify(buildJSONLD(ids, store), null, 2);
  downloadFile(json, `m3gim-korb-${today()}.jsonld`, 'application/ld+json', false);
}

/**
 * The selection as a JSON-LD document: the @context of the source and the
 * records unchanged, as they stand in the dataset, plus the standalone nodes
 * they reference (annotations, performances, stage roles, vocabulary terms) in
 * the transitive closure. A neighbouring record or Konvolut stays out,
 * otherwise one evidence back-reference would drag half the fonds behind it.
 *
 * The records are copied whole, so the source cell of the record and of every
 * nested data point travels with them; this format needs no separate evidence
 * pass (F7).
 *
 * @param {string[]} ids
 * @param {Object} storeRef - carries @context and the raw graph of the dataset
 * @returns {{'@context': Object, '@graph': Object[]}}
 */
export function buildJSONLD(ids, storeRef) {
  const graph = (storeRef && storeRef.graph) || [];
  const byId = new Map();
  for (const node of graph) {
    if (node && node['@id']) byId.set(node['@id'], node);
  }

  const out = [];
  const seen = new Set();
  for (const id of ids) {
    const record = storeRef.records.get(id);
    if (!record || seen.has(id)) continue;
    seen.add(id);
    out.push(record);
  }

  const queue = [...out];
  while (queue.length > 0) {
    const node = queue.shift();
    for (const ref of referencedIds(node)) {
      if (seen.has(ref)) continue;
      const target = byId.get(ref);
      if (!target) continue;
      const type = target['@type'];
      if (type === 'rico:Record' || type === 'rico:RecordSet') continue;
      seen.add(ref);
      out.push(target);
      queue.push(target);
    }
  }

  const context = (storeRef && storeRef['@context']) || {};
  return { '@context': context, '@graph': out };
}

/** Every @id occurring anywhere in a node, however deeply nested. */
function referencedIds(value, acc = []) {
  if (Array.isArray(value)) {
    for (const item of value) referencedIds(item, acc);
    return acc;
  }
  if (!value || typeof value !== 'object') return acc;
  for (const [key, inner] of Object.entries(value)) {
    if (key === '@id') {
      if (typeof inner === 'string') acc.push(inner);
    } else {
      referencedIds(inner, acc);
    }
  }
  return acc;
}

/* --- GEXF --- */

function exportGEXF(ids) {
  downloadFile(buildGEXF(ids, store), `m3gim-korb-${today()}.gexf`, 'application/gexf+xml', false);
}

/** Family key of an agent node: corporate body and ensemble count as institutions. */
function agentFamily(agent) {
  const type = agent['@type'];
  return (type === 'rico:CorporateBody' || type === 'rico:Group') ? 'institution' : 'person';
}

/**
 * The selection as a GEXF 1.3 graph: one node per record and one per linked
 * entity of the families person, institution, ort and werk, the edge carrying
 * the recorded role and the source cell of the mention. Undirected, because the
 * link is a mention in the document and asserts no direction.
 *
 * Two mentions of the same entity in the same role on two source rows stay two
 * edges: the edge is the mention, and collapsing them would drop one source
 * cell. Only a mention recorded twice on one row collapses (F7).
 *
 * @param {string[]} ids
 * @param {Object} storeRef
 * @param {string} [isoDate] - lastmodifieddate in the meta block
 * @returns {string}
 */
export function buildGEXF(ids, storeRef, isoDate = today()) {
  const records = ids.map(id => storeRef.records.get(id)).filter(Boolean);
  const nodes = new Map();
  const edges = [];
  const edgeSeen = new Set();

  const addNode = (family, name, source = null) => {
    const nid = `${family}:${name}`;
    if (!nodes.has(nid)) nodes.set(nid, { id: nid, label: name, family, cell: source });
    return nid;
  };
  const addEdge = (source, target, role, xlsxSource) => {
    const key = `${source}\u0000${target}\u0000${role}\u0000${sourceCell(xlsxSource)}`;
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({ id: `e${edges.length}`, source, target, role, cell: xlsxSource || null });
  };

  for (const r of records) {
    const rid = r['@id'];
    const recordNode = addNode(
      'record', formatSignatur(r['rico:identifier']) || rid, extractXlsxSource(r));

    for (const agent of ensureArray(r['m3gim-ontology:hasAssociatedAgent'])) {
      const name = agent.name || agent['skos:prefLabel'] || '';
      if (!name) continue;
      addEdge(recordNode, addNode(agentFamily(agent), name),
        roleLabel(storeRef, agent.role), extractXlsxSource(agent));
    }

    for (const subj of ensureArray(r['rico:hasOrHadSubject'])) {
      const name = subj.name || subj['skos:prefLabel'] || '';
      if (!name) continue;
      const family = subj['@type'] === 'm3gim-ontology:MusicalWork' ? 'werk'
        : subj['@type'] === 'rico:Person' ? 'person' : null;
      if (!family) continue;
      addEdge(recordNode, addNode(family, name),
        roleLabel(storeRef, subj.role), extractXlsxSource(subj));
    }

    for (const loc of ensureArray(r['rico:hasOrHadLocation'])) {
      const name = loc.name || loc['skos:prefLabel'] || '';
      if (!name) continue;
      addEdge(recordNode, addNode('ort', name),
        roleLabel(storeRef, loc.role), extractXlsxSource(loc));
    }

    // Most places sit on the annotations, not on the record; without them the
    // graph would lose the spatiotemporal trace the map runs on.
    for (const eid of storeRef.recordToEvents?.get(rid) || []) {
      const ev = storeRef.mobilityEvents.get(eid);
      if (!ev || !ev.place) continue;
      addEdge(recordNode, addNode('ort', ev.place), ev.roleLabel || '', ev.xlsxSource);
    }
  }

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<gexf xmlns="http://gexf.net/1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://gexf.net/1.3 http://gexf.net/1.3/gexf.xsd" version="1.3">');
  lines.push('  <meta lastmodifieddate="' + xmlEscape(isoDate) + '">');
  lines.push('    <creator>M³GIM — Teilnachlass Ira Malaniuk, UAKUG/NIM, KUG Graz</creator>');
  lines.push('    <description>Korb-Auswahl: Dokumente und verknüpfte Entitäten</description>');
  lines.push('  </meta>');
  lines.push('  <graph defaultedgetype="undirected" mode="static">');
  // The source cell rides as three attributes rather than one text, so a graph
  // tool can filter and group on sheet and row (F7).
  for (const cls of ['node', 'edge']) {
    lines.push(`    <attributes class="${cls}">`);
    lines.push('      ' + gexfAttribute(cls === 'node' ? 'family' : 'role'));
    for (const id of PROVENANCE_ATTRIBUTES) lines.push('      ' + gexfAttribute(id));
    lines.push('    </attributes>');
  }
  lines.push('    <nodes>');
  for (const node of nodes.values()) {
    lines.push(`      <node id="${xmlEscape(node.id)}" label="${xmlEscape(node.label)}">`);
    const attvalues = gexfValues([['family', node.family], ...provenanceValues(node.cell)]);
    if (attvalues) lines.push('        ' + attvalues);
    lines.push('      </node>');
  }
  lines.push('    </nodes>');
  lines.push('    <edges>');
  for (const edge of edges) {
    lines.push(`      <edge id="${edge.id}" source="${xmlEscape(edge.source)}" target="${xmlEscape(edge.target)}">`);
    const attvalues = gexfValues([['role', edge.role], ...provenanceValues(edge.cell)]);
    if (attvalues) lines.push('        ' + attvalues);
    lines.push('      </edge>');
  }
  lines.push('    </edges>');
  lines.push('  </graph>');
  lines.push('</gexf>');
  return lines.join('\n') + '\n';
}

/** The source cell as GEXF attributes, declared on both node and edge class. */
const PROVENANCE_ATTRIBUTES = ['sheet', 'row', 'datapoint'];

/** The three provenance attribute pairs of one source cell, absent parts empty. */
function provenanceValues(xlsxSource) {
  return [
    ['sheet', xlsxSource && xlsxSource.sheet],
    ['row', xlsxSource && xlsxSource.row],
    ['datapoint', xlsxSource && xlsxSource.datenpunkt],
  ];
}

/** An attvalues block from id/value pairs, empty values dropped; null when none remains. */
function gexfValues(pairs) {
  const set = pairs.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (set.length === 0) return null;
  return '<attvalues>'
    + set.map(([id, value]) => `<attvalue for="${id}" value="${xmlEscape(value)}"/>`).join('')
    + '</attvalues>';
}

/**
 * Attribute declaration of a GEXF graph. The display form of an attribute is
 * called `title` in GEXF; that is a name of the graph format and not the HTML
 * tooltip attribute the frontend avoids. The pairs therefore stand as data and
 * not as a literal in the source (tooltip-system.test.mjs).
 */
function gexfAttribute(id) {
  const pairs = [['id', id], ['title', id], ['type', 'string']];
  return '<attribute ' + pairs.map(([key, value]) => `${key}="${xmlEscape(value)}"`).join(' ') + '/>';
}

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/**
 * Attribute values carry ampersands ("Programme & Kritiken") and apostrophes
 * from place and work names; unescaped they make the file unparsable.
 * Characters XML 1.0 forbids outright are dropped rather than escaped, an
 * escaped C0 control is still invalid.
 */
function xmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"']/g, c => XML_ESCAPES[c]);
}

function downloadFile(content, filename, mimeType, bom = true) {
  // The BOM is what makes Excel read the CSV as UTF-8. In front of JSON-LD it
  // breaks JSON.parse, in front of XML it breaks the declaration, so the two
  // machine formats switch it off.
  const blob = new Blob([bom ? '\uFEFF' + content : content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
