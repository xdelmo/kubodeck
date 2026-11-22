# Web Worker e Export STL/Zip

## Coalescing a singolo slot nel Worker

Durante il trascinamento dello slider `stackThicknessMm` o la digitazione del testo, React può inviare decine di configurazioni al secondo. Accodarle tutte congestionerebbe il Worker WASM con lavori già obsoleti.

`src/lib/geometry/workerClient.ts` mantiene un solo lavoro `inFlight` e **un solo slot `queued`**: se arriva una nuova configurazione mentre un calcolo è in corso, l'eventuale richiesta precedente in attesa viene immediatamente scartata con `Superseded`.

```ts
// src/lib/geometry/workerClient.ts — coda a 1 slot con scarto delle richieste intermedie
export function generateInWorker(config: BoxConfig): Promise<Ok> {
  return new Promise((resolve, reject) => {
    if (!inFlight) return send(config, resolve, reject);
    queued?.reject(new Superseded());
    queued = { config, resolve, reject };
  });
}
```

- **Alternativa scartata — debounce fisso lato UI**: introdurrebbe ritardo percepito sul primo cambio; il coalescing sul Worker parte invece subito alla prima richiesta e salta solo gli stati intermedi durante il calcolo attivo.
- **Gestione errori**: `worker.ts` distingue gli errori in `kind: 'wasm' | 'fonts' | 'geometry'`; in caso di crash del Worker (`w.onerror`), `workerClient.ts` termina l'istanza e rigetta le promise attive così la chiamata successiva riparte da un Worker pulito.

## Export STL binario e archivio `.zip`

Il formato **STL binario** (`84 + 50 * triCount` byte) è molto più compatto dello STL ASCII e viene generato direttamente in un `Uint8Array` tramite `DataView` little-endian in `src/lib/export/stl.ts`. Per ogni triangolo vengono ricalcolati i vettori di bordo e la normale unitaria:

```ts
// src/lib/export/stl.ts — scrittura header e triangoli little-endian
const out = new Uint8Array(84 + 50 * triCount);
for (let i = 0; i < HEADER.length; i++) {
  out[i] = HEADER.charCodeAt(i);
}
const dv = new DataView(out.buffer);
dv.setUint32(80, triCount, true);
```

`src/lib/export/zip.ts` assembla in memoria l'archivio compresso con `fflate.zipSync` (`level: 6`), includendo:

- `LEGGIMI.txt` bilingue (italiano/inglese) con la procedura d'importazione per Bambu Studio;
- un file STL per ogni parte attiva, raggruppato per prefisso oggetto (`kubodeck-body*.stl` e `kubodeck-cap*.stl`).

```ts
// src/lib/export/zip.ts — composizione sincrona dell'archivio .zip
export function buildExportZip(parts: Part[]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    'LEGGIMI.txt': strToU8(LEGGIMI),
  };
  for (const part of parts) {
    files[NAMES[part.id]] = toBinaryStl(part.manifold);
  }
  return zipSync(files, { level: 6 });
}
```
