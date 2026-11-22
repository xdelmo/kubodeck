# Setup & Qualità del Codice

## Prerequisiti

- **Node.js 24** (allineato a `netlify.toml` e `@types/node` v24 in `package.json`).
- **Python 3** (solo se si compila in locale la documentazione MkDocs).

## Installazione e avvio locale

```bash
npm install
npm run dev
```

`npm install` esegue automaticamente `prepare` (`husky`), installando i git hook locali.

## Asset WASM generato

`public/manifold.wasm` **non è tracciato in git**: viene copiato da `node_modules/manifold-3d/manifold.wasm` tramite `scripts/copy-wasm.mjs` (`npm run prepare-assets`). Gli script `pretest` e `prebuild` lo eseguono automaticamente prima dei test e della build.

!!! warning "Non committare `public/manifold.wasm`"
    Il file WASM è un artefatto copiato da `node_modules` ed è rigenerato in automatico dai comandi npm.

## Comandi disponibili

| Comando | Cosa esegue | Quando usarlo |
| :--- | :--- | :--- |
| `npm run dev` | Avvia `next dev` in sviluppo | Sviluppo locale UI e viewport 3D |
| `npm test` | `prepare-assets` + `vitest run` | Verifica rapida della suite Vitest |
| `npm run typecheck` | `next typegen && tsc --noEmit` | Controllo tipi Next.js e TypeScript strict |
| `npm run lint` | `eslint` | Controllo regole ESLint |
| `npm run verify` | `prepare-assets` + `next typegen` + `tsc --noEmit` + `vitest run` + `next build` | **Obbligatorio** prima di ogni commit sul codice |

## Hook di pre-commit

Il file `.husky/pre-commit` esegue automaticamente a ogni commit:

```sh
npx lint-staged
npm run typecheck
npm run test
```

## Compilare i docs in locale

Per verificare la documentazione con Material for MkDocs in un virtualenv isolato:

```bash
python3 -m venv .venv-docs
.venv-docs/bin/pip install mkdocs-material
.venv-docs/bin/mkdocs build --strict
```

Per l'anteprima locale:

```bash
.venv-docs/bin/mkdocs serve
```
