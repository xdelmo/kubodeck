import type { Manifold } from 'manifold-3d';
import type { Wasm } from '../../src/lib/geometry/wasm';

export const probe = (wasm: Wasm, x: number, y: number, z: number, s = 0.2): Manifold =>
  wasm.Manifold.cube([s, s, s], true).translate([x, y, z]);

export const intersectVolume = (a: Manifold, b: Manifold): number => {
  const i = a.intersect(b);
  try {
    return i.volume();
  } finally {
    i.delete();
  }
};
