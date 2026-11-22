# lc-swipe-panels, lc-tabs en `swipe`

Bande de panneaux pleine largeur à accrochage natif (`scroll-snap`) : un glissement change de panneau, `activeIndex` le règle par le code. Mêmes panneaux côte à côte en `layout="columns"`, sans les recréer.

```html
<lc-segmented-control ariaLabel="Rubrique" [options]="views" [(value)]="index" [indicatorProgress]="strip.progress()" />
<lc-swipe-panels #strip [(activeIndex)]="index" chain>
  <section lcSwipePanel aria-label="Échanges">…</section>
  <section lcSwipePanel aria-label="Informations">…</section>
</lc-swipe-panels>
```

- **Une seule source de vérité** : `activeIndex` (`model`). `activeIndexChange` n'est émis que par un glissement ; changer `activeIndex` depuis le parent fait défiler la bande sans émission. Pendant ce défilement (sourdine, levée à `scrollend` ou au bout de 800 ms), aucun panneau traversé ne devient actif.
- **Rôle et nom des panneaux** : à l'application (`role="region"` et `aria-labelledby` ou `aria-label`). Les panneaux hors de vue sont `inert` (jamais `hidden`) ; si le focus était dans l'un d'eux, il passe au panneau actif.
- **Progression** : `progress()` (0 à n - 1, suit le doigt) et `--lc-swipe-panels-progress` ; elles pilotent le trait de `lc-tabs` et, par `indicatorProgress`, le fond de `lc-segmented-control` (déplacés en `transform`, sans transition). En colonnes, `progress = activeIndex`.
- **Imbrication** : `chain` (`false` par défaut) laisse, au bord, le geste passer à la bande qui défile au-dessus (`overscroll-behavior-x: auto`, sinon `contain`).
- **Mouvement réduit** : le défilement provoqué se fait en `instant`.
- **Jetons** : `--lc-swipe-panels-gutter` (marge de chaque panneau, 0 ; `sys.space.4` pour laisser le geste retour d'iOS en bord d'écran), `--lc-swipe-panels-gap` (colonnes), `--lc-swipe-panels-columns` (surcharge de `grid-template-columns`, ex. `minmax(0, 1fr) 21rem`).
- **`lc-tabs` avec `swipe`** (`boolean | { chain }`) : un seul jeu de `tabpanel`, tous créés d'emblée, `inert` hors de vue ; le trait suit le glissement ; `selectionChange` donne `{ id, source: 'tab' | 'swipe' }`. L'hôte remplit son conteneur (liste fixe, bande qui prend le reste). Sans `swipe`, comportement inchangé.
- **Limites** : le glissement tactile réel, le geste retour d'iOS et les diagonales ne sont prouvés que dans Chromium ; le repli de `scrollend` (Safari avant 26.2) est prouvé en simulant son absence.
- **Contrôle navigateur** : `node tools/qa/storybook-browser.mjs swipe` (après `npm run build-storybook`).
