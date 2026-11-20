'use client';

import { ZONE_IDS, type BoxConfig, type ZoneId } from '../../lib/config';
import { FILAMENTS } from '../../lib/filaments';
import { UI, ZONE_LABEL, type Lang } from '../../lib/i18n';
import type { Action } from '../useBoxModel';
import styles from '../Configurator.module.css';

export function Filamenti({
  config,
  dispatch,
  zone,
  onZone,
  lang,
}: {
  config: BoxConfig;
  dispatch: (a: Action) => void;
  zone: ZoneId;
  onZone: (z: ZoneId) => void;
  lang: Lang;
}) {
  const t = UI[lang];
  const current = config.filaments[zone];
  return (
    <fieldset className={styles.section}>
      <legend className={styles.secTitle}>{t.zones}</legend>
      <div className={styles.zones} role="group" aria-label={t.zones}>
        {ZONE_IDS.map((z, i) => (
          <button
            key={z}
            type="button"
            aria-pressed={z === zone}
            className={styles.zonePill}
            onClick={() => onZone(z)}
          >
            <span className={styles.callout}>{i + 1}</span>
            <span>{ZONE_LABEL[lang][z]}</span>
            <span className={`${styles.code} mono`}>{FILAMENTS[config.filaments[z]].code}</span>
          </button>
        ))}
      </div>
      <div
        className={styles.swatches}
        role="group"
        aria-label={`${t.filament}: ${ZONE_LABEL[lang][zone]}`}
      >
        {Object.values(FILAMENTS).map((f) => {
          const name = lang === 'en' ? f.nameEn : f.name;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={f.id === current}
              aria-label={`${f.line} ${name} ${f.code}`}
              title={`${f.line} ${name} · ${f.code}`}
              className={styles.swatch}
              data-line={f.line === 'PLA Basic' ? 'basic' : 'matte'}
              style={{ background: f.hex }}
              onClick={() =>
                dispatch({
                  type: 'set',
                  patch: { filaments: { ...config.filaments, [zone]: f.id } },
                })
              }
            />
          );
        })}
      </div>
      <p className={`${styles.swatchLegend} mono`}>
        {FILAMENTS[current].line} ·{' '}
        {lang === 'en' ? FILAMENTS[current].nameEn : FILAMENTS[current].name} ·{' '}
        {FILAMENTS[current].code}
      </p>
    </fieldset>
  );
}
