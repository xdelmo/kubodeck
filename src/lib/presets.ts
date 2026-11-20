import { DEFAULT_CONFIG, type BoxConfig } from './config';

export interface Preset {
  id: string;
  name: { it: string; en: string };
  config: BoxConfig;
}

const make = (
  filaments: BoxConfig['filaments'],
  text: Partial<BoxConfig['text']>,
  emblem: BoxConfig['emblem'],
): BoxConfig => ({
  ...DEFAULT_CONFIG,
  filaments,
  text: { ...DEFAULT_CONFIG.text, ...text },
  emblem,
});

export const PRESETS: Preset[] = [
  {
    id: 'carbone-oro',
    name: { it: 'Carbone e oro', en: 'Charcoal and gold' },
    config: DEFAULT_CONFIG,
  },
  {
    id: 'terracotta',
    name: { it: 'Terracotta', en: 'Terracotta' },
    config: make(
      {
        body: 'pla-matte-terracotta',
        cap: 'pla-matte-terracotta',
        accent: 'pla-matte-ivory',
        text: 'pla-matte-ivory',
      },
      { face: 'front' },
      { id: 'sole', face: 'cap' },
    ),
  },
  {
    id: 'blu-marino',
    name: { it: 'Blu marino', en: 'Marine blue' },
    config: make(
      {
        body: 'pla-matte-marine-blue',
        cap: 'pla-matte-marine-blue',
        accent: 'pla-basic-silver',
        text: 'pla-basic-silver',
      },
      { font: 'mono', face: 'cap' },
      { id: 'scudo', face: 'front' },
    ),
  },
  {
    id: 'sakura',
    name: { it: 'Sakura', en: 'Sakura' },
    config: make(
      {
        body: 'pla-matte-sakura',
        cap: 'pla-matte-sakura',
        accent: 'pla-basic-white',
        text: 'pla-basic-white',
      },
      { face: 'front' },
      { id: 'fuoco', face: 'cap' },
    ),
  },
];
