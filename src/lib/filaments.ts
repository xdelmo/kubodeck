import type { Part } from './geometry/box';
import type { FilamentId, ZoneId } from './config';

export interface Filament {
  id: FilamentId;
  name: string;
  line: 'PLA Matte' | 'PLA Basic';
  /** Codice colore Bambu Lab (numero sulla bobina). */
  code: string;
  hex: string;
  densityGcm3: number;
  sources: string[];
  pbr: { roughness: number; metalness: number; clearcoat?: number; sheen?: number };
}

// Fonti aperte il 2026-11-20. Densità (ISO 1183): schede tecniche ufficiali V2.0 e V3.0 (la V3.0 è
// quella linkata dalla pagina dello store). Hex: filaments_color_codes.json di Bambu Studio, con nome
// e codice colore riscontrati sulla pagina dello store.
const STUDIO_COLORS =
  'https://github.com/bambulab/BambuStudio/blob/master/resources/profiles/BBL/filament/filaments_color_codes.json';
const MATTE_SOURCES = [
  'https://store.bblcdn.com/s7/default/5b061f2feeac4ba88f355a33248bbda7/Bambu_PLA_Matte_Technical_Data_Sheet.pdf',
  'https://cdn.shopify.com/s/files/1/0380/5149/files/Bambu_PLA_Matte_Technical_Data_Sheet.pdf',
  'https://eu.store.bambulab.com/en/products/pla-matte',
  STUDIO_COLORS,
];
const BASIC_SOURCES = [
  'https://store.bblcdn.com/s1/default/58b85d0f3db94878854a28fdb8a0006e/Bambu_PLA_Basic_Technical_Data_Sheet.pdf',
  'https://cdn.shopify.com/s/files/1/0380/5149/files/Bambu_PLA_Basic_Technical_Data_Sheet.pdf',
  'https://eu.store.bambulab.com/en/products/pla-basic-filament',
  STUDIO_COLORS,
];

// I valori PBR sono una scelta visiva, non dati Bambu Lab.
const MATTE_PBR = { roughness: 0.9, metalness: 0, sheen: 0.25 };
const BASIC_PBR = { roughness: 0.45, metalness: 0, clearcoat: 0.15 };
const BASIC_METALLIC_PBR = { roughness: 0.35, metalness: 0.45, clearcoat: 0.2 };

const matte = (id: string, name: string, code: string, hex: string): Filament => ({
  id,
  name,
  line: 'PLA Matte',
  code,
  hex,
  densityGcm3: 1.31,
  sources: MATTE_SOURCES,
  pbr: MATTE_PBR,
});
const basic = (id: string, name: string, code: string, hex: string, pbr = BASIC_PBR): Filament => ({
  id,
  name,
  line: 'PLA Basic',
  code,
  hex,
  densityGcm3: 1.24,
  sources: BASIC_SOURCES,
  pbr,
});

const LIST: Filament[] = [
  matte('pla-matte-charcoal', 'Carbone', '11101', '#000000'),
  matte('pla-matte-ivory', 'Bianco avorio', '11100', '#ffffff'),
  matte('pla-matte-terracotta', 'Terracotta', '11203', '#b15533'),
  matte('pla-matte-sakura', 'Rosa sakura', '11201', '#e8afcf'),
  matte('pla-matte-marine-blue', 'Blu marino', '11600', '#0078bf'),
  basic('pla-basic-white', 'Bianco giada', '10100', '#ffffff'),
  basic('pla-basic-black', 'Nero', '10101', '#000000'),
  basic('pla-basic-red', 'Rosso', '10200', '#c12e1f'),
  basic('pla-basic-blue', 'Blu', '10601', '#0a2989'),
  basic('pla-basic-gold', 'Oro', '10401', '#e4bd68', BASIC_METALLIC_PBR),
  basic('pla-basic-silver', 'Argento', '10102', '#a6a9aa', BASIC_METALLIC_PBR),
];

export const FILAMENTS: Record<FilamentId, Filament> = Object.fromEntries(
  LIST.map((f) => [f.id, f]),
);

export function estimateWeightG(
  parts: Part[],
  filaments: Record<ZoneId, FilamentId>,
): { total: number; byZone: Record<ZoneId, number> } {
  const byZone: Record<ZoneId, number> = { body: 0, cap: 0, accent: 0, text: 0 };
  for (const p of parts) {
    byZone[p.zone] += (p.manifold.volume() / 1000) * FILAMENTS[filaments[p.zone]].densityGcm3;
  }
  const total = Object.values(byZone).reduce((a, b) => a + b, 0);
  return { total, byZone };
}
