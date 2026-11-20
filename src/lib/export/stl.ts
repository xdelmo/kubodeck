import type { Manifold } from 'manifold-3d';

const HEADER = 'KuboDeck STL';

export function toBinaryStl(m: Manifold): Uint8Array {
  const mesh = m.getMesh();
  const { vertProperties, triVerts, numProp } = mesh;
  const triCount = triVerts.length / 3;
  const out = new Uint8Array(84 + 50 * triCount);
  for (let i = 0; i < HEADER.length; i++) {
    out[i] = HEADER.charCodeAt(i);
  }
  const dv = new DataView(out.buffer);
  dv.setUint32(80, triCount, true);

  for (let t = 0; t < triCount; t++) {
    const i0 = triVerts[t * 3] * numProp;
    const i1 = triVerts[t * 3 + 1] * numProp;
    const i2 = triVerts[t * 3 + 2] * numProp;

    const ax = vertProperties[i0];
    const ay = vertProperties[i0 + 1];
    const az = vertProperties[i0 + 2];
    const bx = vertProperties[i1];
    const by = vertProperties[i1 + 1];
    const bz = vertProperties[i1 + 2];
    const cx = vertProperties[i2];
    const cy = vertProperties[i2 + 1];
    const cz = vertProperties[i2 + 2];

    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    const o = 84 + 50 * t;
    dv.setFloat32(o, nx, true);
    dv.setFloat32(o + 4, ny, true);
    dv.setFloat32(o + 8, nz, true);
    dv.setFloat32(o + 12, ax, true);
    dv.setFloat32(o + 16, ay, true);
    dv.setFloat32(o + 20, az, true);
    dv.setFloat32(o + 24, bx, true);
    dv.setFloat32(o + 28, by, true);
    dv.setFloat32(o + 32, bz, true);
    dv.setFloat32(o + 36, cx, true);
    dv.setFloat32(o + 40, cy, true);
    dv.setFloat32(o + 44, cz, true);
  }

  return out;
}

export function parseBinaryStl(bytes: Uint8Array): { positions: Float32Array } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triCount = dv.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  for (let t = 0; t < triCount; t++) {
    const o = 84 + 50 * t + 12;
    const p = t * 9;
    for (let k = 0; k < 9; k++) {
      positions[p + k] = dv.getFloat32(o + 4 * k, true);
    }
  }
  return { positions };
}
