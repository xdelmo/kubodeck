import type { CrossSection } from 'manifold-3d';
import type { Font, PathCommand } from 'opentype.js';
import type { Art, Polygons } from './box';
import type { Check } from './checks';
import type { Wasm } from './wasm';
import { DIMENSIONS, depthMm, type BoxConfig, type FontId } from '../config';
import { EMBLEMS } from '../emblems';

export const FONT_FILES: Record<FontId, string> = {
  display: '/fonts/ArchivoBlack-Regular.ttf',
  mono: '/fonts/SpaceMono-Bold.ttf',
};

const FLATTEN_TOL = 0.05;
const TEXT_CAP_HEIGHT = 10;
// Il testo troppo largo si rimpicciolisce fino a questa altezza; sotto, artFitsFace diventa rosso.
const TEXT_MIN_CAP_HEIGHT = 3.5;
const EMBLEM_FRONT = 24;
const EMBLEM_CAP = 18;
const FRONT_EMBLEM_Z = 50;
const FRONT_TEXT_Z = 22;
const FACE_MARGIN = 4;
// Un'apertura (erosione + dilatazione) di mezzo tratto minimo cancella ciò che è più sottile;
// gli spigoli vivi perdono poco, quindi basta un margine sull'area.
const STROKE_KEEP_RATIO = 0.95;

type Pt = [number, number];

// Segmenti tali che lo scarto dalla curva resti sotto FLATTEN_TOL (stima dalla derivata seconda).
const segments = (dev: number) => Math.max(1, Math.ceil(Math.sqrt(dev / (4 * FLATTEN_TOL))));

function flatten(commands: PathCommand[]): Polygons {
  const out: Polygons = [];
  let cur: Pt[] = [];
  let p: Pt = [0, 0];
  const close = () => {
    if (cur.length > 1 && cur[0][0] === cur.at(-1)![0] && cur[0][1] === cur.at(-1)![1]) cur.pop();
    if (cur.length >= 3) out.push(cur);
    cur = [];
  };
  for (const c of commands) {
    if (c.type === 'M') {
      close();
      p = [c.x, c.y];
      cur.push(p);
    } else if (c.type === 'L') {
      p = [c.x, c.y];
      cur.push(p);
    } else if (c.type === 'Q') {
      const [x0, y0] = p;
      const n = segments(Math.hypot(x0 - 2 * c.x1 + c.x, y0 - 2 * c.y1 + c.y));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        cur.push([
          u * u * x0 + 2 * u * t * c.x1 + t * t * c.x,
          u * u * y0 + 2 * u * t * c.y1 + t * t * c.y,
        ]);
      }
      p = [c.x, c.y];
    } else if (c.type === 'C') {
      const [x0, y0] = p;
      const dev =
        3 *
        Math.max(
          Math.hypot(x0 - 2 * c.x1 + c.x2, y0 - 2 * c.y1 + c.y2),
          Math.hypot(c.x1 - 2 * c.x2 + c.x, c.y1 - 2 * c.y2 + c.y),
        );
      const n = segments(dev);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        cur.push([
          u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        ]);
      }
      p = [c.x, c.y];
    } else {
      close();
    }
  }
  close();
  return out;
}

const map = (polys: Polygons, f: (p: Pt) => Pt): Polygons => polys.map((c) => c.map(f));

function bbox(polys: Polygons) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of polys.flat()) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

const centerAt = (polys: Polygons, cx: number, cy: number): Polygons => {
  const b = bbox(polys);
  const dx = cx - (b.x0 + b.x1) / 2;
  const dy = cy - (b.y0 + b.y1) / 2;
  return map(polys, ([x, y]) => [x + dx, y + dy]);
};

export function textToPolygons(
  font: Font,
  text: string,
  capHeightMm: number,
): { polygons: Polygons | null; missing: string[] } {
  const chars = Array.from(text.replace(/^ +| +$/g, ''));
  const missing = chars.filter((ch) => ch !== ' ' && font.charToGlyphIndex(ch) === 0);
  const kept = chars
    .filter((ch) => !missing.includes(ch))
    .join('')
    .replace(/^ +| +$/g, '');
  if (kept === '') return { polygons: null, missing };

  let capUnits = font.tables.os2?.sCapHeight ?? 0;
  if (!(capUnits > 0)) {
    const h = flatten(font.getPath('H', 0, 0, font.unitsPerEm).commands);
    const b = bbox(h);
    capUnits = b.y1 - b.y0;
  }
  const size = (capHeightMm * font.unitsPerEm) / capUnits;
  // Glifo per glifo: lo shaping GSUB di opentype.js 2.0 fallisce su Space Mono (lookup 6 non supportato).
  const scale = size / font.unitsPerEm;
  const flat: Polygons = [];
  let x = 0;
  let prev: ReturnType<Font['charToGlyph']> | null = null;
  for (const ch of Array.from(kept)) {
    const g = font.charToGlyph(ch);
    if (prev) x += font.getKerningValue(prev, g) * scale;
    flat.push(...flatten(g.getPath(x, 0, size).commands));
    x += (g.advanceWidth ?? 0) * scale;
    prev = g;
  }
  // opentype.js disegna con y verso il basso: la ribalto in y verso l'alto.
  const polys = map(flat, ([px, py]) => [px, -py]);
  return { polygons: polys.length ? polys : null, missing };
}

const fits = (polys: Polygons | null, w: number, h: number) => {
  if (!polys) return true;
  const b = bbox(polys);
  const m = FACE_MARGIN - 1e-6;
  return b.x0 >= m && b.y0 >= m && b.x1 <= w - m && b.y1 <= h - m;
};

function fitWidth(polys: Polygons | null, maxWidth: number): Polygons | null {
  if (!polys) return null;
  const b = bbox(polys);
  const k = Math.max(TEXT_MIN_CAP_HEIGHT / TEXT_CAP_HEIGHT, Math.min(1, maxWidth / (b.x1 - b.x0)));
  return k === 1 ? polys : map(polys, ([x, y]) => [x * k, y * k]);
}

export function composeArt(
  config: BoxConfig,
  fonts: Record<FontId, Font>,
): { art: Art; checks: Check[] } {
  const { width, bodyHeight } = DIMENSIONS;
  const D = depthMm(config.stackThicknessMm);
  const { polygons: raw, missing } = textToPolygons(
    fonts[config.text.font],
    config.text.value,
    TEXT_CAP_HEIGHT,
  );
  const text = fitWidth(raw, width - 2 * FACE_MARGIN);
  const emblem = config.emblem.id ? EMBLEMS[config.emblem.id].polygons : null;

  const front: Polygons = [];
  let cap: Polygons | null = null;
  if (text) {
    if (config.text.face === 'front') front.push(...centerAt(text, width / 2, FRONT_TEXT_Z));
    else cap = centerAt(text, width / 2, D / 2);
  }
  if (emblem) {
    if (config.emblem.face === 'front') {
      const k = EMBLEM_FRONT / 24;
      front.push(
        ...centerAt(
          map(emblem, ([x, y]) => [x * k, y * k]),
          width / 2,
          FRONT_EMBLEM_Z,
        ),
      );
    } else if (!cap) {
      // Sulla calotta c'è posto per un solo elemento: il testo ha la precedenza.
      const k = EMBLEM_CAP / 24;
      cap = centerAt(
        map(emblem, ([x, y]) => [x * k, y * k]),
        width / 2,
        D / 2,
      );
    }
  }
  const art: Art = { front: front.length ? front : null, cap };

  const faceOk = fits(art.front, width, bodyHeight) && fits(art.cap, width, D);
  const checks: Check[] = [
    {
      id: 'glyphs',
      ok: missing.length === 0,
      message:
        missing.length === 0
          ? 'Tutti i caratteri sono nel font.'
          : `Il font non ha questi caratteri: ${[...new Set(missing)].join(' ')}. Toglili o cambia font.`,
      ...(missing.length > 0 && { data: { chars: [...new Set(missing)].join(' ') } }),
    },
    {
      id: 'artFitsFace',
      ok: faceOk,
      message: faceOk
        ? 'Testo ed emblema stanno nella faccia con 4 mm di margine.'
        : 'Testo o emblema escono dalla faccia (servono 4 mm di margine dal bordo): accorcia il testo.',
    },
  ];
  return { art, checks };
}

export function sectionStrokeOk(cs: CrossSection): boolean {
  const r = DIMENSIONS.minStroke / 2 - 0.001;
  const area = cs.area();
  if (area <= 0) return true;
  const eroded = cs.offset(-r, 'Round');
  try {
    const opened = eroded.offset(r, 'Round');
    try {
      return opened.area() >= STROKE_KEEP_RATIO * area;
    } finally {
      opened.delete();
    }
  } finally {
    eroded.delete();
  }
}

export function minStrokeOk(wasm: Wasm, polygons: Polygons): boolean {
  const cs = wasm.CrossSection.ofPolygons(polygons, 'NonZero');
  try {
    return sectionStrokeOk(cs);
  } finally {
    cs.delete();
  }
}
