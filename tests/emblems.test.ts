import { beforeAll, describe, expect, test } from 'vitest';
import { DEFAULT_CONFIG, EMBLEM_IDS } from '../src/lib/config';
import { EMBLEMS } from '../src/lib/emblems';
import { getManifold, type Wasm } from '../src/lib/geometry/wasm';
import { composeArt, minStrokeOk } from '../src/lib/geometry/art';
import { loadFonts } from './geometry/fonts';

let wasm: Wasm;
beforeAll(async () => {
  wasm = await getManifold();
});

const scale = (polys: [number, number][][], k: number) =>
  polys.map((c) => c.map(([x, y]) => [x * k, y * k] as [number, number]));

describe.each(EMBLEM_IDS)('emblema %s', (id) => {
  test('ha un nome e almeno un contorno', () => {
    expect(EMBLEMS[id].label.length).toBeGreaterThan(0);
    expect(EMBLEMS[id].polygons.length).toBeGreaterThan(0);
  });

  test('estruso a 0,8 mm è un solido chiuso', () => {
    const cs = wasm.CrossSection.ofPolygons(EMBLEMS[id].polygons, 'NonZero');
    const m = cs.extrude(0.8);
    try {
      expect(m.status()).toBe('NoError');
      expect(m.isEmpty()).toBe(false);
      expect(m.volume()).toBeGreaterThan(0);
    } finally {
      m.delete();
      cs.delete();
    }
  });

  test('sta nel quadrato 24 × 24 centrato', () => {
    for (const [x, y] of EMBLEMS[id].polygons.flat()) {
      expect(Math.abs(x)).toBeLessThanOrEqual(12 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(12 + 1e-9);
    }
  });

  test('tratto minimo rispettato a 24 mm e a 18 mm', () => {
    expect(minStrokeOk(wasm, EMBLEMS[id].polygons)).toBe(true);
    expect(minStrokeOk(wasm, scale(EMBLEMS[id].polygons, 18 / 24))).toBe(true);
  });

  test('entra nella calotta con la pila minima e 4 mm di margine', () => {
    const config = {
      ...DEFAULT_CONFIG,
      stackThicknessMm: 20,
      text: { ...DEFAULT_CONFIG.text, face: 'front' as const },
      emblem: { id, face: 'cap' as const },
    };
    const { checks } = composeArt(config, loadFonts());
    expect(checks.find((c) => c.id === 'artFitsFace')!.ok).toBe(true);
  });
});
