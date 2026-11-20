import { expect, test } from 'vitest';
import { checkMessage, formatG, formatMm, UI } from '../src/lib/i18n';
import type { Check } from '../src/lib/geometry/checks';

test('le due lingue hanno le stesse chiavi', () => {
  expect(Object.keys(UI.en).sort()).toEqual(Object.keys(UI.it).sort());
});

test('i millimetri seguono la lingua', () => {
  expect(formatMm(84.2, 'it')).toBe('84,2 mm');
  expect(formatMm(84.2, 'en')).toBe('84.2 mm');
});

test('ogni controllo, verde o rosso, ha un messaggio in entrambe le lingue', () => {
  const ids: Check['id'][] = [
    'manifold',
    'fitsPlate',
    'capClearance',
    'holdsStack',
    'minStroke',
    'artFitsFace',
    'glyphs',
    'zonesDisjoint',
  ];
  const data = {
    parts: 'body',
    x: 78,
    y: 84.2,
    h: 104,
    stack: 33,
    faces: 'front',
    chars: '✓ 漢',
    clashes: 'body/frontArt',
  };
  for (const id of ids)
    for (const ok of [true, false])
      for (const lang of ['it', 'en'] as const) {
        const m = checkMessage({ id, ok, message: '', data }, lang);
        expect(m.length).toBeGreaterThan(10);
        expect(m).not.toMatch(/undefined|\{/);
      }
});

test('il messaggio dei glifi nomina i caratteri anche in inglese', () => {
  const m = checkMessage({ id: 'glyphs', ok: false, message: '', data: { chars: '✓ 漢' } }, 'en');
  expect(m).toContain('✓');
  expect(m).toContain('漢');
});

test('formatG usa <1 g sotto 0.5 g in entrambe le lingue', () => {
  expect(formatG(0.3, 'it')).toBe('<1 g');
  expect(formatG(100, 'en')).toBe('100 g');
});
