'use client';

import type { Face } from '../../lib/config';
import { UI, type Lang } from '../../lib/i18n';
import styles from '../Configurator.module.css';

export function FaceToggle({
  value,
  onChange,
  lang,
  label,
}: {
  value: Face;
  onChange: (f: Face) => void;
  lang: Lang;
  label: string;
}) {
  const t = UI[lang];
  return (
    <div className={styles.seg} role="group" aria-label={label}>
      {(['front', 'cap'] as const).map((f) => (
        <button key={f} type="button" aria-pressed={value === f} onClick={() => onChange(f)}>
          {f === 'front' ? t.faceFront : t.faceCap}
        </button>
      ))}
    </div>
  );
}
