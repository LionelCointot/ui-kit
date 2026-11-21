// docs/specs/2026-11-fil-de-messages.md (F0, écrit avant le code ; rouge attendu, « en attente du code ») : CA-T11 (statique), CA-T18, CA-T19 (statique) et architecture, par contrôles statiques.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { PACKAGE_ROOT } from './tokens.mjs';

const ng = path.resolve(PACKAGE_ROOT, '..', 'angular');
const dir = path.join(ng, 'feedback/src/message-thread');
const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
const files = (d, ext) => (existsSync(d) ? readdirSync(d, { recursive: true }).filter((f) => ext.test(f) && !/\.spec\.ts$/.test(f)).map((f) => path.join(d, f)) : []);
const sources = (ext) => files(dir, ext).map(read).join('\n');
const css = () => sources(/\.css$/);
const code = () => sources(/\.(ts|html)$/);
const need = (src, what) => assert.ok(src.length > 0, `${what} absent : en attente du code (packages/angular/feedback/src/message-thread/)`);
// Retire les var(...) imbriqués et les commentaires : ce qui reste est de la valeur en dur.
const bare = (v) => { let s = v.replace(/\/\*[\s\S]*?\*\//g, ''); for (let p; p !== s;) { p = s; s = s.replace(/var\([^()]*\)/g, ''); } return s; };
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('CA-T11 : aucune couleur, durée, taille ni courbe en dur dans le CSS (hors jetons)', () => {
  const src = css(); need(src, 'message-thread.component.css');
  const HARD = /#[0-9a-f]{3,8}\b|\b(rgb|hsl|oklch)a?\(|(?<![\d.])(?!0(ms|s|px|rem)\b)\d*\.?\d+(ms|s|px|rem)\b|cubic-bezier\(|\blinear\(|scale\(\s*\d*\.\d/i;
  const found = [];
  postcss.parse(src).walkDecls((d) => { if (HARD.test(bare(d.value))) found.push(`${d.prop}: ${d.value}`); });
  assert.ok(HARD.test('transition: opacity 200ms') && HARD.test('color: #fff') && HARD.test('width: 2px') && HARD.test('width: 26rem') && HARD.test('animation-timing-function: linear(0, 1)') && !HARD.test(bare('width: var(--a, var(--b, 2px))')), 'motif défaillant');
  assert.deepEqual(found, []);
});

test('CA-T11 : jetons du composant lus (surcharges d\'application, ressort) ; aucun --lc-message-thread-* déclaré sur :host', () => {
  const src = css(); need(src, 'message-thread.component.css');
  for (const t of ['bubble-background', 'bubble-color', 'bubble-border-style', 'bubble-border-width', 'bubble-border-color', 'enter-easing', 'enter-scale']) assert.match(src, new RegExp(`var\\(--lc-message-thread-${t}`), `--lc-message-thread-${t} non lu`);
  const bad = [];
  postcss.parse(src).walkRules((r) => { if (r.selector.includes(':host')) r.walkDecls(/^--lc-message-thread-/, (d) => bad.push(`${r.selector} { ${d.prop} }`)); });
  assert.deepEqual(bad, [], 'une surcharge d\'application posée par un ancêtre doit atteindre la bulle');
});

test('spec 5.4 : réduction des animations, forced-colors, propriétés logiques, overflow-anchor', () => {
  const src = css(); need(src, 'message-thread.component.css');
  assert.match(src, /prefers-reduced-motion:\s*reduce/); assert.match(src, /forced-colors:\s*active/); assert.match(src, /overflow-anchor:\s*none/);
});

test('CA-T11 / spec 7 : ni innerHTML, ni contournement du filtre, console seulement en développement, aucun texte dans la console', () => {
  const src = code(); need(src, 'sources du composant');
  assert.deepEqual(src.match(/innerHTML|outerHTML|insertAdjacentHTML|bypassSecurityTrust|document\.write|createContextualFragment/g) ?? [], []);
  if (/console\./.test(src)) assert.match(src, /isDevMode\(\)/, 'console hors isDevMode');
  assert.ok(!/console\.\w+\([^)]*(\.text|authorName|\.name)/.test(src), 'texte ou nom écrit dans la console');
});

test('CA-T11 : aucun libellé en dur (français) dans le .ts ni le modèle', () => {
  const src = code(); need(src, 'sources du composant');
  const FR = ['Aujourd', 'Hier', 'Échanges', 'Ouvrir la pièce', 'Nouveau message', 'Messages précédents', 'Note interne', 'Vous'];
  assert.deepEqual(FR.filter((s) => src.includes(s)), []);
  assert.deepEqual(src.match(/\s(aria-label|title|placeholder|alt)="[^"{]*[A-Za-zÀ-ÿ]{2,}/g) ?? [], [], 'attribut texte en dur');
  const tpl = [...src.matchAll(/template:\s*`([\s\S]*?)`/g)].map((m) => m[1]).concat(sources(/\.html$/)).join('\n');
  assert.deepEqual(tpl.replace(/\{\{[\s\S]*?\}\}/g, '').replace(/@[a-z]+[^{]*\{|\}/g, '').match(/>[^<>{}]*[A-Za-zÀ-ÿ]{2,}[^<>{}]*</g) ?? [], [], 'texte en dur dans le modèle');
});

test('CA-T11 : libellés thread* présents en français et en anglais, anglais traduit', () => {
  const labels = read(path.join(ng, 'src/lib/core/labels.ts'));
  const fr = labels.slice(labels.indexOf('export const LC_LABELS_FR'), labels.indexOf('export const LC_LABELS_EN'));
  const en = labels.slice(labels.indexOf('export const LC_LABELS_EN'), labels.indexOf('export const LC_LABELS ='));
  for (const k of ['threadLabel', 'threadToday', 'threadYesterday']) {
    assert.match(labels, new RegExp(`readonly ${k}:`), `${k} absent de LcLabels`);
    const f = fr.match(new RegExp(`${k}: ('[^']*'|"[^"]*")`)); const e = en.match(new RegExp(`${k}: ('[^']*'|"[^"]*")`));
    assert.ok(f && e && f[1] !== e[1], `${k} : fr et en présents et différents`);
  }
  assert.match(labels, /readonly threadAttachmentOpen: \(/);
  for (const b of [fr, en]) assert.match(b, /threadAttachmentOpen: \(/, 'threadAttachmentOpen(name)');
  assert.match(fr, /threadToday: ['"]Aujourd['’\\]*'?hui/); assert.match(fr, /threadYesterday: 'Hier'/);
});

test('CA-T18 : lc-message n\'est pas modifié (CSS, composant et ses 16 tests CA-D3, empreintes de la base)', () => {
  const m = path.join(ng, 'feedback/src/message');
  const h = (f) => createHash('sha256').update(readFileSync(path.join(m, f))).digest('hex');
  assert.equal(h('message.component.css'), '9e9f4c353316788ccb2d4ce51c60dd2685251af2dc509e045895b398766d5a41');
  assert.equal(h('message.component.ts'), '97289251a97663319656c3275db0046d03667661db11e9127aa8c212bd57f815');
  assert.equal(h('message.component.spec.ts'), '07468c91577e7821f0602f0b82cf4436e2b22f7fc226c9e7c65ebcfaabb850e2');
  assert.equal((read(path.join(m, 'message.component.spec.ts')).match(/^\s*it\(/gm) ?? []).length, 16);
});

test('architecture : feedback/src/message-thread n\'importe ni forms ni aucun autre point d\'entrée secondaire (le principal seulement)', () => {
  const fs = files(dir, /\.ts$/).filter((f) => !/\.stories\.ts$/.test(f)); need(fs.join(''), 'sources du composant');
  const bad = [];
  for (const f of fs) for (const m of noComments(read(f)).matchAll(/(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const spec = m[1] ?? m[2];
    if (/^@lionelcointot\/ui-angular\/.+/.test(spec)) bad.push(`${path.relative(ng, f)} → ${spec}`);
    else if (spec.startsWith('.') && !path.resolve(path.dirname(f), spec).startsWith(path.join(ng, 'feedback') + path.sep)) bad.push(`${path.relative(ng, f)} → ${spec} (sort de feedback)`);
  }
  assert.deepEqual(bad, []);
});

test('architecture : safe-text.ts dans le principal ; forms et feedback n\'en gardent aucune copie (cleanFileName renommé)', () => {
  const st = read(path.join(ng, 'src/lib/core/safe-text.ts'));
  assert.match(st, /export (function|const) lcStripUnsafeChars/, 'lcStripUnsafeChars absent'); assert.match(st, /export (function|const) isSafePreviewUrl/);
  assert.match(read(path.join(ng, 'src/public-api.ts')), /lib\/core\/safe-text/, 'safe-text non exporté par le principal');
  const dup = [...files(path.join(ng, 'forms/src'), /\.ts$/), ...files(path.join(ng, 'feedback/src'), /\.ts$/)].filter((f) => /(function|const)\s+(cleanFileName|isSafePreviewUrl|lcStripUnsafeChars)\b/.test(read(f)));
  assert.deepEqual(dup.map((f) => path.relative(ng, f)), [], 'copie locale à retirer');
});

test('feedback : lc-message-thread exporté par le point d\'entrée', () => {
  assert.match(read(path.join(ng, 'feedback/src/public-api.ts')), /message-thread\/message-thread\.component/, 'non exporté (en attente du code)');
});

test('CA-T19 : générique et facile : aucun terme métier, aucune entrée obligatoire autre que messages, README ≤ 10 lignes, story Minimal', () => {
  const all = [...files(dir, /\.(ts|css|md|html)$/), ...files(path.join(ng, 'feedback/src/stories'), /message-thread.*\.ts$/)].map(read).join('\n') + read(path.join(ng, 'src/lib/core/labels.ts')).split('\n').filter((l) => /thread/i.test(l)).join('\n');
  need(all, 'sources du composant');
  assert.deepEqual(all.match(/copro|syndic|ticket|gestionnaire|harmonie|vilogi|finance|locataire|loyer|immobili/gi) ?? [], [], 'terme métier');
  assert.deepEqual([...code().matchAll(/input\.required/g)].length, 1, 'une seule entrée obligatoire (messages)');
  assert.match(code(), /messages\s*=\s*input\.required/, 'messages doit être l\'entrée obligatoire');
  const readme = read(path.join(dir, 'README.md')); assert.ok(readme.length > 0, 'README.md absent (en attente du code)');
  const blocks = [...readme.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1].trim().split('\n').length);
  assert.ok(blocks.length > 0 && Math.min(...blocks) <= 10, `aucun exemple de dix lignes au plus (${blocks})`);
  assert.match(readme, /<lc-message-thread[^>]*\[messages\]/, 'l\'exemple doit utiliser <lc-message-thread [messages]>');
  assert.match(files(path.join(ng, 'feedback/src/stories'), /message-thread.*\.stories\.ts$/).map(read).join('\n'), /export const Minimal\b/, 'story Minimal absente');
});
