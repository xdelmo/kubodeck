'use client';

import { FILAMENTS } from '../lib/filaments';
import { PRESETS } from '../lib/presets';
import { UI, type Lang } from '../lib/i18n';
import type { Action } from './useBoxModel';
import type { BoxConfig } from '../lib/config';
import styles from './Configurator.module.css';

const same = (a: BoxConfig, b: BoxConfig) => JSON.stringify(a) === JSON.stringify(b);

export function Presets({
  config,
  dispatch,
  lang,
}: {
  config: BoxConfig;
  dispatch: (a: Action) => void;
  lang: Lang;
}) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.secTitle}>{UI[lang].presets}</legend>
      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.preset}
            aria-pressed={same(p.config, config)}
            onClick={() => dispatch({ type: 'preset', config: p.config })}
          >
            <span className={styles.presetDots} aria-hidden="true">
              <span style={{ background: FILAMENTS[p.config.filaments.body].hex }} />
              <span style={{ background: FILAMENTS[p.config.filaments.accent].hex }} />
            </span>
            <span className={styles.presetName}>{p.name[lang]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
