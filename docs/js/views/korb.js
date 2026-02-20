/**
 * M³GIM Wissenskorb View — Bookmarked records with full metadata and links.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, ensureArray, formatDocType } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { getKorbItems, removeFromKorb, clearKorb, onKorbChange } from '../ui/korb.js';
import { navigateToIndex } from '../ui/router.js';

let store = null;
let container = null;

export function renderKorb(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;

  onKorbChange(() => renderList());
  renderList();
}

function renderList() {
  if (!container) return;
  clear(container);

  const wrapper = el('div', { className: 'korb-page' });

  const ids = getKorbItems();

  // Header
  const header = el('div', { className: 'korb-header' },
    el('h2', { className: 'korb-title' }, ids.length > 0 ? `Wissenskorb (${ids.length})` : 'Wissenskorb'),
    ids.length > 0
      ? el('button', {
          className: 'korb-clear',
          onClick: () => { clearKorb(); },
        }, 'Korb leeren')
      : null,
  );
  wrapper.appendChild(header);

  if (ids.length === 0) {
    wrapper.appendChild(el('div', { className: 'korb-empty' },
      el('span', {
        html: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
      }),
      el('p', { className: 'korb-empty__text' }, 'Noch keine Dokumente gesammelt.'),
      el('p', { className: 'korb-empty__hint' }, 'Klicken Sie das Lesezeichen-Symbol neben einem Dokument im Archiv oder in den Indizes.'),
    ));
    container.appendChild(wrapper);
    return;
  }

  // Records as detail cards
  const list = el('div', { className: 'korb-list' });
  const records = ids
    .map(id => store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', undefined, { numeric: true }));

  for (const r of records) {
    list.appendChild(renderCard(r));
  }
  wrapper.appendChild(list);
  container.appendChild(wrapper);
}

function renderCard(record) {
  const recordId = record['@id'];
  const docType = getDocTypeId(record) || '';
  const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';

  const card = el('div', { className: 'korb-card' });

  // Header: Signatur, Titel, Badge, Remove
  const sigEl = el('a', {
    className: 'korb-card__sig',
    href: '#archiv/' + encodeURIComponent(recordId),
    title: 'Im Archiv anzeigen',
  }, formatSignatur(record['rico:identifier']));

  const removeBtn = el('button', {
    className: 'korb-card__remove',
    title: 'Aus Korb entfernen',
    onClick: (e) => { e.stopPropagation(); removeFromKorb(recordId); },
    html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  });

  card.appendChild(el('div', { className: 'korb-card__header' },
    sigEl,
    el('span', { className: 'korb-card__title' }, record['rico:title'] || '(ohne Titel)'),
    docLabel && docType !== 'konvolut'
      ? el('span', { className: `badge badge--${docType}` }, docLabel)
      : null,
    removeBtn,
  ));

  // Meta line: Datum, Sprache, Umfang, Status
  const metaParts = [];
  const date = formatDate(record['rico:date']);
  if (date) metaParts.push(date);
  const lang = record['rico:hasOrHadLanguage'];
  if (lang) metaParts.push(typeof lang === 'string' ? lang : String(lang));
  const extent = record['rico:hasExtent'];
  if (extent) metaParts.push(typeof extent === 'string' ? extent : String(extent));
  const status = record['m3gim:bearbeitungsstand'];
  if (status) metaParts.push(status);

  if (metaParts.length) {
    card.appendChild(el('div', { className: 'korb-card__meta' }, metaParts.join(' \u00b7 ')));
  }

  // Verknuepfungen — split agents into persons and institutions
  const allAgents = ensureArray(record['rico:hasOrHadAgent']);
  const persons = allAgents.filter(a => a['@type'] !== 'rico:CorporateBody' && a['@type'] !== 'rico:Group');
  const institutions = allAgents.filter(a => a['@type'] === 'rico:CorporateBody' || a['@type'] === 'rico:Group');
  const locations = ensureArray(record['rico:hasOrHadLocation']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const roles = ensureArray(record['m3gim:hasPerformanceRole']);
  const mentions = ensureArray(record['m3gim:mentions']);

  const hasLinks = allAgents.length || locations.length || subjects.length || roles.length || mentions.length;

  if (hasLinks) {
    const linksEl = el('div', { className: 'korb-card__links' });

    if (persons.length) {
      linksEl.appendChild(renderLinkRow('Personen', persons, 'personen'));
    }
    if (institutions.length) {
      linksEl.appendChild(renderLinkRow('Institutionen', institutions, 'organisationen'));
    }
    if (locations.length) {
      linksEl.appendChild(renderLinkRow('Orte', locations, 'orte'));
    }
    if (subjects.length) {
      linksEl.appendChild(renderWorkRow('Werke', subjects));
    }
    if (roles.length) {
      linksEl.appendChild(renderLinkRow('Rollen', roles));
    }
    if (mentions.length) {
      linksEl.appendChild(renderLinkRow('Erw\u00e4hnt', mentions, 'personen'));
    }

    card.appendChild(linksEl);
  } else {
    card.appendChild(el('div', { className: 'korb-card__empty' }, 'Noch nicht erschlossen'));
  }

  // Konvolut info
  const konvolutId = store.childToKonvolut?.get(recordId);
  if (konvolutId) {
    const konvolut = store.konvolute.get(konvolutId);
    if (konvolut) {
      card.appendChild(el('div', { className: 'korb-card__konvolut' },
        'Teil von Konvolut ' + formatSignatur(konvolut['rico:identifier'])
      ));
    }
  }

  return card;
}

function renderLinkRow(label, entities, gridType) {
  const row = el('div', { className: 'korb-card__link-row' },
    el('span', { className: 'korb-card__link-label' }, label + ':'),
  );

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const name = entity.name || entity['skos:prefLabel'] || entity['@id'] || '?';
    const role = entity.role || '';
    const wikidata = entity['@id'];
    const hasWd = wikidata && wikidata.startsWith('wd:');

    const chipProps = { className: `chip chip--entity${gridType ? ' chip--clickable' : ''}` };
    if (gridType) {
      chipProps.onClick = (e) => { e.stopPropagation(); navigateToIndex(gridType, name); };
      chipProps.title = `Im Index \u00f6ffnen: ${name}`;
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
        onClick: (e) => e.stopPropagation(),
      }, 'WD'));
    }

    row.appendChild(chip);
  }
  return row;
}

function renderWorkRow(label, subjects) {
  const row = el('div', { className: 'korb-card__link-row' },
    el('span', { className: 'korb-card__link-label' }, label + ':'),
  );

  for (const subj of subjects) {
    const name = subj.name || subj['skos:prefLabel'] || '?';
    const komponist = subj.komponist || '';
    const role = subj.role || '';
    const chip = el('span', {
      className: 'chip chip--werk chip--clickable',
      title: `Im Index \u00f6ffnen: ${name}`,
      onClick: (e) => { e.stopPropagation(); navigateToIndex('werke', name); },
    },
      komponist ? `${name} (${komponist})` : name,
      role ? el('span', { className: 'chip__role' }, ` \u2014 ${role}`) : null,
    );
    row.appendChild(chip);
  }
  return row;
}
