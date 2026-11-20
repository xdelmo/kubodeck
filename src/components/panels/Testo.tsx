'use client';

import { DIMENSIONS, FONT_IDS, type BoxConfig, type FontId } from '../../lib/config';
import { FONT_LABEL, UI, type Lang } from '../../lib/i18n';
import type { Action } from '../useBoxModel';
import { FaceToggle } from './FaceToggle';
import styles from '../Configurator.module.css';

export function Testo({
  config,
  dispatch,
  lang,
}: {
  config: BoxConfig;
  dispatch: (a: Action) => void;
  lang: Lang;
}) {
  const t = UI[lang];
  const set = (patch: Partial<BoxConfig['text']>) =>
    dispatch({ type: 'set', patch: { text: { ...config.text, ...patch } } });
  return (
    <fieldset className={styles.section}>
      <legend className={styles.secTitle}>{t.text}</legend>
      <div className={styles.row3}>
        <input
          className={`${styles.ctrl} mono`}
          type="text"
          aria-label={t.text}
          placeholder={t.textPlaceholder}
          maxLength={DIMENSIONS.maxTextLength}
          value={config.text.value}
          onChange={(e) => set({ value: e.target.value })}
        />
        <select
          className={styles.ctrl}
          aria-label={t.font}
          value={config.text.font}
          onChange={(e) => set({ font: e.target.value as FontId })}
        >
          {FONT_IDS.map((f) => (
            <option key={f} value={f}>
              {FONT_LABEL[f]}
            </option>
          ))}
        </select>
        <FaceToggle
          value={config.text.face}
          onChange={(face) => set({ face })}
          lang={lang}
          label={t.face}
        />
      </div>
      <p className={styles.hint}>{t.textFaceNote}</p>
    </fieldset>
  );
}
