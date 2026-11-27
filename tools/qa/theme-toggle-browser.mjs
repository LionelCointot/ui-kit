// lc-theme-toggle en navigateur réel (spec 2026-12-mouvement-v2, T12) : CA-29, et le contrat de story de CA-3 / CA-5 / CA-20 / CA-38.
// Valeurs attendues : la spec (§5.4, CA-29) et les tokens `--lc-theme-toggle-duration` / `--lc-theme-toggle-easing` lus dans le navigateur, jamais recopiés.
//   node tools/qa/theme-toggle-browser.mjs        Storybook statique (STORYBOOK_DIR ou dist/storybook) ; BASE=http://… pour un Storybook déjà lancé
// Contrat : story `buttons-theme-toggle--playground` (existe) et `buttons-theme-toggle--animation` (T12) avec `[data-demo="d37"]` contenant un `lc-theme-toggle` et un bouton « Rejouer » ;
// la bascule appelle `document.startViewTransition` (sauf mouvement réduit ou API absente) et anime le pseudo-élément ::view-transition-new(root) en `clip-path: circle(R px at X px Y px)` ;
// `data-theme` de <html> change. La mesure enveloppe `startViewTransition` (appel, centre du bouton au clic) et relève les animations de pseudo-éléments quand `ready` est tenu.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const PLAYGROUND = 'buttons-theme-toggle--playground';
const ANIMATION = 'buttons-theme-toggle--animation';

const server = await staticServer(storybookDir);
const { base } = server;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };
const section = async (n, fn) => { try { await fn(); } catch (error) { check(false, `bloc ${n} interrompu`, error.message.split('\n')[0]); } };

const INIT = ({ noApi }) => {
  localStorage.setItem('lc-theme-choice', 'light'); // le clic fait passer de clair à sombre : un changement visible
  if (noApi) delete Document.prototype.startViewTransition; // CA-29 : navigateur sans View Transitions
  window.__vt = { calls: 0, centre: null, pseudo: [] };
  const original = document.startViewTransition;
  if (original) {
    document.startViewTransition = function (...args) {
      const b = (document.activeElement?.closest?.('button') ?? document.querySelector('lc-theme-toggle button')).getBoundingClientRect();
      window.__vt.calls += 1;
      window.__vt.centre = [b.left + b.width / 2, b.top + b.height / 2];
      const t = original.apply(this, args);
      t.ready.then(() => setTimeout(() => { // laisse le code testé poser son animation dans son propre `ready`
        window.__vt.pseudo = document.getAnimations().filter((a) => a.effect?.pseudoElement).map((a) => ({
          pseudo: a.effect.pseudoElement, duration: a.effect.getComputedTiming().duration, easing: a.effect.getTiming().easing,
          clip: a.effect.getKeyframes().map((k) => k.clipPath).filter(Boolean),
        }));
      }, 30), () => undefined);
      return t;
    };
  }
  window.__ms = (name) => { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  window.__nums = (s) => (s.match(/-?\d*\.?\d+/g) ?? []).map(Number).join(',');
};

async function open(id, { reduced = false, noApi = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: 'light' });
  await context.addInitScript(INIT, { noApi });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector('lc-theme-toggle button', { timeout: 20000 });
  return { page, context, errors };
}
const theme = (page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
/** Clique la bascule ; rend le thème avant, le thème après deux images et la mesure (attente de `ready` si l'API est utilisée). */
async function toggle(page) {
  const before = await theme(page);
  await page.locator('lc-theme-toggle button').first().click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const afterTwoFrames = await theme(page);
  await page.waitForTimeout(200);
  const vt = await page.evaluate(() => window.__vt);
  return { before, afterTwoFrames, vt };
}

// ---------- CA-29 : avec View Transitions, cercle centré sur le bouton, rayon jusqu'au coin le plus éloigné, durée et courbe = tokens ----------
await section(1, async () => {
  const { page, context, errors } = await open(PLAYGROUND);
  const r = await toggle(page);
  check(r.vt.calls === 1, 'CA-29 la bascule appelle document.startViewTransition une fois', `appels=${r.vt.calls}`);
  const circle = r.vt.pseudo.find((p) => p.clip.length >= 2);
  check(!!circle, 'CA-29 un pseudo-élément de View Transitions est animé en clip-path (deux images clés)', JSON.stringify(r.vt.pseudo));
  if (circle && r.vt.centre) {
    const re = /circle\(\s*([\d.]+)px\s+at\s+([\d.]+)px\s+([\d.]+)px\s*\)/;
    const [from, to] = [circle.clip[0], circle.clip[circle.clip.length - 1]].map((s) => s.match(re)?.slice(1).map(Number));
    check(!!from && !!to, 'CA-29 clip-path au format circle(Rpx at Xpx Ypx)', JSON.stringify(circle.clip));
    if (from && to) {
      const [x, y] = r.vt.centre;
      const { w, h } = await page.evaluate(() => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }));
      const corner = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
      const ends = [from, to].map((c) => c[0]);
      const small = Math.min(...ends), big = Math.max(...ends);
      check(Math.abs(from[1] - x) <= 1 && Math.abs(from[2] - y) <= 1 && Math.abs(to[1] - x) <= 1 && Math.abs(to[2] - y) <= 1, 'CA-29 le cercle part à ±1 px du centre du bouton', `centre=${x},${y} clip=${circle.clip}`);
      check(small <= 1 && Math.abs(big - corner) <= 1, 'CA-29 rayon 0 → coin le plus éloigné (±1 px)', `rayons=${ends} attendu=0→${corner}`);
    }
    const token = await page.evaluate(() => ({ ms: window.__ms('--lc-theme-toggle-duration'), easing: getComputedStyle(document.documentElement).getPropertyValue('--lc-theme-toggle-easing') }));
    const norm = await page.evaluate((s) => window.__nums(s), circle.easing);
    const tokenNorm = await page.evaluate((s) => window.__nums(s), token.easing);
    check(circle.duration === token.ms, 'CA-29 durée = --lc-theme-toggle-duration', `animation=${circle.duration} token=${token.ms}`);
    check(norm === tokenNorm, 'CA-29 courbe = --lc-theme-toggle-easing', `animation=${circle.easing} token=${token.easing}`);
  }
  check(r.before !== (await theme(page)), 'CA-29 le thème a basculé (data-theme)', `${r.before} → ${await theme(page)}`);
  check(errors.length === 0, 'CA-29 aucune erreur de page', errors.join(' | '));
  await context.close();
});

// ---------- CA-29 : mouvement réduit, aucun appel à View Transitions, bascule en une image ----------
await section(2, async () => {
  const { page, context, errors } = await open(PLAYGROUND, { reduced: true });
  const r = await toggle(page);
  check(r.vt.calls === 0, 'CA-29 mouvement réduit : startViewTransition non appelé', `appels=${r.vt.calls}`);
  check(r.afterTwoFrames !== r.before, 'CA-29 mouvement réduit : thème basculé en une image', `${r.before} → ${r.afterTwoFrames}`);
  check(errors.length === 0, 'CA-29 mouvement réduit : aucune erreur de page', errors.join(' | '));
  await context.close();
});

// ---------- CA-29 : sans document.startViewTransition (supprimé par addInitScript), bascule en une image sans erreur ----------
await section(3, async () => {
  const { page, context, errors } = await open(PLAYGROUND, { noApi: true });
  check(await page.evaluate(() => typeof document.startViewTransition) === 'undefined', 'CA-29 repli : document.startViewTransition est bien absent');
  const r = await toggle(page);
  check(r.afterTwoFrames !== r.before, 'CA-29 repli : thème basculé en une image', `${r.before} → ${r.afterTwoFrames}`);
  check(errors.length === 0, 'CA-29 repli : aucune erreur de page', errors.join(' | '));
  await context.close();
});

// ---------- CA-38 / CA-20 / CA-3 / CA-5 : story Animation d37 ; la boucle de `storybook-browser.mjs motion` la mesure ensuite ----------
await section(4, async () => {
  const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8').catch(() => '{"entries":{}}'));
  if (!index.entries[ANIMATION]) { check(false, `CA-20 la story ${ANIMATION} existe dans l'index`, 'story absente de index.json'); return; } // CA-38 : vérifié dans `storybook-browser.mjs motion`
  const { page, context } = await open(ANIMATION);
  check(await page.locator('[data-demo="d37"] lc-theme-toggle').count() >= 1, 'CA-20 [data-demo="d37"] contient un lc-theme-toggle');
  await context.close();
});

await browser.close();
server?.close();
process.exit(failures > 0 ? 1 : 0);
