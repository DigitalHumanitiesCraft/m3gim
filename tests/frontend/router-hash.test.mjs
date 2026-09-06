/**
 * Die Hash-Grammatik `#<tab>[/<recordId>][?<query>]` beim Lesen.
 *
 * `filter-url.test.mjs` prüft das Zerlegen und Bauen des Hash als Zeichenkette.
 * Hier steht die andere Richtung: was `parseHash` daraus in den Router-State und
 * in den geteilten Filter überträgt.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Ein Tab-Wechsel ohne Query löscht den gesetzten Filter. Ein leerer Query
 *     heißt "dieser Link nennt keinen Schnitt", nicht "kein Schnitt".
 *   * Ein Deep-Link mit Query verliert den Datensatz, weil der Query-Teil vor
 *     dem Aufteilen an `/` nicht abgetrennt wird.
 *   * Ein alter Bookmark (`#archiv`, `#mobilitaet`) landet auf keinem Tab und
 *     zeigt nichts an, ohne einen Fehler zu melden.
 *   * Ein Sprung auf einen Datensatz schreibt die Adresszeile an `buildHash`
 *     vorbei und verliert dabei den geteilten Schnitt.
 *   * Der zweite Pfadteil der Indizes nennt seit E-226 das Register und keinen
 *     Datensatz; wird er als Datensatz gelesen, versucht die Anwendung ein
 *     Register als Signatur zu oeffnen.
 *   * Der Query-Teil traegt neben dem geteilten Filter Ansichtsparameter, etwa
 *     den gewaehlten Knoten des Netzwerks. Das Neuschreiben des Query verlor
 *     sie, sobald die Adresse auch einen Schnitt nannte.
 *
 * Lauf: node --test tests/frontend/router-hash.test.mjs
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// router.js liest window.location.hash; der Stub steht vor dem Modulimport.
globalThis.window = globalThis.window || {
  location: { hash: '' },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
// Der Router schreibt ueber history.replaceState; der Stub legt das Ergebnis
// dort ab, wo der Browser es haette, damit die Adresszeile pruefbar wird.
globalThis.history = globalThis.history || {
  replaceState(_state, _title, url) { globalThis.window.location.hash = url; },
};
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((fn) => fn());
globalThis.document = globalThis.document || {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
};

const { initRouter, parseHash, getState, navigateToView, selectRecord, setIndexRegister } =
  await import('../../docs/js/ui/router.js');
const { getFilter, resetFilter } = await import('../../docs/js/ui/filter-state.js');

const parse = (hash) => { window.location.hash = hash; parseHash(); };

beforeEach(() => {
  resetFilter();
  parse('#bestand');
});

describe('Pfad-Teil', () => {
  test('ein registrierter Tab wird uebernommen', () => {
    parse('#karte');
    assert.equal(getState().activeTab, 'karte');
  });

  test('ein unbekannter Tab laesst den bisherigen stehen', () => {
    parse('#gibtsnicht');
    assert.equal(getState().activeTab, 'bestand');
  });

  test('ein leerer Hash aendert nichts', () => {
    parse('#chronik');
    parse('');
    assert.equal(getState().activeTab, 'chronik');
  });
});

describe('Datensatz-Teil', () => {
  test('der Deep-Link traegt den Datensatz', () => {
    parse('#bestand/m3gim-data:NIM_004_10');
    assert.equal(getState().activeTab, 'bestand');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_10');
  });

  test('die Signatur wird URL-dekodiert', () => {
    parse('#bestand/' + encodeURIComponent('UAKUG/NIM_003 Folio 01'));
    assert.equal(getState().selectedRecord, 'UAKUG/NIM_003 Folio 01');
  });

  test('der alte Instanzpraefix wird aufgeloest', () => {
    parse('#bestand/m3gim:NIM_004_1');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_1');
  });
});

describe('Query-Teil', () => {
  test('der Schnitt kommt im geteilten Filter an', () => {
    parse('#bestand?person=Malaniuk%2C%20Ira&jahr=1950-1960');
    assert.deepEqual(getFilter().person, ['Malaniuk, Ira']);
    assert.deepEqual(getFilter().zeitfenster, [1950, 1960]);
  });

  test('Query und Datensatz stehen nebeneinander', () => {
    parse('#bestand/m3gim-data:NIM_004_10?person=Malaniuk%2C%20Ira');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_10',
      'Der Query-Teil muss vor dem Aufteilen an / abgetrennt werden.');
    assert.deepEqual(getFilter().person, ['Malaniuk, Ira']);
  });

  test('ein Hash ohne Query loescht den gesetzten Schnitt nicht', () => {
    parse('#bestand?person=Malaniuk%2C%20Ira');
    parse('#karte');
    assert.deepEqual(getFilter().person, ['Malaniuk, Ira']);
  });
});

describe('Ansichtsparameter im Query', () => {
  const KNOTEN = 'knoten=person%3AWagner%2C%20Wieland';

  test('ein Ansichtsparameter ueberlebt das Neuschreiben im selben Tab', () => {
    parse(`#netzwerk?ort=Bayreuth&${KNOTEN}`);
    navigateToView('netzwerk');
    assert.equal(window.location.hash, `#netzwerk?ort=Bayreuth&${KNOTEN}`,
      'Der Router schreibt den Query neu und muss den Ansichtsparameter mitnehmen.');
  });

  test('ohne Schnitt steht der Ansichtsparameter allein', () => {
    parse(`#netzwerk?${KNOTEN}`);
    navigateToView('netzwerk');
    assert.equal(window.location.hash, `#netzwerk?${KNOTEN}`);
  });

  test('der Tabwechsel laesst ihn mit seiner Ansicht fallen', () => {
    parse(`#netzwerk?ort=Bayreuth&${KNOTEN}`);
    navigateToView('bestand');
    assert.equal(window.location.hash, '#bestand?ort=Bayreuth');
  });
});

describe('Legacy-Aliasse', () => {
  test('#archiv fuehrt in den Bestand', () => {
    parse('#archiv');
    assert.equal(getState().activeTab, 'bestand');
  });

  test('#archiv/<id> behaelt den Datensatz', () => {
    parse('#archiv/m3gim-data:NIM_004_10');
    assert.equal(getState().activeTab, 'bestand');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_10');
  });

  test('#mobilitaet und #mobilitaets-atlas fuehren auf die Karte', () => {
    parse('#mobilitaet');
    assert.equal(getState().activeTab, 'karte');
    parse('#bestand');
    parse('#mobilitaets-atlas');
    assert.equal(getState().activeTab, 'karte');
  });
});

describe('Record-Sprung', () => {
  const ID = 'm3gim-data:NIM_004_10';

  test('der Sprung in den Bestand behaelt Datensatz und Schnitt', () => {
    parse('#indizes?person=Malaniuk%2C%20Ira');
    navigateToView('bestand', { recordId: ID });
    assert.equal(getState().activeTab, 'bestand');
    assert.equal(getState().selectedRecord, ID);
    assert.equal(window.location.hash,
      '#bestand/' + encodeURIComponent(ID) + '?person=Malaniuk%2C%20Ira',
      'Ein Sprung an buildHash vorbei verliert den geteilten Schnitt.');
  });

  test('selectRecord schreibt den Schnitt mit', () => {
    parse('#bestand?typ=correspondence');
    selectRecord(ID);
    assert.equal(window.location.hash,
      '#bestand/' + encodeURIComponent(ID) + '?typ=correspondence');
  });

  test('ein Sprung ohne Datensatz laesst den Pfad beim Tab', () => {
    parse('#indizes?ort=Bayreuth');
    navigateToView('karte');
    assert.equal(getState().selectedRecord, null);
    assert.equal(window.location.hash, '#karte?ort=Bayreuth');
  });

  test('der alte Instanzpraefix wird auch beim Sprung aufgeloest', () => {
    parse('#indizes');
    navigateToView('bestand', { recordId: 'm3gim:NIM_004_1' });
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_1');
  });
});

describe('Register-Teil der Indizes (E-226)', () => {
  test('das Register kommt aus dem zweiten Pfadteil', () => {
    parse('#indizes/werke');
    assert.equal(getState().activeTab, 'indizes');
    assert.equal(getState().indexRegister, 'werke');
    assert.equal(getState().selectedRecord, null,
      'Ein Register ist kein Datensatz und darf keinen Deep-Link oeffnen.');
  });

  test('ein Hash ohne Registerteil laesst das gewaehlte Register stehen', () => {
    parse('#indizes/orte');
    parse('#indizes');
    assert.equal(getState().indexRegister, 'orte');
  });

  test('ein unbekanntes Register aendert nichts', () => {
    parse('#indizes/orte');
    parse('#indizes/gibtsnicht');
    assert.equal(getState().indexRegister, 'orte');
  });

  test('jeder andere Tab liest den zweiten Pfadteil weiter als Datensatz', () => {
    parse('#indizes/werke');
    parse('#bestand/m3gim-data:NIM_004_10');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_10');
  });

  test('das Register wird mit dem Schnitt zurueckgeschrieben', () => {
    parse('#indizes/personen?ort=Bayreuth');
    setIndexRegister('orte');
    assert.equal(window.location.hash, '#indizes/orte?ort=Bayreuth');
  });

  test('ein Sprung in ein Register nennt es im Pfad', () => {
    parse('#bestand');
    navigateToView('indizes', { register: 'organisationen', entry: 'Bayreuther Festspiele' });
    assert.equal(getState().indexRegister, 'organisationen');
    assert.equal(window.location.hash, '#indizes/organisationen',
      'Der Eintrag reist als Navigationskontext und steht nicht im Hash.');
  });
});

/*
 * Der Kanal, ueber den ein Hashwechsel im offenen Tab die gezeichnete Ansicht
 * erreicht. Ein Tab wird nur beim ersten Mal gezeichnet, seine Ansichtsparameter
 * liest die Ansicht also genau einmal; ohne diese Meldung waehlte ein in die
 * offene Ansicht eingefuegter Link auf einen Netzwerkknoten nichts aus.
 *
 * Der Block steht am Ende der Datei: er ruft initRouter und haengt damit dauerhaft
 * ein Filter-Abonnement ein, das die Adresszeile der spaeteren Tests mitschriebe.
 */
describe('Ansichtsparameter an die offene Ansicht', () => {
  const listeners = new Map();
  const seen = [];

  const boot = () => {
    window.addEventListener = (type, fn) => { listeners.set(type, fn); };
    window.dispatchEvent = (event) => { seen.push(event); return true; };
    window.location.hash = '#netzwerk';
    initRouter({});
    const fire = listeners.get('hashchange');
    assert.ok(fire, 'Der Router hoert nicht auf hashchange.');
    return fire;
  };

  test('ein Hashwechsel im offenen Tab meldet den Knoten an die Ansicht', () => {
    const fire = boot();
    seen.length = 0;
    window.location.hash = '#netzwerk?knoten=person%3AWagner%2C%20Wieland';
    fire();
    const hit = seen.find(e => e.type === 'm3gim:navigate' && e.detail && e.detail.viewParams);
    assert.ok(hit, 'Der Hashwechsel erreicht die gezeichnete Ansicht nicht.');
    assert.equal(hit.detail.tab, 'netzwerk');
    assert.equal(hit.detail.viewParams, 'knoten=person%3AWagner%2C%20Wieland');
  });

  test('ein Schnitt allein ist kein Ansichtsparameter', () => {
    const fire = boot();
    seen.length = 0;
    window.location.hash = '#netzwerk?ort=Bayreuth';
    fire();
    assert.equal(seen.some(e => e.detail && e.detail.viewParams), false,
      'Der geteilte Filter hat seinen eigenen Weg und faehrt hier nicht mit.');
  });

  test('neben dem Schnitt kommt der Knoten trotzdem an', () => {
    const fire = boot();
    seen.length = 0;
    window.location.hash = '#netzwerk?ort=Bayreuth&knoten=institution%3ABayreuther%20Festspiele';
    fire();
    const hit = seen.find(e => e.detail && e.detail.viewParams);
    assert.ok(hit);
    assert.equal(hit.detail.viewParams, 'knoten=institution%3ABayreuther%20Festspiele');
  });
});
