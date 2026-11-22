# KuboDeck

Configuratore web di deck box stampabili in 3D per Bambu Lab A1 Mini, per 60 carte con doppia bustina (67 × 93 mm). Sito: https://kubodeck.netlify.app · Documentazione tecnica: https://xdelmo.github.io/kubodeck/

## Cosa fa

- Colori per 4 zone (corpo, coperchio, accento, testo ed emblema) tra 11 filamenti Bambu Lab delle linee PLA Basic e PLA Matte con codici reali.
- Regolazione dello spessore della pila di carte (20–40 mm).
- Testo (Archivo Black o Space Mono Bold) ed emblema sul fronte in rilievo o sul coperchio a filo.
- 8 controlli di stampa sempre visibili (solidi chiusi, ingombro sul piatto 180 × 180 con 5 mm di margine, gioco del coperchio 0,30 mm, pila nel vano, tratti di almeno 0,8 mm, testo ed emblema dentro la faccia, caratteri presenti nel font, zone colore separate); l'export si blocca in caso di errore.
- Vista montata e vista sul piatto A1 Mini (180 × 180 mm).
- Stima del peso dal volume reale della mesh e dalla densità del filamento.
- Link condivisibile codificato nell'URL (`v=1`).
- Export zip con un file STL binario per colore e `LEGGIMI` per Bambu Studio.

## Come funziona

La geometria CSG viene generata nel browser con `manifold-3d` (WASM) dentro un Web Worker.
`opentype.js` converte il testo in poligoni estrusi nella mesh; la stessa mesh alimenta la vista 3D con React Three Fiber e l'export.
Gli STL binari vengono zippati nel browser con `fflate`.
L'applicazione usa Next.js in export statico (nessun server) con deploy su Netlify.

## Stampa

Stampa senza supporti su Bambu Lab A1 Mini (ugello 0,4 mm, piatto 180 × 180 × 180 mm) con AMS lite.
Corpo in piedi con apertura in alto; calotta capovolta con la faccia superiore e l'intarsio sul primo layer.
Gli oggetti sono due, corpo (`kubodeck-body*`) e coperchio (`kubodeck-cap*`): in Bambu Studio si importano i file di un oggetto alla volta, come oggetto singolo con più parti (condividono la stessa origine).
Assegnare uno slot AMS per ciascuna zona colore.

## Sviluppo

Richiede Node 24.

- `npm install`: installa le dipendenze ed esegue lo script `prepare` (`husky`).
- `npm run dev`: avvia il server di sviluppo (`next dev`).
- `npm test`: copia il WASM (`prepare-assets`) ed esegue i test con `vitest run`.
- `npm run verify`: copia il WASM, esegue `next typegen`, `tsc --noEmit`, `vitest run` e `next build`.

Struttura:

- `src/lib/geometry`: generazione geometria manifold e controlli di stampa.
- `src/lib/export`: export STL binari, `LEGGIMI` e archivio zip.
- `src/components`: interfaccia del configuratore e viewport 3D.
- `tests`: suite di test Vitest.
- `public/fonts`: font TTF e file di licenza.

## Licenze

Font sotto SIL Open Font License 1.1 (vedi `public/fonts`).
Codice: MIT (vedi `LICENSE`).

## English

Web configurator for 3D-printable deck boxes on Bambu Lab A1 Mini, sized for 60 double-sleeved cards (67 × 93 mm). Live at https://kubodeck.netlify.app · Technical docs: https://xdelmo.github.io/kubodeck/

### What it does

- 4 color zones (body, lid, accent, text and emblem) using 11 Bambu Lab PLA Basic and PLA Matte filaments with official codes.
- Adjustable card stack thickness (20–40 mm), text (Archivo Black or Space Mono Bold) and emblem on front (raised) or lid (flush inlay).
- 8 live print checks (closed solids, 180 × 180 plate fit with a 5 mm margin, 0.30 mm lid clearance, deck fits inside, strokes of at least 0.8 mm, text and emblem inside the face, every character in the font, separate colour zones); export is blocked until all pass.
- Assembled and A1 Mini build-plate views, real-volume weight estimate, shareable URL (`v=1`), and zip export (one binary STL per color plus `LEGGIMI`).

### How it works

Browser-side CSG geometry runs via `manifold-3d` (WASM) in a Web Worker, with `opentype.js` text polygons, React Three Fiber 3D rendering, and `fflate` zip packaging. Static Next.js export on Netlify with no backend server.

### Printing

Prints without supports on Bambu Lab A1 Mini (0.4 mm nozzle) with AMS lite: body upright, lid inverted with inlay on the first layer. There are two objects, body (`kubodeck-body*`) and lid (`kubodeck-cap*`): import the files of one object at a time in Bambu Studio as a single object with multiple parts, and assign one AMS slot per color zone.

### Development

Requires Node 24.

- `npm install`: installs dependencies and runs `prepare` (`husky`).
- `npm run dev`: starts `next dev`.
- `npm test`: copies WASM (`prepare-assets`) and runs `vitest run`.
- `npm run verify`: copies WASM, runs `next typegen`, `tsc --noEmit`, `vitest run`, and `next build`.

Structure:

- `src/lib/geometry`: manifold geometry and print checks.
- `src/lib/export`: binary STL export, `LEGGIMI`, and zip archive.
- `src/components`: configurator UI and 3D viewport.
- `tests`: Vitest test suite.
- `public/fonts`: TTF fonts and OFL license files.

### Licenses

Fonts under SIL Open Font License 1.1 (see `public/fonts`).
Code: MIT (see `LICENSE`).
