# KuboDeck: sistema visivo

La configurazione è la tavola CMF dello studio: il modello 3D sta sul cartone di presentazione accanto ai quattro campioni fisici fissati e numerati, rifiutando il configuratore a tab su fondo bianco.
L'interfaccia resta silenziosa e tecnica: la vista sul piatto trasforma la tavola nel piano della A1 Mini (180 × 180 mm) e ogni controllo comunica lo stato reale della geometria stampabile.

## Colore

| Token             | Chiaro    | Scuro     | Uso                                           |
| ----------------- | --------- | --------- | --------------------------------------------- |
| `--board`         | `#d9d8d3` | `#26272a` | Cartone di presentazione (fondo tavola)       |
| `--board-deep`    | `#cfcec8` | `#1f2022` | Fondo tavola profondo e primario disabilitato |
| `--stock`         | `#fbfbf9` | `#303134` | Etichette, pannello, fondo controlli          |
| `--stock-pressed` | `#f1f0ec` | `#3a3b3f` | Stato hover o selezionato su etichetta        |
| `--ink`           | `#1b1c1e` | `#e8e7e2` | Testo principale e bordo attivo               |
| `--ink-muted`     | `#5c5d60` | `#aaaaa5` | Testo secondario e titoli di sezione          |
| `--hairline`      | `#c2c1bc` | `#45464a` | Soli filetti decorativi da 1 px               |
| `--control-edge`  | `#8f8e89` | `#7c7d80` | Bordo dei controlli interattivi               |
| `--signal`        | `#c8461b` | `#f0743f` | Numeri di richiamo e azione primaria          |
| `--on-signal`     | `#fbfbf9` | `#1b1c1e` | Testo sopra `--signal`                        |
| `--ok`            | `#1d7a47` | `#4fbf7f` | Controllo superato e badge piatto valido      |
| `--fail`          | `#b42318` | `#f97066` | Controllo fallito e messaggio correttivo      |
| `--focus`         | `#1b1c1e` | `#e8e7e2` | Indicatore di focus da tastiera               |

Regola: l'arancio `--signal` si usa solo per i numeri di richiamo e per l'azione primaria («Scarica zip»).

## Tipografia

- Famiglie: `Plus Jakarta Sans` (`--font-sans`) per l'interfaccia; `JetBrains Mono` (`--font-mono`) per codici, mm e grammi.
- Scala: `--text-2xs` `11px` (`0.6875rem`), `--text-xs` `12px` (`0.75rem`), `--text-sm` `13px` (`0.8125rem`), `--text-md` `16px` (`1rem`), `--text-lg` `18px` (`1.125rem`).
- Pesi e tracking: `--weight-regular` `400`, `--weight-semibold` `600`, `--weight-heavy` `800`; `--tracking-label` `0.06em`, `--tracking-mark` `-0.02em`.
- Regola mobile: sotto `900px` `--text-2xs` sale a `0.75rem` (12 px) così nessun testo scende sotto 12 px.

## Spazi, forma, ombre, movimento

- Spazi (base 4 px): `--space-1` `4px`, `--space-2` `8px`, `--space-3` `12px`, `--space-4` `16px`, `--space-5` `20px`, `--space-6` `24px`, `--space-8` `32px`; `--panel-width` `560px`.
- Forma: `--rule` `1px`, `--radius` `4px`, `--radius-chip` `3px`.
- Ombre (solo sotto campioni ed etichette/modello): `--shadow-sample` (`0 4px 10px rgb(27 28 30 / 0.14)` chiaro, `0 4px 10px rgb(0 0 0 / 0.4)` scuro) e `--shadow-label` (`0 2px 6px rgb(27 28 30 / 0.06)` chiaro, `0 2px 6px rgb(0 0 0 / 0.25)` scuro).
- Movimento: `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`, `--duration-fast` `120ms`, `--duration-base` `220ms`, `--duration-view` `520ms` (cambio vista montata/sul piatto); tutti a `0ms` con `prefers-reduced-motion: reduce`.

## Componenti e regole

- I gruppi di scelta usano pulsanti con `aria-pressed` dentro un contenitore `role="group"` dotato di etichetta, mai radio ARIA.
- La pagina ha un solo `h1` (il marchio) e il pannello di destra porta `aria-label="Configurazione della deck box"`.
- I controlli di stampa formano un unico elenco `aria-live="polite"` in ordine fisso: verde con spunta se valido, rosso con croce, prefisso solo per screen reader «Da sistemare:» e testo che indica cosa cambiare se fallito.
- Il pulsante «Scarica zip» resta disabilitato finché almeno un controllo è rosso, accompagnato dalla nota che spiega il blocco; sotto compare sempre la nota sul contenuto dello zip.
- Selezionare una zona accende il campione corrispondente, un alone sul modello (`emissive` 0.3) e il richiamo numerato sul modello uguale al numero del campione.
- Ogni testo visibile passa da `src/lib/i18n.ts` (`it`/`en`), incluso il messaggio di caricamento della viewport 3D.
- Tutti i testi rispettano un contrasto minimo di 4,5:1 in entrambi i temi (es. `--ink-muted` scuro `#aaaaa5` su `--stock-pressed` `#3a3b3f` raggiunge 4,8:1).
- A `360px` non c'è scorrimento orizzontale; sotto `420px` si nasconde l'etichetta «Standard 60» nella barra; sotto `900px` i pannelli fini si nascondono e resta la nota che rimanda al computer.

## Come si verifica

- `npm run verify`: copia il WASM, esegue `next typegen`, `tsc --noEmit`, `vitest run` e `next build`.
- Lighthouse accessibilità: punteggio 100 in tema chiaro e scuro.
- Controllo responsive: `document.documentElement.scrollWidth <= window.innerWidth` a `360px` di larghezza.
