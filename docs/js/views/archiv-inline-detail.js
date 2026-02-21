/**
 * M³GIM Archiv Inline Detail — Shared component for Bestand and Chronik views.
 * Renders full record metadata inline (not in a sidebar).
 */

import { el } from '../utils/dom.js';
import { formatSignatur, formatDocType, ensureArray, countLinks } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { navigateToIndex } from '../ui/router.js';
import { toggleKorb, isInKorb } from '../ui/korb.js';
import { WIKIDATA_ICON_SVG } from '../data/constants.js';

/**
 * Build an inline detail DOM element for a record.
 * @param {Object} record - The JSON-LD record
 * @param {Object} store - The data store
 * @param {Object} [options]
 * @param {Function} [options.onClose] - Called when close button clicked
 * @returns {HTMLElement}
 */
export function buildInlineDetail(record, store, { onClose } = {}) {
  // Konvolut (RecordSet) gets a specialized aggregate detail view
  if (record['@type'] === 'rico:RecordSet' && store.konvolutMeta) {
    return buildKonvolutDetail(record, store, { onClose });
  }

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

  const allAgents = ensureArray(record['m3gim:hasAssociatedAgent']);
  const persons = allAgents.filter(a => a['@type'] !== 'rico:CorporateBody' && a['@type'] !== 'rico:Group');
  const institutions = allAgents.filter(a => a['@type'] === 'rico:CorporateBody' || a['@type'] === 'rico:Group');
  if (persons.length) {
    rightCol.appendChild(renderSection(`Personen (${persons.length})`, renderEntityChips(persons, 'personen')));
  }
  if (institutions.length) {
    rightCol.appendChild(renderSection(`Institutionen (${institutions.length})`, renderEntityChips(institutions, 'organisationen')));
  }

  const locations = ensureArray(record['rico:hasOrHadLocation']);
  if (locations.length) {
    rightCol.appendChild(renderSection(`Orte (${locations.length})`, renderEntityChips(locations, 'orte')));
  }

  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const works = subjects.filter(s => s['@type'] === 'm3gim:MusicalWork' || s['@type'] === 'm3gim:PerformanceEvent');
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  if (works.length) {
    rightCol.appendChild(renderSection(`Werke (${works.length})`, renderWorkChips(works)));
  }

  const roles = ensureArray(record['m3gim:hasPerformanceRole']);
  if (roles.length) {
    rightCol.appendChild(renderSection(`Rollen (${roles.length})`, renderEntityChips(roles)));
  }

  if (mentionedPersons.length) {
    rightCol.appendChild(renderSection(`Erw\u00e4hnt (${mentionedPersons.length})`, renderEntityChips(mentionedPersons, 'personen')));
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

function renderEntityChips(entities, gridType) {
  const container = el('div', { className: 'inline-detail__chips' });
  for (const entity of entities) {
    const name = entity.name || entity['skos:prefLabel'] || entity['@id'] || '?';
    const role = entity.role || '';
    const wikidata = entity['@id'];
    const hasWd = wikidata && wikidata.startsWith('wd:');

    const chipProps = { className: `chip chip--entity${gridType ? ' chip--clickable' : ''}` };
    if (gridType) {
      chipProps.onClick = (e) => {
        e.stopPropagation();
        navigateToIndex(gridType, name);
      };
      chipProps.dataset = { tip: `Im Index \u00f6ffnen` };
    }

    const chip = el('span', chipProps,
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
        html: WIKIDATA_ICON_SVG,
        onClick: (e) => e.stopPropagation(),
      }));
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
    const role = subj.role || '';
    const chip = el('span', {
      className: 'chip chip--werk chip--clickable',
      dataset: { tip: 'Im Index \u00f6ffnen' },
      onClick: (e) => { e.stopPropagation(); navigateToIndex('werke', name); },
    },
      komponist ? `${name} (${komponist})` : name,
      role ? el('span', { className: 'chip__role' }, ` \u2014 ${role}`) : null,
    );
    container.appendChild(chip);
  }
  return container;
}

/** Build an aggregate detail view for a Konvolut (RecordSet). */
function buildKonvolutDetail(record, store, { onClose } = {}) {
  const wrapper = el('div', { className: 'inline-detail inline-detail--konvolut' });
  const kid = record['@id'];
  const meta = store.konvolutMeta.get(kid);

  // Header
  const header = el('div', { className: 'inline-detail__header' },
    el('span', { className: 'inline-detail__signatur' }, formatSignatur(record['rico:identifier'])),
    el('h4', { className: 'inline-detail__title' }, meta?.title || record['rico:identifier'] || ''),
    el('button', {
      className: 'inline-detail__close',
      title: 'Schlie\u00dfen',
      onClick: (e) => { e.stopPropagation(); if (onClose) onClose(); },
      html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    })
  );
  wrapper.appendChild(header);

  // Body
  const body = el('div', { className: 'inline-detail__body' });
  const leftCol = el('div', { className: 'inline-detail__col' });

  // Overview section
  const metaPairs = [];
  metaPairs.push(['Typ', 'Konvolut (Archiveinheit)']);
  if (meta?.childCount) metaPairs.push(['Enth\u00e4lt', `${meta.childCount} Objekte`]);
  if (meta?.dateDisplay) metaPairs.push(['Zeitraum', meta.dateDisplay]);
  if (meta?.datedCount && meta?.childCount) {
    const pct = Math.round(meta.datedCount / meta.childCount * 100);
    metaPairs.push(['Datiert', `${meta.datedCount} von ${meta.childCount} (${pct}\u2009%)`]);
  }
  if (meta?.totalLinks) metaPairs.push(['Annotationen', `${meta.totalLinks} gesamt`]);
  leftCol.appendChild(renderSection('\u00dcbersicht', renderMetaGrid(metaPairs)));

  // Right column: aggregated top entities
  const rightCol = el('div', { className: 'inline-detail__col' });
  const childIds = (store.konvolutChildren.get(kid) || []).filter(cid => !store.folioIds.has(cid));

  const agentCounts = new Map();
  const locationCounts = new Map();

  for (const cid of childIds) {
    const child = store.records.get(cid);
    if (!child) continue;
    for (const agent of ensureArray(child['m3gim:hasAssociatedAgent'])) {
      const name = agent.name || agent['skos:prefLabel'] || '';
      if (name) agentCounts.set(name, (agentCounts.get(name) || 0) + 1);
    }
    for (const loc of ensureArray(child['rico:hasOrHadLocation'])) {
      const name = loc.name || loc['skos:prefLabel'] || '';
      if (name && !/^\d{4}/.test(name)) locationCounts.set(name, (locationCounts.get(name) || 0) + 1);
    }
  }

  if (agentCounts.size > 0) {
    const topAgents = [...agentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const chips = el('div', { className: 'inline-detail__chips' });
    for (const [name, count] of topAgents) {
      chips.appendChild(el('span', { className: 'chip chip--entity' },
        name, el('span', { className: 'chip__role' }, ` (${count})`)));
    }
    rightCol.appendChild(renderSection(`Personen (Top\u200910)`, chips));
  }

  if (locationCounts.size > 0) {
    const topLocs = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const chips = el('div', { className: 'inline-detail__chips' });
    for (const [name, count] of topLocs) {
      chips.appendChild(el('span', { className: 'chip chip--entity' },
        name, el('span', { className: 'chip__role' }, ` (${count})`)));
    }
    rightCol.appendChild(renderSection(`Orte (Top\u20095)`, chips));
  }

  body.appendChild(leftCol);
  if (rightCol.childNodes.length > 0) body.appendChild(rightCol);
  wrapper.appendChild(body);

  return wrapper;
}
