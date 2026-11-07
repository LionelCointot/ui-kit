---
name: security-checklist
description: Revue de sécurité applicative (OWASP, avec précisions .NET / ASP.NET Core et Angular). À utiliser quand l'utilisateur parle de sécurité, vulnérabilités, OWASP, authentification, autorisation, secrets, CORS, validation d'entrées, upload, ou avant une mise en production d'une feature exposée à des utilisateurs.
---

# Checklist sécurité

Complémentaire de la commande intégrée `/security-review` (analyse du diff courant).

## OWASP Top 10, adapté
- **Contrôle d'accès** : autorisation vérifiée côté serveur sur chaque ressource (pas seulement masquée dans l'UI) ; pas d'accès aux objets d'un autre utilisateur par simple changement d'identifiant (IDOR).
- **Authentification** : solution éprouvée (ASP.NET Core Identity, OIDC) ; mots de passe hachés (Argon2/bcrypt/PBKDF2) ; tokens courts + refresh ; cookies `HttpOnly`, `Secure`, `SameSite`.
- **Injection** : requêtes paramétrées / EF Core, jamais de SQL concaténé (`FromSqlRaw` avec interpolation interdit, utiliser `FromSql` paramétré) ; jamais de commande système avec une entrée utilisateur ; chemins de fichiers construits à partir d'identifiants validés (pas de `../`).
- **Validation** : tout corps de requête validé par schéma côté serveur (FluentValidation) ; limites de taille ; uploads vérifiés (type réel, taille, stockage hors racine web).
- **Secrets** : aucun secret dans le code, `appsettings.json` ou l'historique git ; `dotnet user-secrets` en dev, variables d'environnement / coffre ailleurs ; rotation possible.
- **Dépendances** : `dotnet list package --vulnerable`, `npm audit` ; versions épinglées ; peu de dépendances.
- **Données sensibles** : HTTPS ; chiffrement au repos si nécessaire ; aucune donnée personnelle dans les logs.
- **Erreurs** : ProblemDetails générique côté client pour les 500 ; détails seulement dans les logs ; pas de page d'exception développeur en production.
- **Configuration** : CORS par liste blanche explicite (jamais `AllowAnyOrigin` avec credentials) ; rate limiting (`AddRateLimiter`) ; en-têtes de sécurité (CSP, HSTS, `X-Content-Type-Options`).
- **SSRF / redirections** : liste blanche pour toute URL fournie par l'utilisateur.

## Angular
- Ne jamais contourner l'assainissement : `bypassSecurityTrust*` et `[innerHTML]` uniquement sur du contenu maîtrisé, justifié en commentaire.
- Aucun secret ni clé privée dans le bundle (tout ce qui est dans le front est public).
- Jetons : préférer un cookie `HttpOnly` à `localStorage` ; intercepteur qui n'envoie le jeton qu'à `API_BASE_URL`.
- Guards de route = confort UX, jamais une protection : le back revérifie.

## Sortie
Liste de constats avec : sévérité (Critique / Haute / Moyenne / Basse), emplacement `fichier:ligne`, risque concret (scénario d'attaque), correction recommandée. Terminer par un résumé et les points à tester manuellement.
