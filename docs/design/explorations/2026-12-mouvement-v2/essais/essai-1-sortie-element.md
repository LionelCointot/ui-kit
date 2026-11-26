# Essai 1 — faire sortir un élément (`lcReveal` entrée + sortie)

Branche `spike/motion-sortie`, commit `1b49a69` (non fusionnée). Mesures Chrome 158 réel (Playwright), Storybook dev, Angular 22.2.5 zoneless ; écritures A, B, C compilées en AOT `strictTemplates`. Harnais : `tools/qa/motion-spike.mjs`, `tools/qa/motion-spike-replay.mjs`, stories « QA/Motion spike ».

| Question | Réponse | Preuve |
|---|---|---|
| La directive peut-elle déclarer la sortie elle-même ? | **OUI** | `host: { 'animate.leave': 'lc-leave' }` : l'élément retiré par `@if` ou `@for` joue son animation puis part (~430 ms pour 400 ms d'animation). Variantes `[animate.leave]` et rappel `(animate.leave)` (pour du WAAPI) fonctionnent aussi. La paire écrite par le développeur n'est pas nécessaire |
| Ajout dans un `@for` | **OUI** | Seul le nouvel élément s'anime, en fin ou en tête de liste ; le changement d'index ne rejoue rien |
| Réordonnancement dans un `@for` | **NON avec une classe fixe ; OUI avec le remède F** | Angular déplace les nœuds par `insertBefore` et Chrome relance leur animation CSS (6 rejeux sur 7 en inversion). `animate.enter` ne corrige pas. Remède prouvé : la classe d'entrée est liée à un signal et retirée à `animationend` → zéro rejeu, ajout et sortie toujours animés |
| Mouvement réduit | **OUI** | Retrait en 2 à 65 ms, rien ne reste dans le DOM, y compris avec le rappel WAAPI |
| Compatibilité avec `lc-data-table` | **OUI** | Passage de 14 à 8 lignes : sorties de data-table intactes, aucune ligne bloquée, à 1100 et 360 px |

## API recommandée pour la spec

```ts
@Directive({ selector: '[lcReveal]', host: {
  '[class.lc-reveal]': 'playing()',
  '(animationend)': 'end($event)',
  'animate.leave': 'lc-leave' } })
export class LcReveal {
  protected readonly playing = signal(true);
  protected end(e: AnimationEvent) {
    if (e.target === e.currentTarget && e.animationName === 'lc-reveal-in') this.playing.set(false);
  }
}
```

CSS globales : `.lc-reveal` (keyframes + `backwards`, `translate`/`opacity`) et `.lc-leave` (keyframes + `forwards`, placée après dans la feuille) ; coupure `@media (prefers-reduced-motion: reduce) { .lc-reveal, .lc-leave { animation: none } }` en plus de `base.css`. Pour un ressort ou du WAAPI : rappel `(animate.leave)` avec `lcPrefersReducedMotion()` puis `animationComplete()`.

Confirme le point M4 de la contre-expertise : pas de mémoire « déjà vu » commune, une nouvelle instance = une arrivée.

## Pièges à écrire dans la spec

1. Retirer le bloc `[lcReveal] { transition… }` / `@starting-style` de `ui-angular.css` (l. 1048-1062) dans le même changement, sinon double animation.
2. `animate.leave` n'agit que si la classe porte une vraie animation CSS.
3. Si `animationend` n'arrive jamais (`animation: none`, élément caché), la classe reste : rejeu possible au déplacement dans ce seul cas.
4. `.lc-leave` après `.lc-reveal` dans la feuille.
5. `[attr.lcReveal]` (comme dans data-table) n'active pas la directive.
6. Non couvert : `lcReveal` à keyframes sur les lignes internes de data-table combiné au FLIP (voir l'essai 2 pour le conflit `transform`).
