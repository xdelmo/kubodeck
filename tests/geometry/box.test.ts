import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/lib/config';
import { getManifold, type Wasm } from '../../src/lib/geometry/wasm';
import { buildParts, capToAssembled, disposeParts, type Part } from '../../src/lib/geometry/box';
import { intersectVolume, probe } from './helpers';

let wasm: Wasm;
let parts: Part[];
const part = (id: string) => parts.find((p) => p.id === id)!;
const noArt = { front: null, cap: null };

beforeAll(async () => {
  wasm = await getManifold();
  parts = buildParts(wasm, DEFAULT_CONFIG, noArt);
});
afterAll(() => disposeParts(parts));

describe('getManifold', () => {
  test('restituisce sempre la stessa istanza', async () => {
    expect(await getManifold()).toBe(wasm);
  });
});

describe('buildParts con DEFAULT_CONFIG', () => {
  test('tre parti, tutte manifold', () => {
    expect(parts.map((p) => p.id).sort()).toEqual(['body', 'cap', 'collar']);
    for (const p of parts) expect(p.manifold.status()).toBe('NoError');
    expect(part('body')).toMatchObject({ zone: 'body', object: 'body' });
    expect(part('collar')).toMatchObject({ zone: 'accent', object: 'body' });
    expect(part('cap')).toMatchObject({ zone: 'cap', object: 'cap' });
  });

  test('bbox di corpo, colletto e calotta assemblata', () => {
    const b = part('body').manifold.boundingBox();
    [0, 0, 0].forEach((v, i) => expect(b.min[i]).toBeCloseTo(v, 6));
    [78, 39.6, 74].forEach((v, i) => expect(b.max[i]).toBeCloseTo(v, 6));
    const c = part('collar').manifold.boundingBox();
    expect(c.min[2]).toBeCloseTo(74, 6);
    expect(c.max[2]).toBeCloseTo(100.9, 6);
    const cap = part('cap').manifold.boundingBox();
    expect(cap.min[2]).toBeCloseTo(0, 6);
    expect(cap.max[2]).toBeCloseTo(30, 6);
    const a = capToAssembled(wasm, part('cap').manifold, 39.6);
    try {
      const ab = a.boundingBox();
      expect(ab.min[2]).toBeCloseTo(74, 6);
      expect(ab.max[2]).toBeCloseTo(104, 6);
      expect(ab.min[1]).toBeCloseTo(0, 6);
      expect(ab.max[1]).toBeCloseTo(39.6, 6);
    } finally {
      a.delete();
    }
  });

  test('presa per le dita sul fronte del colletto da z 86 in su', () => {
    const above = probe(wasm, 39, 2.2, 95);
    const below = probe(wasm, 39, 2.2, 80);
    try {
      expect(intersectVolume(part('collar').manifold, above)).toBe(0);
      expect(intersectVolume(part('collar').manifold, below)).toBeGreaterThan(0);
    } finally {
      above.delete();
      below.delete();
    }
  });

  test('il colletto ha lo smusso sullo spigolo esterno in alto', () => {
    // a 0.2 mm dal bordo esterno del colletto e 0.2 sotto la cima si è dentro lo smusso 0.6 × 45°
    const p = probe(wasm, 20, 1.8, 100.7, 0.1);
    try {
      expect(intersectVolume(part('collar').manifold, p)).toBe(0);
    } finally {
      p.delete();
    }
  });

  test('volume del corpo', () => {
    expect(part('body').manifold.volume()).toBeCloseTo(78 * 39.6 * 74 - 72.4 * 34 * 71.2, 3);
  });

  test('stack 20 dà profondità 26.6', () => {
    const p = buildParts(wasm, { ...DEFAULT_CONFIG, stackThicknessMm: 20 }, noArt);
    try {
      const b = p.find((x) => x.id === 'body')!.manifold.boundingBox();
      expect(b.max[1] - b.min[1]).toBeCloseTo(26.6, 6);
    } finally {
      disposeParts(p);
    }
  });
});
