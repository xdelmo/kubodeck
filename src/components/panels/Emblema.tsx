'use client';

import { EMBLEM_IDS, type BoxConfig, type EmblemId } from '../../lib/config';
import { EMBLEMS } from '../../lib/emblems';
import { EMBLEM_LABEL, UI, type Lang } from '../../lib/i18n';
import type { Action } from '../useBoxModel';
import { FaceToggle } from './FaceToggle';
import styles from '../Configurator.module.css';

// Miniatura vettoriale dagli stessi poligoni che finiscono nello STL.
function Glyph({ id }: { id: EmblemId }) {
  const d = EMBLEMS[id].polygons
    .map((c) => `M${c.map(([x, y]) => `${x.toFixed(2)} ${(-y).toFixed(2)}`).join('L')}Z`)
    .join('');
  return (
    <svg viewBox="-12 -12 24 24" aria-hidden="true" className={styles.emblemGlyph}>
      <path d={d} fillRule="nonzero" fill="currentColor" />
    </svg>
  );
}

export function Emblema({
  config,
  dispatch,
  lang,
}: {
  config: BoxConfig;
  dispatch: (a: Action) => void;
  lang: Lang;
}) {
  const t = UI[lang];
  const set = (patch: Partial<BoxConfig['emblem']>) =>
    dispatch({ type: 'set', patch: { emblem: { ...config.emblem, ...patch } } });
  return (
    <fieldset className={styles.section}>
      <div className={styles.secHead}>
        <legend className={styles.secTitle}>{t.emblem}</legend>
        <FaceToggle
          value={config.emblem.face}
          onChange={(face) => set({ face })}
          lang={lang}
          label={`${t.emblem}: ${t.face}`}
        />
      </div>
      <div className={styles.emblems} role="group" aria-label={t.emblem}>
        <button
          type="button"
          aria-pressed={config.emblem.id === null}
          className={styles.emblem}
          onClick={() => set({ id: null })}
        >
          {t.emblemNone}
        </button>
        {EMBLEM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={config.emblem.id === id}
            aria-label={EMBLEM_LABEL[lang][id]}
            title={EMBLEM_LABEL[lang][id]}
            className={styles.emblem}
            onClick={() => set({ id })}
          >
            <Glyph id={id} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
