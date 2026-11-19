import { expect, test } from 'vitest';
import Module from 'manifold-3d';

test('manifold-3d si inizializza e calcola il volume di un cubo', async () => {
  const wasm = await Module();
  wasm.setup();
  expect(wasm.Manifold.cube([1, 1, 1]).volume()).toBeCloseTo(1);
});
