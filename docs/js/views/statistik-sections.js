/**
 * Statistik — die Bauteile je Ansicht.
 *
 * Je Aggregat eine Sektion aus den Balken-Primitiven in ui/charts.js und den
 * Aggregationen aus statistik-data.js. Jede Sektion nimmt (store, ids) und
 * zaehlt im Schnitt; die Zahl im Titel ist damit die Zahl des Schnitts.
 *
 * Wo ein Aggregat eine geteilte Facette hat, fuehrt seine Zeile in den
 * gefilterten Bestand (E-144). Wo es keine hat (Buehnenrollen, Rollen der
 * Mitwirkenden, Komponisten, Erschliessungsachsen, die Sammelzeile "ohne Typ"),
 * bleibt die Zeile statisch, statt einen Filter zu setzen, den es nicht gibt.
 */

import { el } from '../utils/dom.js';
import { applyArchivFilter } from '../ui/router.js';
import { buildHorizontalBars } from '../ui/charts.js';
import {
  aggregateDocTypes, aggregateEntities, aggregateAgentRoles,
  aggregateStageRoles, aggregateComposers, aggregateCatalogueGaps,
} from './statistik-data.js';

// Der Akzent als monochrome Leitfarbe; sequenzielle Abstufung fuer Long-Tail-Bars.
const KUG_BLUE = 'var(--accent)';

// Wie viele Zeilen eine Rangliste zeigt, bevor der Rest als Sammelzeile steht.
const BAR_TOP = 12;

// Sequenzielle KUG-Blau-Abstufung fuer monochrome Ranglisten (Dokumenttypen).
// Index 0 = vollton, danach schrittweise aufgehellt; deckt die Top-Balken ab.
function blueShade(i, n) {
  const t = n > 1 ? i / (n - 1) : 0;
  // Lighten towards a pale blue without leaving the KUG-blue family.
  const lo = [0x00, 0x4A, 0x8F];
  const hi = [0xB6, 0xC8, 0xDE];
  const mix = lo.map((c, k) => Math.round(c + (hi[k] - c) * t * 0.75));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

function section(title) {
  const node = el('section', { className: 'stat-section' });
  node.appendChild(el('h3', { className: 'stat-section__title' }, title));
  return node;
}

/** Untersektion mit Titel; die Zahl steht im Titel, nicht in einer Caption. */
function subsection(parent, title) {
  const wrap = el('div', { className: 'stat-subsection' });
  wrap.appendChild(el('h4', { className: 'stat-subsection__title' }, title));
  parent.appendChild(wrap);
  return wrap;
}

/**
 * Rangliste mit Kopf und Sammelzeile fuer den Rest. `link` liefert je Zeile den
 * Facettenwert, mit dem sie in den Bestand fuehrt, oder null.
 */
function ranking(rows, { facet = null, color = () => KUG_BLUE } = {}) {
  const head = rows.slice(0, BAR_TOP);
  const bars = head.map((row, i) => ({
    label: row.label,
    value: row.count,
    color: color(i, head.length),
    onClick: facet ? () => applyArchivFilter(facet, row.value ?? row.label) : null,
    tip: facet ? 'Im Bestand zeigen' : '',
  }));
  const tail = rows.slice(BAR_TOP);
  if (tail.length) {
    bars.push({
      label: `Weitere (${tail.length})`,
      value: tail.reduce((s, r) => s + r.count, 0),
      color: 'var(--line-strong)',
      tip: tail.slice(0, 20).map(r => `${r.label} (${r.count})`).join(' · '),
    });
  }
  return buildHorizontalBars(bars);
}

// ---------------------------------------------------------------------------
// § Dokumenttypen
// ---------------------------------------------------------------------------

export function buildDokumenttypen(store, ids) {
  const node = section('Dokumenttypen');
  const docTypes = aggregateDocTypes(store, ids).filter(d => d.count > 0);
  const typed = docTypes.filter(d => d.id !== null);
  const ohneTyp = docTypes.find(d => d.id === null);

  const wrap = subsection(node, `Typen (${typed.length})`);
  const head = typed.slice(0, BAR_TOP);
  const rows = head.map((d, i) => ({
    label: d.label, value: d.count, color: blueShade(i, head.length),
    onClick: () => applyArchivFilter('docType', d.id),
    tip: 'Im Bestand zeigen',
  }));
  const tail = typed.slice(BAR_TOP);
  if (tail.length) {
    rows.push({
      label: `Weitere (${tail.length})`,
      value: tail.reduce((s, d) => s + d.count, 0),
      color: 'var(--line-strong)',
      tip: tail.slice(0, 20).map(d => `${d.label} (${d.count})`).join(' · '),
    });
  }
  if (ohneTyp) {
    // Statische Zeile, kein Sprung: der Dokumenttyp schneidet unter den Typen,
    // die es gibt (docTypeIndex in records-for.js), ein Dokument ohne Typ traegt
    // keinen Facettenwert und waere ueber keinen erreichbar. Der fruehere Sprung
    // setzte einen Platzhalterwert, den recordsFor nicht kennt, und fuehrte
    // damit in einen leeren Bestand (user-story audit 2026-09-03).
    rows.push({
      label: 'ohne Typ', value: ohneTyp.count, color: 'var(--color-text-tertiary)',
      tip: 'Ohne klassifizierten Dokumenttyp — eine Erschließungslücke, '
        + 'kein Filterwert',
    });
  }
  wrap.appendChild(buildHorizontalBars(rows));
  return node;
}

// ---------------------------------------------------------------------------
// § Erschliessungsstand
// ---------------------------------------------------------------------------

/**
 * Was am Bestand erschlossen ist und was nicht, als Arbeitsliste.
 *
 * Der Forschungsrahmen fuehrt diesen Use Case fuer die Erschliessungs-Persona.
 * Die Sicht zeigt beide Seiten derselben Zahl: den Balken der belegten
 * Dokumente und daneben die Zahl der fehlenden, weil erst die zweite Zahl
 * sagt, wo Arbeit liegt. Der Aufriss nach Konvolut macht daraus ein
 * Arbeitspaket, das duennste Konvolut steht oben.
 */
/**
 * Die offenen Achsen eines Konvoluts, die groesste Luecke zuerst. Der Anteil am
 * Balken sagt nur, wie viel fehlt, nicht was; die Frage nach der Achse
 * beantwortet erst diese Zeile.
 */
function konvolutTip(k) {
  const offen = (k.axes || []).filter((a) => a.missing > 0);
  if (offen.length === 0) return 'Alle Achsen belegt';
  return offen
    .map((a, i) => (i === 0 ? `${a.label} ${a.missing} offen` : `${a.label} ${a.missing}`))
    .join(' · ');
}

export function buildErschliessung(store, ids) {
  const node = section('Erschließungsstand');
  const gaps = aggregateCatalogueGaps(store, ids);

  const axisWrap = subsection(node, `Belegte Achsen (${gaps.total} Dokumente)`);
  // Die Gegenzahl steht neben dem Balken: ein Balken allein liest sich als
  // Erfolg, waehrend die offene Zahl die Arbeitsmenge ist.
  axisWrap.appendChild(buildHorizontalBars(gaps.axes.map((a, i) => ({
    label: a.label,
    value: a.filled,
    countText: `${a.filled} · ${a.missing} offen`,
    color: blueShade(i, gaps.axes.length),
    tip: `${a.missing} Dokumente ohne diese Angabe`,
  }))));

  const konvWrap = subsection(node, `Konvolute nach Erschließungsgrad (${gaps.byKonvolut.length})`);
  konvWrap.appendChild(buildHorizontalBars(gaps.byKonvolut.slice(0, 15).map(k => ({
    label: `${k.label} (${k.total})`,
    value: Math.round(k.share * 100),
    countText: `${Math.round(k.share * 100)} %`,
    color: 'var(--color-text-tertiary)',
    tip: konvolutTip(k),
  }))));
  return node;
}

// ---------------------------------------------------------------------------
// § Repertoire — Werke, Buehnenrollen, Komponisten
// ---------------------------------------------------------------------------

export function buildRepertoire(store, ids) {
  const node = section('Repertoire');

  const werke = aggregateEntities(store, 'works', ids);
  if (werke.length) {
    subsection(node, `Werke (${werke.length})`)
      .appendChild(ranking(werke, { facet: 'werk' }));
  }

  const rollen = aggregateStageRoles(store, ids);
  if (rollen.length) {
    // Buehnenrollen haengen an der Auffuehrung, nicht am Record: sie tragen
    // keine Facette und fuehren deshalb nicht in den Bestand.
    subsection(node, `Bühnenrollen (${rollen.length})`)
      .appendChild(ranking(rollen));
  }

  const komponisten = aggregateComposers(store, ids);
  if (komponisten.length) {
    subsection(node, `Komponisten (${komponisten.length})`)
      .appendChild(ranking(komponisten));
  }
  return node;
}

// ---------------------------------------------------------------------------
// § Personen
// ---------------------------------------------------------------------------

export function buildPersonen(store, ids) {
  const node = section('Personen');

  const personen = aggregateEntities(store, 'persons', ids);
  if (personen.length) {
    subsection(node, `Personen (${personen.length})`)
      .appendChild(ranking(personen, { facet: 'person' }));
  }

  const rollen = aggregateAgentRoles(store, ids);
  if (rollen.length) {
    // Die Facette Rolle ist mit E-204 entfallen (sie filterte die Beteiligungs-
    // art, nicht die Buehnenrolle); die Rangliste bleibt als Kennzahl stehen.
    subsection(node, `Rollen (${rollen.length})`)
      .appendChild(ranking(rollen));
  }
  return node;
}

// ---------------------------------------------------------------------------
// § Institutionen
// ---------------------------------------------------------------------------

export function buildInstitutionen(store, ids) {
  const node = section('Institutionen');
  const institutionen = aggregateEntities(store, 'organizations', ids);
  if (institutionen.length) {
    subsection(node, `Institutionen (${institutionen.length})`)
      .appendChild(ranking(institutionen, { facet: 'institution' }));
  }
  return node;
}
