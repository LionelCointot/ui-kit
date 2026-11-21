# Spec : filtre de période de `lc-data-table` avec le champ de date du kit

- **Statut** : Brouillon (2026-11-21), en relecture
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-21
- **ADR liés** : [0008 Sélecteur de date](../adr/0008-selecteur-de-date-kit-ou-systeme.md) · [0009 Cible navigateurs](../adr/0009-cible-navigateurs-et-primitives-natives.md)
- **Specs liées** : [`2026-11-tableau-filtrable.md`](2026-11-tableau-filtrable.md) (CA-8 remplacé par celle-ci) · [`2026-11-selecteur-de-date.md`](2026-11-selecteur-de-date.md) · [`2026-11-mouvement.md`](2026-11-mouvement.md) (livrée après celle-ci : mêmes fichiers)
- **Consommateurs** : copro-ticket (file des demandes, filtre par date) ; toute application qui déclare une colonne `filter: { type: 'dateRange' }`

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « oui par contre j'ai remarque pour le tableau que le filtre par date n'utilise pas le composant de date, il faudrait également le corriger »
  - Sur les recommandations 26 à 31 : « vas y »
- **Besoin en trois phrases** : Le filtre de période de `lc-data-table` pose deux `<input type="date">` natifs (`column-filter.component.ts:110-114`) : sur ordinateur, le calendrier du navigateur ignore le thème, ce que la spec du sélecteur de date a corrigé partout ailleurs. L'utilisateur veut que ce filtre utilise le champ de date du kit. Le reste du filtre (application à « Appliquer », pastille, requête) ne change pas.
- **Décisions prises pendant le cadrage** (2026-11-21, utilisateur) :
  26. Spec séparée, livrée avant celle du mouvement (mêmes fichiers que sa tâche T6).
  27. Les deux champs « Du » et « Au » sont remplacés par un seul `lc-date-range-input`.
  28. Les raccourcis du filtre passent dans les `presets` du composant. **Remis en question après vérification, question Q1** : les raccourcis du filtre sont glissants (`{ preset: 7 }` dans la requête, recalculé chaque jour, envoyé tel quel au serveur) alors que les `presets` de `lc-date-range-input` produisent des dates fixes et n'apparaissent que dans le calendrier du kit (pas sur téléphone).
  29. Nouvelle exception d'import `data` → `forms`, inscrite dans `CLAUDE.md`.
  30. Le calendrier ouvert depuis le menu de filtre ne ferme pas le menu ; sur téléphone, sélecteur du système depuis le panneau plein écran.
  31. Inchangés : rien n'est appliqué avant « Appliquer » / « Afficher N … », texte de la pastille, contrat `LcDateRange` et `presets?: readonly number[]` de la colonne.
- **Taille** : Fonctionnalité (petite)
- **Angles ouverts** :
  - [x] Architecture : nouvelle dépendance entre points d'entrée (`data` → `forms`).
  - [x] Écran : le corps du filtre de période change (ordinateur et téléphone).
  - [ ] Sécurité et données : fermé. La seule entrée est une date choisie ou tapée, analysée par le composant existant ; rien n'est lu, envoyé ni stocké en plus.

## 1. Contexte et problème
`lc-data-table` a été livré avant `lc-date-range-input`. Son filtre `dateRange` montre des boutons radio (raccourcis « 7 derniers jours », « 30 derniers jours », « Période choisie ») puis deux champs natifs « Du » et « Au », avec un message si la fin précède le début. Depuis la spec du sélecteur de date, le kit a un champ de période thémé (calendrier du kit sur pointeur fin, sélecteur du système sinon, ADR 0008) que ce filtre n'utilise pas.

## 2. Objectifs
- O1 : la saisie de la période dans le filtre passe par `lc-date-range-input` (thème, calendrier du kit sur ordinateur, sélecteur du système sur téléphone).
- O2 : le filtre garde son contrat et son comportement (raccourcis glissants, application différée, pastille, requête).

## 3. Hors périmètre (non-objectifs)
- Changer `LcDateRange`, `LcFilterValue`, `presets?: readonly number[]` ou la requête envoyée aux sources.
- Animation du calendrier (spec du mouvement, T3).
- Changer `lc-date-range-input` lui-même, sauf si une relecture prouve un manque bloquant (alors question à l'utilisateur).

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : la personne qui filtre une liste par date (copro-ticket : gestionnaire de demandes), sans connaissance particulière ; inchangé par rapport à la spec du tableau filtrable.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Gestionnaire (ordinateur) | Ouvre le filtre de date, choisit « Période choisie », ouvre le calendrier, choisit deux dates, « Appliquer » | Calendrier du kit au thème ; menu resté ouvert ; tableau filtré à « Appliquer » |
| Gestionnaire (ordinateur) | Choisit « 7 derniers jours » | Requête `{ preset: 7 }`, période affichée dans le champ |
| Gestionnaire (téléphone) | Panneau « Filtres », section de la date, choisit la période | Sélecteur du système ; rien n'est appliqué avant « Afficher N … » |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- `column-filter.component.ts` importe `LcDateRangeInputComponent` depuis `@lionelcointot/ui-angular/forms`. Nouvelle exception d'import `data` → `forms` dans `CLAUDE.md` (« À ne pas faire ») ; `forms` n'importe pas `data` : pas de cycle.
- Adaptateur local (fonctions pures dans `data-table-model.ts`) : `LcDateRange` ↔ `LcDateInterval` (`{ from?, to? }` ↔ `{ from: string | null, to: string | null }`). Raccourci actif : le champ affiche `dateRangeBounds(range)` ; modifier une date dans le champ repasse sur « Période choisie » (comportement actuel).
- Proposé selon Q1 (option A) : les boutons radio des raccourcis restent, au-dessus du champ ; seul le couple de champs natifs est remplacé. Les `presets` de `lc-date-range-input` ne sont pas utilisés.
- Message d'ordre : si `lc-date-range-input` remet lui-même les dates dans l'ordre ou refuse une fin avant le début, le message `dateOrderError` et `isDateRangeInverted` deviennent inutiles côté filtre (à confirmer en relecture ; sinon conservés, reliés au champ par `aria-describedby`).
- Menu de filtre (CDK Overlay non modal, `cdkTrapFocus`) : le calendrier est une seconde superposition ; un clic dedans ne doit pas fermer le menu (modèle : story `date-input-in-overlay`). Panneau du téléphone (`<dialog>` modal) : le champ ouvre le sélecteur du système (ADR 0008).

### 5.2 Modèle de données
Aucun changement : `LcDateRange { preset?, from?, to? }`, `presets?: readonly number[]` (défaut `[7, 30]`).

### 5.3 API / interfaces
Aucun changement public. Libellés : `from` et `to` (« Du », « Au ») ne servent plus au filtre ; ils restent dans `LC_LABELS.dataTable` si une autre partie les utilise (pastille : `since`, `until`), sinon retirés (phase de développement, CLAUDE.md). Nouveau libellé éventuel du champ : « Période » (`LC_LABELS.dataTable.period`), à confirmer par le brief.

### 5.4 Interface utilisateur
À compléter par `ui-ux-designer` (brief) : ordre raccourcis puis champ, libellé du champ, comportement du champ quand un raccourci est actif (rempli, modifiable), message d'erreur, rendu à 360 et 1 280 px. Test `novice-user` sur captures après le code.

## 6. Cas limites et gestion des erreurs
- Période ouverte (une seule date) : autorisée aujourd'hui (« Une date vide ne borne pas la période ») ; `lc-date-range-input` doit l'accepter, sinon question à l'utilisateur.
- Date tapée incomplète ou impossible : comportement de `lc-date-range-input` (aucun message, spec du sélecteur de date).
- Raccourci actif puis date modifiée : bascule sur « Période choisie » avec les dates saisies.
- Calendrier ouvert puis Échap : ferme le calendrier seul, pas le menu ; second Échap ferme le menu sans appliquer.
- Fermeture du menu pendant que le calendrier est ouvert : les deux se ferment, focus sur l'entonnoir.
- `min` / `max` : non utilisés (aucun besoin exprimé).

## 7. Sécurité, performance, observabilité
- Sécurité et données : angle fermé.
- Performance : `forms` est déjà chargé par les applications qui utilisent le tableau avec des champs ; le point d'entrée `data` gagne une dépendance de compilation, pas de code dupliqué.
- Logs : aucun.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Un `lc-date-range-input` | un champ, ordre géré, choix de l'utilisateur pour les périodes | adaptateur de type | **Oui** (décision 27) |
| Deux `lc-date-input` « Du » / « Au » | proche de l'actuel | deux calendriers, ordre à contrôler à la main | Non |
| Raccourcis dans les `presets` du composant | un seul système visible | dates fixes (perte du glissant dans la requête), absents sur téléphone | Non proposé (Q1) |
| Copier le calendrier dans `data` | pas de nouvelle dépendance | duplication | Non |

## 9. Plan de test
- Unitaires (`senior-developer`) : adaptateur `LcDateRange` ↔ `LcDateInterval` (vide, ouverte, complète, raccourci) ; bascule sur « Période choisie » à la saisie.
- Acceptation (`qa-engineer`) : stories du tableau ; menu de filtre avec calendrier ouvert (clic, Échap) en Chromium (`tools/qa/storybook-browser.mjs`) ; contrôle axe.
- Architecture : aucun import d'un secondaire vers un autre hors exceptions de `CLAUDE.md` (dont `data` → `forms`).
- Non-régression : tests existants de `lc-data-table` sans modification, sauf ceux du CA-8 remplacé.

## 10. Critères d'acceptation
- [ ] CA-P1 : Le filtre `dateRange` ne contient plus aucun `input[type="date"]` natif sur ordinateur ; il contient un `lc-date-range-input`.
- [ ] CA-P2 : Choisir deux dates puis « Appliquer » émet `queryChange` avec `{ from, to }` ISO ; une seule date donne une période ouverte.
- [ ] CA-P3 : Choisir un raccourci émet `{ preset: N }` (glissant, inchangé) et le champ affiche la période correspondante ; modifier une date ensuite donne `{ from, to }` et sélectionne « Période choisie ».
- [ ] CA-P4 : Rien n'est émis avant « Appliquer » (ordinateur) ou « Afficher N … » (téléphone).
- [ ] CA-P5 : Ordinateur : ouvrir le calendrier depuis le menu de filtre, cliquer une date : le menu reste ouvert ; Échap ferme le calendrier seul, un second Échap ferme le menu sans appliquer, focus sur l'entonnoir.
- [ ] CA-P6 : Fin avant début impossible à appliquer (remise en ordre par le composant ou message relié au champ par `aria-describedby`, `aria-invalid`), selon 5.1.
- [ ] CA-P7 : `CLAUDE.md` liste l'exception `data` → `forms` ; aucun autre import nouveau entre points d'entrée secondaires.
- [ ] CA-P8 : Tests existants de `lc-data-table` verts sans modification, sauf ceux du CA-8 de `2026-11-tableau-filtrable.md`, remplacés ; contrôle axe des stories du tableau (clair et sombre) sans erreur.
- [ ] CA-P9 (manuel) : test `novice-user` sur captures 360 et 1 280 px du filtre de date : COMPRIS.

## 11. Découpage en tâches
- [ ] P1 : adaptateur de types, remplacement des champs, exception d'import dans `CLAUDE.md`, libellés (S, CA-P1 à CA-P4, CA-P6, CA-P7).
- [ ] P2 : calendrier dans le menu de filtre (clic, Échap, focus) et panneau du téléphone (M, CA-P5).
- [ ] P3 : stories, catalogue, axe (S, CA-P8, CA-P9).

## 12. Risques et questions ouvertes
- **Q1 (utilisateur)** : raccourcis. A, recommandé : on garde les boutons radio glissants au-dessus du champ (contrat et comportement téléphone inchangés). B : décision 28 telle quelle, raccourcis dans le calendrier, à dates fixes, absents sur téléphone, avec changement de la requête.
- Périodes ouvertes et remise en ordre : à confirmer dans `lc-date-range-input` (relecture).
- Superposition dans une superposition (menu puis calendrier) : clic extérieur et Échap à prouver en navigateur réel.

## 13. Relectures et écarts
