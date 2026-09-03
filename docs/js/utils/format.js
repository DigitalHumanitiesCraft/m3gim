/**
 * M³GIM Display Formatting Utilities
 */

/** Namespace of the controlled terms (document types and roles). */
const VOCAB_PREFIX = 'm3gim-vocab:';

/**
 * Readable label of a document type from the store (skos:prefLabel of the
 * concepts, supplied by the pipeline — E-101). Falls back to the short id
 * when no concept exists (or no store is passed).
 */
export function dftLabel(store, shortId) {
  if (!shortId) return '';
  const concept = store && store.dftHierarchy
    && store.dftHierarchy.get(VOCAB_PREFIX + shortId);
  return (concept && concept.prefLabel) || shortId;
}

/**
 * Concept id of a role value. The role sits in the model as a reference node
 * with `@id`; the contract status `nicht eingehalten` stays a literal and thus
 * has no id.
 * @param {Object|string|null} role - reference node, id or literal
 * @returns {?string}
 */
export function roleIdOf(role) {
  if (!role) return null;
  if (typeof role === 'object') return role['@id'] || null;
  return String(role).startsWith(VOCAB_PREFIX) ? String(role) : null;
}

/**
 * Raw form of a role value, as the Erschliessung set it. Statistics names
 * unclassified roles by name and needs the raw form, not the display form.
 * @param {Object|string|null} role
 * @returns {?string}
 */
export function roleToken(role) {
  if (!role) return null;
  if (typeof role === 'object') {
    return role['skos:prefLabel'] || (role['@id'] || '').split(':').pop() || null;
  }
  const s = String(role);
  return s.startsWith(VOCAB_PREFIX) ? s.slice(VOCAB_PREFIX.length) : s;
}

/**
 * Display form of a role. The label comes from the data: the pipeline carries
 * `skos:prefLabel` on the role reference node, the loader stores it in
 * `store.roleVocab`. No hand-map for role names in code, as E-101 already
 * removed it for document types.
 *
 * Takes the reference node, the bare id or a literal. Falls back to the local
 * name of the id; a literal is its own display form.
 * @param {Object} store
 * @param {Object|string|null} role
 * @returns {string}
 */
export function roleLabel(store, role) {
  if (!role) return '';
  const id = roleIdOf(role);
  if (!id) return roleToken(role) || '';
  const entry = store && store.roleVocab && store.roleVocab.get(id);
  if (entry && entry.label) return entry.label;
  return roleToken(role) || id;
}

/** Extract the short part of a signatur (e.g. "UAKUG/NIM_003 1_1" → "NIM_003 1_1"). */
export function formatSignatur(identifier) {
  if (!identifier) return '';
  return identifier.replace('UAKUG/', '');
}

/**
 * City level of an (optionally address-precise) place name: the part before
 * the first comma. "Zürich, Zürichbergstrasse 104" → "Zürich"; "Wien" → "Wien".
 * Serves conservative city grouping against place-name fragmentation
 * (address-precise strings from the E-97 place roles, which otherwise split
 * filter recall and top-place counts). Display/index helper only — the root
 * (place index without city/Q-id level) stays a data ticket.
 */
export function cityOf(name) {
  if (!name) return name;
  const s = String(name);
  const i = s.indexOf(',');
  return (i === -1 ? s : s.slice(0, i)).trim();
}

/** Folio number of a child under its Konvolut head ("UAKUG/NIM_003 1_1" → "1.1");
 *  the head and the indent carry the context, so no prefix (Projektleitung, 2026-09-03). */
export function formatChildSignatur(identifier, parentIdentifier) {
  if (!identifier || !parentIdentifier) return formatSignatur(identifier);
  const sig = formatSignatur(identifier);
  const parentSig = formatSignatur(parentIdentifier);
  if (sig.startsWith(parentSig + ' ')) {
    const nr = sig.slice(parentSig.length + 1).replace(/_/g, '.');
    return nr;
  }
  return sig;
}

/** Get document type ID from a RiC-O documentaryFormType. */
export function getDocTypeId(record) {
  const dft = record['rico:hasDocumentaryFormType'];
  if (!dft) return null;
  const id = typeof dft === 'object' ? dft['@id'] : dft;
  return id ? id.replace(VOCAB_PREFIX, '') : null;
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

/** Pull a Wikidata Q-id from a value ("wd:Q42" -> "wd:Q42", else null). */
export function asWikidataId(value) {
  return value && String(value).startsWith('wd:') ? value : null;
}

/**
 * Display name of a JSON-LD subobject: name -> skos:prefLabel -> fallback.
 * @id is deliberately NOT included automatically; call sites that want it as
 * fallback pass it as the fallback argument.
 */
export function entityName(obj, fallback = '') {
  if (!obj) return fallback;
  return obj.name || obj['skos:prefLabel'] || fallback;
}

/** Count linked entities on a record. */
export function countLinks(record) {
  let count = 0;
  count += ensureArray(record['m3gim-ontology:hasAssociatedAgent']).length;
  count += ensureArray(record['rico:hasOrHadLocation']).length;
  count += ensureArray(record['rico:hasOrHadSubject']).length;
  count += ensureArray(record['m3gim-ontology:hasAnnotation']).length;
  count += ensureArray(record['m3gim-ontology:hasPerformance']).length;
  return count;
}

/** Strip the prefix from a concept id ("m3gim-vocab:letter" -> "letter"). */
function stripConceptPrefix(id) {
  return typeof id === 'string' && id.startsWith(VOCAB_PREFIX)
    ? id.slice(VOCAB_PREFIX.length) : id;
}

/**
 * Build the DFT filter tree for the archive dropdown.
 * Returns an array of groups { id, label, children: [{id, label}, ...] }.
 * Top-level concepts ship as their own group with their children. Concepts
 * without broader and without children, plus any byDocType key absent from
 * dftHierarchy, land in a trailing "Sonstige" group. Short-form ids (without
 * the m3gim-vocab: prefix) stay consistent with getDocTypeId().
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
 * Return a set of all short ids matching the given filter: the concept itself
 * and all transitively reachable children. If the concept is absent from
 * dftHierarchy, only the input is returned (fallback for old free-text types).
 */
export function expandDftFilter(store, shortId) {
  const out = new Set();
  if (!shortId) return out;
  out.add(shortId);
  if (!store || !store.dftHierarchy) return out;
  const fullId = shortId.startsWith(VOCAB_PREFIX) ? shortId : `${VOCAB_PREFIX}${shortId}`;
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

/**
 * Explanatory sentence for a vocabulary term, used as UI title text. Sourced
 * from the vocabulary via the dataset (E-143); empty if the term carries no
 * definition.
 * @param {Object} store
 * @param {?string} shortIdOrCurie  'program' or 'm3gim-vocab:program'
 * @returns {string}
 */
export function glossOf(store, shortIdOrCurie) {
  if (!store || !store.conceptDefinitions || !shortIdOrCurie) return '';
  const id = String(shortIdOrCurie).startsWith(VOCAB_PREFIX)
    ? shortIdOrCurie
    : VOCAB_PREFIX + shortIdOrCurie;
  const entry = store.conceptDefinitions.get(id);
  return entry ? entry.definition : '';
}
