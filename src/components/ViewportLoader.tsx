'use client';

import dynamic from 'next/dynamic';
import styles from './Configurator.module.css';

function Skeleton() {
  return (
    <div className={styles.viewportSkeleton} role="status">
      Carico il modello 3D…
    </div>
  );
}

// La viewport arriva dopo: la pagina è già utile senza WebGL.
export const ViewportLoader = dynamic(() => import('./Viewport'), {
  ssr: false,
  loading: Skeleton,
});
