import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../src/lib/config';

const posted: { id: number; config: { stackThicknessMm: number } }[] = [];
let instance: { onmessage: (e: { data: unknown }) => void } | null = null;
class FakeWorker {
  onmessage: (e: { data: unknown }) => void = () => {};
  onerror: () => void = () => {};
  constructor() {
    instance = this;
  }
  postMessage(m: (typeof posted)[number]) {
    posted.push(m);
  }
}
beforeAll(() => vi.stubGlobal('Worker', FakeWorker));
afterAll(() => vi.unstubAllGlobals());

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
