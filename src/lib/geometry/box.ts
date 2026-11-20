import type { Manifold } from 'manifold-3d';
import { DIMENSIONS, depthMm, type BoxConfig, type ZoneId } from '../config';
import type { Wasm } from './wasm';

export type PartId = 'body' | 'collar' | 'cap' | 'frontArt' | 'capArt';

export interface Part {
  id: PartId;
  zone: ZoneId;
  object: 'body' | 'cap';
  manifold: Manifold;
}

export type Polygons = [number, number][][];

export interface Art {
  front: Polygons | null;
  cap: Polygons | null;
}

const COLLAR_CHAMFER = 0.6;
const NOTCH_WIDTH = 24;
const NOTCH_Z = 86;
// Margine oltre le facce di taglio per evitare superfici coplanari nelle booleane.
const CUT_EPS = 1;

function withTemp<T>(fn: (own: (m: Manifold) => Manifold) => T): T {
  const temps: Manifold[] = [];
  const own = (m: Manifold): Manifold => {
    temps.push(m);
    return m;
  };
  try {
    return fn(own);
  } finally {
    for (let i = temps.length - 1; i >= 0; i--) {
      temps[i].delete();
    }
  }
}

function box(
  wasm: Wasm,
  own: (m: Manifold) => Manifold,
  size: [number, number, number],
  pos: [number, number, number] = [0, 0, 0],
): Manifold {
  const raw = own(wasm.Manifold.cube(size));
  return pos[0] === 0 && pos[1] === 0 && pos[2] === 0 ? raw : own(raw.translate(pos));
}

function buildBody(wasm: Wasm, d: number): Manifold {
  const { width, wall, bodyHeight, floor } = DIMENSIONS;
  return withTemp((own) => {
    const outer = box(wasm, own, [width, d, bodyHeight]);
    const cavity = box(
      wasm,
      own,
      [width - 2 * wall, d - 2 * wall, bodyHeight - floor + CUT_EPS],
      [wall, wall, floor],
    );
    return outer.subtract(cavity);
  });
}

function buildCollar(wasm: Wasm, d: number): Manifold {
  const {
    width,
    height,
    wall,
    bodyHeight,
    capSideWall,
    capClearance,
    ceiling,
    collarTopClearance,
  } = DIMENSIONS;
  const inset = capSideWall + capClearance;
  const collarTop = height - ceiling - collarTopClearance;
  const collarHeight = collarTop - bodyHeight;
  const topInset = inset + COLLAR_CHAMFER;

  return withTemp((own) => {
    // Hull fra corpo e sommità rientrata per ottenere lo smusso d'invito a 45° sulla calotta.
    const base = box(
      wasm,
      own,
      [width - 2 * inset, d - 2 * inset, collarHeight - COLLAR_CHAMFER],
      [inset, inset, bodyHeight],
    );
    const top = box(
      wasm,
      own,
      [width - 2 * topInset, d - 2 * topInset, COLLAR_CHAMFER],
      [topInset, topInset, collarTop - COLLAR_CHAMFER],
    );
    const outer = own(wasm.Manifold.hull([base, top]));
    const cavity = box(
      wasm,
      own,
      [width - 2 * wall, d - 2 * wall, collarHeight + 2 * CUT_EPS],
      [wall, wall, bodyHeight - CUT_EPS],
    );
    const ring = own(outer.subtract(cavity));
    const notch = box(
      wasm,
      own,
      [NOTCH_WIDTH, 4, collarTop - NOTCH_Z + CUT_EPS],
      [(width - NOTCH_WIDTH) / 2, -CUT_EPS, NOTCH_Z],
    );
    return ring.subtract(notch);
  });
}

function buildCap(wasm: Wasm, d: number): Manifold {
  const { width, capSideWall, capHeight, ceiling } = DIMENSIONS;
  return withTemp((own) => {
    const outer = box(wasm, own, [width, d, capHeight]);
    const cavity = box(
      wasm,
      own,
      [width - 2 * capSideWall, d - 2 * capSideWall, capHeight - ceiling + CUT_EPS],
      [capSideWall, capSideWall, ceiling],
    );
    return outer.subtract(cavity);
  });
}

function extrudePolygons(wasm: Wasm, polygons: Polygons, height: number): Manifold {
  const cs = wasm.CrossSection.ofPolygons(polygons, 'NonZero');
  try {
    return cs.extrude(height);
  } finally {
    cs.delete();
  }
}

// Poligoni (x, z) del fronte, estrusi in rilievo verso -Y a partire da y = 0.
function buildFrontArt(wasm: Wasm, polygons: Polygons): Manifold {
  return withTemp((own) =>
    own(extrudePolygons(wasm, polygons, DIMENSIONS.reliefFront)).rotate([90, 0, 0]),
  );
}

// Poligoni (x, y) della calotta vista dall'alto da montata: in stampa la calotta è capovolta,
// quindi y diventa d - y e l'intarsio parte dal piatto (z = 0).
function capInlayPolygons(polygons: Polygons, d: number): Polygons {
  return polygons.map((c) => c.map(([x, y]) => [x, d - y] as [number, number]));
}

export function buildParts(wasm: Wasm, config: BoxConfig, art: Art): Part[] {
  const d = depthMm(config.stackThicknessMm);
  const parts: Part[] = [];
  try {
    parts.push({ id: 'body', zone: 'body', object: 'body', manifold: buildBody(wasm, d) });
    parts.push({ id: 'collar', zone: 'accent', object: 'body', manifold: buildCollar(wasm, d) });
    if (art.front) {
      const manifold = buildFrontArt(wasm, art.front);
      parts.push({ id: 'frontArt', zone: 'text', object: 'body', manifold });
    }
    if (art.cap) {
      const polys = capInlayPolygons(art.cap, d);
      const inlay = extrudePolygons(wasm, polys, DIMENSIONS.inlayCap);
      parts.push({ id: 'capArt', zone: 'text', object: 'cap', manifold: inlay });
      const cap = withTemp((own) => {
        // Il taglio sporge sotto il piatto per non lasciare facce coplanari a z = 0.
        const cutter = own(
          own(extrudePolygons(wasm, polys, DIMENSIONS.inlayCap + CUT_EPS)).translate([
            0,
            0,
            -CUT_EPS,
          ]),
        );
        return own(buildCap(wasm, d)).subtract(cutter);
      });
      parts.push({ id: 'cap', zone: 'cap', object: 'cap', manifold: cap });
    } else {
      parts.push({ id: 'cap', zone: 'cap', object: 'cap', manifold: buildCap(wasm, d) });
    }
    return parts;
  } catch (err) {
    // Evita leak WASM sulle parti già costruite se una successiva fallisce.
    disposeParts(parts);
    throw err;
  }
}

export function capToAssembled(_wasm: Wasm, m: Manifold, depth: number): Manifold {
  const rotated = m.rotate([180, 0, 0]);
  try {
    return rotated.translate([0, depth, DIMENSIONS.height]);
  } finally {
    rotated.delete();
  }
}

export function disposeParts(parts: Part[]): void {
  for (const part of parts) {
    part.manifold.delete();
  }
}
