/**
 * Legacy-Alias des Instanzpraefixes im URL-Hash.
 *
 * Mit der Namensraum-Dreiteilung (E-138) tragen Instanzen `m3gim-data:` statt
 * `m3gim:`. Jedes Bookmark und jeder geteilte Link aus der Zeit davor nennt den
 * alten Praefix. Ohne Aufloesung oeffnet ein solcher Link die Anwendung, findet
 * den Datensatz nicht und zeigt nichts an, ohne einen Fehler zu melden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRecordId } from '../../docs/js/ui/router.js';

test('router (Instanzpraefix im Hash)', async (t) => {
  await t.test('alter Praefix wird auf den heutigen abgebildet', () => {
    assert.equal(resolveRecordId('m3gim:NIM_004_1'), 'm3gim-data:NIM_004_1');
  });

  await t.test('heutiger Praefix bleibt unveraendert', () => {
    assert.equal(resolveRecordId('m3gim-data:NIM_004_1'), 'm3gim-data:NIM_004_1');
  });

  await t.test('ein Vokabularbegriff wird nicht umgeschrieben', () => {
    assert.equal(resolveRecordId('m3gim-vocab:performance'), 'm3gim-vocab:performance');
  });

  await t.test('ein Wert ohne Praefix bleibt, wie er ist', () => {
    assert.equal(resolveRecordId('NIM_004_1'), 'NIM_004_1');
  });

  await t.test('leerer Wert faellt nicht um', () => {
    assert.equal(resolveRecordId(''), '');
    assert.equal(resolveRecordId(null), null);
  });
});
