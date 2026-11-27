// Transitions de page avec un routeur réel (spec 2026-12-mouvement-v2) : CA-32 (sens pour chaque cas de §5.4.3 ; ?query, fragment, skipLocationChange et route `data: { lcPageTransition: false }` ne déclenchent rien),
// CA-33 (ordinateur : empilement iOS absent, contenu seul qui bouge ; téléphone : empilement), CA-34a (retour au geste, 360 px tactile), CA-35 (une seule page interactive, un seul h1, aucun id en double,
// focus sur le h1, défilement de la page quittée conservé, aucune copie après 4 navigations en rafale), CA-3 (mouvement réduit : aucune animation).
// Issu de l'essai `spike/motion-pages` (tools/spike-motion-pages/run.mjs), complété en T13b : le harnais (tools/qa/page-transitions/) est une application `lc-app-shell` à routeur réel qui ne contient aucune logique de transition
// (la directive `lcPageTransitions` est posée par `lc-app-shell` sur `main`) ; contrat du harnais : routes, titres et ids en tête de `tools/qa/page-transitions/src/main.ts`.
//   node tools/qa/page-transitions-browser.mjs [scénario ...]   scénarios : sens, copie, bureau, telephone, reduit (tous par défaut), geste (T14, hors défaut) ; construit d'abord le harnais (`npm run build` doit avoir produit dist/ui-angular et packages/tokens/dist)
// Avant T13b l'application se construit mais rien ne bouge : les scénarios échouent sur le comportement.
// Non couvert ici : « sans routeur, rien ne se passe » (page-transitions.acceptance.spec.ts), bouton « ‹ titre parent » (T14) et barre d'onglets (T15).
// Le sens est lu sur ce qui s'anime, sans connaître les interns du kit : aucune animation = aucune transition ; animation d'opacité seule = « même niveau » ; sinon le signe du premier décalage
// de la page entrante (hors copie `[inert]`) donne le sens, calibré sur la première navigation avant (liste → détail).
import { execFileSync } from 'node:child_process';
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
  console.log(`KO  construction du harnais (dist/ui-angular et packages/tokens/dist à jour ? \`npm run build\`) : ${`${error.stdout}${error.stderr}`.split('\n').filter((l) => /error|erreur/i.test(l)).slice(0, 3).join(' | ')}`);
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
  await page.waitForSelector('main.lc-shell__main .qa-page');
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


const OWNED = ['opacity', 'transform', 'translate', 'scale', 'rotate', 'stroke-dashoffset']; // CA-5 : propriétés animées admises pour une transition de page
const IGNORED_KEYS = ['offset', 'easing', 'composite', 'computedOffset'];
/** Relevé image par image (rAF) pendant `action` puis jusqu'à la fin des animations : invariants d'accessibilité, immobilité de l'en-tête et de la barre, débordement horizontal, et chaque animation de `main` vue (copie ou non, propriétés, durée, courbe, valeurs de translate / opacité). */
async function capture(page, action) {
  await page.evaluate(() => {
    const rect = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height].map(Math.round).join() : null; };
    window.__frames = []; window.__anims = new Map(); window.__watch = true;
    const tick = () => {
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
      window.__frames.push({
        interactive: [...document.querySelectorAll('.qa-page')].filter((e) => !e.closest('[inert]') && !e.closest('[aria-hidden="true"]')).length,
        h1: [...document.querySelectorAll('h1')].filter((e) => !e.closest('[inert]') && !e.closest('[aria-hidden="true"]')).length,
        dupIds: ids.length - new Set(ids).size,
        copies: document.querySelectorAll('[inert]').length,
        header: rect('.lc-shell__header'), nav: rect('.lc-shell__nav'),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      });
      for (const a of document.getAnimations()) {
        if (window.__anims.has(a)) continue;
        const t = a.effect?.target;
        if (!t?.closest?.('main')) continue;
        const kf = a.effect.getKeyframes();
        window.__anims.set(a, { copy: !!t.closest('[inert]'), duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing, props: [...new Set(kf.flatMap((k) => Object.keys(k)))].filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)), kf: kf.map((k) => ({ translate: k.translate ?? k.transform ?? '', opacity: k.opacity ?? '' })) });
      }
      if (window.__watch) requestAnimationFrame(tick);
    };
    tick();
  });
  await action();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await settled(page).catch(() => {});
  return page.evaluate(() => { window.__watch = false; return { frames: window.__frames, anims: [...window.__anims.values()] }; });
}
/** Premier nombre non nul d'une valeur `translate` : « -16px 0px » -> -16, « 100% » -> 100 ; `px` et `%` (part de la largeur `width`) ramenés en px. */
const shift = (value, width) => { const m = String(value).match(/(-?\d+(?:\.\d+)?)(%|px)?/g)?.map((t) => (t.endsWith('%') ? (parseFloat(t) * width) / 100 : parseFloat(t))).find((n) => n !== 0); return m ?? 0; };
const tokenPx = (page, name) => page.evaluate((n) => { const p = document.createElement('div'); p.style.width = `var(${n})`; document.body.append(p); const w = p.getBoundingClientRect().width; p.remove(); return w; }, name);
const tokenMs = (page, name) => page.evaluate((n) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)), name);
const tokenRaw = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).replace(/\s+/g, ''), name);
/** Invariants de CA-35 et de CA-31 sur tous les relevés d'une capture. */
function invariants(label, { frames }, { phone = false } = {}) {
  check(frames.length > 5, `${label} : relevé image par image`, `${frames.length} image(s)`);
  check(frames.every((f) => f.interactive <= 1), `CA-35 ${label} : une seule page interactive à chaque image`, JSON.stringify([...new Set(frames.map((f) => f.interactive))]));
  check(frames.every((f) => f.h1 <= 1), `CA-35 ${label} : un seul h1 hors [inert] / [aria-hidden] à chaque image`, JSON.stringify([...new Set(frames.map((f) => f.h1))]));
  check(frames.every((f) => f.dupIds === 0), `CA-35 ${label} : aucun id en double à chaque image`, `${Math.max(...frames.map((f) => f.dupIds))} doublon(s)`);
  if (phone) check(frames.every((f) => !f.overflow), `CA-31 ${label} : aucun défilement horizontal de la page à chaque image`, `${frames.filter((f) => f.overflow).length} image(s)`);
}
const sees = (capture_) => capture_.frames.some((f) => f.copies > 0);

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
    await step('historique -> liste (pour ?query)', () => page.click('#l-list'), 'back');
    await step('?query : même page', () => page.click('#l-query'), 'none');
    check((await page.evaluate(() => document.activeElement?.id)) === 'l-query', 'CA-32 ?query : le focus reste sur le lien cliqué', await page.evaluate(() => document.activeElement?.id));
    await step('fragment : même page', () => page.click('#l-fragment'), 'none');
    check((await page.evaluate(() => document.activeElement?.id)) === 'l-fragment', 'CA-32 fragment : le focus reste sur le lien cliqué', await page.evaluate(() => document.activeElement?.id));
    await step('skipLocationChange', () => page.click('#l-skip'), 'none');
    await step('route `data: { lcPageTransition: false }`', () => page.click('#l-plain'), 'none');
    await context.close();
    const deep = await open('/requests/42/history');
    const loadDeep = await deep.page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('main')).length);
    check(loadDeep === 0, 'CA-32 lien direct profond : aucune animation de page', `${loadDeep} animation(s)`);
    await deep.context.close();
  },

  // CA-35 : accessibilité pendant et après la transition, copie figée, rafale de navigations.
  async copie() {
    const { context, page } = await open();
    await page.evaluate(() => scrollTo(0, 400));
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => Math.round(document.querySelector('.qa-page').getBoundingClientRect().top));
    await page.click('#play');
    await page.waitForFunction(() => !document.querySelector('main #aud').paused);
    const samples = [];
    const run = capture(page, async () => {
      await page.evaluate(() => document.getElementById('l-42').click());
      for (const wait of [0, 100, 180, 500]) {
        await page.waitForTimeout(wait);
        const s = await page.evaluate(() => {
          const copy = document.querySelector('[inert]');
          return { copyTop: copy ? Math.round((copy.querySelector('.qa-page') ?? copy).getBoundingClientRect().top) : null };
        });
        s.h1 = ((await page.locator('body').ariaSnapshot()).match(/heading .*\[level=1\]/g) ?? []).length;
        samples.push(s);
      }
    });
    const first = await run;
    const end = await state(page);
    invariants('liste -> détail', first);
    check(samples.every((s) => s.h1 === 1), 'CA-35 un seul h1 dans l\'arbre d\'accessibilité (ariaSnapshot)', JSON.stringify(samples.map((s) => s.h1)));
    const seen = samples.filter((s) => s.copyTop !== null);
    check(seen.length >= 2, 'CA-35 l\'ancienne page est visible (copie) pendant sa sortie', `${seen.length} échantillon(s)`);
    check(seen.every((s) => Math.abs(s.copyTop - before) <= 2), `CA-35 défilement de la page quittée conservé (haut ${before})`, JSON.stringify(seen.map((s) => s.copyTop)));
    check(end.pages === 1 && end.copies === 0 && end.animations === 0, 'CA-35 fin : une page, aucune copie, aucune animation', JSON.stringify(end));
    check(end.focus.startsWith('H1:Demande'), 'CA-35 focus sur le h1 de la nouvelle page', end.focus);
    // La copie figée : inert, aria-hidden, sans id ni name, médias en pause (spec §5.4.3 et §7).
    await page.goBack(); await settled(page).catch(() => {});
    await page.click('#play');
    await page.waitForFunction(() => !document.querySelector('main #aud').paused);
    const copyShape = await (async () => {
      await page.evaluate(() => { window.__shape = null; const tick = () => { const c = document.querySelector('[inert]'); if (c && !window.__shape) window.__shape = { inert: c.hasAttribute('inert'), hidden: c.closest('[aria-hidden="true"]') !== null, ids: c.querySelectorAll('[id]').length + (c.id ? 1 : 0), names: c.querySelectorAll('[name]').length, audio: [...c.querySelectorAll('audio,video')].map((m) => m.paused), fixed: getComputedStyle(c).position }; if (!window.__shape) requestAnimationFrame(tick); }; tick(); });
      await page.evaluate(() => document.getElementById('l-42').click());
      await page.waitForFunction(() => window.__shape, null, { timeout: 3000 }).catch(() => {});
      return page.evaluate(() => window.__shape);
    })();
    check(copyShape !== null, 'CA-35 une copie de la page quittée est insérée', 'aucun élément [inert] vu');
    check(copyShape?.inert && copyShape?.hidden, 'CA-35 copie : inert et aria-hidden', JSON.stringify(copyShape));
    check(copyShape?.ids === 0 && copyShape?.names === 0, 'CA-35 copie : sans id ni name', JSON.stringify(copyShape));
    check(copyShape?.audio.length === 1 && copyShape.audio.every(Boolean), 'CA-35 copie : médias en pause', JSON.stringify(copyShape));
    check(copyShape?.fixed === 'fixed', 'CA-35 copie : position fixed', JSON.stringify(copyShape));
    await settled(page).catch(() => {});
    // Même route réutilisée : /requests/42 -> /requests/43, la copie assure la sortie.
    let sameRoute = null;
    const same = await capture(page, async () => {
      await page.evaluate(() => { window.__titles = []; const tick = () => { const c = document.querySelector('[inert] h1'); if (c) window.__titles.push([c.textContent, document.querySelector('main .qa-page:not([inert]) h1, main > :not([inert]) h1')?.textContent]); if (window.__watch) requestAnimationFrame(tick); }; tick(); });
      await page.click('#l-43');
    });
    sameRoute = await page.evaluate(() => window.__titles);
    invariants('détail 42 -> détail 43 (même route réutilisée)', same);
    check(sameRoute.some(([copy]) => copy === 'Demande n° 42'), 'CA-35 même route réutilisée : la copie montre la page 42 pendant la sortie', JSON.stringify(sameRoute.slice(0, 2)));
    // Rafale : 4 navigations rapprochées, puis la durée maximale écoulée.
    const burst = await capture(page, async () => {
      for (const selector of ['#l-hist', '#l-notif', '#l-list']) await page.evaluate((s) => document.querySelector(`main ${s}`)?.click(), selector);
      await page.waitForTimeout(40);
      await page.evaluate(() => document.getElementById('l-42').click());
      await page.waitForTimeout(1500); // plus que la durée maximale (entrée 700 ms)
    });
    invariants('4 navigations en rafale', burst);
    const rapid = await state(page);
    check(rapid.pages === 1 && rapid.copies === 0 && rapid.animations === 0, 'CA-35 4 navigations en rafale : une page, aucune copie restante', JSON.stringify(rapid));
    check(rapid.focus.startsWith('H1:Demande'), 'CA-35 4 navigations en rafale : focus sur le h1 de la dernière page', rapid.focus);
    await context.close();
  },

  // CA-33 (ordinateur) + CA-5 : seule la zone de contenu bouge, aux tokens `page.exit-*` / `page.enter-*`.
  async bureau() {
    const { context, page } = await open();
    const tokens = { exitMs: await tokenMs(page, '--lc-page-exit-duration'), enterMs: await tokenMs(page, '--lc-page-enter-duration'), exitPx: await tokenPx(page, '--lc-page-exit-offset'), enterPx: await tokenPx(page, '--lc-page-enter-offset'), ease: await tokenRaw(page, '--lc-page-enter-easing') };
    check(tokens.exitMs === 190 && tokens.enterMs === 700 && tokens.exitPx === 16 && tokens.enterPx === 26, 'CA-33 tokens page.* aux valeurs de §5.4.3 (190 ms / 700 ms / 16 px / 26 px)', JSON.stringify(tokens));
    for (const [label, action, sign] of [['avancer (liste -> détail)', () => page.click('#l-42'), 1], ['reculer (détail -> liste)', () => page.click('#l-list'), -1]]) {
      const c = await capture(page, action);
      const exit = c.anims.find((a) => a.copy), enter = c.anims.find((a) => !a.copy && a.props.includes('translate'));
      check(!!exit && !!enter, `CA-33 ordinateur ${label} : la page quittée (copie) et la page entrante s'animent`, JSON.stringify({ exit: !!exit, enter: !!enter }));
      if (!exit || !enter) continue;
      check(exit.props.every((k) => ['opacity', 'translate'].includes(k)) && exit.props.includes('opacity'), `CA-33 ${label} : sortie en fondu + translate individuel`, exit.props.join());
      check(exit.duration === tokens.exitMs && enter.duration === tokens.enterMs, `CA-33 ${label} : durées = tokens page.exit-duration / page.enter-duration`, `${exit.duration} / ${enter.duration}`);
      check(shift(exit.kf.at(-1).translate, 1100) === -sign * tokens.exitPx, `CA-33 ${label} : la sortie finit à ${-sign * tokens.exitPx} px (page.exit-offset, dans le sens)`, JSON.stringify(exit.kf));
      check(shift(enter.kf[0].translate, 1100) === sign * tokens.enterPx && shift(enter.kf.at(-1).translate, 1100) === 0, `CA-33 ${label} : l'entrée part de ${sign * tokens.enterPx} px et finit à 0 (page.enter-offset)`, JSON.stringify(enter.kf));
      check(enter.easing.replace(/\s+/g, '') === tokens.ease, 'CA-33 entrée : courbe = page.enter-easing', `${enter.easing} / ${tokens.ease}`);
      const moving = c.frames.filter((f) => f.copies > 0);
      check(moving.length > 5 && moving.every((f) => f.header === c.frames[0].header && f.nav === c.frames[0].nav), `CA-33 ${label} : en-tête et barre latérale immobiles à chaque image`, JSON.stringify([...new Set(moving.map((f) => `${f.header}|${f.nav}`))].slice(0, 3)));
      check(c.anims.length > 0 && c.anims.every((a) => a.props.every((k) => OWNED.includes(k))), `CA-5 ${label} : propriétés animées admises seulement`, JSON.stringify([...new Set(c.anims.flatMap((a) => a.props))]));
      invariants(`ordinateur ${label}`, c);
    }
    // Aux tokens : un thème qui change les durées est suivi (aucune valeur en dur).
    await page.addStyleTag({ content: ':root { --lc-page-exit-duration: 410ms; --lc-page-enter-duration: 930ms; }' });
    const themed = await capture(page, () => page.click('#l-42'));
    check(themed.anims.some((a) => a.copy && a.duration === 410) && themed.anims.some((a) => !a.copy && a.duration === 930), 'CA-33 thème : les durées suivent les tokens page.exit-duration (410 ms) et page.enter-duration (930 ms)', JSON.stringify(themed.anims.map((a) => [a.copy, a.duration])));
    await context.close();
  },

  // CA-33 (téléphone, < 768 px) + CA-31 + CA-5 : empilement aux tokens `page.stack-*` dans les deux sens.
  async telephone() {
    const { context, page } = await open('/requests', { viewport: { width: 360, height: 700 } });
    const tokens = { ms: await tokenMs(page, '--lc-page-stack-duration'), ease: await tokenRaw(page, '--lc-page-stack-easing'), dim: await tokenMs(page, '--lc-page-stack-dim'), recede: 0.3 * 360 };
    check(tokens.ms === 500 && tokens.dim === 0.12 && /^cubic-bezier/.test(tokens.ease), 'CA-33 tokens page.stack-* aux valeurs de §5.4.3 (500 ms, voile 0,12, courbe stack)', JSON.stringify(tokens));
    for (const [label, action, sign] of [['avancer (liste -> détail)', () => page.click('#l-42'), 1], ['reculer (détail -> liste)', () => page.click('#l-list'), -1]]) {
      const c = await capture(page, action);
      const entering = c.anims.find((a) => !a.copy && a.props.includes('translate')), leaving = c.anims.find((a) => a.copy && a.props.includes('translate'));
      check(!!entering && !!leaving, `CA-33 téléphone ${label} : les deux pages s'animent`, JSON.stringify({ entering: !!entering, leaving: !!leaving }));
      if (entering && leaving) {
        // Avancer : l'entrante vient de la droite (+100 %) et l'ancienne recule de 30 % vers la gauche ; reculer : inverse (l'ancienne revient de -30 %, l'autre repart à +100 %).
        const [inFrom, outTo] = sign > 0 ? [100 * 3.6, -tokens.recede] : [-tokens.recede, 100 * 3.6];
        check(Math.abs(shift(entering.kf[0].translate, 360) - inFrom) <= 1 && shift(entering.kf.at(-1).translate, 360) === 0, `CA-33 ${label} : la page entrante part de ${inFrom} px et finit à 0`, JSON.stringify(entering.kf));
        check(Math.abs(shift(leaving.kf.at(-1).translate, 360) - outTo) <= 1, `CA-33 ${label} : la page quittée finit à ${outTo} px (page.stack-recede = 30 %)`, JSON.stringify(leaving.kf));
        check(entering.duration === tokens.ms && leaving.duration === tokens.ms, `CA-33 ${label} : durée = page.stack-duration`, `${entering.duration} / ${leaving.duration}`);
        check(entering.easing.replace(/\s+/g, '') === tokens.ease, `CA-33 ${label} : courbe = page.stack-easing`, `${entering.easing} / ${tokens.ease}`);
      }
      check(c.anims.some((a) => a.kf.some((k) => Math.abs(parseFloat(k.opacity) - tokens.dim) < 0.005)), `CA-33 ${label} : un voile atteint l'opacité page.stack-dim (0,12)`, JSON.stringify(c.anims.map((a) => a.kf.map((k) => k.opacity))));
      check(c.anims.length > 0 && c.anims.every((a) => a.props.every((k) => OWNED.includes(k))), `CA-5 ${label} : propriétés animées admises seulement`, JSON.stringify([...new Set(c.anims.flatMap((a) => a.props))]));
      invariants(`téléphone ${label}`, c, { phone: true });
    }
    const themed = await (async () => { await page.addStyleTag({ content: ':root { --lc-page-stack-duration: 830ms; }' }); return capture(page, () => page.click('#l-42')); })();
    check(themed.anims.some((a) => a.duration === 830), 'CA-33 thème : la durée suit le token page.stack-duration (830 ms)', JSON.stringify(themed.anims.map((a) => a.duration)));
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
    for (const width of [1100, 360]) await reduit(width);
  },
};

async function reduit(width) {
  {
    const { context, page } = await open('/requests', { reducedMotion: 'reduce', viewport: { width, height: 700 } });
    await page.evaluate(() => document.getElementById('l-42').click());
    await page.waitForTimeout(30);
    const first = await state(page);
    check(first.pages === 1 && first.copies === 0 && first.animations === 0, `CA-3 ${width} px mouvement réduit : une page, aucune copie, aucune animation`, JSON.stringify(first));
    check(first.focus.startsWith('H1:Demande'), `CA-3 ${width} px mouvement réduit : focus sur le h1`, first.focus);
    await page.evaluate(() => document.getElementById('l-hist').click());
    await page.waitForTimeout(30);
    await page.goBack();
    await page.waitForTimeout(30);
    const last = await state(page);
    check(last.pages === 1 && last.copies === 0 && last.animations === 0, `CA-3 ${width} px mouvement réduit : retour navigateur, une page, aucune animation`, JSON.stringify(last));
    await context.close();
  }
}

try {
  for (const [name, run] of Object.entries(scenarios)) if (wanted.length === 0 ? name !== 'geste' : wanted.includes(name)) await run(); // `geste` (CA-34a) est à T14 : à la demande seulement
} finally {
  await browser.close();
  server.close();
}
process.exit(failures > 0 ? 1 : 0);
