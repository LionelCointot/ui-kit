---
name: web-architecture
description: Principes d'architecture et de conception d'applications web. À utiliser pour concevoir ou revoir l'architecture d'une app web, choisir la structure de dossiers, découper en modules/couches, gérer état, authentification, cache, données, déploiement, observabilité ou scalabilité.
---

# Web Architecture

## Démarche
1. Clarifie d'abord les exigences non fonctionnelles : charge, latence, disponibilité, sécurité, budget, taille d'équipe.
2. Choisis l'architecture la plus simple qui répond au besoin. Commence par un monolithe modulaire sauf raison forte ; justifie tout microservice par un ADR.
3. Présente le résultat : diagramme (Mermaid), composants, flux de données, choix techniques, compromis.

## Principes
- **Séparation des couches** : présentation / logique métier / accès aux données. La logique métier ne dépend ni du framework ni de la BDD.
- **Frontières claires** : modules avec interfaces explicites, dépendances à sens unique.
- **Données** : schéma normalisé par défaut, migrations versionnées, index justifiés, jamais d'accès direct à la BDD depuis l'UI.
- **État** : minimise l'état global ; distingue état serveur (cache/requêtes) et état UI local.
- **Auth** : déléguer à une solution éprouvée ; sessions ou tokens courts + refresh ; autorisation vérifiée côté serveur à chaque requête.
- **Configuration** : variables d'environnement, aucun secret dans le code, fichier `.env.example` à jour.
- **Erreurs** : format d'erreur uniforme, pas de fuite de détails internes, logs structurés avec identifiant de corrélation.
- **Observabilité** : logs, métriques, health checks, alertes sur les parcours critiques.
- **Performance** : mesure avant d'optimiser ; cache (HTTP, applicatif) avec stratégie d'invalidation explicite ; pagination systématique.
- **Déploiement** : CI/CD, environnements reproductibles (conteneurs), rollback possible, migrations compatibles avec le déploiement progressif.
- **Évolutivité** : conçois pour 10x la charge actuelle, pas pour 1000x.

## Exemple de stack : .NET + Angular
- Back : métier pur → infrastructure → API (hôte). Détails : `dotnet-best-practices` pour .NET, `clean-code` pour un back TypeScript (cœur pur, I/O injectées).
- Front : composants → store à signaux → client d'API généré depuis l'OpenAPI du back. Détails : skill `angular-best-practices`.
- Contrat : OpenAPI généré automatiquement par le back = source de vérité (skill `api-design`).

## Livrables attendus
Un schéma d'architecture, la liste des décisions (ADR) et les risques identifiés.
