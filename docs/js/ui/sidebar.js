/**
 * Geteilte View-Sidebar (deklarativ).
 *
 * Visualisierungs-Views (Karte, Netzwerk) teilen sich dasselbe Geruest: eine
 * Filter-Spalte links, der Canvas nimmt den restlichen Viewport. Statt jede
 * View ihre Sidebar von Hand zusammenzusetzen, beschreibt sie sie als Spec aus
 * Sektionen und Steuerelementen; createSidebar() erzeugt daraus das DOM.
 *
 *   createSidebar({ sections }) => { element, update }
 *     element   <aside class="view-sidebar">
 *     update()  re-synct alle Controls aus dem extern gehaltenen State
 *
 *   section = { title?, controls: [control], stickFooter? }
 *   control = { kind, ...props }
 *     kind ∈ legend | range | slider | toggle | search | staticLegend |
 *            button | custom
 *
 * Die View bleibt State-Eigentuemer. Controls lesen den State ueber Getter und
 * melden Aenderungen ueber onChange/onToggle zurueck; danach ruft die View ihr
 * eigenes redraw(). Controls aktualisieren ihre Anzeige bei eigener Interaktion
 * sofort und bieten update() fuer externen State-Sync (etwa nach einem Reset).
 *
 * viewShell(sidebarEl, mainEl) liefert das gemeinsame Grid-Geruest, in dem die
 * Sidebar links und der Canvas-Bereich rechts haengen.
 */

import { el } from '../utils/dom.js';

// ---------------------------------------------------------------------------
// Geruest + Builder
// ---------------------------------------------------------------------------

export function viewShell(sidebarEl, mainEl) {
  return el('div', { className: 'view-shell' }, sidebarEl, mainEl);
}

export function createSidebar({ sections = [] } = {}) {
  const aside = el('aside', { className: 'view-sidebar' });
  const updaters = [];

  for (const section of sections) {
    if (!section) continue;
    const sec = el('section', { className: 'vs-section' });
    if (section.stickFooter) sec.classList.add('vs-section--foot');
    if (section.title) sec.appendChild(el('h2', { className: 'vs-section__title' }, section.title));
    for (const spec of section.controls || []) {
      if (!spec) continue;
      const make = FACTORIES[spec.kind];
      if (!make) continue;
      const { node, update } = make(spec);
      if (node) sec.appendChild(node);
      if (update) updaters.push(update);
    }
    aside.appendChild(sec);
  }

  return {
    element: aside,
    update() { for (const u of updaters) u(); },
  };
}

// ---------------------------------------------------------------------------
// Control-Fabriken — jede liefert { node, update? }
// ---------------------------------------------------------------------------

/** Farbcodierte Toggle-Chips (Legende als Filter). Die View definiert ueber
 *  isActive/onToggle, was "aktiv" bedeutet, das Modul bleibt semantik-frei. */
function legendControl({ items = [], isActive, onToggle }) {
  const wrap = el('div', { className: 'vs-legend', role: 'group' });
  const chips = [];
  for (const it of items) {
    const chip = el('button', { className: 'vs-chip', type: 'button', title: it.title || '' },
      el('span', { className: 'vs-chip__swatch' }),
      el('span', { className: 'vs-chip__label' }, it.label),
      it.count != null ? el('span', { className: 'vs-chip__count' }, String(it.count)) : null);
    chip.querySelector('.vs-chip__swatch').style.background = it.color || 'var(--color-text-tertiary)';
    chip.addEventListener('click', () => { if (onToggle) onToggle(it.id); refresh(); });
    chips.push({ el: chip, id: it.id });
    wrap.appendChild(chip);
  }
  function refresh() {
    for (const c of chips) {
      const on = isActive ? !!isActive(c.id) : true;
      c.el.classList.toggle('vs-chip--off', !on);
      c.el.setAttribute('aria-pressed', String(on));
    }
  }
  refresh();
  return { node: wrap, update: refresh };
}

/** Beidseitiges Jahres-/Wertefenster (von–bis): zwei Daumen auf einer Linie
 *  (zwei ueberlagerte native Range-Inputs, nur die Daumen sind klickbar). */
function rangeControl({ min, max, from, to, onChange, fullLabel = false }) {
  const wrap = el('div', { className: 'vs-range' });
  const readout = el('div', { className: 'vs-range__readout' });
  wrap.appendChild(readout);

  const fromR = el('input', { className: 'vs-range__input vs-range__input--from', type: 'range',
    'aria-label': 'Von', min: String(min), max: String(max), step: '1', value: String(from()) });
  const toR = el('input', { className: 'vs-range__input vs-range__input--to', type: 'range',
    'aria-label': 'Bis', min: String(min), max: String(max), step: '1', value: String(to()) });
  wrap.appendChild(el('div', { className: 'vs-range__dual' },
    el('div', { className: 'vs-range__rail' }), fromR, toR));

  function paint() {
    const a = from(), b = to();
    readout.textContent = (fullLabel && a === min && b === max) ? `${a}–${b} (alle)` : `${a}–${b}`;
  }
  function sync() { fromR.value = String(from()); toR.value = String(to()); paint(); }

  fromR.addEventListener('input', () => {
    let v = parseInt(fromR.value, 10);
    if (v > to()) v = to();
    onChange(v, to());
    sync();
  });
  toR.addEventListener('input', () => {
    let v = parseInt(toR.value, 10);
    if (v < from()) v = from();
    onChange(from(), v);
    sync();
  });

  sync();
  return { node: wrap, update: sync };
}

/** Einzelner Schwellen-Slider mit Wertanzeige. */
function sliderControl({ label, min, max, step = 1, value, onChange, format }) {
  const fmt = v => (format ? format(v) : String(v));
  const valueEl = el('span', { className: 'vs-slider__value' }, fmt(value()));
  const input = el('input', { className: 'vs-slider__input', type: 'range',
    min: String(min), max: String(max), step: String(step), value: String(value()),
    'aria-label': label });
  input.addEventListener('input', () => {
    onChange(parseFloat(input.value));
    valueEl.textContent = fmt(value());
  });
  const node = el('label', { className: 'vs-slider' },
    el('span', { className: 'vs-slider__label' }, label),
    el('span', { className: 'vs-slider__row' }, input, valueEl));
  function update() { input.value = String(value()); valueEl.textContent = fmt(value()); }
  return { node, update };
}

/** Boolescher Schalter. */
function toggleControl({ label, value, onChange }) {
  const input = el('input', { type: 'checkbox' });
  if (value()) input.checked = true;
  input.addEventListener('change', () => onChange(input.checked));
  const node = el('label', { className: 'vs-toggle' }, input,
    el('span', { className: 'vs-toggle__label' }, label));
  function update() { input.checked = !!value(); }
  return { node, update };
}

/** Freitext-Suche. */
function searchControl({ placeholder = 'Suchen…', value, onChange }) {
  const input = el('input', { type: 'search', className: 'vs-search', placeholder,
    value: value ? value() : '' });
  input.addEventListener('input', () => onChange(input.value));
  function update() { if (value) input.value = value(); }
  return { node: input, update };
}

/** Nicht-interaktive Erklaer-Legende. Marker kann eine Farbe oder eine
 *  view-eigene CSS-Klasse (Ringe, Linien) tragen, Text optional als HTML. */
function staticLegendControl({ rows = [] }) {
  const wrap = el('div', { className: 'vs-static' });
  for (const r of rows) {
    const marker = el('span', { className: 'vs-static__marker' + (r.markerClass ? ' ' + r.markerClass : '') });
    if (r.color) marker.style.background = r.color;
    const text = el('span', { className: 'vs-static__text' });
    if (r.html != null) text.innerHTML = r.html;
    else if (r.label != null) text.textContent = r.label;
    wrap.appendChild(el('div', { className: 'vs-static__row' }, marker, text));
  }
  return { node: wrap };
}

/** Aktions-Button. variant 'foot' heftet ihn an den Sidebar-Fuss. */
function buttonControl({ label, onClick, variant }) {
  const btn = el('button', { type: 'button',
    className: 'vs-button' + (variant ? ' vs-button--' + variant : '') }, label);
  btn.addEventListener('click', onClick);
  return { node: btn };
}

/** Kompakte Reihe verwandter Aktions-Buttons (z. B. Fokus-Voreinstellungen). */
function buttonsControl({ items = [] }) {
  const wrap = el('div', { className: 'vs-buttons' });
  for (const it of items) {
    const btn = el('button', { type: 'button', className: 'vs-buttons__btn',
      title: it.title || '' }, it.label);
    btn.addEventListener('click', it.onClick);
    wrap.appendChild(btn);
  }
  return { node: wrap };
}

/** Bespoke-Region. Entweder ein fertiger node, oder ein Container (mit
 *  optionaler id/className), den die View selbst fuellt. build()/update()
 *  laufen einmalig bzw. bei jedem Sidebar-update(). */
function customControl({ id, className, node, build, update }) {
  const region = node || el('div', { className: className || 'vs-custom' });
  if (id) region.id = id;
  if (build) build(region);
  return { node: region, update: update ? () => update(region) : undefined };
}

const FACTORIES = {
  legend: legendControl,
  range: rangeControl,
  slider: sliderControl,
  toggle: toggleControl,
  search: searchControl,
  staticLegend: staticLegendControl,
  button: buttonControl,
  buttons: buttonsControl,
  custom: customControl,
};
