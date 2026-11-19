import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { DEFAULT_CONFIG, depthMm } from '../../src/lib/config';
import { getManifold, type Wasm } from '../../src/lib/geometry/wasm';
import { buildParts, capToAssembled, disposeParts, type Part } from '../../src/lib/geometry/box';
import { runChecks, type Check } from '../../src/lib/geometry/checks';
import { intersectVolume } from './helpers';

let wasm: Wasm;
let parts: Part[];
const part = (id: string) => parts.find((p) => p.id === id)!;
const byId = (cs: Check[], id: Check['id']) => cs.find((c) => c.id === id)!;
const ACTION = /\b(riduci|aumenta|accorcia|scegli|cambia|sposta|rigenera|ricarica|togli)\b/i;

beforeAll(async () => {
  wasm = await getManifold();
  parts = buildParts(wasm, DEFAULT_CONFIG, { front: null, cap: null });
});
afterAll(() => disposeParts(parts));

describe('runChecks', () => {
  test('su DEFAULT_CONFIG tutti i controlli geometrici sono verdi', () => {
    const cs = runChecks(wasm, parts, DEFAULT_CONFIG);
    const ids = cs.map((c) => c.id);
    for (const id of [
      'manifold',
      'fitsPlate',
      'capClearance',
      'holdsStack',
      'zonesDisjoint',
    ] as const)
      expect(ids).toContain(id);
    for (const c of cs) expect(c, c.id).toMatchObject({ ok: true });
  });

  test('i controlli extra vengono aggiunti in coda', () => {
    const extra: Check = { id: 'glyphs', ok: false, message: 'Cambia testo: il font non ha «ß».' };
    const cs = runChecks(wasm, parts, DEFAULT_CONFIG, [extra]);
    expect(cs.at(-1)).toEqual(extra);
  });

  test('capClearance: gioco ≥ 0.30 tra colletto e calotta, nessuna intersezione con il corpo', () => {
    const cap = capToAssembled(
      wasm,
      part('cap').manifold,
      depthMm(DEFAULT_CONFIG.stackThicknessMm),
    );
    try {
      expect(part('collar').manifold.minGap(cap, 1)).toBeGreaterThanOrEqual(0.299);
      expect(intersectVolume(cap, part('body').manifold)).toBeLessThan(1e-6);
    } finally {
      cap.delete();
    }
  });

  test('holdsStack falso se la pila non entra nel vano', () => {
    const c = byId(
      runChecks(wasm, parts, { ...DEFAULT_CONFIG, stackThicknessMm: 38 }),
      'holdsStack',
    );
    expect(c.ok).toBe(false);
    expect(c.message).toMatch(ACTION);
  });

  test('zonesDisjoint: le parti dello stesso oggetto non si sovrappongono', () => {
    expect(intersectVolume(part('body').manifold, part('collar').manifold)).toBeLessThan(1e-6);
  });

  test('zonesDisjoint falso con due parti sovrapposte', () => {
    const dup: Part = {
      id: 'frontArt',
      zone: 'text',
      object: 'body',
      manifold: wasm.Manifold.cube([10, 10, 10]),
    };
    try {
      const c = byId(runChecks(wasm, [...parts, dup], DEFAULT_CONFIG), 'zonesDisjoint');
      expect(c.ok).toBe(false);
      expect(c.message).toMatch(ACTION);
    } finally {
      dup.manifold.delete();
    }
  });

  test('manifold falso con una parte vuota', () => {
    const a = wasm.Manifold.cube([1, 1, 1]);
    const b = wasm.Manifold.cube([1, 1, 1]).translate([5, 5, 5]);
    const empty: Part = { id: 'frontArt', zone: 'text', object: 'body', manifold: a.intersect(b) };
    a.delete();
    b.delete();
    try {
      const c = byId(runChecks(wasm, [...parts, empty], DEFAULT_CONFIG), 'manifold');
      expect(c.ok).toBe(false);
      expect(c.message).toMatch(ACTION);
    } finally {
      empty.manifold.delete();
    }
  });

  test('tempo di buildParts + runChecks (informativo)', () => {
    const t0 = performance.now();
    const p = buildParts(wasm, DEFAULT_CONFIG, { front: null, cap: null });
    runChecks(wasm, p, DEFAULT_CONFIG);
    disposeParts(p);
    console.log(`buildParts + runChecks: ${(performance.now() - t0).toFixed(1)} ms`);
  });
});

describe('runChecks agli estremi della pila', () => {
  test.each([20, 40])('pila %d mm: tutti i controlli verdi', (stack) => {
    const config = { ...DEFAULT_CONFIG, stackThicknessMm: stack };
    const ps = buildParts(wasm, config, { front: null, cap: null });
    try {
      for (const c of runChecks(wasm, ps, config))
        expect(c, `${stack}:${c.id}`).toMatchObject({ ok: true });
    } finally {
      disposeParts(ps);
    }
  });
});

test('holdsStack falso se la calotta assemblata invade la pila', () => {
  const D = depthMm(DEFAULT_CONFIG.stackThicknessMm);
  const solidCap = wasm.Manifold.cube([78, D, 30]);
  const ps = parts.map((p) => (p.id === 'cap' ? { ...p, manifold: solidCap } : p));
  try {
    expect(byId(runChecks(wasm, ps, DEFAULT_CONFIG), 'holdsStack').ok).toBe(false);
  } finally {
    solidCap.delete();
  }
});
