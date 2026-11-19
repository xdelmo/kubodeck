import Module from 'manifold-3d';

export type Wasm = Awaited<ReturnType<typeof Module>>;

let cached: Promise<Wasm> | null = null;

export function getManifold(locateFile?: (f: string) => string): Promise<Wasm> {
  if (!cached) {
    // Tipi di manifold-3d dichiarano () => string, ma Emscripten passa il nome file a runtime.
    const arg = locateFile ? { locateFile: locateFile as () => string } : undefined;
    cached = Module(arg)
      .then((wasm) => {
        wasm.setup();
        return wasm;
      })
      .catch((err) => {
        // Azzera la cache per permettere un nuovo tentativo dopo un errore di init.
        cached = null;
        throw err;
      });
  }
  return cached;
}
