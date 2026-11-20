# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Due pubblici alla pari (decisione dell'utente, 2026-11-20):

- **Chi valuta il portfolio** (recruiter, studi, clienti): deve capire in pochi secondi che la geometria è CAD vero generato nel browser e che gli STL escono pronti per la stampa, non come anteprima.
- **Giocatori di TCG con una stampante Bambu Lab**: hanno un mazzo da 60 carte con doppia bustina e vogliono una deck box loro. Arrivano, scelgono colori, testo ed emblema, scaricano lo zip e lo stampano sulla A1 Mini.

## Product Purpose

KuboDeck configura deck box per carte (sleeve doppie 67 × 93 mm), le mostra in 3D e scarica STL che si stampano davvero su Bambu Lab A1 Mini (piatto 180 × 180 × 180 mm). Prima è un pezzo da portfolio; poi diventa un servizio di stampa su richiesta (non nella v1).

Successo: il visitatore che valuta capisce il livello tecnico senza leggere una riga di spiegazione; il giocatore scarica uno zip che Bambu Studio importa senza avvisi e che, stampato, si chiude e contiene il mazzo.

## Positioning

La mesh che si vede è la stessa che si scarica: geometria manifold generata nel browser, controllata da test automatici (solido chiuso, ingombro sul piatto, gioco del coperchio, pila di carte nel vano, tratto minimo e testo dentro la faccia) e validata con una stampa reale. Un configuratore che mostra un'immagine e consegna altro non può dirlo.

## Operating Context

- Il giocatore lavora con Bambu Studio e AMS: importa i file di un oggetto insieme come parti di un oggetto unico e assegna uno slot per zona colore (corpo, coperchio, accento, testo/emblema).
- Corpo in piedi, calotta capovolta con l'intarsio sul primo layer; niente supporti.
- Il link della configurazione è condivisibile (schema versionato `v=1`).

## Capabilities and Constraints

- v1: un solo modello, Standard 60 (78 × 104 mm, profondità dalla pila di carte, parametro `stackThicknessMm` 20-40 mm, stima di partenza 33).
- Filamenti: solo PLA Basic e PLA Matte (decisione dell'utente, 2026-11-20), con densità dalle schede tecniche Bambu Lab e stima del peso dal volume reale.
- Testo in rilievo sul fronte o intarsio a filo sulla calotta, 2 font OFL (Archivo Black, Space Mono Bold), solo caratteri latini, massimo 16 caratteri; 6 emblemi interni.
- Quando un controllo è rosso l'export si blocca con un messaggio che dice cosa cambiare.
- Sito statico (Next.js static export su Netlify), nessun backend; il download STL non si può far pagare.
- **Lingue: italiano e inglese**, con selettore (decisione dell'utente, 2026-11-20). I testi già scritti (messaggi dei controlli, `LEGGIMI.txt`) sono in italiano e vanno resi bilingui.
- Fuori dalla v1: altri modelli, magneti, testo inciso, upload SVG, ordini e pagamenti, 3MF.

## Evidence on Hand

Nessun materiale reale per ora (2026-11-20): niente logo, foto di stampe o del mazzo, testimonianze. Le prime foto arriveranno dalla stampa di prova; fino ad allora non si inventano foto, recensioni, numeri di stampe o clienti.

## Product Principles

1. Ciò che si vede è ciò che si stampa: nessuna promessa che non finisca nel file.
2. Il blocco spiega: ogni limite di stampa diventa un messaggio che dice cosa cambiare, mai un errore muto.
3. Il contenuto arriva subito, la 3D dopo: la pagina è utile prima che la viewport carichi.
4. Un tecnico e un giocatore leggono la stessa pagina: precisione senza gergo.

## Accessibility & Inclusion

Nessun requisito specifico raccolto oltre allo standard WCAG AA; i controlli devono funzionare anche senza la viewport 3D (tastiera, screen reader).
