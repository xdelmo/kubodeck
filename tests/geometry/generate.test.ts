import { beforeAll, expect, test } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/lib/config';
import { getManifold, type Wasm } from '../../src/lib/geometry/wasm';
import { disposeParts } from '../../src/lib/geometry/box';
import { fromMeshes, generate, toMeshes } from '../../src/lib/geometry/generate';
import { loadFonts } from './fonts';

let wasm: Wasm;
beforeAll(async () => {
  wasm = await getManifold();
});

test('mesh trasferite e ricostruite: stesse parti, stessi volumi, solidi validi', () => {
  const { parts } = generate(wasm, loadFonts(), DEFAULT_CONFIG);
  const meshes = toMeshes(parts);
  const back = fromMeshes(wasm, meshes);
  try {
    expect(back.map((p) => p.id)).toEqual(parts.map((p) => p.id));
    back.forEach((p, i) => {
      expect(p.manifold.status()).toBe('NoError');
      // Le mesh sono float32: conta lo scarto relativo.
      expect(Math.abs(p.manifold.volume() / parts[i].manifold.volume() - 1)).toBeLessThan(1e-6);
    });
    // Le copie hanno un buffer tutto loro, quindi trasferirle non stacca l'heap WASM.
    expect(meshes[0].vertProperties.buffer.byteLength).toBe(meshes[0].vertProperties.byteLength);
  } finally {
    disposeParts(parts);
    disposeParts(back);
  }
});
