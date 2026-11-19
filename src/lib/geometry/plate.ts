import type { Wasm } from './wasm';
import type { Part } from './box';
import { DIMENSIONS } from '../config';

type Bbox = { min: number[]; max: number[] };
const bboxOf = (ps: Part[]): Bbox => {
  const bs = ps.map((p) => p.manifold.boundingBox());
  return {
    min: [0, 1, 2].map((i) => Math.min(...bs.map((b) => b.min[i]))),
    max: [0, 1, 2].map((i) => Math.max(...bs.map((b) => b.max[i]))),
  };
};

// Gli oggetti (corpo, calotta) si affiancano in Y; le parti di un oggetto si spostano insieme,
// così i file STL condividono l'origine e in Bambu Studio restano allineati.
export function layoutOnPlate(
  _wasm: Wasm,
  parts: Part[],
): { parts: Part[]; footprint: { x: number; y: number } } {
  const offsets = new Map<Part['object'], [number, number, number]>();
  let y = 0;
  let x = 0;
  for (const object of ['body', 'cap'] as const) {
    const group = parts.filter((p) => p.object === object);
    if (group.length === 0) continue;
    const b = bboxOf(group);
    if (y > 0) y += DIMENSIONS.plate.margin;
    offsets.set(object, [-b.min[0], y - b.min[1], -b.min[2]]);
    y += b.max[1] - b.min[1];
    x = Math.max(x, b.max[0] - b.min[0]);
  }
  return {
    parts: parts.map((p) => ({ ...p, manifold: p.manifold.translate(offsets.get(p.object)!) })),
    footprint: { x, y },
  };
}
