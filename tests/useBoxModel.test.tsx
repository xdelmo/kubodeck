// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import Module from 'manifold-3d';
import type { Font } from 'opentype.js';
import type { FontId } from '../src/lib/config';
import type { Wasm } from '../src/lib/geometry/wasm';
import type { Part } from '../src/lib/geometry/box';
import { loadFonts as loadTestFonts } from './geometry/fonts';

const built: Part[][] = [];
const disposed = new Set<Part[]>();
vi.mock('../src/lib/geometry/box', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/lib/geometry/box')>();
  return {
    ...orig,
    buildParts: vi.fn((...args: Parameters<typeof orig.buildParts>) => {
      const parts = orig.buildParts(...args);
      built.push(parts);
      return parts;
    }),
    disposeParts: vi.fn((parts: Part[]) => {
      disposed.add(parts);
      orig.disposeParts(parts);
    }),
  };
});

const { useBoxModel } = await import('../src/components/useBoxModel');

let wasm: Wasm;
let fonts: Record<FontId, Font>;
beforeAll(async () => {
  // In jsdom Emscripten si crede in un browser: gli passo il binario invece di farlo scaricare.
  const wasmBinary = fs.readFileSync('node_modules/manifold-3d/manifold.wasm');
  wasm = await Module({ wasmBinary } as unknown as Parameters<typeof Module>[0]);
  wasm.setup();
  fonts = loadTestFonts();
});
afterEach(() => {
  built.length = 0;
  disposed.clear();
  history.replaceState(null, '', '/');
});

const ok = { loadWasm: () => Promise.resolve(wasm), loadFonts: () => Promise.resolve(fonts) };

describe('useBoxModel', () => {
  test('arriva a ready con parti, controlli verdi e peso', async () => {
    const { result, unmount } = renderHook(() => useBoxModel(ok));
    expect(result.current.exportBlocked).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.parts.length).toBe(5);
    expect(result.current.checks.every((c) => c.ok)).toBe(true);
    expect(result.current.weight!.total).toBeGreaterThan(0);
    expect(result.current.exportBlocked).toBe(false);
    unmount();
    expect(built.every((p) => disposed.has(p))).toBe(true);
  });

  test.each(['loadWasm', 'loadFonts'] as const)(
    '%s che rifiuta: errore in italiano ed export bloccato',
    async (which) => {
      const deps = { ...ok, [which]: () => Promise.reject(new Error('rete')) };
      const { result } = renderHook(() => useBoxModel(deps));
      await waitFor(() => expect(result.current.status).toBe('error'));
      expect(result.current.error).toMatch(/ricarica la pagina/);
      expect(result.current.exportBlocked).toBe(true);
    },
  );

  test('due modifiche di fila: vince la seconda e nessuna parte resta viva', async () => {
    let releaseFirst!: () => void;
    let calls = 0;
    const deps = {
      loadWasm: () => Promise.resolve(wasm),
      loadFonts: () => {
        calls++;
        // La prima generazione dopo il montaggio resta in sospeso finché non la rilascio.
        if (calls === 2)
          return new Promise<Record<FontId, Font>>((r) => (releaseFirst = () => r(fonts)));
        return Promise.resolve(fonts);
      },
    };
    const { result, unmount } = renderHook(() => useBoxModel(deps));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.dispatch({ type: 'set', patch: { stackThicknessMm: 25 } }));
    act(() => result.current.dispatch({ type: 'set', patch: { stackThicknessMm: 38 } }));
    await waitFor(() => expect(result.current.config.stackThicknessMm).toBe(38));
    await waitFor(() => expect(result.current.exportBlocked).toBe(false));
    await act(async () => releaseFirst());
    // Il risultato in ritardo non sovrascrive quello nuovo.
    const body = result.current.parts.find((p) => p.id === 'body')!.manifold.boundingBox();
    expect(body.max[1] - body.min[1]).toBeCloseTo(38 + 5.6 + 1, 5);
    const current = built.find((p) => result.current.parts === p);
    expect(built.filter((p) => p !== current).every((p) => disposed.has(p))).toBe(true);
    unmount();
    expect(built.every((p) => disposed.has(p))).toBe(true);
  });

  test("un controllo rosso blocca l'export", async () => {
    history.replaceState(null, '', '/?v=1&txt=WWWWWWWWWWWWWWWW&tf=front');
    const { result } = renderHook(() => useBoxModel(ok));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.config.text.value).toBe('WWWWWWWWWWWWWWWW');
    expect(result.current.checks.some((c) => !c.ok)).toBe(true);
    expect(result.current.exportBlocked).toBe(true);
  });

  test("scrive la configurazione nell'URL dopo il debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(() => useBoxModel(ok));
      act(() => result.current.dispatch({ type: 'set', patch: { stackThicknessMm: 30 } }));
      expect(location.search).not.toContain('stack=30');
      await act(async () => vi.advanceTimersByTime(200));
      expect(location.search).toContain('stack=30');
    } finally {
      vi.useRealTimers();
    }
  });
});
