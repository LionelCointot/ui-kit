# Vérifications navigateur du kit

`npm run qa` lance toutes les suites (build de Storybook si une source est plus récente que `dist/storybook/index.json`, suites navigateur par 3 sur un serveur partagé, tests unitaires et statiques en parallèle, `perf` seul à la fin). Un journal par suite dans `.qa-logs/` (`--logs <dossier>`), un résumé OK/KO avec la durée de chaque suite, et `.qa-last.json` (KO par suite et par id).

- `npm run qa -- --failed` : relance les suites KO du dernier passage, limitées aux ids KO quand la suite sait filtrer (`fidelite` : `dNN` ; `motion` : id de story, boucle générale seulement ; `axe`, `axe-autres` : id de story ; `motion-final` : bloc) ; les autres suites sont relancées en entier.
- `npm run qa -- --changed` : suites choisies d'après `git diff --name-only main` et les fichiers non suivis (colonne `surveille` de `run.mjs` ; `snippets` et `controls` seulement si `.storybook/` ou une `*.stories.ts` change).
- `npm run qa -- --only motion,fidelite` : suites nommées (noms dans `tools/qa/run.mjs`) ; `--no-build` saute la construction.
- Sans le lanceur : `node tools/qa/storybook-browser.mjs motion [fragment-d-id…]` (boucle générale seule si un fragment est donné), `axe [fragment… | --hors-mouvement]`, `node tools/qa/motion-fidelity.mjs d10 d37`. Chaque story est chronométrée dans le journal (`TEMPS … ms`). Attentes : `tools/qa/wait.mjs`.
