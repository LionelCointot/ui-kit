# Spec : [Titre de la feature]

- **Statut** : Brouillon | En revue | Validée | Implémentée
- **Auteur** : [...]
- **Date** : [AAAA-MM-JJ]
- **ADR liés** : [...]

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** : « [citation, pas un résumé] »
- **Besoin en trois phrases** : [...]
- **Décisions prises pendant le cadrage** : [date, décision, qui]
- **Taille** : Correctif | Tâche | Fonctionnalité
- **Angles ouverts** (un angle fermé se justifie en une ligne) :
  - [ ] Architecture : [pourquoi]
  - [ ] Écran : [pourquoi]
  - [ ] Sécurité et données : [pourquoi]

## 1. Contexte et problème
[Pourquoi ? Quel besoin utilisateur / métier ?]

## 2. Objectifs
- [...]

## 3. Hors périmètre (non-objectifs)
- [...]

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : [qui, et ce qu'il sait déjà du sujet ; confirmé par l'utilisateur du projet, pas supposé]

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
[Schéma ou description. Modules, sens des dépendances, interfaces. Ce qu'il faut toucher pour remplacer une brique.]

### 5.2 Modèle de données
[Entités, champs, relations, contraintes, migrations.]

### 5.3 API / interfaces
[Endpoints, payloads, codes d'erreur, ou signatures de fonctions.]

### 5.4 Interface utilisateur
[Direction choisie par l'utilisateur et lien vers les maquettes d'exploration (nouvel écran ou refonte). Brief de `ui-ux-designer` (`/impeccable shape`) : écrans, composants du kit utilisés, textes affichés, états (chargement, vide, erreur), accessibilité. Résultat du test `novice-user`. Ou « Pas d'impact UI » et pourquoi.]

## 6. Cas limites et gestion des erreurs
- [...]

## 7. Sécurité, performance, observabilité
- **Sécurité et données** (rempli avec `security-reviewer` si l'angle est ouvert) :
  - Données lues, écrites, journalisées ; données personnelles ; conservation.
  - Matrice des droits : rôle × action × périmètre.
  - Cas d'abus retenus, chacun avec le critère `CA-n` qui le couvre.
- Performance : [...]
- Logs / métriques : [...]

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|

## 9. Plan de test
- Unitaires (écrits par `senior-developer`) : [...]
- Acceptation (écrits par `qa-engineer` à partir des `CA-n`) : [...]
- Bout en bout (parcours critiques, `qa-engineer`) : [...]
- Architecture (frontières à rendre automatiques) : [...]

## 10. Critères d'acceptation
Cochés à la livraison, avec le test qui les prouve.
- [ ] CA-1 : [Critère vérifiable]
- [ ] CA-2 : [Critère vérifiable]

## 11. Découpage en tâches
Une tâche = un appel à `senior-developer`, une branche, puis vérification.
- [ ] T1 : [...] (S/M/L, couvre CA-...)
- [ ] T2 : [...]

## 12. Risques et questions ouvertes
- **Choix par défaut à confirmer** : [...]
- **Dettes** : [...]
- **Questions ouvertes** : [...]

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| | `cadreur` | cadrage | | |
| | `architect` | conception | | |
| | `security-reviewer` | conception | | |
| | `qa-engineer` | plan de test | | |

**Écarts constatés à l'implémentation** : [date, ce qui diffère de la spec, pourquoi, qui a validé]
