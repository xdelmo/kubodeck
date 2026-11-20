import fs from 'node:fs';
import path from 'node:path';
import { parse, type Font } from 'opentype.js';
import type { FontId } from '../../src/lib/config';
import { FONT_FILES } from '../../src/lib/geometry/art';

const load = (url: string): Font => {
  const b = fs.readFileSync(path.join('public', url));
  return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
export const loadFonts = (): Record<FontId, Font> => ({
  display: load(FONT_FILES.display),
  mono: load(FONT_FILES.mono),
});
