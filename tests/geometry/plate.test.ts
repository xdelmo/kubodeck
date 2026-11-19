import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/lib/config';
import { getManifold, type Wasm } from '../../src/lib/geometry/wasm';
import { buildParts, disposeParts, type Part } from '../../src/lib/geometry/box';
import { runChecks } from '../../src/lib/geometry/checks';
import { layoutOnPlate } from '../../src/lib/geometry/plate';

let wasm: Wasm;
let parts: Part[];

beforeAll(async () => {
  wasm = await getManifold();
  parts = buildParts(wasm, DEFAULT_CONFIG, { front: null, cap: null });
});
afterAll(() => disposeParts(parts));

const bboxOf = (ps: Part[], object: Part['object']) => {
  const ms = ps.filter((p) => p.object === object).map((p) => p.manifold.boundingBox());
  return {
    min: [0, 1, 2].map((i) => Math.min(...ms.map((b) => b.min[i]))),
    max: [0, 1, 2].map((i) => Math.max(...ms.map((b) => b.max[i]))),
  };
};

describe('layoutOnPlate', () => {
  test('corpo e calotta affiancati in Y con 5 mm di spazio', () => {
    const { parts: laid, footprint } = layoutOnPlate(wasm, parts);
    try {
      expect(footprint.x).toBeCloseTo(78, 6);
      expect(footprint.y).toBeCloseTo(84.2, 6);
      const body = bboxOf(laid, 'body');
      const cap = bboxOf(laid, 'cap');
      expect(body.min[2]).toBeCloseTo(0, 6);
      expect(cap.min[2]).toBeCloseTo(0, 6);
      expect(cap.min[1] - body.max[1]).toBeCloseTo(5, 6);
      expect(laid.map((p) => p.id)).toEqual(parts.map((p) => p.id));
      // le parti di un oggetto restano dove stavano l'una rispetto all'altra
      const b = laid.find((p) => p.id === 'body')!.manifold.boundingBox();
      const c = laid.find((p) => p.id === 'collar')!.manifold.boundingBox();
      expect(c.min[2] - b.min[2]).toBeCloseTo(74, 6);
    } finally {
      disposeParts(laid);
    }
  });

  test('con frontArt in rilievo di 0.8 in −y il footprint cresce a 85.0', () => {
    const art: Part = {
      id: 'frontArt',
      zone: 'text',
      object: 'body',
      manifold: wasm.Manifold.cube([30, 0.8, 10]).translate([24, -0.8, 30]),
    };
    const { parts: laid, footprint } = layoutOnPlate(wasm, [...parts, art]);
    try {
      expect(footprint.y).toBeCloseTo(85.0, 6);
      expect(footprint.x).toBeCloseTo(78, 6);
    } finally {
      disposeParts(laid);
      art.manifold.delete();
    }
  });

  test('fitsPlate verde sulle parti vere, falso con una calotta da 200 mm', () => {
    expect(runChecks(wasm, parts, DEFAULT_CONFIG).find((c) => c.id === 'fitsPlate')!.ok).toBe(true);
    const big: Part = {
      id: 'cap',
      zone: 'cap',
      object: 'cap',
      manifold: wasm.Manifold.cube([78, 200, 30]),
    };
    try {
      const others = parts.filter((p) => p.object === 'body');
      const c = runChecks(wasm, [...others, big], DEFAULT_CONFIG).find(
        (x) => x.id === 'fitsPlate',
      )!;
      expect(c.ok).toBe(false);
      expect(c.message).toMatch(/\b(riduci|accorcia|scegli|cambia)\b/i);
    } finally {
      big.manifold.delete();
    }
  });
});
