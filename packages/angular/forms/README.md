# @lionelcointot/ui-angular/forms

Champs de formulaire (`lc-form-field`, saisies, sélecteurs, `lc-file-upload`, `lc-message-composer`…). Cette page ne détaille que
`lc-message-composer` ; les autres composants sont décrits dans `CATALOGUE.md` et dans la vitrine Storybook.

## `lc-message-composer`

Zone de saisie de message en un seul rectangle : texte, trombone, actions libres, flèche d'envoi, vignettes de pièces jointes et
glisser-déposer. Contrôle de formulaire (`FormValueControl<string>`) : libellé, aide et erreurs viennent de `lc-form-field` ; hors champ,
`ariaLabel` est obligatoire.

```html
<lc-form-field label="Votre message">
  <lc-message-composer [(value)]="text" accept="image/*,.pdf" [items]="uploads()"
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
- Pièces jointes : le composant émet les `File` acceptés (`filesAdded`) ; l'application les envoie et tient `items`
  (`LcFileUploadItem` : `id`, `name`, `size`, `status`, `progress`, `previewUrl`…) à jour, et retire un item sur `remove`.
  Le composant ne crée ni ne révoque d'adresse d'objet.
- **Refus** : le composant affiche lui-même le message (nom et raison, un par raison) sous le rectangle et secoue le rectangle ;
  il émet aussi `rejected`. L'application n'a pas à répéter le message. Raisons : `type` (hors `accept`), `count` (au-delà de `maxFiles`, 10 par défaut ;
  `null` : sans limite).
- Apparence : une classe de l'application sur l'hôte redéfinit `--lc-message-composer-border-style|width|color` et `--lc-message-composer-background`
  (exemple : la note interne de la vitrine, bordure en pointillés).

### Fichiers : ce qui est accepté, ce qui est ignoré
- **`accept` n'est pas un contrôle de sécurité.** Le nom et le type déclarés viennent du client et se falsifient : l'application (le serveur)
  doit vérifier le contenu des fichiers. `accept` ne fait qu'éviter une erreur de choix.
- Dossiers, éléments qui ne sont pas des fichiers et fichiers de 0 octet sont ignorés, sans refus.
- **Dépôt** : un glisser contenant des fichiers sur le rectangle allume un calque « Déposez vos fichiers ici ». Un glisser sans fichier
  (texte, lien) n'est pas touché. Avec `disabled` ou `attachments` faux, rien n'est ajouté.
- **Fichier lâché hors du rectangle** : tant que le composant est affiché, le navigateur n'ouvre pas le fichier et rien n'est ajouté
  (le composant pose des écouteurs `dragover` et `drop` sur le document, retirés à sa destruction ; ils n'annulent que les glissers avec fichiers).
- **Collage** : un fichier collé dans le champ suit le même filtrage et n'insère pas de texte ; un texte ou du HTML collé n'insère que du texte brut.
- **Vignettes** : le nom est affiché en texte, nettoyé des caractères de contrôle et des marqueurs bidirectionnels, isolé (`<bdi>`) et coupé ;
  nom accessible et annonces limités à 80 caractères. `File.name` est émis tel quel.
- **`previewUrl`** n'est rendu que par `<img>`, et seulement s'il commence par `blob:` ou `data:image/`, ou s'il est de même origine
  que la page ; sinon (ou si l'image ne se charge pas), une icône. Aucune requête vers un tiers.
- Sous une CSP stricte (`img-src 'self' blob: data:`, sans `unsafe-inline`), le composant n'écrit aucun attribut `style` en chaîne ;
  il n'utilise pas `innerHTML`. Aucun nom de fichier ni texte saisi n'est écrit dans la console.
- Hors glisser-déposer : sur iOS, il n'y a pas de glisser de fichiers, le trombone sert.
