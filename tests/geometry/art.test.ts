import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Manifold } from 'manifold-3d';
import type { Font } from 'opentype.js';
import { DEFAULT_CONFIG, depthMm, type BoxConfig, type FontId } from '../../src/lib/config';
import { getManifold, type Wasm } from '../../src/lib/geometry/wasm';
import { buildParts, capToAssembled, disposeParts, type Part } from '../../src/lib/geometry/box';
import { runChecks } from '../../src/lib/geometry/checks';
import { composeArt, minStrokeOk, textToPolygons } from '../../src/lib/geometry/art';
import { intersectVolume } from './helpers';
import { loadFonts } from './fonts';

let wasm: Wasm;
let fonts: Record<FontId, Font>;
beforeAll(async () => {
  wasm = await getManifold();
  fonts = loadFonts();
});

const cfg = (
  text: Partial<BoxConfig['text']>,
  emblem: Partial<BoxConfig['emblem']> = {},
): BoxConfig => ({
  ...DEFAULT_CONFIG,
  text: { ...DEFAULT_CONFIG.text, ...text },
  emblem: { ...DEFAULT_CONFIG.emblem, ...emblem },
});

const built: Part[][] = [];
afterAll(() => built.forEach(disposeParts));
const build = (config: BoxConfig) => {
  const { art, checks } = composeArt(config, fonts);
  const parts = buildParts(wasm, config, art);
  built.push(parts);
  return { parts, checks: runChecks(wasm, parts, config, checks) };
};
const part = (parts: Part[], id: string) => parts.find((p) => p.id === id);

// Volume del solido nella metà "bassa" e "alta" lungo un asse, rispetto al centro del suo bbox.
const halves = (m: Manifold, axis: 0 | 1 | 2): [number, number] => {
  const bb = m.boundingBox();
  const mid = (bb.min[axis] + bb.max[axis]) / 2;
  const size: [number, number, number] = [1000, 1000, 1000];
  const lo: [number, number, number] = [-500, -500, -500];
  const hi: [number, number, number] = [-500, -500, -500];
  lo[axis] = mid - 1000;
  hi[axis] = mid;
  const out = [lo, hi].map((p) => {
    const c = wasm.Manifold.cube(size).translate(p);
    try {
      return intersectVolume(m, c);
    } finally {
      c.delete();
    }
  });
  return [out[0], out[1]];
};

const bboxOf = (polys: [number, number][][]) => {
  const pts = polys.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

describe('textToPolygons', () => {
  test.each(['display', 'mono'] as const)("'H' a 10 mm è alta 10 ± 0,2 (%s)", (id) => {
    const { polygons, missing } = textToPolygons(fonts[id], 'H', 10);
    expect(missing).toEqual([]);
    expect(bboxOf(polygons!).h).toBeCloseTo(10, 0);
    expect(Math.abs(bboxOf(polygons!).h - 10)).toBeLessThanOrEqual(0.2);
  });

  test('segnala i caratteri senza glifo', () => {
    const { polygons, missing } = textToPolygons(fonts.display, 'Ciao✓漢', 10);
    expect(missing).toEqual(['✓', '漢']);
    expect(polygons).not.toBeNull();
  });

  test("'KUBO ' produce la stessa larghezza di 'KUBO'", () => {
    const a = textToPolygons(fonts.display, 'KUBO ', 10);
    const b = textToPolygons(fonts.display, 'KUBO', 10);
    expect(Math.abs(bboxOf(a.polygons!).w - bboxOf(b.polygons!).w)).toBeLessThanOrEqual(1e-6);
  });

  test('segnala U+3000 come glifo mancante senza disegnare .notdef', () => {
    const a = textToPolygons(fonts.display, 'A\u3000B', 10);
    const b = textToPolygons(fonts.display, 'AB', 10);
    expect(a.missing).toEqual(['\u3000']);
    expect(Math.abs(bboxOf(a.polygons!).w - bboxOf(b.polygons!).w)).toBeLessThanOrEqual(1e-6);
  });
});

describe('composeArt + buildParts', () => {
  test.each(['display', 'mono'] as const)(
    'KUBODECK con %s: tutto verde, parti disgiunte',
    (font) => {
      const { parts, checks } = build(
        cfg({ value: 'KUBODECK', font, face: 'front' }, { id: 'stella', face: 'cap' }),
      );
      expect(part(parts, 'frontArt')).toMatchObject({ zone: 'text', object: 'body' });
      expect(part(parts, 'capArt')).toMatchObject({ zone: 'text', object: 'cap' });
      for (const p of parts) expect(p.manifold.status()).toBe('NoError');
      expect(checks.filter((c) => !c.ok)).toEqual([]);
      expect(checks.map((c) => c.id)).toEqual(
        expect.arrayContaining(['minStroke', 'artFitsFace', 'glyphs']),
      );
    },
  );

  test('il rilievo sul fronte sporge di 0,8 mm da y = 0', () => {
    const { parts } = build(cfg({ value: 'KUBODECK', face: 'front' }, { id: null }));
    const bb = part(parts, 'frontArt')!.manifold.boundingBox();
    expect(bb.min[1]).toBeCloseTo(-0.8, 5);
    expect(bb.max[1]).toBeCloseTo(0, 5);
  });

  test('"L" sul fronte si legge dritta: più materiale a sinistra e in basso', () => {
    const { parts } = build(cfg({ value: 'L', face: 'front' }, { id: null }));
    const m = part(parts, 'frontArt')!.manifold;
    const [left, right] = halves(m, 0);
    const [bottom, top] = halves(m, 2);
    expect(left).toBeGreaterThan(right);
    expect(bottom).toBeGreaterThan(top);
  });

  test('"L" sulla calotta assemblata si legge dall\'alto: più materiale a x bassa e verso il fronte', () => {
    const config = cfg({ value: 'L', face: 'cap' }, { id: null });
    const { parts } = build(config);
    const assembled = capToAssembled(
      wasm,
      part(parts, 'capArt')!.manifold,
      depthMm(config.stackThicknessMm),
    );
    try {
      const [left, right] = halves(assembled, 0);
      const [front, back] = halves(assembled, 1);
      expect(left).toBeGreaterThan(right);
      expect(front).toBeGreaterThan(back);
    } finally {
      assembled.delete();
    }
  });

  test("l'intarsio è a filo: disgiunto dalla calotta, da z 0 a 0,6", () => {
    const { parts } = build(cfg({ value: 'KUBO', face: 'cap' }, { id: 'stella', face: 'front' }));
    const art = part(parts, 'capArt')!.manifold;
    expect(intersectVolume(art, part(parts, 'cap')!.manifold)).toBeLessThan(1e-6);
    const bb = art.boundingBox();
    expect(bb.min[2]).toBeCloseTo(0, 5);
    expect(bb.max[2]).toBeCloseTo(0.6, 5);
  });

  test('caratteri senza glifo: glyphs rosso e li nomina', () => {
    const { checks } = build(cfg({ value: 'Ciao✓漢', face: 'front' }, { id: null }));
    const g = checks.find((c) => c.id === 'glyphs')!;
    expect(g.ok).toBe(false);
    expect(g.message).toContain('✓');
    expect(g.message).toContain('漢');
  });

  test('U+3000: glyphs rosso e lo nomina', () => {
    const { checks } = build(cfg({ value: 'A\u3000B', face: 'front' }, { id: null }));
    const g = checks.find((c) => c.id === 'glyphs')!;
    expect(g.ok).toBe(false);
    expect(g.message).toContain('\u3000');
  });

  test.each(['', '   '])(
    'testo vuoto %j e niente emblema: solo le tre parti, tutto verde',
    (value) => {
      const { parts, checks } = build(cfg({ value, face: 'front' }, { id: null }));
      expect(parts.map((p) => p.id).sort()).toEqual(['body', 'cap', 'collar']);
      expect(checks.filter((c) => !c.ok)).toEqual([]);
    },
  );

  test.each(['display', 'mono'] as const)(
    '16 caratteri realistici (%s): si rimpicciolisce e resta tutto verde',
    (font) => {
      const { parts, checks } = build(
        cfg({ value: 'MAZZO DEL DRAGO!', font, face: 'front' }, { id: 'stella', face: 'front' }),
      );
      expect(checks.filter((c) => !c.ok)).toEqual([]);
      const bb = part(parts, 'frontArt')!.manifold.boundingBox();
      expect(bb.min[0]).toBeGreaterThanOrEqual(4 - 1e-6);
      expect(bb.max[0]).toBeLessThanOrEqual(74 + 1e-6);
    },
  );

  test('solo caratteri senza glifo: niente rilievo, glyphs rosso', () => {
    const { parts, checks } = build(cfg({ value: '✓✓', face: 'front' }, { id: null }));
    expect(part(parts, 'frontArt')).toBeUndefined();
    expect(checks.find((c) => c.id === 'glyphs')!.ok).toBe(false);
  });

  test('16 W sul fronte non entrano: artFitsFace rosso', () => {
    const { checks } = build(cfg({ value: 'W'.repeat(16), face: 'front' }, { id: null }));
    expect(checks.find((c) => c.id === 'artFitsFace')!.ok).toBe(false);
  });

  test('testo sulla calotta con la pila minima: entra ancora', () => {
    const config = {
      ...cfg({ value: 'KUBO', face: 'cap' }, { id: 'stella', face: 'front' }),
      stackThicknessMm: 20,
    };
    const { checks } = build(config);
    expect(checks.filter((c) => !c.ok)).toEqual([]);
  });
});

describe('runChecks: minStroke sulla geometria stampata', () => {
  const thin: [number, number][][] = [
    [
      [30, 20],
      [30.6, 20],
      [30.6, 40],
      [30, 40],
    ],
  ];
  test.each(['front', 'cap'] as const)('un tratto da 0,6 mm su %s è rosso', (face) => {
    const art =
      face === 'front'
        ? { front: thin, cap: null }
        : { front: null, cap: thin.map((c) => c.map(([x, y]) => [x, y - 15] as [number, number])) };
    const parts = buildParts(wasm, DEFAULT_CONFIG, art);
    built.push(parts);
    const c = runChecks(wasm, parts, DEFAULT_CONFIG).find((k) => k.id === 'minStroke')!;
    expect(c.ok).toBe(false);
    expect(c.message).toContain(face === 'front' ? 'fronte' : 'calotta');
  });
});

describe('minStrokeOk', () => {
  const rect = (w: number): [number, number][][] => [
    [
      [0, 0],
      [w, 0],
      [w, 10],
      [0, 10],
    ],
  ];
  test('un tratto da 0,6 mm è troppo sottile', () =>
    expect(minStrokeOk(wasm, rect(0.6))).toBe(false));
  test('un tratto da 1,0 mm va bene', () => expect(minStrokeOk(wasm, rect(1.0))).toBe(true));
});
