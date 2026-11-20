import { parse, type Font } from 'opentype.js';
import { FONT_IDS, type FontId } from './config';
import { FONT_FILES } from './geometry/art';

let fontsPromise: Promise<Record<FontId, Font>> | null = null;

// Funziona nel thread principale e nel Worker (stessa origine).
export function loadFonts(): Promise<Record<FontId, Font>> {
  fontsPromise ??= Promise.all(
    FONT_IDS.map(async (id) => {
      const res = await fetch(FONT_FILES[id]);
      if (!res.ok) throw new Error(`${FONT_FILES[id]}: HTTP ${res.status}`);
      return [id, parse(await res.arrayBuffer())] as const;
    }),
  )
    .then((entries) => Object.fromEntries(entries) as Record<FontId, Font>)
    .catch((err) => {
      fontsPromise = null;
      throw err;
    });
  return fontsPromise;
}
