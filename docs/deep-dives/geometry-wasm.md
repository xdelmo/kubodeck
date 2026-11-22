# Geometria CSG e Memoria WASM

## Perché `manifold-3d` in WebAssembly

KuboDeck doveva produrre file STL **garantiti chiusi (watertight)** con operazioni booleane affidabili (sottrazione delle cavità, smussi, taglio dell'intarsio nella calotta) interamente lato client (`output: 'export'`).

- **Alternativa scartata — librerie CSG pure JS**: più soggette a errori numerici su facce coplanari e prive di primitive native per `status()` o `minGap()` tra solidi.
- **Alternativa scartata — CAD lato server**: introdurrebbe latenza di rete, costi di infrastruttura e violerebbe il vincolo di applicazione statica.

`manifold-3d` espone il kernel C++ di *Manifold* compilato in WASM: garantisce solidi topologicamente validi e calcola direttamente volume, bounding box, intersezioni e distanza minima tra parti.

## Gestione esplicita della memoria WASM

Ogni `Manifold` e `CrossSection` allocato vive nell'heap lineare WASM e **non viene raccolto dal Garbage Collector JavaScript**. Dimenticare un `.delete()` causerebbe un leak progressivo a ogni movimento dello slider.

Per prevenire leak anche in caso di eccezione, `src/lib/geometry/box.ts` usa un piccolo scope RAII (`withTemp`) per tutti i solidi intermedi e `disposeParts` nel blocco `catch` di `buildParts`:

```ts
// src/lib/geometry/box.ts — scope di rilascio per solidi temporanei WASM
function withTemp<T>(fn: (own: (m: Manifold) => Manifold) => T): T {
  const temps: Manifold[] = [];
  const own = (m: Manifold): Manifold => {
    temps.push(m);
    return m;
  };
  try {
    return fn(own);
  } finally {
    for (let i = temps.length - 1; i >= 0; i--) {
      temps[i].delete();
    }
  }
}
```

Quando il risultato lascia il Web Worker tramite `toMeshes` (`src/lib/geometry/generate.ts`), i buffer vengono **copiati fuori dall'heap WASM** (`Float32Array.from`, `Uint32Array.from`): in questo modo il trasferimento `Transferable` verso il main thread non stacca la memoria WASM e il Worker può liberare subito i `Manifold` originali.

```ts
// src/lib/geometry/generate.ts — copia dei buffer fuori dall'heap WASM
export function toMeshes(parts: Part[]): PartMesh[] {
  return parts.map((p) => {
    const m = p.manifold.getMesh();
    // Copie fuori dalla memoria WASM: trasferirle non stacca l'heap.
    return {
      id: p.id,
      zone: p.zone,
      object: p.object,
      numProp: m.numProp,
      vertProperties: Float32Array.from(m.vertProperties),
      triVerts: Uint32Array.from(m.triVerts),
    };
  });
}
```

## Scelte costruttive del modello

1. **Tagli senza facce coplanari (`CUT_EPS = 1`)**: nelle booleane di sottrazione (cavità del corpo, colletto, tacca frontale e sede dell'intarsio) i volumi di taglio sporgono di `1 mm` oltre le facce esterne per evitare degenerazioni numeriche a `z = 0` o `y = 0`.
2. **Smusso d'invito a 45° sul colletto**: invece di un taglio angolato post-costruzione, `buildCollar` calcola `wasm.Manifold.hull([base, top])` fra la base e una sezione superiore rientrata di `COLLAR_CHAMFER = 0.6` mm.
3. **Calotta già capovolta per la stampa**: `buildCap` genera la calotta a testa in giù (`z = 0` corrisponde al tetto esterno) e `capInlayPolygons` ribalta l'asse `y` (`d - y`). L'intarsio `capArt` giace quindi sul primo layer senza richiedere rotazioni nello slicer; per la vista montata, `capToAssembled` la ruota di 180° su X e la trasla a `z = DIMENSIONS.height`.
