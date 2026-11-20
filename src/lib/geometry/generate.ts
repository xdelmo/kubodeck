import type { Font } from 'opentype.js';
import type { BoxConfig, FontId, ZoneId } from '../config';
import type { Wasm } from './wasm';
import { buildParts, type Part } from './box';
import { runChecks, type Check } from './checks';
import { composeArt } from './art';
import { estimateWeightG } from '../filaments';

export interface Generated {
  parts: Part[];
  checks: Check[];
  weight: { total: number; byZone: Record<ZoneId, number> };
}

// config → parti, controlli e peso: lo stesso calcolo nel Worker e nei test.
export function generate(wasm: Wasm, fonts: Record<FontId, Font>, config: BoxConfig): Generated {
  const t0 = performance.now();
  const { art, checks: artChecks } = composeArt(config, fonts);
  const parts = buildParts(wasm, config, art);
  const checks = runChecks(wasm, parts, config, artChecks);
  const weight = estimateWeightG(parts, config.filaments);
  // Tempo di generazione leggibile da DevTools (soglia del Worker: 50 ms).
  performance.measure('kubodeck:generate', { start: t0, end: performance.now() });
  return { parts, checks, weight };
}

export interface PartMesh {
  id: Part['id'];
  zone: Part['zone'];
  object: Part['object'];
  numProp: number;
  vertProperties: Float32Array;
  triVerts: Uint32Array;
}

export type WorkerRequest = { id: number; config: BoxConfig };
export type WorkerResponse =
  | { id: number; ok: true; meshes: PartMesh[]; checks: Check[]; weight: Generated['weight'] }
  | { id: number; ok: false; kind: 'wasm' | 'fonts' | 'geometry' };

export function toMeshes(parts: Part[]): PartMesh[] {
  return parts.map((p) => {
    const m = p.manifold.getMesh();
    // Copie fuori dalla memoria WASM: trasferirle non stacca l'heap.
    return {
      id: p.id,
      zone: p.zone,
      object: p.object,
      numProp: m.numProp,
      vertProperties: Float32Array.from(m.vertProperties),
      triVerts: Uint32Array.from(m.triVerts),
    };
  });
}

export function fromMeshes(wasm: Wasm, meshes: PartMesh[]): Part[] {
  const parts: Part[] = [];
  try {
    for (const m of meshes) {
      const mesh = new wasm.Mesh({
        numProp: m.numProp,
        vertProperties: m.vertProperties,
        triVerts: m.triVerts,
      });
      mesh.merge();
      parts.push({ id: m.id, zone: m.zone, object: m.object, manifold: new wasm.Manifold(mesh) });
    }
    return parts;
  } catch (err) {
    for (const p of parts) p.manifold.delete();
    throw err;
  }
}
