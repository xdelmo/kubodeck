import { afterAll, beforeAll, expect, test } from 'vitest';
import { normalizeConfig } from '../src/lib/config';
import { PRESETS } from '../src/lib/presets';
import { getManifold, type Wasm } from '../src/lib/geometry/wasm';
import { buildParts, disposeParts, type Part } from '../src/lib/geometry/box';
import { runChecks } from '../src/lib/geometry/checks';
import { composeArt } from '../src/lib/geometry/art';
import { loadFonts } from './geometry/fonts';

let wasm: Wasm;
const built: Part[][] = [];
beforeAll(async () => {
  wasm = await getManifold();
});
afterAll(() => built.forEach(disposeParts));

test('quattro preset con id unici e nome in due lingue', () => {
  expect(PRESETS).toHaveLength(4);
  expect(new Set(PRESETS.map((p) => p.id)).size).toBe(4);
  for (const p of PRESETS) {
    expect(p.name.it.length).toBeGreaterThan(0);
    expect(p.name.en.length).toBeGreaterThan(0);
  }
});

test.each(PRESETS)('$id: normalizeConfig non cambia nulla e i controlli sono verdi', (p) => {
  expect(normalizeConfig(p.config)).toEqual(p.config);
  const { art, checks: artChecks } = composeArt(p.config, loadFonts());
  const parts = buildParts(wasm, p.config, art);
  built.push(parts);
  expect(runChecks(wasm, parts, p.config, artChecks).filter((c) => !c.ok)).toEqual([]);
});
