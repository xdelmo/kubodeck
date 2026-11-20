import { FILAMENTS } from './filaments';

export type ZoneId = 'body' | 'cap' | 'accent' | 'text';
export type FontId = 'display' | 'mono';
export type EmblemId = 'fuoco' | 'acqua' | 'sole' | 'corona' | 'scudo' | 'stella';
export type Face = 'front' | 'cap';

export const FILAMENT_IDS: readonly string[] = Object.keys(FILAMENTS);
export type FilamentId = string;

export const ZONE_IDS: readonly ZoneId[] = ['body', 'cap', 'accent', 'text'];
export const FONT_IDS: readonly FontId[] = ['display', 'mono'];
export const EMBLEM_IDS: readonly EmblemId[] = [
  'fuoco',
  'acqua',
  'sole',
  'corona',
  'scudo',
  'stella',
];
export const FACES: readonly Face[] = ['front', 'cap'];

export interface BoxConfig {
  v: 1;
  stackThicknessMm: number;
  filaments: Record<ZoneId, FilamentId>;
  text: { value: string; font: FontId; face: Face };
  emblem: { id: EmblemId | null; face: Face };
}

export const DIMENSIONS = {
  width: 78,
  height: 104,
  wall: 2.8,
  collar: 1.2,
  capClearance: 0.3,
  capSideWall: 1.3,
  capHeight: 30,
  bodyHeight: 74,
  collarTopClearance: 0.3,
  floor: 2.8,
  ceiling: 2.8,
  card: { width: 67, height: 93 },
  cardClearanceMm: 1.0,
  stack: { min: 20, max: 40, step: 0.5, default: 33 }, // 33 è una stima (≈0,55 mm × 60 carte imbustate)
  reliefFront: 0.8,
  inlayCap: 0.6,
  minStroke: 0.8,
  plate: { x: 180, y: 180, z: 180, margin: 5 },
  maxTextLength: 16,
} as const;

export const depthMm = (stack: number): number =>
  stack + 2 * DIMENSIONS.wall + DIMENSIONS.cardClearanceMm;

export const DEFAULT_CONFIG: BoxConfig = {
  v: 1,
  stackThicknessMm: DIMENSIONS.stack.default,
  filaments: {
    body: 'pla-matte-charcoal',
    cap: 'pla-matte-charcoal',
    accent: 'pla-basic-gold',
    text: 'pla-basic-gold',
  },
  text: { value: 'KUBODECK', font: 'display', face: 'front' },
  emblem: { id: 'stella', face: 'cap' },
};

const obj = (x: unknown): Record<string, unknown> =>
  x !== null && typeof x === 'object' ? (x as Record<string, unknown>) : {};
const pick = <T extends string>(x: unknown, allowed: readonly T[], fallback: T): T =>
  typeof x === 'string' && (allowed as readonly string[]).includes(x) ? (x as T) : fallback;

export function normalizeConfig(input: unknown): BoxConfig {
  const d = DEFAULT_CONFIG;
  const s = DIMENSIONS.stack;
  const i = obj(input);

  const rawStack = typeof i.stackThicknessMm === 'number' ? i.stackThicknessMm : NaN;
  const stackThicknessMm = Number.isFinite(rawStack)
    ? Math.min(s.max, Math.max(s.min, Math.round(rawStack / s.step) * s.step))
    : d.stackThicknessMm;

  const f = obj(i.filaments);
  const filaments = Object.fromEntries(
    ZONE_IDS.map((z) => [z, pick(f[z], FILAMENT_IDS, d.filaments[z])]),
  ) as Record<ZoneId, FilamentId>;

  const t = obj(i.text);
  const text = {
    value:
      typeof t.value === 'string'
        ? Array.from(t.value.replace(/\p{Cc}/gu, ' '))
            .slice(0, DIMENSIONS.maxTextLength)
            .join('')
        : d.text.value,
    font: pick(t.font, FONT_IDS, d.text.font),
    face: pick(t.face, FACES, d.text.face),
  };

  const e = obj(i.emblem);
  const emblem = {
    id: e.id === null ? null : pick(e.id, EMBLEM_IDS, d.emblem.id as EmblemId),
    face: pick(e.face, FACES, d.emblem.face),
  };
  // Sulla calotta c'è posto per un solo intarsio: il testo ha la precedenza.
  if (text.face === 'cap' && emblem.face === 'cap') emblem.face = 'front';

  return { v: 1, stackThicknessMm, filaments, text, emblem };
}
