/**
 * M³GIM Modell Page — Datenmodell, Verknüpfungstypen, Ontologie.
 */

import { el, clear } from '../utils/dom.js';
import { ensureArray } from '../utils/format.js';

export function renderModell(store, container) {
  clear(container);

  // Compute live statistics
  const stats = computeStats(store);

  const page = el('article', { className: 'page' },

    el('header', { className: 'page__header' },
      el('h1', { className: 'page__title' }, 'Datenmodell'),
      el('p', { className: 'page__lead' },
        'Wie die Archivalien im Teilnachlass Malaniuk modelliert, verkn\u00fcpft und mit externen Normdaten angereichert werden.'
      ),
    ),

    // Ontologie-Grundlage
    el('section', { className: 'page__section' },
      el('h2', {}, 'Ontologie'),
      el('p', {},
        'M\u00b3GIM modelliert den Teilnachlass nach dem internationalen Archivstandard ' +
        'RiC-O 1.1 (Records in Contexts \u2014 Ontology) und erweitert diesen um musikwissenschaftliche Konzepte ' +
        'im Namensraum m3gim. Jedes Archivst\u00fcck wird als rico:Record beschrieben, ' +
        'Konvolute als rico:RecordSet mit Teil\u2013Ganzes-Beziehungen.'
      ),
      el('p', {},
        'RiC-O liefert die Grundstruktur f\u00fcr Archivbeschreibung (Signaturen, Titel, Datierung, Umfang). ' +
        'Die m3gim-Erweiterung erg\u00e4nzt Konzepte, die im Archivstandard fehlen: ' +
        'Musikwerke, Auff\u00fchrungsrollen und die Unterscheidung zwischen aktiver Beteiligung und blo\u00dfer Erw\u00e4hnung.'
      ),
    ),

    // Verknüpfungstypen
    el('section', { className: 'page__section' },
      el('h2', {}, 'Verkn\u00fcpfungstypen'),
      el('p', {},
        'Jedes Objekt kann mit Personen, Institutionen, Orten und Werken verkn\u00fcpft sein. ' +
        'Jede Verkn\u00fcpfung tr\u00e4gt eine Rolle, die den Kontext beschreibt.'
      ),
      el('table', { className: 'page__table' },
        el('thead', {},
          el('tr', {},
            el('th', {}, 'Kategorie'),
            el('th', {}, 'Eigenschaft'),
            el('th', {}, 'Beschreibung'),
            el('th', {}, 'Beispielrollen'),
          ),
        ),
        el('tbody', {},
          el('tr', {},
            el('td', {}, 'Personen'),
            el('td', { className: 'mono' }, 'rico:hasOrHadAgent'),
            el('td', {}, 'Aktiv beteiligte Personen mit spezifischer Funktion'),
            el('td', {}, 's\u00e4nger:in, dirigent:in, komponist:in, verfasser:in, herausgeber:in, regisseur:in'),
          ),
          el('tr', {},
            el('td', {}, 'Institutionen'),
            el('td', { className: 'mono' }, 'rico:hasOrHadAgent'),
            el('td', {}, 'Beteiligte Organisationen, Ensembles, Verlage'),
            el('td', {}, 'herausgeber:in, veranstalter:in, rahmenveranstaltung, erw\u00e4hnt'),
          ),
          el('tr', {},
            el('td', {}, 'Orte'),
            el('td', { className: 'mono' }, 'rico:hasOrHadLocation'),
            el('td', {}, 'Geographische Bez\u00fcge mit kontextspezifischer Rolle'),
            el('td', {}, 'auff\u00fchrungsort, absendeort, erscheinungsdatum, erw\u00e4hnt'),
          ),
          el('tr', {},
            el('td', {}, 'Werke'),
            el('td', { className: 'mono' }, 'rico:hasOrHadSubject'),
            el('td', {}, 'Musikwerke mit Komponist und Auff\u00fchrungsbezug'),
            el('td', {}, 'auff\u00fchrung, erw\u00e4hnt'),
          ),
          el('tr', {},
            el('td', {}, 'Rollen'),
            el('td', { className: 'mono' }, 'm3gim:hasPerformanceRole'),
            el('td', {}, 'Konkrete B\u00fchnenrollen aus Auff\u00fchrungen'),
            el('td', {}, 'Orpheus, Br\u00fcnnhilde, Brang\u00e4ne, Isolde, \u2026'),
          ),
          el('tr', {},
            el('td', {}, 'Erw\u00e4hnt'),
            el('td', { className: 'mono' }, 'm3gim:mentions'),
            el('td', {}, 'Personen, die im Dokument erw\u00e4hnt, aber nicht aktiv beteiligt sind'),
            el('td', {}, 'erw\u00e4hnt (schw\u00e4chere Verkn\u00fcpfung als Agent)'),
          ),
        ),
      ),
    ),

    // Semantische Unterscheidungen
    el('section', { className: 'page__section' },
      el('h2', {}, 'Semantische Unterscheidungen'),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'Agent vs. Erw\u00e4hnung'),
        el('dd', {},
          'Eine Person als rico:hasOrHadAgent war aktiv am Dokument beteiligt (z.\u00a0B. als S\u00e4ngerin, Dirigent oder Verfasserin). ' +
          'Eine Person als m3gim:mentions wird im Text erw\u00e4hnt, ohne direkt beteiligt zu sein. ' +
          'Diese Unterscheidung ist zentral f\u00fcr Netzwerkanalysen: Ein Erw\u00e4hnungsnetz hat eine andere Qualit\u00e4t als ein Beteiligungsnetz.'
        ),
        el('dt', {}, 'Person vs. Institution'),
        el('dd', {},
          'Agents werden nach Typ unterschieden: rico:Person (nat\u00fcrliche Personen), ' +
          'rico:CorporateBody (Institutionen wie Opernhäuser, Verlage, Zeitungen) und rico:Group (Ensembles). ' +
          'Im Bestand: ' + stats.personAgentCount + ' Personen-Verkn\u00fcpfungen, ' +
          stats.institutionAgentCount + ' Institutions-Verkn\u00fcpfungen.'
        ),
        el('dt', {}, 'Ort-Rollen'),
        el('dd', {},
          'Orte tragen kontextspezifische Rollen: Ein \u201eAuff\u00fchrungsort\u201c (auffuehrungsort) ist ein Spielort, ' +
          'ein \u201eAbsendeort\u201c (absendeort) der Herkunftsort eines Briefs, ' +
          'ein \u201eErscheinungsdatum\u201c (erscheinungsdatum) markiert den Publikationsort. ' +
          'Diese Granularit\u00e4t erm\u00f6glicht differenzierte geographische Analysen.'
        ),
        el('dt', {}, 'Werk mit Kontext'),
        el('dd', {},
          'Werke tragen neben dem Namen den Komponisten und eine Rolle (auff\u00fchrung vs. erw\u00e4hnt). ' +
          'Erg\u00e4nzend erfassen die Auff\u00fchrungsrollen (m3gim:hasPerformanceRole) die konkreten ' +
          'B\u00fchnenrollen \u2014 z.\u00a0B. \u201eOrpheus\u201c in \u201eOrpheus und Eurydike\u201c.'
        ),
      ),
    ),

    // Identifikatoren
    el('section', { className: 'page__section' },
      el('h2', {}, 'Identifikatoren und Normdaten'),
      el('p', {},
        'Wo m\u00f6glich, werden Entit\u00e4ten mit Wikidata-Identifikatoren (wd:QXXXXX) verkn\u00fcpft. ' +
        'Dies erm\u00f6glicht die Verbindung zu externen Wissensbasen und die eindeutige Identifikation von Personen, ' +
        'Institutionen und Werken \u00fcber Namensvarianten hinweg.'
      ),
      el('dl', { className: 'page__stats' },
        el('dt', {}, 'Personen mit Wikidata'), el('dd', {}, `${stats.personsWithWd} von ${stats.personsTotal}`),
        el('dt', {}, 'Organisationen mit Wikidata'), el('dd', {}, `${stats.orgsWithWd} von ${stats.orgsTotal}`),
        el('dt', {}, 'Werke mit Wikidata'), el('dd', {}, `${stats.worksWithWd} von ${stats.worksTotal}`),
      ),
      el('p', {},
        'Die Archiv-Signaturen folgen dem Schema UAKUG/NIM und gliedern sich in drei Bestandsgruppen: ' +
        'Hauptbestand (UAKUG/NIM_XXX), Plakate (UAKUG/NIM/PL_XX) und Tontr\u00e4ger (UAKUG/NIM_TT_XX).'
      ),
    ),

    // Bestandsstatistik (live)
    el('section', { className: 'page__section' },
      el('h2', {}, 'Bestandsstatistik'),
      el('dl', { className: 'page__stats' },
        el('dt', {}, 'Archivalien'), el('dd', {}, `${store.allRecords.length} Objekte in ${store.konvolute.size} Konvoluten`),
        el('dt', {}, 'Personen'), el('dd', {}, `${stats.personsTotal} (davon ${stats.personsWithWd} mit Wikidata-ID)`),
        el('dt', {}, 'Organisationen'), el('dd', {}, `${stats.orgsTotal} (davon ${stats.orgsWithWd} mit Wikidata-ID)`),
        el('dt', {}, 'Orte'), el('dd', {}, String(stats.locationsTotal)),
        el('dt', {}, 'Werke'), el('dd', {}, `${stats.worksTotal} (davon ${stats.worksWithWd} mit Wikidata-ID)`),
        el('dt', {}, 'Verkn\u00fcpfte Objekte'), el('dd', {}, `${stats.linkedCount} von ${store.allRecords.length} (${stats.linkedPct}%)`),
      ),
    ),

    // Technische Referenz
    el('section', { className: 'page__section' },
      el('h2', {}, 'Technische Referenz'),
      el('p', {},
        'Die Daten werden als JSON-LD serialisiert. Der @context definiert die Namensraeume:'
      ),
      el('dl', { className: 'page__layers' },
        el('dt', {}, 'rico:'),
        el('dd', {}, 'Records in Contexts Ontology 1.1 \u2014 Archivbeschreibung, Agenten, Orte, Datierung'),
        el('dt', {}, 'm3gim:'),
        el('dd', {}, 'M\u00b3GIM-Erweiterung \u2014 Musikwerke, Auff\u00fchrungsrollen, Bearbeitungsstand, Erw\u00e4hnung'),
        el('dt', {}, 'skos:'),
        el('dd', {}, 'Simple Knowledge Organization System \u2014 Vokabulareintr\u00e4ge und Bezeichnungen'),
        el('dt', {}, 'wd:'),
        el('dd', {}, 'Wikidata-Entit\u00e4ten (z.\u00a0B. wd:Q94208 f\u00fcr Ira Malaniuk)'),
      ),
      el('p', { className: 'page__note' },
        'Vollst\u00e4ndige Ontologie-Dokumentation im GitHub-Repository unter knowledge/datenmodell-ontologie.md.'
      ),
    ),
  );

  container.appendChild(page);
}

function computeStats(store) {
  let personsWithWd = 0;
  for (const [, data] of store.persons) {
    if (data.wikidata) personsWithWd++;
  }

  let orgsWithWd = 0;
  for (const [, data] of store.organizations) {
    if (data.wikidata) orgsWithWd++;
  }

  let worksWithWd = 0;
  for (const [, data] of store.works) {
    if (data.wikidata) worksWithWd++;
  }

  // Count agent type split across all records
  let personAgentCount = 0;
  let institutionAgentCount = 0;
  for (const record of store.allRecords) {
    const agents = ensureArray(record['rico:hasOrHadAgent']);
    for (const a of agents) {
      if (a['@type'] === 'rico:CorporateBody' || a['@type'] === 'rico:Group') {
        institutionAgentCount++;
      } else {
        personAgentCount++;
      }
    }
  }

  const linkedCount = store.allRecords.filter(r =>
    r['rico:hasOrHadAgent'] || r['rico:hasOrHadLocation'] ||
    r['rico:hasOrHadSubject'] || r['m3gim:mentions']
  ).length;

  return {
    personsTotal: store.persons.size,
    personsWithWd,
    orgsTotal: store.organizations.size,
    orgsWithWd,
    locationsTotal: store.locations.size,
    worksTotal: store.works.size,
    worksWithWd,
    personAgentCount,
    institutionAgentCount,
    linkedCount,
    linkedPct: Math.round(linkedCount / store.allRecords.length * 100),
  };
}
