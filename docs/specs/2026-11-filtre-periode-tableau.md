# Spec : filtre de période de `lc-data-table` avec le champ de date du kit

- **Statut** : Validée le 2026-11-21 par l'utilisateur (« Oui pour tout », puis « B » sur les raccourcis)
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-21
- **ADR liés** : [0008 Sélecteur de date](../adr/0008-selecteur-de-date-kit-ou-systeme.md) · [0009 Cible navigateurs](../adr/0009-cible-navigateurs-et-primitives-natives.md)
- **Specs liées** : [`2026-11-tableau-filtrable.md`](2026-11-tableau-filtrable.md) (CA-8 remplacé par celle-ci) · [`2026-11-selecteur-de-date.md`](2026-11-selecteur-de-date.md) · [`2026-11-mouvement.md`](2026-11-mouvement.md) (livrée après celle-ci : mêmes fichiers)
- **Consommateurs** : copro-ticket (file des demandes, filtre par date) ; toute application qui déclare une colonne `filter: { type: 'dateRange' }`

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « oui par contre j'ai remarque pour le tableau que le filtre par date n'utilise pas le composant de date, il faudrait également le corriger »
  - Sur les recommandations 26 à 31 : « vas y »
  - Sur Q1 à Q4 et la validation : « Oui pour tout mais le raccourcis, du composant dateterange, il a deja les 7 derniers jours etc... non ? Donc ca ferai doublon si on garde les boutons non? »
  - Sur les options A, B, C des raccourcis : « B »
- **Besoin en trois phrases** : Le filtre de période de `lc-data-table` pose deux `<input type="date">` natifs (`column-filter.component.ts:110-114`) : sur ordinateur, le calendrier du navigateur ignore le thème, ce que la spec du sélecteur de date a corrigé partout ailleurs. L'utilisateur veut que ce filtre utilise le champ de date du kit. Le reste du filtre (application à « Appliquer », pastille, requête) ne change pas.
- **Décisions prises pendant le cadrage** (2026-11-21, utilisateur) :
  26. Spec séparée, livrée avant celle du mouvement (mêmes fichiers que sa tâche T6).
  27. Les deux champs « Du » et « Au » sont remplacés par un seul `lc-date-range-input`.
  28. **Raccourcis (option B, 2026-11-21)** : les boutons radio du filtre sont supprimés ; seuls les raccourcis par défaut de `lc-date-range-input` restent (7 et 30 derniers jours, ce mois-ci, le mois dernier ; affichés aussi en mode natif, `date-range-input.component.ts:108`). Ils donnent des dates fixes : le raccourci glissant `preset` disparaît du contrat (phase de développement, consommateurs corrigés dans la même passe).
  29. Nouvelle exception d'import `data` → `forms`, inscrite dans `CLAUDE.md`.
  30. Le calendrier ouvert depuis le menu de filtre ne ferme pas le menu ; sur téléphone, sélecteur du système depuis le panneau plein écran.
  31. Inchangés : rien n'est appliqué avant « Appliquer » / « Afficher N … ». Le contrat change seulement par l'option B (décision 28).
  32. Q2 à Q4 (2026-11-21) : « Appliquer » désactivé tant que le message d'ordre est affiché ; ligne d'aide « Dates incluses. » ; utilisateur : gestionnaire de demandes sans connaissance particulière.
- **Taille** : Fonctionnalité (petite)
- **Angles ouverts** :
  - [x] Architecture : nouvelle dépendance entre points d'entrée (`data` → `forms`).
  - [x] Écran : le corps du filtre de période change (ordinateur et téléphone).
  - [ ] Sécurité et données : fermé. La seule entrée est une date choisie ou tapée, analysée par le composant existant ; rien n'est lu, envoyé ni stocké en plus.

## 1. Contexte et problème
`lc-data-table` a été livré avant `lc-date-range-input`. Son filtre `dateRange` montre des boutons radio (raccourcis « 7 derniers jours », « 30 derniers jours », « Période choisie ») puis deux champs natifs « Du » et « Au », avec un message si la fin précède le début. Depuis la spec du sélecteur de date, le kit a un champ de période thémé (calendrier du kit sur pointeur fin, sélecteur du système sinon, ADR 0008) que ce filtre n'utilise pas.

## 2. Objectifs
- O1 : la saisie de la période dans le filtre passe par `lc-date-range-input` (thème, calendrier du kit sur ordinateur, sélecteur du système sur téléphone).
- O2 : un seul système de raccourcis (celui du composant) ; application différée inchangée.

## 3. Hors périmètre (non-objectifs)
- Changer la forme `{ from?, to? }` de la requête ou `LcFilterValue` au-delà du retrait de `preset`.
- Animation du calendrier (spec du mouvement, T3).
- Changer `lc-date-range-input` lui-même, sauf si une relecture prouve un manque bloquant (alors question à l'utilisateur).

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : la personne qui filtre une liste par date (copro-ticket : gestionnaire de demandes), sans connaissance particulière ; inchangé par rapport à la spec du tableau filtrable.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Gestionnaire (ordinateur) | Ouvre le filtre de date, choisit « Période choisie », ouvre le calendrier, choisit deux dates, « Appliquer » | Calendrier du kit au thème ; menu resté ouvert ; tableau filtré à « Appliquer » |
| Gestionnaire (ordinateur ou téléphone) | Choisit le raccourci « 7 derniers jours » du champ | Le champ prend les 7 derniers jours ; « Appliquer » émet `{ from, to }` fixes |
| Gestionnaire (téléphone) | Panneau « Filtres », section de la date, choisit la période | Sélecteur du système ; rien n'est appliqué avant « Afficher N … » |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- `column-filter.component.ts` importe `LcDateRangeInputComponent` depuis `@lionelcointot/ui-angular/forms`. Nouvelle exception d'import `data` → `forms` dans `CLAUDE.md` (« À ne pas faire ») ; `forms` n'importe aucun autre point d'entrée secondaire : pas de cycle ; même régime que `geo` → `forms` (ADR 0007), pas de nouvel ADR. Coût en poids accepté (~19 Kio de sources pour le champ, non mesuré minifié).
- Adaptateur local (fonctions pures dans `data-table-model.ts`) : `LcDateRange` ↔ `LcDateInterval` (`{ from?, to? }` ↔ `{ from: string | null, to: string | null }`) ; deux dates effacées → `{}` (le filtre est retiré par `cleanFilterValue`). Pas de boucle d'écho saisie → valeur → champ (drapeau `typed` du composant, test unitaire).
- Raccourcis (option B) : boutons radio supprimés ; `lc-date-range-input` sans `[presets]` (raccourcis par défaut du kit). Retraits : `LcDateRange.preset`, `presets?: readonly number[]` du filtre `dateRange`, `LC_DEFAULT_DATE_PRESETS`, la branche `preset` de `dateRangeBounds`, `isFilterActive`, `cleanFilterValue`, `isDateRangeInverted` et du texte de pastille (`data-table.component.ts:406`), libellé `chosenPeriod`. `lastDays` reste (lu par `kitDatePresets`). Une requête reçue avec `preset` (ancien code) est ignorée : pas d'alias.
- Ordre des dates : `lc-date-range-input` refuse lui-même une fin avant le début (la borne fautive est écartée de la valeur, `date-range-input.component.ts:285-293`) et affiche `labels.dataTable.dateOrderError` sous le groupe, relié par `aria-describedby`. Le filtre n'a plus de message propre ni d'`inverted()` ; le libellé `dateOrderError` reste (lu par le composant) ; `isDateRangeInverted` reste (requêtes fournies par le code, `data-table.component.ts:197, 379`). « Appliquer » est désactivé tant que le champ est en erreur d'ordre (question Q2).
- Période ouverte : acceptée par le composant (`valid()`, `openLine`, story `SansDateDeFin`).
- Panneau du téléphone (`<dialog>` modal, ouvert selon la largeur, `NARROW`) : le filtre fournit `LC_DATE_PICKER = 'native'` au champ du panneau. Sans cela, une fenêtre étroite au pointeur fin ouvrirait le calendrier du kit (superposition CDK attachée à `body`), sous la couche supérieure du navigateur, donc inutilisable. Aucun changement dans `forms`.
- Menu de filtre (`CdkConnectedOverlay`, non modal, `cdkTrapFocus`) : le calendrier est une seconde superposition. Échap est arrêté par le panneau du calendrier (`calendar-panel.component.ts:185, 497-499`) ; un clic dans le calendrier ne devrait pas fermer le menu (le CDK traite d'abord la superposition la plus récente). Aucun précédent ne le prouve (la story `overlay/src/stories/date-input-in-overlay.acceptance.qa.stories.ts` couvre `lc-dialog` et `lc-drawer`, pas un `CdkConnectedOverlay`) : une story de preuve « dans le menu de filtre » est ajoutée (P2).

### 5.2 Modèle de données
`LcDateRange { from?, to? }` (`preset` retiré) ; filtre de colonne `{ type: 'dateRange' }` (`presets` retiré). Changement de contrat assumé (phase de développement) ; consommateurs à corriger dans la même passe (P4).

### 5.3 API / interfaces
Changements publics : ceux de 5.2 et le retrait de `LC_DEFAULT_DATE_PRESETS`. Libellés : `from` et `to` (« Du », « Au ») sont retirés de `LC_LABELS.dataTable` s'ils ne servent nulle part ailleurs (la pastille utilise `since` et `until`) ; nom du champ : `labels.datePeriod` réutilisé s'il vaut « Période », sinon nouveau `LC_LABELS.dataTable.period` (fr « Période », en « Period »).

### 5.4 Interface utilisateur
Retouche d'écran, sans exploration. Brief de `ui-ux-designer` (2026-11-21).
- **Écran** : corps du filtre `dateRange`, commun au menu (ordinateur) et au panneau (téléphone). Seule la paire « Du » / « Au » est remplacée.
- **Ordre** : (1) `lc-date-range-input` pleine largeur, avec ses raccourcis par défaut (dans le calendrier sur ordinateur, sous le champ en mode natif) ; (2) une ligne d'aide. Plus de boutons radio.
- **Nom du champ** : pas de libellé visible (le titre du menu ou de la section nomme la colonne) ; nom accessible « <colonne> : période » (ex. « Date de création : période »).
- **Raccourci** : choisir un raccourci remplit le champ avec ses dates, qui restent modifiables ; rien n'est grisé.
- **Erreur** : seul le message du composant (« La date de fin est avant la date de début. ») ; « Appliquer » désactivé tant qu'il est affiché.
- **Ligne d'aide** : « Dates incluses. » (le composant dit lui-même la période ouverte quand une seule borne est saisie ; question Q3).
- **Ordinateur** : menu de largeur `min(5 × space-16, 100vw − space-8)` ; si les deux zones ne tiennent pas sur une ligne, le composant les empile (à contrôler au rendu) ; focus initial sur la première zone du champ.
- **Téléphone** (360 px) : mêmes textes ; champ en mode natif (sélecteur du système) ; rien d'appliqué avant « Afficher N … ».
- **États** : nominal, vide, erreur d'ordre ; pas de chargement (aucun appel).
- **Utilisateur** : gestionnaire de demandes sans connaissance particulière (section 4 ; `PRODUCT.md` absent, profil à confirmer, question Q4). Test `novice-user` sur captures 360 et 1 280 px après le code (CA-P9).

## 6. Cas limites et gestion des erreurs
- Période ouverte (une seule date, début ou fin) : acceptée, requête sans clé `null`.
- Date tapée incomplète ou impossible : comportement du composant, aucune émission, aucun message du filtre.
- Fin tapée avant le début : borne écartée par le composant, message du composant, « Appliquer » désactivé (Q2).
- Raccourci choisi puis date modifiée : les dates saisies l'emportent.
- Calendrier ouvert puis Échap : ferme le calendrier seul ; second Échap ferme le menu sans appliquer, focus sur l'entonnoir.
- Clic hors des deux superpositions : les deux se ferment, rien n'est appliqué, focus sur l'entonnoir.
- Fenêtre étroite au pointeur fin (panneau `<dialog>`) : champ en mode natif.
- Réouverture du menu avec un filtre actif : le champ affiche la période appliquée ; « Effacer » vide le champ et retire le filtre.
- `min` / `max` : non utilisés.

## 7. Sécurité, performance, observabilité
- Sécurité et données : angle fermé.
- Performance : `data` dépend désormais de `forms` (coût accepté, pas de code dupliqué).
- Logs : aucun.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Un `lc-date-range-input` | un champ, ordre géré, choix de l'utilisateur pour les périodes | adaptateur de type | **Oui** (décision 27) |
| Deux `lc-date-input` « Du » / « Au » | proche de l'actuel | deux calendriers, ordre à contrôler à la main | Non |
| Raccourcis dans les `presets` du composant | un seul système visible | dates fixes (perte du glissant dans la requête), absents sur téléphone | Non proposé (Q1) |
| Copier le calendrier dans `data` | pas de nouvelle dépendance | duplication | Non |

## 9. Plan de test
- **Unitaires** (`senior-developer`, `data-table-model.spec.ts`) : adaptateur `LcDateRange` ↔ `LcDateInterval` (vide, début seul, fin seule, complète, deux dates effacées → `{}`) ; pas de boucle d'écho (saisie, écho, saisie).
- **Acceptation Vitest** (`qa-engineer`, `data-table.component.spec.ts`, `LC_DATE_PICKER = 'calendar'` ou `'native'`, `BreakpointObserver` factice pour le téléphone) : CA-P1 à CA-P4b, CA-P6, CA-P10, CA-P11. Ils remplacent les trois tests CA-8 existants (l. 288-336), qui ne sont pas réécrits par le développeur.
- **Acceptation Chromium** : nouveau sous-mode de `tools/qa/storybook-browser.mjs` sur une story du tableau à colonne `dateRange` : menu avec calendrier ouvert (clic, Échap, clic extérieur, focus) ; contexte 360 px au pointeur fin (CA-P10b) ; axe clair et sombre sur cette story.
- **Architecture** : test `tools/qa/entrypoint-imports.test.mjs` comparant les imports `@lionelcointot/ui-angular/<x>` (hors stories et tests) aux exceptions de `CLAUDE.md` (CA-P7).
- **Non-régression** : tests existants de `lc-data-table` inchangés sauf les trois CA-8 ; `isDateRangeInverted` et ses tests restent.
- **Limite** : le sélecteur réel d'un téléphone n'est pas piloté ; on prouve le rendu natif et l'application différée. CA-P9 manuel.

## 10. Critères d'acceptation
- [x] CA-P1 : Sur ordinateur (`LC_DATE_PICKER = 'calendar'`), le corps du filtre `dateRange` contient un `lc-date-range-input` et aucun `input[type="date"]`.
- [x] CA-P2 : Période `2026-11-03` → `2026-11-04` puis « Appliquer » : `filters.date` vaut `{ from: '2026-11-03', to: '2026-11-04' }`, lignes filtrées bornes incluses ; début seul : `{ from: '2026-11-03' }` ; fin seule : `{ to: '2026-11-04' }` (aucune clé `null`).
- [x] CA-P3a : Le filtre ne contient plus de bouton radio ; le champ propose les raccourcis par défaut du kit (7 et 30 derniers jours, ce mois-ci, le mois dernier), sur ordinateur comme en mode natif.
- [x] CA-P3b : Raccourci « 7 derniers jours » puis « Appliquer » (date du jour figée) : émet `{ from, to }` fixes (6 jours d'écart), sans clé `preset`.
- [x] CA-P3c : Le contrat ne contient plus `LcDateRange.preset`, `presets` du filtre `dateRange` ni `LC_DEFAULT_DATE_PRESETS` (compilation) ; la pastille d'une période affiche ses dates (`since`, `until` ou les deux).
- [x] CA-P4 : Aucune émission de `queryChange` avant « Appliquer » (ordinateur) ou « Afficher N … » (téléphone), après choix d'une date, d'un raccourci, ou ouverture et fermeture du calendrier ; fermer le menu sans appliquer n'émet rien.
- [x] CA-P4b : Date tapée incomplète ou impossible : aucune émission, aucun message du filtre.
- [ ] CA-P5 (Chromium) : calendrier ouvert depuis le menu, clic sur une date : menu ouvert ; Échap : calendrier fermé, menu ouvert ; second Échap : menu fermé, focus sur l'entonnoir, rien émis ; clic hors des deux : les deux fermés, rien émis, focus sur l'entonnoir.
- [x] CA-P6 : Fin saisie avant le début : message du composant affiché une seule fois (aucun message ni `aria-describedby` propre au filtre), « Appliquer » désactivé, rien émis.
- [x] CA-P7 : Le test d'imports passe avec l'exception `data` → `forms` inscrite dans `CLAUDE.md` ; aucun autre import nouveau entre points d'entrée secondaires.
- [ ] CA-P8 : Tests existants de `lc-data-table` verts, inchangés sauf les trois CA-8 (l. 288-336) remplacés ; axe sans erreur sur les stories du tableau, clair et sombre.
- [ ] CA-P9 (manuel) : test `novice-user` sur captures 360 et 1 280 px du filtre de date : COMPRIS.
- [ ] CA-P10 : Panneau du téléphone (largeur étroite) : le champ est en mode natif ; rien n'est émis avant « Afficher N … » ; à l'ouverture suivante, la période appliquée est préremplie.
- [ ] CA-P10b (Chromium) : fenêtre de 360 px au pointeur fin : le champ du panneau est en mode natif, aucun calendrier du kit ne s'ouvre.
- [x] CA-P11 : Menu rouvert avec un filtre `{ from, to }` actif : le champ affiche cette période ; « Effacer » vide le champ et retire le filtre.

## 11. Découpage en tâches
- [x] P1 : adaptateur, remplacement des champs et des radios, retraits de l'option B, retrait du message propre, « Appliquer » désactivé en erreur, libellés, exception dans `CLAUDE.md`, test d'imports (M, CA-P1 à CA-P4b, CA-P6, CA-P7, CA-P11).
- [ ] P2 : calendrier dans le menu de filtre (story de preuve) et mode natif dans le panneau du téléphone (M, CA-P5, CA-P10, CA-P10b).
- [ ] P3 : stories, catalogue, axe, captures (S, CA-P8, CA-P9).
- [ ] P4 : consommateurs : retirer `preset` / `presets` dans copro-ticket (et tout autre consommateur trouvé), dans la même passe (S, CA-P3c ; accès au dépôt à ajouter à la session).

## 12. Risques et questions ouvertes
- **Tranché** (2026-11-21, utilisateur) : Q1 option B ; Q2 « Appliquer » désactivé ; Q3 « Dates incluses. » ; Q4 profil confirmé.
- **Risques** : superposition dans une superposition non prouvée avant la story de P2 ; deux zones de date dans la largeur du menu à contrôler au rendu ; une application qui enregistrait `{ preset }` (URL, favori) perd le recalcul quotidien.
- **Dette** : un raccourci glissant demanderait que `lc-date-range-input` indique le raccourci choisi (option C écartée).

## 13. Relectures et écarts
- 2026-11-21, `ui-ux-designer` (brief) : FAIT. Retenu : 5.4 (ordre, nom accessible, raccourci actif, message du composant, « Dates incluses. »). Questions Q3, Q4.
- 2026-11-21, `cadreur` (cadrage et spec) : ÉCARTS, aucun bloquant. Retenu : Q1 reformulée en effets visibles, conséquences de B listées, critère téléphone ajouté (CA-P10), message d'ordre tranché.
- 2026-11-21, `qa-engineer` (plan de test) : À PRÉCISER. Retenu : CA réécrits avec valeurs, CA-P3 scindé, CA-P4b, CA-P10, CA-P11 ajoutés, trois tests CA-8 nommés, sous-mode Chromium, limite du téléphone. Question Q2.
- 2026-11-21, `architect` : RÉSERVES. Retenu : `dateOrderError` et `isDateRangeInverted` conservés (encore utilisés), mode natif forcé dans le panneau `<dialog>` (bloquant levé), précédent de superposition corrigé et story de preuve, test d'imports, coût en poids accepté, pas d'ADR.
- 2026-11-21, utilisateur : doublon signalé entre les radios et les raccourcis du composant ; ma lecture « raccourcis absents sur téléphone » était fausse (affichés en mode natif) ; option B retenue.
- 2026-11-21, P1 livrée (commit `0766c05`) : `qa-engineer` GO (1 990 tests verts, test d'imports vert ; deux erreurs de ses propres tests corrigées sans les affaiblir), `code-reviewer` APPROUVÉ. **Écarts** : ajout public `LcDateRangeInputComponent.orderInvalid` (contrairement à « aucun changement dans `forms` » : sans lui « Appliquer » ne peut pas se désactiver en erreur d'ordre, Q2) ; paramètre `today` retiré de `matchesFilter`, `filterRows`, `localDistinct`, `lcLocalSource` (ne servait qu'aux raccourcis glissants) ; `from` et `to` de `LC_LABELS.dataTable` conservés (lus par `lc-date-range-input`). Suites pour P2 : test unitaire de `orderInvalid`, `dateRangeBounds` à intégrer à son seul appelant, coquille dans la doc de `cleanFilterValue`.
