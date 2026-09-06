/**
 * Der Kartenausschnitt folgt der Treffermenge.
 *
 * Der stille Defekt, gegen den diese Datei steht: der Ausschnitt stand einmal
 * fuer Europa fest, also lagen New York und Buenos Aires ausserhalb des Bildes,
 * und wer sie nicht fand, hielt sie fuer nicht vorhanden. `fitTransform` legt
 * den Ausschnitt nach jedem Schnitt auf die gezeichneten Punkte; die
 * Mindestausdehnung haelt einen einzelnen Ort davon ab, in den Strassenraster
 * zu zoomen.
 *
 * Lauf: node --test tests/frontend/karte-fit.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { fitTransform, nodeTooltipHtml } from '../../docs/js/views/karte-map.js';

// Der Kartenbereich in der Groesse, die der Browser bei 1920x1080 misst
// (gemessen im Playwright-Lauf: svg 1624 x 949, Rand 60).
const BOX = { width: 1624, height: 949, pad: 60, minSpan: 280, maxK: 12 };

/** Liegt der Rahmen nach der Transformation im Bild? */
function inside(bounds, fit, box) {
  const at = (x, y) => [fit.k * x + fit.tx, fit.k * y + fit.ty];
  const [left, top] = at(bounds.x0, bounds.y0);
  const [right, bottom] = at(bounds.x1, bounds.y1);
  return left >= -0.5 && top >= -0.5
    && right <= box.width + 0.5 && bottom <= box.height + 0.5;
}

describe('fitTransform', () => {
  test('ein weiter Rahmen kommt ganz ins Bild', () => {
    // Der reale Fall: Buenos Aires liegt im projizierten Grundbild weit unter
    // Europa, der Rahmen ist damit hoeher als das Bild.
    const bounds = { x0: -200, y0: -100, x1: 1500, y1: 3800 };
    const fit = fitTransform(bounds, BOX);
    assert.ok(fit.k < 1, `der Ausschnitt muss weiter werden, k=${fit.k}`);
    assert.ok(inside(bounds, fit, BOX), 'der Rahmen liegt nicht im Bild');
  });

  test('der Rahmen steht mittig im Bild', () => {
    const bounds = { x0: 400, y0: 300, x1: 900, y1: 700 };
    const fit = fitTransform(bounds, BOX);
    const cx = fit.k * (bounds.x0 + bounds.x1) / 2 + fit.tx;
    const cy = fit.k * (bounds.y0 + bounds.y1) / 2 + fit.ty;
    assert.ok(Math.abs(cx - BOX.width / 2) < 0.001);
    assert.ok(Math.abs(cy - BOX.height / 2) < 0.001);
  });

  test('ein einzelner Ort zoomt nicht in den Strassenraster', () => {
    const point = { x0: 700, y0: 400, x1: 700, y1: 400 };
    const fit = fitTransform(point, BOX);
    // Ohne Mindestausdehnung waere k die Obergrenze des Reglers.
    assert.ok(fit.k < BOX.maxK, `ein Punkt zoomt auf k=${fit.k}`);
    assert.equal(fit.k, (BOX.height - 2 * BOX.pad) / BOX.minSpan,
      'die kleinere Seite des Bildes bestimmt die Weite');
    assert.ok(fit.k > 1, 'so weit wie moeglich, aber nicht enger als noetig');
  });

  test('zwei nahe Orte werden wie ein einzelner behandelt', () => {
    const near = { x0: 700, y0: 400, x1: 720, y1: 410 };
    const point = { x0: 710, y0: 405, x1: 710, y1: 405 };
    assert.equal(fitTransform(near, BOX).k, fitTransform(point, BOX).k,
      'unterhalb der Mindestausdehnung bleibt die Weite dieselbe');
  });

  test('die Vergroesserung endet an der Obergrenze des Reglers', () => {
    const fit = fitTransform({ x0: 700, y0: 400, x1: 700, y1: 400 },
      { ...BOX, minSpan: 1 });
    assert.equal(fit.k, BOX.maxK);
  });
});

describe('Karten-Tooltip', () => {
  test('Orts- und Rollenwerte werden als Text behandelt', () => {
    const html = nodeTooltipHtml({
      city: '<img src=x onerror=alert(1)>', shown: 1,
      firstYear: 1954, lastYear: 1954,
      breakdown: [{ id: 'x', label: '<script>alert(1)</script>', count: 1,
        color: 'var(--color-text-tertiary)' }],
    });
    assert.doesNotMatch(html, /<img|<script/);
    assert.match(html, /&lt;img/);
    assert.match(html, /&lt;script&gt;/);
  });
});
