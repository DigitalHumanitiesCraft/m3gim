/**
 * Canonical typed predicates beside the legacy shared facets.
 *
 * Predicates are immutable values. Normalization removes order and duplicate
 * differences, which lets state, URL and history compare their meaning rather
 * than the object instances supplied by a control.
 */

export const PREDICATE_TYPES = Object.freeze({
  ENTITY_ROLE: 'entity-role',
  RECORDS: 'records',
  SET_MEMBERSHIP: 'set-membership',
  INVALID: 'invalid',
});

export const BOUND_ENTITY_FAMILIES = Object.freeze([
  'ort', 'person', 'institution',
]);

const SET_FACETS = new Set([
  'ort', 'person', 'werk', 'institution', 'ensemble', 'ereignis',
  'docType', 'finanzen', 'verknuepfung', 'land',
]);

/** @param {unknown} value @returns {string[]} */
function strings(value) {
  const source = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(source
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
}

function comparableInput(value) {
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(comparableInput);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map(key => [key, comparableInput(value[key])]));
  }
  return String(value);
}

function invalid(reason, input) {
  return deepFreeze({
    type: PREDICATE_TYPES.INVALID,
    reason,
    input: comparableInput(input),
  });
}

function normalizeMembers(value) {
  if (!Array.isArray(value)) return null;
  const members = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const facet = typeof item.facet === 'string' ? item.facet.trim() : '';
    const memberValue = typeof item.value === 'string' ? item.value.trim() : '';
    if (!SET_FACETS.has(facet) || !memberValue) return null;
    members.push({ facet, value: memberValue });
  }
  const unique = new Map(members.map(member => [member.facet + '\u0000' + member.value, member]));
  return [...unique.values()].sort((a, b) => (
    a.facet.localeCompare(b.facet) || a.value.localeCompare(b.value, 'de')
  ));
}

/**
 * Normalize one predicate into its canonical immutable representation.
 * Malformed input remains represented as an invalid predicate. Callers can
 * therefore show and remove it while query evaluation closes the result set.
 * @param {unknown} raw
 * @returns {Readonly<Object>}
 */
export function normalizePredicate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return invalid('Prädikat ist kein Objekt.', raw);
  }
  if (raw.type === PREDICATE_TYPES.INVALID) {
    const reason = typeof raw.reason === 'string' && raw.reason.trim()
      ? raw.reason.trim() : 'Ungültiges Prädikat.';
    return invalid(reason, raw.input);
  }
  if (raw.type === PREDICATE_TYPES.ENTITY_ROLE) {
    const family = typeof raw.family === 'string' ? raw.family.trim() : '';
    const entities = strings(raw.entities);
    const roles = strings(raw.roles);
    if (!BOUND_ENTITY_FAMILIES.includes(family) || entities.length === 0 || roles.length === 0) {
      return invalid('Entität, Familie oder Rolle fehlt.', raw);
    }
    return deepFreeze({ type: PREDICATE_TYPES.ENTITY_ROLE, family, entities, roles });
  }
  if (raw.type === PREDICATE_TYPES.RECORDS) {
    const ids = strings(raw.ids);
    if (ids.length === 0) return invalid('Die Dokumentauswahl ist leer.', raw);
    return deepFreeze({ type: PREDICATE_TYPES.RECORDS, ids });
  }
  if (raw.type === PREDICATE_TYPES.SET_MEMBERSHIP) {
    const include = normalizeMembers(raw.include);
    const exclude = normalizeMembers(raw.exclude);
    if (!include || !exclude || (include.length === 0 && exclude.length === 0)) {
      return invalid('Die Mengenbedingung ist leer oder unvollständig.', raw);
    }
    return deepFreeze({ type: PREDICATE_TYPES.SET_MEMBERSHIP, include, exclude });
  }
  return invalid('Unbekannter Prädikattyp.', raw);
}

/** @param {unknown} raw @returns {ReadonlyArray<Readonly<Object>>} */
export function normalizePredicates(raw) {
  if (raw == null) return Object.freeze([]);
  if (!Array.isArray(raw)) return Object.freeze([invalid('Prädikate sind keine Liste.', raw)]);
  const unique = new Map();
  for (const item of raw) {
    const predicate = normalizePredicate(item);
    unique.set(JSON.stringify(predicate), predicate);
  }
  return Object.freeze([...unique.values()].sort((a, b) => predicateKey(a).localeCompare(predicateKey(b))));
}

/** Deterministic semantic key of one predicate. */
export function predicateKey(predicate) {
  return JSON.stringify(normalizePredicate(predicate));
}

/** Structural equality after canonical normalization. */
export function predicatesEqual(left, right) {
  return JSON.stringify(normalizePredicates(left)) === JSON.stringify(normalizePredicates(right));
}

/** Canonical JSON payload used by filter-url.js. */
export function serializePredicate(predicate) {
  return predicateKey(predicate);
}

/** Parse one URL payload without dropping malformed state. */
export function parsePredicate(value) {
  if (typeof value !== 'string') return invalid('Prädikat in der URL ist kein Text.', value);
  try {
    return normalizePredicate(JSON.parse(value));
  } catch {
    return invalid('Prädikat in der URL ist kein gültiges JSON.', value);
  }
}

/** Compact German label for a chip or recovery notice. */
export function predicateLabel(predicate) {
  const p = normalizePredicate(predicate);
  if (p.type === PREDICATE_TYPES.ENTITY_ROLE) {
    return `${p.entities.join(' oder ')} · ${p.roles.join(' oder ')}`;
  }
  if (p.type === PREDICATE_TYPES.RECORDS) {
    return p.ids.length === 1 ? `Dokument ${p.ids[0]}` : `${p.ids.length} Dokumente`;
  }
  if (p.type === PREDICATE_TYPES.SET_MEMBERSHIP) {
    const included = p.include.map(item => `${item.facet}:${item.value}`).join(' ∩ ');
    const excluded = p.exclude.map(item => `${item.facet}:${item.value}`).join(', ');
    return [included, excluded ? `ohne ${excluded}` : ''].filter(Boolean).join(' · ');
  }
  return `Ungültiger Filter: ${p.reason}`;
}

function facetList(filter, key) {
  const value = filter && filter[key];
  if (value == null || value === '') return [];
  const source = Array.isArray(value) ? value : [value];
  return [...new Set(source.filter(item => typeof item === 'string' && item.length > 0))];
}

/**
 * Atomic selector transition shared by UI state and count previews. It binds
 * an entity family to its role entries when both halves are selected, and
 * restores the remaining half as a legacy facet when either is removed.
 */
export function buildPredicateFacetPatch(filter, key, values) {
  const nextValues = facetList({ [key]: values }, key);
  if (!BOUND_ENTITY_FAMILIES.includes(key) && key !== 'verknuepfung') {
    return { [key]: nextValues };
  }
  const working = filter || {};
  const predicates = normalizePredicates(working.predicates);
  const retained = predicates.filter(predicate => (
    predicate.type !== PREDICATE_TYPES.ENTITY_ROLE
    || (key !== 'verknuepfung' && predicate.family !== key)
  ));
  const entityValues = new Map();
  const roleValues = new Map();
  const legacyLinks = facetList(working, 'verknuepfung');
  for (const family of BOUND_ENTITY_FAMILIES) {
    entityValues.set(family, facetList(working, family));
    roleValues.set(family, legacyLinks
      .filter(value => value.startsWith(`${family}:`))
      .map(value => value.slice(family.length + 1)));
  }
  for (const predicate of predicates) {
    if (predicate.type !== PREDICATE_TYPES.ENTITY_ROLE) continue;
    entityValues.get(predicate.family).push(...predicate.entities);
    roleValues.get(predicate.family).push(...predicate.roles);
  }
  if (BOUND_ENTITY_FAMILIES.includes(key)) entityValues.set(key, nextValues);
  if (key === 'verknuepfung') {
    for (const family of BOUND_ENTITY_FAMILIES) {
      roleValues.set(family, nextValues
        .filter(value => value.startsWith(`${family}:`))
        .map(value => value.slice(family.length + 1)));
    }
  }

  const patch = {};
  const affected = key === 'verknuepfung' ? BOUND_ENTITY_FAMILIES : [key];
  const activeLinks = key === 'verknuepfung' ? nextValues : legacyLinks;
  const rebound = new Set();
  for (const family of affected) {
    const entities = [...new Set(entityValues.get(family))];
    const roles = [...new Set(roleValues.get(family))];
    if (entities.length > 0 && roles.length > 0) {
      retained.push({ type: PREDICATE_TYPES.ENTITY_ROLE, family, entities, roles });
      patch[family] = [];
      rebound.add(family);
    } else patch[family] = entities;
  }
  const affectedPrefixes = affected.map(family => `${family}:`);
  patch.verknuepfung = activeLinks.filter(value => (
    !affectedPrefixes.some(prefix => value.startsWith(prefix))
  ));
  for (const family of affected) {
    if (rebound.has(family)) continue;
    patch.verknuepfung.push(...roleValues.get(family).map(role => `${family}:${role}`));
  }
  patch.verknuepfung = [...new Set(patch.verknuepfung)];
  patch.predicates = normalizePredicates(retained);
  return patch;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}
