'use client';

import { useState } from 'react';
import type { Part } from '../lib/geometry/box';
import type { Check } from '../lib/geometry/checks';
import type { ZoneId } from '../lib/config';
import { buildExportZip } from '../lib/export/zip';
import { checkMessage, formatG, UI, ZONE_LABEL, type Lang } from '../lib/i18n';
import styles from './Configurator.module.css';

interface Props {
  parts: Part[];
  checks: Check[];
  weight: { total: number; byZone: Record<ZoneId, number> } | null;
  blocked: boolean;
  lang: Lang;
}

export function ExportBar({ parts, checks, weight, blocked, lang }: Props) {
  const t = UI[lang];
  const [busy, setBusy] = useState(false);
  const failing = checks.filter((c) => !c.ok);

  const download = () => {
    setBusy(true);
    try {
      const zip = buildExportZip(parts);
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kubodeck-standard-60.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.exportBar} aria-label={t.checks}>
      <h2 className={styles.secTitle}>{t.checks}</h2>
      <ul className={styles.checks} aria-live="polite">
        {checks.map((c) =>
          c.ok ? (
            <li key={c.id} className={styles.checkOk}>
              <svg aria-hidden="true" viewBox="0 0 12 12" className={styles.tick}>
                <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              {checkMessage(c, lang)}
            </li>
          ) : (
            <li key={c.id} className={styles.checkFail}>
              <svg aria-hidden="true" viewBox="0 0 12 12" className={styles.cross}>
                <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span className="sr-only">{t.checkFailed}</span> {checkMessage(c, lang)}
            </li>
          ),
        )}
      </ul>
      <div className={styles.exportFoot}>
        {weight && (
          <div className={styles.weight}>
            <span className={styles.weightTotal}>
              {t.weight}: <span className="mono">{formatG(weight.total, lang)}</span>
            </span>
            <span className={`${styles.weightBreak} mono`}>
              {(Object.keys(weight.byZone) as ZoneId[])
                .filter((z) => weight.byZone[z] > 0)
                .map(
                  (z) => `${ZONE_LABEL[lang][z].split(' (')[0]} ${formatG(weight.byZone[z], lang)}`,
                )
                .join(' · ')}{' '}
              · {t.weightHint}
            </span>
          </div>
        )}
        <button
          type="button"
          className={styles.primary}
          disabled={blocked || busy}
          aria-describedby={blocked ? 'export-blocked' : undefined}
          onClick={download}
        >
          {t.download}
        </button>
      </div>
      {blocked && failing.length > 0 && (
        <p id="export-blocked" className={styles.blockedNote}>
          {t.downloadBlocked}
        </p>
      )}
      <p className={styles.zipNote}>{t.zipContents}</p>
    </section>
  );
}
