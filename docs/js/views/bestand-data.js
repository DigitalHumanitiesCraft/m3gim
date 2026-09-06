/**
 * Bestand — pure data layer.
 *
 * Row ordering and the badge decision of the Bestand table, free of
 * DOM and d3 so every rule stays unit-testable. bestand.js renders what these
 * functions decide, bestand-rows.js builds the cells.
 *
 * There is no scope rule left (E-162): the table carries the whole Bestand,
 * Plakate and Tontraeger included, and the Erschliessungsstand-Facette of the
 * shared filter decides what is on screen.
 */

import { getDocTypeId, countLinks } from '../utils/format.js';
import { primaryYear } from '../data/loader.js';
import { CONTENT_FAMILIES } from '../data/constants.js';
import { partitionRecord, folioPages, isFolioPage } from './record-detail-data.js';

/** Display name of an entity node, whichever of the two carriers it uses. */
function entityName(node) {
  return (node && (node.name || node['skos:prefLabel'])) || '';
}

/** Number of distinct names in a list, case- and whitespace-insensitive; empty
 *  names drop out. */
function distinctNames(names) {
  const seen = new Set();
  for (const raw of names) {
    const key = String(raw || '').trim().toLowerCase();
    if (key) seen.add(key);
  }
  return seen.size;
}

/** The entity names one record carries, per family, as raw lists. */
function familyNames(record, store) {
  const p = partitionRecord(record, store);
  return {
    // Beziehungen count into person: a relation without a person is a
    // per-mille case, and its own dot would carry almost no information.
    // Finanzen count nowhere, they are a field group of the detail rather than
    // an entity type.
    person: [
      ...p.bucket.produktion, ...p.bucket.mitwirkende,
      ...p.bucket.erwaehnt, ...p.bucket.weitere,
    ].map(entityName).concat(p.agentRelations.map(rel => rel.objectName)),
    institution: p.bucket.institutionen.map(entityName),
    // A Datierung without a place names no place, so eventDatings contribute
    // nothing; the Performance node carries no place either, and is read here
    // so it starts counting on its own once the model gives it one.
    ort: [
      ...p.events.map(e => e.place),
      ...p.performances.map(perf => perf.place),
      ...p.locations.map(entityName),
    ],
    // A Bühnenrolle is not a work, so performanceRoles count nothing.
    werk: p.works.map(entityName),
  };
}

/**
 * Content families of a record in CONTENT_FAMILIES order, from the same
 * partition the inline detail renders. DOM-free so the typed display of the
 * table stays testable.
 *
 * The number counts distinct entities, not link rows (Projektleitung,
 * 2026-09-04): a person named in two roles is one person, and a place carried
 * by an Ereignis and by `hasOrHadLocation` is one place. Otherwise the figure
 * beside the family icon answers "how often" where the reader asks "how many".
 *
 * A Folio without Verknuepfungen of its own counts over its pages instead, and
 * distinct across them all: the pages are the documents behind the one row the
 * Bestand shows for the sheet, and four empty icons would claim the sheet is
 * uncatalogued while its pages are not. A Folio catalogued on its own keeps its
 * own figures.
 * @param {object} record
 * @param {object} store
 * @returns {Array<{key: string, label: string, count: number}>}
 */
export function familiesForRecord(record, store) {
  const pages = countLinks(record) === 0 ? folioPages(store, record) : [];
  const sources = pages.length > 0 ? pages : [record];
  const merged = { person: [], institution: [], ort: [], werk: [] };
  for (const source of sources) {
    const names = familyNames(source, store);
    for (const key of Object.keys(merged)) merged[key].push(...names[key]);
  }
  return CONTENT_FAMILIES.map(f => ({
    key: f.key, label: f.label, count: distinctNames(merged[f.key]),
  }));
}

/**
 * The documents a row stands for. A Folio row stands for its pages, every other
 * row only for itself; the Folio record itself stays in the list, so a Folio
 * catalogued on its own is not cut away by its pages. The cut of the Bestand
 * runs over this list, which is why a Folio row survives exactly as long as one
 * of its pages does (F8).
 * @param {{record: object, pages?: Array<object>}} item
 * @returns {Array<object>}
 */
export function rowRecords(item) {
  return item.pages && item.pages.length > 0
    ? [item.record, ...item.pages] : [item.record];
}

/** The Verknuepfungen a row stands for; a Folio row stands for its pages. */
function itemLinks(item) {
  const own = countLinks(item.record);
  if (own > 0) return own;
  return (item.pages || []).reduce((sum, page) => sum + countLinks(page), 0);
}

/** The one value a list of pages agrees on, null where they differ or none. */
function commonValue(values) {
  const first = values[0] || null;
  if (!first) return null;
  return values.every(v => v === first) ? first : null;
}

/**
 * The years of a list of pages as one span, in the form the Konvolut head
 * already uses. It is the fallback of the date cell where the pages are dated
 * differently: an empty cell would then read as "o. D." and say the opposite of
 * what the sheet holds. The years come from the Zeitanker of the data layer
 * (contract A4), so the span means the same dating the pages themselves show.
 * Null where no page carries a dating.
 */
function pagesSpan(store, pages) {
  const years = pages.map(page => primaryYear(store, page).year).filter(Boolean);
  if (years.length === 0) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} – ${max}`;
}

/**
 * Title, date and document type a Folio row takes from its pages where it
 * carries none of its own. A Folio the pipeline derived (E-269,
 * `derivedFolioRecord`) has neither, and a row answering "Nicht klassifiziert"
 * and "o. D." would state the opposite of what its pages hold. Only a value all
 * pages agree on is taken, so the row invents no distinction the material does
 * not carry; the view marks everything taken this way as supplemented.
 * The date is the exception: where the pages disagree, `dateSpan` carries their
 * extent, because a sheet whose pages are dated is not undated.
 * @returns {{title: ?string, date: ?string, dateSpan: ?string, docType: ?string}}
 *   empty fields for a row without pages
 */
export function folioRowFacts(store, item) {
  const pages = (item && item.pages) || [];
  const record = item ? item.record : null;
  if (pages.length === 0 || !record) {
    return { title: null, date: null, dateSpan: null, docType: null };
  }
  return {
    title: record['rico:title'] ? null : commonValue(pages.map(p => p['rico:title'])),
    date: record['rico:date'] ? null : commonValue(pages.map(p => p['rico:date'])),
    dateSpan: record['rico:date'] ? null : pagesSpan(store, pages),
    docType: getDocTypeId(record) ? null : commonValue(pages.map(getDocTypeId)),
  };
}

function naturalSort(a, b) {
  return a.localeCompare(b, 'de-DE', { numeric: true, sensitivity: 'base' });
}

/**
 * The rows of the table in archival order: Konvolut heads with their children
 * injected below them, standalone records interleaved by Signatur. Everything
 * the Bestand holds; the cut is the filter's business.
 *
 * The pages of a Folio are no rows of their own since B2. They travel on the
 * `pages` list of their Folio row, which the detail pages through; a Konvolut
 * that lists both its Folios and their pages as parts would otherwise show the
 * same sheet twice, once whole and once page by page.
 * @param {object} store
 * @returns {Array<{record: object, pages: Array<object>, isKonvolut?: boolean,
 *   isChild?: boolean, konvolutId?: string, visibleChildCount?: number,
 *   totalChildCount?: number, linkedChildCount?: number, titleShared?: boolean}>}
 */
export function getOrderedItems(store) {
  const items = [];
  const childIds = new Set();
  for (const children of store.konvolutChildren.values()) {
    for (const cid of children) childIds.add(cid);
  }

  // Standalone records: everything that is neither a child of a Konvolut nor a
  // page of a Folio.
  const standalone = store.allRecords.filter(
    r => !childIds.has(r['@id']) && !isFolioPage(store, r['@id']));

  // Merge standalone records + Konvolut RecordSets into one sorted list
  const topEntries = [];
  for (const record of standalone) {
    topEntries.push({ sig: record['rico:identifier'] || '', record, type: 'record' });
  }
  for (const [kid, konvolut] of store.konvolute) {
    topEntries.push({ sig: konvolut['rico:identifier'] || '', record: konvolut, type: 'konvolut', konvolutId: kid });
  }
  topEntries.sort((a, b) => naturalSort(a.sig, b.sig));

  // Build flat list: Konvolute get their children injected after them. A
  // Konvolut without a displayable child disappears with its head; unerschlossene
  // rows stay, greyed out in renderRows, so the Erschliessungsstand is visible
  // instead of hidden. Folios (pure metadata records) never appear.
  for (const entry of topEntries) {
    if (entry.type === 'konvolut') {
      const children = (store.konvolutChildren.get(entry.konvolutId) || [])
        .filter(cid => !store.folioIds.has(cid) && !isFolioPage(store, cid))
        .map(cid => store.records.get(cid))
        .filter(Boolean)
        .sort((a, b) => naturalSort(a['rico:identifier'] || '', b['rico:identifier'] || ''));
      if (children.length === 0) continue;  // nothing displayable left
      // Which titles really stand twice in the table. Counted over the rows, not
      // over the raw children: the pages of a Folio repeat its title and would
      // make every Folio row look ambiguous (see getFolioHint).
      const titleCounts = new Map();
      for (const child of children) {
        const title = child['rico:title'] || '';
        if (title) titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
      }
      const childItems = children.map(child => ({
        record: child,
        isChild: true,
        konvolutId: entry.konvolutId,
        pages: folioPages(store, child),
        titleShared: (titleCounts.get(child['rico:title'] || '') || 0) > 1,
      }));
      items.push({
        record: entry.record,
        isKonvolut: true,
        konvolutId: entry.konvolutId,
        pages: [],
        visibleChildCount: children.length,
        totalChildCount: children.length,
        linkedChildCount: childItems.filter(i => itemLinks(i) > 0).length,
      });
      items.push(...childItems);
    } else {
      items.push({ record: entry.record, pages: folioPages(store, entry.record) });
    }
  }

  return items;
}

/**
 * Drops Konvolut heads whose children all fell out of the cut and rewrites the
 * child count of the ones that remain. Without it a filtered hierarchy keeps
 * heads that promise rows the table no longer shows.
 * @param {Array<{isKonvolut?:boolean, isChild?:boolean, konvolutId?:string}>} items
 * @returns {Array}
 */
export function pruneEmptyKonvolute(items) {
  const kept = new Map();
  for (const item of items) {
    if (!item.isChild) continue;
    const tally = kept.get(item.konvolutId) || { total: 0, linked: 0 };
    tally.total += 1;
    if (itemLinks(item) > 0) tally.linked += 1;
    kept.set(item.konvolutId, tally);
  }
  return items
    .filter(item => !item.isKonvolut || kept.has(item.konvolutId))
    .map(item => (item.isKonvolut
      ? {
        ...item,
        visibleChildCount: kept.get(item.konvolutId).total,
        linkedChildCount: kept.get(item.konvolutId).linked,
      }
      : item));
}

/**
 * Undated marker of a row. Undated means the record carries no Zeitanker at
 * all: neither `rico:date` nor a derived anchoring Datierung (contract A4,
 * primaryYear). Without a store only the carrier `rico:date` can be read, so
 * the caller in the view always passes one. Konvolut heads never carry the
 * marker, their span comes from konvolutMeta.
 * @param {{record: object, isKonvolut?: boolean}} item
 * @param {Object} [store]
 * @returns {boolean}
 */
export function isUndatedItem(item, store) {
  if (item.isKonvolut) return false;
  if (item.record['rico:date']) return false;
  // A Folio row shows the dating of its pages, so it is undated only when
  // neither it nor one of its pages carries an anchor (folioRowFacts). Without
  // a store only the carrier `rico:date` is readable, here as there.
  const pages = item.pages || [];
  if (!store) return !pages.some(page => page['rico:date']);
  if (pages.some(page => primaryYear(store, page).year != null)) return false;
  return primaryYear(store, item.record).year == null;
}

/** A top-level Hauptbestand record without Folio resolution is an archival
 *  unit (Konvolut), not a single item. The pipeline states this as
 *  unresolvedAggregate (E-168); Plakate and Tonträger never carry it. */
export function isStandaloneKonvolut(record) {
  return record['m3gim-ontology:unresolvedAggregate'] === true;
}

/**
 * Flattens the hierarchy for the filtered mode: Konvolut heads drop out, child
 * rows keep their `isChild`/`konvolutId` marks. Without the marks renderRows
 * treats children as standalone records and the Konvolut badge displaces their
 * real document type. Pure, so the badge decision stays testable.
 * @param {Array<{isKonvolut?:boolean, isChild?:boolean}>} items
 * @returns {Array}
 */
export function flattenForFilter(items) {
  return items
    .filter(item => !item.isKonvolut)
    .map(item => item.isChild ? { ...item, flattened: true } : item);
}

/**
 * Which badge a row carries, decided from the item alone so the rule is testable
 * without a DOM.
 *   - konvolut-struct     : Konvolut head
 *   - doctype             : real document type badge
 *   - unclassified        : child without a type, or typed 'konvolut'
 *   - standalone-konvolut : top-level collective row not yet resolved
 * @param {{isKonvolut?:boolean, isChild?:boolean}} item
 * @param {object} record
 * @param {string} docLabel
 * @param {(r:object)=>boolean} isStandalone
 * @returns {'konvolut-struct'|'doctype'|'unclassified'|'standalone-konvolut'}
 */
export function badgeKindForItem(item, record, docLabel, isStandalone) {
  if (item.isKonvolut) return 'konvolut-struct';
  if (item.isChild) {
    return (docLabel && getDocTypeId(record) !== 'konvolut') ? 'doctype' : 'unclassified';
  }
  if (isStandalone(record)) return 'standalone-konvolut';
  return docLabel ? 'doctype' : 'unclassified';
}

/**
 * Children of a collapsed Konvolut drop out of the rows. The head keeps the
 * counts pruneEmptyKonvolute wrote, so a closed Konvolut still says how much it
 * holds. Only for the structural view; the flattened filter mode has no heads.
 * @param {Array} items
 * @param {Set<string>} openIds
 * @returns {Array}
 */
export function applyCollapse(items, openIds) {
  return items.filter(item => !item.isChild || openIds.has(item.konvolutId));
}

/**
 * Whether the table opens its first Konvolut by itself. Without it the Bestand
 * greets the reader as a bare list of heads with no object in sight. A filter,
 * a free-text search or a deep link already say what to look at, so nothing
 * opens on its own there, and once the reader has opened or closed a head, the
 * reading state is theirs (user-story audit 2026-09-03).
 * @param {{filtered?: boolean, search?: string, deepLink?: boolean,
 *   userToggled?: boolean}} state
 * @returns {boolean}
 */
export function shouldAutoOpenFirstKonvolut(state = {}) {
  if (state.filtered || state.deepLink || state.userToggled) return false;
  return String(state.search || '').trim() === '';
}

/** First Konvolut head of an item list that already stands in Signatur order. */
export function firstKonvolutId(items) {
  const head = (items || []).find(item => item.isKonvolut);
  return head ? head.konvolutId : null;
}

/**
 * Tooltip lines for a Konvolut head: per content family how many of its visible
 * children carry it. Aggregating over the child rows rather than the raw meta
 * keeps the numbers aligned with the cut the table shows.
 * @param {object} store
 * @param {Array<{record: object}>} childItems
 * @returns {string}
 */
export function konvolutFamilyTip(store, childItems) {
  const counts = new Map(CONTENT_FAMILIES.map(f => [f.key, 0]));
  for (const child of childItems) {
    for (const family of familiesForRecord(child.record, store)) {
      if (family.count > 0) counts.set(family.key, counts.get(family.key) + 1);
    }
  }
  const total = childItems.length;
  return CONTENT_FAMILIES
    .map(f => `${f.label} ${counts.get(f.key)} von ${total}`)
    .join('\n');
}

/** Attaches the family tooltip lines before collapsing removes child rows. */
export function annotateKonvolutHeadTips(store, items) {
  const byKonvolut = new Map();
  for (const item of items) {
    if (!item.isChild) continue;
    const list = byKonvolut.get(item.konvolutId) || [];
    list.push(item);
    byKonvolut.set(item.konvolutId, list);
  }
  return items.map(item => (item.isKonvolut
    ? { ...item, familyTip: konvolutFamilyTip(store, byKonvolut.get(item.konvolutId) || []) }
    : item));
}

/**
 * A child date that only repeats the Konvolut date carries nothing and stays
 * empty. Only a Konvolut dated to a single year makes that judgement; over a
 * span the child year is the information (Projektleitung, 2026-09-03).
 */
export function isRedundantChildDate(childDisplay, konvolutDisplay) {
  return /^\d{4}$/.test(konvolutDisplay || '') && childDisplay === konvolutDisplay;
}

/** The Konvolut a record hangs in, for the deep link that must open it. */
export function konvolutIdOfRecord(store, recordId) {
  for (const [kid, children] of store.konvolutChildren) {
    if (children.includes(recordId)) return kid;
  }
  return null;
}
