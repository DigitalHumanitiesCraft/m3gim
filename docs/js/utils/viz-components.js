/**
 * M³GIM Shared Visualization Components
 * Reusable builders for toolbar elements across all D3 views.
 */

import { el } from './dom.js';

/**
 * FF-Badges — research question annotation tags.
 * @param {...string} ffs - FF identifiers, e.g. 'FF1', 'FF3'
 * @returns {HTMLElement}
 */
export function buildFFBadges(...ffs) {
  return el('div', { className: 'ff-badges' },
    ...ffs.map(ff => el('span', { className: 'ff-badges__tag' }, ff))
  );
}

/**
 * Phase Chip Bar — unified Lebensphasen buttons.
 * @param {Array} lebensphasen - [{id, label, von, bis}, ...]
 * @param {Function} onSelect - callback(phase|null) — null = "Alle"
 * @param {Object} [opts]
 * @param {'short'|'full'} [opts.labelMode='short'] - 'short' = "1"–"7", 'full' = "LP5 1950–1955"
 * @returns {{ element: HTMLElement, setActive: Function, chips: Array }}
 */
export function buildPhaseChips(lebensphasen, onSelect, { labelMode = 'short' } = {}) {
  const chips = [];
  const container = el('div', { className: 'viz-toolbar__group' });

  container.appendChild(el('span', { className: 'viz-toolbar__label' }, 'Phase'));

  const alleChip = el('button', { className: 'phase-chip phase-chip--active' }, 'Alle');
  alleChip.addEventListener('click', () => { setActive(null); onSelect(null); });
  container.appendChild(alleChip);
  chips.push({ id: null, el: alleChip });

  for (const phase of lebensphasen) {
    const label = labelMode === 'full'
      ? `${phase.id} ${phase.von}\u2013${phase.bis}`
      : phase.id.replace('LP', '');
    const chip = el('button', {
      className: 'phase-chip',
      title: `${phase.label} (${phase.von}\u2013${phase.bis})`,
    }, label);
    chip.addEventListener('click', () => { setActive(phase.id); onSelect(phase); });
    container.appendChild(chip);
    chips.push({ id: phase.id, el: chip });
  }

  function setActive(activeId) {
    for (const c of chips) {
      c.el.classList.toggle('phase-chip--active', c.id === activeId);
    }
  }

  return { element: container, setActive, chips };
}

/**
 * Layer Chip Bar — multi-select toggle buttons for visualization layers.
 * Unlike buildPhaseChips (single-select), multiple layers can be active simultaneously.
 * @param {Array} layers - [{id, label, active: boolean}]
 * @param {Function} onToggle - callback(layerId, isActive, activeSet)
 * @returns {{ element: HTMLElement, getActive: () => Set<string>, setActive: (id, bool) => void }}
 */
export function buildLayerChips(layers, onToggle) {
  const active = new Set(layers.filter(l => l.active).map(l => l.id));
  const chips = [];
  const container = el('div', { className: 'viz-toolbar__group' });

  container.appendChild(el('span', { className: 'viz-toolbar__label' }, 'Layer'));

  for (const layer of layers) {
    const cls = active.has(layer.id) ? 'phase-chip phase-chip--active' : 'phase-chip';
    const chip = el('button', { className: cls, title: layer.label }, layer.label);
    chip.addEventListener('click', () => {
      const isNowActive = !active.has(layer.id);
      if (isNowActive) active.add(layer.id); else active.delete(layer.id);
      chip.classList.toggle('phase-chip--active', isNowActive);
      onToggle(layer.id, isNowActive, active);
    });
    container.appendChild(chip);
    chips.push({ id: layer.id, el: chip });
  }

  function setActive(id, on) {
    if (on) active.add(id); else active.delete(id);
    for (const c of chips) {
      c.el.classList.toggle('phase-chip--active', active.has(c.id));
    }
  }

  return { element: container, getActive: () => active, setActive };
}

/**
 * Coverage Footer — data provenance annotation.
 * @param {string} text
 * @returns {HTMLElement}
 */
export function buildCoverageFooter(text) {
  return el('div', { className: 'data-coverage' }, text);
}

/**
 * Floating Tooltip Controller — creates a .viz-tooltip element and provides
 * show/move/hide methods with boundary clamping.
 * @param {HTMLElement} container - positioned parent for the tooltip
 * @returns {{ el: HTMLElement, show(event, html), move(event), hide() }}
 */
export function createTooltip(container) {
  const tip = el('div', { className: 'viz-tooltip' });
  container.appendChild(tip);

  function show(event, html) {
    tip.innerHTML = html;
    tip.classList.add('viz-tooltip--visible');
    move(event);
  }

  function move(event) {
    const rect = container.getBoundingClientRect();
    let left = event.clientX - rect.left + 12;
    let top = event.clientY - rect.top - 10;
    // Boundary clamping: keep tooltip inside container
    if (left + 300 > rect.width) left = event.clientX - rect.left - 310;
    if (top < 0) top = event.clientY - rect.top + 16;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hide() {
    tip.classList.remove('viz-tooltip--visible');
  }

  return { el: tip, show, move, hide };
}

/**
 * D3 Zoom + Reset Button — shared zoom/pan setup with visibility-toggled reset.
 * @param {Object} opts
 * @param {d3.Selection} opts.svg - the SVG selection to attach zoom behavior
 * @param {d3.Selection} opts.zoomGroup - the <g> that receives the transform
 * @param {HTMLElement} opts.container - positioned parent for the reset button
 * @param {[number,number]} [opts.scaleExtent=[0.3, 3]] - zoom scale limits
 * @param {Function} [opts.onZoom] - extra callback(event) during zoom (after default transform)
 * @param {string} [opts.resetLabel='Reset'] - button text
 * @returns {{ zoom: d3.ZoomBehavior, resetZoom: Function }}
 */
export function setupD3Zoom({ svg, zoomGroup, container, scaleExtent = [0.3, 3], onZoom, resetLabel = 'Reset' }) {
  const resetBtn = el('button', {
    className: 'viz-zoom-reset',
    title: 'Zoom zurücksetzen',
  }, resetLabel);
  container.appendChild(resetBtn);

  const zoom = d3.zoom()
    .scaleExtent(scaleExtent)
    .on('zoom', (event) => {
      zoomGroup.attr('transform', event.transform);
      const isIdentity = event.transform.k === 1
        && Math.abs(event.transform.x) < 1
        && Math.abs(event.transform.y) < 1;
      resetBtn.classList.toggle('viz-zoom-reset--visible', !isIdentity);
      if (onZoom) onZoom(event);
    });

  svg.call(zoom);

  function resetZoom() {
    svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  }

  resetBtn.addEventListener('click', resetZoom);

  return { zoom, resetZoom };
}

/**
 * Console Diagnostics — colored group header for a view.
 * @param {string} name - View name (e.g. 'Matrix')
 * @param {string} color - CSS color for the label
 * @returns {{ group: Function, log: Function, end: Function }}
 */
export function viewLog(name, color) {
  return {
    group() { console.group(`%c[${name}]`, `color: ${color}; font-weight: bold`); },
    log(...args) { console.log(...args); },
    end() { console.groupEnd(); },
  };
}
