# Essai 2 — réorganisation de liste (`[lcFlip]`)

Branche `spike/motion-flip`, commit `cac1341` (non fusionnée). Mesures Chromium (Playwright 1.65, Storybook dev, Node 24.22.2). Harnais : `tools/qa/flip-spike.mjs`, story `QA/Motion/Flip spike`.

| Question | Réponse | Preuve |
|---|---|---|
| Instantané des positions avant la mise à jour du DOM | **NON dans un `effect`, OUI dans `ngOnChanges`** | L'`effect` d'une directive tourne après le gabarit qui contient le `@for` : il voit déjà le nouveau DOM (0 déplacement, sauts de 252/108/36 px). `ngOnChanges` voit l'ancien DOM (positions à ±0,5 px, 8/8 déplacés en inversion). Lecture « après » : `afterRenderEffect` |
| Entrée (`lcReveal`) et FLIP sur le même élément | **OUI avec le reveal v2 (keyframes `translate`/`scale`/`opacity`), NON avec le reveal actuel** | v2 + FLIP : 4,9 px de mouvement max par image (comme FLIP seul). Reveal actuel (transition sur `transform`) + FLIP : saut de 20,5 px (conflit B1 de la contre-expertise) |
| Remplacer `animateDiff` de data-table par `flip(container, mutate, {measure})` | **NON tel quel** | Le CA-22 (les voisines glissent après le fondu de sortie) demande deux temps séparés par une attente. data-table garde son `freeze` ; seuls la lecture par lot, le seuil 0,5 px, les tokens `--lc-list-move-*` et `slideList` sont communs |
| Mouvement réduit | **OUI** | 0 animation, état final dès la première image. La directive doit appeler `lcPrefersReducedMotion()` elle-même : la règle de `base.css` ne couvre pas les Web Animations |
| 200 éléments | **OUI** | Séquence 400 lectures puis 200 écritures, aucune lecture intercalée ; 0,2-2 ms par phase ; +1 calcul de mise en page par lot |
| Deuxième changement pendant un FLIP | **OUI** | 0 px de saut ; exige un instantané de la position visuelle et l'annulation des animations en cours avant la nouvelle lecture |

## API recommandée pour la spec

```ts
@Directive({ selector: '[lcFlip]' })
class LcFlipDirective implements OnChanges {
  readonly items = input.required<readonly unknown[]>({ alias: 'lcFlip' });
  ngOnChanges() { this.before ??= positions(host.children); }   // avant le @for : ancien DOM
  constructor() {
    afterRenderEffect(() => {
      this.items();
      // annule ses animations, lit toutes les positions, puis écrit toutes les animations
      // WAAPI { transform: [`translate(dx, dy)`, 'none'] }, durée et courbe : --lc-list-move-*
    });
  }
}
```

Suit les enfants directs du conteneur sauf `[data-leaving]` ; les éléments ajoutés ne sont pas animés par le FLIP (c'est `lcReveal`) ; seuil 0,5 px ; rien sous mouvement réduit ni sans `Element.animate`.

## Pièges à écrire dans la spec

1. Instantané dans `ngOnChanges`, jamais dans un `effect`.
2. La liste passée à `lcFlip` doit être immuable (nouvelle référence à chaque changement) et être celle que le `@for` parcourt.
3. `@for` avec un `track` stable : l'identité du nœud DOM fait le suivi.
4. Reveal en keyframes sur `translate`/`scale`/`opacity`, jamais en transition sur `transform`.
5. Tout lire puis tout écrire.
6. Non testé : survol (`transform`) pendant un FLIP, compatibilité réelle avec `animate.leave` (`[data-leaving]`), sens inverse du CA-22.
