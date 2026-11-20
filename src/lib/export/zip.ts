import { strToU8, zipSync } from 'fflate';
import type { Part } from '../geometry/box';
import { toBinaryStl } from './stl';

const NAMES: Record<Part['id'], string> = {
  body: 'kubodeck-body.stl',
  collar: 'kubodeck-body-collar.stl',
  frontArt: 'kubodeck-body-front-art.stl',
  cap: 'kubodeck-cap.stl',
  capArt: 'kubodeck-cap-art.stl',
};

const LEGGIMI = `KuboDeck - Istruzioni di stampa per Bambu Studio

L'archivio contiene due oggetti separati:
- Corpo: tutti i file kubodeck-body*
- Coperchio: tutti i file kubodeck-cap*

Come importarli in Bambu Studio:
1. Trascina o importa insieme i file di UN solo oggetto alla volta.
2. Quando Bambu Studio chiede se caricarli come oggetto singolo con più parti, rispondi "Sì".
3. I file dello stesso oggetto condividono la stessa origine e restano allineati automaticamente.
4. Assegna a ogni parte lo slot AMS corrispondente alla sua zona colore.

Orientamento e stampa:
- Il coperchio è già orientato per la stampa (faccia superiore sul piatto) e l'intarsio è sul primo layer.
- Non servono supporti.

---

KuboDeck - Printing instructions for Bambu Studio

The archive contains two separate objects:
- Body: all kubodeck-body* files
- Lid: all kubodeck-cap* files

How to import them in Bambu Studio:
1. Drag or import the files of ONE object at a time together.
2. When Bambu Studio asks whether to load them as a single object with multiple parts, answer "Yes".
3. Files of the same object share the same origin and stay aligned automatically.
4. Assign each part the AMS slot matching its colour zone.

Orientation and printing:
- The lid is already in print orientation (top face on the plate) and the inlay is on the first layer.
- No supports needed.
`;

export function buildExportZip(parts: Part[]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    'LEGGIMI.txt': strToU8(LEGGIMI),
  };
  for (const part of parts) {
    files[NAMES[part.id]] = toBinaryStl(part.manifold);
  }
  return zipSync(files, { level: 6 });
}
