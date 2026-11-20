import type { Check } from './geometry/checks';
import type { EmblemId, FontId, ZoneId } from './config';

export type Lang = 'it' | 'en';
export const LANGS: readonly Lang[] = ['it', 'en'];

const locale = (lang: Lang) => (lang === 'it' ? 'it-IT' : 'en-GB');
export const formatNumber = (n: number, lang: Lang, digits = 1) =>
  new Intl.NumberFormat(locale(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
export const formatMm = (n: number, lang: Lang, digits = 1) =>
  `${formatNumber(n, lang, digits)} mm`;
export const formatG = (n: number, lang: Lang) =>
  n > 0 && n < 0.5 ? '<1 g' : `${formatNumber(n, lang, 0)} g`;

const it = {
  tagline: '60 carte con doppia bustina (67 × 93 mm) · Bambu Lab A1 Mini',
  copyLink: 'Copia link',
  linkCopied: 'Link copiato',
  language: 'Lingua',
  view: 'Vista',
  viewAssembled: 'Montata',
  viewPlate: 'Sul piatto A1 Mini',
  presets: 'Preset',
  zones: 'Zone colore e filamenti',
  configuration: 'Configurazione della deck box',
  zoneBody: 'Corpo',
  zoneCap: 'Coperchio',
  zoneAccent: 'Accento (bordo)',
  zoneText: 'Testo ed emblema',
  filament: 'Filamento',
  stack: 'Spessore della pila',
  stackHint: 'stima, da tarare con il tuo mazzo',
  text: 'Testo',
  textPlaceholder: 'Nessun testo',
  font: 'Font',
  face: 'Faccia',
  faceFront: 'Fronte',
  faceCap: 'Coperchio',
  textFaceNote: 'Sul fronte in rilievo, sul coperchio a intarsio a filo.',
  emblem: 'Emblema',
  emblemNone: 'Nessuno',
  checks: 'Controlli di stampa',
  checkFailed: 'Da sistemare:',
  weight: 'Peso stimato',
  weightHint: 'stima, pezzo pieno',
  download: 'Scarica zip (STL)',
  downloadBlocked: 'Sistema i controlli in rosso per scaricare.',
  zipContents:
    'Lo zip contiene uno STL per colore, uno slot AMS ciascuno, e il LEGGIMI per importarli in Bambu Studio. La geometria è generata qui nel browser: è la stessa che vedi.',
  loading: 'Preparo la geometria…',
  loadingViewport: 'Carico il modello 3D…',
  plateFits: 'Entra nella A1 Mini',
  plateDoesNotFit: 'Non entra nella A1 Mini',
  mobileNote: 'Per cambiare colori, testo ed emblema apri KuboDeck da un computer.',
  model3d: 'Modello 3D della deck box',
  openCap: 'Apri coperchio',
  closeCap: 'Chiudi coperchio',
};
type Strings = typeof it;

const en: Strings = {
  tagline: '60 double-sleeved cards (67 × 93 mm) · Bambu Lab A1 Mini',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  language: 'Language',
  view: 'View',
  viewAssembled: 'Assembled',
  viewPlate: 'On the A1 Mini plate',
  presets: 'Presets',
  zones: 'Colour zones and filaments',
  configuration: 'Deck box configuration',
  zoneBody: 'Body',
  zoneCap: 'Lid',
  zoneAccent: 'Accent (rim)',
  zoneText: 'Text and emblem',
  filament: 'Filament',
  stack: 'Deck thickness',
  stackHint: 'estimate, calibrate with your deck',
  text: 'Text',
  textPlaceholder: 'No text',
  font: 'Font',
  face: 'Face',
  faceFront: 'Front',
  faceCap: 'Lid',
  textFaceNote: 'Raised on the front, flush inlay on the lid.',
  emblem: 'Emblem',
  emblemNone: 'None',
  checks: 'Print checks',
  checkFailed: 'To fix:',
  weight: 'Estimated weight',
  weightHint: 'estimate, solid part',
  download: 'Download zip (STL)',
  downloadBlocked: 'Fix the red checks to download.',
  zipContents:
    'The zip holds one STL per colour, one AMS slot each, plus a README for importing them in Bambu Studio. The geometry is built here in your browser: it is exactly what you see.',
  loading: 'Building the geometry…',
  loadingViewport: 'Loading the 3D model…',
  plateFits: 'Fits the A1 Mini',
  plateDoesNotFit: 'Does not fit the A1 Mini',
  mobileNote: 'To change colours, text and emblem, open KuboDeck on a computer.',
  model3d: '3D model of the deck box',
  openCap: 'Open lid',
  closeCap: 'Close lid',
};

export const UI: Record<Lang, Strings> = { it, en };

export const ZONE_LABEL: Record<Lang, Record<ZoneId, string>> = {
  it: { body: it.zoneBody, cap: it.zoneCap, accent: it.zoneAccent, text: it.zoneText },
  en: { body: en.zoneBody, cap: en.zoneCap, accent: en.zoneAccent, text: en.zoneText },
};

export const FONT_LABEL: Record<FontId, string> = { display: 'Archivo Black', mono: 'Space Mono' };

export const EMBLEM_LABEL: Record<Lang, Record<EmblemId, string>> = {
  it: {
    fuoco: 'Fuoco',
    acqua: 'Acqua',
    sole: 'Sole',
    corona: 'Corona',
    scudo: 'Scudo',
    stella: 'Stella',
  },
  en: {
    fuoco: 'Fire',
    acqua: 'Water',
    sole: 'Sun',
    corona: 'Crown',
    scudo: 'Shield',
    stella: 'Star',
  },
};

// Messaggi dei controlli: ogni rosso dice cosa cambiare.
export function checkMessage(c: Check, lang: Lang): string {
  const d = c.data ?? {};
  const mm = (k: string) => formatMm(Number(d[k] ?? 0), lang);
  const faces = String(d.faces ?? '')
    .split(', ')
    .filter(Boolean)
    .map((f) =>
      f === 'front' ? (lang === 'it' ? 'fronte' : 'front') : lang === 'it' ? 'coperchio' : 'lid',
    )
    .join(', ');
  const T: Record<Check['id'], Record<Lang, [string, string]>> = {
    manifold: {
      it: [
        'Tutte le parti sono solidi chiusi.',
        `Parti non stampabili (${d.parts}): cambia testo o emblema.`,
      ],
      en: [
        'Every part is a closed solid.',
        `Unprintable parts (${d.parts}): change the text or emblem.`,
      ],
    },
    fitsPlate: {
      it: [
        `Ingombro ${mm('x')} × ${mm('y')}: entra nel piatto A1 Mini.`,
        `Ingombro ${mm('x')} × ${mm('y')}: non entra nel piatto 180 × 180 con 5 mm di margine. Riduci lo spessore della pila.`,
      ],
      en: [
        `Footprint ${mm('x')} × ${mm('y')}: fits the A1 Mini plate.`,
        `Footprint ${mm('x')} × ${mm('y')}: too big for the 180 × 180 plate with a 5 mm margin. Reduce the deck thickness.`,
      ],
    },
    capClearance: {
      it: [
        'Il coperchio scorre sul bordo sotto il coperchio con 0,30 mm di gioco.',
        'Il coperchio tocca il bordo o il corpo: ricarica la pagina; se resta rosso, segnalalo.',
      ],
      en: [
        'The lid slides over the rim with 0.30 mm clearance.',
        'The lid touches the rim or the body: reload the page; if it stays red, please report it.',
      ],
    },
    holdsStack: {
      it: [
        `Il vano contiene una pila di ${mm('stack')}.`,
        `La pila da ${mm('stack')} non entra nel vano: riduci lo spessore della pila.`,
      ],
      en: [
        `The box holds a ${mm('stack')} deck.`,
        `A ${mm('stack')} deck does not fit inside: reduce the deck thickness.`,
      ],
    },
    minStroke: {
      it: [
        'Ogni tratto di testo ed emblema è largo almeno 0,8 mm.',
        `Tratti sotto 0,8 mm (${faces}): l'ugello da 0,4 non li stampa. Accorcia il testo o scegli un emblema più semplice.`,
      ],
      en: [
        'Every stroke of text and emblem is at least 0.8 mm wide.',
        `Strokes under 0.8 mm (${faces}): a 0.4 nozzle cannot print them. Shorten the text or pick a simpler emblem.`,
      ],
    },
    artFitsFace: {
      it: [
        'Testo ed emblema stanno nella faccia con 4 mm di margine.',
        'Testo o emblema escono dalla faccia (servono 4 mm di margine dal bordo): accorcia il testo.',
      ],
      en: [
        'Text and emblem sit inside the face with a 4 mm margin.',
        'Text or emblem run off the face (it needs a 4 mm margin): shorten the text.',
      ],
    },
    glyphs: {
      it: [
        'Tutti i caratteri sono nel font.',
        `Il font non ha questi caratteri: ${d.chars}. Toglili o cambia font.`,
      ],
      en: [
        'Every character is in the font.',
        `The font lacks these characters: ${d.chars}. Remove them or change font.`,
      ],
    },
    zonesDisjoint: {
      it: [
        'Le zone colore non si sovrappongono.',
        `Zone colore sovrapposte (${d.clashes}): sposta testo o emblema su un'altra faccia.`,
      ],
      en: [
        'Colour zones do not overlap.',
        `Overlapping colour zones (${d.clashes}): move the text or emblem to the other face.`,
      ],
    },
  };
  return T[c.id][lang][c.ok ? 0 : 1];
}
