'use client';

import { depthMm } from '../lib/config';
import { useBoxModel } from './useBoxModel';
import { ViewportLoader } from './ViewportLoader';
import styles from './Configurator.module.css';

// Provvisorio (Task 8): pannelli, preset, vista piatto ed export arrivano al Task 9.
export function Configurator() {
  const model = useBoxModel();
  const { config, status, error, checks, weight } = model;
  return (
    <main className={styles.main}>
      <section className={styles.board} aria-label="Tavola del modello">
        {status === 'error' ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <ViewportLoader
            parts={model.parts}
            filaments={config.filaments}
            depthMm={depthMm(config.stackThicknessMm)}
          />
        )}
      </section>
      <aside className={styles.panel} aria-label="Configurazione">
        <ul className={styles.checks} aria-label="Controlli di stampa">
          {checks.map((c) => (
            <li key={c.id} data-ok={c.ok}>
              {c.message}
            </li>
          ))}
        </ul>
        {weight && <p className="mono">Peso stimato: {weight.total.toFixed(0)} g</p>}
      </aside>
    </main>
  );
}
