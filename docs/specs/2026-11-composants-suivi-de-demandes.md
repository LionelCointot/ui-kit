# Spec : composants et extensions pour un suivi de demandes (D1 à D6)

- **Statut** : Validée (demande du projet consommateur `copro-ticket`, dont la spec `2026-11-premiere-tranche.md` et les maquettes ont été validées par l'utilisateur le 2026-11-15)
- **Date** : 2026-11-15
- **Source** : maquettes `copro-ticket/docs/design/explorations/2026-11-direction-a-amelioree/` (page `index.html`, section des besoins du ui-kit) ; tâche T0 de la première tranche de copro-ticket
- **Liés** : `2026-11-catalogue-composants.md`, `2026-11-composants-dashboard.md`, `DESIGN.md` (« Actions et icônes »)

Tout est **générique** : aucun vocabulaire métier dans les API, les libellés, les tokens ni les stories. Le consommateur identifié de chaque élément est copro-ticket.

## 1. Contexte et problème
Les écrans de suivi de demandes de copro-ticket ont besoin d'éléments que le kit n'a pas : des icônes, un fil d'historique, un message d'échange, un tri de colonne dans `lc-table`, un bouton à état enfoncé, et une info-bulle qui reste lisible près d'un bord d'écran. Sans eux, le projet consommateur écrirait des composants génériques chez lui, ce que sa règle interdit.

## 2. Objectifs
| Id | Élément | Point d'entrée | Besoin |
|---|---|---|---|
| D1 | Icônes | principal | `bell`, `bell-off`, `inbox`, `message-square`, `send`, `history`, `building-2`, `layout-dashboard`, `arrow-right-left`, `hourglass`, `timer`, `mail`, `image`, `image-plus`, `circle-help`, `sliders-horizontal`, `list`, `list-checks`, `file-text`, `wrench` : même source et même style que le registre actuel |
| D2 | Fil d'historique | `data` | Liste ordonnée verticale d'événements : icône, titre, contenu libre (par exemple une valeur avant et après), date ; trait de liaison entre les éléments ; deux densités |
| D3 | Message | `feedback` | Bloc d'échange : auteur, date, contenu projeté, emplacement pour une mention ; trois variantes : reçu, envoyé par la personne connectée, note à diffusion restreinte (distinguée par la forme et une icône, pas seulement par la couleur) |
| D4 | Tri de colonne dans `lc-table` | `data` | Colonne déclarée triable ; en-tête activable au clavier et à la souris ; `aria-sort` ; modèle de tri à double liaison, cohérent avec celui de `lc-tree-table` ; cycle sans tri, croissant, décroissant |
| D5 | Info-bulle près d'un bord | `overlay` | `lcTooltip` choisit une position de repli quand la position demandée sortirait de la fenêtre, et garde un écart avec son élément pour les positions de côté comme pour le dessus et le dessous |
| D6 | Bouton à état enfoncé | principal | `lcButton` expose un état enfoncé, rendu par `aria-pressed` et par un style visible, utilisable avec `iconOnly` |

## 3. Hors périmètre (non-objectifs)
- Le téléversement de fichiers, la liste paramétrable, les graphiques en barre empilée et en puce : lots suivants.
- La bascule entre un thème produit clair et un thème produit sombre.
- Tout contenu ou libellé propre à copro-ticket.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : le développeur d'un projet consommateur, qui compose ses écrans avec le kit.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Développeur | Afficher l'historique d'un objet | Une liste ordonnée lisible au lecteur d'écran, sans CSS à écrire |
| Développeur | Afficher un fil d'échanges | Messages distincts selon l'auteur et la diffusion |
| Développeur | Rendre une colonne triable | Une option de colonne et une liaison de modèle |
| Développeur | Poser un bouton icône à bascule dans un en-tête | État annoncé, info-bulle entière même au bord de l'écran |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
Conventions du kit (`CLAUDE.md`) : composants autonomes, signaux, OnPush, tokens `--lc-<composant>-*` avec repli sur `--lc-sys-*`, libellés par `LC_LABELS`, aucun import d'un point d'entrée secondaire depuis un autre hors exceptions déjà admises. Le nom exact des deux nouveaux composants et de leurs entrées est fixé à l'implémentation, en cohérence avec le catalogue ; un composant `lc-timeline-bar` existe déjà : le fil d'historique porte un nom qui ne prête pas à confusion.

### 5.2 Modèle de données
N/A.

### 5.3 API / interfaces
Fixées à l'implémentation et documentées dans cette page, section « Livré », sur le modèle de `2026-11-composants-dashboard.md`. Contraintes : entrées par `input()`, sorties par `output()` ou `model()` ; aucune entrée booléenne qui change le comportement en profondeur ; contenu libre par projection.

### 5.4 Interface utilisateur
Référence visuelle : les maquettes de copro-ticket citées en source (fil « Ce qui s'est passé » et « Historique », bloc « Échanges », en-têtes triables de « Ma file », cloche près du titre d'une demande). Le rendu suit `DESIGN.md` du kit : tokens seulement, deux thèmes, cibles de 44 px, focus visible. Chaque élément a sa story, avec ses états et ses deux thèmes.

## 6. Cas limites et gestion des erreurs
- Fil d'historique vide ou à un seul élément : pas de trait de liaison orphelin.
- Message très long ou sans auteur : pas de débordement ; l'auteur absent n'affiche pas de bloc vide.
- Colonne triable sans donnée : en-tête toujours activable, `aria-sort` cohérent.
- Info-bulle sans place d'aucun côté : elle reste dans la fenêtre.
- Usage incorrect non bloquant : avertissement console en développement seulement.

## 7. Sécurité, performance, observabilité
- Sécurité : aucun `innerHTML` hors SVG d'icônes enregistrés.
- Performance : aucune dépendance ajoutée.
- Logs / métriques : N/A.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Écrire ces composants dans copro-ticket | Plus rapide | Contraire à la règle du consommateur ; non réutilisable | Non |
| Réutiliser `lc-log-view` pour l'historique | Rien à écrire | Conçu pour des journaux techniques, pas pour un fil lisible par un particulier | Non |
| Un composant de bouton à bascule distinct | API dédiée | Doublon de `lcButton` pour un seul attribut | Non |

## 9. Plan de test
- Unitaires et de composant (Vitest) : chaque élément, ses variantes, ses rôles et attributs ARIA, le clavier, les cas limites de la section 6.
- Storybook : une story par élément et par état, contrôle d'accessibilité.
- Visuel : captures des stories dans les deux thèmes.

## 10. Critères d'acceptation
- [ ] CA-D1 : les vingt icônes sont dans le registre par défaut, s'affichent par `lc-icon`, et viennent de la même source que les icônes existantes.
- [ ] CA-D2 : le fil d'historique est une liste ordonnée ; chaque élément porte icône, titre, contenu et date ; le dernier n'a pas de trait de liaison ; deux densités ; aucune valeur en dur.
- [ ] CA-D3 : le message rend ses trois variantes, distinguées autrement que par la seule couleur ; un contenu long ne déborde pas ; l'auteur et la date sont lisibles par un lecteur d'écran.
- [ ] CA-D4 : une colonne triable de `lc-table` se trie au clavier et à la souris, suit le cycle sans tri, croissant, décroissant, expose `aria-sort`, et son modèle se lie dans les deux sens ; une table sans colonne triable se comporte comme avant.
- [ ] CA-D5 : une info-bulle demandée au-dessus d'un élément collé en haut de la fenêtre s'affiche entière ailleurs ; les positions de côté ont un écart visible avec l'élément ; les positions existantes ne changent pas quand la place suffit.
- [ ] CA-D6 : `lcButton` à l'état enfoncé expose `aria-pressed="true"` et un style distinct ; sans cet état, aucun `aria-pressed` n'est posé ; fonctionne avec `iconOnly`.
- [ ] CA-D7 : chaque élément a sa story dans les deux thèmes ; `npx ng test ui-angular --watch=false` et `npm run build` réussissent ; aucun vocabulaire métier ; libellés par `LC_LABELS`.
- [ ] CA-D8 : après `npm run build`, le projet consommateur installe le paquet reconstruit (`npm run deps:refresh`) et son build passe.

## 11. Découpage en tâches
- [ ] U1 : icônes (D1), bouton à état enfoncé (D6), info-bulle près d'un bord (D5) (M, couvre CA-D1, CA-D5, CA-D6)
- [ ] U2 : tri de colonne dans `lc-table` (D4) (M, couvre CA-D4)
- [ ] U3 : fil d'historique (D2) et message (D3) (M, couvre CA-D2, CA-D3)
- [ ] U4 : stories restantes, build, vérification chez le consommateur (S, couvre CA-D7, CA-D8)

## 12. Risques et questions ouvertes
- Changer la stratégie de position de `lcTooltip` touche tous les consommateurs : les positions actuelles doivent rester identiques quand la place suffit.
- Le tri de `lc-table` doit reprendre le type de tri de `lc-tree-table` plutôt qu'en créer un second.

## Livré

| Id | Élément | Point d'entrée | API |
|---|---|---|---|
| D1 | icônes | principal | `bell`, `bell-off`, `inbox`, `message-square`, `send`, `history`, `building-2`, `layout-dashboard`, `arrow-right-left`, `hourglass`, `timer`, `mail`, `image`, `image-plus`, `circle-help`, `sliders-horizontal`, `list`, `list-checks`, `file-text`, `wrench` ; mêmes source et version que les existantes (Lucide, `lucide-static` 1.70.0), générées par `tools/generate-icons.mjs` |
| D5 | `lcTooltip` | `overlay` | `lcTooltipPosition` inchangé (`above`, `below`, `start`, `end`) ; si la position demandée sort de la fenêtre, repli dans l'ordre : opposé, puis les deux autres (`above` : `below`, `end`, `start` ; `below` : `above`, `end`, `start` ; `start` : `end`, `above`, `below` ; `end` : `start`, `above`, `below`) ; sans place nulle part, l'info-bulle est poussée dans la fenêtre ; écart de 4 px avec l'élément dans les quatre directions (les côtés avaient 0) |
| D4 | `lc-table` | `data` | Constat : le tri client existait déjà (`sortable` sur `LcTableColumn`, en-tête-bouton, `aria-sort`, `[(sort)]`). Modèle : `LcSort` (`{ columnId, direction: 'asc' \| 'desc' }`, `table-model.ts`), le même que `lc-tree-table` (aucun second type, aucun déplacement). Cycle (`nextSort`) : sans tri, `asc`, `desc`, sans tri (`null`). Ajouté : `sortMode: 'client' \| 'external'` (défaut `client`). `client` : `lc-table` trie lui-même `data` (tri stable, valeurs absentes en dernier, à l'intérieur de chaque groupe). `external` : `lc-table` n'émet que `sort` (tri fait par le serveur) et affiche `data` dans l'ordre reçu ; `aria-sort` et l'indicateur suivent quand même `sort`. Indicateur : `arrow-up-down` sans tri, `chevron-up` croissant, `chevron-down` décroissant (l'état « sans tri » ne se distingue plus du décroissant par la seule opacité). `aria-sort` posé seulement sur la colonne triée (absent sinon) ; l'en-tête est un `<button>` natif (Entrée et Espace). Une table sans colonne `sortable` ne change pas. `lc-tree-table` garde son indicateur d'origine et n'a pas `sortMode` (hors périmètre). |
| D6 | `lcButton` | principal | `pressed: boolean \| undefined` (défaut `undefined`) ; `true` ou `false` pose `aria-pressed`, `true` ajoute la classe `lc-button--pressed` (anneau intérieur et fond teinté, tokens `--lc-sys-*` de la couleur de texte, état et bordure) ; `undefined` : aucun `aria-pressed` (un `[attr.aria-pressed]` du consommateur reste intact) ; compatible `iconOnly` |

Stories : `Actions/Icône` (trois galeries), `Actions/Bouton` > `Enfonce`, `Superpositions/Info-bulle` (`Positions`, `PresDesBords`), `Données/Tableau` > `Tri`, `TriExterne`.

Correctifs sur U1 (constats de QA) :
- D5, écart : l'écart de 4 px n'est plus un `offsetX`/`offsetY` du CDK (nombre de px, appliqué en `translate` après la poussée, donc une info-bulle poussée dépassait la fenêtre de 4 px). C'est un remplissage transparent du panneau (`--lc-sys-space-1`, dans l'hôte `lc-tooltip-panel`), compté dans sa taille : choix de la position et poussée en tiennent compte, l'info-bulle reste entière dans la fenêtre et plus aucune taille n'est en dur. Le rendu visible de l'info-bulle (`.lc-tooltip__box`) est inchangé.
- D4, zone de frappe : l'en-tête triable et le bouton de repli de groupe de `lc-table` ont une zone de 44 px (pseudo-élément, `--lc-button-hit-size`, comme `lcButton`) ; en densité `compact`, les lignes étant plus basses, la zone s'arrête à la boîte du bouton, compromis de cette densité.
- D6, CSS : les deux sélecteurs `:host(.lc-button--pressed…)` sont conservés (non redondants : le premier gagne sur `:hover`/`:active`, le second couvre l'état désactivé que le premier exclut) ; le commentaire le dit.
