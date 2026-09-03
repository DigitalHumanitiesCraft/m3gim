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

// Indizes grid -> sidebar filter facet (E-91). Grids without a facet
// equivalent (organisationen) still navigate into the index.
const GRID_TO_FACET = { personen: 'person', orte: 'location', werke: 'werk' };

/** Chip click: set the shared facet filter where one exists, else go to the index. */
export function chipClickFor(gridType, name) {
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
    tip: 'Als Filter setzen',
    onClick: chipClickFor('personen', entityName(entity, entity['@id'] || '?')),
  }));
}

/** Works and undated stage roles -> chips. */
export function workChipEls(works, performanceRoles) {
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
  for (const ev of events) {
    const dateDisplay = dateText(ev) || '—';
    chips.push(buildRoleChip({
      prefix: ev.roleLabel || 'EREIGNIS',
      value: `${ev.place || '?'} · ${dateDisplay}`,
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
