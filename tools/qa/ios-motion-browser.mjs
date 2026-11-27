// Acceptation navigateur de docs/specs/2026-11-mouvement-ios.md (Chromium, Storybook statique dist/storybook ; STORYBOOK_DIR pour une autre construction).
//   node tools/qa/ios-motion-browser.mjs sheet|collapse|chips|overlays|misc|hover|all [...]
//   sheet : CA-24 (spec 2026-12-mouvement-v2, T9b) + CA-S0 S1 S2 S3 S4 S5 S6 S7 S8 S9 F1 R1 · collapse : H1 H2 H3 H5 R1 · chips : H4 R1 · overlays : O1 O2 O3 R1 · misc : T1 C1 A1 R1 · hover : V1
// Stories : QA/Overlays/iOS motion (overlay), QA/Motion/Data table, Layout/Disclosure, Navigation/Nav group, etc. Code de sortie 1 au moindre échec.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = await new Promise((ok) => { const s = createServer(async (rq, rs) => { try { const f = path.join(dir, path.normalize(decodeURIComponent(new URL(rq.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')); rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }).end(await readFile(f)); } catch { rs.writeHead(404).end(); } }); s.listen(0, '127.0.0.1', () => ok(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${name}${ok ? '' : ` : ${detail}`}`); };
const near = (a, b, eps = 1) => Math.abs(a - b) <= eps;

// Utilitaires côté page (window.Q).
const INIT = () => {
  const root = getComputedStyle(document.documentElement);
  const Q = (window.Q = {});
  Q.ms = (n) => { const v = root.getPropertyValue(n).trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible ${n}="${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  Q.probe = (css, prop) => { const p = document.createElement('div'); p.style.cssText = `position:absolute;${css}`; document.body.append(p); const v = getComputedStyle(p)[prop]; p.remove(); return v; };
  Q.px = (n) => parseFloat(Q.probe(`width:var(${n})`, 'width'));
  Q.ease = (n) => Q.probe(`transition-timing-function:var(${n})`, 'transitionTimingFunction');
  Q.raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  Q.until = async (f, t = 3000) => { const s = performance.now(); while (!f()) { if (performance.now() - s > t) return false; await new Promise((r) => setTimeout(r, 16)); } return true; };
  Q.settle = async () => { await Q.raf(); await Promise.allSettled(document.getAnimations().map((a) => a.finished)); await Q.raf(); };
  Q.y = (el) => new DOMMatrix(getComputedStyle(el).transform).m42;
  Q.x = (el) => new DOMMatrix(getComputedStyle(el).transform).m41;
  Q.anims = (el) => el.getAnimations({ subtree: true }).map((a) => ({ a, prop: a.transitionProperty ?? a.animationName, pseudo: a.effect.pseudoElement, el: a.effect.target, t: a.effect.getComputedTiming(), ease: a.effect.getTiming().easing, props: a.effect.getKeyframes().flatMap((k) => Object.keys(k)) }));
  // Position verticale = transform (m42) + propriété individuelle `translate` : la spec laisse le choix (ADR 0011 : translate individuel pour l'entrée et la sortie).
  Q.ty = (el) => { const cs = getComputedStyle(el); const tr = cs.translate === 'none' ? 0 : parseFloat(cs.translate.split(' ')[1] ?? '0'); return new DOMMatrix(cs.transform).m42 + tr; };
  // Animations de glissement du <dialog> lui-même (CSS ou WAAPI) : durée, courbe (de l'effet, sinon de la première image clé), propriétés ; `a` est non énumérable (sérialisable).
  Q.slide = (el) => el.getAnimations().filter((a) => !a.effect.pseudoElement && a.effect.target === el && a.effect.getKeyframes().some((k) => 'transform' in k || 'translate' in k)).map((a) => { const e = a.effect.getTiming().easing; const r = { duration: a.effect.getComputedTiming().duration, ease: e !== 'linear' ? e : (a.effect.getKeyframes()[0].easing ?? e), props: a.effect.getKeyframes().flatMap((k) => Object.keys(k)) }; Object.defineProperty(r, 'a', { value: a }); return r; });
  Q.at = (el, t) => { el.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t; }); };
  Q.reduced = (el) => Q.anims(el).every((x) => x.t.duration <= 0.01 && x.t.delay <= 0.01);
};
const hand = (cs) => cs;
async function open(ctx, id, args = '') {
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__closeCalls = 0; window.__pm = []; addEventListener('pointerdown', (e) => { window.__pid = e.pointerId; window.__ptype = e.pointerType; }, true); addEventListener('pointermove', (e) => window.__pm.push([e.timeStamp, e.clientY]), true); const c = HTMLDialogElement.prototype.close; HTMLDialogElement.prototype.close = function (...a) { window.__closeCalls += 1; return c.apply(this, a); }; });
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${args}`);
  await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 });
  await page.evaluate(INIT); // les jetons de :root sont lus à l'appel (CSS chargé)
  await page.waitForTimeout(500);
  return page;
}
const PHONE = { viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true };
const DESK = { viewport: { width: 1280, height: 800 } };
const ctxs = { phone: PHONE, desk: DESK, phoneReduced: { ...PHONE, reducedMotion: 'reduce' }, deskReduced: { ...DESK, reducedMotion: 'reduce' }, phoneForced: { ...PHONE, forcedColors: 'active' } };
const withCtx = async (name, fn) => { const c = await browser.newContext(ctxs[name]); try { await fn(c); } catch (e) { check(`${name} : exception`, false, String(e.message).split('\n')[0]); } finally { await c.close(); } };

// ---------- lc-sheet autonome (story QA) ----------
// Spec 2026-12-mouvement-v2, CA-24 (T9b) : valeurs 600 / 300 / 500 ms, coins 24 px, 92 dvh ; seuils 1/3 de la hauteur et 0,6 px/ms (constantes du code, pas des jetons) ;
// ressort et élastique en lcAnimate ; voile = 1 − distance / hauteur. Les durées se lisent sur les animations réelles (CSS ou WAAPI), la position sur transform + translate.
const SD = 'lc-sheet dialog';
const SHEET_STORY = 'qa-overlays-ios-motion--overlays';
const openSheet = async (page) => { await page.click('#qa-open-sheet'); await page.waitForFunction((s) => document.querySelector(s)?.open, SD); await page.evaluate(async () => { await window.Q.settle(); const d = document.querySelector('lc-sheet dialog'); for (const e of d.querySelectorAll('*')) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (e.getAttribute('aria-hidden') === 'true' && Math.abs(r.width - 36) < 1 && Math.abs(r.height - 5) < 1) e.setAttribute('data-qa-handle', ''); if (/auto|scroll/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) e.setAttribute('data-qa-scroller', ''); } }); };
const m42 = (page) => page.evaluate((s) => window.Q.ty(document.querySelector(s)), SD);
const centre = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
async function drag(page, from, dy, ms, steps = 10) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x, from.y + (dy * i) / steps); await page.waitForTimeout(ms / steps); }
}
/** Tire la poignée jusqu'à `to` px sous sa position de départ, à `v` px/ms : pointerdown réel, pointermove synthétiques aux horodatages maîtrisés (boucle dans la page, indépendante de la cadence d'images et de la charge : `page.mouse` fusionne les déplacements quand la machine est chargée). Rappelée, elle continue le même tirage. */
async function pull(page, to, v) {
  if (!(await page.evaluate(() => !!window.__drag))) { const h = await centre(page, '[data-qa-handle]'); await page.mouse.move(h.x, h.y); await page.mouse.down(); await page.evaluate((x) => { window.__drag = { x: x.x, y: x.y, at: 0 }; window.__pm.length = 0; }, h); }
  await page.evaluate(async ({ to, v }) => {
    const g = window.__drag, from = g.at, total = Math.abs(to - from) / v, n = Math.max(2, Math.ceil(total / 16)), t0 = performance.now(), el = document.querySelector('[data-qa-handle]');
    for (let i = 1; i <= n; i++) {
      const due = t0 + (total * i) / n, wait = due - performance.now();
      if (wait > 6) await new Promise((r) => setTimeout(r, wait - 4));
      while (performance.now() < due) { /* attente active : l'horodatage de l'événement est celui de sa création */ }
      g.at = from + ((to - from) * i) / n;
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: window.__pid, pointerType: window.__ptype, isPrimary: true, bubbles: true, cancelable: true, clientX: g.x, clientY: g.y + g.at, buttons: 1 }));
    }
  }, { to, v });
}
/** Relâche : pointerup synthétique à l'horodatage courant (le composant décide au relâchement), puis le bouton réel. */
async function drop(page) {
  await page.evaluate(() => { const g = window.__drag; window.__drag = null; document.querySelector('[data-qa-handle]').dispatchEvent(new PointerEvent('pointerup', { pointerId: window.__pid, pointerType: window.__ptype, isPrimary: true, bubbles: true, cancelable: true, clientX: g.x, clientY: g.y + g.at })); });
  await page.mouse.up();
}
const closedCount = (page) => page.evaluate(() => window.__qa?.closed.length ?? 0);
const isOpen = (page) => page.evaluate((s) => document.querySelector(s).open, SD);
const veil = (page) => page.evaluate((s) => parseFloat(getComputedStyle(document.querySelector(s), '::backdrop').opacity), SD);
/** Vitesse réelle du geste (px/ms sur les 100 dernières ms), lue sur les `timeStamp` des pointermove enregistrés par `open()` : elle ne dépend pas de la charge de la machine. */
const speed = (page) => page.evaluate(() => { const p = window.__pm; const l = p.at(-1); const f = p.find((x) => l[0] - x[0] <= 100); return l[0] === f[0] ? 0 : (l[1] - f[1]) / (l[0] - f[0]); });
/** Animations de glissement de la feuille (transform ou translate sur le <dialog> lui-même) : durée, courbe et amplitude, mesurées dans la page. */
const SLIDE = () => window.Q.slide(document.querySelector('lc-sheet dialog'));
const gone = (page, ms = 1200) => page.waitForFunction((s) => !document.querySelector(s).open, SD, { timeout: ms }).then(() => true, () => false);

async function sheet() {
  await withCtx('phone', async (c) => {
    const page = await open(c, SHEET_STORY);
    const t = await page.evaluate(() => ({ enter: Q.ms('--lc-sheet-enter-duration'), exit: Q.ms('--lc-sheet-exit-duration'), spring: Q.ms('--lc-sheet-spring-duration'), radius: Q.px('--lc-sheet-top-radius'), ratio: getComputedStyle(document.documentElement).getPropertyValue('--lc-sheet-dismiss-ratio').trim(), enterEase: Q.ease('--lc-sheet-enter-easing'), exitEase: Q.ease('--lc-sheet-exit-easing') }));
    check('CA-24 jetons : ouverture 600 ms, fermeture 300 ms, ressort 500 ms, coins 24 px', t.enter === 600 && t.exit === 300 && t.spring === 500 && t.radius === 24, JSON.stringify(t));
    check('CA-24 le seuil de fermeture est une constante du code : plus de jeton --lc-sheet-dismiss-ratio', t.ratio === '', t.ratio);
    // CA-24 ouverture : durée, courbe et départ mesurés dans le même evaluate que le clic.
    const op = await page.evaluate(async () => { const b = document.querySelector('#qa-open-sheet'); b.focus(); b.click(); await Q.raf(); const d = document.querySelector('lc-sheet dialog'); const s = Q.slide(d); const h = d.getBoundingClientRect().height; const y = Q.ty(d); const r = { s, h, y, bd: Q.anims(d).filter((x) => x.pseudo === '::backdrop').length }; await Q.settle(); return r; });
    check('CA-24 ouverture : glissement en 600 ms (--lc-sheet-enter-duration), courbe --lc-sheet-enter-easing, départ hors écran', op.s.length > 0 && op.s.every((x) => near(x.duration, t.enter, 0.5) && x.ease === t.enterEase) && op.y > op.h * 0.5, JSON.stringify(op));
    // CA-S0 : Échap animé, focus rendu, closed une seule fois à la fin de la sortie.
    check('CA-S0 ouverture : dialog.lc-sheet__dialog modal ouvert', await page.evaluate(() => document.querySelector('lc-sheet dialog.lc-sheet__dialog')?.open === true && document.querySelector('lc-sheet dialog').matches(':modal')));
    await page.keyboard.press('Escape'); // Chrome rend le 2e Échap sans activation non annulable : la double fermeture passe par la croix
    await page.evaluate(() => document.querySelector('lc-sheet dialog button[class*="close"]').click());
    const mid = await page.evaluate(async () => { await Q.raf(); const d = document.querySelector('lc-sheet dialog'); return { closing: d.hasAttribute('data-closing'), open: d.open, closed: window.__qa?.closed.length ?? 0, s: Q.slide(d) }; });
    check('CA-24 fermeture : data-closing, encore ouverte, closed pas encore émis, descente en 300 ms (--lc-sheet-exit-duration), courbe --lc-sheet-exit-easing', mid.closing && mid.open && mid.closed === 0 && mid.s.length > 0 && mid.s.every((x) => near(x.duration, t.exit, 0.5) && x.ease === t.exitEase), JSON.stringify(mid));
    await page.waitForFunction((s) => !document.querySelector(s).open, SD); await page.waitForTimeout(700);
    check('CA-S0/S7 closed émis une seule fois, close() appelé une seule fois (Échap puis croix)', (await closedCount(page)) === 1 && (await page.evaluate(() => window.__closeCalls)) === 1, `closed=${await closedCount(page)} close()=${await page.evaluate(() => window.__closeCalls)}`);
    check('CA-S0 focus rendu au bouton d’ouverture', await page.evaluate(() => document.activeElement?.id === 'qa-open-sheet'));
    // CA-S7 : rouvrir pendant la descente.
    await openSheet(page); await page.keyboard.press('Escape');
    const re = await page.evaluate(async () => { const d = document.querySelector('lc-sheet dialog'); await Q.until(() => d.hasAttribute('data-closing')); await Q.raf(); Q.at(d, Q.ms('--lc-sheet-exit-duration') / 2); const before = Q.ty(d), h = d.getBoundingClientRect().height; document.querySelector('#qa-open-sheet').click(); await Q.raf(); Q.at(d, 0); return { before, after: Q.ty(d), h, closing: d.hasAttribute('data-closing') }; });
    check('CA-S7 réouverture : repart de la position courante (± 5 %), data-closing retiré', re.before > 0 && Math.abs(re.after - re.before) <= 0.05 * re.h && !re.closing, JSON.stringify(re));
    await page.evaluate(() => document.getAnimations().forEach((a) => a.play())); await page.waitForTimeout(1000);
    check('CA-S7 dialog.open === true à la fin, closed non émis', (await isOpen(page)) && (await closedCount(page)) === 1, `open=${await isOpen(page)} closed=${await closedCount(page)}`);
    await page.reload(); await page.waitForSelector('#storybook-root > *'); await page.evaluate(INIT); await page.waitForTimeout(400);

    // Gestes. Hauteur : le contenu (60 lignes) dépasse l'écran, la feuille vaut donc sa hauteur maximale.
    const H = async () => centre(page, '[data-qa-handle]');
    const dh = () => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().height, SD);
    const restart = async () => { if (!(await isOpen(page))) { await openSheet(page); await page.waitForTimeout(100); } await page.evaluate(() => { window.__pm.length = 0; }); };
    await openSheet(page); const height = await dh(); const h0 = await H();
    const vh = await page.evaluate(() => innerHeight);
    check('CA-24 hauteur maximale 92 dvh (contenu long)', near(height, 0.92 * vh, 1), `${height} / ${vh}`);
    const corners = await page.evaluate((s) => { const cs = getComputedStyle(document.querySelector(s)); return ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map((k) => parseFloat(cs[`border${k}Radius`])); }, SD);
    check('CA-24 coins hauts 24 px, bas droit', corners[0] === 24 && corners[1] === 24 && corners[2] === 0 && corners[3] === 0, JSON.stringify(corners));
    check('CA-S1/S3 poignée 36 × 5 px trouvée (aria-hidden)', await page.locator('[data-qa-handle]').count() === 1);
    await drag(page, h0, 100, 1000);
    const dragging = await page.evaluate((s) => { const d = document.querySelector(s); const cs = getComputedStyle(d); return { y: Q.ty(d), trans: cs.transitionDuration, anims: Q.slide(d).length }; }, SD);
    check('CA-S3 pendant le tirage : transform = doigt (± 1 px), sans transition ni animation en cours', near(dragging.y, 100, 1.5) && dragging.trans.split(',').every((v) => parseFloat(v) === 0) && dragging.anims === 0, JSON.stringify(dragging));
    await page.mouse.up(); await page.waitForTimeout(700);
    // CA-24 : tirer de 31 % ramène, de 36 % ferme (lent : 0,15 px/ms). Voile mesuré à 25, 50 et 75 % : 1 − distance / hauteur (± 0,02).
    await restart();
    for (const frac of [0.25, 0.5, 0.75]) {
      await pull(page, frac * height, 0.3); await page.evaluate(() => Q.raf()); await page.waitForTimeout(50);
      const d = await m42(page), v = await veil(page);
      check(`CA-24 voile à ${frac * 100} % : 1 − distance / hauteur (± 0,02)`, near(v, 1 - d / height, 0.02) && near(d, frac * height, 1.5), `voile=${v} distance=${d} hauteur=${height}`);
    }
    await drop(page); await gone(page, 1500); await page.waitForTimeout(600);
    await restart(); const c0 = await closedCount(page); await pull(page, 0.31 * height, 0.15); const sp = await speed(page); await drop(page);
    // Le ressort : l'animation de retour est mise en pause, puis balayée (déterministe, indépendant de la charge).
    const back = await page.evaluate(async () => { const d = document.querySelector('lc-sheet dialog'); await Q.raf(); const s = Q.slide(d); if (!s.length) return { none: true, closing: d.hasAttribute('data-closing') }; const a = s[0].a; a.pause(); const dur = s[0].duration; const ys = []; for (let i = 0; i <= 200; i++) { a.currentTime = (dur * i) / 200; ys.push(Q.ty(d)); } return { none: false, props: s[0].props, dur, ease: s[0].ease, start: ys[0], end: ys.at(-1), min: Math.min(...ys), n: s.length }; });
    check('CA-24 31 % (lent) ramène : animation de retour de 500 ms (--lc-sheet-spring-duration), courbe --lc-sheet-spring-easing', !back.none && near(back.dur, t.spring, 0.5) && back.ease === (await page.evaluate(() => Q.ease('--lc-sheet-spring-easing'))), JSON.stringify(back));
    check('CA-5 le ressort n\'anime que transform ou translate', !back.none && back.props.filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)).every((k) => ['transform', 'translate'].includes(k)), JSON.stringify(back.props));
    check('CA-24 le retour dépasse de 10 ± 3 % de la distance tirée, puis se pose à 0', !back.none && near(back.start, 0.31 * height, 2) && near(-back.min / back.start, 0.10, 0.03) && near(back.end, 0, 0.5), `départ=${back.start} min=${back.min} (dépassement ${(-back.min / back.start * 100).toFixed(1)} %) fin=${back.end}`);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish())); await page.waitForTimeout(700);
    check(`CA-24 31 % de la hauteur (vitesse réelle ${sp.toFixed(2)} px/ms) : la feuille reste ouverte, closed non émis`, (await isOpen(page)) && near(await m42(page), 0, 0.5) && (await closedCount(page)) === c0, `open=${await isOpen(page)} closed=${await closedCount(page)}`);
    await page.reload(); await page.waitForSelector('#storybook-root > *'); await page.evaluate(INIT); await page.waitForTimeout(400); // le balayage du ressort a manipulé les animations : page neuve pour la suite
    await restart(); const c1 = await closedCount(page); await pull(page, 0.36 * height, 0.15); await drop(page);
    check('CA-24 36 % de la hauteur (lent) : ferme, closed émis une fois de plus', (await gone(page, 1500)) && (await page.waitForTimeout(600), (await closedCount(page)) === c1 + 1), `open=${await isOpen(page)} closed=${await closedCount(page)}`);
    // CA-24 : vitesse. Même distance (20 %, sous le tiers), seule la vitesse change : 0,45 px/ms ramène, 1,75 px/ms ferme.
    for (const [v, closes] of [[0.45, false], [1.75, true]]) {
      await restart(); await pull(page, 0.2 * height, v);
      const real = await speed(page); await drop(page);
      const shut = await gone(page, 1200);
      check(`CA-24 geste à ${v} px/ms (mesuré ${real.toFixed(2)}) sur 20 % de la hauteur : ${closes ? 'ferme' : 'ramène'}`, shut === closes && near(real, v, 0.1 * v), `fermée=${shut} vitesse=${real}`);
      if (!closes) await page.waitForTimeout(700);
    }
    // CA-24 : vers le haut, élastique quasi rigide.
    await restart(); await pull(page, -160, 0.4); await page.evaluate(() => Q.raf()); await page.waitForTimeout(100);
    const up = await m42(page); await drop(page); await page.waitForTimeout(700);
    check('CA-24 tirer vers le haut de 160 px : la feuille bouge de moins de 1 px, reste ouverte', Math.abs(up) < 1 && (await isOpen(page)) && near(await m42(page), 0, 0.5), `déplacement=${up}`);
    const p = await H(); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
    check('CA-S3 toucher sans déplacement : rien ne ferme', (await isOpen(page)) && !(await page.evaluate((s) => document.querySelector(s).hasAttribute('data-closing'), SD)));
    await restart(); const hd = await centre(page, `${SD} header, ${SD} [class*="header"]`);
    await drag(page, hd, Math.round(0.4 * height), 1500, 15); await page.mouse.up();
    check('CA-S3 geste depuis l’en-tête : ferme', await gone(page, 1500));
    // CA-S6 : pointercancel, perte de capture.
    for (const kind of ['pointercancel', 'lostpointercapture']) {
      await restart(); const hp = await H(); await drag(page, hp, 120, 300, 4);
      await page.evaluate((k) => { const h = document.querySelector('[data-qa-handle]'); if (k === 'lostpointercapture') for (const e of [h, h.parentElement, document.querySelector('lc-sheet dialog')]) try { e.releasePointerCapture(1); } catch {} else for (const e of [h, h.parentElement]) e.dispatchEvent(new PointerEvent(k, { pointerId: 1, bubbles: true, pointerType: 'mouse' })); }, kind);
      await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(300);
      check(`CA-S6 ${kind} : retour à 0, feuille ouverte`, near(await m42(page), 0, 0.5) && (await isOpen(page)), `y=${await m42(page)} open=${await isOpen(page)}`);
      await page.keyboard.press('Escape'); await page.waitForFunction((s) => !document.querySelector(s).open, SD);
    }
    // CA-24 : glisser dans le corps défile sans déplacer la feuille (geste tactile).
    await openSheet(page);
    const s4 = await page.evaluate(() => { const s = document.querySelector('[data-qa-scroller]'); const h = document.querySelector('[data-qa-handle]'); const head = document.querySelector('lc-sheet dialog header, lc-sheet dialog [class*="header"]'); const ta = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).touchAction === 'none') return 'none'; return 'auto'; }; const r = s.getBoundingClientRect(); return { has: !!s, ta: ta(s), handle: ta(h) === 'none', head: head ? ta(head) : 'absent', x: r.x + r.width / 2, y: r.y + r.height / 2, top: s.scrollTop }; });
    const cdp = await c.newCDPSession(page); const tp = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: s4.x, y }] });
    await tp('touchStart', s4.y + 100); for (let i = 1; i <= 10; i++) { await tp('touchMove', s4.y + 100 - 20 * i); await page.waitForTimeout(16); } await tp('touchEnd', 0); await page.waitForTimeout(500);
    const s4b = await page.evaluate(() => ({ top: document.querySelector('[data-qa-scroller]').scrollTop, y: Q.ty(document.querySelector('lc-sheet dialog')) }));
    check('CA-24 glisser dans le corps : scrollTop change, la feuille ne bouge pas', s4.has && s4b.top > s4.top && Math.abs(s4b.y) < 0.5, JSON.stringify({ s4, s4b }));
    check('CA-S4 touch-action: none sur poignée et en-tête seulement', s4.ta !== 'none' && s4.handle && s4.head === 'none', JSON.stringify(s4));
    // CA-S8 à 360 px : le clic sur le fond ne ferme pas.
    await page.mouse.click(180, 5); await page.waitForTimeout(500);
    check('CA-S8 360 px : un clic sur le fond ne ferme pas', await isOpen(page));
    await page.keyboard.press('Escape'); await page.waitForFunction((s) => !document.querySelector(s).open, SD);
    await page.close();
  });

  // CA-S1 / S2 dans lc-data-table à 360 px.
  await withCtx('phone', async (c) => {
    const page = await open(c, 'qa-motion-data-table--table');
    const F = 'button[id$="-filters"]';
    const state = () => page.evaluate(async (s) => { const d = document.querySelector(s); await Q.until(() => d.hasAttribute('data-closing') || !d.open, 1000); await Q.raf(); return { closing: d.hasAttribute('data-closing'), open: d.open, y: Q.ty(d), durs: Q.slide(d).map((x) => x.duration) }; }, SD); // la feuille seule : le chevron d’une section dépliée n’est pas la sortie
    const t = await page.evaluate(() => ({ enter: Q.ms('--lc-sheet-enter-duration'), exit: Q.ms('--lc-sheet-exit-duration'), radius: Q.px('--lc-sheet-top-radius'), bd: Q.probe('background:var(--lc-sys-color-backdrop)', 'backgroundColor') }));
    check('CA-S0 lc-data-table : plus de <dialog> propre, la fermeture est le bouton texte « Annuler »', await page.evaluate(() => !document.querySelector('dialog.lc-data-table__panel') && document.querySelector('lc-data-table lc-sheet dialog button.lc-sheet__close')?.textContent.trim() === 'Annuler' ));
    await page.evaluate(async (f) => { document.querySelector(f).click(); await Q.raf(); }, F);
    const e = await page.evaluate((s) => { const d = document.querySelector(s); const a = Q.anims(d); const sl = Q.slide(d); Q.at(d, 0); const r = d.getBoundingClientRect(); const bd = a.filter((x) => x.pseudo === '::backdrop'); const hd = [...d.querySelectorAll('[aria-hidden="true"]')].find((x) => Math.abs(x.getBoundingClientRect().width - 36) < 1); const bg = getComputedStyle(d, '::backdrop').backgroundColor; return { y0: Q.ty(d), h: r.height, tr: sl.map((x) => x.duration), bdAnim: bd.some((x) => x.prop === 'opacity' || x.props?.includes('opacity')), bg, hd: !!hd, vh: innerHeight }; }, SD);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish())); await page.waitForTimeout(100);
    const g = await page.evaluate((s) => { const d = document.querySelector(s); const r = d.getBoundingClientRect(); const cs = getComputedStyle(d); return { top: r.top, bottom: r.bottom, h: r.height, tl: parseFloat(cs.borderTopLeftRadius), tr: parseFloat(cs.borderTopRightRadius), bl: parseFloat(cs.borderBottomLeftRadius), tableTop: document.querySelector('.lc-data-table__scroll, lc-data-table').getBoundingClientRect().top }; }, SD);
    check('CA-S1/CA-24 ancrée en bas, hauteur ≤ 92 dvh, coins hauts 24 px (--lc-sheet-top-radius), bas droit', near(g.bottom, e.vh, 1) && g.h <= 0.92 * e.vh + 1 && near(g.tl, t.radius, 0.5) && near(g.tr, t.radius, 0.5) && g.tl === 24 && g.bl === 0, JSON.stringify({ g, t }));
    check('CA-S1 poignée présente ; le tableau reste au-dessus de la feuille', e.hd && g.tableTop < g.top, JSON.stringify({ hd: e.hd, tableTop: g.tableTop, top: g.top }));
    check('CA-S1/CA-24 entrée : translateY 100 % → 0 en --lc-sheet-enter-duration (600 ms)', near(e.y0, e.h, 1) && e.tr.length > 0 && e.tr.every((d) => near(d, t.enter, 0.5)) && t.enter === 600, JSON.stringify({ y0: e.y0, h: e.h, tr: e.tr, enter: t.enter }));
    check('CA-S1 fond ::backdrop = --lc-sys-color-backdrop, en fondu', e.bg === t.bd && e.bdAnim, JSON.stringify({ bg: e.bg, attendu: t.bd, fondu: e.bdAnim }));
    // CA-S9 à 360 px : « Annuler » en tête de l’en-tête, avant le titre ; sans icône ni aria-label ; autofocus.
    const s9 = await page.evaluate((s) => { const d = document.querySelector(s); const h = d.querySelector('.lc-sheet__header'); const b = h.firstElementChild; const title = h.querySelector('.lc-sheet__title'); return { first: b.matches('button.lc-sheet__close'), text: b.textContent.trim(), icon: !!b.querySelector('svg, lc-icon, img'), label: b.getAttribute('aria-label'), before: !!(b.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING), auto: b.hasAttribute('autofocus'), focused: document.activeElement === b, left: b.getBoundingClientRect().left < title.getBoundingClientRect().left }; }, SD);
    check('CA-S9 360 px : premier élément de l’en-tête = bouton « Annuler », avant le titre, sans icône ni aria-label, autofocus', s9.first && s9.text === 'Annuler' && !s9.icon && s9.label === null && s9.before && s9.left && s9.auto && s9.focused, JSON.stringify(s9));
    check('CA-S9 nom accessible « Annuler » (un seul bouton de ce nom dans la feuille)', (await page.locator(SD).getByRole('button', { name: 'Annuler', exact: true }).count()) === 1);
    // CA-S2 : trois fermetures, toutes en 300 ms.
    const pick = async () => { await page.locator(`${SD} .lc-data-table__section-toggle`).first().click(); await page.locator(`${SD} label.lc-column-filter__option input`).first().check(); };
    const ways = { croix: () => page.click(`${SD} button.lc-sheet__close`), echap: () => page.keyboard.press('Escape'), 'Afficher N': async () => { await pick(); await page.click('.lc-data-table__panel-apply'); } };
    for (const [name, fire] of Object.entries(ways)) {
      if (!(await page.evaluate((s) => document.querySelector(s).open, SD))) { await page.click(F); await page.waitForFunction((s) => document.querySelector(s).open, SD); await page.waitForTimeout(900); }
      const n0 = await page.evaluate(() => (window.__emitted ?? []).length);
      await fire(); const s = await state(); await page.waitForFunction((x) => !document.querySelector(x).open, SD, { timeout: 3000 }).catch(() => {});
      const n1 = await page.evaluate(() => (window.__emitted ?? []).length);
      check(`CA-S2/CA-24 ${name} : data-closing, descente en 300 ms (--lc-sheet-exit-duration), puis fermée`, s.closing && s.open && s.durs.length > 0 && s.durs.every((d) => near(d, t.exit, 0.5)) && t.exit === 300 && !(await page.evaluate((x) => document.querySelector(x).open, SD)), JSON.stringify(s));
      check(`CA-S2 ${name} : ${name === 'Afficher N' ? 'filtres émis' : 'rien d’émis'}, focus sur « Filtres »`, (name === 'Afficher N' ? n1 > n0 : n1 === n0) && (await page.evaluate(() => document.activeElement?.id.endsWith('-filters'))), `émis ${n0}→${n1}`);
    }
    await c.close();
  });


  // CA-S9 : la story Overlays/Sheet (sans closeText) garde le ✕ nommé par closeLabel.
  await withCtx('phone', async (c) => {
    const page = await c.newPage(); await page.goto(`${base}/iframe.html?id=overlays-sheet--playground&viewMode=story`);
    await page.waitForSelector('lc-sheet', { state: 'attached', timeout: 20000 }); await page.click('button:has-text("Ouvrir la feuille")'); await page.waitForFunction(() => document.querySelector('lc-sheet dialog')?.open);
    const x = await page.evaluate(() => { const b = document.querySelector('lc-sheet .lc-sheet__header .lc-sheet__close'); return { icon: !!b.querySelector('svg, lc-icon'), text: b.textContent.trim(), label: b.getAttribute('aria-label'), last: b === b.parentElement.lastElementChild }; });
    check('CA-S9 sans closeText : le ✕ reste (icône, sans texte, aria-label, après le titre)', x.icon && x.text === '' && x.label === 'Fermer sans appliquer' && x.last, JSON.stringify(x));
    await page.close();
  });

  // CA-24 « sur grand écran, carte inchangée » (CA-S8) : même carte qu'avant (largeur, coins, sans poignée, fond qui ferme), mouvement actuel, durées des jetons --lc-slide-*.
  await withCtx('desk', async (c) => {
    const page = await open(c, SHEET_STORY);
    const t = await page.evaluate(() => ({ w: Q.px('--lc-sheet-card-width'), mh: Q.px('--lc-sheet-card-max-height'), enter: Q.ms('--lc-slide-enter-duration'), exit: Q.ms('--lc-slide-exit-duration') }));
    await page.click('#qa-open-sheet'); await page.waitForFunction((s) => document.querySelector(s).open, SD);
    const e = await page.evaluate(async (s) => { const d = document.querySelector(s); await Q.raf(); const a = Q.anims(d).filter((x) => !x.pseudo); const en = Q.ms('--lc-slide-enter-duration'); const r = [(x) => x.prop === 'opacity' || x.props?.includes('opacity'), (x) => /transform|translate/.test(x.prop ?? '') || x.props?.some((p) => /transform|translate/.test(p))].map((f) => a.some((x) => f(x) && Math.abs(x.t.duration - en) < 0.5)); await Q.settle(); return { r }; }, SD);
    const g = await page.evaluate((s) => { const d = document.querySelector(s); const b = d.getBoundingClientRect(); const cs = getComputedStyle(d); const sc = [...d.querySelectorAll('*')].find((x) => /auto|scroll/.test(getComputedStyle(x).overflowY) && x.scrollHeight > x.clientHeight + 1); const hd = [...d.querySelectorAll('[aria-hidden="true"]')].some((x) => Math.abs(x.getBoundingClientRect().width - 36) < 1 && Math.abs(x.getBoundingClientRect().height - 5) < 1 && getComputedStyle(x).display !== 'none'); return { w: b.width, cx: b.x + b.width / 2, cy: b.y + b.height / 2, h: b.height, rad: ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map((k) => parseFloat(cs[`border${k}Radius`])), scrolls: !!sc, handle: hd, vw: innerWidth, vh: innerHeight }; }, SD);
    check('CA-S8/CA-24 carte : largeur --lc-sheet-card-width, quatre coins arrondis, sans poignée', near(g.w, t.w, 1) && g.rad.every((r) => r > 0) && !g.handle, JSON.stringify({ g, t }));
    check('CA-S8/CA-24 carte centrée à l’écran (± 1 px) en contenu long : hauteur ≤ --lc-sheet-card-max-height, le corps défile', near(g.cx, g.vw / 2, 1) && near(g.cy, g.vh / 2, 1) && g.h <= t.mh + 1 && g.scrolls, JSON.stringify({ g, mh: t.mh }));
    check('CA-S8/CA-24 entrée de la carte en translation et fondu, durée --lc-slide-enter-duration', e.r[0] && e.r[1], JSON.stringify(e));
    await page.mouse.click(10, 10);
    const s = await page.evaluate(async (x) => { await Q.raf(); const d = document.querySelector(x); const a = Q.anims(d).filter((y) => !y.pseudo); return { closing: d.hasAttribute('data-closing'), props: a.flatMap((y) => y.props ?? [y.prop]), durs: a.map((y) => y.t.duration), exit: Q.ms('--lc-slide-exit-duration') }; }, SD);
    await page.waitForFunction((x) => !document.querySelector(x).open, SD, { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(600);
    check('CA-S8/CA-24 1 280 px : clic sur le fond ferme (sortie translation + fondu en --lc-slide-exit-duration), closed émis une fois', s.closing && s.props.some((p) => /transform|translate/.test(p)) && s.props.includes('opacity') && s.durs.every((d) => near(d, s.exit, 0.5)) && !(await isOpen(page)) && (await closedCount(page)) === 1, JSON.stringify(s));
    await page.close();
  });

  // CA-S5, CA-R1 (feuille), CA-F1.
  await withCtx('phoneReduced', async (c) => {
    const page = await open(c, SHEET_STORY); await openSheet(page);
    const r = await page.evaluate(() => { const d = document.querySelector('lc-sheet dialog'); return { anim: Q.reduced(d), td: getComputedStyle(d).transitionDuration, y: Q.ty(d) }; });
    check('CA-S5/R1/CA-3 ouverture : aucune animation > 0,01 ms, état final atteint', r.anim && r.y === 0 && r.td.split(',').every((v) => parseFloat(v) * (v.trim().endsWith('ms') ? 1 : 1000) <= 0.01), JSON.stringify(r));
    const h = await centre(page, '[data-qa-handle]'); await drag(page, h, 260, 1200, 12);
    check('CA-S5 le geste suit le doigt malgré la réduction', near(await m42(page), 260, 1.5), String(await m42(page)));
    await page.mouse.up(); await page.waitForFunction((s) => !document.querySelector(s).open, SD, { timeout: 1500 }).catch(() => {});
    check('CA-S5/CA-3 fermeture par geste sans animation de fin (fermée en < 1,5 s, aucune animation)', !(await isOpen(page)) && (await page.evaluate(() => document.getAnimations().every((a) => a.effect.getComputedTiming().duration <= 0.01))), JSON.stringify(await page.evaluate(() => ({ open: document.querySelector('lc-sheet dialog').open, anims: document.getAnimations().map((a) => [a.transitionProperty ?? a.animationName, a.effect.getComputedTiming().duration]) }))));
    // Retour au repos (31 %) sous mouvement réduit : immédiat, sans ressort.
    await openSheet(page); const hh = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().height, SD);
    await drag(page, await centre(page, '[data-qa-handle]'), Math.round(0.31 * hh), 1200, 12); await page.mouse.up(); await page.evaluate(() => Q.raf()); await page.evaluate(() => Q.raf());
    const rb = await page.evaluate(() => { const d = document.querySelector('lc-sheet dialog'); return { y: Q.ty(d), open: d.open, running: document.getAnimations().filter((a) => a.playState === 'running' || a.pending).length }; });
    check('CA-3 31 % sous mouvement réduit : retour immédiat à 0, aucune animation en cours', rb.open && Math.abs(rb.y) < 0.5 && rb.running === 0, JSON.stringify(rb));
    await page.close();
  });
  await withCtx('phoneForced', async (c) => {
    const page = await open(c, SHEET_STORY); await openSheet(page);
    const f = await page.evaluate(() => { const d = document.querySelector('lc-sheet dialog'); const h = document.querySelector('[data-qa-handle]'); const cs = getComputedStyle(d); const ct = Q.probe('color:CanvasText', 'color'); return { bg: getComputedStyle(h).backgroundColor, fca: getComputedStyle(h).forcedColorAdjust, ct, bw: parseFloat(cs.borderTopWidth), bs: cs.borderTopStyle, bc: cs.borderTopColor, rad: parseFloat(cs.borderTopLeftRadius) }; });
    check('CA-F1 poignée en couleur système, bordure de la feuille, coins arrondis', f.bg === f.ct && f.fca === 'none' && f.bw > 0 && f.bs !== 'none' && f.bc === f.ct && f.rad > 0, JSON.stringify(f));
    await page.close();
  });
}

// ---------- hauteurs animées ----------
const CASES = {
  section: { story: 'qa-motion-data-table--table', ctx: 'phone', pre: async (p) => { await p.click('button[id$="-filters"]'); await p.waitForFunction(() => document.querySelector('lc-sheet dialog')?.open); await p.waitForTimeout(700); }, toggle: 'lc-sheet dialog .lc-data-table__section-toggle', box: 'section', deg: 180 },
  disclosure: { story: 'layout-disclosure--accordion', ctx: 'desk', toggle: 'lc-disclosure button[aria-expanded]', box: 'lc-disclosure', deg: 90 },
  'nav-group': { story: 'navigation-nav-group--collapsible', ctx: 'desk', toggle: '.lc-nav-group__toggle', box: 'lc-nav-group', deg: 90 },
};
async function collapse() {
  for (const [name, k] of Object.entries(CASES)) {
    await withCtx(k.ctx, async (c) => {
      const page = await open(c, k.story); await k.pre?.(page);
      const found = await page.evaluate(async ([ts, bs]) => { const t = [...document.querySelectorAll(ts)].find((x) => x.closest(bs)?.nextElementSibling); if (!t) return false; t.setAttribute('data-qa-t', ''); t.closest(bs).setAttribute('data-qa-c', ''); if (t.getAttribute('aria-expanded') === 'true') { t.click(); await Q.settle(); } return true; }, [k.toggle, k.box]);
      if (!found) { check(`CA-H ${name} : élément dépliable avec voisin`, false, 'introuvable'); return; }
      const run = (open) => page.evaluate(async ([isOpen, deg]) => {
        const t = document.querySelector('[data-qa-t]'); const box = document.querySelector('[data-qa-c]'); const region = document.getElementById(t.getAttribute('aria-controls')); const next = box.nextElementSibling;
        const dur = Q.ms('--lc-collapse-duration'); const out = { icons: t.querySelectorAll('lc-icon').length, svg0: t.innerHTML };
        const top0 = next.getBoundingClientRect().top, h0 = region.getBoundingClientRect().height;
        t.click(); await Q.until(() => (t.getAttribute('aria-expanded') === 'true') === isOpen); await Q.raf();
        out.expanded = t.getAttribute('aria-expanded'); out.inert = region.inert; out.vis = getComputedStyle(region).visibility;
        const all = Q.anims(box);
        const gr = all.filter((x) => x.prop === 'grid-template-rows');
        out.gr = gr.map((x) => ({ d: x.t.duration, e: x.ease })); out.easeTok = Q.ease('--lc-sys-easing-standard');
        out.chev = all.filter((x) => x.prop === 'transform' && t.contains(x.el)).map((x) => x.t.duration); out.dur = dur;
        const tops = [], hs = [];
        for (let ms = 0; ms <= dur; ms += 16.7) { Q.at(box, ms); tops.push(next.getBoundingClientRect().top); hs.push(region.getBoundingClientRect().height); }
        Q.at(box, dur); tops.push(next.getBoundingClientRect().top); hs.push(region.getBoundingClientRect().height);
        box.getAnimations({ subtree: true }).forEach((a) => a.finish()); await Q.raf();
        const topEnd = next.getBoundingClientRect().top, hEnd = region.getBoundingClientRect().height;
        out.hStart = hs[0]; out.hEnd = hEnd; out.top0 = top0; out.topEnd = topEnd; out.h0 = h0; out.tops = tops;
        out.visEnd = getComputedStyle(region).visibility; out.regionText = region.innerText.trim().slice(0, 20);
        const m = new DOMMatrix(getComputedStyle(t.querySelector('lc-icon, svg')).transform); out.angle = Math.round(Math.abs(Math.atan2(m.b, m.a) * 180 / Math.PI));
        out.svg1 = t.innerHTML; return out;
      }, [open, k.deg]);
      const sameEase = (a, b) => a.startsWith('cubic-bezier') && (a.match(/-?[\d.]+/g) ?? []).every((n, i) => Math.abs(n - (b.match(/-?[\d.]+/g) ?? [])[i]) < 1e-3);
      const mono = (tops, dir, total) => tops.every((v, i) => i === 0 || (dir * (v - tops[i - 1]) >= -0.01 && Math.abs(v - tops[i - 1]) <= 0.25 * total + 0.5));
      const o = await run(true);
      check(`CA-H1 ${name} ouverture : transition grid-template-rows en --lc-collapse-duration, courbe easing-standard`, o.gr.length > 0 && o.gr.every((x) => near(x.d, o.dur, 0.5) && sameEase(x.e, o.easeTok)), JSON.stringify({ gr: o.gr, dur: o.dur, e: o.easeTok }));
      const total = o.topEnd - o.top0;
      check(`CA-H1 ${name} ouverture : hauteur 0 → finale (± 1), voisin monotone, ≤ 25 % par pas`, total > 5 && o.hStart <= 1 && near(o.hEnd, total, 1) && mono(o.tops, 1, total), JSON.stringify({ total, hStart: o.hStart, hEnd: o.hEnd, tops: o.tops.map(Math.round) }));
      check(`CA-H2 ${name} ouverture : visible dès la première image, aria-expanded=true, pas inert`, o.vis === 'visible' && o.expanded === 'true' && !o.inert, JSON.stringify({ vis: o.vis, exp: o.expanded, inert: o.inert }));
      check(`CA-H3 ${name} chevron : transition de même durée, rotation ${k.deg}°, une seule icône`, o.chev.length > 0 && o.chev.every((d) => near(d, o.dur, 0.5)) && o.angle === k.deg && o.icons === 1 && o.svg0 === o.svg1, JSON.stringify({ chev: o.chev, angle: o.angle, icons: o.icons, mêmeIcône: o.svg0 === o.svg1 }));
      const cl = await run(false);
      check(`CA-H1 ${name} repli : transition grid-template-rows, hauteur finale → 0, voisin monotone ≤ 25 % par pas`, cl.gr.length > 0 && cl.gr.every((x) => near(x.d, cl.dur, 0.5)) && near(cl.hStart, total, 1) && cl.hEnd <= 1 && mono(cl.tops, -1, total), JSON.stringify({ gr: cl.gr, hStart: cl.hStart, hEnd: cl.hEnd, tops: cl.tops.map(Math.round) }));
      check(`CA-H2 ${name} repli : inert dès le repli, visibility:hidden après, aria-expanded=false`, cl.inert && cl.visEnd === 'hidden' && cl.expanded === 'false', JSON.stringify({ inert: cl.inert, visEnd: cl.visEnd, exp: cl.expanded }));
      await page.focus('[data-qa-t]'); let leaked = false;
      for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); leaked ||= await page.evaluate(() => document.getElementById(document.querySelector('[data-qa-t]').getAttribute('aria-controls')).contains(document.activeElement)); }
      const snap = await page.locator('[data-qa-c]').ariaSnapshot();
      check(`CA-H2 ${name} replié : Tab n’entre jamais dans la région, absente de l’instantané d’accessibilité`, !leaked && (!cl.regionText || !snap.includes(cl.regionText)), JSON.stringify({ leaked, texte: cl.regionText }));
      // CA-H5 : repli à mi-ouverture.
      const h5 = await page.evaluate(async () => { const t = document.querySelector('[data-qa-t]'); const box = document.querySelector('[data-qa-c]'); const region = document.getElementById(t.getAttribute('aria-controls')); const dur = Q.ms('--lc-collapse-duration'); t.click(); await Q.until(() => t.getAttribute('aria-expanded') === 'true'); await Q.raf(); Q.at(box, dur / 2); const mid = region.getBoundingClientRect().height; t.click(); await Q.until(() => t.getAttribute('aria-expanded') === 'false'); await Q.raf(); Q.at(box, 0); const start = region.getBoundingClientRect().height; box.getAnimations({ subtree: true }).forEach((a) => a.finish()); await Q.raf(); t.click(); await Q.until(() => t.getAttribute('aria-expanded') === 'true'); box.getAnimations({ subtree: true }).forEach((a) => a.finish()); const full = region.getBoundingClientRect().height; return { mid, start, full }; });
      check(`CA-H5 ${name} : repli à mi-ouverture repart de la hauteur courante (± 5 %)`, h5.mid > 0.05 * h5.full && h5.mid < 0.95 * h5.full && Math.abs(h5.start - h5.mid) <= 0.05 * h5.full, JSON.stringify(h5));
      await page.close();
    });
    await withCtx(k.ctx + 'Reduced', async (c) => {
      const page = await open(c, k.story); await k.pre?.(page);
      const r = await page.evaluate(async ([ts, bs]) => { const t = document.querySelector(ts); const box = t.closest(bs); const open = t.getAttribute('aria-expanded') === 'true'; t.click(); await Q.until(() => (t.getAttribute('aria-expanded') === 'true') !== open); await Q.raf(); const region = document.getElementById(t.getAttribute('aria-controls')); return { reduced: Q.reduced(box), vis: getComputedStyle(region).visibility, h: region.getBoundingClientRect().height, open: !open }; }, [k.toggle, k.box]);
      check(`CA-R1 ${name} (région, chevron) : aucune animation > 0,01 ms, état final immédiat`, r.reduced && (r.open ? r.vis === 'visible' && r.h > 1 : r.vis === 'hidden' || r.h <= 1), JSON.stringify(r));
      await page.close();
    });
  }
}
const phoneReduced = 'phoneReduced', deskReduced = 'deskReduced';

// ---------- pastilles ----------
// 360 px : la rangée se resserre (la hauteur change, le bloc glisse) ; 1 280 px : les deux pastilles tiennent sur une ligne, rien ne bouge (aucune animation parasite).
async function chips() {
  for (const [ctx, moves, reduced] of [['phone', true, false], ['desk', false, false], ['phoneReduced', true, true], ['deskReduced', false, true]]) await withCtx(ctx, async (c) => {
    const page = await open(c, 'data-data-table--always-chips');
    const n = await page.locator('.lc-data-table__chip-remove').count();
    if (!n) { check('CA-H4 story avec pastilles', false, 'aucune pastille'); return; }
    const r = await page.evaluate(async () => {
      const sc = document.querySelector('.lc-data-table__scroll'); const li = document.querySelector('.lc-data-table__chip'); const top0 = sc.getBoundingClientRect().top;
      const fast = Q.ms('--lc-sys-duration-fast'); li.querySelector('.lc-data-table__chip-remove').click(); await Q.raf();
      const out = { leaving: li.hasAttribute('data-leaving') || li.isConnected === false, pe: li.isConnected ? getComputedStyle(li).pointerEvents : 'none', chipAnims: li.isConnected ? Q.anims(li).map((x) => x.t.duration) : [], fast, reduced: Q.reduced(document.body) };
      const live = (a) => a.effect.getComputedTiming().duration > 0.01;
      const own = sc.getAnimations().filter(live); out.own = own.length;
      out.stray = document.getAnimations().filter((a) => live(a) && a.effect.target !== sc && !a.effect.target.closest('.lc-data-table__chip, tbody tr, .lc-data-table__funnel')).length; out.strayWho = document.getAnimations().filter((a) => live(a) && a.effect.target !== sc && !a.effect.target.closest('.lc-data-table__chip, tbody tr, .lc-data-table__funnel')).map((a) => `${a.transitionProperty ?? a.animationName}@${a.effect.target.tagName}.${a.effect.target.className}`); // hors bloc, pastille, lignes (elles bougent si le filtre retiré les change) et entonnoir (sa couleur change)
      Q.at(sc, 0); out.dy0 = Q.y(sc); // 1er pas de l'animation du bloc
      document.getAnimations().forEach((a) => a.finish()); await Q.raf(); await Q.settle(); out.shift = top0 - sc.getBoundingClientRect().top; return out;
    });
    if (reduced) check(`CA-R1 ${ctx} pastille : aucune animation > 0,01 ms, retrait immédiat`, r.reduced && r.own === 0 && r.stray === 0, JSON.stringify(r));
    else {
      check(`CA-H4 ${ctx} fondu de la pastille en duration-fast, non cliquable pendant le fondu`, r.pe === 'none' && r.chipAnims.some((d) => near(d, r.fast, 0.5)), JSON.stringify({ pe: r.pe, anims: r.chipAnims, fast: r.fast }));
      if (moves) check(`CA-H4 ${ctx} la liste porte une seule animation de glissement, 1er pas = position d’avant (± 1 px)`, r.own === 1 && r.stray === 0 && r.shift > 1 && near(r.dy0, r.shift, 1), JSON.stringify({ own: r.own, stray: r.stray, dy0: r.dy0, shift: r.shift, who: r.strayWho }));
      else check(`CA-H4 ${ctx} rangée de même hauteur : aucun glissement du bloc, aucune autre animation que pastille, lignes et couleur de l’entonnoir`, r.own === 0 && r.stray === 0 && near(r.shift, 0, 1), JSON.stringify({ own: r.own, stray: r.stray, shift: r.shift, who: r.strayWho }));
    }
    await page.close();
  });
}

// ---------- tiroir, dialogue, fonds (spec 2026-12-mouvement-v2, §5.4.1, T9a) ----------
// Valeurs de la spec, en ms : tiroir 550 entrée / 300 sortie, voile 300 / 200 ; dialogue 500 / 150, voile 250 / 150 ; échelle 0,91 à l'entrée, 0,95 à la sortie.
const OV = { drawer: { enter: 550, exit: 300, bdEnter: 300, bdExit: 200 }, dialog: { enter: 500, exit: 150, bdEnter: 250, bdExit: 150 } };
/** Côté page : relève chaque animation de la surcouche à sa première image, la mesure à 0 et à sa fin (rectangle, opacité), puis la laisse en pause ; `window.__w.stop()` les termine. */
const WATCH = () => {
  const w = (window.__w = { recs: [], seen: new Set() });
  const loop = () => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.target;
      if (w.seen.has(a) || !t?.closest?.('.cdk-overlay-container')) continue;
      w.seen.add(a);
      const tm = a.effect.getComputedTiming();
      if (!Number.isFinite(tm.endTime)) continue;
      a.pause(); a.currentTime = 0;
      const r0 = t.getBoundingClientRect(), o0 = getComputedStyle(t).opacity;
      a.currentTime = tm.endTime;
      const r1 = t.getBoundingClientRect(), o1 = getComputedStyle(t).opacity;
      a.currentTime = 0;
      w.recs.push({ backdrop: t.classList.contains('cdk-overlay-backdrop'), d: tm.duration, delay: tm.delay, dx: Math.abs(r0.left - r1.left), width: Math.max(r0.width, r1.width), ratio: Math.min(r0.width, r1.width) / Math.max(r0.width, r1.width), o0, o1 });
    }
    w.raf = requestAnimationFrame(loop);
  };
  loop();
  w.stop = () => { cancelAnimationFrame(w.raf); document.getAnimations().forEach((a) => { try { a.finish(); } catch { /* boucle infinie */ } }); };
};
async function overlays() {
  for (const reduced of [false, true]) await withCtx(reduced ? 'deskReduced' : 'desk', async (c) => {
    const page = await open(c, SHEET_STORY);
    for (const kind of ['drawer', 'dialog']) {
      const V = OV[kind];
      const pane = `.cdk-overlay-pane:has(lc-${kind})`;
      const results = () => page.evaluate(() => (window.__qa?.results ?? []).map((r) => r.slice()));
      const watch = async (action) => { await page.evaluate(WATCH); await action(); await page.waitForTimeout(350); return page.evaluate(() => ({ recs: window.__w.recs, there: !!document.querySelector('.cdk-overlay-pane'), running: document.getAnimations().filter((a) => a.playState === 'running' || a.pending).length })); };
      // Entrée.
      const en = await watch(() => page.evaluate((k) => document.querySelector(`#qa-open-${k}`).click(), kind));
      await page.evaluate(() => window.__w.stop()); await page.waitForTimeout(100);
      const panel = en.recs.filter((r) => !r.backdrop && r.width > 10 && (kind === 'drawer' ? r.dx > 1 : r.ratio < 0.999));
      const bd = en.recs.filter((r) => r.backdrop);
      if (reduced) check(`CA-3 ${kind} et son voile à l'entrée : aucune animation > 0,01 ms ni en cours`, en.recs.every((r) => r.d <= 0.01 && r.delay <= 0.01) && en.running === 0, JSON.stringify(en));
      else {
        if (kind === 'drawer') check(`CA-20 tiroir : entrée par glissement de toute sa largeur en ${V.enter} ms`, panel.length > 0 && panel.every((r) => near(r.d, V.enter) && near(r.dx, r.width, 1.5)), JSON.stringify(en.recs));
        else check(`CA-20 dialogue : entrée en fondu et échelle 0,91 → 1 en ${V.enter} ms`, panel.length > 0 && panel.every((r) => near(r.d, V.enter) && near(r.ratio, 0.91, 0.005) && r.o0 === '0'), JSON.stringify(en.recs));
        check(`CA-20 voile du ${kind} : ${V.bdEnter} ms à l'entrée`, bd.length > 0 && bd.every((r) => near(r.d, V.bdEnter) && r.o0 === '0' && r.o1 === '1'), JSON.stringify(bd));
      }
      // Sortie par « Valider » : valeur conservée, `closed` à la fin de la sortie.
      const t0 = Date.now();
      const ex = await watch(() => page.evaluate((k) => document.querySelector(`#qa-${k}-ok`).click(), kind));
      const exitPanel = ex.recs.filter((r) => !r.backdrop && r.width > 10 && (kind === 'drawer' ? r.dx > 1 : r.ratio < 0.999));
      const exitBd = ex.recs.filter((r) => r.backdrop);
      await page.evaluate(() => window.__w.stop());
      await page.waitForFunction((k) => (window.__qa?.results ?? []).some((r) => r[0] === k), kind, { timeout: 4000 }).catch(() => {});
      const res = (await results()).find((r) => r[0] === kind); await page.waitForTimeout(300);
      const gone = !(await page.locator(pane).count());
      if (reduced) check(`CA-3 ${kind} sortie immédiate, valeur rendue`, res?.[1] === `valeur-${kind === 'drawer' ? 'tiroir' : 'dialogue'}` && Date.now() - t0 < 1000 + 350 && ex.recs.every((r) => r.d <= 0.01) && ex.running === 0, JSON.stringify({ res, ex }));
      else {
        const o = kind === 'dialog' ? exitPanel.every((r) => near(r.ratio, 0.95, 0.005) && r.o1 === '0') : exitPanel.every((r) => near(r.dx, r.width, 1.5));
        check(`CA-20 ${kind} : sortie animée ${V.exit} ms (panneau encore dans le DOM), puis quitte le DOM`, ex.there && exitPanel.length > 0 && exitPanel.every((r) => near(r.d, V.exit)) && o && gone, JSON.stringify({ ex: ex.recs, gone }));
        check(`CA-20 voile du ${kind} : ${V.bdExit} ms à la sortie`, exitBd.length > 0 && exitBd.every((r) => near(r.d, V.bdExit) && r.o0 === '1' && r.o1 === '0'), JSON.stringify(exitBd));
        check(`CA-20 ${kind} : closed émis avec la valeur, après la fin de la sortie`, res?.[1] === `valeur-${kind === 'drawer' ? 'tiroir' : 'dialogue'}` && res[2] - t0 >= V.exit - 40, JSON.stringify({ res, elapsed: res?.[2] - t0 }));
      }
    }
    // Échap et clic sur le fond du dialogue passent par la sortie animée.
    if (!reduced) for (const way of ['Échap', 'fond']) {
      await page.evaluate(() => document.querySelector('#qa-open-dialog').click()); await page.waitForSelector('.cdk-overlay-pane:has(lc-dialog)'); await page.waitForTimeout(800);
      await page.evaluate(WATCH);
      if (way === 'Échap') await page.keyboard.press('Escape'); else await page.mouse.click(5, 5);
      await page.waitForTimeout(250);
      const s = await page.evaluate(() => ({ there: !!document.querySelector('.cdk-overlay-pane:has(lc-dialog)'), durs: window.__w.recs.filter((r) => !r.backdrop).map((r) => r.d) }));
      await page.evaluate(() => window.__w.stop()); await page.waitForTimeout(500);
      check(`CA-20 dialogue : ${way} → sortie animée de ${OV.dialog.exit} ms (encore dans le DOM), puis fermé`, s.there && s.durs.length > 0 && s.durs.every((d) => near(d, OV.dialog.exit)) && !(await page.locator('.cdk-overlay-pane:has(lc-dialog)').count()), JSON.stringify(s));
    }
    await page.close();
  });
}

// ---------- onglets, calendrier, app-shell ----------
async function misc() {
  await withCtx('desk', async (c) => {
    let page = await open(c, 'navigation-tabs--playground');
    const r = await page.evaluate(async () => { const tabs = [...document.querySelectorAll('[role="tab"]')]; tabs[1].click(); await Q.until(() => tabs[1].getAttribute('aria-selected') === 'true'); await Q.raf(); const p = document.querySelector('[role="tabpanel"]:not([hidden])'); const a = Q.anims(p).filter((x) => x.prop === 'opacity'); const normal = Q.ms('--lc-sys-duration-normal'); Q.at(p, 0); return { n: a.length, d: a.map((x) => x.t.duration), normal, o: getComputedStyle(p).opacity }; });
    check('CA-T1 onglets : panneau affiché en fondu de 200 ms (opacité 0 au départ)', r.n > 0 && r.d.every((d) => near(d, r.normal, 0.5)) && r.o === '0', JSON.stringify(r));
    await page.close();
    page = await open(c, 'qa-calendar-panel-internal--jours');
    const k = await page.evaluate(async () => { const p = document.querySelector('lc-calendar-panel'); if (!p) return { none: true }; const nxt = p.querySelector('.lc-calendar__nav--next'); nxt.click(); await Q.raf(); const a = Q.anims(p).filter((x) => x.prop === 'opacity' || x.prop?.includes('fade')); const normal = Q.ms('--lc-sys-duration-normal'); return { n: a.length, d: a.map((x) => x.t.duration), normal }; });
    check('CA-C1 calendrier : grille en fondu de 200 ms au changement de mois', !k.none && k.n > 0 && k.d.every((d) => near(d, k.normal, 0.5)), JSON.stringify(k));
    await page.close();
    page = await open(c, 'layout-app-shell--playground');
    const a = await page.evaluate(async () => { const b = document.querySelector('lc-app-shell button[aria-controls]'); const shell = document.querySelector('lc-app-shell'); b.click(); await Q.raf(); return { d: Q.anims(shell).map((x) => x.t.duration), long: Q.ms('--lc-sys-duration-long') }; });
    check('CA-A1 app-shell 1 280 px : largeur de la nav en 350 ms (--lc-shell-nav-duration)', a.d.some((d) => near(d, a.long, 0.5)) && a.long === 350, JSON.stringify(a));
    await page.close();
  });
  await withCtx('phone', async (c) => {
    const page = await open(c, 'layout-app-shell--playground');
    const a = await page.evaluate(async () => { const b = document.querySelector('lc-app-shell button[aria-controls]'); const shell = document.querySelector('lc-app-shell'); b.click(); await Q.raf(); return { d: Q.anims(shell).map((x) => x.t.duration), move: Q.ms('--lc-sys-duration-move') }; });
    check('CA-A1 app-shell 360 px : tiroir mobile en 500 ms', a.d.some((d) => near(d, a.move, 0.5)) && a.move === 500, JSON.stringify(a));
    await page.close();
  });
  for (const [ctx, story, act, what] of [
    ['deskReduced', 'navigation-tabs--playground', () => { [...document.querySelectorAll('[role="tab"]')][1].click(); }, 'onglet'],
    ['deskReduced', 'layout-app-shell--playground', () => { document.querySelector('lc-app-shell button[aria-controls]').click(); }, 'nav de l’app-shell'],
    ['deskReduced', 'qa-calendar-panel-internal--jours', () => { document.querySelector('.lc-calendar__nav--next').click(); }, 'grille du calendrier'],
  ]) await withCtx(ctx, async (c) => {
    const page = await open(c, story);
    const ok = await page.evaluate(async (f) => { eval(`(${f})()`); await Q.raf(); return Q.reduced(document.body); }, act.toString());
    check(`CA-R1 ${what} : aucune animation > 0,01 ms`, ok);
    await page.close();
  });
}

// ---------- survol (CA-V1) ----------
async function hover() {
  const ITEMS = [
    ['nav-list', 'navigation-nav-group--playground', 'a[lcNavItem], .lc-nav-item'],
    ['onglet', 'navigation-tabs--playground', '[role="tab"]:not([aria-selected="true"])'],
    ['button solid/outline/flat', 'buttons-button--variants', 'button[lcButton]:not([disabled])'],
    ['ligne de tableau', 'data-data-table--playground', '.lc-data-table__table tbody tr:not(.lc-data-table__state) td'],
  ];
  const bgs = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].slice(0, 6).map((e) => { const cs = getComputedStyle(e); return cs.backgroundColor + '|' + cs.color; }), sel);
  await withCtx('phone', async (c) => {
    const probe = await c.newPage(); await probe.goto(`${base}/iframe.html?id=buttons-button--variants&viewMode=story`);
    check('CA-V1 précondition : (hover: hover) faux en contexte tactile', await probe.evaluate(() => !matchMedia('(hover: hover)').matches)); await probe.close();
    for (const [name, story, sel] of ITEMS) {
      const page = await open(c, story).catch((e) => { check(`CA-V1 ${name}`, false, `story ${story} : ${String(e.message).split('\n')[0]}`); });
      if (!page) continue;
      // Le toucher ne doit pas activer l'élément (un onglet ou un lien actif change de couleur sans rapport avec le survol) : le clic est coupé en capture.
      await page.evaluate(() => document.addEventListener('click', (e) => { e.preventDefault(); e.stopImmediatePropagation(); }, true));
      const n = await page.locator(sel).count();
      if (!n) { check(`CA-V1 toucher ${name}`, false, 'élément introuvable'); await page.close(); continue; }
      const count = Math.min(n, 6); let ok = true; let detail = '';
      for (let i = 0; i < count; i++) {
        const before = (await bgs(page, sel))[i]; const b = await page.locator(sel).nth(i).boundingBox(); if (!b) continue;
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.evaluate(() => document.activeElement?.blur()); await page.waitForTimeout(450);
        const after = (await bgs(page, sel))[i]; if (before !== after) { ok = false; detail = `${i}: ${before} → ${after}`; break; }
      }
      check(`CA-V1 toucher puis retrait du focus : « ${name} » garde sa couleur`, ok, detail); await page.close();
    }
  });
  await withCtx('desk', async (c) => {
    for (const [name, story, sel] of ITEMS) {
      const page = await open(c, story).catch(() => null);
      if (!page) continue;
      const r = await page.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getBoundingClientRect().width > 0 && getComputedStyle(x).backgroundColor !== ''); return e ? 1 : 0; }, sel);
      const kinds = []; const els = await page.locator(sel).count();
      for (let i = 0; i < Math.min(els, 3); i++) { const before = (await bgs(page, sel))[i]; await page.locator(sel).nth(i).hover(); await page.waitForTimeout(450); kinds.push([before, (await bgs(page, sel))[i]]); await page.mouse.move(0, 0); }
      check(`CA-V1 souris : le survol change le style de « ${name} »`, r === 1 && kinds.some(([a, b]) => a !== b), JSON.stringify(kinds));
      await page.close();
    }
  });
}

try {
  const modes = { sheet, collapse, chips, overlays, misc, hover };
  const [mode = 'all'] = process.argv.slice(2);
  for (const m of mode === 'all' ? Object.keys(modes) : [mode]) { if (!modes[m]) { console.error(`Usage : ios-motion-browser.mjs ${Object.keys(modes).join('|')}|all`); failures += 1; break; } console.log(`# ${m}`); try { await modes[m](); } catch (e) { failures += 1; console.log(`KO  ${m} : exception ${String(e.message).split('\n')[0]}`); } }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} échec(s)` : 'tout est vert');
process.exit(failures > 0 ? 1 : 0);
