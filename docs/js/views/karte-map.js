/** Geographic companion; selection and evidence belong to the place view. */
/* global d3 */
import { el, clear, escapeHtml } from '../utils/dom.js';
import { groupPlaces } from './karte-data.js';

let countries = null;
export async function loadCountries() {
  if (countries) return countries;
  const response = await fetch('data/geo/countries-110m.geo.json');
  if (!response.ok) throw new Error(`Geometrie: ${response.status}`);
  countries = await response.json();
  return countries;
}

export function fitTransform(bounds, { width, height, pad, minSpan, maxK }) {
  const w = Math.max(bounds.x1 - bounds.x0, minSpan);
  const h = Math.max(bounds.y1 - bounds.y0, minSpan);
  const k = Math.min(maxK, (width - 2 * pad) / w, (height - 2 * pad) / h);
  const cx = (bounds.x0 + bounds.x1) / 2;
  const cy = (bounds.y0 + bounds.y1) / 2;
  return { k, tx: width / 2 - k * cx, ty: height / 2 - k * cy };
}

/** Scale a city selection to a regional frame using the space the map actually has. */
export function regionalFocusScale(width, height) {
  return Math.max(10, Math.min(24, Math.max(width / 48, height / 38)));
}

export function nodeTooltipHtml(node) {
  const roles = node.roles || node.breakdown || [];
  return `<strong>${escapeHtml(node.city)}</strong>`
    + roles.map(role => `<span class="mob-tip__row">${escapeHtml(role.label)} · ${role.count} Dokumente</span>`).join('')
    + `<span class="mob-tip__row">${node.records?.size ?? node.shown} Dokumente</span>`
    + (node.undated ? `<span class="mob-tip__row">${node.undated} aus undatierten Dokumenten</span>` : '');
}

export function buildMap(mapCell, countries, evidence, state, opts) {
  clear(mapCell);
  const svg = d3.select(mapCell).append('svg').attr('class', 'mob-map__svg')
    .attr('tabindex', 0).attr('role', 'group');
  const layer = svg.append('g');
  const land = layer.append('g').attr('class', 'mob-land');
  const points = layer.append('g').attr('class', 'mob-nodes');
  const projection = d3.geoMercator().scale(150).translate([0, 0]);
  const path = d3.geoPath(projection);
  land.selectAll('path').data(countries.features).join('path')
    .attr('d', path).attr('vector-effect', 'non-scaling-stroke');
  const tip = el('div', { className: 'mob-tip', 'aria-hidden': 'true' });
  const status = el('span', { className: 'mob-map-status', 'aria-live': 'polite' });
  mapCell.append(tip, status);
  let width = 320, height = 320, nodes = [], active = 0, frameKey = '';
  let sized = false, keyboardActive = false;
  let transform = d3.zoomIdentity;
  const selected = node => state.selectedCities.some(city => city.toLowerCase() === node.key);
  const hideTip = () => tip.classList.remove('mob-tip--on');
  const showTip = (node, x, y) => {
    tip.innerHTML = nodeTooltipHtml(node);
    tip.classList.add('mob-tip--on');
    tip.style.left = `${Math.max(4, Math.min(x + 12, width - tip.offsetWidth - 4))}px`;
    tip.style.top = `${Math.max(4, Math.min(y + 12, height - tip.offsetHeight - 4))}px`;
  };
  function mark() {
    const visible = nodes.filter(node => {
      const [x, y] = transform.apply([node.x, node.y]);
      return x >= 0 && y >= 0 && x <= width && y <= height;
    });
    status.textContent = `${visible.length} von ${nodes.length} Kartenpunkten im Ausschnitt`;
    const highlighted = nodes[active];
    const occupied = [];
    const labels = new Set();
    const ranked = [...nodes].sort((a, b) => Number(selected(b)) - Number(selected(a))
      || Number(b === highlighted && document.activeElement === svg.node()) - Number(a === highlighted && document.activeElement === svg.node())
      || b.records.size - a.records.size);
    for (const node of ranked) {
      const [x, y] = transform.apply([node.x, node.y]);
      if (x < 0 || y < 0 || x > width || y > height) continue;
      const box = { x: x + 10, y: y - 9, w: node.city.length * 6.5, h: 18 };
      if (box.x + box.w > width) box.x = x - 10 - box.w;
      node.labelLeft = box.x < x;
      if (selected(node) || !occupied.some(b => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) {
        labels.add(node.key); occupied.push(box);
      }
    }
    const marks = points.selectAll('.mob-node');
    marks.attr('transform', node => `translate(${node.x},${node.y}) scale(${1 / transform.k})`)
      .classed('mob-node--selected', selected);
    marks.select('text').attr('opacity', node => labels.has(node.key) ? 1 : 0)
      .attr('x', node => node.labelLeft ? -10 : 10).attr('text-anchor', node => node.labelLeft ? 'end' : 'start');
    marks.select('.mob-node__focus').attr('display', node =>
      node === highlighted && keyboardActive && document.activeElement === svg.node() ? null : 'none');
    marks.filter(node => selected(node) || (keyboardActive && node === highlighted)).raise();
  }
  const zoom = d3.zoom().scaleExtent([0.05, 30]).on('zoom', event => {
    transform = event.transform;
    layer.attr('transform', transform);
    hideTip(); mark();
  });
  svg.call(zoom);
  function fit() {
    if (!nodes.length) return;
    const bounds = { x0: Math.min(...nodes.map(n => n.x)), x1: Math.max(...nodes.map(n => n.x)),
      y0: Math.min(...nodes.map(n => n.y)), y1: Math.max(...nodes.map(n => n.y)) };
    const frame = fitTransform(bounds, { width, height, pad: 30, minSpan: 45, maxK: 12 });
    svg.call(zoom.transform, d3.zoomIdentity.translate(frame.tx, frame.ty).scale(frame.k));
  }
  function centerCity(city) {
    const key = String(city || '').toLocaleLowerCase('de-DE');
    const node = nodes.find(item => item.key === key);
    if (!node || !width || !height) return false;
    // Automatic selection may turn a world overview into a regional view, but
    // it keeps every already useful user zoom. The source only locates a place,
    // so selection never manufactures an address-scale zoom.
    const k = Math.max(transform.k, regionalFocusScale(width, height));
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width / 2 - k * node.x, height / 2 - k * node.y)
      .scale(k));
    return true;
  }
  const controls = el('div', { className: 'mob-zoomctl' });
  for (const [text, label, click] of [
    ['+', 'Hineinzoomen', () => svg.call(zoom.scaleBy, 1.5)],
    ['−', 'Herauszoomen', () => svg.call(zoom.scaleBy, 1 / 1.5)],
    ['↔', 'Alle Kartenpunkte zeigen', fit],
  ]) controls.appendChild(el('button', { type: 'button', className: 'mob-zoomctl__btn',
    'aria-label': label, dataset: { tip: label }, onClick: click }, text));
  mapCell.appendChild(controls);
  function focusNode() {
    keyboardActive = true;
    const node = nodes[active];
    if (!node) return;
    svg.attr('aria-label', `Karte. Ort ${node.city}. ${node.records.size} Dokumente. Eingabe öffnet Belege.`);
    const [x, y] = transform.apply([node.x, node.y]);
    if (x < 12 || y < 12 || x > width - 12 || y > height - 12) {
      svg.call(zoom.translateTo, node.x, node.y);
    }
    mark();
    showTip(node, ...transform.apply([node.x, node.y]));
  }
  svg.on('focus', focusNode).on('blur', () => { hideTip(); mark(); });
  svg.on('keydown', event => {
    if (!nodes.length) return;
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) active = (active + 1) % nodes.length;
    else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) active = (active - 1 + nodes.length) % nodes.length;
    else if (event.key === 'Home') active = 0;
    else if (event.key === 'End') active = nodes.length - 1;
    else if (event.key === 'Escape') { keyboardActive = false; hideTip(); mark(); return; }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); hideTip(); opts.onSelectCity(nodes[active].city, svg.node()); return;
    } else return;
    event.preventDefault(); focusNode();
  });
  function draw() {
    nodes = groupPlaces(evidence.filter(opts.isEligible)).map(group => {
      const o = group.evidence[0];
      const [x, y] = projection([o.placeLon, o.placeLat]);
      return { ...group, x, y, undated: new Set(group.evidence.filter(o => o.recordYear == null).map(o => o.recordId)).size };
    });
    active = Math.min(active, Math.max(0, nodes.length - 1));
    const marks = points.selectAll('.mob-node').data(nodes, n => n.key).join(enter => {
      const node = enter.append('g').attr('class', 'mob-node')
        .on('click', (event, d) => { hideTip(); opts.onSelectCity(d.city, svg.node()); })
        .on('mouseenter', (event, d) => showTip(d, ...d3.pointer(event, mapCell)))
        .on('mouseleave', hideTip);
      node.append('circle').attr('class', 'mob-node__dot').attr('r', 5);
      node.append('circle').attr('class', 'mob-node__focus').attr('r', 9);
      node.append('text').attr('class', 'mob-node__label').attr('y', 4);
      return node;
    });
    marks.select('text').text(node => node.city);
    svg.attr('aria-label', nodes.length
      ? 'Karte. Pfeiltasten wechseln den Ort, Eingabe öffnet seine Belege.'
      : 'Karte. Keine verortbaren Belege in dieser Auswahl.');
    const nextKey = nodes.map(n => n.key).join('|');
    if (nextKey !== frameKey) { frameKey = nextKey; fit(); }
    mark();
  }
  const observer = new ResizeObserver(() => {
    if (!mapCell.clientWidth || !mapCell.clientHeight) return;
    const centre = transform.invert([width / 2, height / 2]);
    width = mapCell.clientWidth; height = mapCell.clientHeight;
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    zoom.extent([[0, 0], [width, height]]);
    if (!sized) { sized = true; fit(); }
    else svg.call(zoom.transform, d3.zoomIdentity.translate(
      width / 2 - centre[0] * transform.k, height / 2 - centre[1] * transform.k).scale(transform.k));
    mark();
  });
  observer.observe(mapCell);
  return {
    draw,
    centerCity,
    selectCity(city, { center = true } = {}) {
      state.selectedCities = city ? [city] : [];
      draw();
      if (center) centerCity(city);
    },
    destroy() { observer.disconnect(); svg.on('.zoom', null); },
  };
}
