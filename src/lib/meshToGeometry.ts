import { BufferAttribute, BufferGeometry } from 'three';
import type { Manifold } from 'manifold-3d';

// Non indicizzata con normali piatte: gli spigoli della scatola restano vivi, come in stampa.
export function meshToGeometry(m: Manifold): BufferGeometry {
  const { vertProperties, triVerts, numProp } = m.getMesh();
  const positions = new Float32Array(triVerts.length * 3);
  for (let i = 0; i < triVerts.length; i++) {
    const v = triVerts[i] * numProp;
    positions[3 * i] = vertProperties[v];
    positions[3 * i + 1] = vertProperties[v + 1];
    positions[3 * i + 2] = vertProperties[v + 2];
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
