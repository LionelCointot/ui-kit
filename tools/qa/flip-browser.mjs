// lcFlip en navigateur réel (spec 2026-12-mouvement-v2) : CA-17 (position visuelle à currentTime = 0 égale à l'ancienne ± 0,5 px, fin à la nouvelle place, aucun saut
// si un deuxième changement arrive en cours, 200 éléments : toutes les lectures avant la première écriture), CA-18 (entrée lcReveal et FLIP simultanés : déplacement par image ≤ FLIP seul + 0,5 px),
// CA-3 (mouvement réduit : état final immédiat, aucune animation).
// Issu de l'essai `spike/motion-flip` (flip-spike.mjs), réécrit en assertions sur la future directive du kit.
//   node tools/qa/flip-browser.mjs                Storybook statique (STORYBOOK_DIR ou dist/storybook) ; BASE=http://… pour un Storybook déjà lancé
// Story attendue (à écrire par T7, `*.acceptance.qa.stories.ts`) : `qa-motion-flip-acceptance--flip`, qui lit dans l'URL `n` (nombre de lignes, 8 par défaut) et `reveal` (1 : les lignes portent aussi `lcReveal`) :
//   `#list` (porte `lcFlip`) contient les lignes `.row[data-k]` de 36 px de haut, empilées, clés 1 à n ; boutons `#reverse` (inverse), `#filter` (garde les clés paires), `#prepend` (ajoute en tête la clé 1000, puis 1001…),
//   `#shuffle` (mélange, graine fixe), `#all` (inverse, filtre et ajoute en une fois).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const STORY = 'qa-motion-flip-acceptance--flip';

const server = await staticServer(storybookDir);
const { base } = server;

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };

/** Ouvre la story ; instrumente getBoundingClientRect (R) et Element.animate (A) pour consigner leur ordre pendant `window.__seqOn`. */
async function open(params = {}, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width: 800, height: 900 }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__seq = [];
    window.__seqOn = false;
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () { if (window.__seqOn) window.__seq.push('R'); return rect.call(this); };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) { if (window.__seqOn) window.__seq.push('A'); return animate.apply(this, args); };
  });
  await page.goto(`${base}/iframe.html?${new URLSearchParams({ id: STORY, viewMode: 'story', ...params })}`);
  await page.waitForSelector('#list .row', { timeout: 20000 });
  await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 15000 }); // fin des entrées initiales
  return { page, context, errors };
}

// CA-17 : à currentTime = 0, chaque ligne conservée est à son ancienne place ; à la fin, à la nouvelle.
for (const button of ['reverse', 'filter', 'prepend', 'shuffle']) {
  const { page, context, errors } = await open({ n: '8' });
  const r = await page.evaluate(async (button) => {
    const rows = () => [...document.querySelectorAll('#list > .row')];
    const before = new Map(rows().map((el) => [el.dataset.k, el.getBoundingClientRect().top]));
    const keysBefore = rows().map((el) => el.dataset.k).join();
    document.getElementById(button).click();
    for (let i = 0; i < 10 && rows().map((el) => el.dataset.k).join() === keysBefore; i += 1) await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const kept = rows().filter((el) => before.has(el.dataset.k));
    const start = kept.map((el) => { el.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }); return [el.dataset.k, el.getBoundingClientRect().top - before.get(el.dataset.k)]; });
    rows().forEach((el) => el.getAnimations().forEach((a) => a.finish()));
    const listTop = document.getElementById('list').getBoundingClientRect().top;
    const end = rows().map((el, i) => [el.dataset.k, el.getBoundingClientRect().top - (listTop + i * 36)]);
    return { start, end, kept: kept.length };
  }, button);
  check(r.kept > 0 && r.start.every(([, dy]) => Math.abs(dy) <= 0.5), `CA-17 ${button} : à currentTime = 0 chaque ligne conservée est à son ancienne place (±0,5 px)`, JSON.stringify(r.start.filter(([, dy]) => Math.abs(dy) > 0.5).slice(0, 4)));
  check(r.end.every(([, dy]) => Math.abs(dy) <= 0.5), `CA-17 ${button} : chaque ligne finit à sa nouvelle place`, JSON.stringify(r.end.filter(([, dy]) => Math.abs(dy) > 0.5).slice(0, 4)));
  check(errors.length === 0, `erreurs de page ${button}`, errors.join(' ; '));
  await context.close();
}

// CA-17 : 200 éléments, toutes les lectures de position avant la première écriture.
for (const button of ['reverse', 'shuffle', 'all']) {
  const { page, context } = await open({ n: '200' });
  const seq = await page.evaluate(async (button) => {
    window.__seq = [];
    window.__seqOn = true;
    document.getElementById(button).click();
    for (let i = 0; i < 4; i += 1) await new Promise((resolve) => requestAnimationFrame(resolve));
    window.__seqOn = false;
    return window.__seq.join('');
  }, button);
  const firstWrite = seq.indexOf('A');
  check(firstWrite >= 0 && !seq.slice(firstWrite).includes('R'), `CA-17 200 éléments ${button} : toutes les lectures avant la première écriture`, `${(seq.match(/R/g) ?? []).length} lecture(s), ${(seq.match(/A/g) ?? []).length} écriture(s), première écriture en position ${firstWrite}`);
  await context.close();
}

// CA-17 : un deuxième changement en cours de glissement ne provoque aucun saut.
{
  const { page, context } = await open({ n: '8' });
  const r = await page.evaluate(async () => {
    const list = document.getElementById('list');
    const centres = () => Object.fromEntries([...list.children].map((el) => { const b = el.getBoundingClientRect(); return [el.dataset.k, b.top + b.height / 2]; }));
    const frames = [];
    const run = async (count) => { for (let i = 0; i < count; i += 1) { await new Promise((resolve) => requestAnimationFrame(resolve)); frames.push(centres()); } };
    document.getElementById('reverse').click();
    await run(6);
    document.getElementById('reverse').click();
    await run(40);
    const jumps = frames.slice(1).map((frame, i) => Math.max(...Object.keys(frame).map((k) => Math.abs(frame[k] - frames[i][k]))));
    const top = list.getBoundingClientRect().top;
    return { atSwitch: Math.max(...jumps.slice(5, 8)), before: Math.max(...jumps.slice(0, 5)), finalOk: Object.entries(frames.at(-1)).every(([k, cy]) => Math.abs(cy - (top + (+k - 1) * 36 + 18)) <= 0.5), animations: [...list.children].reduce((n, el) => n + el.getAnimations().length, 0) };
  });
  check(r.atSwitch <= r.before + 0.5, 'CA-17 deuxième changement en cours : aucun saut à l\'image du changement', `déplacement à l'image du changement ${r.atSwitch.toFixed(1)} px, maximum avant ${r.before.toFixed(1)} px`);
  check(r.finalOk && r.animations === 0, 'CA-17 deuxième changement en cours : état final exact, aucune animation restante', JSON.stringify(r));
  await context.close();
}

// CA-18 : entrée lcReveal + FLIP sur le même élément, comparée au FLIP seul.
const worstJump = async (reveal) => {
  const { page, context } = await open({ n: '4', reveal: reveal ? '1' : '0' });
  await page.evaluate(() => document.getElementById('prepend').click());
  await page.waitForFunction(() => [...document.getElementById('list').children].some((el) => el.getAnimations().length > 0)); // le premier ajout est en cours : le deuxième le pousse à mi-chemin
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const worst = await page.evaluate(async () => {
    const el = document.querySelector('#list [data-k="1000"]');
    const cy = () => { const b = el.getBoundingClientRect(); return b.top + b.height / 2; };
    const samples = [cy()];
    document.getElementById('prepend').click(); // le deuxième ajout pousse l'élément pendant son entrée
    for (let i = 0; i < 70; i += 1) { await new Promise((resolve) => requestAnimationFrame(resolve)); samples.push(cy()); }
    return Math.max(...samples.slice(1).map((v, i) => Math.abs(v - samples[i])));
  });
  await context.close();
  return worst;
};
try {
  const [alone, together] = [await worstJump(false), await worstJump(true)];
  check(together <= alone + 0.5, 'CA-18 lcReveal + lcFlip : déplacement maximal par image ≤ FLIP seul + 0,5 px', `ensemble ${together.toFixed(1)} px, FLIP seul ${alone.toFixed(1)} px`);
} catch (error) { check(false, 'CA-18 lcReveal + lcFlip : le premier ajout doit animer (un FLIP en cours à pousser)', String(error.message).split('\n')[0]); }

// CA-3 : mouvement réduit.
{
  const { page, context } = await open({ n: '8' }, 'reduce');
  const r = await page.evaluate(async () => {
    const list = document.getElementById('list');
    const top = list.getBoundingClientRect().top;
    document.getElementById('reverse').click();
    let animations = 0;
    for (let i = 0; i < 20; i += 1) { await new Promise((resolve) => requestAnimationFrame(resolve)); animations = Math.max(animations, document.getAnimations().filter((a) => a.playState === 'running' || a.pending).length); }
    return { animations, atFinal: [...list.children].every((el, i) => Math.abs(el.getBoundingClientRect().top - (top + i * 36)) <= 0.5) };
  });
  check(r.animations === 0 && r.atFinal, 'CA-3 lcFlip sous mouvement réduit : état final immédiat, aucune animation en cours', JSON.stringify(r));
  await context.close();
}

await browser.close();
server?.close();
process.exit(failures > 0 ? 1 : 0);
