/**
 * M³GIM Archiv Inline Detail — shared component for Bestand and Chronik.
 *
 * buildRecordBlocks() is the single source of the functional blocks; both this
 * detail and the Wissenskorb (views/basket.js) consume it. Layout and CSS
 * classes belong to the consumer, the chip logic lives only here.
 */

import { el } from '../utils/dom.js';
import {
  formatDocType, ensureArray, entityName, asWikidataId, roleLabel, roleToken,
  glossOf, roleIdOf,
} from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { navigateToIndex, applyArchivFilter } from '../ui/router.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import { WIKIDATA_ICON_SVG, AGRELON_LABELS, roleClusterFor, sectionForRole, formatLanguage, bookmarkIcon, DATING_SCOPE, familyOfBlock } from '../data/constants.js';
import { datingsOf, datingsByScope } from '../data/loader.js';

// Indizes grid -> sidebar filter facet (E-91). Grids without a facet
// equivalent (organisationen) still navigate into the index.
const GRID_TO_FACET = { personen: 'person', orte: 'location', werke: 'werk' };

// Agents already visible through an AgRelOn relation are suppressed in their
// origin bucket so the same agent is not shown in two sections. Only roles
// with an AgRelOn equivalent are affected.
const AGRELON_ROLES = new Set([
  'absender', 'empfänger', 'empfaenger', 'adressat',
  'arbeitgeber', 'agent', 'vermittler', 'auftraggeber',
]);

/**
 * voiceType of the first stage role that carries one, if the model records it.
 * The data currently holds none; this reads it defensively from either the
 * inline stage-role reference node or the resolved StageRole node so the field
 * surfaces the moment the pipeline emits it, without a schema change here.
 */
function firstVoiceType(store, stageRoleRefs) {
  for (const sr of ensureArray(stageRoleRefs)) {
    if (!sr) continue;
    const inline = sr['m3gim-ontology:voiceType'];
    if (inline) return inline;
    const node = sr['@id'] && store && store.stageRoleNodes?.get(sr['@id']);
    if (node && node['m3gim-ontology:voiceType']) return node['m3gim-ontology:voiceType'];
  }
  return null;
}

/** Chip click: set the shared facet filter where one exists, else go to the index. */
export function chipClickFor(gridType, name) {
  if (!gridType || !name) return null;
  const facet = GRID_TO_FACET[gridType];
  if (facet) return () => applyArchivFilter(facet, name);
  return () => navigateToIndex(gridType, name);
}

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

  // Signatur and Titel already stand in the table row above (E-157), so the
  // action bar carries only the two equally sized icon buttons, labels in the
  // tooltip.
  const recordId = record['@id'];
  const inKorb = isInKorb(recordId);
  const closeIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const korbTip = (state) => state ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzufügen';
  const actions = el('div', { className: 'inline-detail__actions' },
    el('button', {
      className: `inline-detail__action-btn inline-detail__korb-btn ${inKorb ? 'inline-detail__korb-btn--active' : ''}`,
      title: korbTip(inKorb),
      'aria-label': korbTip(inKorb),
      onClick: (e) => {
        e.stopPropagation();
        toggleKorb(recordId);
        const btn = e.currentTarget;
        const nowIn = isInKorb(recordId);
        btn.classList.toggle('inline-detail__korb-btn--active', nowIn);
        btn.title = korbTip(nowIn);
        btn.setAttribute('aria-label', korbTip(nowIn));
        btn.innerHTML = bookmarkIcon(16, nowIn);
      },
      html: bookmarkIcon(16, inKorb),
    }),
    el('button', {
      className: 'inline-detail__action-btn inline-detail__close',
      title: 'Schließen',
      'aria-label': 'Detail schließen',
      onClick: (e) => {
        e.stopPropagation();
        if (onClose) onClose();
      },
      html: closeIcon,
    })
  );
  wrapper.appendChild(actions);

  // Metadata as one narrow full-width bar; the administrative fields sit in the
  // collapsible foot instead, so only Status remains here.
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
  if (status) meta.push(['Status', status]);
  if (meta.length) wrapper.appendChild(renderMetaBar(meta));

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
    'produktion', 'mitwirkende', 'werk', 'auffuehrungen', 'ort',
    'genannte-daten', 'erwaehnt', 'weitere', 'beziehungen', 'finanzen',
  ];
  const body = el('div', { className: 'inline-detail__body' });
  for (const key of ORDER) {
    const b = byKey.get(key);
    if (!b) continue;
    const chipsEl = el('div', { className: 'inline-detail__chips' }, ...b.chips);
    body.appendChild(renderSection(`${b.title} (${b.count})`, b.family, chipsEl));
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
 * arises from proximity instead of standing text (E-158, design rule 2).
 */
function renderSection(title, family, content) {
  return el('div', { className: 'inline-detail__section' },
    el('div', { className: 'inline-detail__section-title' },
      el('span', { className: `ersch-dot ersch-dot--on ersch-dot--${family || 'neutral'}`, 'aria-hidden': 'true' }),
      title,
    ),
    content
  );
}

/** Metadata as one narrow horizontal bar across the full width. */
function renderMetaBar(pairs) {
  const bar = el('div', { className: 'inline-detail__meta' });
  for (const [label, value] of pairs) {
    bar.appendChild(el('span', { className: 'inline-detail__meta-item' },
      el('span', { className: 'inline-detail__meta-label' }, label),
      el('span', { className: 'inline-detail__meta-value' }, String(value)),
    ));
  }
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

/**
 * Provenance of the record and of everything nested in it, dom-free so it is
 * unit-testable. Per-chip pills stay in place; this bundles them so the whole
 * entry can be traced back to its Verknüpfungen sheets without hovering each
 * chip (design rule 6).
 *
 * @returns {{record: ?{sheet: ?string, row: number}, linked: Array<{sheet: string, rows: number[]}>}}
 */
export function sourceSummary(record, store) {
  const own = extractXlsxSource(record);
  const {
    bucket, works, performanceRoles, performances, events, locations,
    agentRelations, finances, mentionedDatings, eventDatings,
  } = partitionRecord(record, store);

  const bySheet = new Map();
  const nested = [
    ...bucket.produktion, ...bucket.mitwirkende, ...bucket.erwaehnt, ...bucket.weitere,
    ...works, ...performanceRoles, ...performances, ...events, ...locations,
    ...agentRelations, ...finances, ...mentionedDatings, ...eventDatings,
  ];
  for (const entity of nested) {
    // Store-derived entities carry a precomputed xlsxSource, raw JSON-LD nodes
    // do not; both shapes reach this list.
    const src = (entity && entity.xlsxSource) || extractXlsxSource(entity);
    if (!src || !src.sheet) continue;
    if (!bySheet.has(src.sheet)) bySheet.set(src.sheet, new Set());
    bySheet.get(src.sheet).add(src.row);
  }

  const linked = [...bySheet.entries()]
    .map(([sheet, rows]) => ({ sheet, rows: [...rows].sort((a, b) => a - b) }))
    .sort((a, b) => a.sheet.localeCompare(b.sheet, 'de'));
  return { record: own ? { sheet: own.sheet, row: own.row } : null, linked };
}

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
 * Partition a record into its functional parts, dom-free and therefore
 * unit-testable: the agent buckets with AgRelOn dedup plus the raw work,
 * annotation, location, relation and finance lists. buildRecordBlocks turns
 * these into DOM, this function never does.
 */
export function partitionRecord(record, store) {
  const recordId = record['@id'];
  const allAgents = ensureArray(record['m3gim-ontology:hasAssociatedAgent']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const works = subjects.filter(s => s['@type'] === 'm3gim-ontology:MusicalWork' || s['@type'] === 'm3gim-ontology:FramingEvent');
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  // Resolve the referenced Performance entities (E-96, replaced the former
  // hasPerformanceRole attribute). The individual Performance nodes are
  // fragmentary: a dated one carries a work and date but no stage role, an
  // undated one carries only a standalone stage role. Split them so a dated
  // performance goes to its own "Aufführungen" section and the undated
  // standalone roles stay in Werk & Repertoire — no role appears twice.
  const performanceRoles = [];   // undated standalone stage roles
  const performances = [];       // dated performances (date + work + roles)
  for (const ref of ensureArray(record['m3gim-ontology:hasPerformance'])) {
    const perf = store.performances?.get(ref && ref['@id']);
    if (!perf) continue;
    const qualityFlag = perf['m3gim-ontology:dataQualityFlag'];
    const date = perf['m3gim-ontology:atDate'] || null;
    const roleNames = ensureArray(perf['m3gim-ontology:hasStageRole'])
      .map(sr => sr && sr['@id'] && store.stageRoles?.get(sr['@id']))
      .filter(Boolean);
    if (date) {
      const wof = perf['m3gim-ontology:performanceOf'];
      performances.push({
        date,
        work: wof ? (wof.name || wof['skos:prefLabel'] || null) : null,
        workWikidata: wof && String(wof['@id'] || '').startsWith('wd:') ? wof['@id'] : null,
        roles: roleNames,
        // voiceType may sit on the stage role or the performance once modelled.
        voiceType: perf['m3gim-ontology:voiceType']
          || firstVoiceType(store, perf['m3gim-ontology:hasStageRole']),
        xlsxSource: extractXlsxSource(perf),
        qualityFlag,
      });
    } else {
      // dataQualityFlag sits on the Performance, not the StageRole. voiceType is
      // attached only when the model carries it, so the common case keeps the
      // minimal { name, qualityFlag } shape.
      const voiceType = firstVoiceType(store, perf['m3gim-ontology:hasStageRole']);
      for (const name of roleNames) {
        performanceRoles.push(voiceType ? { name, qualityFlag, voiceType } : { name, qualityFlag });
      }
    }
  }
  const locations = ensureArray(record['rico:hasOrHadLocation']);
  const eventIds = store.recordToEvents?.get(recordId) || [];
  const events = eventIds.map(eid => store.mobilityEvents.get(eid)).filter(Boolean);
  const agentRelations = store.agentRelations?.get(recordId) || [];
  const finances = store.finances?.get(recordId) || [];
  // Placeless datings only; placed ones already stand in the Ort & Ereignis
  // block, so no chip appears twice. mentionedDatings are dates NAMED in the
  // document, not biographical events, which is why they hang on the record and
  // never on the Chronik timeline. eventDatings carry every other scope, so
  // framing events, the contract status and the object dating stay visible.
  const hasDatings = Boolean(store && store.recordDatings);
  const mentionedDatings = hasDatings
    ? datingsByScope(store, record, DATING_SCOPE.mentioned).filter(d => !d.place) : [];
  const eventDatings = hasDatings
    ? datingsOf(store, record).filter(d => !d.place && d.scope !== DATING_SCOPE.mentioned) : [];

  const agrelonAgentKeys = new Set();
  for (const rel of agentRelations) {
    const key = rel.objectWikidata || (rel.objectName || '').toLowerCase();
    if (key) agrelonAgentKeys.add(key);
  }

  const bucket = { produktion: [], mitwirkende: [], erwaehnt: [], weitere: [] };
  for (const a of allAgents) {
    // The role hangs on the agent as a reference node; section and dedup tables
    // key on its raw token.
    const token = roleToken(a.role);
    const roleKey = (token || '').toLowerCase();
    if (AGRELON_ROLES.has(roleKey)) {
      const agentKey = a['@id'] || (a.name || '').toLowerCase();
      if (agentKey && agrelonAgentKeys.has(agentKey)) continue;
    }
    const section = sectionForRole(token) || 'weitere';
    bucket[section].push(a);
  }
  for (const p of mentionedPersons) bucket.erwaehnt.push(p);

  return {
    bucket, works, performanceRoles, performances, events, locations,
    agentRelations, finances, mentionedDatings, eventDatings,
  };
}

/**
 * Ordered non-empty blocks { key, title, count, family, chips } built from the
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
      blocks.push({ key, title, count: chips.length, family: familyOfBlock(key), chips });
    }
  };
  push('produktion', 'Produktion', agentChipEls(store, bucket.produktion));
  push('mitwirkende', 'Mitwirkende', agentChipEls(store, bucket.mitwirkende));
  push('werk', 'Werk & Repertoire', workChipEls(works, performanceRoles));
  push('auffuehrungen', 'Aufführungen', performanceChipEls(performances));
  push('ort', 'Ort & Ereignis', eventChipEls(store, events, locations, eventDatings));
  push('genannte-daten', 'Im Dokument genannte Daten', datingChipEls(store, mentionedDatings));
  push('erwaehnt', 'Erwähnt', agentChipEls(store, bucket.erwaehnt));
  push('weitere', 'Weitere', agentChipEls(store, bucket.weitere));
  push('beziehungen', 'Beziehungen', relationChipEls(agentRelations));
  push('finanzen', 'Finanzen', financeChipEls(finances));
  return blocks;
}

/** Agent subnodes -> role-prefix chips, clickable into the person facet. */
function agentChipEls(store, entities) {
  return entities.map(entity => buildRoleChip({
    prefix: roleLabel(store, entity.role) || 'AGENT',
    gloss: glossOf(store, roleIdOf(entity.role)),
    value: entityName(entity, entity['@id'] || '?'),
    xlsxSource: extractXlsxSource(entity),
    wikidata: asWikidataId(entity['@id']),
    qualityFlag: entity['m3gim-ontology:dataQualityFlag'],
    tip: 'Als Filter setzen',
    onClick: chipClickFor('personen', entityName(entity, entity['@id'] || '?')),
  }));
}

/** Works and undated stage roles -> chips. */
function workChipEls(works, performanceRoles) {
  const chips = [];
  for (const w of works) {
    const name = entityName(w, '?');
    const komponist = w.komponist || '';
    chips.push(buildRoleChip({
      prefix: w['@type'] === 'm3gim-ontology:FramingEvent' ? 'EREIGNIS' : 'WERK',
      value: komponist ? `${name} (${komponist})` : name,
      cluster: w['@type'] === 'm3gim-ontology:FramingEvent' ? 'ort' : 'rolle',
      xlsxSource: extractXlsxSource(w),
      wikidata: asWikidataId(w['@id']),
      qualityFlag: w['m3gim-ontology:dataQualityFlag'],
      tip: 'Als Filter setzen',
      onClick: chipClickFor('werke', name),
    }));
  }
  for (const r of performanceRoles) {
    const roleName = entityName(r, '?');
    chips.push(buildRoleChip({
      prefix: 'ROLLE',
      // voiceType (e.g. Mezzosopran) qualifies the role when the model carries
      // it; the data holds none yet, so this stays inert until then.
      value: r.voiceType ? `${roleName} (${r.voiceType})` : roleName,
      cluster: 'rolle',
      xlsxSource: extractXlsxSource(r),
      qualityFlag: r.qualityFlag,
    }));
  }
  return chips;
}

/**
 * Dated performances -> one chip each (date · work · stage roles). Undated
 * standalone stage roles stay in Werk & Repertoire (see partitionRecord); a
 * role never appears in both sections. Cluster `ort` places these in the dated-
 * event colour family, consistent with the Ort & Ereignis block.
 */
function performanceChipEls(performances) {
  return performances.map(p => {
    const parts = [formatDate(p.date) || p.date];
    if (p.work) parts.push(p.work);
    if (p.roles && p.roles.length) {
      parts.push(p.voiceType ? `${p.roles.join(', ')} (${p.voiceType})` : p.roles.join(', '));
    } else if (p.voiceType) {
      parts.push(p.voiceType);
    }
    return buildRoleChip({
      prefix: 'AUFFÜHRUNG',
      value: parts.join(' · '),
      cluster: 'ort',
      xlsxSource: p.xlsxSource,
      wikidata: p.workWikidata,
      qualityFlag: p.qualityFlag,
    });
  });
}

/** Date value of an annotation including its uncertainty qualifier. */
function dateText(annotation) {
  const value = annotation.date ? formatDate(annotation.date) : '';
  if (!value) return '';
  return annotation.qualifier ? `${annotation.qualifier} ${value}` : value;
}

/**
 * Placed annotations, placeless event datings and locations without annotation
 * -> chips. The role prefix is the display form straight from the data; a hand
 * map rewriting a date role into a place role has no subject in the merged
 * model, because dispatch, receipt and departure carry place and date under one
 * term.
 */
function eventChipEls(store, events, locations, eventDatings) {
  const chips = [];
  for (const ev of events) {
    const dateDisplay = dateText(ev) || '—';
    chips.push(buildRoleChip({
      prefix: ev.roleLabel || 'EREIGNIS',
      value: `${ev.place || '?'} · ${dateDisplay}`,
      cluster: 'ort',
      xlsxSource: ev.xlsxSource,
      wikidata: ev.placeWikidata,
      tip: ev.place ? 'Als Filter setzen' : null,
      onClick: ev.place ? chipClickFor('orte', ev.place) : null,
    }));
  }
  chips.push(...datingChipEls(store, eventDatings));
  // Locations not already covered by an annotation chip.
  const eventPlaces = new Set(events.map(e => (e.place || '').toLowerCase()));
  for (const loc of locations) {
    const name = entityName(loc, '?');
    if (eventPlaces.has(name.toLowerCase())) continue;
    chips.push(buildRoleChip({
      prefix: (roleLabel(store, loc.role) || 'ORT').toUpperCase(),
      value: name,
      cluster: 'ort',
      xlsxSource: extractXlsxSource(loc),
      wikidata: asWikidataId(loc['@id']),
      tip: 'Als Filter setzen',
      onClick: chipClickFor('orte', name),
    }));
  }
  return chips;
}

/** AgRelOn relations from store.agentRelations -> chips. */
function relationChipEls(relations) {
  return relations.map(r => {
    // A symmetric relation type says nothing about direction; the recorded
    // role of the counterpart does (E-149). Without it Absender and Adressat
    // would stand as two identically labelled chips.
    const base = AGRELON_LABELS[r.type] || (r.type || '').replace(/^agrelon:Has/, '');
    const label = r.objectRoleLabel ? `${base} · ${r.objectRoleLabel}` : base;
    const validity = r.validityBegin
      ? ` ${r.validityBegin}${r.validityEnd ? '–' + r.validityEnd : ''}`
      : '';
    return buildRoleChip({
      prefix: label,
      value: `${r.objectName || '?'}${validity}`,
      cluster: 'beziehung',
      xlsxSource: r.xlsxSource,
      wikidata: r.objectWikidata,
      tip: r.objectName ? 'Als Filter setzen' : null,
      onClick: r.objectName ? chipClickFor('personen', r.objectName) : null,
    });
  });
}

/** Finance entries from store.finances -> chips. */
function financeChipEls(entries) {
  const formatAmount = (n) => Number.isFinite(n) ? n.toLocaleString('de-DE') : '?';
  return entries.map(e => {
    const valueParts = [`${formatAmount(e.amount)}${e.currency ? ' ' + e.currency : ''}`];
    if (e.role) valueParts.push(`(${e.role})`);
    return buildRoleChip({
      prefix: e.field || 'FINANZ',
      value: valueParts.join(' '),
      xlsxSource: e.xlsxSource,
    });
  });
}

/**
 * Placeless datings -> date chips. A dating with scope `mentioned` is named IN
 * the document and is a property of the document, not of Malaniuk's biography,
 * which is why it hangs on the record and deliberately never on the Chronik
 * timeline; an 1872 date would otherwise sit on her life line.
 */
function datingChipEls(store, datings) {
  return datings.map(d => buildRoleChip({
    prefix: d.roleLabel || 'genannt',
    gloss: glossOf(store, d.roleId),
    value: dateText(d) || d.rawDate || '?',
    cluster: 'datum',
    xlsxSource: d.xlsxSource,
  }));
}

const PROV_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

// Neutral info circle, not an alarm sign, for the data-quality marker.
const QUALITY_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

/**
 * Role-prefix chip: uppercase mono prefix, serif value, optional provenance
 * pill and Wikidata badge. `cluster` selects the colour family via the CSS
 * class .chip--c-<cluster>; it is derived from the prefix when not given.
 *
 * @param {Object} opts
 * @param {string} opts.prefix - role label, uppercased internally
 * @param {string} opts.value - primary value, e.g. "Bayreuth · 1951-07-30"
 * @param {string} [opts.cluster]
 * @param {Object} [opts.xlsxSource] - {sheet, row, datenpunkt}
 * @param {string} [opts.wikidata] - wd:Qxxx for the badge
 * @param {string} [opts.tip]
 * @param {Function} [opts.onClick]
 * @param {boolean} [opts.compact] - compact variant for aggregate tables
 * @returns {HTMLElement}
 */
export function buildRoleChip({ prefix, value, cluster, xlsxSource, wikidata, tip, onClick, compact, qualityFlag, gloss }) {
  const prefixUpper = (prefix || '').toUpperCase();
  const cls = cluster || roleClusterFor(prefixUpper);
  const hasProv = xlsxSource && xlsxSource.row;
  const hasWikidata = wikidata && String(wikidata).startsWith('wd:');
  const hasQuality = Boolean(qualityFlag);
  // A chip tip only when no child carries its own, otherwise tooltips stack on
  // hovering the pill or the Wikidata badge (E-90).
  const childrenHaveTips = hasProv || hasWikidata || hasQuality;

  const chipProps = {
    className: `chip chip--role-pair chip--c-${cls}${onClick ? ' chip--clickable' : ''}${compact ? ' chip--compact' : ''}`,
  };
  // Gloss of the role term (E-143), suppressed when the chip has its own tip.
  if (gloss && !tip && !childrenHaveTips) chipProps.title = gloss;
  if (onClick) {
    chipProps.onClick = (e) => { e.stopPropagation(); onClick(e); };
  }
  if (tip && !childrenHaveTips) chipProps.dataset = { tip };

  const parts = [
    el('span', { className: 'chip-rolle' }, prefixUpper),
    el('span', { className: 'chip-wert' }, value || '—'),
  ];
  if (hasProv) {
    const provTipLines = [
      xlsxSource.sheet ? `Quelle: ${xlsxSource.sheet}` : 'Quelle',
      `Zeile ${xlsxSource.row}`,
    ];
    if (xlsxSource.datenpunkt) provTipLines.push(`Datenpunkt ${xlsxSource.datenpunkt}`);
    parts.push(el('span', {
      className: 'prov-pill',
      dataset: { tip: provTipLines.join('\n'), tipWrap: '' },
      'aria-label': 'Provenienz anzeigen',
    },
      el('span', { className: 'prov-pill__icon', html: PROV_ICON_SVG }),
      el('span', { className: 'prov-pill__label' }, `Z.${xlsxSource.row}`),
    ));
  }
  if (hasWikidata) {
    parts.push(el('a', {
      className: 'badge badge--wikidata',
      href: `https://www.wikidata.org/entity/${String(wikidata).replace('wd:', '')}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      dataset: { tip: `Bei Wikidata ansehen (${wikidata})` },
      html: WIKIDATA_ICON_SVG,
      onClick: (e) => e.stopPropagation(),
    }));
  }
  if (hasQuality) {
    // The flag value goes into the tooltip verbatim: no editorial reading, just
    // the modelled m3gim-ontology:dataQualityFlag made visible.
    parts.push(el('span', {
      className: 'quality-flag',
      dataset: { tip: `Datenqualität: ${qualityFlag}` },
      'aria-label': `Datenqualität: ${qualityFlag}`,
      html: QUALITY_ICON_SVG,
    }));
  }
  return el('span', chipProps, ...parts);
}
