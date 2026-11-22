# Controlli di Stampa Automatici

## Perché verificare la mesh reale e non solo i parametri

Un controllo puramente aritmetico sui parametri di input (es. `stackThicknessMm <= 40`) non intercetta errori derivanti da booleane fallite, glifi mancanti nel font, tratti troppo fini per l'ugello da `0,4 mm` o sovrapposizioni tra zone AMS diverse.

In KuboDeck `runChecks` (`src/lib/geometry/checks.ts`) ispeziona direttamente i `Manifold` generati. Se almeno uno degli **8 controlli** fallisce, `ExportBar` disabilita il download dello `.zip` e mostra l'azione correttiva.

## I 8 controlli eseguiti

| ID | Cosa verifica sulle mesh reali |
| :--- | :--- |
| `manifold` | Ogni parte ha `status() === 'NoError'` e `!isEmpty()`. |
| `fitsPlate` | Layout sul piatto (`layoutOnPlate`): ingombro X/Y entro `180 × 180 mm` con `5 mm` di margine per lato, altezza entro `180 mm`. |
| `capClearance` | Simula il montaggio (`capToAssembled`): verifica `collar.manifold.minGap(assembled, 1) >= capClearance - 0.001` (`0,30 mm`) e assenza di intersezione col corpo. |
| `holdsStack` | Crea un solido parallelepipedo che rappresenta la pila di carte (`67 × stack × 93 mm`) appoggiata sul fondo interno e verifica assenza di collisione (`overlap < 1e-6`) con corpo, colletto e coperchio montato. |
| `zonesDisjoint` | Per ogni coppia di parti appartenenti allo stesso `object` (`body` o `cap`), verifica che il volume di intersezione sia `< 1e-6` mm³ (fondamentale per l'assegnazione multi-materiale AMS). |
| `minStroke` | Seziona `frontArt` e `capArt` a metà spessore (`reliefFront / 2`, `inlayCap / 2`) e verifica con `sectionStrokeOk` che ogni tratto sia largo almeno `0,8 mm`. |
| `artFitsFace` | Verificato da `composeArt`: testo ed emblema restano entro i margini utili della faccia scelta. |
| `glyphs` | Verificato da `composeArt`: ogni carattere inserito esiste nel font `opentype.js` selezionato. |

## Misurazione geometrica di gioco e sovrapposizioni

```ts
// src/lib/geometry/checks.ts — gioco coperchio e controllo intersezioni tra zone
const gapOk =
  collar.manifold.minGap(assembled, 1) >= DIMENSIONS.capClearance - 0.001 &&
  overlap(assembled, body.manifold) < EPS;
```

Per `minStroke`, invece di stimare la larghezza dal font-size tipografico, il controllo ruota `frontArt` in verticale e taglia fisicamente la mesh a metà altezza dell'estrusione, misurando la sezione effettiva stampata dall'ugello:

```ts
// src/lib/geometry/checks.ts — controllo tratto minimo sulla sezione stampata
const front = find('frontArt');
if (front) {
  const upright = front.manifold.rotate([-90, 0, 0]);
  try {
    const cs = upright.slice(DIMENSIONS.reliefFront / 2);
    try {
      if (!sectionStrokeOk(cs)) thin.push('front');
    } finally {
      cs.delete();
    }
  } finally {
    upright.delete();
  }
}
```
