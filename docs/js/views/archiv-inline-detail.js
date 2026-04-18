/**
 * M³GIM Archiv Inline Detail — Shared component for Bestand and Chronik views.
 * Renders full record metadata inline (not in a sidebar).
 */

import { el } from '../utils/dom.js';
import { formatSignatur, formatDocType, ensureArray, countLinks } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { navigateToIndex } from '../ui/router.js';
import { toggleKorb, isInKorb } from '../ui/korb.js';
import { WIKIDATA_ICON_SVG, AGRELON_LABELS, roleClusterFor, sectionForRole, steChipPrefix, formatLanguage } from '../data/constants.js';

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
  // buildKonvolutDetail ist entfernt -- falls spaeter eine Detail-Ansicht
  // gewuenscht ist, wird sie neu gebaut.

  const wrapper = el('div', { className: 'inline-detail' });

  // Header
  const recordId = record['@id'];
  const inKorb = isInKorb(recordId);
  const header = el('div', { className: 'inline-detail__header' },
    el('span', { className: 'inline-detail__signatur' }, formatSignatur(record['rico:identifier'])),
    el('h4', { className: 'inline-detail__title' }, record['rico:title'] || '(ohne Titel)'),
    el('button', {
      className: `inline-detail__korb-btn ${inKorb ? 'inline-detail__korb-btn--active' : ''}`,
      title: inKorb ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzuf\u00fcgen',
      onClick: (e) => {
        e.stopPropagation();
        toggleKorb(recordId);
        // Update button state
        const btn = e.currentTarget;
        const nowIn = isInKorb(recordId);
        btn.classList.toggle('inline-detail__korb-btn--active', nowIn);
        btn.title = nowIn ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzuf\u00fcgen';
        btn.innerHTML = nowIn
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> Im Korb'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> Zum Korb';
      },
      html: inKorb
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> Im Korb'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> Zum Korb',
    }),
    el('button', {
      className: 'inline-detail__close',
      title: 'Schlie\u00dfen',
      onClick: (e) => {
        e.stopPropagation();
        if (onClose) onClose();
      },
      html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    })
  );
  wrapper.appendChild(header);

  // Body — 2-column grid
  const body = el('div', { className: 'inline-detail__body' });

  // Left column: Metadaten
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

  // Finanzen aus store.finances (Phase 6: m3gim:hasDetail mit monetaryAmount)
  const finances = store.finances?.get(record['@id']);
  if (finances && finances.length) {
    leftCol.appendChild(renderSection(`Finanzen (${finances.length})`, renderFinances(finances)));
  }

  // Beziehungen aus store.agentRelations (Phase 6: m3gim:agentRelation)
  const agentRelations = store.agentRelations?.get(record['@id']);
  if (agentRelations && agentRelations.length) {
    leftCol.appendChild(renderSection(`Beziehungen (${agentRelations.length})`, renderAgentRelations(agentRelations)));
  }

  // Right column: funktionale Bloecke (Session 34).
  // Agents werden nach Rolle in Produktion / Mitwirkende / Erwaehnt / Weitere
  // partitioniert; Werke + Buehnenrollen liegen im Block "Werk & Repertoire";
  // Orte + SpatiotemporalEvents im Block "Ort & Ereignis".
  const rightCol = el('div', { className: 'inline-detail__col' });

  const allAgents = ensureArray(record['m3gim:hasAssociatedAgent']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const works = subjects.filter(s => s['@type'] === 'm3gim:MusicalWork' || s['@type'] === 'm3gim:PerformanceEvent');
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  const performanceRoles = ensureArray(record['m3gim:hasPerformanceRole']);
  const locations = ensureArray(record['rico:hasOrHadLocation']);
  const eventIds = store.recordToEvents?.get(record['@id']) || [];
  const events = eventIds.map(eid => store.mobilityEvents.get(eid)).filter(Boolean);

  // Agents, die bereits ueber eine AgRelOn-Beziehung sichtbar sind, werden
  // aus dem Ursprungs-Bucket unterdrueckt. Zweck: keine Doppelanzeige
  // desselben Agenten in zwei Sektionen (z. B. Boehm als ABSENDER unter
  // "Weitere" UND als KORRESPONDENZ unter "Beziehungen"). Betrifft nur
  // Rollen, die tatsaechlich ein AgRelOn-Aequivalent haben.
  const AGRELON_ROLES = new Set([
    'absender', 'empfänger', 'empfaenger', 'adressat',
    'arbeitgeber', 'agent', 'vermittler', 'auftraggeber',
  ]);
  const agrelonAgentKeys = new Set();
  for (const rel of (agentRelations || [])) {
    // store.agentRelations liefert ein flaches Format (objectName /
    // objectWikidata), nicht das rohe JSON-LD agrelon:hasObject-Subobjekt.
    const key = rel.objectWikidata || (rel.objectName || '').toLowerCase();
    if (key) agrelonAgentKeys.add(key);
  }

  // Agents nach Sektion gruppieren.
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
  // Erwaehnt-Personen aus rico:hasOrHadSubject landen ebenfalls im Erwaehnt-Block.
  for (const p of mentionedPersons) {
    bucket.erwaehnt.push(p);
  }

  if (bucket.produktion.length) {
    rightCol.appendChild(renderSection(
      `Produktion (${bucket.produktion.length})`,
      renderAgentChips(bucket.produktion, 'personen'),
    ));
  }
  if (bucket.mitwirkende.length) {
    rightCol.appendChild(renderSection(
      `Mitwirkende (${bucket.mitwirkende.length})`,
      renderAgentChips(bucket.mitwirkende, 'personen'),
    ));
  }

  // Werk & Repertoire: Werke + Buehnenrollen.
  if (works.length || performanceRoles.length) {
    const container = el('div', { className: 'inline-detail__chips' });
    for (const w of works) {
      const name = w.name || w['skos:prefLabel'] || '?';
      const komponist = w.komponist || '';
      container.appendChild(buildRoleChip({
        prefix: w['@type'] === 'm3gim:PerformanceEvent' ? 'EREIGNIS' : 'WERK',
        value: komponist ? `${name} (${komponist})` : name,
        cluster: w['@type'] === 'm3gim:PerformanceEvent' ? 'ort' : 'rolle',
        xlsxSource: extractXlsxSource(w),
        wikidata: w['@id'] && String(w['@id']).startsWith('wd:') ? w['@id'] : null,
        tip: 'Im Werke-Index oeffnen',
        onClick: () => navigateToIndex('werke', name),
      }));
    }
    for (const r of performanceRoles) {
      const name = r.name || r['skos:prefLabel'] || '?';
      container.appendChild(buildRoleChip({
        prefix: 'ROLLE',
        value: name,
        cluster: 'rolle',
        xlsxSource: extractXlsxSource(r),
      }));
    }
    const total = works.length + performanceRoles.length;
    rightCol.appendChild(renderSection(`Werk & Repertoire (${total})`, container));
  }

  // Ort & Ereignis: SpatiotemporalEvents (mit Datum) + Places ohne Event-Verknuepfung.
  if (events.length || locations.length) {
    const container = el('div', { className: 'inline-detail__chips' });
    // Events zuerst — tragen mehr Kontext (Ort + Datum).
    for (const ev of events) {
      const dateDisplay = ev.date ? formatDate(ev.date) : '—';
      const prefix = steChipPrefix(ev.role);
      container.appendChild(buildRoleChip({
        prefix,
        value: `${ev.place || '?'}\u00a0\u00b7\u00a0${dateDisplay}`,
        cluster: 'ort',  // STE-Chips immer ort-Farbfamilie
        xlsxSource: ev.xlsxSource,
        wikidata: ev.placeWikidata,
        tip: ev.place ? 'Ort im Index oeffnen' : null,
        onClick: ev.place ? () => navigateToIndex('orte', ev.place) : null,
      }));
    }
    // Orte, die nicht schon ueber STE dargestellt sind.
    const eventPlaces = new Set(events.map(e => (e.place || '').toLowerCase()));
    for (const loc of locations) {
      const name = loc.name || loc['skos:prefLabel'] || '?';
      if (eventPlaces.has(name.toLowerCase())) continue;
      container.appendChild(buildRoleChip({
        prefix: (loc.role || 'ORT').toUpperCase(),
        value: name,
        cluster: 'ort',
        xlsxSource: extractXlsxSource(loc),
        wikidata: loc['@id'] && String(loc['@id']).startsWith('wd:') ? loc['@id'] : null,
        tip: 'Ort im Index oeffnen',
        onClick: () => navigateToIndex('orte', name),
      }));
    }
    if (container.childNodes.length > 0) {
      rightCol.appendChild(renderSection(
        `Ort & Ereignis (${container.childNodes.length})`,
        container,
      ));
    }
  }

  if (bucket.erwaehnt.length) {
    rightCol.appendChild(renderSection(
      `Erwähnt (${bucket.erwaehnt.length})`,
      renderAgentChips(bucket.erwaehnt, 'personen'),
    ));
  }

  if (bucket.weitere.length) {
    rightCol.appendChild(renderSection(
      `Weitere (${bucket.weitere.length})`,
      renderAgentChips(bucket.weitere, 'personen'),
    ));
  }

  body.appendChild(leftCol);
  if (rightCol.childNodes.length > 0) {
    body.appendChild(rightCol);
  } else {
    body.appendChild(el('div', { className: 'inline-detail__col inline-detail__empty-state' },
      el('p', {}, 'Noch nicht erschlossen'),
      el('p', { className: 'inline-detail__empty-hint' }, 'Annotationen werden im Rahmen der Erschlie\u00dfung erg\u00e4nzt.')
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

/** Extrahiert xlsxSource aus einem JSON-LD-Subobjekt im kompakten {sheet, row}-Format. */
function extractXlsxSource(entity) {
  const src = entity && entity['m3gim:xlsxSource'];
  if (!src || typeof src !== 'object') return null;
  const row = src['m3gim:xlsxRow'];
  if (!row) return null;
  return {
    sheet: src['m3gim:xlsxSheet'] || null,
    row,
    datenpunkt: src['m3gim:datenpunktId'] || null,
  };
}

/**
 * Rendert eine Liste von Agent-Subobjekten als Rollen-Prefix-Chips (Session 34).
 * Uppercase-Rolle als Prefix, Name als Wert, Cluster aus roleClusterFor,
 * Provenance-Pille aus m3gim:xlsxSource, Wikidata-Badge aus @id.
 */
function renderAgentChips(entities, gridType) {
  const container = el('div', { className: 'inline-detail__chips' });
  for (const entity of entities) {
    const name = entity.name || entity['skos:prefLabel'] || entity['@id'] || '?';
    const role = entity.role || 'AGENT';
    const wikidata = entity['@id'] && String(entity['@id']).startsWith('wd:') ? entity['@id'] : null;
    container.appendChild(buildRoleChip({
      prefix: role,
      value: name,
      xlsxSource: extractXlsxSource(entity),
      wikidata,
      tip: gridType ? 'Im Index oeffnen' : null,
      onClick: gridType ? () => navigateToIndex(gridType, name) : null,
    }));
  }
  return container;
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
export function buildRoleChip({ prefix, value, cluster, xlsxSource, wikidata, tip, onClick, compact }) {
  const prefixUpper = (prefix || '').toUpperCase();
  const cls = cluster || roleClusterFor(prefixUpper);
  const chipProps = {
    className: `chip chip--role-pair chip--c-${cls}${onClick ? ' chip--clickable' : ''}${compact ? ' chip--compact' : ''}`,
  };
  if (onClick) {
    chipProps.onClick = (e) => { e.stopPropagation(); onClick(e); };
  }
  if (tip) chipProps.dataset = { tip };

  const parts = [
    el('span', { className: 'chip-rolle' }, prefixUpper),
    el('span', { className: 'chip-wert' }, value || '—'),
  ];
  if (xlsxSource && xlsxSource.row) {
    parts.push(el('span', {
      className: 'prov-pill',
      title: `Quelle: ${xlsxSource.sheet || 'XLSX'} · Zeile ${xlsxSource.row}`,
    }, `#${xlsxSource.row}`));
  }
  if (wikidata && String(wikidata).startsWith('wd:')) {
    parts.push(el('a', {
      className: 'badge badge--wikidata',
      href: `https://www.wikidata.org/entity/${String(wikidata).replace('wd:', '')}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: wikidata,
      html: WIKIDATA_ICON_SVG,
      onClick: (e) => e.stopPropagation(),
    }));
  }
  return el('span', chipProps, ...parts);
}

/**
 * Finanz-Chips. Eingabe: Array aus store.finances.
 */
function renderFinances(entries) {
  const container = el('div', { className: 'inline-detail__chips' });
  const formatAmount = (n) => Number.isFinite(n) ? n.toLocaleString('de-DE') : '?';
  for (const e of entries) {
    const prefix = e.field || 'FINANZ';
    const valueParts = [`${formatAmount(e.amount)}${e.currency ? '\u00a0' + e.currency : ''}`];
    if (e.role) valueParts.push(`(${e.role})`);
    container.appendChild(buildRoleChip({
      prefix,
      value: valueParts.join(' '),
      xlsxSource: e.xlsxSource,
    }));
  }
  return container;
}

/**
 * AgRelOn-Chips. Eingabe: Array aus store.agentRelations.
 */
function renderAgentRelations(relations) {
  const container = el('div', { className: 'inline-detail__chips' });
  for (const r of relations) {
    const label = AGRELON_LABELS[r.type] || (r.type || '').replace(/^agrelon:Has/, '');
    const validity = r.validityBegin
      ? ` ${r.validityBegin}${r.validityEnd ? '\u2013' + r.validityEnd : ''}`
      : '';
    container.appendChild(buildRoleChip({
      prefix: label,
      value: `${r.objectName || '?'}${validity}`,
      cluster: 'beziehung',
      xlsxSource: r.xlsxSource,
      wikidata: r.objectWikidata,
      tip: r.objectName ? 'Im Personen-Index öffnen' : null,
      onClick: r.objectName ? () => navigateToIndex('personen', r.objectName) : null,
    }));
  }
  return container;
}
