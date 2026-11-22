# Build Statico & Deploy

## Applicazione web (Netlify)

KuboDeck è configurato come **export statico puro** in `next.config.ts`:

```ts
// next.config.ts — export statico senza server Node a runtime
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
```

Il deploy dell'applicazione è gestito da Netlify tramite `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "24"
```

Durante `npm run build`:

1. `prebuild` esegue `scripts/copy-wasm.mjs` per copiare `manifold.wasm` in `public/`.
2. `next build` genera l'intero sito statico nella directory `out/`.

## Documentazione (MkDocs Material → GitHub Pages)

La documentazione tecnica vive in `docs/` (escludendo `docs/superpowers/` tramite `exclude_docs` in `mkdocs.yml`) ed è predisposta per il deploy su GitHub Pages tramite `.github/workflows/docs.yml`:

- **Trigger**: `push` su `main` quando cambiano `docs/**`, `mkdocs.yml` o `.github/workflows/docs.yml`.
- **Verifica locale consigliata**: `mkdocs build --strict` per intercettare link rotti o pagine non registrate in `nav`.
- **Pubblicazione**: `mkdocs gh-deploy --force` sul branch `gh-pages`.
