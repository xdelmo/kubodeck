'use client';

import dynamic from 'next/dynamic';
import styles from './Configurator.module.css';
import { UI } from '../lib/i18n';

// La lingua scelta è già su <html lang> quando la viewport si carica sul client.
function Skeleton() {
  const en = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  return (
    <div className={styles.viewportSkeleton} role="status">
      {UI[en ? 'en' : 'it'].loadingViewport}
    </div>
  );
}

// La viewport arriva dopo: la pagina è già utile senza WebGL.
export const ViewportLoader = dynamic(() => import('./Viewport'), {
  ssr: false,
  loading: Skeleton,
});
