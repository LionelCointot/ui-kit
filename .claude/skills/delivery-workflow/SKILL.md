---
name: delivery-workflow
description: Workflow de livraison orchestré par la session principale avec huit rôles (cadreur, architect, ui-ux-designer, novice-user, security-reviewer, senior-developer, qa-engineer, code-reviewer), appelés selon un tri de départ, du cadrage à la PR. À utiliser dès qu'une tâche modifie le repo (feature, correctif, refactoring, évolution d'API ou d'écran), quand l'utilisateur dit "implémente", "corrige", "livre", "développe", "fais la tâche Tn de la spec", ou demande qui fait quoi entre les rôles.
---

# Delivery Workflow

## Principes
- **Un seul document par fonctionnalité : la spec** (`docs/specs/`). Chaque spécialiste l'enrichit sous son angle avant le code, puis vérifie le résultat sous le même angle.
- **La session principale est l'auteur et l'orchestrateur** : elle cadre avec l'utilisateur, écrit la spec, découpe, délègue, intègre les rendus et tient les portes. Elle ne code pas elle-même, sauf retouche d'une ligne. Elle seule parle à l'utilisateur : toute question d'un rôle remonte par son rendu.
- **Un rôle (agent) apporte un regard indépendant ; un skill apporte un savoir-faire.** On crée un rôle quand il faut quelqu'un qui n'a pas participé à ce qu'il juge. Le savoir commun vit dans les skills.
- **Ce qui se vérifie par une commande ne se confie pas à une consigne** : `scripts/check.sh`, l'intégration continue et `CONSTRAINTS.md` portent la barre de qualité.
- **Le travail mécanique passe par un script relu**, pas par un agent (déplacement de fichiers, renommage en masse).

## Rôles (`.claude/agents/`)

| Rôle | Fait | Ne fait pas |
|---|---|---|
| `cadreur` | gardien du besoin : compare la fiche de cadrage, puis la spec, puis le résultat à la demande mot pour mot | parler à l'utilisateur, rédiger, coder |
| `architect` | relit la conception puis le code : frontières, interfaces, données, extensibilité, simplicité | écrire la spec à la place de son auteur, coder |
| `ui-ux-designer` | triage UI, exploration (2 ou 3 directions), brief (`impeccable`), conformité des écrans | code métier, trancher entre les directions |
| `novice-user` | parcourt le brief puis l'écran réel comme une personne qui ne connaît pas le domaine | lire le code ou la spec, proposer une solution |
| `security-reviewer` | données, droits, cas d'abus : critères testables avant le code, revue du diff après | corriger le code, accepter un risque |
| `senior-developer` | code de production et **ses tests unitaires**, une tâche par appel | toucher aux tests d'acceptation, valider sa livraison |
| `qa-engineer` | plan de test, **tests d'acceptation (`CA-n`) et de bout en bout**, preuve de chaque critère, verdict GO / NO-GO | code de production, juger la qualité du code |
| `code-reviewer` | juge le code livré : lisibilité, simplicité (contrôle de `ponytail`), conventions, périmètre, tests du développeur | prouver le comportement, corriger le code |

Modèle : **sonnet** par défaut ; **haiku** pour la recherche dans le code (agent intégré `Explore`) et le triage UI ; **opus** seulement sur accord de l'utilisateur, après un échec en sonnet sur une conception ou un bug difficile. Remonter d'un cran après un échec plutôt que relancer à l'identique.

## Phase 0 : tri (session principale, toujours)
Deux décisions, écrites dans la fiche de cadrage de la spec ou annoncées à l'utilisateur.

**La taille**

| Palier | Quand | Rôles appelés |
|---|---|---|
| Correctif | changement local et évident, aucun nouveau comportement visible, ni contrat d'API, ni données, ni architecture | `senior-developer` (test qui échoue, puis correctif) → `code-reviewer` |
| Tâche | une tâche `Tn` d'une spec déjà validée | phases 3 et 4 |
| Fonctionnalité | besoin nouveau ou évolution non triviale | phases 1 à 5 |

Un changement de texte affiché ou d'ordre des informations n'est pas un correctif : il ouvre l'angle « écran ».

**Les angles** (un angle ouvert appelle son rôle en phase 2 puis en phase 4)

| Angle | S'ouvre quand | Rôle |
|---|---|---|
| Architecture | nouveau module, nouvelle dépendance ou interface, changement du modèle de données ou d'un contrat d'API, décision structurante | `architect` |
| Écran | la tâche change ce que l'utilisateur voit ou manipule (définition dans `frontend-guidelines`) | `ui-ux-designer`, `novice-user` |
| Sécurité et données | entrée utilisateur, authentification, droits, fichiers, données personnelles, secrets, service extérieur, stockage | `security-reviewer` |

Dans le doute, l'angle est ouvert. Un angle fermé se justifie en une ligne dans la spec.

## Phases et portes

| # | Phase | Qui | Porte de sortie |
|---|---|---|---|
| 1 | Cadrage | session principale avec l'utilisateur, puis `cadreur` (mode cadrage) | fiche de cadrage confirmée par l'utilisateur ; s'il y a un écran : utilisateur principal confirmé dans `PRODUCT.md` |
| 2 | Conception | session principale (skill `spec-writer`, `adr`) ; relectures en parallèle du brouillon : `architect`, `security-reviewer`, `qa-engineer` (plan de test), `cadreur` (mode spec) ; écran : `ui-ux-designer` puis `novice-user` sur le brief | constats intégrés ou tranchés ; **spec validée par l'utilisateur**, ADR acceptés |
| 3 | Réalisation | `qa-engineer` (tests d'acceptation de la tâche) et `senior-developer` (code et tests unitaires), une tâche par appel, une branche par tâche | `FAIT` avec la sortie du contrôle complet ; tests d'acceptation de la tâche écrits |
| 4 | Vérification | en parallèle sur le diff : `qa-engineer` (vérification), `code-reviewer`, et les rôles des angles ouverts | `GO` de la QA, `APPROUVÉ` du relecteur, aucun bloquant des angles ; écran : `CONFORME` et test novice `COMPRIS` |
| 5 | Livraison | `cadreur` (mode livraison, une fois par fonctionnalité), `code-reviewer` (audit de simplification, une fois par fonctionnalité), puis session principale | critères `CA-n` cochés dans la spec avec leur preuve, écarts écrits ; liste de ce que la fonctionnalité a rendu inutile, une preuve par recommandation (skill `simplification-audit`), soumise à l'utilisateur ; PR décrite (`pr-description`) ; commit et push selon l'accord de l'utilisateur |

### Phase 1 : cadrage
- Besoin flou : **une question à la fois**, fermée quand c'est possible, jusqu'à pouvoir écrire le besoin en trois phrases. Puis deux ou trois approches avec leurs compromis et une recommandation ; l'utilisateur choisit.
- La fiche de cadrage (section 0 de la spec) garde **les mots de l'utilisateur**, les objectifs, les non-objectifs, les décisions prises, la taille et les angles.
- `cadreur` reçoit ces mots tels quels. Ses questions sont posées à l'utilisateur avant de concevoir.

### Phase 2 : conception
- Nouvel écran, nouveau parcours ou refonte : exploration d'abord (voir « Écrans »), **direction choisie par l'utilisateur** avant d'écrire la spec.
- La session principale écrit le brouillon complet, puis lance les relecteurs **dans le même message** : ils sont indépendants. Chacun reçoit le brouillon et rend des constats et le texte à ajouter à sa section.
- La session principale intègre. Un désaccord entre un relecteur et la conception, ou entre deux relecteurs, devient une question pour l'utilisateur : jamais de décision silencieuse.
- La section « Relectures et écarts » de la spec garde la trace : qui a relu, son statut, ce qui a été retenu ou écarté.

### Phase 3 : réalisation
- Dès la spec validée, `qa-engineer` écrit les tests d'acceptation de la tâche à partir de la spec seule ; ils échouent tant que le code n'existe pas. En parallèle du développeur quand les deux ne touchent pas les mêmes fichiers.
- `senior-developer` reçoit une tâche, écrit le code et ses tests unitaires, et rend la sortie du contrôle complet.

### Phase 4 : vérification
- Tous les rôles concernés partent **dans le même message**, sur le même diff. La session principale fusionne : un seul bloquant suffit au NO-GO.
- Une étape n'est jamais sautée parce que la précédente est verte : la liste des rôles vient du tri, pas de l'humeur du moment.

## Qui écrit quels tests

| Niveau | Auteur | Source | Règle |
|---|---|---|---|
| Unitaire (fonction, classe, composant isolé) | `senior-developer` | le code qu'il écrit | toute logique nouvelle non triviale ; bug : le test qui échoue d'abord |
| Acceptation (`CA-n`, au niveau API, service ou composant) | `qa-engineer` | la spec seule | écrit avant ou pendant le code ; porte l'identifiant du critère |
| Bout en bout (parcours) | `qa-engineer` | la spec et le brief | parcours critiques seulement |
| Architecture (frontières, imports interdits) | `qa-engineer`, sur proposition de `architect` | ADR et règles de `CLAUDE.md` | échoue si une frontière est franchie |

Le développeur ne modifie jamais un test d'acceptation ou de bout en bout. Personne ne désactive ni n'assouplit un test.

## Contrat de passage de relais
**Entrée (fiche de tâche, ≤ 15 lignes)** : objectif ; mode du rôle ; spec et critères visés (`CA-n`) ; périmètre (fichiers et dossiers, hors périmètre) ; contraintes (ADR, conventions) ; rendu attendu ; pour `cadreur`, la demande de l'utilisateur mot pour mot. Le sous-agent part de zéro : pas d'historique de conversation.

Recopier dans chaque fiche d'un rôle qui explore du code : « Si `graphify-out/graph.json` existe, lance `graphify query "<question>"` avant tout grep ou lecture de fichier ; ne lis ensuite que les lignes localisées. Sans graphe, grep et lecture directe. »

**Sortie (tout rôle)** : une ligne de statut, le détail défini dans l'agent, puis **Questions pour l'utilisateur** (ou « aucune »). Une preuve est une sortie réelle de commande, jamais « les tests passent ».

## Écrans : exploration et test novice
- **Pourquoi** : un écran exact peut rester incompréhensible. Sans utilisateur confirmé, sans alternative et sans regard neuf, le designer conçoit pour un expert.
- **Exploration** : obligatoire pour un nouvel écran, un nouveau parcours ou une refonte ; inutile pour une retouche. Les directions diffèrent par leur structure. Maquettes HTML dans `docs/design/explorations/<AAAA-MM>-<slug>/` ; la session principale les montre à l'utilisateur et attend son choix.
- **Cadre visuel** : si le projet a le skill `ui-kit`, le designer et le développeur partent du catalogue du kit ; un composant générique manquant se demande au kit.
- **Test novice** : une mise en situation concrète et, dans l'ordre du parcours, les textes du brief ou les captures de l'écran (360 et 1280 px, une par étape). Chaque test se fait avec un **agent neuf**. `novice-user` ne reçoit ni la spec, ni `PRODUCT.md`, ni le code.

## Boucles de retour
- **NO-GO, `CHANGEMENTS REQUIS`, non-conformité ou risque bloquant** → `senior-developer` reçoit les constats numérotés **tels quels**, ne corrige que ceux-là → les rôles qui avaient un bloquant revérifient. Après 3 allers-retours : arrêt et escalade à l'utilisateur.
- **Test novice `BLOQUÉ`** → avant le code : `ui-ux-designer` corrige le brief ; après le code : `senior-developer` avec les constats → test refait avec un agent neuf.
- **Écart de spec** découvert par un rôle (`BLOQUÉ`) → la session principale amende la spec avec l'utilisateur.
- **`cadreur` rend `ÉCARTS`** → retour à la phase concernée ; un ajout non demandé se retire ou se fait valider par l'utilisateur.

## Contrôles de la session principale (légers)
- `git diff --stat` : seuls les fichiers du périmètre ont changé ; aucun test d'acceptation dans le rendu du développeur, aucun fichier de production dans celui de la QA.
- Les preuves citées correspondent au commit courant ; en cas de doute, relancer une seule commande, pas toute la QA.
- À la livraison : critères `CA-n` cochés dans la spec, section « Relectures et écarts » à jour, `CLAUDE.md` et le plan du projet mis à jour si les commandes ou l'avancement ont changé.

## Skills de méthode
- `systematic-debugging` : bug dont la cause n'est pas évidente (`senior-developer`, `qa-engineer`).
- `verification-before-completion` : avant tout `FAIT`, `GO` ou annonce à l'utilisateur, la commande qui le prouve a été relancée et sa sortie lue.
