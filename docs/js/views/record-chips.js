/**
 * Chip factories of the record detail.
 *
 * buildRoleChip is the one chip form of the application (role prefix, value,
 * provenance pill, Wikidata badge, data-quality marker); the per-section
 * factories turn the parts of partitionRecord into finished chip elements.
 * record-detail.js, korb.js, karte.js and netzwerk.js consume them.
 */

import { el } from '../utils/dom.js';
import {
  entityName, asWikidataId, roleLabel, glossOf, roleIdOf,
} from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { navigateToIndex, applyArchivFilter } from '../ui/router.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { WIKIDATA_ICON_SVG, AGRELON_LABELS, roleClusterFor } from '../data/constants.js';
import {
  groupRolesByWork, groupPerformanceDatings, sortDatingsByDate,
  nodeTipLines, qualityTipLines, workComposer,
} from './record-detail-data.js';

// Indizes grid -> sidebar filter facet (E-91). Grids without a facet
// equivalent (organisationen) still navigate into the index.
const GRID_TO_FACET = { personen: 'person', orte: 'location', werke: 'werk' };

/** Chip click: set the shared facet filter where one exists, else go to the index. */
function chipClickFor(gridType, name) {
  if (!gridType || !name) return null;
  const facet = GRID_TO_FACET[gridType];
  if (facet) return () => applyArchivFilter(facet, name);
  return () => navigateToIndex(gridType, name);
}

/** Agent subnodes -> role-prefix chips, clickable into the person facet. */
export function agentChipEls(store, entities) {
  return entities.map(entity => buildRoleChip({
    prefix: roleLabel(store, entity.role) || 'AGENT',
    gloss: glossOf(store, roleIdOf(entity.role)),
    value: entityName(entity, entity['@id'] || '?'),
    xlsxSource: extractXlsxSource(entity),
    wikidata: asWikidataId(entity['@id']),
    qualityFlag: entity['m3gim-ontology:dataQualityFlag'],
    details: nodeTipLines(entity),
    tip: 'Als Filter setzen',
    onClick: chipClickFor('personen', entityName(entity, entity['@id'] || '?')),
  }));
}

/**
 * Works and Buehnenrollen -> chips. A role hangs under its work as a sub-line
 * of the work chip where the data resolves the link (groupRolesByWork); a role
 * without a resolvable work stays a free Rolle chip (Projektleitung,
 * 2026-09-04).
 */
export function workChipEls(works, performanceRoles, store) {
  const { groups, looseRoles } = groupRolesByWork(works, performanceRoles);
  const chips = [];
  for (const { work, roles } of groups) {
    const chip = workChipEl(work, store);
    if (roles.length === 0) { chips.push(chip); continue; }
    chips.push(el('span', { className: 'chip-group' },
      chip,
      el('span', { className: 'chip-group__sub' }, ...roles.map(stageRoleChipEl)),
    ));
  }
  chips.push(...looseRoles.map(stageRoleChipEl));
  return chips;
}

function workChipEl(w, store) {
  const name = entityName(w, '?');
  const komponist = workComposer(w);
  const framing = w['@type'] === 'm3gim-ontology:FramingEvent';
  // The work carries its own role (premiere, repertoire, ...) like every other
  // chip of the detail; the generic term stands in only where the data has
  // none (design rule 14).
  const role = roleLabel(store, w.role);
  return buildRoleChip({
    prefix: role || (framing ? 'EREIGNIS' : 'WERK'),
    gloss: glossOf(store, roleIdOf(w.role)),
    value: komponist ? `${name} (${komponist})` : name,
    cluster: framing ? 'ort' : 'rolle',
    xlsxSource: extractXlsxSource(w),
    wikidata: asWikidataId(w['@id']),
    qualityFlag: w['m3gim-ontology:dataQualityFlag'],
    details: nodeTipLines(w),
    tip: 'Als Filter setzen',
    onClick: chipClickFor('werke', name),
  });
}

function stageRoleChipEl(r) {
  const roleName = entityName(r, '?');
  // voiceType (e.g. Mezzosopran) qualifies the role when the model carries it;
  // the performer is named wherever the Besetzung is recorded.
  const parts = [r.voiceType ? `${roleName} (${r.voiceType})` : roleName];
  if (r.performers && r.performers.length) parts.push(r.performers.join(', '));
  return buildRoleChip({
    prefix: 'ROLLE',
    value: parts.join(' · '),
    cluster: 'rolle',
    xlsxSource: r.xlsxSource,
    qualityFlag: r.qualityFlag,
    note: r.description,
  });
}

/**
 * Dated performances -> one chip each (date · work · stage roles). Undated
 * standalone stage roles stay in Werk & Repertoire (see partitionRecord); a
 * role never appears in both sections. Cluster `ort` places these in the dated-
 * event colour family, consistent with the Ort & Ereignis block.
 */
export function performanceChipEls(performances) {
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
      note: p.description,
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
export function eventChipEls(store, events, locations, eventDatings) {
  const chips = [];
  for (const ev of sortDatingsByDate(events)) {
    const dateDisplay = dateText(ev) || '—';
    chips.push(buildRoleChip({
      prefix: ev.roleLabel || 'EREIGNIS',
      gloss: glossOf(store, ev.roleId),
      value: `${ev.place || '?'} · ${dateDisplay}`,
      cluster: 'ort',
      xlsxSource: ev.xlsxSource,
      wikidata: ev.placeWikidata,
      qualityFlag: ev.qualityFlag,
      note: ev.description,
      details: nodeTipLines(placeNodeOf(ev)),
      tip: ev.place ? 'Als Filter setzen' : null,
      onClick: ev.place ? chipClickFor('orte', ev.place) : null,
    }));
  }
  // Auftritt view: the Auffuehrungen of a Spielzeit stand as a date list under
  // their Spielzeit instead of as a chip each (Projektleitung, 2026-09-04).
  const { seasons, rest } = groupPerformanceDatings(eventDatings);
  for (const group of seasons) chips.push(seasonChipEl(store, group));
  chips.push(...datingChipEls(store, rest));
  // Locations not already covered by an annotation chip.
  const eventPlaces = new Set(events.map(e => (e.place || '').toLowerCase()));
  for (const loc of locations) {
    const name = entityName(loc, '?');
    if (eventPlaces.has(name.toLowerCase())) continue;
    chips.push(buildRoleChip({
      prefix: (roleLabel(store, loc.role) || 'ORT').toUpperCase(),
      gloss: glossOf(store, roleIdOf(loc.role)),
      value: name,
      cluster: 'ort',
      xlsxSource: extractXlsxSource(loc),
      wikidata: asWikidataId(loc['@id']),
      qualityFlag: loc['m3gim-ontology:dataQualityFlag'],
      details: nodeTipLines(loc),
      tip: 'Als Filter setzen',
      onClick: chipClickFor('orte', name),
    }));
  }
  return chips;
}

/**
 * The place of an annotation back in node shape. The loader flattens it into
 * the annotation entry, and nodeTipLines reads the modelled field names.
 */
function placeNodeOf(ev) {
  return {
    '@id': ev.placeWikidata,
    'm3gim-ontology:country': ev.placeCountry,
    'geo:lat': ev.placeLat,
    'geo:long': ev.placeLon,
  };
}

/**
 * One Spielzeit as a head line with its Auffuehrungsdaten as a compact date
 * row. Each date carries its Quellzeile in its own tooltip, so the row stays
 * one chip and the Beleg is not lost (E-90: one tooltip per hover).
 */
function seasonChipEl(store, { season, dates }) {
  const head = buildRoleChip({
    prefix: season.roleLabel || 'SPIELZEIT',
    gloss: glossOf(store, season.roleId),
    value: dateText(season) || season.rawDate || '?',
    cluster: 'ort',
    xlsxSource: season.xlsxSource,
    qualityFlag: season.qualityFlag,
    note: season.description,
  });
  const dateEls = [];
  dates.forEach((d, i) => {
    if (i > 0) dateEls.push(' · ');
    // The date row is one chip, so a caveat on a single Auffuehrung has no own
    // marker and joins that date's tooltip.
    const tip = [provTipText(d.xlsxSource), ...qualityTipLines(d.qualityFlag, d.description)]
      .join('\n');
    dateEls.push(el('span', {
      className: 'chip-date',
      dataset: { tip, tipWrap: '' },
    }, dateText(d) || d.rawDate || '?'));
  });
  const row = el('span', { className: 'chip chip--role-pair chip--c-ort' },
    el('span', { className: 'chip-rolle' }, (dates[0].roleLabel || 'AUFFÜHRUNG').toUpperCase()),
    el('span', { className: 'chip-wert chip-dates' }, ...dateEls),
  );
  return el('span', { className: 'chip-group' }, head, row);
}

/** Sheet, Zeile and Datenpunkt of an xlsxSource as tooltip text. */
function provTipText(xlsxSource) {
  if (!xlsxSource || !xlsxSource.row) return 'Quelle unbekannt';
  const lines = [
    xlsxSource.sheet ? `Quelle: ${xlsxSource.sheet}` : 'Quelle',
    `Zeile ${xlsxSource.row}`,
  ];
  if (xlsxSource.datenpunkt) lines.push(`Datenpunkt ${xlsxSource.datenpunkt}`);
  return lines.join('\n');
}

/** The same values as the tooltip, on one line, for the pill's aria-label. */
function provLabelText(xlsxSource) {
  const parts = [];
  if (xlsxSource.sheet) parts.push(String(xlsxSource.sheet));
  parts.push(`Zeile ${xlsxSource.row}`);
  if (xlsxSource.datenpunkt) parts.push(`Datenpunkt ${xlsxSource.datenpunkt}`);
  return `Provenienz: ${parts.join(', ')}`;
}

/** AgRelOn relations from store.agentRelations -> chips. */
export function relationChipEls(relations) {
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
export function financeChipEls(entries) {
  const formatAmount = (n) => Number.isFinite(n) ? n.toLocaleString('de-DE') : '?';
  return entries.map(e => {
    const valueParts = [`${formatAmount(e.amount)}${e.currency ? ' ' + e.currency : ''}`];
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
export function datingChipEls(store, datings) {
  return datings.map(d => buildRoleChip({
    prefix: d.roleLabel || 'genannt',
    gloss: glossOf(store, d.roleId),
    value: dateText(d) || d.rawDate || '?',
    cluster: 'datum',
    xlsxSource: d.xlsxSource,
    qualityFlag: d.qualityFlag,
    note: d.description,
  }));
}

const PROV_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

// Neutral info circle, not an alarm sign, for the data-quality marker. Exported
// so the record detail draws the same mark; the legend arises from sameness.
export const QUALITY_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

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
 * @param {string[]} [opts.details] - modelled fields the chip does not print
 * @param {string} [opts.note] - rico:generalDescription of the datapoint
 * @returns {HTMLElement}
 */
export function buildRoleChip({ prefix, value, cluster, xlsxSource, wikidata, tip, onClick, compact, qualityFlag, gloss, details, note }) {
  const prefixUpper = (prefix || '').toUpperCase();
  const cls = cluster || roleClusterFor(prefixUpper);
  const hasProv = xlsxSource && xlsxSource.row;
  const hasWikidata = wikidata && String(wikidata).startsWith('wd:');
  const qualityLines = qualityTipLines(qualityFlag, note);
  const hasQuality = qualityLines.length > 0;
  // The fields of the datapoint hang on the value, not on the chip: the pill,
  // the badge and the marker are its siblings, so hovering any of them still
  // shows exactly one tooltip (E-90). The role gloss (E-143) merges into that
  // text instead of being dropped.
  const detailTip = [gloss, ...(details || [])].filter(Boolean).join('\n');
  // A chip tip only when no child carries its own, otherwise tooltips stack on
  // hovering the pill or the Wikidata badge (E-90).
  const childrenHaveTips = hasProv || hasWikidata || hasQuality || Boolean(detailTip);

  const chipProps = {
    className: `chip chip--role-pair chip--c-${cls}${onClick ? ' chip--clickable' : ''}${compact ? ' chip--compact' : ''}`,
  };
  // Gloss of the role term (E-143), suppressed when the chip has its own tip.
  if (gloss && !tip && !childrenHaveTips) chipProps.dataset = { tip: gloss, tipWrap: '' };
  if (onClick) {
    chipProps.onClick = (e) => { e.stopPropagation(); onClick(e); };
    // A clickable chip is an operable control, so it takes the keyboard the
    // same way every other row-shaped control of the application does.
    chipProps.tabindex = '0';
    chipProps.role = 'button';
    chipProps.onKeyDown = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    };
  }
  if (tip && !childrenHaveTips) chipProps.dataset = { tip };

  const valueProps = { className: 'chip-wert' };
  if (detailTip) valueProps.dataset = { tip: detailTip, tipWrap: '' };
  const parts = [
    el('span', { className: 'chip-rolle' }, prefixUpper),
    el('span', valueProps, value || '—'),
  ];
  if (hasProv) {
    parts.push(el('span', {
      className: 'prov-pill',
      dataset: { tip: provTipText(xlsxSource), tipWrap: '' },
      // The pill names the Quellzeile and does nothing else; the jump into
      // sheet and row is still an open decision. Without stopping the bubble
      // the click reached the chip's filter action and closed the detail
      // (Projektleitung, 2026-09-04).
      'aria-label': provLabelText(xlsxSource),
      onClick: (e) => e.stopPropagation(),
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
    // Flag and Erschliessungsanmerkung go into the tooltip verbatim: no
    // editorial reading, just what the model records made visible.
    parts.push(el('span', {
      className: 'quality-flag',
      dataset: { tip: qualityLines.join('\n'), tipWrap: '' },
      'aria-label': qualityLines.join(', '),
      html: QUALITY_ICON_SVG,
    }));
  }
  return el('span', chipProps, ...parts);
}
