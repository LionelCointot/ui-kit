// CA-15 (docs/specs/2026-11-mouvement.md) : aucune durée, distance, courbe ni échelle en dur dans les fichiers de mouvement (état du code, pas un diff).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './tokens.mjs';

const root = path.resolve(PACKAGE_ROOT, '..', '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const FILES = [
  'packages/angular/navigation/src/tabs/tabs.component.css', 'packages/angular/navigation/src/tabs/tabs.component.ts',
  'packages/angular/navigation/src/nav-list/nav-list.component.css', 'packages/angular/navigation/src/nav-list/nav-list.component.ts',
  'packages/angular/navigation/src/nav-list/nav-item.component.css', 'packages/angular/navigation/src/nav-list/nav-item.component.ts',
  'packages/angular/data/src/data-table/data-table.component.css', 'packages/angular/data/src/data-table/data-table.component.ts',
  'packages/angular/styles/ui-angular.css', // CA-R2 : chemin réel (l'ancien n'existait pas)
  // CA-R2 : fichiers touchés par 2026-11-mouvement-ios.md
  'packages/angular/layout/src/disclosure/disclosure.component.css', 'packages/angular/navigation/src/nav-group/nav-group.component.css', 'packages/angular/layout/src/app-shell/app-shell.component.css',
  'packages/angular/overlay/src/dialog/dialog.component.css', 'packages/angular/overlay/src/drawer/drawer.component.css',
  ...git('ls-files', 'packages/angular/overlay/src/sheet').split('\n').filter((f) => /\.(css|ts)$/.test(f) && !/\.(spec|stories)\.ts$/.test(f)),
  ...git('ls-files', 'packages/angular/src/lib/button', 'packages/angular/navigation/src/menu', 'packages/angular/forms/src/combobox', 'packages/angular/forms/src/date-input').split('\n').filter((f) => /\.(css|ts)$/.test(f) && !/\.(spec|stories)\.ts$/.test(f)),
];
// Durées, courbes, échelles et toute distance en px, sauf 0px et 1px (bords, zones masquées) ; les requêtes de média (@media, matchMedia) fixent des ruptures, pas du mouvement.
const HARD = /\d+(\.\d+)?(ms|s)\b|cubic-bezier\(|scale\(0\.|(?<![\d.])(?!(?:0|1)px\b)\d*\.?\d+px\b/;
const MEDIA = /@media|\((?:min|max)-(?:width|height):/;

test('CA-R2 : les fichiers contrôlés existent (un chemin faux rendait le contrôle vide)', () => {
  const missing = FILES.filter((f) => !existsSync(path.join(root, f)) && !f.includes('/sheet/'));
  assert.deepEqual(missing, []);
  assert.ok(FILES.some((f) => f.includes('/sheet/')), 'lc-sheet : en attente du code (packages/angular/overlay/src/sheet/)');
});

test('CA-15 : aucune valeur de mouvement en dur dans les fichiers de mouvement', () => {
  const found = [];
  let scanned = 0;
  for (const file of FILES) {
    if (!existsSync(path.join(root, file))) continue;
    for (const line of readFileSync(path.join(root, file), 'utf8').split('\n')) {
      scanned += 1;
      const code = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '').replace(/var\(--lc-[^)]*\)/g, '');
      if (!MEDIA.test(code) && HARD.test(code)) found.push(`${file} : ${line.trim()}`);
    }
  }
  assert.ok(scanned > 100, `contrôle vide : ${scanned} lignes lues`);
  assert.ok(HARD.test('transition: opacity 200ms') && HARD.test('translateY(8px)') && HARD.test('cubic-bezier(0,0,1,1)') && HARD.test('scale(0.97)') && HARD.test('margin: 12px') && !HARD.test('width: 1px') && !HARD.test('min(0px, 1px)'), 'motif défaillant');
  assert.deepEqual(found, []);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// CA-2 (docs/specs/2026-12-mouvement-v2.md, T1 ; ADR 0011 décision 6) : aucune valeur de mouvement en dur dans tout `packages/angular/**`
// (`.css` et `.ts`, hors `*.spec.ts`, `*.stories.ts`, `*.d.ts`, `testing/`), sauf liste blanche écrite : chemin + motif + raison + tâche qui la fait disparaître.
// « permanent » = constante propre au composant ou seuil de geste, admis par l'ADR 0011 décision 6 (constante nommée et documentée).
// ---------------------------------------------------------------------------------------------------------------------------------------------
const ANGULAR = path.join(root, 'packages', 'angular');
const VAR_OR_INTERPOLATION = /var\(--lc-[^()]*(?:\([^()]*\)[^()]*)*\)|\$\{[^}]*\}/g;
// Un motif par nature de valeur ; `ts: true` = fichiers .ts seulement ; `unlessTransform` : déjà couvert par « transform numérique » sur la même ligne.
const MOTIFS = {
  durée: { re: [/(?<![\w.#-])(?!0(?:ms|s)\b)\d*\.?\d+(?:ms|s)\b/] },
  'cubic-bezier': { re: [/cubic-bezier\(/] },
  'mot-clé ease': { re: [/(?<![\w-])ease(?:-in(?:-out)?|-out)?(?![\w-])/] },
  'linear()': { re: [/(?<![\w.-])linear\(\s*-?\d/] },
  angle: { re: [/(?<![\w.#-])(?!0(?:deg|turn|rad)\b)\d*\.?\d+(?:deg|turn|rad)\b/], unlessTransform: true },
  'transform numérique': { transform: true },
  'durée en TypeScript': { ts: true, re: [/\b\w*(?:duration|delay|stagger)\w*\s*[:=]\s*-?(?!0(?:ms|s)?\b)\d/i, /\b\w*(?:_MS|Ms)\s*[:=]\s*-?(?!0\b)\d/] },
  setTimeout: { ts: true, re: [/\bsetTimeout\(/] },
  'longueur dans @keyframes': { keyframes: true, unlessTransform: true },
};
const TRANSFORM_FN = /(?:translate(?:[XYZ]|3d)?|rotate[XYZ]?|scale[XYZ]?|skew[XY]?)\(([^)]*)\)/g;
const TRANSFORM_PROP = /(?:^|[\s;{])(?:translate|rotate|scale):\s*([^;}]*)/g;
const NUMBER = String.raw`(?<![\w.#-])-?\d*\.?\d+`;
const LENGTH = new RegExp(`${NUMBER}(?:px|rem|em|%|deg|vh|dvh|vw|turn)\\b`);
// Argument de translate / rotate / scale : tout nombre avec unité (sauf 0) ; pour scale, tout nombre sauf 0 et 1.
const badArgs = (scale, args) => (scale
  ? new RegExp(NUMBER).test(args.replace(/(?<![\w.#-])-?[01](?![.\d])/g, ''))
  : LENGTH.test(args.replace(/(?<![\w.#-])0(?:px|%|rem|em|deg)?(?![\d.])/g, '')));

/** Valeurs de mouvement en dur d'un fichier : [{ line, motif, text }]. Pur, pour être testé sur des exemples. */
export function scanSource(file, source) {
  const isTs = file.endsWith('.ts');
  const hits = [];
  let depth = 0;
  let keyframesAt = -1;
  source.split('\n').forEach((raw, i) => {
    const code = raw.replace(/\/\*.*?\*\//g, '').replace(/(?<!:)\/\/.*$/, '').replace(/^\s*\*.*$/, '');
    const text = code.replace(VAR_OR_INTERPOLATION, 'VAR');
    if (/@keyframes/.test(text)) keyframesAt = depth;
    const add = (motif) => hits.push({ line: i + 1, motif, text: raw.trim() });
    const transformHit = [...text.matchAll(TRANSFORM_FN)].some((m) => badArgs(m[0].startsWith('scale'), m[1])) || [...text.matchAll(TRANSFORM_PROP)].some((m) => badArgs(/scale/.test(m[0]), m[1]));
    for (const [motif, def] of Object.entries(MOTIFS)) {
      if (def.ts && !isTs) continue;
      if (def.transform ? transformHit : def.keyframes ? keyframesAt >= 0 && !/@keyframes/.test(text) && /(?<![\w.#-])\d*\.?\d+(?:px|rem)\b/.test(text.replace(/(?<![\w.#-])0(?:px|rem)\b/g, '')) : def.re.some((re) => re.test(text))) {
        if (def.unlessTransform && transformHit) continue;
        add(motif);
      }
    }
    for (const c of code) {
      if (c === '{') depth += 1;
      if (c === '}') { depth -= 1; if (keyframesAt >= 0 && depth <= keyframesAt) keyframesAt = -1; }
    }
  });
  return hits;
}

const sourceFiles = () => readdirSync(ANGULAR, { recursive: true }).map(String).filter((f) => /\.(css|ts)$/.test(f) && !/(^|\/)(node_modules|dist|testing)\//.test(f) && !/\.(spec|stories|d)\.ts$/.test(f)).sort();

// Liste blanche. `contient` : fragment de la ligne ; `tache` : Tn de §11 qui doit supprimer l'entrée, ou « permanent ».
const WHITELIST = [
  // Angles de dégradé (hachures, chevrons en fond) : décor, pas du mouvement.
  { file: 'styles/ui-angular.css', motif: 'angle', contient: 'linear-gradient(45deg', raison: 'angle de dégradé du chevron de select (décor)', tache: 'permanent' },
  { file: 'styles/ui-angular.css', motif: 'angle', contient: 'linear-gradient(135deg', raison: 'angle de dégradé du chevron de select (décor)', tache: 'permanent' },
  { file: 'charts/src/base/chart-frame.component.css', motif: 'angle', contient: '45deg', raison: 'angle des hachures (décor)', tache: 'permanent' },
  { file: 'data/src/timeline-bar/timeline-bar.component.css', motif: 'angle', contient: '45deg', raison: 'angle des hachures (décor)', tache: 'permanent' },
  // Orientation d'état et tours complets : constantes de composant (ADR 0011 décision 6).
  { file: 'data/src/data-table/column-filter.component.css', motif: 'transform numérique', contient: 'rotate(360deg)', raison: 'tour complet d\'un indicateur de chargement', tache: 'permanent' },
  { file: 'forms/src/message-composer/message-composer.component.css', motif: 'transform numérique', contient: 'rotate(360deg)', raison: 'tour complet d\'un indicateur de chargement', tache: 'permanent' },
  { file: 'src/lib/button/button.component.css', motif: 'transform numérique', contient: 'rotate(1turn)', raison: 'tour complet du spinner du bouton en chargement', tache: 'permanent' },
  { file: 'src/lib/spinner/spinner.component.css', motif: 'transform numérique', contient: 'rotate(1turn)', raison: 'tour complet du spinner', tache: 'permanent' },
  { file: 'data/src/data-table/data-table.component.css', motif: 'transform numérique', contient: 'rotate(180deg)', raison: 'orientation du chevron (état)', tache: 'permanent' },
  { file: 'forms/src/combobox/combobox.component.css', motif: 'transform numérique', contient: 'rotate(180deg)', raison: 'orientation du chevron (état)', tache: 'permanent' },
  { file: 'layout/src/disclosure/disclosure.component.css', motif: 'transform numérique', contient: 'rotate(90deg)', raison: 'orientation du chevron (état)', tache: 'permanent' },
  { file: 'navigation/src/nav-group/nav-group.component.css', motif: 'transform numérique', contient: 'rotate(90deg)', raison: 'orientation du chevron (état)', tache: 'permanent' },
  { file: 'overlay/src/toggletip/toggletip.component.css', motif: 'transform numérique', contient: 'rotate(45deg)', raison: 'forme de la flèche (carré tourné)', tache: 'permanent' },
  // Valeurs à remplacer par des tokens (§5.4.1) : tâche à confirmer par l'orchestrateur quand §11 ne nomme pas le composant.
  { file: 'forms/src/slider/slider.component.css', motif: 'transform numérique', contient: 'scale(1.1)', raison: 'échelle du pouce du slider, à recaler sur un token (§5.4.1 : « valeurs recalées sur les tokens »)', tache: 'T8' },
  { file: 'src/lib/skeleton/skeleton.component.css', motif: 'mot-clé ease', contient: 'ease-in-out', raison: 'courbe de la pulsation, à porter par un token (§5.2 skeleton.*)', tache: 'T8' },
  { file: 'src/lib/spinner/spinner.component.css', motif: 'mot-clé ease', contient: 'ease-in-out', raison: 'courbe de la pulsation, à porter par un token (§5.2 spinner.*)', tache: 'T8' },
  { file: 'navigation/src/stepper/stepper.component.css', motif: 'durée', contient: 'animation-duration: 1ms', raison: 'coupure locale sous prefers-reduced-motion (pas un mouvement)', tache: 'permanent' },
  { file: 'charts/src/builders/shared.ts', motif: 'durée en TypeScript', contient: 'animationDuration', raison: 'durée ECharts, à lire dans les tokens chart.*', tache: 'T11' },
  { file: 'charts/src/builders/sparkline.builder.ts', motif: 'durée en TypeScript', contient: 'animationDuration', raison: 'durée ECharts, à lire dans les tokens chart.*', tache: 'T11' },
  { file: 'charts/src/components/chart.component.ts', motif: 'durée en TypeScript', contient: 'animationDuration', raison: 'durée ECharts, à lire dans les tokens chart.*', tache: 'T11' },
  { file: 'feedback/src/message-thread/message-thread-motion.ts', motif: 'durée en TypeScript', contient: 'MAX_STAGGER_MS', raison: 'plafond de cascade propre au fil, remplacé par stagger-cap et le runtime', tache: 'T7' },
  { file: 'feedback/src/toast/toast.service.ts', motif: 'setTimeout', contient: 'this.dismiss', raison: 'minuteur de fermeture du toast ; la sortie animée arrive avec toast.*', tache: 'T10' },
  // Temporisations et seuils fonctionnels : pas de mouvement.
  { file: 'feedback/src/toast/toast.service.ts', motif: 'durée en TypeScript', contient: 'DEFAULT_DURATION_MS', raison: 'durée de vie du toast (conservée par §5.2), pas une durée de mouvement', tache: 'permanent' },
  { file: 'feedback/src/message-thread/message-thread-grouping.ts', motif: 'durée en TypeScript', contient: 'GROUP_GAP_MS', raison: 'écart de regroupement des messages (donnée, pas un mouvement)', tache: 'permanent' },
  { file: 'geo/src/geo-options.ts', motif: 'durée en TypeScript', contient: 'timeoutMs', raison: 'délai d\'expiration réseau', tache: 'permanent' },
  { file: 'forms/src/combobox/combobox.component.ts', motif: 'durée en TypeScript', contient: 'ANNOUNCE_DELAY_MS', raison: 'délai d\'annonce au lecteur d\'écran', tache: 'permanent' },
  { file: 'forms/src/combobox/combobox.component.ts', motif: 'durée en TypeScript', contient: 'DEFAULT_DEBOUNCE_MS', raison: 'temporisation de la saisie', tache: 'permanent' },
  { file: 'forms/src/combobox/combobox.component.ts', motif: 'setTimeout', contient: 'debounceTimer', raison: 'temporisation de la saisie', tache: 'permanent' },
  { file: 'forms/src/combobox/combobox.component.ts', motif: 'setTimeout', contient: 'announceTimer', raison: 'délai d\'annonce au lecteur d\'écran', tache: 'permanent' },
  { file: 'navigation/src/swipe-panels/swipe-panels.component.ts', motif: 'durée en TypeScript', contient: 'PROGRAMMATIC_SCROLL_MAX_MS', raison: 'seuil de défilement programmatique (constante nommée)', tache: 'permanent' },
  { file: 'navigation/src/swipe-panels/swipe-panels.component.ts', motif: 'setTimeout', contient: 'mutedTimer', raison: 'fin du défilement programmatique (comportement, pas un mouvement)', tache: 'permanent' },
  { file: 'overlay/src/sheet/sheet-gesture.ts', motif: 'durée en TypeScript', contient: 'SHEET_FLICK_WINDOW_MS', raison: 'fenêtre de mesure de la vitesse du geste (seuil de geste, ADR 0011 décision 6)', tache: 'permanent' },
  { file: 'overlay/src/tooltip/tooltip.directive.ts', motif: 'durée en TypeScript', contient: 'SHOW_DELAY_MS', raison: 'délai d\'affichage de l\'info-bulle (comportement)', tache: 'permanent' },
  { file: 'overlay/src/tooltip/tooltip.directive.ts', motif: 'durée en TypeScript', contient: 'HIDE_GRACE_MS', raison: 'délai de grâce avant masquage de l\'info-bulle (comportement)', tache: 'permanent' },
  { file: 'overlay/src/tooltip/tooltip.directive.ts', motif: 'setTimeout', contient: 'this.timer', raison: 'délais d\'affichage et de masquage de l\'info-bulle (comportement)', tache: 'permanent' },
  { file: 'theme-builder/src/shared/file-io.ts', motif: 'setTimeout', contient: 'view.setTimeout', raison: 'libération de l\'URL d\'un export de fichier', tache: 'permanent' },
];

test('CA-2 : les motifs interdits détectent les valeurs en dur et laissent passer tokens, 0 et 1', () => {
  const motifs = (file, line) => scanSource(file, line).map((h) => h.motif);
  assert.deepEqual(motifs('a.css', 'transition: opacity 200ms;'), ['durée']);
  assert.deepEqual(motifs('a.css', 'animation: x .3s ease-out;'), ['durée', 'mot-clé ease']);
  assert.deepEqual(motifs('a.css', 'transition-timing-function: cubic-bezier(0, 0, 1, 1);'), ['cubic-bezier']);
  assert.deepEqual(motifs('a.css', 'transform: translateY(8px) scale(0.97);'), ['transform numérique']);
  assert.deepEqual(motifs('a.css', 'translate: 0 12px;'), ['transform numérique']);
  assert.deepEqual(motifs('a.css', 'rotate: 6deg;'), ['transform numérique']);
  assert.deepEqual(motifs('a.css', 'background: conic-gradient(from 90deg, red, blue);'), ['angle']);
  assert.deepEqual(motifs('a.ts', 'const o = { duration: 300 };'), ['durée en TypeScript']);
  assert.deepEqual(motifs('a.ts', 'const FADE_DELAY_MS = 120;'), ['durée en TypeScript']);
  assert.deepEqual(motifs('a.ts', 'setTimeout(() => done(), 50);'), ['setTimeout']);
  assert.deepEqual(motifs('a.css', '@keyframes k {\n from { translate: 0 20px; }\n}'), ['transform numérique']);
  assert.deepEqual(motifs('a.css', '@keyframes k {\n from { top: 20px; }\n}'), ['longueur dans @keyframes']);
  assert.deepEqual(motifs('a.css', 'transition: opacity var(--lc-sys-duration-fast) var(--lc-sys-easing-standard);'), []);
  assert.deepEqual(motifs('a.css', 'transform: translateY(var(--lc-sys-motion-offset-md)) scale(1);'), []);
  assert.deepEqual(motifs('a.css', 'transform: translate(0, 0) rotate(0deg); transition-delay: 0s;'), []);
  assert.deepEqual(motifs('a.ts', 'el.style.transform = `translateY(${dy}px)`; // 200ms dans un commentaire'), []);
  assert.deepEqual(motifs('a.ts', 'const items = 5; const delayMs = 0;'), []);
  assert.deepEqual(motifs('a.css', 'padding: 12px; margin: 0 8px;'), []);
});

const sources = () => sourceFiles().map((file) => ({ file, hits: scanSource(file, readFileSync(path.join(ANGULAR, file), 'utf8')), }));
const allowed = (file, hit) => WHITELIST.some((w) => w.file === file && w.motif === hit.motif && hit.text.includes(w.contient));

test('CA-2 : aucune valeur de mouvement en dur dans packages/angular/** hors liste blanche', () => {
  const files = sources();
  assert.ok(files.length > 200, `contrôle vide : ${files.length} fichiers lus`);
  const found = files.flatMap(({ file, hits }) => hits.filter((h) => !allowed(file, h)).map((h) => `${file}:${h.line} [${h.motif}] ${h.text.slice(0, 100)}`));
  assert.deepEqual(found, []);
});

test('CA-2 : la liste blanche est complète (chemin, motif, raison, tâche) et sans entrée périmée', () => {
  const files = sources();
  for (const w of WHITELIST) {
    assert.ok(w.file && w.motif in MOTIFS && w.contient && w.raison, `entrée incomplète : ${JSON.stringify(w)}`);
    assert.match(w.tache, /^(permanent|T\d{1,2}[abc]?)$/, `tâche : ${JSON.stringify(w)}`);
    assert.ok(files.some(({ file, hits }) => file === w.file && hits.some((h) => h.motif === w.motif && h.text.includes(w.contient))), `entrée périmée (à supprimer) : ${w.file} [${w.motif}] ${w.contient}`);
  }
});
