import { describe, expect, test } from 'vitest';
import { DEFAULT_CONFIG, DIMENSIONS, depthMm, normalizeConfig } from '../src/lib/config';

describe('normalizeConfig', () => {
  test('input non oggetto dà il default', () => {
    expect(normalizeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(normalizeConfig('x')).toEqual(DEFAULT_CONFIG);
  });

  test('limita lo spessore della pila a [20, 40] con passo 0.5', () => {
    expect(normalizeConfig({ stackThicknessMm: 999 }).stackThicknessMm).toBe(40);
    expect(normalizeConfig({ stackThicknessMm: 5 }).stackThicknessMm).toBe(20);
    expect(normalizeConfig({ stackThicknessMm: 30.3 }).stackThicknessMm).toBe(30.5);
    expect(normalizeConfig({ stackThicknessMm: NaN }).stackThicknessMm).toBe(33);
  });

  test('scarta gli id sconosciuti e tiene quelli validi', () => {
    const c = normalizeConfig({
      filaments: { body: 'nope', cap: 'pla-basic-white' },
      text: { font: 'comic', value: 'Ciao', face: 'front' },
      emblem: { id: 'drago', face: 'front' },
    });
    expect(c.filaments.body).toBe(DEFAULT_CONFIG.filaments.body);
    expect(c.filaments.cap).toBe('pla-basic-white');
    expect(c.text.font).toBe(DEFAULT_CONFIG.text.font);
    expect(c.text.value).toBe('Ciao');
    expect(c.emblem.id).toBe(DEFAULT_CONFIG.emblem.id);
  });

  test('emblema null resta null', () => {
    expect(normalizeConfig({ emblem: { id: null, face: 'cap' } }).emblem.id).toBeNull();
  });

  test('testo oltre 16 caratteri dopo trim viene tagliato', () => {
    expect(normalizeConfig({ text: { value: '  ' + 'A'.repeat(20) + ' ' } }).text.value).toBe(
      'A'.repeat(16),
    );
  });

  test('testo ed emblema entrambi sulla calotta: l’emblema passa sul fronte', () => {
    const c = normalizeConfig({ text: { face: 'cap' }, emblem: { id: 'sole', face: 'cap' } });
    expect(c.text.face).toBe('cap');
    expect(c.emblem.face).toBe('front');
  });
});

test('profondità con stack 33 è 39.6', () => {
  expect(depthMm(33)).toBeCloseTo(39.6, 10);
  expect(DIMENSIONS.width).toBe(78);
  expect(DIMENSIONS.height).toBe(104);
});
