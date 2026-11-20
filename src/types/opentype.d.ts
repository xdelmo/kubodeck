// opentype.js 2.0 non pubblica tipi: dichiaro solo ciò che usa art.ts.
declare module 'opentype.js' {
  export type PathCommand =
    | { type: 'M' | 'L'; x: number; y: number }
    | { type: 'Q'; x1: number; y1: number; x: number; y: number }
    | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
    | { type: 'Z' };
  export interface Path {
    commands: PathCommand[];
  }
  export interface Glyph {
    index: number;
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }
  export interface Font {
    charToGlyph(ch: string): Glyph;
    getKerningValue(left: Glyph, right: Glyph): number;
    unitsPerEm: number;
    tables: { os2?: { sCapHeight?: number } };
    charToGlyphIndex(ch: string): number;
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }
  export function parse(buffer: ArrayBuffer): Font;
}
