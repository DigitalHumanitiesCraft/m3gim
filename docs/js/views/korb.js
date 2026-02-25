/**
 * M³GIM Wissenskorb View — Bookmarked records with full metadata and links.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, ensureArray, formatDocType } from '../utils/format.js';
import { formatDate } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS, WIKIDATA_ICON_SVG } from '../data/constants.js';
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
      ? el('div', { className: 'korb-header__actions' },
          el('button', {
            className: 'korb-export',
            title: 'Als CSV exportieren',
            onClick: () => exportCSV(ids),
          }, '\u2193 CSV'),
          el('button', {
            className: 'korb-export',
            title: 'Als BibTeX exportieren',
            onClick: () => exportBibTeX(ids),
          }, '\u2193 BibTeX'),
          el('button', {
            className: 'korb-clear',
            onClick: () => { clearKorb(); },
          }, 'Korb leeren'),
        )
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
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', 'de-DE', { numeric: true }));

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
  const allAgents = ensureArray(record['m3gim:hasAssociatedAgent']);
  const persons = allAgents.filter(a => a['@type'] !== 'rico:CorporateBody' && a['@type'] !== 'rico:Group');
  const institutions = allAgents.filter(a => a['@type'] === 'rico:CorporateBody' || a['@type'] === 'rico:Group');
  const locations = ensureArray(record['rico:hasOrHadLocation']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  const works = subjects.filter(s => s['@type'] === 'm3gim:MusicalWork' || s['@type'] === 'm3gim:PerformanceEvent');
  const roles = ensureArray(record['m3gim:hasPerformanceRole']);

  const hasLinks = allAgents.length || locations.length || subjects.length || roles.length;

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
    if (works.length) {
      linksEl.appendChild(renderWorkRow('Werke', works));
    }
    if (roles.length) {
      linksEl.appendChild(renderLinkRow('Rollen', roles));
    }
    if (mentionedPersons.length) {
      linksEl.appendChild(renderLinkRow('Erw\u00e4hnt', mentionedPersons, 'personen'));
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
        html: WIKIDATA_ICON_SVG,
        onClick: (e) => e.stopPropagation(),
      }));
    }

    row.appendChild(chip);
  }
  return row;
}

/* === Export Functions === */

function exportCSV(ids) {
  const records = ids.map(id => store.records.get(id)).filter(Boolean);
  const rows = [['Signatur', 'Titel', 'Typ', 'Datierung', 'Konvolut', 'Personen', 'Orte', 'Werke']];

  for (const r of records) {
    const sig = r['rico:identifier'] || '';
    const title = (r['rico:title'] || '').replace(/"/g, '""');
    const docType = formatDocType(r) || '';
    const date = formatDate(r['rico:date']) || '';
    const konvolutId = store.childToKonvolut?.get(r['@id']);
    const konvolut = konvolutId ? (store.konvolute.get(konvolutId)?.['rico:identifier'] || '') : '';
    const agents = ensureArray(r['m3gim:hasAssociatedAgent']);
    const persons = agents.filter(a => a['@type'] === 'rico:Person').map(a => a.name || '').join('; ');
    const locations = ensureArray(r['rico:hasOrHadLocation']).map(l => l.name || '').join('; ');
    const subjects = ensureArray(r['rico:hasOrHadSubject'])
      .filter(s => s['@type'] === 'm3gim:MusicalWork')
      .map(s => s.name || '').join('; ');

    rows.push([sig, title, docType, date, konvolut, persons, locations, subjects].map(v => `"${v}"`));
  }

  downloadFile(rows.map(r => r.join(',')).join('\n'), 'm3gim-korb.csv', 'text/csv;charset=utf-8');
}

function exportBibTeX(ids) {
  const records = ids.map(id => store.records.get(id)).filter(Boolean);
  const entries = [];

  for (const r of records) {
    const sig = r['rico:identifier'] || 'unknown';
    const key = sig.replace(/[^a-zA-Z0-9]/g, '_');
    const title = r['rico:title'] || 'Ohne Titel';
    const date = formatDate(r['rico:date']) || '';
    const year = date.match(/\d{4}/)?.[0] || '';
    const agents = ensureArray(r['m3gim:hasAssociatedAgent']);
    const author = agents
      .filter(a => a.role === 'verfasser:in' || a.role === 'verfasser')
      .map(a => a.name || '')
      .join(' and ') || '';

    const fields = [];
    if (author) fields.push(`  author    = {${author}}`);
    fields.push(`  title     = {${title}}`);
    if (year) fields.push(`  year      = {${year}}`);
    fields.push(`  note      = {${sig}}`);
    fields.push(`  howpublished = {Teilnachlass Ira Malaniuk, UAKUG/NIM, KUG Graz}`);

    entries.push(`@misc{${key},\n${fields.join(',\n')}\n}`);
  }

  downloadFile(entries.join('\n\n'), 'm3gim-korb.bib', 'application/x-bibtex');
}

function downloadFile(content, filename, mimeType) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
