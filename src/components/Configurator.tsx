'use client';

import { useEffect, useState } from 'react';
import { depthMm, ZONE_IDS, type ZoneId } from '../lib/config';
import { FILAMENTS } from '../lib/filaments';
import { formatMm, formatNumber, LANGS, UI, ZONE_LABEL, type Lang } from '../lib/i18n';
import { plateOffsets } from '../lib/geometry/plate';
import { useBoxModel } from './useBoxModel';
import { ViewportLoader } from './ViewportLoader';
import { Presets } from './Presets';
import { Filamenti } from './panels/Filamenti';
import { Pila } from './panels/Pila';
import { Testo } from './panels/Testo';
import { Emblema } from './panels/Emblema';
import { ExportBar } from './ExportBar';
import styles from './Configurator.module.css';

const LANG_KEY = 'kubodeck-lang';

function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>('it');
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {}
    const next =
      saved === 'it' || saved === 'en' ? saved : navigator.language.startsWith('it') ? 'it' : 'en';
    setLang(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return [
    lang,
    (l) => {
      setLang(l);
      try {
        localStorage.setItem(LANG_KEY, l);
      } catch {}
    },
  ];
}

export function Configurator() {
  const model = useBoxModel();
  const { config, dispatch, status, error, parts, checks, weight, exportBlocked } = model;
  const [lang, setLang] = useLang();
  const [zone, setZone] = useState<ZoneId>('body');
  const [view, setView] = useState<'assembled' | 'plate'>('assembled');
  const [copied, setCopied] = useState(false);
  const t = UI[lang];
  const D = depthMm(config.stackThicknessMm);
  const fits = checks.find((c) => c.id === 'fitsPlate');
  const footprint = parts.length ? plateOffsets(parts).footprint : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.wordmark}>KuboDeck</span>
          <span className={`${styles.modelTag} mono`}>Standard 60</span>
          <span className={styles.tagline}>{t.tagline}</span>
        </div>
        <div className={styles.topActions}>
          <button type="button" className={styles.ghost} onClick={copy} aria-live="polite">
            {copied ? t.linkCopied : t.copyLink}
          </button>
          <div className={styles.seg} role="radiogroup" aria-label={t.language}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.board} aria-label={t.model3d}>
          <div className={styles.stage}>
            <div className={styles.viewport}>
              {status === 'error' ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : (
                <ViewportLoader
                  parts={parts}
                  filaments={config.filaments}
                  depthMm={D}
                  selectedZone={zone}
                  view={view}
                  labels={{ model: t.model3d, openCap: t.openCap, closeCap: t.closeCap }}
                />
              )}
              {view === 'plate' && fits && (
                <p className={styles.plateBadge} data-ok={fits.ok}>
                  {fits.ok ? t.plateFits : t.plateDoesNotFit}
                </p>
              )}
            </div>
            <ol className={styles.samples} aria-label={t.zones}>
              {ZONE_IDS.map((z, i) => {
                const f = FILAMENTS[config.filaments[z]];
                return (
                  <li key={z}>
                    <button
                      type="button"
                      className={styles.sample}
                      aria-pressed={zone === z}
                      onClick={() => setZone(z)}
                    >
                      <span
                        className={styles.chip}
                        data-line={f.line === 'PLA Basic' ? 'basic' : 'matte'}
                        style={{ background: f.hex }}
                      />
                      <span className={styles.label}>
                        <span className={styles.labelTop}>
                          <span className={styles.callout}>{i + 1}</span>
                          <span className={styles.labelZone}>{ZONE_LABEL[lang][z]}</span>
                          <span className={`${styles.code} mono`}>{f.line}</span>
                        </span>
                        <span className={styles.labelMeta}>
                          <span>{lang === 'en' ? f.nameEn : f.name}</span>
                          <span className={`${styles.code} mono`}>{f.code}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className={`${styles.boardFoot} mono`}>
            <span>
              {view === 'plate'
                ? 'A1 Mini 180 × 180 × 180 mm'
                : `78 × ${formatNumber(D, lang)} × 104 mm`}
            </span>
            {footprint && (
              <span>
                {lang === 'it' ? 'Sul piatto' : 'On the plate'}: {formatMm(footprint.x, lang)} ×{' '}
                {formatMm(footprint.y, lang)}
              </span>
            )}
          </p>
        </section>

        <aside className={styles.panel} aria-label={t.zones}>
          <div className={styles.secHead}>
            <span className={styles.secTitle} id="view-label">
              {t.view}
            </span>
            <div className={styles.seg} role="radiogroup" aria-labelledby="view-label">
              {(['assembled', 'plate'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                >
                  {v === 'assembled' ? t.viewAssembled : t.viewPlate}
                </button>
              ))}
            </div>
          </div>
          <Presets config={config} dispatch={dispatch} lang={lang} />
          <div className={styles.fine}>
            <Filamenti
              config={config}
              dispatch={dispatch}
              zone={zone}
              onZone={setZone}
              lang={lang}
            />
            <Pila config={config} dispatch={dispatch} lang={lang} />
            <Testo config={config} dispatch={dispatch} lang={lang} />
            <Emblema config={config} dispatch={dispatch} lang={lang} />
          </div>
          <p className={styles.mobileNote}>{t.mobileNote}</p>
          {status === 'loading' && <p className={styles.hint}>{t.loading}</p>}
          <ExportBar
            parts={parts}
            checks={checks}
            weight={weight}
            blocked={exportBlocked}
            lang={lang}
          />
        </aside>
      </main>
    </>
  );
}
