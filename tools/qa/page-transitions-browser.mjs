// Transitions de page avec un routeur réel (spec 2026-12-mouvement-v2) : CA-32 (sens pour chaque cas de §5.4.3 ; ?query, fragment, skipLocationChange et route `data: { lcPageTransition: false }` ne déclenchent rien),
// CA-33 (ordinateur : empilement iOS absent, contenu seul qui bouge ; téléphone : empilement), CA-34a (retour au geste, 360 px tactile), CA-35 (une seule page interactive, un seul h1, aucun id en double,
// focus sur le h1, défilement de la page quittée conservé, aucune copie après 4 navigations en rafale), CA-3 (mouvement réduit : aucune animation).
// Issu de l'essai `spike/motion-pages` (tools/spike-motion-pages/run.mjs), réécrit pour la directive du kit : le harnais (tools/qa/page-transitions/) ne contient aucune logique de transition.
//   node tools/qa/page-transitions-browser.mjs [scénario ...]   scénarios : sens, copie, geste, reduit (tous par défaut) ; construit d'abord le harnais (`npm run build` doit avoir produit dist/ui-angular)
// Avant T13 la construction échoue (`LcPageTransitionsDirective` n'existe pas dans `@lionelcointot/ui-angular/layout`) : échec attendu, signalé comme tel seulement si le point d'entrée `layout` n'exporte pas la directive.
// Non couvert ici : « sans routeur, rien ne se passe » (test unitaire ou story), bouton « ‹ titre parent » et barre d'onglets (CA-33 mobile, CA-36 : stories de `lc-app-shell`).
// Le sens est lu sur ce qui s'anime, sans connaître les interns du kit : aucune animation = aucune transition ; animation d'opacité seule = « même niveau » ; sinon le signe du premier décalage
// de la page entrante (hors copie `[inert]`) donne le sens, calibré sur la première navigation avant (liste → détail).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, 'page-transitions');
const { chromium } = require('playwright');

try {
  execFileSync('npx', ['ng', 'build'], { cwd: app, stdio: 'pipe', encoding: 'utf8' });
} catch (error) {
  const exported = /page-?transitions/i.test(readFileSync(path.join(here, '..', '..', 'packages', 'angular', 'layout', 'src', 'public-api.ts'), 'utf8'));
  console.log(`KO  construction du harnais (${exported ? 'directive exportée : vrai échec (dist/ui-angular à jour ? `npm run build`)' : 'échec attendu avant T13 : directive absente'}) : ${`${error.stdout}${error.stderr}`.split('\n').filter((l) => /error|erreur/i.test(l)).slice(0, 3).join(' | ')}`);
  process.exit(1);
}

const server = await staticServer(path.join(app, 'dist', 'browser'), { spa: true, base: null }); // BASE ignoré : ce harnais sert l'application qu'il vient de construire
const { base } = server;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const wanted = process.argv.slice(2);
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };

async function open(url = '/requests', options = {}) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 700 }, reducedMotion: 'no-preference', ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}${url}`);
  await page.waitForSelector('.qa-page');
  return { context, page, errors };
}
const state = (page) => page.evaluate(() => ({
  url: location.pathname + location.search,
  pages: document.querySelectorAll('.qa-page').length,
  copies: document.querySelectorAll('[inert]').length,
  animations: document.getAnimations().length,
  focus: `${document.activeElement?.tagName}:${(document.activeElement?.textContent ?? '').slice(0, 20)}`,
}));
const settled = (page) => page.waitForFunction(() => document.querySelectorAll('.qa-page').length === 1 && document.getAnimations().length === 0, null, { timeout: 6000 });

/** Sens observé après une action : 'none' (rien ne bouge), 'same' (opacité seule), ou le signe du premier décalage de la page entrante (+1 / -1). */
async function observe(page, action) {
  await page.evaluate(() => { window.__seen = []; const tick = () => { for (const a of document.getAnimations()) { const t = a.effect?.target; if (!t || t.closest?.('[inert]') || !t.closest?.('main')) continue; const k = a.effect.getKeyframes()[0]; window.__seen.push({ transform: `${k.translate ?? ''} ${k.transform ?? ''}`, props: Object.keys(k).join() }); } if (window.__watch) requestAnimationFrame(tick); }; window.__watch = true; tick(); });
  await action();
  // Navigation finie : deux images (le routeur et le rendu ont tourné, le relevé a vu démarrer ce qui démarre), puis plus d'animation finie en cours.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)), null, { timeout: 6000 });
  const seen = await page.evaluate(() => { window.__watch = false; return window.__seen; });
  if (seen.length === 0) return 'none';
  const shifted = seen.map((s) => parseFloat((s.transform.match(/-?\d+(\.\d+)?/) ?? [])[0])).filter((n) => Number.isFinite(n) && n !== 0);
  return shifted.length === 0 ? 'same' : Math.sign(shifted[0]);
}

const scenarios = {
  // CA-32 : sens de chaque cas.
  async sens() {
    const { context, page } = await open();
    const loadAnimations = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('main')).length);
    check(loadAnimations === 0, 'CA-32 lien direct / premier affichage : aucune animation de page', `${loadAnimations} animation(s)`);
    let forward;
    const step = async (label, action, want) => {
      const got = await observe(page, action);
      await settled(page).catch(() => {});
      if (forward === undefined && typeof got === 'number') forward = got; // calibrage : la première navigation est « avancer »
      const dir = typeof got === 'number' ? (got === forward ? 'forward' : 'back') : got;
      check(dir === want, `CA-32 ${label} -> ${want}`, `observé ${dir}`);
    };
    await step('liste -> détail (clic)', () => page.click('#l-42'), 'forward');
    await step('détail -> historique (clic)', () => page.click('#l-hist'), 'forward');
    await step('historique -> rubrique Notifications (moins profond)', () => page.click('#l-notif'), 'back');
    await step('retour navigateur vers une page plus profonde (historique)', () => page.goBack(), 'back');
    await step('retour navigateur historique -> détail', () => page.goBack(), 'back');
    await step('avance navigateur détail -> historique', () => page.goForward(), 'forward');
    await step('retour navigateur historique -> détail', () => page.goBack(), 'back');
    await step('retour navigateur détail -> liste', () => page.goBack(), 'back');
    await step('même niveau, rubrique suivante (liste -> Notifications)', () => page.click('#l-notif'), 'forward');
    await step('même niveau, rubrique précédente (Notifications -> liste)', () => page.click('#l-list'), 'back');
    await step('liste -> détail 42', () => page.click('#l-42'), 'forward');
    await step('même niveau, même rubrique (détail 42 -> détail 43)', () => page.click('#l-43'), 'same');
    await step('redirectTo /old-requests -> /requests/42 depuis le détail 43 (sens sur l\'URL finale)', () => page.click('#l-old'), 'same');
    await step('retour à la liste', () => page.click('#l-list'), 'back');
    await step('redirectTo depuis la liste -> détail 42', () => page.click('#l-old'), 'forward');
    check((await state(page)).url === '/requests/42', 'CA-32 redirectTo : URL finale', (await state(page)).url);
    await step('garde qui redirige (UrlTree) /secret -> /notifications depuis le détail', () => page.click('#l-secret'), 'back');
    check((await state(page)).url === '/notifications', 'CA-32 garde : URL finale', (await state(page)).url);
    await step('Notifications -> liste', () => page.click('#l-list'), 'back');
    await step('liste -> détail avec replaceUrl', () => page.click('#l-42r'), 'forward');
    await step('détail -> historique', () => page.click('#l-hist'), 'forward');
    await step('retour navigateur historique -> détail (entrée remplacée)', () => page.goBack(), 'back');
    await step('avance navigateur détail -> historique après replaceUrl', () => page.goForward(), 'forward');
    await step('?query : même page', () => page.click('#l-query'), 'none');
    await step('fragment : même page', () => page.click('#l-fragment'), 'none');
    await step('skipLocationChange', () => page.click('#l-skip'), 'none');
    await step('route `data: { lcPageTransition: false }`', () => page.click('#l-plain'), 'none');
    await context.close();
    const deep = await open('/requests/42/history');
    const loadDeep = await deep.page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('main')).length);
    check(loadDeep === 0, 'CA-32 lien direct profond : aucune animation de page', `${loadDeep} animation(s)`);
    await deep.context.close();
  },

  // CA-35 : accessibilité pendant et après la transition, rafale de navigations.
  async copie() {
    const { context, page } = await open();
    await page.evaluate(() => scrollTo(0, 400));
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => Math.round(document.querySelector('.qa-page').getBoundingClientRect().top));
    const samples = [];
    await page.evaluate(() => document.getElementById('l-42').click());
    for (const wait of [0, 100, 180, 500]) {
      await page.waitForTimeout(wait);
      const s = await page.evaluate(() => {
        const copy = document.querySelector('[inert]');
        return {
          interactive: [...document.querySelectorAll('.qa-page')].filter((e) => !e.closest('[inert]') && e.closest('[aria-hidden="true"]') === null).length,
          duplicateIds: document.querySelectorAll('#note').length,
          copyTop: copy ? Math.round((copy.querySelector('.qa-page') ?? copy).getBoundingClientRect().top) : null,
        };
      });
      s.h1 = ((await page.locator('main').ariaSnapshot()).match(/heading .*\[level=1\]/g) ?? []).length;
      samples.push(s);
    }
    await settled(page);
    const end = await state(page);
    check(samples.every((s) => s.interactive <= 1), 'CA-35 une seule page interactive à chaque instant', JSON.stringify(samples.map((s) => s.interactive)));
    check(samples.every((s) => s.duplicateIds <= 1), 'CA-35 aucun id en double (#note)', JSON.stringify(samples.map((s) => s.duplicateIds)));
    check(samples.every((s) => s.h1 === 1), 'CA-35 un seul h1 dans l\'arbre d\'accessibilité', JSON.stringify(samples.map((s) => s.h1)));
    const seen = samples.filter((s) => s.copyTop !== null);
    check(seen.length >= 2, 'CA-35 l\'ancienne page est visible (copie) pendant sa sortie', `${seen.length} échantillon(s)`);
    check(seen.every((s) => Math.abs(s.copyTop - before) <= 2), `CA-35 défilement de la page quittée conservé (haut ${before})`, JSON.stringify(seen.map((s) => s.copyTop)));
    check(end.pages === 1 && end.copies === 0 && end.animations === 0, 'CA-35 fin : une page, aucune copie, aucune animation', JSON.stringify(end));
    check(end.focus.startsWith('H1:Demande'), 'CA-35 focus sur le h1 de la nouvelle page', end.focus);
    for (const selector of ['#l-hist', '#l-notif', '#l-list']) await page.evaluate((s) => document.querySelector(`main ${s}`)?.click(), selector);
    await page.waitForTimeout(40);
    await page.evaluate(() => document.getElementById('l-42').click());
    await page.waitForTimeout(1500); // plus que la durée maximale (entrée 700 ms)
    const rapid = await state(page);
    check(rapid.pages === 1 && rapid.copies === 0 && rapid.animations === 0, 'CA-35 4 navigations en rafale : une page, aucune copie restante', JSON.stringify(rapid));
    await context.close();
  },

  // CA-34a : retour au geste, 360 px tactile.
  async geste() {
    const touch = { viewport: { width: 360, height: 700 }, hasTouch: true, isMobile: true };
    const drag = async (page, cdp, points) => {
      // points : [[x, délai avant ce point en ms], …] ; y fixe.
      const y = 400;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0][0], y }] });
      for (const [x, wait] of points.slice(1)) { await page.waitForTimeout(wait); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); }
      return () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const during = (page) => page.evaluate(() => ({ url: location.pathname, copy: document.querySelector('[inert] h1')?.textContent ?? null, inert: !!document.querySelector('[inert]') }));
    const replayed = (page) => page.evaluate(() => document.getAnimations().some((a) => { const t = a.effect?.target; if (!t || t.closest?.('[inert]') || !t.closest?.('main')) return false; const k = a.effect.getKeyframes()[0]; const n = parseFloat((`${k.translate ?? ''} ${k.transform ?? ''}`.match(/-?\d+(\.\d+)?/) ?? [])[0]); return Math.abs(n) >= 25; }));
    for (const [label, points, engaged] of [
      ['20 % lent : la page revient, sans navigation', [[5, 0], [30, 80], [55, 80], [77, 80]], false],
      ['70 % lent : navigation vers la page précédente', [[5, 0], [80, 80], [160, 80], [255, 80]], true],
      ['geste court et rapide (> 0,4 px/ms) : navigation', [[5, 0], [30, 30], [60, 30], [90, 30]], true],
    ]) {
      const { context, page } = await open('/requests', touch);
      await page.click('#l-42');
      await settled(page);
      const cdp = await context.newCDPSession(page);
      const release = await drag(page, cdp, points);
      const mid = await during(page);
      check(mid.url === '/requests/42', `CA-34a ${label} : l'URL ne change pas pendant le geste`, mid.url);
      check(mid.inert && mid.copy === 'Mes demandes', `CA-34a ${label} : la copie de la page précédente est dessous (inert)`, JSON.stringify(mid));
      await release();
      await page.waitForTimeout(150);
      check(!(await replayed(page)), `CA-34a ${label} : la transition de page n'est pas rejouée`, 'une animation de page entrante démarre à plus de 25 px');
      await page.waitForFunction(() => document.querySelectorAll('[inert]').length === 0 && document.getAnimations().length === 0, null, { timeout: 4000 }).catch(() => {});
      const end = await state(page);
      check(end.url === (engaged ? '/requests' : '/requests/42') && end.pages === 1 && end.copies === 0, `CA-34a ${label} : état final`, JSON.stringify(end));
      await context.close();
    }
  },

  // CA-3 : mouvement réduit.
  async reduit() {
    const { context, page } = await open('/requests', { reducedMotion: 'reduce' });
    await page.evaluate(() => document.getElementById('l-42').click());
    await page.waitForTimeout(30);
    const first = await state(page);
    check(first.pages === 1 && first.copies === 0 && first.animations === 0, 'CA-3 mouvement réduit : une page, aucune copie, aucune animation', JSON.stringify(first));
    check(first.focus.startsWith('H1:Demande'), 'CA-3 mouvement réduit : focus sur le h1', first.focus);
    await page.evaluate(() => document.getElementById('l-hist').click());
    await page.waitForTimeout(30);
    await page.goBack();
    await page.waitForTimeout(30);
    const last = await state(page);
    check(last.pages === 1 && last.copies === 0 && last.animations === 0, 'CA-3 mouvement réduit : retour navigateur, une page, aucune animation', JSON.stringify(last));
    await context.close();
  },
};

try {
  for (const [name, run] of Object.entries(scenarios)) if (wanted.length === 0 || wanted.includes(name)) await run();
} finally {
  await browser.close();
  server.close();
}
process.exit(failures > 0 ? 1 : 0);
