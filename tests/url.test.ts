import { expect, test } from 'vitest';
import { DEFAULT_CONFIG, type BoxConfig } from '../src/lib/config';
import { decodeConfig, encodeConfig } from '../src/lib/url';

const changed: BoxConfig = {
  v: 1,
  stackThicknessMm: 27.5,
  filaments: {
    body: 'pla-basic-white',
    cap: 'pla-matte-terracotta',
    accent: 'pla-basic-black',
    text: 'pla-basic-silver',
  },
  text: { value: 'Mazzo & Co', font: 'mono', face: 'cap' },
  emblem: { id: 'corona', face: 'front' },
};

test('round trip di default e di una config con tutti i campi cambiati', () => {
  expect(encodeConfig(DEFAULT_CONFIG).startsWith('v=1')).toBe(true);
  expect(decodeConfig(encodeConfig(DEFAULT_CONFIG))).toEqual(DEFAULT_CONFIG);
  expect(decodeConfig(encodeConfig(changed))).toEqual(changed);
  expect(decodeConfig('?' + encodeConfig(changed))).toEqual(changed);
});

test('emblema assente sopravvive al round trip', () => {
  const c: BoxConfig = { ...DEFAULT_CONFIG, emblem: { id: null, face: 'front' } };
  expect(decodeConfig(encodeConfig(c))).toEqual(c);
});

test.each([
  ['', {}],
  ['v=2', {}],
  ['v=2&stack=30', {}],
  ['v=1&stack=999', { stackThicknessMm: 40 }],
  ['v=1&stack=abc', {}],
  ['v=1&stack=', {}],
  ['v=1&stack=Infinity', {}],
  ['v=1&em=drago', {}],
  ['v=1&txt=abc%E0%A4%A', {}],
  ['v=1&font=comic', {}],
  ['v=1&txt=%E0%A4%A', {}],
])('URL manomesso %j non lancia e prende i default', (search, expected) => {
  expect(() => decodeConfig(search)).not.toThrow();
  expect(decodeConfig(search)).toEqual({ ...DEFAULT_CONFIG, ...expected });
});

test('decodeConfig restituisce un oggetto nuovo, non il default condiviso', () => {
  const a = decodeConfig('');
  a.filaments.body = 'pla-basic-black';
  expect(decodeConfig('').filaments.body).toBe(DEFAULT_CONFIG.filaments.body);
});

test('testo ed emblema sulla calotta via URL: l’emblema passa sul fronte', () => {
  const c = decodeConfig('v=1&tf=cap&em=sole&ef=cap');
  expect(c.text.face).toBe('cap');
  expect(c.emblem).toEqual({ id: 'sole', face: 'front' });
});
