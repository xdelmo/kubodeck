import type { BoxConfig } from '../config';
import type { WorkerRequest, WorkerResponse } from './generate';

type Ok = Extract<WorkerResponse, { ok: true }>;
export class GenerateError extends Error {
  constructor(readonly kind: 'wasm' | 'fonts' | 'geometry') {
    super(kind);
  }
}

let worker: Worker | null = null;
let nextId = 0;
let inFlight: { id: number; resolve: (r: Ok) => void; reject: (e: Error) => void } | null = null;
// Al massimo una richiesta in attesa: le intermedie di un trascinamento si scartano.
let queued: { config: BoxConfig; resolve: (r: Ok) => void; reject: (e: Error) => void } | null =
  null;

class Superseded extends Error {}
export const isSuperseded = (e: unknown) => e instanceof Superseded;

function send(config: BoxConfig, resolve: (r: Ok) => void, reject: (e: Error) => void) {
  let w: Worker;
  try {
    w = worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  } catch {
    reject(new GenerateError('wasm'));
    return;
  }
  w.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    const cur = inFlight;
    if (!cur || data.id !== cur.id) return;
    inFlight = null;
    if (data.ok) cur.resolve(data);
    else cur.reject(new GenerateError(data.kind));
    if (queued) {
      const q = queued;
      queued = null;
      send(q.config, q.resolve, q.reject);
    }
  };
  w.onerror = () => {
    const cur = inFlight;
    const q = queued;
    inFlight = null;
    queued = null;
    worker?.terminate();
    worker = null;
    cur?.reject(new GenerateError('wasm'));
    q?.reject(new GenerateError('wasm'));
  };
  const id = ++nextId;
  inFlight = { id, resolve, reject };
  w.postMessage({ id, config } satisfies WorkerRequest);
}

export function generateInWorker(config: BoxConfig): Promise<Ok> {
  return new Promise((resolve, reject) => {
    if (!inFlight) return send(config, resolve, reject);
    queued?.reject(new Superseded());
    queued = { config, resolve, reject };
  });
}
