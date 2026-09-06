/**
 * Netzwerk geometry: the pure half of the view. No DOM, no d3, so the same code
 * path serves both drawings, the GEXF export and the unit tests.
 *
 * Two forms of one dataset (F2, decided on the prototype of 2026-09-05,
 * E-256 for the projection rule, E-257 for the two switches):
 *   - buildTwoMode      the sources themselves. Every actor of the result set
 *                       and every record with links is a node, every mention is
 *                       an edge, one to one with the Verknuepfungstabelle.
 *   - buildProjection   the person-to-person projection. Two actors share an
 *                       edge when a record names both; this is what the
 *                       overview falls back to once the record nodes are
 *                       hidden, and what the neighbour list of the detail reads.
 *   - layoutGraph       positions for either of them.
 *
 * The creator of the fonds is no node. She stands on nearly every record, so as
 * a node she would join everything to everything and the picture would say
 * nothing. Her spelling variants in the source carry no Wikidata id, so only
 * the literal catches them.
 *
 * Determinism (E-259, a click keeps the layout still): the layout is a pure
 * function without any random source, run to rest before the first draw. Same
 * cut, same picture, and a highlight never moves a node.
 */

import { roleLabel, formatDocType } from '../utils/format.js';
import { yearOfId } from '../data/records-for.js';
import { AGRELON_LABELS } from '../data/constants.js';

// ---------------------------------------------------------------------------
// The creator of the fonds
// ---------------------------------------------------------------------------

const FONDS_CREATOR_ID = 'wd:Q94208';

/** Source spellings of the creator's name, from the projection script of the
 *  prototype. Each of them is a recording error and none carries a Q-id. */
export const FONDS_CREATOR_VARIANTS = new Set([
  'Malaniuk, Ira', 'Malnaiuk, Ira', 'Maklaniuk, Ira', 'Malaiuk, Ira', 'Malniuk, Ira',
]);

/** Is the entity Ira Malaniuk, under any of her recorded spellings? */
export function isMalaniuk(name, entry) {
  if (entry && entry.wikidata === FONDS_CREATOR_ID) return true;
  if (name && FONDS_CREATOR_VARIANTS.has(name)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Node kinds
// ---------------------------------------------------------------------------

/** Display form per node type. An actor carries the colour of its content
 *  family, the same one register, Bestand marks and detail block titles use, a
 *  record stays the accent square (Projektleitung, 2026-09-05). */
export const NODE_TYPE_META = {
  person:      { label: 'Person' },
  institution: { label: 'Institution' },
  record:      { label: 'Dokument' },
};

/** Role tokens that record a name without a function of its own. An edge that
 *  carries nothing else is a bare mention and is drawn as such; the role sits
 *  on the mention, never on the actor. */
const MENTION_ONLY = new Set(['erwähnt', 'erwaehnt']);

/** Is this edge a bare mention rather than an active role? */
function isBareMention(roles) {
  return roles.length === 0 || roles.every(r => MENTION_ONLY.has(String(r).toLowerCase()));
}

// Joins two ids into one key. Written as an escape, because a control
// character in the source looks like an empty string in the editor.
const SEP = '\u0000';

/** Stable node identifier. */
export function nodeId(type, name) {
  return `${type}:${name}`;
}

// ---------------------------------------------------------------------------
// Actors of a document set
// ---------------------------------------------------------------------------

/** Roles of an entity inside a document set, most frequent first. */
function rolesIn(store, entry, scope) {
  const out = [];
  for (const [token, ids] of entry.roleRecords || []) {
    let count = 0;
    for (const id of ids) if (scope.has(id)) count++;
    if (count === 0) continue;
    out.push({ role: roleLabel(store, token) || token, count });
  }
  out.sort((a, b) => b.count - a.count || a.role.localeCompare(b.role, 'de'));
  return out;
}

/** Roles an entity carries at exactly these documents. */
function roleNamesAt(store, entry, ids) {
  const out = [];
  for (const [token, recs] of entry.roleRecords || []) {
    if (!ids.some(id => recs.has(id))) continue;
    out.push(roleLabel(store, token) || token);
  }
  out.sort((a, b) => a.localeCompare(b, 'de'));
  return out;
}

/**
 * The actors of the cut as nodes, plus the mention lists per record. This is
 * the one place that decides who counts as an actor, so the two-mode network,
 * the projection and the completeness test cannot drift apart.
 * @returns {{actors: Array, byId: Map, mentionsOf: Map<string, string[]>}}
 */
function actorsOf(store, scope) {
  const actors = [];
  const byId = new Map();
  const mentionsOf = new Map();
  for (const id of scope) mentionsOf.set(id, []);

  const collect = (type, map) => {
    if (!map) return;
    for (const [name, entry] of map) {
      if (!entry || !entry.records) continue;
      if (type === 'person' && isMalaniuk(name, entry)) continue;
      const own = new Set();
      for (const id of entry.records) if (scope.has(id)) own.add(id);
      if (own.size === 0) continue;
      const node = {
        id: nodeId(type, name),
        kind: 'actor',
        type, name, entry,
        label: name,
        records: own,
        weight: own.size,
        roles: rolesIn(store, entry, scope),
        relations: relationsOf(store, entry),
        hasRelation: !!(entry.relations && entry.relations.length > 0),
        wikidata: entry.wikidata || null,
        degree: 0,
      };
      actors.push(node);
      byId.set(node.id, node);
      for (const id of own) mentionsOf.get(id).push(node.id);
    }
  };
  collect('person', store && store.persons);
  collect('institution', store && store.organizations);

  actors.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'de'));
  for (const list of mentionsOf.values()) list.sort();
  return { actors, byId, mentionsOf };
}

/** The recorded relations of an entity, each with the label the detail chip
 *  shows and the signature of the attesting record, so the GEXF export writes
 *  the relation the drawing shows without repeating its lookup. */
function relationsOf(store, entry) {
  const list = (entry && entry.relations) || [];
  return list.map(rel => ({
    ...rel,
    label: AGRELON_LABELS[rel.type] || String(rel.type).replace(/^agrelon:/, ''),
    signatur: signaturOf(store && store.records ? store.records.get(rel.recordId) : null)
      || rel.recordId || '',
  }));
}

/** Signatur of a record without the archive prefix, its display name here. */
function signaturOf(record) {
  const id = (record && record['rico:identifier']) || '';
  return id.replace('UAKUG/', '') || (record && record['@id']) || '';
}

/**
 * Display form of a record: document type and year, the short uniform label a
 * node and a relation chip both carry. A bare signature says nothing about the
 * content (Projektleitung, 2026-09-05), so the signature stays in tooltip and
 * detail column and is only the last fallback here.
 * @param {object} store
 * @param {object} record   record node of the dataset
 * @param {?number} year    the resolved year, or null where none is anchored
 */
export function recordLabel(store, record, year) {
  const parts = [formatDocType(record, store), year == null ? '' : String(year)];
  return parts.filter(Boolean).join(' ') || signaturOf(record);
}

// ---------------------------------------------------------------------------
// Two-mode network: actors and records
// ---------------------------------------------------------------------------

/**
 * The sources themselves. Every actor and every record of the cut is a node,
 * every mention is one edge. Nothing is capped and nothing is thresholded away.
 *
 * @param {object} store
 * @param {{records: Set<string>}} opts   documents of the cut (from recordsFor)
 * @returns {{mode, nodes, edges, byId, edgesByNode, stats}}
 */
export function buildTwoMode(store, { records } = {}) {
  const scope = records instanceof Set ? records : new Set();
  const { actors, byId, mentionsOf } = actorsOf(store, scope);
  const nodes = [...actors];
  const edges = [];

  for (const id of [...scope].sort()) {
    const record = store.records.get(id);
    if (!record) continue;
    const mentions = mentionsOf.get(id) || [];
    const year = yearOfId(store, id);
    const recordNode = {
      id: `record:${id}`,
      kind: 'record',
      type: 'record',
      name: signaturOf(record),
      label: recordLabel(store, record, year),
      typeLabel: formatDocType(record, store),
      recordId: id,
      record,
      title: record['rico:title'] || '',
      date: record['rico:date'] || '',
      year,
      actorIds: mentions,
      weight: mentions.length,
      degree: mentions.length,
    };
    nodes.push(recordNode);
    byId.set(recordNode.id, recordNode);
    for (const actorId of mentions) {
      const actor = byId.get(actorId);
      const roles = roleNamesAt(store, actor.entry, [id]);
      edges.push({
        id: actorId + SEP + recordNode.id,
        a: actorId,
        b: recordNode.id,
        weight: 1,
        recordId: id,
        roles,
        bare: isBareMention(roles),
      });
      actor.degree += 1;
    }
  }

  const edgesByNode = indexEdges(edges);
  return {
    mode: 'twomode',
    nodes, edges, byId, edgesByNode,
    stats: statsOf(scope, actors, nodes, edges),
  };
}

function indexEdges(edges) {
  const map = new Map();
  for (const edge of edges) {
    for (const side of [edge.a, edge.b]) {
      let list = map.get(side);
      if (!list) { list = []; map.set(side, list); }
      list.push(edge);
    }
  }
  return map;
}

function statsOf(scope, actors, nodes, edges) {
  return {
    records: scope.size,
    nodes: nodes.length,
    actors: actors.length,
    persons: actors.filter(n => n.type === 'person').length,
    institutions: actors.filter(n => n.type === 'institution').length,
    recordNodes: nodes.length - actors.length,
    edges: edges.length,
    single: actors.filter(n => n.weight === 1).length,
    withRelation: actors.filter(n => n.hasRelation).length,
  };
}

// ---------------------------------------------------------------------------
// Person-to-person projection
// ---------------------------------------------------------------------------

/**
 * Two actors share an edge as soon as one record names both, and the strength
 * of that edge is the number of those records. This is what the overview falls
 * back to once the record nodes are hidden, and what the neighbour list reads.
 *
 * @param {object} store
 * @param {{records: Set<string>}} opts
 * @returns {{mode, nodes, edges, byId, edgesByNode, stats}}
 */
export function buildProjection(store, { records } = {}) {
  const scope = records instanceof Set ? records : new Set();
  const { actors, byId, mentionsOf } = actorsOf(store, scope);

  const pairs = new Map();
  for (const [recordId, mentions] of mentionsOf) {
    if (mentions.length < 2) continue;
    for (let i = 0; i < mentions.length; i++) {
      for (let j = i + 1; j < mentions.length; j++) {
        const key = mentions[i] + SEP + mentions[j];
        let hit = pairs.get(key);
        if (!hit) { hit = []; pairs.set(key, hit); }
        hit.push(recordId);
      }
    }
  }

  const edges = [];
  for (const [key, recordIds] of pairs) {
    const [a, b] = key.split(SEP);
    recordIds.sort();
    const rolesA = roleNamesAt(store, byId.get(a).entry, recordIds);
    const rolesB = roleNamesAt(store, byId.get(b).entry, recordIds);
    edges.push({
      id: key, a, b,
      weight: recordIds.length,
      records: recordIds,
      rolesA, rolesB,
      bare: isBareMention([...rolesA, ...rolesB]),
    });
  }
  edges.sort((x, y) => y.weight - x.weight || x.a.localeCompare(y.a, 'de')
    || x.b.localeCompare(y.b, 'de'));

  for (const node of actors) node.degree = 0;
  const edgesByNode = indexEdges(edges);
  for (const [id, list] of edgesByNode) {
    const node = byId.get(id);
    if (node) node.degree = list.length;
  }

  return {
    mode: 'projection',
    nodes: actors, edges, byId, edgesByNode,
    stats: statsOf(scope, actors, actors, edges),
  };
}

/** Neighbours of a node with the strength of the connecting edge. */
export function neighboursOf(graph, id) {
  const out = [];
  for (const edge of graph.edgesByNode.get(id) || []) {
    const other = graph.byId.get(edge.a === id ? edge.b : edge.a);
    if (other) out.push({ node: other, edge, weight: edge.weight });
  }
  out.sort((a, b) => b.weight - a.weight || a.node.name.localeCompare(b.node.name, 'de'));
  return out;
}

/** Actor neighbours derived directly from a two-mode graph. */
export function neighboursOfActor(graph, id) {
  if (graph.mode !== 'twomode') return neighboursOf(graph, id);
  const weights = new Map();
  for (const mention of graph.edgesByNode.get(id) || []) {
    const recordId = mention.a === id ? mention.b : mention.a;
    const record = graph.byId.get(recordId);
    if (!record || record.kind !== 'record') continue;
    for (const actorId of record.actorIds || []) {
      if (actorId === id) continue;
      weights.set(actorId, (weights.get(actorId) || 0) + 1);
    }
  }
  const out = [];
  for (const [actorId, weight] of weights) {
    const node = graph.byId.get(actorId);
    if (node) out.push({ node, edge: null, weight });
  }
  out.sort((a, b) => b.weight - a.weight || a.node.name.localeCompare(b.node.name, 'de'));
  return out;
}

/** The graph reduced to the nodes whose name matches, with the edges between
 *  them. Cuts the picture, never the counts a node carries. */
export function narrowGraph(graph, keepFn) {
  const nodes = graph.nodes.filter(keepFn);
  const keep = new Set(nodes.map(n => n.id));
  const edges = graph.edges.filter(e => keep.has(e.a) && keep.has(e.b));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const actors = nodes.filter(n => n.kind === 'actor');
  return {
    mode: graph.mode,
    nodes, edges, byId,
    edgesByNode: indexEdges(edges),
    stats: { ...graph.stats, ...statsOf(new Set(), actors, nodes, edges),
             records: graph.stats.records },
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Radius of a node from its count, bounded so a hub stays readable. */
export function nodeRadius(weight) {
  return Math.max(3, Math.min(16, 2.6 + Math.sqrt(weight) * 2.2));
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Ceiling of the relaxation, not the length of a normal run: the run ends once
// the picture is at rest, and this only bounds a graph that never settles.
const LAYOUT_STEPS = 150;
// Geometric cooling, so the step size falls off on its own and rest is a
// property of the picture instead of the end of a linear schedule.
const LAYOUT_COOLING = 0.95;
// At rest when the average step of a node stays under this share of k.
const LAYOUT_REST = 0.02;
const ORIGIN_PULL = 0.012;
// Cells per axis of the repulsion grid, so a node that runs far cannot make the
// buffers grow with its distance.
const GRID_MAX = 128;
const FIT_MARGIN = 8;
// The force phase already lays the cloud out in the aspect of the box; what it
// leaves over is taken by a non-uniform fit, bounded to this factor between the
// two scales. Radii are not scaled, so a node keeps its shape.
const FIT_DISTORTION = 1.2;
// Passes of the collision relaxation and the gap it holds between two nodes.
// Measured on the unfiltered fonds: more passes keep cutting the overlapping
// pairs, and the coefficient of variation of the neighbour distance falls only
// from 0.64 to 0.52, so the spacing stays irregular and no lattice forms.
const SEPARATE_PASSES = 12;
const SEPARATE_PAD = 1.5;

/**
 * Deterministic relaxation, run to rest and returned as final positions. Pure:
 * the same graph always yields the same coordinates, which is what lets a click
 * highlight a neighbourhood without the picture moving (E-259).
 *
 * @param {object} graph
 * @param {{width:number, height:number, iterations?:number}} opts
 *        `iterations` raises or lowers the ceiling, it does not fix the count.
 * @returns {{nodes: Array, edges: Array, byId: Map, width: number,
 *            height: number, steps: number, rest: boolean, move: number}}
 */
export function layoutGraph(graph, { width, height, iterations = null } = {}) {
  const n = graph.nodes.length;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const rs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // Golden-angle spiral: the one seed that spreads evenly without a random
    // source, and it depends on the node order alone.
    const angle = i * GOLDEN_ANGLE;
    const rr = Math.sqrt(i + 0.5) * 12;
    xs[i] = Math.cos(angle) * rr;
    ys[i] = Math.sin(angle) * rr;
    rs[i] = nodeRadius(graph.nodes[i].weight);
  }

  const run = n > 1
    ? relax(graph, xs, ys, width, height, iterations || LAYOUT_STEPS)
    : { steps: 0, rest: true, move: 0 };
  fitToBox(xs, ys, rs, width, height);
  separate(xs, ys, rs, width, height);

  const nodes = graph.nodes.map((node, i) => ({ ...node, x: xs[i], y: ys[i], r: rs[i] }));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = graph.edges.map(edge => ({
    ...edge, from: byId.get(edge.a), to: byId.get(edge.b),
  })).filter(edge => edge.from && edge.to);
  return { mode: graph.mode, nodes, edges, byId, width, height,
           steps: run.steps, rest: run.rest, move: run.move };
}

/**
 * Fruchterman-Reingold with a uniform grid for the repulsion. The grid is
 * rebuilt per iteration into reusable typed arrays; keeping it in a Map under a
 * string key of the cell coordinates cost more than every force of the
 * iteration together.
 * @returns {{steps:number, rest:boolean, move:number}} steps actually run
 */
function relax(graph, xs, ys, width, height, ceiling) {
  const n = xs.length;
  const index = new Map();
  for (let i = 0; i < n; i++) index.set(graph.nodes[i].id, i);
  const linkA = new Int32Array(graph.edges.length);
  const linkB = new Int32Array(graph.edges.length);
  const linkW = new Float64Array(graph.edges.length);
  let m = 0;
  for (const edge of graph.edges) {
    const ai = index.get(edge.a);
    const bi = index.get(edge.b);
    if (ai === undefined || bi === undefined) continue;
    linkA[m] = ai;
    linkB[m] = bi;
    // The logarithm of the strength keeps a pair of thirty shared documents
    // from pulling the picture into a knot around itself.
    linkW[m] = Math.log(1 + (edge.weight || 1));
    m++;
  }

  const k = Math.sqrt((width * height) / n);
  // Cell of the repulsion grid, scanned two rings wide. One ring over a cell of
  // 2k left a visible lattice in the dense middle, because the cutoff then ran
  // exactly along the cell borders.
  const cellSize = k;
  // The pull to the origin holds the components without a shared document
  // together. It is anisotropic in the aspect of the box, because a radially
  // symmetric pull yields a round blob and leaves a third of a wide area empty
  // (F2, finding 6). The two coefficients keep ORIGIN_PULL as their geometric
  // mean and differ by the fourth power of the aspect; the free-gas estimate is
  // the square, but the repulsion cutoff makes the cloud nearly incompressible,
  // and the fourth power is what measured out as the aspect of the box on both
  // forms of the unfiltered fonds.
  const aspect = width / height;
  const spread = aspect * aspect;
  const pullX = ORIGIN_PULL / spread;
  const pullY = ORIGIN_PULL * spread;
  const restEps = k * LAYOUT_REST;

  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const grid = newGrid(n);
  let temp = Math.max(width, height) / 8;
  let move = Infinity;
  let steps = 0;

  for (let step = 0; step < ceiling; step++) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      if (xs[i] < minX) minX = xs[i];
      if (xs[i] > maxX) maxX = xs[i];
      if (ys[i] < minY) minY = ys[i];
      if (ys[i] > maxY) maxY = ys[i];
    }
    const cw = Math.max(cellSize, (maxX - minX) / GRID_MAX);
    const ch = Math.max(cellSize, (maxY - minY) / GRID_MAX);
    const nx = Math.floor((maxX - minX) / cw) + 1;
    const ny = Math.floor((maxY - minY) / ch) + 1;
    fillGrid(grid, xs, ys, minX, minY, cw, ch, nx, ny);
    const starts = grid.starts;
    const order = grid.order;

    for (let i = 0; i < n; i++) {
      const ax = xs[i];
      const ay = ys[i];
      const c = grid.cellOf[i];
      const gx = c % nx;
      const gy = (c - gx) / nx;
      const x0 = gx > 2 ? gx - 2 : 0;
      const x1 = gx + 2 < nx ? gx + 2 : nx - 1;
      const y0 = gy > 2 ? gy - 2 : 0;
      const y1 = gy + 2 < ny ? gy + 2 : ny - 1;
      let fx = 0;
      let fy = 0;
      for (let cy = y0; cy <= y1; cy++) {
        const row = cy * nx;
        for (let cx = x0; cx <= x1; cx++) {
          const cell = row + cx;
          const last = starts[cell + 1];
          for (let pos = starts[cell]; pos < last; pos++) {
            const j = order[pos];
            if (j === i) continue;
            let vx = ax - xs[j];
            let vy = ay - ys[j];
            // Two nodes on the same spot carry no direction; the stable node
            // order supplies one, so the step stays deterministic.
            if (vx === 0 && vy === 0) { vx = (i - j) * 1e-3; vy = 1e-3; }
            const force = (k * k) / (vx * vx + vy * vy);
            fx += vx * force;
            fy += vy * force;
          }
        }
      }
      dx[i] = fx;
      dy[i] = fy;
    }

    for (let e = 0; e < m; e++) {
      const ai = linkA[e];
      const bi = linkB[e];
      let vx = xs[ai] - xs[bi];
      let vy = ys[ai] - ys[bi];
      if (vx === 0 && vy === 0) { vx = 1e-3; vy = -1e-3; }
      const force = (Math.sqrt(vx * vx + vy * vy) * linkW[e]) / k;
      dx[ai] -= vx * force;
      dy[ai] -= vy * force;
      dx[bi] += vx * force;
      dy[bi] += vy * force;
    }

    let total = 0;
    for (let i = 0; i < n; i++) {
      const fx = dx[i] - xs[i] * pullX;
      const fy = dy[i] - ys[i] * pullY;
      const len = Math.sqrt(fx * fx + fy * fy) || 1;
      const limit = len < temp ? len : temp;
      xs[i] += (fx / len) * limit;
      ys[i] += (fy / len) * limit;
      total += limit;
    }
    move = total / n;
    temp *= LAYOUT_COOLING;
    steps = step + 1;
    if (move < restEps) break;
  }
  return { steps, rest: move < restEps, move };
}

function newGrid(n) {
  return { starts: new Int32Array(1), cursor: new Int32Array(1),
           order: new Int32Array(n), cellOf: new Int32Array(n) };
}

/** Buckets the points into a uniform grid held as flat typed arrays: the members
 *  of cell c stand in `order` from `starts[c]` up to `starts[c + 1]`. Points
 *  outside the grid fall into its border cells. */
function fillGrid(grid, xs, ys, minX, minY, cw, ch, nx, ny) {
  const n = xs.length;
  const cells = nx * ny;
  if (grid.starts.length < cells + 1) {
    grid.starts = new Int32Array(cells + 1);
    grid.cursor = new Int32Array(cells + 1);
  }
  const { starts, cursor, order, cellOf } = grid;
  starts.fill(0, 0, cells + 1);
  for (let i = 0; i < n; i++) {
    let gx = ((xs[i] - minX) / cw) | 0;
    let gy = ((ys[i] - minY) / ch) | 0;
    if (gx < 0) gx = 0; else if (gx >= nx) gx = nx - 1;
    if (gy < 0) gy = 0; else if (gy >= ny) gy = ny - 1;
    const c = gy * nx + gx;
    cellOf[i] = c;
    starts[c + 1]++;
  }
  for (let c = 0; c < cells; c++) starts[c + 1] += starts[c];
  for (let c = 0; c <= cells; c++) cursor[c] = starts[c];
  for (let i = 0; i < n; i++) order[cursor[cellOf[i]]++] = i;
}

/** Scales and centres the relaxed coordinates into the drawing box. */
function fitToBox(xs, ys, rs, width, height) {
  const n = xs.length;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (xs[i] - rs[i] < minX) minX = xs[i] - rs[i];
    if (xs[i] + rs[i] > maxX) maxX = xs[i] + rs[i];
    if (ys[i] - rs[i] < minY) minY = ys[i] - rs[i];
    if (ys[i] + rs[i] > maxY) maxY = ys[i] + rs[i];
  }
  if (!Number.isFinite(minX)) return;
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  let sx = (width - 2 * FIT_MARGIN) / spanX;
  let sy = (height - 2 * FIT_MARGIN) / spanY;
  const uniform = Math.min(sx, sy);
  sx = Math.min(sx, uniform * FIT_DISTORTION);
  sy = Math.min(sy, uniform * FIT_DISTORTION);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  for (let i = 0; i < n; i++) {
    xs[i] = (xs[i] - cx) * sx + width / 2;
    ys[i] = (ys[i] - cy) * sy + height / 2;
  }
}

/**
 * Pushes the nodes that overlap apart, a few passes over the finished picture.
 * The relaxation balances repulsion against attraction and leaves hundreds of
 * touching pairs, under which a label cannot be read. Only pairs that touch
 * move, so the spacing stays as irregular as the graph is and no lattice forms.
 */
function separate(xs, ys, rs, width, height) {
  const n = xs.length;
  if (n < 2) return;
  let maxR = 0;
  for (let i = 0; i < n; i++) if (rs[i] > maxR) maxR = rs[i];
  // A cell of the largest diameter puts every touching pair inside the ring of
  // nine, so one ring suffices here where the repulsion needs two.
  const cell = 2 * maxR + SEPARATE_PAD;
  const nx = Math.floor(width / cell) + 1;
  const ny = Math.floor(height / cell) + 1;
  const grid = newGrid(n);

  for (let pass = 0; pass < SEPARATE_PASSES; pass++) {
    fillGrid(grid, xs, ys, 0, 0, cell, cell, nx, ny);
    const starts = grid.starts;
    const order = grid.order;
    let hits = 0;
    for (let i = 0; i < n; i++) {
      const c = grid.cellOf[i];
      const gx = c % nx;
      const gy = (c - gx) / nx;
      const x0 = gx > 0 ? gx - 1 : 0;
      const x1 = gx + 1 < nx ? gx + 1 : nx - 1;
      const y0 = gy > 0 ? gy - 1 : 0;
      const y1 = gy + 1 < ny ? gy + 1 : ny - 1;
      for (let cy = y0; cy <= y1; cy++) {
        const row = cy * nx;
        for (let cx = x0; cx <= x1; cx++) {
          const last = starts[row + cx + 1];
          for (let pos = starts[row + cx]; pos < last; pos++) {
            const j = order[pos];
            if (j <= i) continue;
            let vx = xs[j] - xs[i];
            let vy = ys[j] - ys[i];
            const min = rs[i] + rs[j] + SEPARATE_PAD;
            if (vx * vx + vy * vy >= min * min) continue;
            let d = Math.sqrt(vx * vx + vy * vy);
            if (d === 0) { vx = (j - i) * 1e-3; vy = 1e-3; d = Math.sqrt(vx * vx + vy * vy); }
            const shift = (min - d) / (2 * d);
            xs[i] -= vx * shift;
            ys[i] -= vy * shift;
            xs[j] += vx * shift;
            ys[j] += vy * shift;
            hits++;
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const bound = rs[i] + FIT_MARGIN;
      if (xs[i] < bound) xs[i] = bound;
      else if (xs[i] > width - bound) xs[i] = width - bound;
      if (ys[i] < bound) ys[i] = bound;
      else if (ys[i] > height - bound) ys[i] = height - bound;
    }
    if (hits === 0) break;
  }
}

// ---------------------------------------------------------------------------
// GEXF
// ---------------------------------------------------------------------------

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/** Names carry ampersands and apostrophes; characters XML 1.0 forbids outright
 *  are dropped, since an escaped C0 control is still invalid. */
function xmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"']/g, c => XML_ESCAPES[c]);
}

/** The display form of an attribute is called `title` in GEXF; the pairs stand
 *  as data so no literal title attribute reaches the source. */
function gexfAttribute(id, type = 'string') {
  const pairs = [['id', id], ['title', id], ['type', type]];
  return '<attribute ' + pairs.map(([key, value]) => `${key}="${xmlEscape(value)}"`).join(' ') + '/>';
}

function edgeRoles(edge) {
  if (edge.roles) return edge.roles;
  return [...new Set([...(edge.rolesA || []), ...(edge.rolesB || [])])];
}

/**
 * The drawn graph as a GEXF 1.3 file, in either form. Same nodes, same edges,
 * same weights as the drawing, because both read this one object; an
 * export that re-derived the graph would answer a different question than the
 * picture it was loaded from.
 * @param {object} graph
 * @param {string} isoDate
 * @returns {string}
 */
export function graphToGEXF(graph, isoDate) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<gexf xmlns="http://gexf.net/1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://gexf.net/1.3 http://gexf.net/1.3/gexf.xsd" version="1.3">');
  lines.push('  <meta lastmodifieddate="' + xmlEscape(isoDate) + '">');
  lines.push('    <creator>M³GIM — Teilnachlass Ira Malaniuk, UAKUG/NIM, KUG Graz</creator>');
  lines.push('    <description>' + (graph.mode === 'twomode'
    ? 'Netzwerk: Akteure und Dokumente des Schnitts, jede Nennung eine Kante'
    : 'Netzwerk: Personenprojektion des Schnitts, Kantengewicht gleich gemeinsame Dokumente')
    + '</description>');
  lines.push('  </meta>');
  lines.push('  <graph defaultedgetype="undirected" mode="static">');
  lines.push('    <attributes class="node">');
  lines.push('      ' + gexfAttribute('family'));
  lines.push('      ' + gexfAttribute('documents', 'integer'));
  lines.push('      ' + gexfAttribute('roles'));
  // The recorded relation is a mark at the node, never an edge, because in this
  // dataset it always starts at the creator of the fonds, who is no node. The
  // two attributes stand in one order, so entry i of the kinds belongs to entry
  // i of the records.
  lines.push('      ' + gexfAttribute('relations'));
  lines.push('      ' + gexfAttribute('relationRecords'));
  lines.push('    </attributes>');
  lines.push('    <attributes class="edge">');
  lines.push('      ' + gexfAttribute('roles'));
  lines.push('    </attributes>');
  lines.push('    <nodes>');
  for (const node of graph.nodes) {
    const roles = node.kind === 'actor' ? node.roles.map(r => r.role).join(', ') : '';
    const relations = node.relations || [];
    lines.push(`      <node id="${xmlEscape(node.id)}" label="${xmlEscape(node.name)}">`);
    lines.push('        <attvalues>'
      + `<attvalue for="family" value="${xmlEscape(node.type)}"/>`
      + `<attvalue for="documents" value="${node.weight}"/>`
      + `<attvalue for="roles" value="${xmlEscape(roles)}"/>`
      + `<attvalue for="relations" value="${xmlEscape(relations.map(r => r.label).join(', '))}"/>`
      + `<attvalue for="relationRecords" value="${xmlEscape(relations.map(r => r.signatur).join(', '))}"/>`
      + '</attvalues>');
    lines.push('      </node>');
  }
  lines.push('    </nodes>');
  lines.push('    <edges>');
  graph.edges.forEach((edge, i) => {
    const roles = edgeRoles(edge).join(', ');
    lines.push(`      <edge id="e${i}" source="${xmlEscape(edge.a)}" target="${xmlEscape(edge.b)}" weight="${edge.weight}">`);
    if (roles) lines.push(`        <attvalues><attvalue for="roles" value="${xmlEscape(roles)}"/></attvalues>`);
    lines.push('      </edge>');
  });
  lines.push('    </edges>');
  lines.push('  </graph>');
  lines.push('</gexf>');
  return lines.join('\n') + '\n';
}
