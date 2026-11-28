// lcFill, lcDraw, .lc-pulse et .lc-lift en navigateur réel (spec 2026-12-mouvement-v2, T4) : CA-12, CA-13, CA-30, et CA-3 / CA-5 / CA-38 pour les nouvelles stories.
// Valeurs attendues : spec (§5.2, §5.3, CA-30) et tokens lus dans le navigateur, jamais recopiés de l'implémentation.
//   node tools/qa/fill-draw-browser.mjs          Storybook statique (STORYBOOK_DIR ou dist/storybook)
// Stories QA (fill-draw.acceptance.qa.stories.ts, titre QA/Motion/Fill draw acceptance) :
//   fill-draw  : `#fill-static` (lcFill 0.7) et `#draw-static` (path, lcDraw 0.7) au chargement ; bouton `#show` monte `#fill-x`, `#fill-y` (axe y), `#draw-path`, `#draw-circle`, `#draw-line`, `#draw-polyline` ;
//                boutons `#low` (valeur 0.3) et `#zero` (valeur 0) changent la valeur des éléments montés (départ : 0.7)
//   pulse-lift : `#pulse` (.lc-pulse) et `#lift` (.lc-lift)
// Contrat de durée et de courbe (choix de QA, la spec dit « avec les tokens ») : lcFill = --lc-sys-duration-fill + --lc-sys-easing-fill ; lcDraw = --lc-sys-duration-draw + --lc-sys-easing-draw ;
// .lc-pulse = --lc-live-* ; .lc-lift = --lc-lift-* (la transition porte sur `transform`, ADR 0011).
// Stories d'animation attendues dans l'index (CA-38) : layout-fill--animation, layout-draw--animation, layout-pulse-lift--animation, chacune avec au moins un bouton « Rejouer ».
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const story = (name) => `qa-motion-fill-draw-acceptance--${name}`;

const server = await staticServer(storybookDir);
const { base } = server;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };
const section = async (n, fn) => { try { await fn(); } catch (error) { check(false, `bloc ${n} interrompu`, error.message.split('\n')[0]); } };
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

/** Lecteurs injectés : tokens, animation portant une propriété, valeur calculée aux deux bouts de cette animation. */
const INIT = () => {
  const rootStyle = () => getComputedStyle(document.documentElement);
  const ms = (name) => { const v = rootStyle().getPropertyValue(name).trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible : ${name}="${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  const flat = (s) => { const n = String(s).match(/-?\d*\.?\d+/g); return n ? n.map(Number).join(',') : String(s).trim(); };
  const raw = (name) => rootStyle().getPropertyValue(name).trim();
  const px = (name) => { const p = document.createElement('div'); p.style.cssText = `position:absolute;margin-left:var(${name})`; document.body.append(p); const v = parseFloat(getComputedStyle(p).marginLeft); p.remove(); return v; };
  const nums = (s) => (String(s).match(/-?\d*\.?\d+/g) ?? []).map(Number);
  /** Animation de `el` dont les keyframes portent `key` (CSSAnimation, CSSTransition ou WAAPI : la spec ne tranche pas la technique). */
  const find = (el, key) => el.getAnimations().find((a) => a.effect.getKeyframes().some((k) => key in k));
  const easings = (a) => [a.effect.getTiming().easing, ...a.effect.getKeyframes().map((k) => k.easing)].map(flat);
  /** Valeur calculée de `prop` au début et à la fin de `a` ; l'animation est laissée en pause puis terminée. */
  const ends = (a, el, prop) => {
    a.pause(); a.currentTime = 0;
    const start = getComputedStyle(el)[prop];
    const end = a.effect.getComputedTiming().endTime - 0.01;
    a.currentTime = end;
    const last = getComputedStyle(el)[prop];
    a.finish();
    return { start, last };
  };
  window.__q = { ms, flat, raw, px, nums, find, easings, ends };
};

async function open(id, { reduced = false, touch = false, width = 1100, wait } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  page.on('pageerror', (error) => check(false, `${id} erreur de page`, error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector(wait, { timeout: 20000 });
  return { page, context };
}
const idle = (page, timeout = 15000) => page.waitForFunction(() => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)), null, { timeout });
const frames = (page, n = 2) => page.evaluate(async (n) => { for (let i = 0; i < n; i += 1) await new Promise((r) => requestAnimationFrame(r)); }, n);

const IDS = ['fill-x', 'fill-y', 'draw-path', 'draw-circle', 'draw-line', 'draw-polyline'];
const KEY = (id) => (id.startsWith('fill') ? 'scale' : 'strokeDashoffset');
const PROP = (id) => (id.startsWith('fill') ? 'scale' : 'strokeDashoffset');
/** Valeur d'avancement lue dans la valeur calculée : x → 1er nombre de `scale`, y → 2e, tracé → décalage de tirets. */
const progress = (id, v) => { const n = v.match(/-?\d*\.?\d+/g)?.map(Number) ?? []; return id === 'fill-y' ? n[1] ?? n[0] : id.startsWith('fill') ? n[0] : n[0]; };

/** Clique `button`, attend l'animation de chaque élément de `ids`, relève durée, courbes et valeurs de bout. */
const observe = (page, button, ids) => page.evaluate(async ([button, ids, keyOf, propOf]) => {
  const { find, easings, ends } = window.__q;
  document.getElementById(button).click();
  const out = {};
  for (const id of ids) {
    let el = null, a = null;
    for (let i = 0; i < 40 && !a; i += 1) { await new Promise((r) => requestAnimationFrame(r)); el = document.getElementById(id); a = el && find(el, keyOf[id]); }
    if (!a) { out[id] = { missing: true }; continue; }
    const timing = a.effect.getComputedTiming();
    const e = easings(a);
    const { start, last } = ends(a, el, propOf[id]);
    out[id] = { kind: a.constructor.name, duration: timing.duration, easings: e, start, last };
  }
  return out;
}, [button, ids, Object.fromEntries(ids.map((i) => [i, KEY(i)])), Object.fromEntries(ids.map((i) => [i, PROP(i)]))]);

// ---------- CA-12, CA-13 : rendu initial, apparition, changement de valeur ----------
await section(1, async () => {
  const { page, context } = await open(story('fill-draw'), { wait: '#fill-static' });
  const tok = await page.evaluate(() => { const q = window.__q; return { draw: q.ms('--lc-sys-duration-draw'), fillMs: q.ms('--lc-sys-duration-fill'), fill: q.flat(q.raw('--lc-sys-easing-fill')), curve: q.flat(q.raw('--lc-sys-easing-draw')) }; });
  await idle(page);
  const st = await page.evaluate(() => {
    const f = document.getElementById('fill-static'), d = document.getElementById('draw-static');
    return { progress: f.style.getPropertyValue('--lc-progress') || getComputedStyle(f).getPropertyValue('--lc-progress'), scale: getComputedStyle(f).scale, dProgress: getComputedStyle(d).getPropertyValue('--lc-progress'), pathLength: d.getAttribute('pathLength'), offset: getComputedStyle(d).strokeDashoffset };
  });
  check(near(parseFloat(st.progress), 0.7), 'CA-12 lcFill au chargement : --lc-progress = 0.7', st.progress);
  check(near(progress('fill-x', st.scale), 0.7), 'CA-12 lcFill 0.7 : état final scale = 0.7 (axe x)', st.scale);
  check(st.pathLength === '1', 'CA-13 lcDraw : pathLength = 1', String(st.pathLength));
  check(near(parseFloat(st.offset), 0.3), 'CA-13 lcDraw 0.7 : état final stroke-dashoffset = 1 − 0.7 = 0.3', st.offset);
  check(near(parseFloat(st.dProgress), 0.7), 'CA-13 lcDraw au chargement : --lc-progress = 0.7', st.dProgress);

  const appear = await observe(page, 'show', IDS);
  await idle(page);
  for (const id of IDS) {
    const r = appear[id];
    check(!r.missing, `CA-12/13 ${id} : animation (${KEY(id)}) à l'apparition`, 'aucune animation de ' + KEY(id));
    if (r.missing) continue;
    const curve = id.startsWith('fill') ? tok.fill : tok.curve;
    const dur = id.startsWith('fill') ? tok.fillMs : tok.draw;
    check(near(r.duration, dur, 0.01), `CA-12/13 ${id} apparition : durée = ${id.startsWith('fill') ? '--lc-sys-duration-fill' : '--lc-sys-duration-draw'} (${dur} ms)`, String(r.duration));
    check(r.easings.includes(curve), `CA-12/13 ${id} apparition : courbe = ${id.startsWith('fill') ? 'easing-fill' : 'easing-draw'} (${curve})`, JSON.stringify(r.easings));
    const from = progress(id, r.start), to = progress(id, r.last);
    if (id.startsWith('fill')) check(near(from, 0) && near(to, 0.7, 0.02), `CA-12 ${id} apparition : de 0 à 0.7`, `${r.start} → ${r.last}`);
    else check(near(from, 1) && near(to, 0.3, 0.02), `CA-13 ${id} apparition : stroke-dashoffset de 1 à 0.3`, `${r.start} → ${r.last}`);
  }
  const x = appear['fill-x'], y = appear['fill-y'];
  if (x && !x.missing) check(near(x.start.match(/-?\d*\.?\d+/g)?.[1] ?? NaN, 1), 'CA-12 axe x : la hauteur reste à 1 (scale à deux valeurs)', x.start);
  if (y && !y.missing) check(near(y.start.match(/-?\d*\.?\d+/g)?.[0] ?? NaN, 1), 'CA-12 axe y : la largeur reste à 1 (scale à deux valeurs)', y.start);

  const origins = await page.evaluate(() => ['fill-x', 'fill-y'].map((id) => { const el = document.getElementById(id), cs = getComputedStyle(el); const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat); return { id, ox, oy, w: el.offsetWidth, h: el.offsetHeight }; }));
  check(near(origins[0].ox, 0, 0.5), 'CA-12 axe x : part du bord de départ (origine à gauche)', JSON.stringify(origins[0]));
  check(near(origins[1].oy, origins[1].h, 0.5), 'CA-12 axe y : part du bas (origine en bas)', JSON.stringify(origins[1]));

  const change = await observe(page, 'low', IDS);
  await idle(page);
  for (const id of IDS) {
    const r = change[id];
    check(!r.missing, `CA-12/13 ${id} : animation au changement de valeur`, 'aucune animation de ' + KEY(id));
    if (r.missing) continue;
    const curve = id.startsWith('fill') ? tok.fill : tok.curve;
    check(near(r.duration, id.startsWith('fill') ? tok.fillMs : tok.draw, 0.01) && r.easings.includes(curve), `CA-12/13 ${id} changement : durée et courbe = tokens`, `${r.duration} ${JSON.stringify(r.easings)}`);
    const [a, b] = id.startsWith('fill') ? [0.7, 0.3] : [0.3, 0.7];
    check(near(progress(id, r.start), a) && near(progress(id, r.last), b, 0.02), `CA-12/13 ${id} changement 0.7 → 0.3 : de ${a} à ${b}`, `${r.start} → ${r.last}`);
  }
  const edge = await page.evaluate(async () => {
    document.getElementById('zero').click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let i = 0; i < 80 && document.getAnimations().some((a) => Number.isFinite(a.effect.getComputedTiming().endTime) && a.playState === 'running'); i += 1) await new Promise((r) => setTimeout(r, 50));
    return { scale: getComputedStyle(document.getElementById('fill-x')).scale, offset: getComputedStyle(document.getElementById('draw-circle')).strokeDashoffset };
  });
  check(near(progress('fill-x', edge.scale), 0) && near(parseFloat(edge.offset), 1), 'CA-12/13 valeur 0 : scale 0 et stroke-dashoffset 1', JSON.stringify(edge));
  await context.close();
});

// ---------- CA-3 : mouvement réduit, état final immédiat ----------
await section(2, async () => {
  const { page, context } = await open(story('fill-draw'), { reduced: true, wait: '#fill-static' });
  await page.click('#show');
  await frames(page);
  const still = (ids) => page.evaluate((ids) => ids.map((id) => ({ id, anims: document.getElementById(id).getAnimations().filter((a) => a.playState === 'running' || a.pending || a.effect.getComputedTiming().endTime > 0.01).length, scale: getComputedStyle(document.getElementById(id)).scale, offset: getComputedStyle(document.getElementById(id)).strokeDashoffset })), ids);
  let r = await still(IDS);
  check(r.every((e) => e.anims === 0), 'CA-3 réduit : aucune animation (> 0,01 ms) en cours après l\'apparition', JSON.stringify(r.filter((e) => e.anims)));
  check(near(progress('fill-x', r[0].scale), 0.7) && near(progress('fill-y', r[1].scale), 0.7) && r.slice(2).every((e) => near(parseFloat(e.offset), 0.3)), 'CA-3 réduit : état final immédiat (0.7 ; décalage 0.3)', JSON.stringify(r));
  await page.click('#low');
  await frames(page);
  r = await still(IDS);
  check(r.every((e) => e.anims === 0) && near(progress('fill-x', r[0].scale), 0.3) && r.slice(2).every((e) => near(parseFloat(e.offset), 0.7)), 'CA-3 réduit : changement de valeur immédiat, sans animation', JSON.stringify(r));
  await context.close();
});

// ---------- CA-30 : .lc-pulse ----------
await section(3, async () => {
  const { page, context } = await open(story('pulse-lift'), { wait: '#pulse' });
  const got = await page.evaluate(() => {
    const { ms, raw } = window.__q;
    const el = document.getElementById('pulse');
    const a = el.getAnimations().find((x) => x.effect.getKeyframes().some((k) => 'opacity' in k));
    if (!a) return { missing: true };
    const t = a.effect.getTiming();
    const opacities = [];
    a.pause();
    for (const at of [0, 250, 500, 750, 1000, 1250, 1500, 1750, 1999, 2000, 2500, 3999]) { a.currentTime = at; opacities.push(parseFloat(getComputedStyle(el).opacity)); }
    return { kind: a.constructor.name, iterations: t.iterations, duration: t.duration, opacities, tokens: { duration: ms('--lc-live-duration'), from: parseFloat(raw('--lc-live-opacity-from')), to: parseFloat(raw('--lc-live-opacity-to')) } };
  });
  check(!got.missing, 'CA-30 .lc-pulse : une animation d\'opacité tourne', 'aucune animation');
  if (!got.missing) {
    check(got.tokens.duration === 2000 && got.tokens.from === 0.1 && got.tokens.to === 0.45, 'CA-30 tokens live.* = 2 000 ms, 0,1 → 0,45 (spec)', JSON.stringify(got.tokens));
    check(got.iterations === Infinity, 'CA-30 .lc-pulse en boucle (iterations = Infinity)', String(got.iterations));
    check(near(got.duration, got.tokens.duration, 0.01), 'CA-30 .lc-pulse : durée = --lc-live-duration (2 s)', String(got.duration));
    const lo = Math.min(...got.opacities), hi = Math.max(...got.opacities);
    check(lo >= got.tokens.from - 0.005 && hi <= got.tokens.to + 0.005 && near(lo, got.tokens.from, 0.02) && near(hi, got.tokens.to, 0.02), 'CA-30 .lc-pulse : opacité de 0,1 à 0,45', JSON.stringify(got.opacities));
  }
  await context.close();
  const reduced = await open(story('pulse-lift'), { reduced: true, wait: '#pulse' });
  await frames(reduced.page);
  const running = await reduced.page.evaluate(() => document.getElementById('pulse').getAnimations().filter((a) => a.playState === 'running' || a.pending).length);
  check(running === 0, 'CA-30 / CA-3 mouvement réduit : .lc-pulse arrêté', `${running} animation(s)`);
  await reduced.context.close();
});

// ---------- CA-30 : .lc-lift (pointeur fin, pointeur grossier, mouvement réduit) ----------
const liftState = (page) => page.evaluate(() => {
  const el = document.getElementById('lift');
  const t = el.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => ({ prop: a.transitionProperty, duration: a.effect.getComputedTiming().duration, easings: [a.effect.getTiming().easing, ...a.effect.getKeyframes().map((k) => k.easing)].map(window.__q.flat) }));
  const tf = getComputedStyle(el).transform;
  return { ty: tf === 'none' ? 0 : new DOMMatrix(tf).f, transitions: t };
});
await section(4, async () => {
  const { page, context } = await open(story('pulse-lift'), { wait: '#lift' });
  const tok = await page.evaluate(() => { const q = window.__q; return { fine: matchMedia('(pointer: fine)').matches, offset: q.px('--lc-lift-offset'), duration: q.ms('--lc-lift-duration'), leave: q.ms('--lc-lift-leave-duration'), easing: q.flat(q.raw('--lc-lift-easing')), out: q.flat(q.raw('--lc-sys-easing-out')) }; });
  check(tok.fine, 'CA-30 précondition : (pointer: fine) vrai', JSON.stringify(tok));
  check(tok.offset === -4 && tok.duration === 450 && tok.leave === 500 && tok.easing === tok.out, 'CA-30 tokens lift.* = −4 px, 450 ms à l\'entrée, 500 ms au retour, courbe out (relevé du site)', JSON.stringify(tok));
  check((await liftState(page)).ty === 0, 'CA-30 .lc-lift au repos : aucun décalage');
  await page.locator('#lift').hover();
  let s = { transitions: [] };
  for (let i = 0; i < 20 && !s.transitions.length; i += 1) { await frames(page, 1); s = await liftState(page); }
  check(s.transitions.length === 1 && s.transitions[0].prop === 'transform', 'CA-30 survol : une seule transition, sur `transform` (ADR 0011, CA-5)', JSON.stringify(s.transitions));
  if (s.transitions[0]) check(s.transitions[0].duration === tok.duration && s.transitions[0].easings.includes(tok.easing), 'CA-30 survol : 450 ms, courbe --lc-lift-easing', JSON.stringify(s.transitions[0]));
  await idle(page);
  s = await liftState(page);
  check(near(s.ty, -4, 0.01), 'CA-30 .lc-lift au survol : soulevé de 4 px (translateY −4)', String(s.ty));
  await page.mouse.move(0, 0);
  s = { transitions: [] };
  for (let i = 0; i < 20 && !s.transitions.length; i += 1) { await frames(page, 1); s = await liftState(page); }
  check(s.transitions.length === 1 && s.transitions[0].duration === 500 && s.transitions[0].easings.includes(tok.easing), 'CA-30 retour : 500 ms, courbe out', JSON.stringify(s.transitions));
  await idle(page);
  check(near((await liftState(page)).ty, 0, 0.01), 'CA-30 .lc-lift : retour à 0 hors survol');
  await context.close();
});
await section(5, async () => {
  const { page, context } = await open(story('pulse-lift'), { touch: true, wait: '#lift' });
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  check(coarse, 'CA-30 précondition : (pointer: coarse) vrai (hasTouch, isMobile)');
  await page.locator('#lift').tap();
  await page.locator('#lift').hover();
  await page.waitForTimeout(500);
  const s = await liftState(page);
  check(s.ty === 0 && s.transitions.length === 0, 'CA-30 pointeur grossier : .lc-lift ne bouge pas (tap puis survol)', JSON.stringify(s));
  await context.close();
});
await section(6, async () => {
  const { page, context } = await open(story('pulse-lift'), { reduced: true, wait: '#lift' });
  await page.locator('#lift').hover();
  await frames(page, 3);
  const s = await liftState(page);
  check(s.transitions.every((t) => t.duration <= 0.01), 'CA-3 mouvement réduit : .lc-lift sans transition animée', JSON.stringify(s));
  await context.close();
});

// CA-38 (stories Animation des trois primitives) : vérifié une fois dans `storybook-browser.mjs motion`.

await browser.close();
server?.close();
process.exit(failures > 0 ? 1 : 0);
