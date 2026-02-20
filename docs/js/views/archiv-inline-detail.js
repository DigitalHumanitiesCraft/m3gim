/**
 * M³GIM Archiv Inline Detail — Shared component for Bestand and Chronik views.
 * Renders full record metadata inline (not in a sidebar).
 */

import { el } from '../utils/dom.js';
import { formatSignatur, formatDocType, ensureArray } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';

/**
 * Build an inline detail DOM element for a record.
 * @param {Object} record - The JSON-LD record
 * @param {Object} store - The data store
 * @param {Object} [options]
 * @param {Function} [options.onClose] - Called when close button clicked
 * @returns {HTMLElement}
 */
export function buildInlineDetail(record, store, { onClose } = {}) {
  const wrapper = el('div', { className: 'inline-detail' });

  // Header
  const header = el('div', { className: 'inline-detail__header' },
    el('span', { className: 'inline-detail__signatur' }, formatSignatur(record['rico:identifier'])),
    el('h4', { className: 'inline-detail__title' }, record['rico:title'] || '(ohne Titel)'),
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
  if (lang) meta.push(['Sprache', typeof lang === 'string' ? lang : String(lang)]);
  const extent = record['rico:hasExtent'];
  if (extent) meta.push(['Umfang', typeof extent === 'string' ? extent : String(extent)]);
  const status = record['m3gim:bearbeitungsstand'];
  if (status) meta.push(['Status', status]);

  if (meta.length) {
    leftCol.appendChild(renderSection('Metadaten', renderMetaGrid(meta)));
  }

  // Financial data
  const ausgaben = record['m3gim:ausgaben'];
  const einnahmen = record['m3gim:einnahmen'];
  if (ausgaben || einnahmen) {
    const finMeta = [];
    if (ausgaben) finMeta.push(['Ausgaben', ausgaben]);
    if (einnahmen) finMeta.push(['Einnahmen', einnahmen]);
    leftCol.appendChild(renderSection('Finanzen', renderMetaGrid(finMeta)));
  }

  // Right column: Verknüpfungen
  const rightCol = el('div', { className: 'inline-detail__col' });

  const agents = ensureArray(record['rico:hasOrHadAgent']);
  if (agents.length) {
    rightCol.appendChild(renderSection(`Personen (${agents.length})`, renderEntityChips(agents)));
  }

  const locations = ensureArray(record['rico:hasOrHadLocation']);
  if (locations.length) {
    rightCol.appendChild(renderSection(`Orte (${locations.length})`, renderEntityChips(locations)));
  }

  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  if (subjects.length) {
    rightCol.appendChild(renderSection(`Werke (${subjects.length})`, renderWorkChips(subjects)));
  }

  const roles = ensureArray(record['m3gim:hasPerformanceRole']);
  if (roles.length) {
    rightCol.appendChild(renderSection(`Rollen (${roles.length})`, renderEntityChips(roles)));
  }

  const mentions = ensureArray(record['m3gim:mentions']);
  if (mentions.length) {
    rightCol.appendChild(renderSection(`Erwähnt (${mentions.length})`, renderEntityChips(mentions)));
  }

  body.appendChild(leftCol);
  if (rightCol.childNodes.length > 0) {
    body.appendChild(rightCol);
  }
  wrapper.appendChild(body);

  // Konvolut-Info
  const konvolutId = store.childToKonvolut?.get(record['@id']);
  if (konvolutId) {
    const konvolut = store.konvolute.get(konvolutId);
    if (konvolut) {
      const konvSig = formatSignatur(konvolut['rico:identifier']);
      wrapper.appendChild(el('div', { className: 'inline-detail__konvolut' },
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

function renderEntityChips(entities) {
  const container = el('div', { className: 'inline-detail__chips' });
  for (const entity of entities) {
    const name = entity.name || entity['skos:prefLabel'] || entity['@id'] || '?';
    const role = entity.role || '';
    const wikidata = entity['@id'];
    const hasWd = wikidata && wikidata.startsWith('wd:');

    const chip = el('span', { className: 'chip chip--entity' },
      name,
      role ? el('span', { className: 'chip__role' }, ` (${role})`) : null,
    );

    if (hasWd) {
      chip.appendChild(el('a', {
        className: 'badge badge--wikidata',
        href: `https://www.wikidata.org/entity/${wikidata.replace('wd:', '')}`,
        target: '_blank',
        rel: 'noopener noreferrer',
        title: wikidata,
        onClick: (e) => e.stopPropagation(),
      }, 'WD'));
    }

    container.appendChild(chip);
  }
  return container;
}

function renderWorkChips(subjects) {
  const container = el('div', { className: 'inline-detail__chips' });
  for (const subj of subjects) {
    const name = subj.name || subj['skos:prefLabel'] || '?';
    const komponist = subj.komponist || '';
    container.appendChild(el('span', { className: 'chip chip--werk' },
      komponist ? `${name} (${komponist})` : name
    ));
  }
  return container;
}
