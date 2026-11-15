---
name: ui-kit
description: Socle visuel et vocabulaire d'actions commun aux applications finance-credit, finance-rent-vs-buy, finance-hub et qa-platform : neutres chauds, un seul bleu d'action, statuts toujours en icône et en mot.
colors:
  # Valeurs résolues du thème `default` (clair). Source : packages/tokens/src/ref et sys/default.tokens.json. Le thème `dark` est réglé à part (voir Colors).
  primary: "#1c5cab"
  on-primary: "#ffffff"
  primary-container: "#cde2fb"
  on-primary-container: "#0d366b"
  secondary: "#383835"
  success: "#006300"
  success-container: "#dcf3dc"
  warning: "#fab219"
  warning-container: "#fdf0d0"
  on-warning-container: "#5c3c00"
  error: "#d03b3b"
  error-container: "#fbe1e1"
  on-error-container: "#a82c2c"
  info: "#256abf"
  highlight: "#6250d6"
  highlight-container: "#e9e6fa"
  on-highlight-container: "#4a3aa8"
  neutral: "#52514e"
  background: "#f9f9f7"
  surface: "#fcfcfb"
  surface-raised: "#ffffff"
  surface-sunken: "#f0efec"
  on-surface: "#0b0b0b"
  on-surface-muted: "#52514e"
  on-surface-subtle: "#6b6a66"
  border: "#e1e0d9"
  border-strong: "#898781"
  focus-ring: "#2a78d6"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-solid-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-outline-primary:
    backgroundColor: "transparent"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-flat-neutral:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-solid-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.4}"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    height: "44px"
  dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
---

# Design System: ui-kit

> Ce fichier est la **source commune** des applications. Les `DESIGN.md` des applications ne gardent que leurs spécificités (graphiques, signature, thème produit) et renvoient ici pour le reste. Jamais de valeur en dur : seules les variables `--lc-sys-*` et `--lc-<composant>-*` sont consommées. Les noms descriptifs (Creative North Star, noms de couleurs) sont des noms de lecture : seuls les tokens font contrat.

## Overview

**Creative North Star : « L'outil posé »**

Un outil de travail calme : papier chaud et neutre, encre presque noire, un seul bleu pour ce qui est actionnable, des filets fins plutôt que des ombres. L'écran aide à décider ou à surveiller ; il ne cherche ni à séduire ni à alarmer. La couleur saturée est réservée au sens (statut, série, élément actif).

Surface **Operate** : l'utilisateur règle, lit, compare. L'ambition se mesure en cohérence : une même action a toujours la même icône, le même style et le même nom, d'une application à l'autre.

**Key Characteristics:**
- Neutres chauds, un seul accent bleu ; thèmes `default` (clair) et `dark` réglés séparément.
- Profondeur tonale d'abord ; ombres réservées aux couches (menus, tiroirs, dialogues).
- Aucune information portée par la couleur seule : icône et mot toujours.
- Cibles tactiles de 44 px, focus visible partout (2 px, décalage 2 px).
- Un seul jeu d'icônes (Lucide, registre `lc-icon`) ; un seul vocabulaire d'actions (voir « Actions et icônes »).

## Colors

Palette de rôles du ui-kit, à trois couches (`--lc-ref-*` réservées aux thèmes, `--lc-sys-*` pour les rôles, `--lc-<composant>-*` pour les composants).

### Primary
- **Bleu de confiance** (`#1c5cab`, `--lc-sys-color-primary` ; sombre `#6da7ec`) : action principale, onglet et entrée de navigation actifs, curseur. Texte `#ffffff` dessus.
- **Bleu pâle** (`#cde2fb`, `--lc-sys-color-primary-container`) : sélection, alerte d'information.

### Secondary
- **Graphite** (`#383835`, `--lc-sys-color-secondary` ; rôle `neutral` `#52514e`) : actions secondaires et plates en `themeColor="neutral"`.

### Status
- **Vert posé** (`#006300`), **ambre** (`#fab219`, texte `#5c3c00` sur `#fdf0d0`), **rouge** (`#d03b3b`), **bleu info** (`#256abf`), **violet** (`highlight`, `#6250d6`, pour l'instable ou la mise en relief) : alertes, badges, erreurs de champ. Icônes fixes dans `LC_STATUS_ICONS` : `info`, `circle-check`, `triangle-alert`, `circle-x`, `activity`, `minus` (neutre).

### Neutral
- **Papier** (`#f9f9f7`, fond de page), **surface** (`#fcfcfb`), **surface relevée** (`#ffffff`, cartes et champs), **surface enfoncée** (`#f0efec`, en-têtes de tableau).
- **Encre** (`#0b0b0b`), **encre atténuée** (`#52514e`), **encre discrète** (`#6b6a66`).
- **Filet** (`#e1e0d9`) et **filet fort** (`#898781`, bordures de contrôles, ≥ 3:1).
- **Anneau de focus** (`#2a78d6` ; sombre `#6da7ec`).
- Thème `dark` : fond `#0d0d0d`, surface `#1a1a19`, relevée `#232322`, encre `#f0efec`, erreur `#e66767`.

### Named Rules
**La règle du seul accent.** Le bleu d'action couvre moins de 10 % de l'écran ; une couleur de statut ne sert jamais de couleur de série de graphique.
**La règle du rouge.** Le rouge (`error`) signale un échec ou le bouton de confirmation d'une action destructive à fort impact, jamais une simple option ni un déclencheur.

## Typography

**Police :** pile système (`--lc-sys-font-family-base`), sans police externe (usage hors ligne) ; **monospace** `--lc-sys-font-family-mono` pour SHA, chemins, journaux.

### Hierarchy
- **Display** (600, 1,875 rem, 1,25) : valeur de KPI (`lc-kpi-card`), chiffres proportionnels.
- **Headline** (600, 1,5 rem, 1,25) : `<h1>` de `lc-page`, un par écran.
- **Title** (600, 1,125 rem, 1,25) : titres de carte (`lc-card-header`) et de section.
- **Body** (400, 1 rem, 1,5) : texte courant et champs ; mesure ≤ 75 ch.
- **Label** (500, 0,875 rem, 1,5) : libellés de champs, aides, légendes ; `xs` (0,75 rem) pour badges et axes, jamais en dessous.
- Chiffres **tabulaires** (`font-numeric-tabular`) dans tableaux, axes et champs numériques ; proportionnels dans les phrases et les KPI.

### Named Rules
**La règle du plancher.** Aucun texte sous 12 px ; aucun texte d'information sous 14 px hors axes et légendes.

## Layout

Espacement sur base 4 px (`space-1` à `space-16`), gouttière 16 px. Cibles ≥ 44 px (`control-height-md` ; `small` 36 px garde une zone cliquable de 44 px par pseudo-élément, `large` 52 px). Grille `lc-grid` (colonnes par point de rupture), `lc-stack` pour les rangées d'actions (`gap` `space-2`). Coque `lc-app-shell` : navigation 16 rem (4,5 rem repliée), tiroir sous 1024 px. Vérifier à 360, 768 et 1280 px, sans défilement horizontal de page.

## Elevation & Depth

Hybride, **tonal d'abord** : `background` < `surface` < `surface-raised` + filet `border` 1 px. Pas d'ombre au repos sur les cartes imbriquées.

### Shadow Vocabulary
- **Relevé** (`--lc-sys-shadow-1`) : cartes et bande collante.
- **Menu** (`shadow-3`) : menus, combobox, info-bulles, tiroir.
- **Dialogue** (`shadow-4`).

### Named Rules
**La règle du plat au repos.** Une ombre signale une couche, jamais une décoration ; aucune ombre colorée, aucun flou d'arrière-plan.

## Shapes

`md` (8 px) boutons et champs ; `lg` (12 px) cartes, KPI, dialogues ; `sm` (4 px) badges et marques ; `full` pastilles et poignées. Bordure 1 px (`border-width-thin`), 2 px pour l'anneau de focus et la sélection (`thick`). Icônes Lucide 24 × 24, trait 2, `currentColor`, tailles 16 / 20 / 24 px (`--lc-sys-icon-size-sm|md|lg`).

## Components

Tous les composants viennent du ui-kit ; une application ne redéfinit ni un token ni un composant du kit : elle l'étend dans le kit.

### Boutons (`button[lcButton]`, `a[lcButton]`)
- **Remplissage (`fillMode`) :** `solid` = action principale (une par zone) ; `outline` = actions secondaires visibles ; `flat` = actions de ligne, d'en-tête de carte, tertiaires.
- **Couleur (`themeColor`) :** `primary` par défaut ; `neutral` pour les actions de ligne et de barre ; `error` **uniquement** pour le bouton de confirmation d'une action destructive.
- **États :** survol et appui par mélange de `--_fg` (8 % et 12 %) ; désactivé 38 % ; `loading` = `aria-busy`, clics ignorés, largeur conservée.
- **Bouton icône seule :** `iconOnly` + `aria-label` obligatoire (avertissement en dev) ; `lcTooltip` du même texte quand l'icône n'est pas évidente.
- **Taille :** `medium` (44 px) par défaut ; `small` pour les actions de ligne, d'en-tête de carte et de barre d'outils dense.
- **Icône + texte :** icône à gauche pour une action (`plus`, `download`, `save`…), à droite pour une direction (`arrow-right`, `chevron-right`, `chevron-down` d'un menu).

### Cartes et en-têtes
`lc-card` (surface relevée, filet, 12 px) ; `lc-card-header` avec `[lcCardActions]` pour les actions de l'objet ; `lc-page` avec `[lcPageActions]` pour les actions de page et `[lcPageToolbar]` pour la barre d'outils.

### Champs
`lc-form-field` (libellé au-dessus, aide et erreur dessous avec icône) ; contrôles de `forms`. Bordure `border-strong`, hauteur 44 px.

### Dialogues et menus
`lc-dialog` (via `LcDialogService.open`) : titre, contenu, pied d'actions (`[lcDialogActions]`, action principale à droite). `LcDialogService.confirm({ destructive: true })` (actions à fort impact seulement) : `role="alertdialog"`, bouton **Annuler** (outline neutre) à gauche et reçoit le focus initial, bouton de confirmation (`error` si destructif) à droite, pas de croix. `lc-menu` + `button[lcMenuItem]` (`icon`, `destructive`, `lc-divider`).

### Retours d'état
`lc-alert`, `lc-toast-outlet`, `lc-error-state` (icône `circle-alert`, bouton « Réessayer »), `lc-empty-state`, `lc-skeleton`, `lc-spinner`, `lc-status-badge`.

## Do's and Don'ts

### Do:
- **Do** prendre l'icône, le style et le nom d'une action dans le tableau « Actions et icônes ».
- **Do** donner à chaque état un texte et une icône ; formater en français (`85,41 %`, signe moins U+2212, dates locales).
- **Do** confirmer selon l'impact (voir « Confirmation selon l'impact ») : sans fenêtre pour une ligne de saisie, par `lc-dialog` pour le reste.
- **Do** laisser le focus à un endroit logique après une suppression ou une fermeture (ligne voisine, titre de la liste, déclencheur).

### Don't:
- **Don't** utiliser deux icônes pour la même action, ni la même icône pour deux actions sans texte visible.
- **Don't** utiliser `themeColor="error"` ailleurs que sur le bouton de confirmation d'une action à fort impact, ni un second accent, un dégradé, une ombre décorative.
- **Don't** laisser un bouton icône sans nom accessible ; un bouton désactivé sans raison lisible.
- **Don't** écrire de couleur, taille ou durée en dur ; ne pas utiliser `innerHTML` pour des contenus non fiables.
- **Don't** animer plus de 200 ms (hors `prefers-reduced-motion` : aucune animation).

## Actions et icônes

Source unique du vocabulaire d'actions. Icônes du registre `packages/angular/src/lib/icon/default-icons.ts` (`<lc-icon name="…" />`) ; une icône absente du registre s'ajoute au registre du kit (`tools/generate-icons.mjs`), jamais dans une application.

### Tableau de référence

« Icône seule » = `iconOnly` + `aria-label` ; « Icône + texte » = icône puis libellé visible. `<objet>` = nom de l'objet tel qu'affiché (ex. « Prêt 2 : Principal ») ; le nom accessible le répète.

| Action | Icône | Style de bouton | Libellé visible · nom accessible | Confirmation | Forme et lieu |
|---|---|---|---|---|---|
| Supprimer une ligne de saisie (**faible impact**) | `trash-2` | `flat` `neutral` `small` | « Supprimer le/la <objet> » | **Non** : immédiat, annonce « <Objet> supprimé » et focus sur la ligne voisine | Icône seule, **dernière** action de la ligne ou de l'en-tête de carte (`lcCardActions`) |
| Supprimer, retirer, réinitialiser (**fort impact**) | `trash-2` (réinitialiser : voir « Rétablir ») | `flat` `neutral` `small` ; confirmation en `solid` `error` | « Supprimer le/la <objet> » (confirmation : titre « Supprimer <objet> », bouton « Supprimer ») | **Oui**, `lc-dialog` (`confirm`, `destructive`) | Icône seule, **dernière** action de la ligne ou de l'en-tête de carte ; même place que la suppression à faible impact |
| Retirer (d'une sélection, d'un filtre, d'une liste sans détruire la source) | `x` | `flat` `neutral` `small` | « Retirer <objet> » | Non (réversible : on peut le ré-ajouter) | Icône seule, dans la puce ou la ligne concernée |
| Ajouter | `plus` | `outline` `primary` ; `solid` seulement si c'est l'action principale de l'écran vide | « Ajouter un/une <objet> » | Non | Icône + texte, **sous** la liste, à gauche ; dans `lcEmptyActions` si la liste est vide. Menu de choix : `chevron-down` après le texte |
| Modifier | `pencil` | `flat` `neutral` `small` (ligne) ; `outline` (page) | « Modifier <objet> » | Non | Icône seule en ligne ou en en-tête de carte ; icône + texte en action de page |
| Dupliquer | `copy` | `flat` `neutral` `small` | « Dupliquer <objet> » | Non | Icône seule en ligne ; `lcMenuItem icon="copy"` « Dupliquer » si la ligne a ≥ 2 actions non destructives |
| Annuler (abandonner une saisie ou un dialogue) | aucune | `outline` `neutral` | « Annuler » | Non | Texte seul, à gauche de l'action principale, pied de dialogue ou de formulaire |
| Fermer | `x` | `flat` `neutral` `small` | « Fermer » (`LC_LABELS.close`) | Non | Icône seule en haut à droite (dialogue, alerte, toast : déjà fournie par le kit). Seul bouton d'un pied de dialogue : texte « Fermer » en `solid` |
| Enregistrer | `save` | `solid` `primary` ; « Enregistrer sous » : `outline` | « Enregistrer » · « Enregistrer sous » | Non | Icône + texte, action principale d'un formulaire ou d'une barre d'actions |
| Exporter | `download` | `outline` `primary` | « Exporter en <format> » (ex. « Exporter en CSV ») | Non | Icône + texte, en-tête du tableau ou de la section exportée (barre d'actions) |
| Importer | `upload` | `outline` `primary` | « Importer » (« Importer un fichier ») | **Oui si** l'import remplace la saisie en cours (bouton « Remplacer ») | Icône + texte, barre d'actions |
| Copier | `copy` → `check` pendant 2 s | `flat` `neutral` `small` | « Copier <objet> » · retour « Copié » (statut lu) | Non | Icône seule contre la valeur (SHA, bloc de code) ; icône + texte dans une barre (« Copier le journal ») |
| Réessayer | `rotate-ccw` | `outline` `neutral` | « Réessayer » | Non | Icône + texte, dans `lc-error-state` (sortie `retry`), jamais un bouton isolé |
| Rétablir (valeurs par défaut, exemple) | `rotate-ccw` | `flat` `neutral` | « Rétablir <ce qui> » (ex. « Rétablir l'exemple ») | **Oui** (fort impact : efface plusieurs réglages), bouton « Rétablir » | Icône + texte, en-tête de page ou de section |
| Ouvrir le détail (panneau, dialogue, tiroir) | aucune | `flat` `primary` ou `outline` `small` | « Voir le détail » · « Voir le détail de <objet> » | Non | Texte seul, en fin de ligne |
| Aller vers (autre écran) | `arrow-right` après le texte | `<a lcButton>` : `solid` si CTA de la carte, sinon `flat` `primary` | « Ouvrir <objet> », « Voir <destination> » | Non | Icône + texte, fin de carte ou de ligne |
| Lien externe | `external-link` après le texte | `<a lcButton>` `flat` `neutral`, `target="_blank"` | « <Destination> » (le kit ajoute `rel`) | Non | Icône + texte, en-tête de carte |
| Retour · Précédent · Suivant | `chevron-left` avant · `chevron-left` avant · `chevron-right` après | `outline` (retour) ; `flat` `neutral` (précédent, suivant) | « Retour » · « <Objet> précédent » · « <Objet> suivant » | Non | Icône + texte ; retour à gauche du pied de formulaire, précédent et suivant en en-tête de page |
| Déplier / replier (carte, section, panneau) | `chevron-down` replié → `chevron-up` déplié | l'en-tête entier est le bouton (`aria-expanded`, `aria-controls`) | titre de la carte | Non | Icône à gauche du titre (`lc-card collapsible`) |
| Déplier / replier (ligne, groupe, arbre, volet) | `chevron-right` replié → `chevron-down` déplié | idem | « Déplier le groupe <nom> » / « Replier le groupe <nom> » | Non | Icône à gauche (`lc-table`, `lc-tree-table`, `lc-nav-group`, `lc-disclosure`) |
| Autres actions (menu) | `ellipsis-vertical` | `flat` `neutral` `small`, `lcMenuTriggerFor` | « Autres actions pour <objet> » | Non | Icône seule, **avant** Supprimer ; contient les actions non destructives (items avec icône) |
| Lancer | `play` | `solid` `primary` | « Lancer <objet> » (« Lancer les tests ») | Non | Icône + texte, en-tête de page ou barre d'actions |
| Arrêter | `square` | `outline` `neutral` ; confirmation en `solid` `error` | « Arrêter <objet> » | **Oui** si l'arrêt perd du travail en cours (bouton « Arrêter ») | Icône + texte, **à la place de** « Lancer » pendant l'exécution (même position) |
| Rafraîchir | `refresh-cw` | `outline` `neutral` | « Actualiser » · « Actualiser <les données> » | Non | Icône + texte ; icône seule + `lcTooltip` sous 768 px |
| Aide | `info` en attendant `circle-help` (**à ajouter au registre** ; bascule dès qu'il est livré) | `flat` `neutral` `small` | « Aide : <sujet> » | Non | Icône seule à côté du libellé du champ ou du titre ; ouvre une info-bulle (courte) ou un dialogue (longue) |
| Continuer (étape suivante d'un parcours) | `chevron-right` après | `solid` `primary` (la seule par écran) | « Continuer » | Non | Icône + texte, pied du parcours, à droite de « Retour » |
| Aller à une section (même page) | `arrow-down` après | carte-lien ou `outline` `primary` | « Aller à <section> » (ex. « Aller au rapport détaillé ») | Non | Icône + texte ; défile puis place le focus sur le titre de la section |
| Gérer <objets> (ouvre la liste de ses objets enregistrés) | `settings` avant | `flat` `neutral` | « Gérer <objets> » (ex. « Gérer mes modèles ») | Non (la suppression, dans le dialogue, suit « Supprimer ») | Icône + texte, sous la liste concernée |
| Essayer (calculer avec une autre valeur, sans rien changer d'autre) | `calculator` avant | `outline` `primary` | « Essayer <valeur> » (ex. « Essayer avec 20 ans ») | Non | Icône + texte, dans le message qui propose la valeur. `calculator` car l'action recalcule ; `play` reste réservé à « Lancer » |
| Revenir à <valeur> (annuler un essai ou un import, une seule valeur) | `rotate-ccw` avant | `flat` `neutral` | « Revenir à <valeur> » (ex. « Revenir à 25 ans ») | Non (réversible, une seule valeur) | Icône + texte, à côté de la valeur. Même icône que « Rétablir » mais sans confirmation : « Rétablir » touche plusieurs réglages |

Libellés : verbe à l'infinitif, pas de point, **un seul verbe par action** (« Réessayer », jamais « Relancer » pour la même chose ; « Supprimer », jamais « Effacer » ou « Retirer » pour une donnée détruite). Les libellés internes des composants viennent de `LC_LABELS` ; une application ne les réécrit pas.

### Confirmation selon l'impact

**Critère : une action destructive demande une confirmation si elle est irréversible ou si elle touche autre chose que le formulaire en cours ; sinon elle s'exécute immédiatement, sans fenêtre.**

Faible impact, **immédiat** (une ligne de saisie du formulaire en cours, que la personne peut recréer en quelques secondes) :
- supprimer un placement dans la liste des placements ;
- supprimer un prêt dans la liste des prêts d'un scénario en cours de saisie ;
- retirer une puce ou un filtre (déjà « Retirer », sans destruction).

Fort impact, **confirmé par `lc-dialog`** (irréversible, ou qui touche autre chose que le formulaire en cours : un autre enregistrement, plusieurs réglages, un historique) :
- retirer un dépôt suivi (qa-platform) ;
- supprimer un scénario enregistré, un modèle de placement enregistré, un historique d'exécutions ;
- réinitialiser plusieurs réglages (« Rétablir l'exemple », revenir en Simple alors que des réglages avancés ont été modifiés) ;
- importer en remplaçant la saisie, arrêter une tâche qui perd du travail.

En cas de doute, confirmer. Une action à faible impact reste annoncée (règle 7) et jamais en `error`.

### Règles de placement des actions destructives

1. **Fort impact : jamais seule sans confirmation.** Supprimer un enregistrement, rétablir plusieurs réglages, importer en remplaçant, arrêter une tâche qui perd du travail passent par `LcDialogService.confirm({ destructive: true })`. Faible impact : aucune fenêtre (voir ci-dessus).
2. **Jamais l'action principale.** Le déclencheur est `flat` ou `outline` en `neutral`, jamais `solid`, jamais `error`. Le rouge n'apparaît que sur le bouton de confirmation.
3. **Dernière position, séparée.** Dans une ligne ou un en-tête de carte : actions non destructives d'abord (`⋮` ou icône), Supprimer à l'extrémité. Dans un pied de dialogue : Annuler à gauche, confirmation à droite. Dans un menu : `lcMenuItem destructive` en dernier, après un `lc-divider`.
4. **Focus initial sur l'option sûre.** Le dialogue de confirmation s'ouvre avec le focus sur « Annuler » (ordre des boutons, croix masquée) ; un dialogue personnalisé reproduit cet ordre. Échap annule.
5. **Message qui dit quoi.** Titre « Supprimer <objet> » ; texte « Supprimer « <nom> » ? Cette action est définitive. » (ou ce qui est récupérable, ou ce qui est perdu : « Revenir au mode simple remet 3 réglages avancés à leur valeur de départ. ») ; bouton = le verbe de l'action, jamais « OK », « Oui » ni « Confirmer ».
6. **Désactivé = expliqué.** Un Supprimer désactivé (ex. dernier élément) garde un `aria-describedby` vers une note visible (« Il faut au moins un placement »).
7. **Après coup.** Annonce vocale ou toast « <Objet> supprimé », focus sur la ligne voisine ou le titre de la liste (suppression immédiate comprise : c'est le seul retour de l'action).

### Noms accessibles

- Bouton icône seule : `aria-label` = verbe + objet + nom, identique au titre visible de la ligne (« Supprimer le placement 1 : Livret A »). Un mot générique (« Supprimer ») ne suffit pas quand plusieurs lignes coexistent.
- Bouton à texte visible : le nom accessible **contient** le texte visible (« Voir » → « Voir le détail de l'échec de test_x »).
- Icône décorative à côté d'un texte : `lc-icon` sans `label` (déjà `aria-hidden`).
- Bouton à bascule : `[pressed]` (`true` ou `false`) pose `aria-pressed` et, si `true`, l'anneau et le fond teinté ; le nom accessible **ne change pas** avec l'état (« Notifications », pas « Notifications activées »). Si l'icône change aussi (cloche, cloche barrée), elle reste décorative.
- Info-bulle : `lcTooltipPosition` donne la position souhaitée ; près d'un bord de la fenêtre, l'info-bulle se replie sur la première position qui tient (opposé, puis côtés). Elle ne porte jamais d'information indispensable.

## Vérifier la cohérence

La revue de conformité d'une application (`/impeccable critique`, `audit`) contrôle, écran rendu à 360 et 1280 px, par rapport à ce fichier :

1. **Icône** : chaque action du tableau utilise l'icône du registre indiquée, jamais un SVG ou une icône d'un autre jeu ; une même icône ne désigne pas deux actions sans texte.
2. **Style et taille** : `fillMode`, `themeColor` et `size` conformes ; une seule action `solid` par zone ; `error` seulement sur la confirmation d'une action à fort impact.
3. **Destructif, selon l'impact** : chaque action à fort impact (voir les deux listes) ouvre le dialogue de confirmation (règles 1 à 7) ; test au clavier : le focus initial est sur « Annuler ». Une suppression de ligne de saisie à faible impact s'exécute **sans** fenêtre, est annoncée et rend le focus à la ligne voisine : une confirmation y est un écart, comme son absence sur une action à fort impact.
4. **Nom accessible** : tout `iconOnly` a un `aria-label` verbe + objet ; le nom contient le texte visible ; aucun avertissement `[lcButton]` ni `[lc-icon]` en console.
5. **Libellés** : un verbe par action (voir le tableau), tous en français courant ; pas de libellé réécrit pour un texte du kit.
6. **Placement** : actions de ligne dans `lcCardActions`, actions de page dans `lcPageActions`, Annuler à gauche, Supprimer en dernier ; réessayer via `lc-error-state`.
7. **Pas de doublon** : aucun composant d'application qui refait un composant du kit (dépliant, état d'erreur, confirmation) ; les écarts répétés ≥ 3 fois se proposent au kit.
8. **Tokens** : aucune couleur, taille ou durée en dur (stylelint) ; contrastes AA dans les deux thèmes.

## Écarts constatés au 2026-11-14 (annexe temporaire)

Relevé en lecture seule (aucune application modifiée). À supprimer de ce fichier une fois corrigé. Gravité : **B** bloquant (action à fort impact sans confirmation), **R** recommandé. Reclassé le 2026-11-14 d'après la décision « confirmation selon l'impact » : supprimer un placement ou un prêt sans confirmation n'est plus un écart ; « Rétablir l'exemple » est supprimé d'Acheter ou louer (spec) mais reste un écart pour Crédit.

**finance-rent-vs-buy** (`frontend/projects/finance-rent-vs-buy-ui/src/lib/…`)
1. B · `ui/presets-dialog.component.ts:35-43` : suppression d'un modèle (enregistré dans le profil, hors du formulaire en cours : fort impact) sans confirmation, en icône + texte `flat error` (les autres lignes : icône seule neutre) → icône seule `neutral` + confirmation.
2. R · `ui/placement-list.component.ts:60-82` : boutons icône en `size` par défaut (credit : `small`) → `small` avec zone de 44 px.
3. R · `ui/housing-question.component.ts:76` : « Réessayer » en bouton `small` sans icône dans un `lc-alert` → icône `rotate-ccw`, style de `lc-error-state`.
4. R · `ui/question-shell.component.ts:41`, `pages/full-page.component.ts:19`, `pages/result-page.component.html:10` : « Retour », « Revenir… », « Modifier mes réponses » sans `chevron-left` ni `pencil`.
5. À prévoir (spec parcours Simple / Avancé) : « Revenir en Simple » avec réglages avancés modifiés = confirmation (fort impact).

**finance-credit** (`frontend/projects/finance-credit-ui/src/lib/…`)
1. B · `pages/credit-page.component.html:15-23` : « Rétablir l'exemple » (efface toute la saisie : fort impact) sans confirmation.
2. R · `ui/loan-list.component.ts:44` : Supprimer désactivé sans raison lisible → `aria-describedby` + note (modèle : `placement-list.component.ts:68`, « Il faut au moins un placement »).
3. R · `ui/loan-list.component.ts:36,48` : nom accessible « Dupliquer/Supprimer le prêt <nom> » sans le numéro du titre visible « Prêt n : <nom> » → reprendre le titre.

**qa-platform** (`dashboard/src/app/…`)
1. R · `shell/qa-shell.ts:134,146` : « Actualiser » en `rotate-ccw` → `refresh-cw` (`rotate-ccw` = réessayer, rétablir).
2. R · `shared/qa-server-stopped.ts:47-59` : état d'erreur fait avec `lc-empty-state` et un « Réessayer » `solid` sans icône → `lc-error-state` (sortie `retry`) ; `:42` « Recharger la page » sans `refresh-cw`.
3. R · `shell/qa-shell.ts:130` : `aria-label="Actualiser"` sans objet → « Actualiser les données ».
4. R · `pages/repo/repo-page.ts:127-133`, `pages/repo/overview-tab.ts:66`, `pages/not-found/not-found-page.ts:20` : liens « Ouvrir la dernière exécution », « Voir l'exécution », « Retour à la vue globale » sans `arrow-right` / `chevron-left` ; `repo-page.ts:124` : `external-link` avant le texte (après).
5. À prévoir : le pilotage (Lancer / Arrêter) n'a pas encore de bouton ; appliquer `play` / `square` et la confirmation d'arrêt.

**finance-hub** (`frontend/src/app/…`)
1. R · `shell/shell-layout.component.ts:60` : « Relancer » (solid `small`, sans icône) pour la même action que « Réessayer » (`pages/startup/startup-gate.component.ts:48-54`) → « Réessayer » + `rotate-ccw`.
2. R · `pages/home/home-page.component.ts:52-58` : « Ouvrir » sans `arrow-right`.
3. R · `pages/not-found/not-found-page.component.ts:12` : « Retour à l'accueil » sans `chevron-left`.

**finance-sdk, `scenario-bar` (affiché dans rent-vs-buy et credit, hors des quatre applications)**
1. R · `scenarios/scenario-bar/scenario-bar.component.html:10-95` : six actions (Enregistrer, Enregistrer sous, Ouvrir, Exporter, Importer, Supprimer) en texte seul, sans `save`, `folder-open`, `download`, `upload`, `trash-2` ; la confirmation de suppression (`scenario-bar.component.ts:212`) est conforme et sert de modèle.

### Motifs à proposer au ui-kit

1. **Action à fort impact avec confirmation** (6 usages : modèle, scénario, rétablir (Crédit), retirer un dépôt (qa-platform), bientôt arrêter, revenir en Simple) : directive `[lcConfirm]` ou bouton `lc-delete-button` dans `overlay` (icône `trash-2`, `aria-label` construit depuis l'objet, `confirm` destructif, sortie `confirmed`, `disabledReason` relié par `aria-describedby`). La suppression à faible impact (placement, prêt) reste un bouton `trash-2` ordinaire, sans fenêtre.
2. **Libellés d'action** (tous les consommateurs) : groupe `LC_LABELS.actions` (`delete(objet)`, `edit`, `duplicate`, `add`, `export`, `import`, `refresh`, `back`, `previous`, `next`, `help`, `moreActions(objet)`) pour que les noms accessibles ne soient plus écrits à la main.
3. **Icône `circle-help`** à ajouter au registre, pour « Aide » (`info` en attendant).
4. **À surveiller (2 usages)** : barre « titre + Exporter en CSV » (tableau annuel, tableau d'amortissement) ; « Actualiser » qui passe en icône seule sous 768 px ; page « introuvable » (qa-platform, finance-hub) ; `rvb-disclosure` (rent-vs-buy) à comparer à `lc-disclosure`.
