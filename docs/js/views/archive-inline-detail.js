/**
 * M³GIM Archiv Inline Detail — Shared component for Bestand and Chronik views.
 * Renders full record metadata inline (not in a sidebar).
 *
 * buildRecordBlocks() ist die gemeinsame Quelle der funktionalen Bloecke
 * (Produktion / Mitwirkende / Werk & Repertoire / Ort & Ereignis / Erwaehnt /
 * Weitere / Beziehungen / Finanzen). Sowohl dieses Inline-Detail als auch der
 * Wissenskorb (views/basket.js) konsumieren sie -- Layout und CSS-Klassen
 * bestimmt der jeweilige Consumer, die Chip-Logik liegt nur hier.
 */

import { el } from '../utils/dom.js';
import { formatSignatur, formatDocType, ensureArray, entityName, asWikidataId } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { navigateToIndex, applyArchivFilter } from '../ui/router.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { toggleKorb, isInKorb } from '../ui/basket.js';
import { WIKIDATA_ICON_SVG, AGRELON_LABELS, roleClusterFor, sectionForRole, steChipPrefix, formatLanguage, bookmarkIcon } from '../data/constants.js';

// Mapping Indizes-Grid -> Toolbar-Filter-Facet (E-91). Grids ohne
// Toolbar-Equivalent (organisationen) navigieren weiterhin in den Index.
const GRID_TO_FACET = { personen: 'person', orte: 'location', werke: 'werk' };

// Agents, die bereits ueber eine AgRelOn-Beziehung sichtbar sind, werden aus
// dem Ursprungs-Bucket unterdrueckt (keine Doppelanzeige desselben Agenten in
// zwei Sektionen). Betrifft nur Rollen mit AgRelOn-Aequivalent.
const AGRELON_ROLES = new Set([
  'absender', 'empfänger', 'empfaenger', 'adressat',
  'arbeitgeber', 'agent', 'vermittler', 'auftraggeber',
]);

/**
 * Dispatch fuer Chip-Klick: wenn ein Facet-Mapping existiert, setzt den
 * Filter in der aktiven Bestand/Chronik-Toolbar; sonst Fallback in den
 * passenden Index.
 */
export function chipClickFor(gridType, name) {
  if (!gridType || !name) return null;
  const facet = GRID_TO_FACET[gridType];
  if (facet) return () => applyArchivFilter(facet, name);
  return () => navigateToIndex(gridType, name);
}

/** Korb-Button-Markup im Inline-Detail (Icon + Label). */
function korbBtnHtml(inKorb) {
  return bookmarkIcon(14, inKorb) + (inKorb ? ' Im Korb' : ' Zum Korb');
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
  // Konvolute (rico:RecordSet) bekommen KEIN Inline-Detail mehr. Ihre
  // Metadaten werden direkt in der Bestand-Tabelle als Chips angezeigt
  // (Typ-Mix, Status-Mix). Click auf Konvolut-Zeile = Auf/Zuklappen.

  const wrapper = el('div', { className: 'inline-detail' });

  // Header
  const recordId = record['@id'];
  const inKorb = isInKorb(recordId);
  const header = el('div', { className: 'inline-detail__header' },
    el('span', { className: 'inline-detail__signatur' }, formatSignatur(record['rico:identifier'])),
    el('h4', { className: 'inline-detail__title' }, record['rico:title'] || '(ohne Titel)'),
    el('button', {
      className: `inline-detail__korb-btn ${inKorb ? 'inline-detail__korb-btn--active' : ''}`,
      title: inKorb ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzufügen',
      onClick: (e) => {
        e.stopPropagation();
        toggleKorb(recordId);
        // Update button state
        const btn = e.currentTarget;
        const nowIn = isInKorb(recordId);
        btn.classList.toggle('inline-detail__korb-btn--active', nowIn);
        btn.title = nowIn ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzufügen';
        btn.innerHTML = korbBtnHtml(nowIn);
      },
      html: korbBtnHtml(inKorb),
    }),
    el('button', {
      className: 'inline-detail__close',
      title: 'Schließen',
      onClick: (e) => {
        e.stopPropagation();
        if (onClose) onClose();
      },
      html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    })
  );
  wrapper.appendChild(header);

  // Funktionale Bloecke einmal bauen, dann auf zwei Spalten verteilen.
  const blocks = buildRecordBlocks(record, store);
  const byKey = new Map(blocks.map(b => [b.key, b]));
  const renderBlock = (key, col) => {
    const b = byKey.get(key);
    if (!b) return;
    const chipsEl = el('div', { className: 'inline-detail__chips' }, ...b.chips);
    col.appendChild(renderSection(`${b.title} (${b.count})`, chipsEl));
  };

  // Body — 2-column grid
  const body = el('div', { className: 'inline-detail__body' });

  // Left column: Metadaten + Finanzen + Beziehungen
  const leftCol = el('div', { className: 'inline-detail__col' });

  const meta = [];
  const docType = formatDocType(record);
  if (docType) meta.push(['Typ', docType]);
  const date = formatDate(record['rico:date']);
  if (date) meta.push(['Datum', date]);
  const lang = record['rico:hasOrHadLanguage'];
  if (lang) meta.push(['Sprache', formatLanguage(lang)]);
  const extent = record['rico:hasExtent'];
  if (extent) meta.push(['Umfang', typeof extent === 'string' ? extent : String(extent)]);
  const status = record['m3gim:bearbeitungsstand'];
  if (status) meta.push(['Status', status]);

  if (meta.length) {
    leftCol.appendChild(renderSection('Metadaten', renderMetaGrid(meta)));
  }
  renderBlock('finanzen', leftCol);
  renderBlock('beziehungen', leftCol);

  // Right column: funktionale Bloecke (Session 34).
  const rightCol = el('div', { className: 'inline-detail__col' });
  renderBlock('produktion', rightCol);
  renderBlock('mitwirkende', rightCol);
  renderBlock('werk', rightCol);
  renderBlock('ort', rightCol);
  renderBlock('erwaehnt', rightCol);
  renderBlock('weitere', rightCol);

  body.appendChild(leftCol);
  if (rightCol.childNodes.length > 0) {
    body.appendChild(rightCol);
  } else {
    body.appendChild(el('div', { className: 'inline-detail__col inline-detail__empty-state' },
      el('p', {}, 'Noch nicht erschlossen'),
      el('p', { className: 'inline-detail__empty-hint' }, 'Annotationen werden im Rahmen der Erschließung ergänzt.')
    ));
  }
  wrapper.appendChild(body);

  // Konvolut-Info
  const konvolutId = store.childToKonvolut?.get(record['@id']);
  if (konvolutId) {
    const konvolut = store.konvolute.get(konvolutId);
    if (konvolut) {
      const konvSig = formatSignatur(konvolut['rico:identifier']);
      const konvMeta = store.konvolutMeta?.get(konvolutId);
      const konvTitle = konvMeta?.title || '';
      wrapper.appendChild(el('div', {
        className: 'inline-detail__konvolut',
        dataset: konvTitle ? { tip: `${konvSig}: ${konvTitle}` } : {},
      },
        `Teil von Konvolut ${konvSig}`
      ));
    }
  }

  return wrapper;
}

function renderSection(title, content) {
  return el('div', { className: 'inline-detail__section' },
    el('div', { className: 'inline-detail__section-title' }, title),
    content
  );
}

function renderMetaGrid(pairs) {
  const grid = el('div', { className: 'inline-detail__meta' });
  for (const [label, value] of pairs) {
    grid.appendChild(el('span', { className: 'inline-detail__meta-label' }, label));
    grid.appendChild(el('span', {}, String(value)));
  }
  return grid;
}

// =========================================================================
// Geteilte Block-Erzeugung (Inline-Detail + Wissenskorb)
// =========================================================================

/**
 * Partitioniert einen Record in seine funktionalen Bestandteile (dom-frei,
 * daher unit-testbar): Agent-Buckets (produktion/mitwirkende/erwaehnt/weitere)
 * mit AgRelOn-Dedup, plus die rohen Werk-/Event-/Orts-/Beziehungs-/Finanz-
 * Listen. Erzeugt KEINE DOM-Knoten -- das tut erst buildRecordBlocks.
 */
export function partitionRecord(record, store) {
  const recordId = record['@id'];
  const allAgents = ensureArray(record['m3gim:hasAssociatedAgent']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const works = subjects.filter(s => s['@type'] === 'm3gim:MusicalWork' || s['@type'] === 'm3gim:PerformanceEvent');
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  // Bühnenrollen aus den referenzierten m3gim:Performance-Entitäten auflösen
  // (E-96, löst das frühere Attribut hasPerformanceRole ab).
  const performanceRoles = [];
  for (const ref of ensureArray(record['m3gim:hasPerformance'])) {
    const perf = store.performances?.get(ref && ref['@id']);
    if (!perf) continue;
    const srId = perf['m3gim:hasStageRole'] && perf['m3gim:hasStageRole']['@id'];
    const name = srId && store.stageRoles?.get(srId);
    if (name) performanceRoles.push({ name });
  }
  const locations = ensureArray(record['rico:hasOrHadLocation']);
  const eventIds = store.recordToEvents?.get(recordId) || [];
  const events = eventIds.map(eid => store.mobilityEvents.get(eid)).filter(Boolean);
  const agentRelations = store.agentRelations?.get(recordId) || [];
  const finances = store.finances?.get(recordId) || [];

  // Agents, die schon ueber eine AgRelOn-Beziehung sichtbar sind, unterdruecken.
  const agrelonAgentKeys = new Set();
  for (const rel of agentRelations) {
    const key = rel.objectWikidata || (rel.objectName || '').toLowerCase();
    if (key) agrelonAgentKeys.add(key);
  }

  const bucket = { produktion: [], mitwirkende: [], erwaehnt: [], weitere: [] };
  for (const a of allAgents) {
    const roleKey = (a.role || '').toLowerCase();
    if (AGRELON_ROLES.has(roleKey)) {
      const agentKey = a['@id'] || (a.name || '').toLowerCase();
      if (agentKey && agrelonAgentKeys.has(agentKey)) continue; // schon in Beziehungen
    }
    const section = sectionForRole(a.role) || 'weitere';
    bucket[section].push(a);
  }
  for (const p of mentionedPersons) bucket.erwaehnt.push(p);

  return { bucket, works, performanceRoles, events, locations, agentRelations, finances };
}

/**
 * Baut aus der Partition geordnete, nicht-leere Bloecke der Form
 * { key, title, count, chips }, wobei chips fertige Chip-Elemente sind. Der
 * Consumer (Inline-Detail / Korb) waehlt Container-Klasse, Sektions-Markup und
 * Titelformat. Reihenfolge: produktion, mitwirkende, werk, ort, erwaehnt,
 * weitere, beziehungen, finanzen.
 */
export function buildRecordBlocks(record, store) {
  const { bucket, works, performanceRoles, events, locations, agentRelations, finances } = partitionRecord(record, store);

  const blocks = [];
  const push = (key, title, chips) => {
    if (chips.length) blocks.push({ key, title, count: chips.length, chips });
  };
  push('produktion', 'Produktion', agentChipEls(bucket.produktion));
  push('mitwirkende', 'Mitwirkende', agentChipEls(bucket.mitwirkende));
  push('werk', 'Werk & Repertoire', workChipEls(works, performanceRoles));
  push('ort', 'Ort & Ereignis', eventChipEls(events, locations));
  push('erwaehnt', 'Erwähnt', agentChipEls(bucket.erwaehnt));
  push('weitere', 'Weitere', agentChipEls(bucket.weitere));
  push('beziehungen', 'Beziehungen', relationChipEls(agentRelations));
  push('finanzen', 'Finanzen', financeChipEls(finances));
  return blocks;
}

/** Agent-Subobjekte -> Rollen-Prefix-Chips (Personen-Facette). */
function agentChipEls(entities) {
  return entities.map(entity => buildRoleChip({
    prefix: entity.role || 'AGENT',
    value: entityName(entity, entity['@id'] || '?'),
    xlsxSource: extractXlsxSource(entity),
    wikidata: asWikidataId(entity['@id']),
    tip: 'Als Filter setzen',
    onClick: chipClickFor('personen', entityName(entity, entity['@id'] || '?')),
  }));
}

/** Werke + Buehnenrollen -> Chips. */
function workChipEls(works, performanceRoles) {
  const chips = [];
  for (const w of works) {
    const name = entityName(w, '?');
    const komponist = w.komponist || '';
    chips.push(buildRoleChip({
      prefix: w['@type'] === 'm3gim:PerformanceEvent' ? 'EREIGNIS' : 'WERK',
      value: komponist ? `${name} (${komponist})` : name,
      cluster: w['@type'] === 'm3gim:PerformanceEvent' ? 'ort' : 'rolle',
      xlsxSource: extractXlsxSource(w),
      wikidata: asWikidataId(w['@id']),
      tip: 'Als Filter setzen',
      onClick: chipClickFor('werke', name),
    }));
  }
  for (const r of performanceRoles) {
    chips.push(buildRoleChip({
      prefix: 'ROLLE',
      value: entityName(r, '?'),
      cluster: 'rolle',
      xlsxSource: extractXlsxSource(r),
    }));
  }
  return chips;
}

/** SpatiotemporalEvents (mit Datum) + Places ohne Event-Verknuepfung -> Chips. */
function eventChipEls(events, locations) {
  const chips = [];
  // Events zuerst — tragen mehr Kontext (Ort + Datum).
  for (const ev of events) {
    const dateDisplay = ev.date ? formatDate(ev.date) : '—';
    chips.push(buildRoleChip({
      prefix: steChipPrefix(ev.role),
      value: `${ev.place || '?'} · ${dateDisplay}`,
      cluster: 'ort',  // STE-Chips immer ort-Farbfamilie
      xlsxSource: ev.xlsxSource,
      wikidata: ev.placeWikidata,
      tip: ev.place ? 'Als Filter setzen' : null,
      onClick: ev.place ? chipClickFor('orte', ev.place) : null,
    }));
  }
  // Orte, die nicht schon ueber ein STE dargestellt sind.
  const eventPlaces = new Set(events.map(e => (e.place || '').toLowerCase()));
  for (const loc of locations) {
    const name = entityName(loc, '?');
    if (eventPlaces.has(name.toLowerCase())) continue;
    chips.push(buildRoleChip({
      prefix: (loc.role || 'ORT').toUpperCase(),
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

/** AgRelOn-Beziehungen (aus store.agentRelations) -> Chips. */
function relationChipEls(relations) {
  return relations.map(r => {
    const label = AGRELON_LABELS[r.type] || (r.type || '').replace(/^agrelon:Has/, '');
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

/** Finanz-Eintraege (aus store.finances) -> Chips. */
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
 * Chip im Mockup-Stil: Rolle-Prefix (Uppercase, Mono) + Wert (Serif) +
 * optionale Provenance-Pille + optionales Wikidata-Badge. Cluster steuert
 * die Farbfamilie ueber eine CSS-Klasse .chip--c-<cluster>.
 *
 * @param {Object} opts
 * @param {string} opts.prefix     - Rolle-Label (wird intern zu Uppercase).
 * @param {string} opts.value      - Primaerwert (z.B. "Bayreuth · 1951-07-30").
 * @param {string} [opts.cluster]  - Cluster-Key; wird aus prefix abgeleitet,
 *                                   wenn nicht gesetzt.
 * @param {Object} [opts.xlsxSource] - {sheet, row, datenpunkt}.
 * @param {string} [opts.wikidata] - wd:Qxxx fuer Badge.
 * @param {string} [opts.tip]      - Tooltip fuer den Chip.
 * @param {Function} [opts.onClick]
 * @param {boolean} [opts.compact] - kompakte Variante fuer Aggregat-Tabellen.
 * @returns {HTMLElement}
 */
const PROV_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

export function buildRoleChip({ prefix, value, cluster, xlsxSource, wikidata, tip, onClick, compact }) {
  const prefixUpper = (prefix || '').toUpperCase();
  const cls = cluster || roleClusterFor(prefixUpper);
  const hasProv = xlsxSource && xlsxSource.row;
  const hasWikidata = wikidata && String(wikidata).startsWith('wd:');
  // Chip-Tip nur, wenn keine Children eigene Tips tragen — sonst stapeln sich
  // mehrere Tooltips beim Hover auf der Pille oder dem Wikidata-Badge (E-90).
  const childrenHaveTips = hasProv || hasWikidata;

  const chipProps = {
    className: `chip chip--role-pair chip--c-${cls}${onClick ? ' chip--clickable' : ''}${compact ? ' chip--compact' : ''}`,
  };
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
  return el('span', chipProps, ...parts);
}
