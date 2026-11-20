import type { Manifold } from 'manifold-3d';
import type { Wasm } from './wasm';
import { capToAssembled, disposeParts, type Part } from './box';
import { layoutOnPlate } from './plate';
import { DIMENSIONS, depthMm, type BoxConfig } from '../config';
import { sectionStrokeOk } from './art';

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
  /** Messaggio in italiano; la UI traduce da id, ok e data (src/lib/i18n.ts). */
  message: string;
  data?: Record<string, string | number>;
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
const check = (
  id: Check['id'],
  ok: boolean,
  okMsg: string,
  failMsg: string,
  data?: Check['data'],
): Check => ({
  id,
  ok,
  message: ok ? okMsg : failMsg,
  ...(data && { data }),
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
      { parts: broken.map((p) => p.id).join(', ') },
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
      { x: footprint.x, y: footprint.y, h: height },
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
          { stack },
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
      { clashes: clashes.join(', ') },
    ),
  );

  // Il tratto minimo si misura sulla sezione di ciò che si stampa, a metà spessore del rilievo.
  const thin: string[] = [];
  const front = find('frontArt');
  if (front) {
    const upright = front.manifold.rotate([-90, 0, 0]);
    try {
      const cs = upright.slice(DIMENSIONS.reliefFront / 2);
      try {
        if (!sectionStrokeOk(cs)) thin.push('front');
      } finally {
        cs.delete();
      }
    } finally {
      upright.delete();
    }
  }
  const capArt = find('capArt');
  if (capArt) {
    const cs = capArt.manifold.slice(DIMENSIONS.inlayCap / 2);
    try {
      if (!sectionStrokeOk(cs)) thin.push('cap');
    } finally {
      cs.delete();
    }
  }
  out.push(
    check(
      'minStroke',
      thin.length === 0,
      'Ogni tratto di testo ed emblema è largo almeno 0,8 mm.',
      `Tratti sotto 0,8 mm (${thin.map((f) => (f === 'front' ? 'fronte' : 'calotta')).join(', ')}): l'ugello da 0,4 non li stampa. Accorcia il testo o scegli un emblema più semplice.`,
      { faces: thin.join(', ') },
    ),
  );

  return [...out, ...extra];
}
