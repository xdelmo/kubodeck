import { Configurator } from '../components/Configurator';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <header className={styles.topbar}>
        <span className={styles.wordmark}>KuboDeck</span>
        <span className={`${styles.model} mono`}>Standard 60</span>
        <span className={styles.subtitle}>
          60 carte con doppia bustina (67 × 93 mm) · Bambu Lab A1 Mini
        </span>
      </header>
      <Configurator />
    </>
  );
}
