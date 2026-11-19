// Copia il WASM di manifold-3d in public/, servito come /manifold.wasm.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('public', { recursive: true });
copyFileSync('node_modules/manifold-3d/manifold.wasm', 'public/manifold.wasm');
