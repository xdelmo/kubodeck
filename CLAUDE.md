# KuboDeck

Configuratore web di deck box per carte (sleeve doppie 67 × 93 mm): l'utente sceglie modello, filamenti, testo ed emblema, vede la scatola in 3D e scarica STL stampabili su Bambu Lab A1 Mini (piatto 180 × 180 × 180 mm).

- Spec: `docs/superpowers/specs/2026-11-19-kubodeck-design.md`
- Piano v1: `docs/superpowers/plans/2026-11-19-kubodeck-v1.md`

## Stack

Next.js 16 App Router in static export (`output: 'export'`, deploy su Netlify), TypeScript strict, CSS puro, React Three Fiber per la viewport, manifold-3d (WASM) per la geometria, opentype.js per il testo, fflate per lo zip, Vitest per i test.

## Comandi

- `npm run verify`: copia il WASM, `next typegen`, `tsc --noEmit`, `vitest run`, `next build`. Deve essere verde prima di ogni commit che tocca il codice.
- `npm test`: solo i test (il `pretest` copia `public/manifold.wasm`).
- `npm run dev`: dev server.
- `public/manifold.wasm` è generato da `scripts/copy-wasm.mjs` e non va committato.

## Geometria

- Unità: 1 = 1 mm. Assi: X larghezza, Y profondità (fronte a y = 0), Z verso l'alto.
- La geometria è pura e testata: funzioni `config → parti manifold`, coperte da test (manifold, ingombro sul piatto, gioco del coperchio, testo dentro la faccia, la pila di carte nel vano). La UI non calcola geometria: la chiede a questi moduli e la mostra.
- La stessa mesh alimenta viewport ed export: ciò che si vede è ciò che si stampa.

## Stile

Lo stile passa dal flusso `/impeccable`: `init` (PRODUCT.md), `shape`, new-work con DESIGN.md, craft-floor prima di ogni modifica alla UI, poi `critique`, `audit`, `polish`, `harden` e `adapt`.

## Skill di progetto

In `.claude/skills/<nome>/`, ognuna collegata da `.agents/skills/<nome>` con un symlink relativo.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
