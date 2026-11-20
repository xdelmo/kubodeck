'use client';

import { DIMENSIONS, type BoxConfig } from '../../lib/config';
import { formatMm, UI, type Lang } from '../../lib/i18n';
import type { Action } from '../useBoxModel';
import styles from '../Configurator.module.css';

export function Pila({
  config,
  dispatch,
  lang,
}: {
  config: BoxConfig;
  dispatch: (a: Action) => void;
  lang: Lang;
}) {
  const t = UI[lang];
  const s = DIMENSIONS.stack;
  return (
    <div className={styles.section}>
      <div className={styles.secHead}>
        <label htmlFor="stack" className={styles.secTitle}>
          {t.stack}
        </label>
        <span className={styles.readout}>
          <span className="mono">{formatMm(config.stackThicknessMm, lang)}</span>{' '}
          <span className={styles.hint}>({t.stackHint})</span>
        </span>
      </div>
      <div className={styles.sliderRow}>
        <span className={`${styles.hint} mono`}>{formatMm(s.min, lang, 0)}</span>
        <input
          id="stack"
          type="range"
          min={s.min}
          max={s.max}
          step={s.step}
          value={config.stackThicknessMm}
          onChange={(e) =>
            dispatch({ type: 'set', patch: { stackThicknessMm: Number(e.target.value) } })
          }
        />
        <span className={`${styles.hint} mono`}>{formatMm(s.max, lang, 0)}</span>
      </div>
    </div>
  );
}
