import { beforeAll, expect, test } from 'vitest';
import { getManifold, type Wasm } from '../src/lib/geometry/wasm';
import { meshToGeometry } from '../src/lib/meshToGeometry';

let wasm: Wasm;
beforeAll(async () => {
  wasm = await getManifold();
});

test("un cubo diventa 36 vertici non indicizzati con normali unitarie verso l'esterno", () => {
  const cube = wasm.Manifold.cube([2, 2, 2], true);
  try {
    const g = meshToGeometry(cube);
    expect(g.index).toBeNull();
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    expect(pos.count).toBe(36);
    for (let i = 0; i < nrm.count; i++) {
      const n = [nrm.getX(i), nrm.getY(i), nrm.getZ(i)];
      expect(Math.hypot(...n)).toBeCloseTo(1, 5);
      // Cubo centrato: la normale di ogni vertice punta dalla stessa parte della sua posizione.
      expect(n[0] * pos.getX(i) + n[1] * pos.getY(i) + n[2] * pos.getZ(i)).toBeGreaterThan(0);
    }
    g.dispose();
  } finally {
    cube.delete();
  }
});
