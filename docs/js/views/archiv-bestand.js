/**
 * M³GIM Archiv Bestand View — Tektonik: Fonds → Konvolute → Objekte.
 * Uses inline expansion instead of sidebar for record details.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, formatChildSignatur, getDocTypeId, countLinks, truncate, ensureArray, expandDftFilter } from '../utils/format.js';
import { extractYear, formatDate } from '../utils/date-parser.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { buildInlineDetail } from './archiv-inline-detail.js';
import { toggleKorb, isInKorb } from '../ui/korb.js';
import { buildFilterToolbar } from './_archiv-toolbar.js';
import { onViewNavigate } from '../ui/events.js';
import { logStamp } from '../utils/env.js';

let store = null;
let container = null;
let toolbar = null;  // { element, setPerson, setCount, getState }
let expandedKonvolute = new Set();
let expandedRecord = null; // only one at a time
let currentItems = []; // kept in sync so closures never go stale
let sortDir = 1; // 1 = ascending, -1 = descending
let currentSortKey = 'signatur';

// Plakate + Tontraeger werden pauschal ausgeblendet -- Forschungs-Fokus
// liegt auf Schriftgut-Belegen, siehe knowledge/interface-konzept.md.
const EXCLUDED_DFT = new Set(['plakat', 'tontraeger']);

/**
 * Render the Bestand view into the container.
 * @param {Object} storeRef
 * @param {HTMLElement} containerEl
 */
export function renderBestand(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;

  clear(container);
  toolbar = buildFilterToolbar(store, {
    onChange: () => updateBestandView(),
  });
  container.appendChild(toolbar.element);
  container.appendChild(buildTable());
  updateBestandView();

  // Cross-navigation: Indizes "Alle im Archiv anzeigen", Korb-Klick,
  // Chip-Klick aus Inline-Detail (applyArchivFilter) oder Chronik-Punkt.
  onViewNavigate('bestand', (detail) => {
    const { type, name, recordId, filter } = detail || {};
    if (type === 'personen' && name) toolbar.setPerson(name);
    if (filter && filter.value) applyToolbarFilter(filter);
    if (recordId) expandRecord(recordId);
  });
}

function applyToolbarFilter({ facet, value }) {
  if (!toolbar) return;
  if (facet === 'person') toolbar.setPerson(value);
  else if (facet === 'location') toolbar.setLocation(value);
  else if (facet === 'werk') toolbar.setWerk(value);
}

/**
 * Re-render rows; reads current filter state from the toolbar.
 */
function updateBestandView(filters) {
  const state = filters || (toolbar ? toolbar.getState() : {});
  const { search = '', docType = '', person = '', location = '', werk = '' } = state;
  const isFiltered = !!(search || docType || person || location || werk);
  let items = getOrderedItems();

  // When filtering, flatten: remove Konvolut headers, show children as standalone
  if (isFiltered) {
    items = items
      .filter(item => !item.isKonvolut)
      .map(item => item.isChild ? { record: item.record, konvolutId: item.konvolutId } : item);
  }

  // Search (matches Signatur, Titel, Typ-Label, Datum)
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(item => {
      const r = item.record;
      const sig = (r['rico:identifier'] || '').toLowerCase();
      const title = (r['rico:title'] || '').toLowerCase();
      const typ = (DOKUMENTTYP_LABELS[getDocTypeId(r)] || '').toLowerCase();
      const datum = (r['rico:date'] || '').toLowerCase();
      return sig.includes(q) || title.includes(q) || typ.includes(q) || datum.includes(q);
    });
  }

  // Doc type filter (hierarchisch: Oberbegriff matcht transitiv)
  if (docType) {
    const allowedTypes = expandDftFilter(store, docType);
    items = items.filter(item => allowedTypes.has(getDocTypeId(item.record)));
  }

  // Person filter
  if (person) {
    const personData = store.persons.get(person);
    if (personData) {
      items = items.filter(item => personData.records.has(item.record['@id']));
    }
  }

  // Ort filter
  if (location) {
    const locData = store.locations.get(location);
    if (locData) {
      items = items.filter(item => locData.records.has(item.record['@id']));
    }
  }

  // Werk filter
  if (werk) {
    const werkData = store.works.get(werk);
    if (werkData) {
      items = items.filter(item => werkData.records.has(item.record['@id']));
    }
  }

  // Sortierung:
  //   - Bei aktivem Filter: flach sortieren (die Hierarchie ist bereits
  //     aufgeloest).
  //   - Bei strukturellem View: Konvolute bleiben Signatur-sortiert, ihre
  //     Kinder werden *innerhalb* des jeweiligen Konvoluts nach dem gewaehlten
  //     Key sortiert. Standalone-Records ausserhalb der Konvolute bleiben
  //     zwischen den Konvoluten an ihrer Signaturposition.
  if (isFiltered) {
    items.sort((a, b) => sortFn(a.record, b.record, currentSortKey) * sortDir);
  } else if (currentSortKey !== 'signatur' || sortDir !== 1) {
    items = sortChildrenWithinKonvolute(items);
  }

  renderRows(items);

  // Count-Anzeige aktualisieren (bearbeitete Einheiten, nicht Gesamt-Bestand).
  // EXCLUDED_DFT (Plakate/Tontraeger) konsistent rausrechnen -- sonst driftet
  // der Toolbar-Zaehler gegen die tatsaechlich sichtbaren Zeilen.
  const recordCount = items.filter(i => !i.isKonvolut).length;
  const konvolutCount = items.filter(i => i.isKonvolut).length;
  if (toolbar) {
    const totalBearbeitet = store.allRecords.filter(
      r => !store.unprocessedIds.has(r['@id'])
        && !EXCLUDED_DFT.has(getDocTypeId(r))
    ).length;
    toolbar.setCount(isFiltered
      ? `${recordCount} von ${totalBearbeitet} bearbeiteten Einheiten`
      : `${totalBearbeitet} bearbeitete Einheiten`);
  }

  // Kompakter State-Stempel fuer Playwright + manuelles Debugging.
  logStamp('bestand', [
    ['konvolute', konvolutCount],
    ['records', recordCount],
    ['sort', `${currentSortKey}${sortDir === -1 ? '-desc' : ''}`],
    ['gefiltert', isFiltered ? 'ja' : ''],
  ]);

  return recordCount;
}

function buildTable() {
  const table = el('table', { className: 'archiv-table' });

  const columns = [
    { key: 'signatur', label: 'Signatur', className: 'archiv-col-signatur', title: 'Sortieren nach Signatur' },
    { key: 'titel', label: 'Titel', className: 'archiv-col-titel', title: 'Sortieren nach Titel' },
    { key: 'typ', label: 'Typ', className: 'archiv-col-typ', title: 'Sortieren nach Dokumenttyp' },
    { key: 'datum', label: 'Datum', className: 'archiv-col-datum', title: 'Sortieren nach Datum' },
    { key: 'links', label: 'Verknüpfungen', className: 'archiv-col-links', title: 'Verknüpfungen zu Personen, Orten, Werken, Ereignissen' },
  ];

  const headerRow = el('tr');
  for (const col of columns) {
    const isActive = currentSortKey === col.key;
    const arrow = isActive ? (sortDir === 1 ? ' \u25B2' : ' \u25BC') : '';
    const th = el('th', {
      className: `${col.className} archiv-th--sortable ${isActive ? 'archiv-th--active' : ''}`,
      title: col.title,
      onClick: () => {
        if (currentSortKey === col.key) {
          sortDir *= -1;
        } else {
          currentSortKey = col.key;
          sortDir = col.key === 'links' ? -1 : 1; // Links default descending
        }
        updateHeaderIndicators(headerRow, columns);
        updateBestandView();
      },
    }, col.label + arrow);
    headerRow.appendChild(th);
  }

  const thead = el('thead', {}, headerRow);
  table.appendChild(thead);
  const tbody = el('tbody');
  tbody.id = 'bestand-tbody';
  table.appendChild(tbody);
  return table;
}

function updateHeaderIndicators(headerRow, columns) {
  const ths = headerRow.querySelectorAll('th');
  ths.forEach((th, i) => {
    const col = columns[i];
    const isActive = currentSortKey === col.key;
    const arrow = isActive ? (sortDir === 1 ? ' \u25B2' : ' \u25BC') : '';
    th.textContent = col.label + arrow;
    th.classList.toggle('archiv-th--active', isActive);
  });
}

function getOrderedItems() {
  const items = [];
  const childIds = new Set();
  for (const children of store.konvolutChildren.values()) {
    for (const cid of children) childIds.add(cid);
  }

  // Standalone records (not children of any Konvolut) + nur bearbeitete.
  const standalone = store.allRecords.filter(r =>
    !childIds.has(r['@id'])
    && !store.unprocessedIds.has(r['@id'])
    && !EXCLUDED_DFT.has(getDocTypeId(r))
  );

  // Merge standalone records + Konvolut RecordSets into one sorted list
  const topEntries = [];
  for (const record of standalone) {
    topEntries.push({ sig: record['rico:identifier'] || '', record, type: 'record' });
  }
  for (const [kid, konvolut] of store.konvolute) {
    topEntries.push({ sig: konvolut['rico:identifier'] || '', record: konvolut, type: 'konvolut', konvolutId: kid });
  }
  topEntries.sort((a, b) => naturalSort(a.sig, b.sig));

  // Build flat list: Konvolute get their children injected after them.
  // Leitprinzip "nur bearbeitet" gilt auch innerhalb von Konvoluten:
  // Folios ohne Verknuepfungen (unprocessedIds) werden ausgeblendet.
  // Faellt ein Konvolut dadurch auf 0 Kinder zurueck, verschwindet auch
  // der Header -- Transparenz ueber den Gesamtbestand kommt aus dem
  // Quality-Snapshot, nicht aus Platzhaltern in der Liste.
  for (const entry of topEntries) {
    if (entry.type === 'konvolut') {
      const meta = store.konvolutMeta.get(entry.konvolutId);
      if ((meta?.totalLinks ?? 0) === 0) continue;  // leere Konvolute raus
      const children = (store.konvolutChildren.get(entry.konvolutId) || [])
        .filter(cid => !store.folioIds.has(cid))
        .filter(cid => !store.unprocessedIds.has(cid))
        .map(cid => store.records.get(cid))
        .filter(Boolean)
        .sort((a, b) => naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || ''));
      if (children.length === 0) continue;  // keine bearbeiteten Kinder -> raus
      items.push({
        record: entry.record,
        isKonvolut: true,
        konvolutId: entry.konvolutId,
        visibleChildCount: children.length,
      });
      for (const child of children) {
        items.push({ record: child, isChild: true, konvolutId: entry.konvolutId });
      }
    } else {
      items.push({ record: entry.record });
    }
  }

  return items;
}

function sortFn(a, b, sort) {
  switch (sort) {
    case 'titel': {
      const ta = (a['rico:title'] || '').toLowerCase();
      const tb = (b['rico:title'] || '').toLowerCase();
      return ta.localeCompare(tb, 'de');
    }
    case 'datum': {
      const ya = extractYear(a['rico:date']) || 9999;
      const yb = extractYear(b['rico:date']) || 9999;
      return ya - yb;
    }
    case 'typ': {
      const ta = getDocTypeId(a) || 'zzz';
      const tb = getDocTypeId(b) || 'zzz';
      return ta.localeCompare(tb, 'de-DE');
    }
    case 'links':
      return countLinks(b) - countLinks(a);
    default:
      return naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || '');
  }
}

function renderRows(items) {
  currentItems = items;
  const tbody = document.getElementById('bestand-tbody');
  if (!tbody) return;
  clear(tbody);

  for (const item of items) {
    const r = item.record;
    const sig = formatSignatur(r['rico:identifier']);
    const links = countLinks(r);
    const year = extractYear(r['rico:date']);
    const docType = getDocTypeId(r);
    const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';
    const recordId = r['@id'];

    let rowClass = '';
    if (item.isKonvolut) rowClass = 'archiv-row--konvolut';
    else if (item.isChild) {
      rowClass = 'archiv-row--child';
      if (!expandedKonvolute.has(item.konvolutId)) rowClass += ' archiv-row--hidden';
    }

    if (expandedRecord === recordId) rowClass += ' archiv-row--active';

    const sigContent = [];
    if (item.isKonvolut) {
      const expanded = expandedKonvolute.has(item.konvolutId);
      const toggle = el('button', {
        className: `konvolut-toggle ${expanded ? '' : 'collapsed'}`,
        'aria-label': expanded ? 'Objekte einklappen' : 'Objekte aufklappen',
        'aria-expanded': String(expanded),
        onClick: (e) => {
          e.stopPropagation();
          toggleKonvolut(item.konvolutId);
        },
        html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
      });
      sigContent.push(toggle);
    }

    const meta = item.isKonvolut ? store.konvolutMeta.get(item.konvolutId) : null;
    // Badge zeigt die Anzahl *sichtbarer* bearbeiteter Kinder, nicht die
    // rohe meta.childCount -- sonst driftet Badge vs. Tabellenzeilen.
    const childCount = item.visibleChildCount ?? (meta ? meta.childCount : 0);

    // Signatur: children show only folio part
    const displaySig = item.isChild
      ? formatChildSignatur(r['rico:identifier'], store.konvolute.get(item.konvolutId)?.['rico:identifier'])
      : sig;

    // Title: Konvolute use derived title from Folio record.
    // Kinder, deren Titel identisch zum Konvolut-Titel ist (typisch bei
    // Programmheft-Konvoluten mit geerbtem Sammeltitel), zeigen leere
    // Titel-Zelle -- semantisches Rauschen vermeiden, der Kontext steht
    // im Konvolut-Header.
    let displayTitle;
    if (item.isKonvolut) {
      displayTitle = meta?.title || r['rico:identifier'] || '';
    } else if (item.isChild) {
      const childTitle = r['rico:title'] || '';
      const parentTitle = store.konvolutMeta.get(item.konvolutId)?.title || '';
      displayTitle = (childTitle && childTitle === parentTitle) ? '' : (childTitle || '');
    } else {
      displayTitle = r['rico:title'] || '(ohne Titel)';
    }

    // Date: Konvolute show date range from children, Records show formatted date
    const displayDate = item.isKonvolut
      ? (meta?.dateDisplay || '')
      : (formatDate(r['rico:date']) || 'o.\u2009D.');
    const isUndated = !item.isKonvolut && !r['rico:date'];

    // Links: Konvolute show total with tooltip summary, Records show count or dash
    let linksDisplay, hasLinks, linksTooltip = '';
    if (item.isKonvolut) {
      const totalLinks = meta?.totalLinks || 0;
      linksDisplay = String(totalLinks);
      hasLinks = totalLinks > 0;
      linksTooltip = buildKonvolutTooltip(item.konvolutId);
    } else {
      linksDisplay = links > 0 ? String(links) : '\u00b7';
      hasLinks = links > 0;
      if (links > 0) linksTooltip = buildRecordTooltip(r);
    }

    const tr = el('tr', {
      className: rowClass,
      onClick: () => item.isKonvolut ? toggleKonvolut(item.konvolutId) : toggleRecordInline(recordId),
    },
      el('td', { className: 'archiv-col-signatur' },
        ...sigContent,
        el('span', { className: 'archiv-signatur' }, displaySig)
      ),
      el('td', { className: 'archiv-col-titel' },
        el('span', {
          className: 'archiv-titel',
          dataset: displayTitle.length > 80 ? { tip: displayTitle, tipWrap: '', tipPos: 'bottom-left' } : {},
        }, truncate(displayTitle, 80)),
        item.isChild ? (() => {
          const hint = getFolioHint(r, item.konvolutId);
          return hint ? el('span', { className: 'archiv-folio-hint' }, hint) : null;
        })() : null,
        item.isKonvolut ? buildKonvolutChips(meta, item.visibleChildCount) : null,
      ),
      el('td', { className: 'archiv-col-typ' },
        item.isKonvolut
          ? el('span', { className: 'badge badge--konvolut-struct', dataset: { tip: `Enth\u00e4lt ${childCount} Objekte` } }, `Konvolut (${childCount})`)
          : item.isChild
            ? (docLabel && docType !== 'konvolut'
              ? el('span', { className: `badge badge--${docType || ''}` }, docLabel)
              : el('span', { className: 'badge badge--unclassified' }, 'Nicht klassifiziert'))
            : isStandaloneKonvolut(r)
              ? el('span', { className: 'badge badge--konvolut-struct', dataset: { tip: 'Noch nicht in Einzelobjekte aufgel\u00f6st' } }, 'Konvolut')
              : (docLabel
                ? el('span', { className: `badge badge--${docType || ''}` }, docLabel)
                : el('span', { className: 'badge badge--unclassified' }, 'Nicht klassifiziert'))
      ),
      el('td', { className: 'archiv-col-datum' },
        el('span', {
          className: `archiv-datum ${isUndated ? 'archiv-datum--undated' : ''}`,
          dataset: isUndated ? { tip: 'Ohne Datumsangabe in der Quelle' } : {},
        }, displayDate)
      ),
      el('td', { className: 'archiv-col-links' },
        el('span', {
          className: `archiv-links ${hasLinks ? 'archiv-links--has-links' : 'archiv-links--zero'}`,
          dataset: linksTooltip ? { tip: linksTooltip, tipWrap: '' } : {},
        }, linksDisplay),
        !item.isKonvolut ? buildBookmarkBtn(recordId) : null,
      ),
    );
    tbody.appendChild(tr);

    // Inline detail expansion
    if (expandedRecord === recordId) {
      const detailTr = el('tr', { className: 'archiv-row--detail' });
      const detailTd = el('td', { colspan: '5' });
      detailTd.appendChild(buildInlineDetail(r, store, {
        onClose: () => { expandedRecord = null; renderRows(currentItems); },
      }));
      detailTr.appendChild(detailTd);
      tbody.appendChild(detailTr);
    }
  }
}

function toggleRecordInline(recordId) {
  expandedRecord = expandedRecord === recordId ? null : recordId;
  renderRows(currentItems);
}

function toggleKonvolut(konvolutId) {
  if (expandedKonvolute.has(konvolutId)) {
    expandedKonvolute.delete(konvolutId);
  } else {
    expandedKonvolute.add(konvolutId);
  }
  renderRows(currentItems);
}

/**
 * Meta-Chips unter dem Konvolut-Titel: Top-3-Dokumenttypen + Status-Mix.
 * Gibt die aggregierten Statistiken aus store.konvolutMeta direkt sichtbar,
 * ohne dass die Konvolut-Zeile aufgeklappt werden muss.
 */
function buildKonvolutChips(meta, visibleChildCount) {
  if (!meta) return null;
  const chips = [];

  // Top-3-DocType-Chips (absteigend nach Count, Plakat/Tontraeger werden
  // im Bestand-Tab sowieso ausgeblendet -> hier nicht mit abgebildet).
  // Wenn mehr als 3 Typen existieren, wird ein "+N weitere"-Chip angehaengt.
  if (meta.docTypeCounts && meta.docTypeCounts.size > 0) {
    const all = [...meta.docTypeCounts.entries()]
      .filter(([dft]) => !['plakat', 'tontraeger'].includes(dft))
      .sort((a, b) => b[1] - a[1]);
    const top = all.slice(0, 3);
    for (const [dft, count] of top) {
      const label = DOKUMENTTYP_LABELS[dft] || dft;
      chips.push(el('span', {
        className: 'chip chip--compact',
        dataset: { tip: `${count}\u00d7 ${label}` },
      }, `${count}\u00d7\u00a0${label}`));
    }
    const restTypes = all.slice(3);
    if (restTypes.length > 0) {
      const restCount = restTypes.reduce((sum, [, c]) => sum + c, 0);
      const tipLines = restTypes
        .map(([dft, c]) => `${c}\u00d7 ${DOKUMENTTYP_LABELS[dft] || dft}`)
        .join(' \u00b7 ');
      chips.push(el('span', {
        className: 'chip chip--compact chip--rest',
        dataset: { tip: tipLines },
      }, `+${restCount}\u00a0weitere`));
    }
  }

  // Status-Mix als dezenter Untertitel (nur wenn mehrere Stufen).
  const statusParts = [];
  if (meta.statusCounts && meta.statusCounts.size > 0) {
    const ordered = ['abgeschlossen', 'begonnen', 'zurueckgestellt'];
    for (const st of ordered) {
      const n = meta.statusCounts.get(st);
      if (n) statusParts.push(`${n}\u00a0${st}`);
    }
  }

  const container = el('span', { className: 'archiv-konvolut-meta' },
    ...chips,
    statusParts.length
      ? el('span', { className: 'archiv-konvolut-status' },
          statusParts.join(' \u00b7 '))
      : null,
  );
  return container;
}

function naturalSort(a, b) {
  return a.localeCompare(b, 'de-DE', { numeric: true, sensitivity: 'base' });
}

/**
 * Sortiert Kinder innerhalb jedes Konvoluts nach currentSortKey/sortDir,
 * laesst Konvolut-Header und Standalone-Records an ihrer Position.
 * Das bewahrt die archivische Hierarchie auch bei Sortierung.
 */
function sortChildrenWithinKonvolute(items) {
  const result = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (!item.isKonvolut) {
      result.push(item);
      i++;
      continue;
    }
    result.push(item);
    i++;
    // Sammle alle Kinder direkt nach dem Konvolut-Header.
    const children = [];
    while (i < items.length && items[i].isChild && items[i].konvolutId === item.konvolutId) {
      children.push(items[i]);
      i++;
    }
    children.sort((a, b) => sortFn(a.record, b.record, currentSortKey) * sortDir);
    result.push(...children);
  }
  return result;
}

/** Top-level Hauptbestand records are archival units (Konvolute), not single items.
 *  Plakate (NIM/PL_) and Tonträger (NIM_TT_) are actual single items. */
function isStandaloneKonvolut(record) {
  const sig = record['rico:identifier'] || '';
  if (sig.includes('/PL_') || sig.includes('_TT_')) return false;
  return true;
}

/**
 * For child records with duplicate titles within a Konvolut,
 * return a short distinguishing hint from the first verknüpfung.
 */
function getFolioHint(record, konvolutId) {
  if (!konvolutId) return null;
  const siblings = (store.konvolutChildren.get(konvolutId) || [])
    .filter(cid => !store.folioIds.has(cid))
    .map(cid => store.records.get(cid))
    .filter(Boolean);

  const title = record['rico:title'] || '';
  const dupes = siblings.filter(s => (s['rico:title'] || '') === title);
  if (dupes.length <= 1) return null;

  // Try agents, then mentioned persons (in subjects), then locations
  const agents = ensureArray(record['m3gim:hasAssociatedAgent']);
  if (agents.length > 0) {
    const name = agents[0].name || agents[0]['skos:prefLabel'] || '';
    if (name) return name;
  }
  const mentionedPersons = ensureArray(record['rico:hasOrHadSubject'])
    .filter(s => s['@type'] === 'rico:Person');
  if (mentionedPersons.length > 0) {
    const name = mentionedPersons[0].name || mentionedPersons[0]['skos:prefLabel'] || '';
    if (name) return name;
  }
  const locs = ensureArray(record['rico:hasOrHadLocation']);
  if (locs.length > 0) {
    const name = locs[0].name || locs[0]['skos:prefLabel'] || '';
    if (name) return name;
  }
  return null;
}

const BOOKMARK_SVG_EMPTY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';
const BOOKMARK_SVG_FILLED = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';

function buildRecordTooltip(record) {
  const agents = ensureArray(record['m3gim:hasAssociatedAgent']);
  const subjects = ensureArray(record['rico:hasOrHadSubject']);
  const mentionedPersons = subjects.filter(s => s['@type'] === 'rico:Person');
  const works = subjects.filter(s => s['@type'] === 'm3gim:MusicalWork');
  const locs = ensureArray(record['rico:hasOrHadLocation'])
    .filter(l => !/^\d{4}/.test(l.name || l['skos:prefLabel'] || ''));
  const parts = [];
  const personCount = agents.length + mentionedPersons.length;
  if (personCount > 0) parts.push(`${personCount} Person${personCount > 1 ? 'en' : ''}`);
  if (locs.length > 0) parts.push(`${locs.length} Ort${locs.length > 1 ? 'e' : ''}`);
  if (works.length > 0) parts.push(`${works.length} Werk${works.length > 1 ? 'e' : ''}`);
  return parts.join(', ');
}

function buildKonvolutTooltip(konvolutId) {
  const childIds = (store.konvolutChildren.get(konvolutId) || []).filter(cid => !store.folioIds.has(cid));
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

  const parts = [];
  if (agentCounts.size > 0) {
    const top = [...agentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    parts.push(`Personen: ${top.join(', ')}`);
  }
  if (locationCounts.size > 0) {
    const top = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    parts.push(`Orte: ${top.join(', ')}`);
  }
  return parts.join('\n');
}

function buildBookmarkBtn(recordId) {
  const active = isInKorb(recordId);
  return el('button', {
    className: `bookmark-btn ${active ? 'bookmark-btn--active' : ''}`,
    title: active ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzuf\u00fcgen',
    html: active ? BOOKMARK_SVG_FILLED : BOOKMARK_SVG_EMPTY,
    onClick: (e) => {
      e.stopPropagation();
      toggleKorb(recordId);
      renderRows(currentItems);
    },
  });
}

/** Programmatically expand a record's inline detail (used by cross-navigation). */
export function expandRecord(recordId) {
  if (!recordId || !store) return;
  expandedRecord = recordId;
  renderRows(currentItems);
  // Scroll to the expanded row
  requestAnimationFrame(() => {
    const row = document.querySelector('.archiv-row--detail');
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/** Navigate to a record in the Bestand view (used by Korb-Bookmark-Klick). */
export function selectArchivRecord(recordId) {
  if (!recordId || !store) return;
  expandRecord(recordId);
}
