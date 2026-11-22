# @lionelcointot/ui-angular/forms

Champs de formulaire (`lc-form-field`, saisies, sélecteurs, `lc-file-upload`, `lc-message-composer`…). Cette page ne détaille que
`lc-message-composer`, `fillMode` et `indicatorProgress` de `lc-segmented-control` ; les autres composants sont décrits dans `CATALOGUE.md` et dans la vitrine Storybook.

## `lc-segmented-control` : `fillMode` et `indicatorProgress`

`fillMode` : `outline` (défaut, segments bordés, le choisi est plein) ou `solid` (maquette « pastille » : piste creusée `surface-sunken`, pastille `surface-raised` + `shadow-1` qui glisse vers le segment choisi, au clic comme au clavier ; texte `on-surface-muted` puis `on-surface`). `flat` n'existe pas ici. Jetons de la variante : `--lc-segmented-control-track-bg|track-radius|track-padding|pill-bg|pill-shadow|pill-radius|pill-fg|muted-fg`, durée et courbe du glissement `--lc-segmented-control-indicator-duration|easing` (comme `lc-tabs`). Pas de glissement au premier affichage, à la remesure, avec `indicatorProgress` ni sous `prefers-reduced-motion` ; en `forced-colors`, le segment choisi est entouré. Une option avec icône garde son icône quand elle est choisie (dans les deux variantes) ; la coche ne sert qu'aux options sans icône.

### `indicatorProgress`

`[indicatorProgress]` (nombre de 0 à n - 1, ou `null` : rendu habituel) pose un fond unique qui suit cette position entre deux segments voisins, sans transition (`transform`) ; le segment choisi perd son propre fond. À lier à `progress()` d'un `lc-swipe-panels` (voir `navigation/src/swipe-panels/README.md`) pour que le fond suive le doigt ; `value` reste la source du choix. Avec `fillMode="solid"`, ce fond est la pastille ; sinon il reprend les jetons du segment.

## `lc-message-composer`

Zone de saisie de message en un seul rectangle : texte, trombone, actions libres, flèche d'envoi, vignettes de pièces jointes et
glisser-déposer. Contrôle de formulaire (`FormValueControl<string>`) : libellé, aide et erreurs viennent de `lc-form-field` ; hors champ,
`ariaLabel` est obligatoire.

```html
<lc-form-field label="Votre message">
  <lc-message-composer [(value)]="text" [attachments]="{ accept: 'image/*,.pdf' }" [items]="uploads()"
    (send)="post($event.text)" (sendBlocked)="onBlocked($event)"
    (filesAdded)="upload($event)" (rejected)="log($event)" (remove)="drop($event)" (retry)="upload([])" />
</lc-form-field>
```

### Contrat avec l'application
- **Le composant n'envoie rien et ne modifie jamais `value`.** `send` donne `{ text }` (texte rogné) : l'application envoie, puis vide le champ.
  Elle passe `sending` à vrai pendant l'attente : le texte devient en lecture seule et un second envoi est refusé.
- `sendBlocked` dit pourquoi un envoi n'est pas parti : `'empty'` (rien à envoyer), `'sending'` (envoi en cours ou déjà parti),
  `'uploading'` (une pièce jointe est encore en cours d'envoi). Une pièce jointe en erreur ne bloque pas. L'application peut s'en servir
  à la place d'un indicateur à elle.
- Pièces jointes : `attachments` vaut `true` (défauts), `false` (aucune) ou un objet `LcComposerAttachments` (`icon`, `accept`, `acceptLabel`, `maxFiles`, `showSize`) ; `items` reste à plat (ADR 0010). Le composant émet les `File` acceptés (`filesAdded`) ; l'application les envoie et tient `items`
  (`LcFileUploadItem` : `id`, `name`, `size`, `status`, `progress`, `previewUrl`…) à jour, et retire un item sur `remove`.
  Le composant ne crée ni ne révoque d'adresse d'objet.
- **Refus** : le composant affiche lui-même le message (nom et raison, un par raison) sous le rectangle et secoue le rectangle ;
  il émet aussi `rejected`. L'application n'a pas à répéter le message. Raisons : `type` (hors `accept` ; le message liste les types acceptés, déduits de `accept` : « .jpg, .png, .pdf », ou le texte de `acceptLabel`), `count` (au-delà de `maxFiles`, 10 par défaut ;
  `null` : sans limite).
- Apparence : une classe de l'application sur l'hôte redéfinit `--lc-message-composer-border-style|width|color` et `--lc-message-composer-background` (dimensions des vignettes : `-thumb-width`, `-thumb-preview-height`, `-remove-size`)
  (exemple : la note interne de la vitrine, bordure en pointillés).

### Fichiers : ce qui est accepté, ce qui est ignoré
- **`accept` n'est pas un contrôle de sécurité.** Le nom et le type déclarés viennent du client et se falsifient : l'application (le serveur)
  doit vérifier le contenu des fichiers. `accept` ne fait qu'éviter une erreur de choix.
- Dossiers, éléments qui ne sont pas des fichiers et fichiers de 0 octet sont ignorés, sans refus.
- **Dépôt** : un glisser contenant des fichiers sur le rectangle allume un calque « Déposez vos fichiers ici ». Un glisser sans fichier
  (texte, lien) n'est pas touché. Avec `disabled` ou `attachments` faux, rien n'est ajouté.
- **Fichier lâché hors du rectangle** : tant que le composant est affiché, le navigateur n'ouvre pas le fichier et rien n'est ajouté
  (le composant pose des écouteurs `dragover` et `drop` sur le document, retirés à sa destruction ; ils n'annulent que les glissers avec fichiers, et pas ceux qui visent un autre `input[type=file]` de la page).
- **Collage** : une image ou un fichier seul (capture d'écran) collé dans le champ suit le même filtrage et n'insère pas de texte ; un texte ou du HTML collé n'insère que du texte brut. **Collage mixte** (cellules Excel ou Word, qui portent aussi une image) : le texte prime, il est collé normalement et aucun fichier n'est joint.
- **Vignettes** : le nom est affiché en texte, nettoyé des caractères de contrôle et des marqueurs bidirectionnels, isolé (`<bdi>`) et coupé ;
  nom accessible et annonces limités à 80 caractères. `File.name` est émis tel quel.
- **`previewUrl`** n'est rendu que par `<img>`, et seulement s'il commence par `blob:` ou `data:image/`, ou s'il est de même origine
  que la page ; sinon (ou si l'image ne se charge pas), une icône. Aucune requête vers un tiers.
  Un aperçu `data:image/svg+xml` est inoffensif dans `<img>` (aucun script ne s'y exécute) ; ne réutilisez pas cette adresse ailleurs (`<object>`, `<iframe>`, ouverture dans un onglet).
- Sous une CSP stricte (`img-src 'self' blob: data:`, sans `unsafe-inline`), le composant n'écrit aucun attribut `style` en chaîne ;
  il n'utilise pas `innerHTML`. Aucun nom de fichier ni texte saisi n'est écrit dans la console.
- Hors glisser-déposer : sur iOS, il n'y a pas de glisser de fichiers, le trombone sert.
