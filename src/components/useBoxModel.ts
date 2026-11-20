'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parse, type Font } from 'opentype.js';
import {
  DEFAULT_CONFIG,
  FONT_IDS,
  normalizeConfig,
  type BoxConfig,
  type FontId,
  type ZoneId,
} from '../lib/config';
import { decodeConfig, encodeConfig } from '../lib/url';
import { getManifold, type Wasm } from '../lib/geometry/wasm';
import { buildParts, disposeParts, type Part } from '../lib/geometry/box';
import { runChecks, type Check } from '../lib/geometry/checks';
import { composeArt, FONT_FILES } from '../lib/geometry/art';
import { estimateWeightG } from '../lib/filaments';

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

let fontsPromise: Promise<Record<FontId, Font>> | null = null;
function defaultLoadFonts(): Promise<Record<FontId, Font>> {
  fontsPromise ??= Promise.all(
    FONT_IDS.map(async (id) => {
      const res = await fetch(FONT_FILES[id]);
      if (!res.ok) throw new Error(`${FONT_FILES[id]}: HTTP ${res.status}`);
      return [id, parse(await res.arrayBuffer())] as const;
    }),
  )
    .then((entries) => Object.fromEntries(entries) as Record<FontId, Font>)
    .catch((err) => {
      fontsPromise = null;
      throw err;
    });
  return fontsPromise;
}
const defaultLoadWasm = () => getManifold(() => '/manifold.wasm');

class LoadError extends Error {}
const tag = <T>(p: Promise<T>, message: string) =>
  p.catch(() => {
    throw new LoadError(message);
  });

export function useBoxModel(deps: Deps = {}) {
  const loadWasm = deps.loadWasm ?? defaultLoadWasm;
  const loadFonts = deps.loadFonts ?? defaultLoadFonts;

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
    Promise.all([
      tag(loadWasm(), 'Non riesco a caricare il motore geometrico: ricarica la pagina.'),
      tag(loadFonts(), 'Non riesco a caricare i font: ricarica la pagina.'),
    ]).then(
      ([wasm, fonts]) => {
        // Un risultato superato da una modifica più recente non si costruisce nemmeno.
        if (my !== gen.current || !mounted.current) return;
        const { art, checks: artChecks } = composeArt(config, fonts);
        const parts = buildParts(wasm, config, art);
        const checks = runChecks(wasm, parts, config, artChecks);
        const weight = estimateWeightG(parts, config.filaments);
        setModel({ status: 'ready', error: null, parts, checks, weight });
        setPending(false);
      },
      (err: unknown) => {
        if (my !== gen.current || !mounted.current) return;
        const error =
          err instanceof LoadError ? err.message : 'Errore nella geometria: ricarica la pagina.';
        setModel((m) => ({ ...m, status: 'error', error }));
        setPending(false);
      },
    );
    // loadWasm e loadFonts sono considerati stabili per tutta la vita del componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, fromUrl]);

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
