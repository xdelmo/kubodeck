import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../src/lib/config';

const posted: { id: number; config: { stackThicknessMm: number } }[] = [];
let instance: { onmessage: (e: { data: unknown }) => void; onerror: () => void } | null = null;
let constructions = 0;
let terminated = 0;
class FakeWorker {
  onmessage: (e: { data: unknown }) => void = () => {};
  onerror: () => void = () => {};
  constructor() {
    constructions++;
    instance = this;
  }
  postMessage(m: (typeof posted)[number]) {
    posted.push(m);
  }
  terminate() {
    terminated++;
  }
}
beforeAll(() => vi.stubGlobal('Worker', FakeWorker));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  posted.length = 0;
  instance = null;
  constructions = 0;
  terminated = 0;
  vi.resetModules();
  vi.stubGlobal('Worker', FakeWorker);
});

test("durante un calcolo resta in coda solo l'ultima richiesta; le intermedie si scartano", async () => {
  const { generateInWorker, isSuperseded } = await import('../src/lib/geometry/workerClient');
  const at = (s: number) => ({ ...DEFAULT_CONFIG, stackThicknessMm: s });
  const a = generateInWorker(at(20));
  const b = generateInWorker(at(25));
  const c = generateInWorker(at(30));
  await expect(b).rejects.toSatisfy(isSuperseded);
  expect(posted.map((p) => p.config.stackThicknessMm)).toEqual([20]);
  const ok = (id: number) => ({
    data: { id, ok: true, meshes: [], checks: [], weight: { total: 0, byZone: {} } },
  });
  instance!.onmessage(ok(posted[0].id));
  await expect(a).resolves.toMatchObject({ ok: true });
  expect(posted.map((p) => p.config.stackThicknessMm)).toEqual([20, 30]);
  instance!.onmessage({ data: { id: posted[1].id, ok: false, kind: 'fonts' } });
  await expect(c).rejects.toMatchObject({ kind: 'fonts' });
});

test('errore del worker con una richiesta in coda: entrambe rifiutano con GenerateError wasm', async () => {
  const { generateInWorker, GenerateError } = await import('../src/lib/geometry/workerClient');
  const at = (s: number) => ({ ...DEFAULT_CONFIG, stackThicknessMm: s });
  const a = generateInWorker(at(20));
  const b = generateInWorker(at(25));
  instance!.onerror();
  await expect(a).rejects.toSatisfy((e) => e instanceof GenerateError && e.kind === 'wasm');
  await expect(b).rejects.toSatisfy((e) => e instanceof GenerateError && e.kind === 'wasm');
  expect(terminated).toBe(1);
});

test('dopo un errore la richiesta successiva crea un worker nuovo', async () => {
  const { generateInWorker, GenerateError } = await import('../src/lib/geometry/workerClient');
  const at = (s: number) => ({ ...DEFAULT_CONFIG, stackThicknessMm: s });
  const a = generateInWorker(at(20));
  expect(constructions).toBe(1);
  instance!.onerror();
  await expect(a).rejects.toBeInstanceOf(GenerateError);
  const b = generateInWorker(at(25));
  expect(constructions).toBe(2);
  instance!.onmessage({
    data: { id: posted[1].id, ok: true, meshes: [], checks: [], weight: { total: 0, byZone: {} } },
  });
  await expect(b).resolves.toMatchObject({ ok: true });
});

test('new Worker che lancia: rifiuta con GenerateError wasm', async () => {
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        throw new Error('offline');
      }
    },
  );
  const { generateInWorker, GenerateError } = await import('../src/lib/geometry/workerClient');
  const req = generateInWorker({ ...DEFAULT_CONFIG });
  await expect(req).rejects.toSatisfy((e) => e instanceof GenerateError && e.kind === 'wasm');
});
