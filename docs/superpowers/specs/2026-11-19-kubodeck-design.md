# KuboDeck — design

Stato: bozza da approvare (2026-11-19). Origine: `implementation_plan.md` dell'utente, rivisto in brainstorming.

## Intento e perché

KuboDeck è un configuratore web di deck box per carte (TCG, sleeve doppie `67 × 93 mm`): il visitatore sceglie modello, filamenti, testo ed emblema, vede la scatola in 3D e scarica STL **davvero stampabili** su Bambu Lab A1 Mini (`180 × 180 × 180 mm`).

1. **Prima di tutto un pezzo da portfolio**: stack production-grade (Next.js App Router, TypeScript strict, React Three Fiber, CAD procedurale nel browser) con una viewport 3D fluida ed estetica da studio di industrial design.
2. **Poi un servizio a pagamento**: stampa su richiesta (e in seguito altro). La v1 lo predispone senza implementarlo.

Decisione dell'utente: gli STL della v1 sono stampabili e verificati con una stampa reale sulla A1 Mini, non indicativi. Si parte da un solo modello (Standard 100); gli altri seguono.

## Obiettivi (v1)

- Modello **Standard 100**: corpo + coperchio a incastro, in mm reali (1 unità = 1 mm), dimensioni default `78 × 78 × 104 mm`, pareti `2.8 mm`, gioco coperchio `0.30 mm` (valori del piano, da confermare con la stampa di prova).
- Sedi magneti opzionali `6×2` / `8×2 mm` su corpo e coperchio.
- Filamenti Bambu Lab simulati con materiali PBR (PLA Matte, Basic, Silk, PLA-CF) e **4 zone colore** (corpo, coperchio, accento, testo/emblema).
- **Testo in rilievo** `+0.8 mm` su fronte o coperchio, 1-2 font inclusi; **emblemi** dalla libreria interna (SVG pre-validati), in rilievo.
- **Preset showcase** cliccabili (3-4), adattati al solo Standard 100 (es. *Obsidian*, *Terracotta Matte*, *Silk Gold*).
- **Vista piatto A1 Mini**: le parti si separano e si appoggiano sul piatto `180 × 180 mm` con griglia 10 mm e badge di compatibilità.
- **Export STL binario Z-up**, una parte per file (corpo, coperchio, e le parti di colore diverso come STL separati con origine comune, così in Bambu Studio si caricano come parti di un oggetto e si assegnano gli slot AMS).
- **Stima peso PLA** dal volume reale della mesh manifold (× densità del filamento).
- Configurazione serializzata nell'URL (link condivisibile) — costa poco e serve sia al portfolio sia al futuro ordine.

## Non obiettivi (v1, rimandati)

- Modelli Commander Display, Twin, Tower/cassetto dadi (dopo che lo Standard è stato stampato e validato).
- Testo inciso; upload SVG dell'utente; decal PNG/JPG.
- `/api/order`, Stripe, database, prezzo di vendita; slider di stampa (pareti, tolleranze) esposti all'utente.
- Export 3MF, snapshot PNG, export/import JSON.

## Anti-obiettivi

- Un STL che lo slicer segnala come non manifold, o che stampato non si chiude/non contiene 100 carte imbustate: la v1 è fallita anche se il sito è bello.
- Primo caricamento pesante: la pagina deve mostrare subito il contenuto, la viewport arriva dopo (lazy).
- Promettere cose che non finiscono nella stampa (es. un'immagine visibile solo nell'anteprima).

## Vincoli

- Bambu Lab A1 Mini, ugello 0.4 mm, piatto `180 × 180 × 180 mm`.
- Geometria generata nel browser; deve restare manifold dopo ogni booleana.
- Sito statico deployabile senza backend a pagamento (la demo da portfolio non costa).
- Poiché l'STL nasce nel browser, il **download STL non si può far pagare**: la monetizzazione futura passa dalla stampa su richiesta (o da un futuro export lato server).
- Privacy e struttura di progetto come da regole globali (repo con `CLAUDE.md`, `AGENTS.md` symlink, autore `xdelmo`).

## Approcci considerati

| Approccio | Pro | Contro |
| --- | --- | --- |
| **1. manifold-3d (WASM) nel browser, tutto TypeScript** — scelto | Booleane veloci e sempre manifold; WASM ~1 MB; sito statico; un solo linguaggio | Niente raccordi/smussi nativi: si costruiscono a mano (profili estrusi, hull, offset) |
| 2. replicad / opencascade.js nel browser | Vero B-rep: raccordi, smussi, export STEP | WASM ~10 MB, rigenerazioni lente, primo caricamento peggiore |
| 3. build123d lato server (come `magsafe-cardholder`) | Riusa il CAD Python già noto e i suoi check | Giro al server a ogni modifica, backend Python a pagamento, viewport meno fluida |

Scelto dall'utente: **1**. Three.js da solo (o `three-bvh-csg`) è escluso: non garantisce mesh chiuse.

## Architettura decisa

- **Next.js App Router + TypeScript strict + CSS puro** (decisione del piano). Viewport in un modulo client caricato con `next/dynamic(..., { ssr: false })` e uno skeleton.
- **Geometria**: funzioni pure `config → parti manifold` costruite con manifold-3d; la stessa mesh alimenta viewport ed export, così ciò che si vede è ciò che si stampa.
- **Testo**: `opentype.js` → contorni → estrusione manifold → unione con la parete.
- **Controlli automatici sulla geometria generata** (l'equivalente di `checks/check_fit.py` di magsafe), come test: ogni parte manifold, ingombro ≤ `180³` e sul piatto, gioco coperchio, spessore minimo residuo nelle zone con sedi magneti e testo, l'interno contiene il volume della pila di carte.
- **Stampa di prova** dello Standard 100 sulla A1 Mini prima di chiamare finita la v1.

## Scelte prese in revisione (calls di Claude, da controllare)

- **Coperchio**: a calotta (lift-off). Il corpo ha in alto un colletto rientrato; la calotta ci scorre sopra con il gioco di `0.30 mm`, a filo con le pareti esterne. Sta chiusa per attrito; i magneti, se attivi, aiutano la chiusura.
- **Orientamento di stampa**: corpo in piedi con l'apertura in alto; calotta capovolta, con la faccia superiore sul piatto. Niente supporti.
- **Dimensioni**: `78 × 78 × 104` sono esterne. La larghezza contiene il lato da 67 mm della carta, la profondità contiene la pila, l'altezza contiene i 93 mm.
- **Spessore della pila di carte**: è un parametro (`stackThicknessMm`) e non è stato misurato. Il valore di partenza è una **stima** che il builder dichiara come tale, e si tara con la stampa di prova. Il controllo che l'interno contenga la pila usa questo parametro. Se il valore tarato non entra nei `72.4 mm` interni, la profondità esterna cresce.
- **Colori e testo**:
  - Sul fronte, testo ed emblema sono solidi separati appoggiati sulla parete: rilievo di `+0.8 mm`, il corpo resta intero.
  - Sulla calotta stanno sulla faccia che tocca il piatto, quindi sono **intarsi a filo**: profondi `0.6 mm`, sottratti alla calotta ed esportati come parte separata (il "a filo" del piano). Il risultato è un primo layer multicolore.
  - Ogni zona colore è un solido disgiunto e diventa un file STL.
- **Vista piatto**: solo visiva. Mostra le parti nell'orientamento di stampa, controlla che l'ingombro di tutte le parti, con 5 mm di margine, stia nei `180 × 180 mm` e mostra il badge.
- **Font ed emblemi**:
  - 2 font OFL, solo caratteri latini.
  - Gli emblemi (6-8 dalla lista del piano) li disegna il builder come SVG semplici e chiusi, e ognuno passa i controlli manifold.
- **Limiti di stampabilità**: tratto minimo `0.8 mm` (2 linee con ugello 0.4) e testo che deve stare nella faccia. Se il limite non è rispettato, l'export si blocca con un messaggio che spiega cosa cambiare.
- **Deploy**: Next.js in static export su Netlify, come il portfolio. Lo schema dell'URL è versionato (`v=1`) e i link vecchi devono continuare ad aprirsi.
- **Densità e colori dei filamenti**: li verifica il builder da fonti Bambu Lab e li cita nel file dati.
- **Accettazione**: tutti i controlli automatici sono verdi, Bambu Studio importa le parti senza avvisi di riparazione e la stampa di prova chiude e contiene il mazzo.

## Lasciato al builder

- Struttura dei file (quella del piano è un buon punto di partenza, ridotta al perimetro v1), libreria di stato, nomi.
- Come costruire smussi e invito del coperchio con le primitive di manifold-3d.
- Generazione nel main thread o in un Web Worker (Worker consigliato se la rigenerazione supera ~50 ms).
- Struttura dei test e strumenti (Vitest o simili), purché `tsc --noEmit`, build e controlli geometrici girino con un comando.
- Design visivo nei dettagli, dentro l'indirizzo "industrial design studio" del piano (font del piano: Plus Jakarta Sans, JetBrains Mono).
