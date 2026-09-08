/** Register selection is available on the first click of the Indizes tab. */

import { el } from '../utils/dom.js';
import { getState, setIndexRegister } from './router.js';
import { familyIcon } from './family-icons.js';
import { REGISTER_KEYS, REGISTER_LABELS, REGISTER_FAMILY } from '../views/indizes-data.js';

let tab = null;
let panel = null;

/** Haken am gewaehlten Register; die Sichtbarkeit steuert das CSS ueber
 *  aria-checked, damit der Zustand nur an einer Stelle steht. */
function checkMark() {
  const holder = document.createElement('div');
  holder.innerHTML = '<svg class="tab-menu__check" viewBox="0 0 24 24" fill="none"'
    + ' stroke="currentColor" stroke-width="3" stroke-linecap="round"'
    + ' stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';
  return holder.firstElementChild;
}

export function initRegisterMenu() {
  tab = document.querySelector('[data-tab="indizes"]');
  panel = document.getElementById('indizes-register-menu');
  if (!tab || !panel) return;

  for (const key of REGISTER_KEYS) {
    const family = REGISTER_FAMILY[key];
    panel.appendChild(el('button', {
      className: 'tab-menu__item', type: 'button', role: 'menuitemradio',
      dataset: { register: key },
      onClick: () => { setIndexRegister(key); close({ focusTab: true }); },
    },
      familyIcon(family, { size: 14, className: `fam-mark fam-mark--${family}` }),
      el('span', {}, REGISTER_LABELS[key]),
      checkMark(),
    ));
  }

  tab.addEventListener('click', toggle);

  tab.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); open(); }
    else if (e.key === 'Escape') close();
  });

  panel.addEventListener('keydown', onPanelKey);

  // Ein Klick daneben schliesst; pointerdown, damit das Menue nicht noch den
  // Klick auf ein Element darunter abfaengt.
  document.addEventListener('pointerdown', (e) => {
    if (panel.hidden) return;
    if (!panel.contains(e.target) && !tab.contains(e.target)) close();
  });

  // Ein Registerwechsel aus Hash, Zuruecktaste oder einem Sprung einer anderen
  // Ansicht muss im Menue stehen, auch wenn es gerade geschlossen ist.
  window.addEventListener('hashchange', sync);
  window.addEventListener('m3gim:navigate', sync);
  window.addEventListener('resize', () => close());
  sync();
}

const items = () => [...panel.querySelectorAll('.tab-menu__item')];

function sync() {
  if (!panel) return;
  const active = getState().indexRegister;
  for (const item of items()) {
    item.setAttribute('aria-checked', String(item.dataset.register === active));
  }
}

function toggle() {
  if (panel.hidden) open();
  else close({ focusTab: true });
}

function open() {
  sync();
  // Fest positioniert, weil die Tab-Leiste ihren eigenen Ueberlauf abschneidet
  // und ein absolut positioniertes Menue darin verschwaende.
  const rect = tab.getBoundingClientRect();
  panel.style.insetInlineStart = `${Math.round(rect.left)}px`;
  panel.style.insetBlockStart = `${Math.round(rect.bottom)}px`;
  // Buendig unter dem Knopf und mindestens so breit wie er, damit das Menue als
  // aufgeklappter Zustand desselben Bedienelements liest.
  panel.style.minInlineSize = `${Math.round(rect.width)}px`;
  panel.hidden = false;
  tab.setAttribute('aria-expanded', 'true');
  const list = items();
  (list.find(i => i.getAttribute('aria-checked') === 'true') || list[0])?.focus();
}

function close({ focusTab = false } = {}) {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  tab.setAttribute('aria-expanded', 'false');
  if (focusTab) tab.focus();
}

function onPanelKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); close({ focusTab: true }); return; }
  if (e.key === 'Tab') { close(); return; }
  const list = items();
  const current = list.indexOf(document.activeElement);
  let next = null;
  if (e.key === 'ArrowDown') next = (current + 1) % list.length;
  else if (e.key === 'ArrowUp') next = (current - 1 + list.length) % list.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = list.length - 1;
  if (next == null) return;
  e.preventDefault();
  list[next].focus();
}
