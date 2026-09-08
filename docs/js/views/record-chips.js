/**
 * Chip factories of the record detail.
 *
 * buildRoleChip is the one chip form of the application (role prefix, value,
 * Wikidata badge, data-quality marker); the per-section
 * factories turn the parts of partitionRecord into finished chip elements.
 * record-detail.js, korb.js, karte.js and netzwerk.js consume them.
 */

import { el } from '../utils/dom.js';
import {
  entityName, asWikidataId, roleLabel, glossOf, roleIdOf,
} from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { applyArchivFilter } from '../ui/router.js';
import { REGISTER_ENTITY_TYPE, entityFacet } from '../data/entity-types.js';
import { WIKIDATA_ICON_SVG, AGRELON_LABELS, roleClusterFor } from '../data/constants.js';
import {
  groupRolesByWork, groupPerformanceDatings, sortDatingsByDate,
  nodeTipLines, qualityTipLines, workComposer,
} from './record-detail-data.js';

/** Set the shared facet associated with a register. */
function chipClickFor(gridType, name) {
  return facetClickFor(REGISTER_ENTITY_TYPE[gridType], name);
}

function facetClickFor(facet, name) {
  return facet && name ? () => applyArchivFilter(facet, name) : null;
}

/** Agent subnodes retain their recorded entity type when filtering. */
export function agentChipEls(store, entities) {
  return entities.map(entity => buildRoleChip({
    prefix: roleLabel(store, entity.role) || 'AGENT',
    gloss: glossOf(store, roleIdOf(entity.role)),
    value: entityName(entity, entity['@id'] || '?'),
    wikidata: asWikidataId(entity),
    qualityFlag: entity['m3gim-ontology:dataQualityFlag'],
    details: nodeTipLines(entity),
    tip: entityFacet(entity) ? 'Als Filter setzen' : null,
    action: 'filter',
    onClick: facetClickFor(entityFacet(entity), entityName(entity, entity['@id'] || '?')),
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
    wikidata: asWikidataId(w),
    qualityFlag: w['m3gim-ontology:dataQualityFlag'],
    details: nodeTipLines(w),
    tip: entityFacet(w) ? 'Als Filter setzen' : null,
    action: 'filter',
    onClick: facetClickFor(entityFacet(w), name),
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
      prefix: 'ANGABE',
      value: parts.join(' · '),
      cluster: 'datum',
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
      wikidata: ev.placeWikidata,
      qualityFlag: ev.qualityFlag,
      note: ev.description,
      details: nodeTipLines(placeNodeOf(ev)),
      tip: ev.place ? 'Als Filter setzen' : null,
      action: 'filter',
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
      wikidata: asWikidataId(loc),
      qualityFlag: loc['m3gim-ontology:dataQualityFlag'],
      details: nodeTipLines(loc),
      tip: 'Als Filter setzen',
      action: 'filter',
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
 * row. A date with a quality caveat carries that note in its own tooltip.
 */
function seasonChipEl(store, { season, dates }) {
  const head = buildRoleChip({
    prefix: season.roleLabel || 'SPIELZEIT',
    gloss: glossOf(store, season.roleId),
    value: dateText(season) || season.rawDate || '?',
    cluster: 'ort',
    qualityFlag: season.qualityFlag,
    note: season.description,
  });
  const dateEls = [];
  dates.forEach((d, i) => {
    if (i > 0) dateEls.push(' · ');
    // The date row is one chip, so a caveat on a single Auffuehrung has no own
    // marker and joins that date's tooltip.
    const tip = qualityTipLines(d.qualityFlag, d.description).join('\n');
    const props = { className: `chip-date${tip ? ' chip-date--annotated' : ''}` };
    if (tip) {
      props.tabindex = '0';
      props['aria-label'] = [dateText(d) || d.rawDate || '?', tip].join('. ');
      props.dataset = { tip, tipWrap: '' };
    }
    dateEls.push(el('span', props, dateText(d) || d.rawDate || '?'));
  });
  const row = el('span', { className: 'chip chip--role-pair chip--c-ort' },
    el('span', { className: 'chip-rolle' }, (dates[0].roleLabel || 'AUFFÜHRUNG').toUpperCase()),
    el('span', { className: 'chip-wert chip-dates' }, ...dateEls),
  );
  return el('span', { className: 'chip-group' }, head, row);
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
      wikidata: r.objectWikidata,
      tip: r.objectName ? 'Als Filter setzen' : null,
      action: 'filter',
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
    });
  });
}

export function detailChipEls(entries) {
  return entries.map(entry => buildRoleChip({
    prefix: entry.field || 'Angabe ohne Typ',
    value: entry.value === '' || entry.value == null ? 'Kein Wert erfasst' : String(entry.value),
    note: [entry.role, entry.description].filter(Boolean).join(' · ') || null,
    details: entry.xlsxSource ? [`Quelle: ${entry.xlsxSource.sheet} Zeile ${entry.xlsxSource.row}`] : [],
  }));
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
    qualityFlag: d.qualityFlag,
    note: d.description,
  }));
}

// Neutral info circle, not an alarm sign, for the data-quality marker. Exported
// so the record detail draws the same mark; the legend arises from sameness.
export const QUALITY_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

/**
 * Role-prefix chip: uppercase mono prefix, serif value and optional Wikidata
 * badge. `cluster` selects the colour family via the CSS
 * class .chip--c-<cluster>; it is derived from the prefix when not given.
 *
 * @param {Object} opts
 * @param {string} opts.prefix - role label, uppercased internally
 * @param {string} opts.value - primary value, e.g. "Bayreuth · 1951-07-30"
 * @param {string} [opts.cluster]
 * @param {string} [opts.wikidata] - wd:Qxxx for the badge
 * @param {string} [opts.tip]
 * @param {Function} [opts.onClick]
 * @param {'filter'|'navigate'} [opts.action] - action symbol, independent of the authority link
 * @param {boolean} [opts.compact] - compact variant for aggregate tables
 * @param {string[]} [opts.details] - modelled fields the chip does not print
 * @param {string} [opts.note] - rico:generalDescription of the datapoint
 * @returns {HTMLElement}
 */
export function buildRoleChip({ prefix, value, cluster, wikidata, tip, onClick, action = 'navigate', compact, qualityFlag, gloss, details, note }) {
  const prefixUpper = (prefix || '').toUpperCase();
  const cls = cluster || roleClusterFor(prefixUpper);
  const hasWikidata = wikidata && String(wikidata).startsWith('wd:');
  const qualityLines = qualityTipLines(qualityFlag, note);
  const hasQuality = qualityLines.length > 0;
  // The fields of the datapoint hang on the value. The role gloss (E-143)
  // merges into that text instead of being dropped.
  const detailTip = [gloss, ...(details || [])].filter(Boolean).join('\n');
  // A chip tip only when no child carries its own, otherwise tooltips stack on
  // hovering the quality marker or the Wikidata badge.
  const childrenHaveTips = hasWikidata || hasQuality || Boolean(detailTip);

  const chipProps = {
    className: `chip chip--role-pair chip--c-${cls}${onClick ? ' chip--clickable' : ''}${compact ? ' chip--compact' : ''}`,
  };
  if (tip && !childrenHaveTips && !onClick) chipProps.dataset = { tip };

  const valueProps = { className: 'chip-wert' };
  if (detailTip && !onClick) valueProps.dataset = { tip: detailTip, tipWrap: '' };
  const label = [
    el('span', { className: 'chip-rolle' }, prefixUpper),
    el('span', valueProps, value || '—'),
  ];
  const parts = onClick ? [el('button', {
    type: 'button', className: 'chip-action',
    'aria-label': `${prefixUpper}: ${typeof value === 'string' ? value : value?.textContent || '—'} ${action === 'filter' ? 'als Filter setzen' : 'öffnen'}`,
    dataset: { action, tip: [tip, detailTip].filter(Boolean).join('\n'), tipWrap: '' },
    onClick: event => { event.stopPropagation(); onClick(event); },
  }, ...label, el('span', {
    className: 'chip-action__icon', 'aria-hidden': 'true',
    html: action === 'filter'
      ? '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h12L9 8v5l-2-1V8Z"/></svg>'
      : '→',
  }))] : label;
  if (hasWikidata) {
    parts.push(el('a', {
      className: 'badge badge--wikidata',
      href: `https://www.wikidata.org/entity/${String(wikidata).replace('wd:', '')}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `Wikidata ${String(wikidata).replace('wd:', '')} in neuem Tab öffnen`,
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
