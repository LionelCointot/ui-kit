// docs/specs/2026-11-messagerie.md (M0, écrit avant le code ; rouge attendu, « en attente du code ») : CA-C1, C5, C10, C12, S6 et architecture, par contrôles statiques.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { PACKAGE_ROOT } from './tokens.mjs';

const ng = path.resolve(PACKAGE_ROOT, '..', 'angular');
const dir = path.join(ng, 'forms/src/message-composer');
const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
const sources = (ext) => (existsSync(dir) ? readdirSync(dir).filter((f) => ext.test(f) && !/\.(spec|stories)\.ts$/.test(f)).map((f) => read(path.join(dir, f))).join('\n') : '');
const css = () => sources(/\.css$/);
const code = () => sources(/\.(ts|html)$/);
const need = (src, what) => assert.ok(src.length > 0, `${what} absent : en attente du code (packages/angular/forms/src/message-composer/)`);
// Retire les var(...) imbriqués et les commentaires : ce qui reste est de la valeur en dur.
const bare = (v) => { let s = v.replace(/\/\*[\s\S]*?\*\//g, ''); for (let p; p !== s;) { p = s; s = s.replace(/var\([^()]*\)/g, ''); } return s; };

test('CA-C10 : tokens du composant (valeurs par défaut de la spec 5.2)', () => {
  const f = path.join(PACKAGE_ROOT, 'src/components/message-composer.tokens.json');
  assert.ok(existsSync(f), 'message-composer.tokens.json absent : en attente du code');
  // Les tokens de mouvement (shake-duration…) vivent dans components/motion.tokens.json.
  const t = { ...JSON.parse(readFileSync(f, 'utf8'))['message-composer'], ...JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'src/components/motion.tokens.json'), 'utf8'))['message-composer'] };
  // Le nom CSS fait foi (--lc-sys-border-width-thin) : le chemin DTCG sépare ses segments par des points.
  const expected = { 'border-style': 'solid', 'border-width': 'sys-border-width-thin', background: 'sys-color-surface-raised', 'shake-distance': 'sys-space-1', 'shake-duration': 'sys-duration-normal' };
  for (const [k, v] of Object.entries(expected)) assert.equal(k === 'border-style' ? t?.[k]?.$value : t?.[k]?.$value?.replace(/^\{|\}$/g, '').replaceAll('.', '-'), v, k);
  assert.match(t?.['border-color']?.$value ?? '', /^\{sys\.color\./, 'border-color : repli sys.color.border-strong');
});

test('CA-C10 : aucun --lc-message-composer-* déclaré sur :host', () => {
  const src = css(); need(src, 'message-composer.component.css');
  const bad = [];
  postcss.parse(src).walkRules((r) => { if (r.selector.includes(':host')) r.walkDecls(/^--lc-message-composer-/, (d) => bad.push(`${r.selector} { ${d.prop} }`)); });
  assert.deepEqual(bad, []);
  assert.match(src, /var\(--lc-message-composer-border-style/, 'le jeton n\'est pas lu');
  const probe = postcss.parse(':host { --lc-message-composer-x: 1 }'); let n = 0; probe.walkRules((r) => { if (r.selector.includes(':host')) r.walkDecls(/^--lc-message-composer-/, () => n++); }); assert.equal(n, 1, 'détecteur défaillant');
});

test('CA-C12 : aucune couleur, durée ni taille en px en dur dans le CSS', () => {
  const src = css(); need(src, 'message-composer.component.css');
  const HARD = /#[0-9a-f]{3,8}\b|\b(rgb|hsl|oklch)a?\(|(?<![\d.])(?!0(ms|s|px)\b)\d*\.?\d+(ms|s|px)\b|cubic-bezier\(|scale\(\s*\d*\.\d/i;
  const found = [];
  postcss.parse(src).walkDecls((d) => { if (HARD.test(bare(d.value))) found.push(`${d.prop}: ${d.value}`); });
  assert.ok(HARD.test('transition: opacity 200ms') && HARD.test('color: #fff') && HARD.test('width: 2px') && !HARD.test(bare('width: var(--a, var(--b, 2px))')), 'motif défaillant');
  assert.deepEqual(found, []);
});

test('spec 5.4 : réduction des animations, forced-colors, zone sûre basse', () => {
  const src = css(); need(src, 'message-composer.component.css');
  assert.match(src, /prefers-reduced-motion:\s*reduce/); assert.match(src, /forced-colors:\s*active/); assert.match(src, /env\(safe-area-inset-bottom/);
});

test('CA-S1 / spec 7 : ni innerHTML, ni style en chaîne, ni URL d\'objet, console seulement en développement', () => {
  const src = code(); need(src, 'sources du composant');
  const bad = src.match(/innerHTML|outerHTML|insertAdjacentHTML|bypassSecurityTrust|\[style\]|\[attr\.style\]|\sstyle=|setAttribute\(\s*['"]style|createObjectURL|document\.write/g) ?? [];
  assert.deepEqual(bad, []);
  if (/console\./.test(src)) assert.match(src, /isDevMode\(\)/, 'console hors isDevMode');
  assert.ok(!/console\.\w+\([^)]*(\.name|value\(\)|text)/.test(src), 'nom de fichier ou texte saisi écrit dans la console');
});

test('CA-C12 : aucun libellé en dur (français) ; les clés LC_LABELS partagées sont réutilisées', () => {
  const src = code(); need(src, 'sources du composant');
  const FR = ['Envoyer', 'Joindre un fichier', 'Déposez vos fichiers', 'Pièces jointes', 'Envoi en cours', 'Retirer', 'Réessayer', 'Échec'];
  assert.deepEqual(FR.filter((s) => src.includes(s)), []);
  assert.deepEqual(src.match(/\s(aria-label|title|placeholder|alt)="[^"{]*[A-Za-zÀ-ÿ]{2,}/g) ?? [], [], 'attribut texte en dur');
  const tpl = [...src.matchAll(/template:\s*`([\s\S]*?)`/g)].map((m) => m[1]).concat(sources(/\.html$/)).join('\n'); // le modèle seul : le TypeScript contient des génériques `>(`
  assert.deepEqual(tpl.replace(/\{\{[\s\S]*?\}\}/g, '').replace(/@[a-z]+[^{]*\{|\}/g, '').match(/>[^<>{}]*[A-Za-zÀ-ÿ]{2,}[^<>{}]*</g) ?? [], [], 'texte en dur dans le modèle');
  for (const k of ['fileUploadRemove', 'fileUploadRetry', 'fileUploadFailed']) assert.ok(src.includes(k), `${k} non réutilisé (même surcharge d'application que lc-file-upload)`);
});

test('CA-C12 : libellés composer* présents en français et en anglais', () => {
  const labels = read(path.join(ng, 'src/lib/core/labels.ts'));
  const fr = labels.slice(labels.indexOf('export const LC_LABELS_FR'), labels.indexOf('export const LC_LABELS_EN'));
  const en = labels.slice(labels.indexOf('export const LC_LABELS_EN'), labels.indexOf('export const LC_LABELS =')); // jusqu'au jeton
  const text = { composerSend: 'Envoyer', composerAttach: 'Joindre un fichier', composerDrop: 'Déposez vos fichiers ici', composerAttachments: 'Pièces jointes', composerSending: 'Envoi en cours…' };
  for (const [k, v] of Object.entries(text)) {
    assert.match(labels, new RegExp(`readonly ${k}:`), `${k} absent de LcLabels (en attente du code)`);
    assert.ok(fr.includes(`${k}: '${v}'`), `${k} fr : « ${v} »`);
    const e = en.match(new RegExp(`${k}: '([^']+)'`)); assert.ok(e && e[1] !== v, `${k} en absent ou non traduit`);
  }
  for (const b of [fr, en]) assert.match(b, /composerRejected: \(/, 'composerRejected(name, reason)');
  assert.match(labels, /readonly composerRejected:/);
});

test('CA-C1 / M1 : icône paperclip dans les icônes par défaut', () => {
  assert.match(read(path.join(ng, 'src/lib/icon/default-icons.ts')), /'paperclip':\s*'<svg/);
});

test('CA-C5 / M1 : file-filter.ts partagé, lc-file-upload l\'utilise sans recopie', () => {
  const ff = read(path.join(ng, 'forms/src/shared/file-filter.ts'));
  assert.match(ff, /export (function|const) matchesAccept/, 'matchesAccept absent (en attente du code)'); assert.match(ff, /export (function|const) filterFiles/);
  const fu = read(path.join(ng, 'forms/src/file-upload/file-upload.component.ts'));
  assert.match(fu, /shared\/file-filter/); assert.ok(!/function matchesAccept/.test(fu), 'matchesAccept encore défini dans lc-file-upload');
});

test('CA-C5 : le spec de lc-file-upload, filet de M1, est resté intact', () => {
  const h = createHash('sha256').update(readFileSync(path.join(ng, 'forms/src/file-upload/file-upload.component.spec.ts'))).digest('hex');
  assert.equal(h, 'dcf51be0474950e2ab73c79acc188af4360fef69e4a0cef537d29dd325123ba5');
});

test('forms : lc-message-composer exporté par le point d\'entrée', () => {
  assert.match(read(path.join(ng, 'forms/src/public-api.ts')), /message-composer\/message-composer\.component/, 'non exporté (en attente du code)');
});

test('CA-S6 : le README dit qu\'accept n\'est pas un contrôle de sécurité', () => {
  const r = read(path.join(dir, 'README.md')) + read(path.join(ng, 'forms/README.md'));
  assert.ok(r.length > 0, 'README absent (en attente du code)');
  assert.match(r, /accept/); assert.match(r, /(n['’]est pas un contrôle de sécurité|pas un contrôle de sécurité|not a security control)/i);
});
