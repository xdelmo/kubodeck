import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { DEFAULT_CONFIG, type BoxConfig } from '../src/lib/config';
import { getManifold, type Wasm } from '../src/lib/geometry/wasm';
import { buildParts, disposeParts, type Part } from '../src/lib/geometry/box';
import { composeArt } from '../src/lib/geometry/art';
import { parseBinaryStl, toBinaryStl } from '../src/lib/export/stl';
import { buildExportZip } from '../src/lib/export/zip';
import { loadFonts } from './geometry/fonts';

let wasm: Wasm;
const built: Part[][] = [];
const partsFor = (config: BoxConfig) => {
  const parts = buildParts(wasm, config, composeArt(config, loadFonts()).art);
  built.push(parts);
  return parts;
};
beforeAll(async () => {
  wasm = await getManifold();
});
afterAll(() => built.forEach(disposeParts));

const ALL = [
  'LEGGIMI.txt',
  'kubodeck-body-collar.stl',
  'kubodeck-body-front-art.stl',
  'kubodeck-body.stl',
  'kubodeck-cap-art.stl',
  'kubodeck-cap.stl',
];

describe('toBinaryStl', () => {
  test('round trip di ogni parte: manifold e stesso volume (±0,1%)', () => {
    const parts = partsFor(DEFAULT_CONFIG);
    expect(parts).toHaveLength(5);
    for (const p of parts) {
      const bytes = toBinaryStl(p.manifold);
      const n = new DataView(bytes.buffer, bytes.byteOffset).getUint32(80, true);
      expect(n).toBe(p.manifold.numTri());
      expect(bytes.length).toBe(84 + 50 * n);

      const { positions } = parseBinaryStl(bytes);
      expect(positions.length).toBe(9 * n);
      const mesh = new wasm.Mesh({
        numProp: 3,
        vertProperties: positions,
        triVerts: Uint32Array.from({ length: 3 * n }, (_, i) => i),
      });
      mesh.merge();
      const back = new wasm.Manifold(mesh);
      try {
        expect(back.status()).toBe('NoError');
        expect(Math.abs(back.volume() - p.manifold.volume()) / p.manifold.volume()).toBeLessThan(
          0.001,
        );
      } finally {
        back.delete();
      }
    }
  });

  test("le normali puntano verso l'esterno (un cubo unitario)", () => {
    const cube = wasm.Manifold.cube([1, 1, 1]);
    try {
      const bytes = toBinaryStl(cube);
      const dv = new DataView(bytes.buffer, bytes.byteOffset);
      for (let t = 0; t < 12; t++) {
        const o = 84 + 50 * t;
        const nrm = [0, 1, 2].map((k) => dv.getFloat32(o + 4 * k, true));
        const c = [0, 1, 2].map(
          (k) =>
            (dv.getFloat32(o + 12 + 4 * k, true) +
              dv.getFloat32(o + 24 + 4 * k, true) +
              dv.getFloat32(o + 36 + 4 * k, true)) /
              3 -
            0.5,
        );
        expect(nrm[0] * c[0] + nrm[1] * c[1] + nrm[2] * c[2]).toBeGreaterThan(0);
        expect(Math.hypot(...nrm)).toBeCloseTo(1, 5);
      }
    } finally {
      cube.delete();
    }
  });
});

describe('buildExportZip', () => {
  test('contiene i 5 STL e il LEGGIMI', () => {
    const files = unzipSync(buildExportZip(partsFor(DEFAULT_CONFIG)));
    expect(Object.keys(files).sort()).toEqual(ALL);
    expect(strFromU8(files['LEGGIMI.txt'])).toContain('Bambu Studio');
  });

  test('senza testo né emblema mancano solo i file *-art.stl', () => {
    const config = {
      ...DEFAULT_CONFIG,
      text: { ...DEFAULT_CONFIG.text, value: '' },
      emblem: { ...DEFAULT_CONFIG.emblem, id: null },
    };
    const files = unzipSync(buildExportZip(partsFor(config)));
    expect(Object.keys(files).sort()).toEqual(ALL.filter((f) => !f.includes('-art')));
  });
});
