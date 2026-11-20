import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DEFAULT_CONFIG, FILAMENT_IDS, ZONE_IDS } from '../src/lib/config';
import { FILAMENTS, estimateWeightG } from '../src/lib/filaments';
import { getManifold, type Wasm } from '../src/lib/geometry/wasm';
import { buildParts, disposeParts, type Part } from '../src/lib/geometry/box';
import { composeArt } from '../src/lib/geometry/art';
import { loadFonts } from './geometry/fonts';

let wasm: Wasm;
const built: Part[][] = [];
beforeAll(async () => {
  wasm = await getManifold();
});
afterAll(() => built.forEach(disposeParts));

describe('FILAMENTS', () => {
  test('FILAMENT_IDS sono esattamente le chiavi di FILAMENTS', () => {
    expect([...FILAMENT_IDS].sort()).toEqual(Object.keys(FILAMENTS).sort());
  });

  test.each(Object.values(FILAMENTS))('$id: densità, colore e fonti', (f) => {
    expect(f.densityGcm3).toBeGreaterThanOrEqual(1.1);
    expect(f.densityGcm3).toBeLessThanOrEqual(1.4);
    expect(f.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(f.sources.length).toBeGreaterThanOrEqual(2);
    for (const s of f.sources) expect(s.startsWith('https://')).toBe(true);
  });

  test('i default della configurazione esistono', () => {
    for (const z of ZONE_IDS) expect(FILAMENTS[DEFAULT_CONFIG.filaments[z]]).toBeDefined();
  });
});

describe('estimateWeightG', () => {
  test('un cubo di 10 mm a 1,25 g/cm³ pesa 1,25 g', () => {
    const id = Object.values(FILAMENTS)[0].id;
    const saved = FILAMENTS[id].densityGcm3;
    FILAMENTS[id].densityGcm3 = 1.25;
    const cube = wasm.Manifold.cube([10, 10, 10]);
    try {
      const parts: Part[] = [{ id: 'body', zone: 'body', object: 'body', manifold: cube }];
      const w = estimateWeightG(parts, { ...DEFAULT_CONFIG.filaments, body: id });
      expect(w.total).toBeCloseTo(1.25, 6);
      expect(w.byZone.body).toBeCloseTo(1.25, 6);
      expect(w.byZone.cap).toBe(0);
    } finally {
      cube.delete();
      FILAMENTS[id].densityGcm3 = saved;
    }
  });

  test('su DEFAULT_CONFIG il totale è la somma delle zone', () => {
    const parts = buildParts(wasm, DEFAULT_CONFIG, composeArt(DEFAULT_CONFIG, loadFonts()).art);
    built.push(parts);
    const w = estimateWeightG(parts, DEFAULT_CONFIG.filaments);
    const sum = ZONE_IDS.reduce((a, z) => a + w.byZone[z], 0);
    expect(w.total).toBeCloseTo(sum, 9);
    expect(w.total).toBeGreaterThan(20);
    expect(w.total).toBeLessThan(150);
  });
});
