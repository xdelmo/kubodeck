'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Font } from 'opentype.js';
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  type BoxConfig,
  type FontId,
  type ZoneId,
} from '../lib/config';
import { decodeConfig, encodeConfig } from '../lib/url';
import { getManifold, type Wasm } from '../lib/geometry/wasm';
import { disposeParts, type Part } from '../lib/geometry/box';
import type { Check } from '../lib/geometry/checks';
import { fromMeshes, generate, type Generated } from '../lib/geometry/generate';
import { GenerateError, generateInWorker, isSuperseded } from '../lib/geometry/workerClient';
import { loadFonts as defaultLoadFonts } from '../lib/fonts';

export type Action =
  { type: 'set'; patch: Partial<BoxConfig> } | { type: 'preset'; config: BoxConfig };

interface Deps {
  loadWasm?: () => Promise<Wasm>;
  loadFonts?: () => Promise<Record<FontId, Font>>;
}

interface Model {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  parts: Part[];
  checks: Check[];
  weight: { total: number; byZone: Record<ZoneId, number> } | null;
}

const URL_DEBOUNCE_MS = 150;

const defaultLoadWasm = () => getManifold(() => '/manifold.wasm');

const MESSAGES = {
  wasm: 'Non riesco a caricare il motore geometrico: ricarica la pagina.',
  fonts: 'Non riesco a caricare i font: ricarica la pagina.',
  geometry: 'Errore nella geometria: ricarica la pagina.',
};
const tag = <T>(p: Promise<T>, kind: GenerateError['kind']) =>
  p.catch(() => {
    throw new GenerateError(kind);
  });

// Prepara una generazione: la promessa si risolve con una funzione che crea i manifold,
// da chiamare solo se il risultato è ancora attuale.
type Prepare = (config: BoxConfig) => Promise<() => Generated>;

const inThread =
  (loadWasm: () => Promise<Wasm>, loadFonts: () => Promise<Record<FontId, Font>>): Prepare =>
  async (config) => {
    const [wasm, fonts] = await Promise.all([tag(loadWasm(), 'wasm'), tag(loadFonts(), 'fonts')]);
    return () => generate(wasm, fonts, config);
  };

// Il calcolo pesante (fino a ~150 ms col testo lungo) gira nel Worker; qui si ricostruiscono
// solo i manifold dalle mesh, senza booleane.
const inWorker: Prepare = async (config) => {
  const [wasm, res] = await Promise.all([tag(defaultLoadWasm(), 'wasm'), generateInWorker(config)]);
  return () => ({ parts: fromMeshes(wasm, res.meshes), checks: res.checks, weight: res.weight });
};

export function useBoxModel(deps: Deps = {}) {
  const [prepare] = useState<Prepare>(() =>
    deps.loadWasm || deps.loadFonts || typeof Worker === 'undefined'
      ? inThread(deps.loadWasm ?? defaultLoadWasm, deps.loadFonts ?? defaultLoadFonts)
      : inWorker,
  );

  // Il primo render è uguale sul server e sul client; la config dell'URL arriva al montaggio.
  const [config, setConfig] = useState<BoxConfig>(DEFAULT_CONFIG);
  const [fromUrl, setFromUrl] = useState(false);
  const [model, setModel] = useState<Model>({
    status: 'loading',
    error: null,
    parts: [],
    checks: [],
    weight: null,
  });
  const [pending, setPending] = useState(true);
  const gen = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setConfig(decodeConfig(window.location.search));
    setFromUrl(true);
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!fromUrl) return;
    const my = ++gen.current;
    setPending(true);
    prepare(config).then(
      (make) => {
        // Un risultato superato da una modifica più recente non si costruisce nemmeno.
        if (my !== gen.current || !mounted.current) return;
        let result: Generated;
        try {
          result = make();
        } catch {
          setModel((m) => ({ ...m, status: 'error', error: MESSAGES.geometry }));
          setPending(false);
          return;
        }
        setModel({ status: 'ready', error: null, ...result });
        setPending(false);
      },
      (err: unknown) => {
        if (isSuperseded(err) || my !== gen.current || !mounted.current) return;
        const error = MESSAGES[err instanceof GenerateError ? err.kind : 'geometry'];
        setModel((m) => ({ ...m, status: 'error', error }));
        setPending(false);
      },
    );
  }, [config, fromUrl, prepare]);

  // Le parti precedenti si liberano quando arrivano le nuove (o allo smontaggio), dopo il commit.
  useEffect(() => {
    const parts = model.parts;
    return () => disposeParts(parts);
  }, [model.parts]);

  useEffect(() => {
    if (!fromUrl) return;
    const t = setTimeout(
      () => window.history.replaceState(null, '', `?${encodeConfig(config)}`),
      URL_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [config, fromUrl]);

  const dispatch = useCallback((a: Action) => {
    setConfig((c) => normalizeConfig(a.type === 'set' ? { ...c, ...a.patch } : a.config));
  }, []);

  const exportBlocked = model.status !== 'ready' || pending || model.checks.some((c) => !c.ok);
  return { config, dispatch, ...model, exportBlocked };
}
