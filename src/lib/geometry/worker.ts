/// <reference lib="webworker" />
import { getManifold } from './wasm';
import { loadFonts } from '../fonts';
import { disposeParts } from './box';
import { generate, toMeshes, type WorkerRequest, type WorkerResponse } from './generate';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const reply = (r: WorkerResponse, transfer: Transferable[] = []) =>
    scope.postMessage(r, transfer);
  let wasm, fonts;
  try {
    wasm = await getManifold(() => '/manifold.wasm');
  } catch {
    return reply({ id: data.id, ok: false, kind: 'wasm' });
  }
  try {
    fonts = await loadFonts();
  } catch {
    return reply({ id: data.id, ok: false, kind: 'fonts' });
  }
  try {
    const { parts, checks, weight } = generate(wasm, fonts, data.config);
    let meshes;
    try {
      meshes = toMeshes(parts);
    } finally {
      disposeParts(parts);
    }
    reply(
      { id: data.id, ok: true, meshes, checks, weight },
      meshes.flatMap((m) => [m.vertProperties.buffer, m.triVerts.buffer]),
    );
  } catch {
    reply({ id: data.id, ok: false, kind: 'geometry' });
  }
};
