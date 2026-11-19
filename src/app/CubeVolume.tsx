'use client';

import { useEffect, useState } from 'react';

// Provvisorio (Task 1): prova che manifold-3d gira nel bundle client.
export default function CubeVolume() {
  const [volume, setVolume] = useState<number | null>(null);
  useEffect(() => {
    import('manifold-3d').then(async ({ default: Module }) => {
      const wasm = await Module({ locateFile: () => '/manifold.wasm' });
      wasm.setup();
      setVolume(wasm.Manifold.cube([1, 1, 1]).volume());
    });
  }, []);
  return <p data-testid="cube-volume">{volume ?? '…'}</p>;
}
