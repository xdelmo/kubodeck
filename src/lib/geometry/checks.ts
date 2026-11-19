import type { Manifold } from 'manifold-3d';
import type { Wasm } from './wasm';
import { capToAssembled, disposeParts, type Part } from './box';
import { layoutOnPlate } from './plate';
import { DIMENSIONS, depthMm, type BoxConfig } from '../config';

export interface Check {
  id:
    | 'manifold'
    | 'fitsPlate'
    | 'capClearance'
    | 'holdsStack'
    | 'minStroke'
    | 'artFitsFace'
    | 'glyphs'
    | 'zonesDisjoint';
  ok: boolean;
  message: string;
}

const EPS = 1e-6;
const overlap = (a: Manifold, b: Manifold): number => {
  const i = a.intersect(b);
  try {
    return i.volume();
  } finally {
    i.delete();
  }
};
const check = (id: Check['id'], ok: boolean, okMsg: string, failMsg: string): Check => ({
  id,
  ok,
  message: ok ? okMsg : failMsg,
});

export function runChecks(
  wasm: Wasm,
  parts: Part[],
  config: BoxConfig,
  extra: Check[] = [],
): Check[] {
  const find = (id: Part['id']) => parts.find((p) => p.id === id);
  const out: Check[] = [];

  const broken = parts.filter((p) => p.manifold.status() !== 'NoError' || p.manifold.isEmpty());
  out.push(
    check(
      'manifold',
      broken.length === 0,
      'Tutte le parti sono solidi chiusi.',
      `Parti non stampabili (${broken.map((p) => p.id).join(', ')}): cambia testo o emblema e rigenera.`,
    ),
  );

  const { parts: laid, footprint } = layoutOnPlate(wasm, parts);
  let height: number;
  try {
    height = Math.max(...laid.map((p) => p.manifold.boundingBox().max[2]));
  } finally {
    disposeParts(laid);
  }
  const { plate } = DIMENSIONS;
  const fits =
    footprint.x + 2 * plate.margin <= plate.x &&
    footprint.y + 2 * plate.margin <= plate.y &&
    height <= plate.z;
  out.push(
    check(
      'fitsPlate',
      fits,
      `Ingombro ${footprint.x.toFixed(1)} × ${footprint.y.toFixed(1)} mm: entra nel piatto A1 Mini.`,
      `Ingombro ${footprint.x.toFixed(1)} × ${footprint.y.toFixed(1)} × ${height.toFixed(1)} mm: non entra nel piatto 180 × 180 con 5 mm di margine. Riduci lo spessore della pila.`,
    ),
  );

  const body = find('body');
  const collar = find('collar');
  const cap = find('cap');
  if (body && collar && cap) {
    const bb = body.manifold.boundingBox();
    const D = bb.max[1] - bb.min[1];
    const assembled = capToAssembled(wasm, cap.manifold, D);
    try {
      const gapOk =
        collar.manifold.minGap(assembled, 1) >= DIMENSIONS.capClearance - 0.001 &&
        overlap(assembled, body.manifold) < EPS;
      out.push(
        check(
          'capClearance',
          gapOk,
          'Il coperchio scorre sul colletto con 0,30 mm di gioco.',
          'Il coperchio tocca il colletto o il corpo: rigenera la scatola; se resta rosso, segnala il problema.',
        ),
      );

      // La pila di carte imbustate, centrata nel vano e appoggiata sul fondo.
      const stack = config.stackThicknessMm;
      const { card, floor } = DIMENSIONS;
      const raw = wasm.Manifold.cube([card.width, stack, card.height], false);
      let holds: boolean;
      try {
        const pile = raw.translate([
          (bb.min[0] + bb.max[0] - card.width) / 2,
          (bb.min[1] + bb.max[1] - stack) / 2,
          bb.min[2] + floor,
        ]);
        try {
          holds = [body.manifold, collar.manifold, assembled].every((m) => overlap(pile, m) < EPS);
        } finally {
          pile.delete();
        }
      } finally {
        raw.delete();
      }
      out.push(
        check(
          'holdsStack',
          holds && D >= depthMm(stack) - 0.001,
          `Il vano contiene una pila di ${stack} mm.`,
          `La pila da ${stack} mm non entra nel vano: rigenera la scatola o riduci lo spessore della pila.`,
        ),
      );
    } finally {
      assembled.delete();
    }
  }

  const clashes: string[] = [];
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++)
      if (
        parts[i].object === parts[j].object &&
        overlap(parts[i].manifold, parts[j].manifold) >= EPS
      )
        clashes.push(`${parts[i].id}/${parts[j].id}`);
  out.push(
    check(
      'zonesDisjoint',
      clashes.length === 0,
      'Le zone colore non si sovrappongono.',
      `Zone colore sovrapposte (${clashes.join(', ')}): sposta testo o emblema su un'altra faccia e rigenera.`,
    ),
  );

  return [...out, ...extra];
}
