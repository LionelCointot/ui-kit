# lc-message-thread

Fil de messages générique : bulles regroupées par auteur, séparateurs de jour, lignes système, pièces jointes en vignettes.

```html
<lc-message-thread [messages]="messages" />
```

- **Contrat** : `messages` (du plus ancien au plus récent) est la seule entrée obligatoire ; `showAvatars`, `pageSize` (30 par défaut, entier > 0) et `ariaLabel` sont facultatifs. Un message : `id` stable, `authorId`, `authorName`, `mine`, `sentAt` (ISO 8601) ; en option `text`, `attachments`, `kind: 'system'`, `cssClass`, `mention`.
- **Note interne** : une classe posée par `cssClass` redéfinit `--lc-message-thread-bubble-background`, `-bubble-color` et les jetons `-bubble-border-*` ; `mention` ajoute une marque sous l'en-tête.
- **Pièces jointes** : l'événement `attachmentOpen` (`{ message, attachment }`) laisse l'application décider ; `previewUrl` est filtrée (`isSafePreviewUrl`).
- **Liens sûrs** : seules les adresses `http(s)` deviennent des liens (`target="_blank"`, `rel="noopener noreferrer"`), le reste est du texte.
- **Défilement selon le conteneur** : le fil remplit son parent ; si le parent limite sa hauteur, il défile à l'intérieur (ouverture sur le dernier message) et la saisie projetée (`[lcThreadComposer]`) reste en bas, sinon la page défile.
- **Affichage progressif** : seuls les `pageSize` derniers messages sont rendus, les plus anciens se révèlent en remontant, sans saut ; un message d'`id` nouveau entre en ressort (fondu seul si le système réduit les animations).
