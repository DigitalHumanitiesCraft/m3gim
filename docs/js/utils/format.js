/**
 * M³GIM Display Formatting Utilities
 */

/**
 * Lesbares Label eines Dokumenttyps aus dem Store (skos:prefLabel der
 * dft-Concepts, von der Pipeline geliefert — E-101). Loest die frühere
 * Hand-Map DOKUMENTTYP_LABELS ab. Fallback auf die Short-Id, wenn kein
 * Concept vorliegt (oder kein Store übergeben wird).
 */
export function dftLabel(store, shortId) {
  if (!shortId) return '';
  const concept = store && store.dftHierarchy
    && store.dftHierarchy.get('m3gim-dft:' + shortId);
  return (concept && concept.prefLabel) || shortId;
}

/** Extract the short part of a signatur (e.g. "UAKUG/NIM_003 1_1" → "NIM_003 1_1"). */
export function formatSignatur(identifier) {
  if (!identifier) return '';
  return identifier.replace('UAKUG/', '');
}

/** Format a child signatur showing only the piece number (e.g. "UAKUG/NIM_003 1_1" → "Nr. 1.1"). */
export function formatChildSignatur(identifier, parentIdentifier) {
  if (!identifier || !parentIdentifier) return formatSignatur(identifier);
  const sig = formatSignatur(identifier);
  const parentSig = formatSignatur(parentIdentifier);
  if (sig.startsWith(parentSig + ' ')) {
    const nr = sig.slice(parentSig.length + 1).replace(/_/g, '.');
    return 'Nr.\u2009' + nr;
  }
  return sig;
}

/** Get document type ID from a RiC-O documentaryFormType. */
export function getDocTypeId(record) {
  const dft = record['rico:hasDocumentaryFormType'];
  if (!dft) return null;
  const id = typeof dft === 'object' ? dft['@id'] : dft;
  return id ? id.replace('m3gim-dft:', '') : null;
}

/** Get human-readable label for a document type (store-backed prefLabel). */
export function formatDocType(record, store) {
  const typeId = getDocTypeId(record);
  if (!typeId) return '';
  return dftLabel(store, typeId);
}

/** Ensure a value is always an array. */
export function ensureArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/** Wikidata-Q-ID aus einem Wert ziehen ("wd:Q42" -> "wd:Q42", sonst null). */
export function asWikidataId(value) {
  return value && String(value).startsWith('wd:') ? value : null;
}

/** Ob ein Wert eine Wikidata-Q-ID ("wd:...") ist. */
export function isWikidataId(value) {
  return !!value && String(value).startsWith('wd:');
}

/**
 * Anzeigename eines JSON-LD-Subobjekts: name -> skos:prefLabel -> fallback.
 * @id wird bewusst NICHT automatisch eingereiht; Call-Sites, die ihn als
 * Fallback wollen, uebergeben ihn als fallback-Argument.
 */
export function entityName(obj, fallback = '') {
  if (!obj) return fallback;
  return obj.name || obj['skos:prefLabel'] || fallback;
}

/** IDs -> Records aus dem Store aufloesen, fehlende ausfiltern. */
export function resolveRecords(store, ids) {
  const out = [];
  for (const id of ids) {
    const r = store.records.get(id);
    if (r) out.push(r);
  }
  return out;
}

/** Count linked entities on a record. */
export function countLinks(record) {
  let count = 0;
  count += ensureArray(record['m3gim:hasAssociatedAgent']).length;
  count += ensureArray(record['rico:hasOrHadLocation']).length;
  count += ensureArray(record['rico:hasOrHadSubject']).length;
  count += ensureArray(record['m3gim:hasDatedEvent']).length;
  count += ensureArray(record['m3gim:hasPerformance']).length;
  return count;
}

/**
 * Extrahiert den Short-Id aus einer Concept-ID (strippt das Prefix).
 * Beispiel: "m3gim-dft:brief" -> "brief".
 */
function stripConceptPrefix(id) {
  return typeof id === 'string' ? id.replace(/^m3gim-dft:/, '') : id;
}

/**
 * Baut den DFT-Filterbaum fuer das Archiv-Dropdown.
 * Rueckgabe: Array von Gruppen.
 * Top-Level-Concepts werden mit ihren Kindern als eigene Gruppe ausgeliefert
 * (Gruppe { id, label, children: [{id, label}, ...] }). Concepts ohne
 * Broader + ohne Kinder sowie alle byDocType-Schluessel, die gar nicht
 * in dftHierarchy auftauchen, landen in einer abschliessenden Gruppe
 * "Sonstige". Short-Form-IDs (ohne m3gim-dft:-Prefix) bleiben konsistent
 * zu getDocTypeId().
 */
export function buildDftTree(store) {
  if (!store || !store.dftHierarchy) return [];
  const hierarchy = store.dftHierarchy;
  const byDocType = store.byDocType || new Map();

  const groups = [];
  const taken = new Set();

  for (const [cid, concept] of hierarchy) {
    if (concept.broader) continue;
    if (concept.children.length === 0) continue;
    const shortId = stripConceptPrefix(cid);
    const children = concept.children.map((childCid) => {
      const child = hierarchy.get(childCid);
      const childShort = stripConceptPrefix(childCid);
      taken.add(childShort);
      return { id: childShort, label: (child && child.prefLabel) || childShort };
    }).sort((a, b) => a.label.localeCompare(b.label, 'de-DE'));
    taken.add(shortId);
    groups.push({ id: shortId, label: concept.prefLabel || shortId, children });
  }
  groups.sort((a, b) => a.label.localeCompare(b.label, 'de-DE'));

  const sonstige = [];
  for (const [cid, concept] of hierarchy) {
    if (concept.broader) continue;
    if (concept.children.length > 0) continue;
    const shortId = stripConceptPrefix(cid);
    if (taken.has(shortId)) continue;
    if (!byDocType.has(shortId)) continue;
    taken.add(shortId);
    sonstige.push({ id: shortId, label: concept.prefLabel || shortId });
  }
  for (const typeId of byDocType.keys()) {
    if (taken.has(typeId)) continue;
    if (typeId === 'konvolut') continue;
    sonstige.push({ id: typeId, label: typeId });
  }
  sonstige.sort((a, b) => a.label.localeCompare(b.label, 'de-DE'));
  if (sonstige.length > 0) {
    groups.push({ id: '__sonstige__', label: 'Sonstige', children: sonstige });
  }
  return groups;
}

/**
 * Gibt ein Set aller Short-Ids zurueck, die fuer den gegebenen Filter
 * passend sind. Enthaelt den gesuchten Concept selbst und alle transitiv
 * erreichbaren Kinder. Wenn der Concept nicht in dftHierarchy existiert,
 * wird nur die Eingabe zurueckgegeben (Fallback fuer alte Freitext-Typen).
 */
export function expandDftFilter(store, shortId) {
  const out = new Set();
  if (!shortId) return out;
  out.add(shortId);
  if (!store || !store.dftHierarchy) return out;
  const fullId = shortId.startsWith('m3gim-dft:') ? shortId : `m3gim-dft:${shortId}`;
  const queue = [fullId];
  while (queue.length > 0) {
    const cur = queue.shift();
    const concept = store.dftHierarchy.get(cur);
    if (!concept) continue;
    for (const childCid of concept.children) {
      out.add(stripConceptPrefix(childCid));
      queue.push(childCid);
    }
  }
  return out;
}

/** Truncate a string with ellipsis. */
export function truncate(str, maxLen = 80) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen - 1) + '\u2026';
}
