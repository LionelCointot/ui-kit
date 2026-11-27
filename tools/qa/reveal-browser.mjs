// lcReveal en navigateur réel (spec 2026-12-mouvement-v2) : sortie par @if et @for, rejeu au réordonnancement, mouvement réduit.
// CA-9 (élément retiré gardé dans le DOM pendant sa sortie, retiré à `animation.finished` + 50 ms au plus ; ≤ 70 ms sous mouvement réduit),
// CA-10 (inverser 7 éléments ne relance aucune entrée, ajouter n'anime que le nouvel élément), CA-3 (sortie sans animation sous mouvement réduit).
// Issu de l'essai `spike/motion-sortie` (motion-spike.mjs et motion-spike-replay.mjs), réécrit en assertions sur la future directive du kit.
//   node tools/qa/reveal-browser.mjs                Storybook statique (STORYBOOK_DIR ou dist/storybook) ; BASE=http://… pour un Storybook déjà lancé
// Story attendue (à écrire par T3, `*.acceptance.qa.stories.ts`) : `qa-motion-reveal-acceptance--lists`, dont les éléments portent `lcReveal` :
//   `#if-block` (sous @if) ; `#list > li[data-id]` (sous @for, 7 éléments `data-id` 1 à 7) ; boutons `#toggle` (retire/remet #if-block), `#remove` (retire l'élément `data-id="2"`),
//   `#reverse` (inverse la liste), `#append` et `#prepend` (ajoutent un élément, `data-id` 8 puis 9).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const STORY = 'qa-motion-reveal-acceptance--lists';

const server = await staticServer(storybookDir);
const { base } = server;

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };

/** Preuve négative : deux images (une animation d'entrée démarre au plus une ou deux images après le changement du DOM), puis plus aucune animation finie en cours. */
const quiet = async (page) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)), null, { timeout: 5000 });
};

/** Ouvre la story ; `window.__starts` consigne chaque `animationstart` (« nom|data-id »). */
async function open(reduced) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(() => {
    window.__starts = [];
    document.addEventListener('animationstart', (e) => window.__starts.push(`${e.animationName}|${e.target.dataset?.id ?? e.target.id}`), true);
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${STORY}&viewMode=story`);
  await page.waitForSelector('#list > li', { timeout: 20000 });
  await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 15000 });
  await page.evaluate(() => { window.__starts.length = 0; });
  return { page, context, errors };
}

/** Clique `button`, puis relève : instant de disparition de `gone` (sélecteur) par rapport au clic, et durée réelle de l'animation de sortie vue à 60 ms. */
const leave = (page, button, gone) => page.evaluate(async ([button, gone]) => {
  const t0 = performance.now();
  let goneAt = null;
  let animationMs = null;
  let presentAt60 = null;
  document.getElementById(button).click();
  await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now() - t0;
      const el = document.querySelector(gone);
      if (el && animationMs === null) animationMs = el.getAnimations().map((a) => a.effect.getComputedTiming().endTime).sort((a, b) => b - a)[0] ?? null;
      if (t >= 60 && presentAt60 === null) presentAt60 = !!el;
      if (!el && goneAt === null) goneAt = Math.round(t);
      if (t > 1200) resolve(); else requestAnimationFrame(tick);
    };
    tick();
  });
  return { goneAt, animationMs, presentAt60 };
}, [button, gone]);

// CA-9 : @if et @for, mouvement normal.
{
  const { page, context, errors } = await open(false);
  for (const [name, button, selector] of [['@if', 'toggle', '#if-block'], ['@for', 'remove', '#list > li[data-id="2"]']]) {
    const r = await leave(page, button, selector);
    check(r.presentAt60 === true && r.animationMs > 0, `CA-9 ${name} : l'élément reste dans le DOM pendant sa sortie`, `présent à 60 ms=${r.presentAt60}, durée d'animation vue=${r.animationMs}`);
    check(r.goneAt !== null && r.goneAt <= (r.animationMs ?? 0) + 50 + 34, `CA-9 ${name} : retiré à animation.finished + 50 ms au plus`, `retiré à ${r.goneAt} ms, animation ${r.animationMs} ms (+ une image de marge de mesure)`);
    await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 5000 });
  }
  // CA-10 : réordonnancement et ajout (entrées relancées seulement pour l'élément ajouté).
  await page.evaluate(() => { window.__starts.length = 0; });
  await page.click('#reverse');
  await quiet(page);
  const reverse = await page.evaluate(() => window.__starts.filter((s) => s.startsWith('lc-reveal-in')));
  check(reverse.length === 0, 'CA-10 inverser la liste ne relance aucune animation d\'entrée', JSON.stringify(reverse));
  await page.evaluate(() => { window.__starts.length = 0; });
  await page.click('#append');
  await quiet(page);
  const appended = await page.evaluate(() => window.__starts.filter((s) => s.startsWith('lc-reveal-in')));
  check(appended.length === 1 && appended[0].endsWith('|8'), 'CA-10 ajouter un élément n\'anime que lui', JSON.stringify(appended));
  await page.evaluate(() => { window.__starts.length = 0; });
  await page.click('#prepend');
  await quiet(page);
  const prepended = await page.evaluate(() => window.__starts.filter((s) => s.startsWith('lc-reveal-in')));
  check(prepended.length === 1 && prepended[0].endsWith('|9'), 'CA-10 ajouter en tête n\'anime que le nouvel élément', JSON.stringify(prepended));
  check(errors.length === 0, 'erreurs de page (mouvement normal)', errors.join(' ; '));
  await context.close();
}

// CA-9 (≤ 70 ms) et CA-3 : mouvement réduit.
{
  const { page, context, errors } = await open(true);
  for (const [name, button, selector] of [['@if', 'toggle', '#if-block'], ['@for', 'remove', '#list > li[data-id="2"]']]) {
    const r = await leave(page, button, selector);
    check(r.goneAt !== null && r.goneAt <= 70, `CA-9 mouvement réduit ${name} : retiré en 70 ms au plus`, `retiré à ${r.goneAt} ms`);
    check(!(r.animationMs > 0.01), `CA-3 mouvement réduit ${name} : aucune animation de sortie (durée ≤ 0,01 ms)`, `durée vue=${r.animationMs}`);
  }
  check(errors.length === 0, 'erreurs de page (mouvement réduit)', errors.join(' ; '));
  await context.close();
}

await browser.close();
server?.close();
process.exit(failures > 0 ? 1 : 0);
