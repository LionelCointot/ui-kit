# ADR-0010 : Options groupées par fonction (`LcXxxSettings`)

- **Statut** : Acceptée (2026-11-22)
- **Date** : 2026-11-22

## Contexte
- Plusieurs composants alignent à plat une dizaine d'entrées qui configurent une même fonction (`lc-combobox` : `filterKeys`, `minLength`, `debounceMs`, `maxResults`, `openOnFocus` ; `lc-message-composer` : `attachmentsEnabled`, `accept`, `maxFiles`…). L'API se lit mal, grossit à chaque option, et une entrée peut heurter un nom imposé ailleurs (`minLength` du combobox et `minLength` des contrôles Signal Forms).
- Sources comparées (passe de mise au propre, 2026-11-22) : Kendo for Angular (`pageable`, `selectable` : `boolean | settings`) ; AG Grid (`rowSelection` en objet depuis la v32.2, les anciennes entrées à plat dépréciées) ; Angular Material (`MAT_*_DEFAULT_OPTIONS`, objets de défauts injectables).
- Décision de l'utilisateur, 2026-11-22 : « Fait toutes les remarques relevées ».

## Options considérées
1. **Tout à plat** (état actuel) : simple à lier ; mais API qui enfle, collisions de noms, familles qu'on ne peut ni activer ni couper d'un seul réglage.
2. **Un objet par fonction** (`LcXxxSettings`), forme `boolean | settings` quand la famille s'active ou se coupe : lisible, extensible sans nouvelle entrée ; l'objet doit être stable (constante ou `computed`) pour ne pas relancer d'effets.
3. **Jeton d'injection de défauts seulement** (style Material) : bon pour les défauts d'une application, pas pour la configuration d'une instance. Reste admis en complément (`LC_DEFAULTS`).

## Décision
Option 2.
- On regroupe en un objet `LcXxxSettings` la configuration d'**une même fonction à partir de 3 entrées**. Tous les champs sont facultatifs et en lecture seule ; l'entrée porte le nom de la fonction (`searchSettings`, `attachments`).
- Forme `boolean | LcXxxSettings` quand la famille s'active ou se coupe : `true` = défauts, `false` = coupée, objet = activée et réglée.
- Les défauts se fusionnent dans un `computed` du composant, jamais dans l'objet reçu ; un défaut qui dépend d'un mode (local ou asynchrone) se résout dans ce `computed`.
- **Restent à plat** : entrées imposées par Signal Forms (`FormUiControl` : `disabled`, `readonly`, `required`, `invalid`, `touched`, `errors`…) ; API commune (`themeColor`, `fillMode`, `size`, `rounded`) ; identifiants et accessibilité (`inputId`, `ariaLabel`…) ; état (`model()`) ; données (`options`, `items`, `search`) ; `loading` / `stale` ; libellés (`LC_LABELS`).
- Phase de développement : les anciennes entrées sont supprimées sans alias, les consommateurs sont corrigés dans la même passe.

## Conséquences
- Positives : API des composants plus courte, collision `minLength` supprimée (`minChars`), une option nouvelle n'ajoute pas d'entrée.
- Négatives / dette : un consommateur ne doit pas fabriquer l'objet dans une méthode ou un accesseur appelés par le gabarit (nouvelle référence à chaque lecture) ; un littéral de gabarit (`[searchSettings]="{ debounceMs: debounce() }"`) est mémoïsé par Angular et ne change de référence que si une de ses valeurs change ; une famille `boolean | settings` se coupe seulement par la liaison `[x]="false"` (l'attribut statique `x="false"` est une chaîne, donc un objet absent : famille activée) ; Storybook ne pilote pas un objet par contrôle, d'où des Playground à arguments à plat rebâtis en objet dans `render`.
- Applications : `lc-combobox` (`searchSettings`), `lc-message-composer` (`attachments`). Les autres composants se convertissent quand on les touche, pas en bloc.
