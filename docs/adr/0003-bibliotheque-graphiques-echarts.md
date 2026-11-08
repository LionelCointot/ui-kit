# ADR-0003 : Apache ECharts 6, utilisé directement, pour les graphiques

- **Statut** : Acceptée
- **Date** : 2026-11-08

## Contexte

Le ui-kit doit fournir des graphiques pilotés par les tokens (thèmes clair, sombre et produit) :
- courbes et aires empilées (ex. capital restant dû) ;
- barres empilées (ex. répartition intérêts / capital / assurance) ;
- barres segmentées (part d'un tout) ;
- sparklines.

Exigences :
- accessibilité : ne jamais transmettre une information par la seule couleur (skills `frontend-guidelines` et `dataviz`) ;
- format français ;
- licence permissive ;
- maintenance active ;
- intégration Angular 22.

Candidats vérifiés le 2026-11-08 :

| Bibliothèque | Licence | Version | Points forts | Points faibles |
|---|---|---|---|---|
| **Apache ECharts** | Apache-2.0 | 6.1 | Types de graphiques très riches ; rendu SVG ou canvas ; thèmes déclaratifs ; option `aria` (description générée) et **motifs (decal)** pour ne pas dépendre de la couleur ; projet de la fondation Apache | Volumineux s'il n'est pas importé finement ; info-bulles en HTML à échapper |
| Chart.js | MIT | 4.6 | Simple, léger, connu | Canvas seulement ; accessibilité faible ; types limités sans plugins |
| AG Charts Community | MIT | 14.3 | API soignée, thèmes, navigation clavier | Une partie des types est réservée à l'édition commerciale |
| Highcharts | Commerciale | — | Très complet, accessible | Licence payante |

Pour Angular, le wrapper `ngx-echarts` (MIT, version 22) existe. Il ajoute cependant une dépendance qui doit suivre chaque version majeure d'Angular, pour un service que quelques dizaines de lignes rendent : initialisation, `setOption`, redimensionnement, libération.

## Options considérées

1. **Chart.js** : simple, mais accessibilité et motifs insuffisants face aux règles du projet.
2. **AG Charts Community** : bonne option, mais avec un risque de dépendre de l'édition commerciale pour certains types.
3. **ECharts 6 via `ngx-echarts`.**
4. **ECharts 6 utilisé directement** derrière les composants `lc-*-chart` du ui-kit.

## Décision

**Option 4.**
- ECharts 6 est utilisé directement, sans wrapper tiers, dans le point d'entrée secondaire `@lionelcointot/ui-angular/charts`.
- `echarts` est une **dépendance pair optionnelle** : seuls les projets qui importent ce point d'entrée l'installent.
- Les modules ECharts sont importés finement (`echarts/core` + les séries, composants et moteur de rendu utilisés). Le moteur de rendu SVG est le défaut.
- Les composants exposent un **modèle de données typé** propre au ui-kit, pas les options ECharts. Une porte de sortie `lc-chart [options]` reste disponible pour les cas avancés.

## Conséquences

- **Positives** : richesse et accessibilité (aria, motifs) sans coût de licence ; aucune dépendance à un wrapper qui suit les versions d'Angular ; ECharts est remplaçable puisque l'API publique est le modèle typé du ui-kit.
- **Négatives / dette** :
  - écrire et maintenir le composant de base (cycle de vie, redimensionnement, thème) ;
  - échapper systématiquement le contenu des info-bulles HTML ;
  - Apache-2.0 impose de livrer la licence et la mention NOTICE (notices tierces du hub).
- **À surveiller** : la taille du point d'entrée `charts` (objectif < 350 Kio minifiés) et le rendu SVG au-delà de 5 000 points (basculer en canvas si nécessaire).

## Mise à jour (2026-11-08) : taille mesurée

Avec l'import fin (`echarts/core`, ligne, barre, grille, info-bulle, aria, SVG et canvas), le point d'entrée pèse environ **563 Kio minifiés (193 Kio gzip)** ; `echarts/core` seul en représente 378 Kio. L'objectif de 350 Kio n'est donc pas atteignable avec ECharts 6. Mitigations : dépendance optionnelle, chargement à la demande (`@defer`), moteur de rendu SVG par défaut. À réévaluer à chaque mineure d'ECharts. Le contrôle de palette de la CLI `lc-tokens` ne couvre que le contraste ; la distinction pour les daltoniens n'est pas calculée.
