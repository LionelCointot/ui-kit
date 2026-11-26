// Mesures du spike : node run.mjs q2|q1|q3|q4|q5 [a|b]   (dist/ construit par `npx ng build` dans ce dossier)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist', 'browser');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = await new Promise((ok) => {
  const s = createServer(async (rq, rs) => {
    const p = new URL(rq.url, 'http://x').pathname;
    const f = path.join(dir, path.extname(p) ? p : 'index.html');
    let body;
    try { body = await readFile(f); } catch { rs.writeHead(404).end(); return; }
    rs.writeHead(200, { 'content-type': T[path.extname(f)] ?? 'text/plain' }).end(body);
  });
  s.listen(0, '127.0.0.1', () => ok(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
const [, , which = 'q2', tech = 'b'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const ctxOpts = { viewport: { width: 1100, height: 700 }, reducedMotion: 'no-preference' };
const out = (...a) => console.log(...a);
let fails = 0;
const check = (n, ok, d = '') => { if (!ok) fails++; out(`${ok ? 'OK ' : 'KO '} ${n}${ok ? '' : ' : ' + d}`); };

async function open(opts = {}, url = '/requests', t = tech) {
  const ctx = await browser.newContext({ ...ctxOpts, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out('PAGEERROR', e.message));
  await page.goto(`${base}${url}${url.includes('?') ? '&' : '?'}tech=${t}`);
  await page.waitForSelector('.sp-page');
  return { ctx, page };
}
const last = (page) => page.evaluate(() => { const l = window.__spike.nav.log; const e = l[l.length - 1]; return e && { dir: e.dir, url: e.url, trigger: e.trigger, levels: e.levels }; });
const state = (page) => page.evaluate(() => ({
  url: location.pathname,
  pages: document.querySelectorAll('.sp-page').length,
  clones: document.querySelectorAll('[data-clone]').length,
  anims: document.getAnimations().length,
  focus: document.activeElement?.tagName + ':' + (document.activeElement?.textContent ?? '').slice(0, 20),
  scrollY: Math.round(scrollY),
}));
const settled = (page) => page.waitForFunction(() => document.querySelectorAll('.sp-page').length === 1 && document.getAnimations().length === 0, null, { timeout: 5000 });
const go = async (page, sel) => { await page.click(sel); await page.waitForTimeout(50); await settled(page); };

const scenarios = {
  async q2() {
    const { ctx, page } = await open();
    const exp = [];
    const step = async (label, fn, want) => {
      await fn(); await page.waitForTimeout(60); await settled(page);
      const l = await last(page);
      exp.push({ label, ...l, want });
      check(`${label} -> ${l.dir} (${l.url}, ${l.trigger})`, l.dir === want, `attendu ${want}`);
    };
    const l0 = await last(page);
    check('lien direct /requests -> init', l0.dir === 'init', l0.dir);
    check('niveaux lus des title des routes', JSON.stringify(l0.levels) === '["Mes demandes"]', JSON.stringify(l0.levels));
    await step('liste -> detail (clic)', () => page.click('#l-42'), 'forward');
    await step('detail -> historique (clic)', () => page.click('#l-hist'), 'forward');
    await step('historique -> rubrique Notifications (clic, depth 3->1)', () => page.click('#l-notif'), 'back');
    await step('retour navigateur vers page PLUS PROFONDE (historique)', () => page.goBack(), 'back');
    await step('retour navigateur historique -> detail', () => page.goBack(), 'back');
    await step('avance navigateur detail -> historique', () => page.goForward(), 'forward');
    await step('retour navigateur historique -> detail', () => page.goBack(), 'back');
    await step('retour navigateur detail -> liste', () => page.goBack(), 'back');
    out(JSON.stringify(await page.evaluate(() => window.__spike.nav.log.map((l) => [l.url, l.dir, l.trigger, l.restored, l.entry]))));
    await step('liste -> Notifications (meme niveau, rubrique suivante)', () => page.click('.side a[href="/notifications"]'), 'forward');
    await step('Notifications -> liste (meme niveau, rubrique precedente)', () => page.click('.side a[href="/requests"]'), 'back');
    await step('liste -> detail 42', () => page.click('#l-42'), 'forward');
    await step('detail 42 -> detail 43 (meme route reutilisee, meme niveau)', () => page.click('#l-43'), 'same');
    await step('redirectTo /old-requests -> /requests/42 depuis detail 43 (meme niveau)', () => page.click('#l-old'), 'same');
    await step('retour liste (liste)', () => page.click('.side a[href="/requests"]'), 'back');
    await step('redirectTo /old-requests depuis liste -> /requests/42', () => page.click('#l-old'), 'forward');
    const lo = await last(page); check('redirection : URL finale utilisee', lo.url === '/requests/42', lo.url);
    await step('garde qui redirige (UrlTree) /secret -> /notifications depuis detail', () => page.click('#l-secret'), 'back');
    const ls = await last(page); check('garde : URL finale', ls.url === '/notifications', ls.url);
    await step('Notifications -> liste', () => page.click('.side a[href="/requests"]'), 'back');
    await step('liste -> detail avec replaceUrl (entree remplacee)', () => page.click('main .sp-page:not([inert]) #l-42r'), 'forward');
    await step('detail -> historique', () => page.click('main .sp-page:not([inert]) #l-hist'), 'forward');
    await step('retour navigateur historique -> detail (entree remplacee)', () => page.goBack(), 'back');
    await step('avance navigateur detail -> historique apres replaceUrl', () => page.goForward(), 'forward');
    // lien direct profond, puis retour applicatif
    const b = await open({}, '/requests/42/history');
    const ld = await last(b.page);
    check('lien direct profond -> init', ld.dir === 'init', ld.dir);
    check('niveaux d\'un lien direct profond', JSON.stringify(ld.levels) === '["Mes demandes","Demande n° 42","Historique"]', JSON.stringify(ld.levels));
    await ctx.close(); await b.ctx.close();
  },
};
// ---- Q1 / Q5 : conservation de l'ancienne page pendant sa sortie ----
const sample = async (page, label) => {
  const s = await page.evaluate(() => {
    const leaving = document.querySelector('.sp-leave, [data-clone]:not([data-under])');
    const cur = [...document.querySelectorAll('main .sp-page:not(.sp-leave):not([data-clone])')].at(-1);
    return {
      pages: document.querySelectorAll('.sp-page').length,
      interactive: [...document.querySelectorAll('.sp-page')].filter((e) => !e.closest('[inert]') && e.getAttribute('aria-hidden') !== 'true').length,
      dupNote: document.querySelectorAll('#note').length,
      anims: document.getAnimations().length,
      leavingTop: leaving ? Math.round(leaving.getBoundingClientRect().top) : null,
      leavingOpacity: leaving ? +getComputedStyle(leaving).opacity : null,
      curOpacity: cur ? +getComputedStyle(cur).opacity : null,
      scrollY: Math.round(scrollY),
      focus: document.activeElement?.tagName + ':' + (document.activeElement?.textContent ?? '').slice(0, 16),
    };
  });
  const aria = await page.locator('main').ariaSnapshot();
  s.h1InA11yTree = (aria.match(/heading .*\[level=1\]/g) ?? []).length;
  s.label = label;
  return s;
};
scenarios.q1 = async function q1() {
  const { ctx, page } = await open();
  await page.evaluate(() => scrollTo(0, 400)); await page.waitForTimeout(100);
  const before = await page.evaluate(() => Math.round(document.querySelector('.sp-page').getBoundingClientRect().top));
  const samples = [];
  await page.evaluate(() => document.querySelector('#l-42').click());
  for (const [ms, l] of [[0, 't0'], [100, 't100'], [180, 't280'], [500, 't780']]) {
    await page.waitForTimeout(ms); samples.push(await sample(page, l));
  }
  await settled(page);
  const end = await sample(page, 'end');
  const t = await page.title();
  for (const s of samples) out(JSON.stringify(s));
  out('END', JSON.stringify(end), 'title=' + t, 'topBefore=' + before);
  check(`[${tech}] une seule page interactive a chaque instant`, samples.every((s) => s.interactive <= 1), JSON.stringify(samples.map((s) => s.interactive)));
  check(`[${tech}] pas d'id en double (#note)`, samples.every((s) => s.dupNote <= 1), JSON.stringify(samples.map((s) => s.dupNote)));
  check(`[${tech}] un seul h1 dans l'arbre d'accessibilite`, samples.every((s) => s.h1InA11yTree === 1), JSON.stringify(samples.map((s) => s.h1InA11yTree)));
  const lv = samples.filter((s) => s.leavingTop !== null);
  check(`[${tech}] ancienne page vue pendant la sortie (au moins 2 echantillons)`, lv.length >= 2, `n=${lv.length}`);
  check(`[${tech}] pas de saut de defilement de l'ancienne page (top ${before})`, lv.length > 0 && lv.every((s) => Math.abs(s.leavingTop - before) <= 2), JSON.stringify(lv.map((s) => s.leavingTop)));
  check(`[${tech}] fin : 1 page, 0 animation, 0 copie`, end.pages === 1 && end.anims === 0, JSON.stringify(end));
  check(`[${tech}] fin : focus sur le titre H1 de la nouvelle page`, end.focus.startsWith('H1:Demande'), end.focus);
  // navigations rapides : rien ne reste
  for (const sel of ['#l-hist', '#l-notif', '#l-list']) await page.evaluate((s) => document.querySelector(`main .sp-page:not([inert]):not([data-clone]) ${s}`)?.click(), sel);
  await page.waitForTimeout(40);
  await page.evaluate(() => document.querySelector('.side a[href="/requests"]').click());
  await page.waitForTimeout(1200);
  const rapid = await state(page);
  check(`[${tech}] 4 navigations en rafale : 1 page, 0 copie, 0 animation`, rapid.pages === 1 && rapid.clones === 0 && rapid.anims === 0, JSON.stringify(rapid));
  await ctx.close();
};
// Enveloppeur recree a chaque navigation (tech w) : que contient l'enveloppeur sortant ?
scenarios.qw = async function qw() {
  const { ctx, page } = await open({}, '/requests', 'w');
  await page.evaluate(() => document.querySelector('#l-42').click());
  for (const ms of [0, 60, 150, 400]) {
    await page.waitForTimeout(ms);
    out(ms, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.sp-wrap')].map((w) => ({ leaving: w.classList.contains('sp-leave'), h1: w.querySelector('h1')?.textContent, pages: w.querySelectorAll('.sp-page').length })))));
  }
  await ctx.close();
};
// Route reutilisee (/requests/42 -> /requests/43 : meme composant, jamais detruit) : la sortie existe-t-elle ?
scenarios.qreuse = async function qreuse() {
  const { ctx, page } = await open({}, '/requests/42');
  await page.evaluate(() => document.querySelector('#l-43').click());
  await page.waitForTimeout(60);
  const s = await sample(page, 'reuse +60ms');
  out(JSON.stringify(s));
  check(`[${tech}] route reutilisee : une ancienne page visible pendant la sortie`, s.leavingTop !== null && s.leavingOpacity > 0, JSON.stringify(s));
  await settled(page); const e = await state(page);
  check(`[${tech}] route reutilisee : fin propre`, e.pages === 1 && e.clones === 0 && e.anims === 0, JSON.stringify(e));
  await ctx.close();
};
const MOBILE = { viewport: { width: 390, height: 800 } };
const backLabel = (page) => page.evaluate(() => document.querySelector('#back')?.textContent?.trim() ?? null);
scenarios.q3 = async function q3() {
  const { ctx, page } = await open(MOBILE, '/requests/42/history');
  check('lien direct profond : libelle du retour = titre du parent (route) sans ecriture a la main', (await backLabel(page)) === '‹ Demande n° 42', await backLabel(page));
  await go(page, '#back');
  check('apres retour : libelle = titre du niveau 1', (await backLabel(page)) === '‹ Mes demandes', await backLabel(page));
  await go(page, '#back');
  check('niveau 1 : pas de bouton retour', (await backLabel(page)) === null, await backLabel(page));
  check('document.title = titre de la route (TitleStrategy par defaut)', (await page.title()) === 'Mes demandes', await page.title());
  await ctx.close();
};
scenarios.q4 = async function q4() {
  const shot = (p, n) => p.screenshot({ path: `${process.env.SHOTS ?? '.'}/${n}.png` });
  const drag = async (page, to, release = true) => {
    await page.mouse.move(5, 400); await page.mouse.down();
    await page.mouse.move(to, 400, { steps: 6 });
    if (release) await page.mouse.up();
  };
  const under = (page) => page.evaluate(() => {
    const u = document.querySelector('[data-under]');
    const c = [...document.querySelectorAll('main .sp-page:not([data-clone])')].at(-1);
    return {
      path: location.pathname, hasUnder: !!u, underText: u?.querySelector('h1')?.textContent ?? u?.textContent?.slice(0, 20) ?? null,
      placeholder: u?.classList.contains('sp-placeholder') ?? false,
      underLeft: u ? Math.round(u.getBoundingClientRect().left) : null,
      dim: u ? +getComputedStyle(u.querySelector('.sp-dim')).opacity.slice(0, 5) : null,
      curLeft: c ? Math.round(c.getBoundingClientRect().left) : null,
      inert: u?.inert ?? null,
    };
  });
  // 1. forward puis geste engage avec copie de la page precedente
  let { ctx, page } = await open(MOBILE, '/requests');
  await go(page, '#l-42');
  check('copie de la page precedente gardee (forward)', (await page.evaluate(() => window.__spike.snaps())).includes('/requests'));
  await drag(page, 150, false);
  const mid = await under(page);
  out('pendant le geste (doigt a 150 px) :', JSON.stringify(mid));
  await shot(page, 'q4-pendant-le-geste');
  check('pendant le geste : navigation PAS encore faite', mid.path === '/requests/42', mid.path);
  check('pendant le geste : page precedente visible dessous (copie)', mid.hasUnder && mid.underText === 'Mes demandes' && !mid.placeholder, JSON.stringify(mid));
  check('pendant le geste : page courante suit le doigt, dessous en parallaxe + voile', mid.curLeft > 140 && mid.underLeft < 0 && mid.underLeft > -117 && mid.dim > 0.1, JSON.stringify(mid));
  check('copie dessous non interactive (inert)', mid.inert === true);
  await page.mouse.move(330, 400, { steps: 4 }); await page.mouse.up();
  await page.waitForFunction(() => location.pathname === '/requests' && document.querySelectorAll('[data-under]').length === 0 && document.getAnimations().length === 0, null, { timeout: 4000 });
  const end = await state(page);
  check('geste engage : navigation faite, 1 page, 0 copie, 0 animation, focus H1', end.pages === 1 && end.clones === 0 && end.anims === 0 && end.focus.startsWith('H1:Mes demandes'), JSON.stringify(end));
  // 2. geste annule
  await go(page, '#l-42');
  await page.mouse.move(5, 400); await page.mouse.down();
  for (const x of [20, 35, 50, 60]) { await page.mouse.move(x, 400); await page.waitForTimeout(80); } // doigt lent : pas de « fling »
  await page.mouse.up();
  await page.waitForTimeout(700);
  const cancel = await under(page); const cs = await state(page);
  check('geste annule : reste sur la page, rien ne reste', cancel.path === '/requests/42' && !cancel.hasUnder && cs.pages === 1 && cs.clones === 0 && cs.anims === 0, JSON.stringify({ cancel, cs }));
  await ctx.close();
  // 3. lien direct : aucune copie -> degradation
  ({ ctx, page } = await open(MOBILE, '/requests/42'));
  await drag(page, 150, false);
  const d = await under(page);
  out('lien direct pendant le geste :', JSON.stringify(d));
  await shot(page, 'q4-lien-direct');
  check('lien direct : pas de copie -> fond neutre + titre du parent (degradation)', d.hasUnder && d.placeholder && d.underText === 'Mes demandes', JSON.stringify(d));
  await page.mouse.up(); await page.waitForTimeout(900);
  const de = await state(page);
  check('lien direct, geste engage : navigation faite, rien ne reste', de.url === '/requests' && de.pages === 1 && de.clones === 0 && de.anims === 0, JSON.stringify(de));
  await ctx.close();
  // 4. empilement iOS au clic (avant puis bouton retour)
  ({ ctx, page } = await open(MOBILE, '/requests'));
  await page.evaluate(() => document.querySelector('#l-42').click());
  await page.waitForTimeout(150);
  const f = await page.evaluate(() => ({ cur: getComputedStyle([...document.querySelectorAll('main .sp-page:not([data-clone])')].at(-1)).transform, old: getComputedStyle(document.querySelector('[data-clone]')).transform, pages: document.querySelectorAll('.sp-page').length }));
  out('empilement avant a +150ms :', JSON.stringify(f));
  check('empilement avant : nouvelle page translatee (arrive de la droite), ancienne reculee, 2 pages', f.cur !== 'none' && f.old !== 'none' && f.pages === 2, JSON.stringify(f));
  await settled(page);
  await go(page, '#back');
  const e2 = await state(page); const lg = await last(page);
  check('bouton retour : sens back, fin propre', lg.dir === 'back' && e2.pages === 1 && e2.clones === 0 && e2.anims === 0, JSON.stringify({ lg, e2 }));
  await ctx.close();
};
scenarios.q5 = async function q5() {
  const { ctx, page } = await open({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.querySelector('#l-42').click());
  await page.waitForTimeout(30);
  const s = await sample(page, 'reduit +30ms');
  out(JSON.stringify(s));
  check(`[${tech}] mouvement reduit : 1 page, 0 animation, aucune copie`, s.pages === 1 && s.anims === 0, JSON.stringify(s));
  check(`[${tech}] mouvement reduit : focus sur H1`, s.focus.startsWith('H1:Demande'), s.focus);
  await page.evaluate(() => document.querySelector('#l-hist').click()); await page.waitForTimeout(30);
  const r = await state(page);
  check(`[${tech}] mouvement reduit 2e navigation : 1 page`, r.pages === 1 && r.anims === 0, JSON.stringify(r));
  await page.goBack(); await page.waitForTimeout(30);
  const g = await state(page);
  check(`[${tech}] mouvement reduit retour navigateur : 1 page`, g.pages === 1 && g.anims === 0, JSON.stringify(g));
  await ctx.close();
};
await scenarios[which]();
await browser.close(); server.close();
out(fails ? `ECHECS: ${fails}` : 'TOUT OK');
process.exit(fails ? 1 : 0);
