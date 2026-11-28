// Indicateurs en navigateur réel (spec 2026-12-mouvement-v2, T8) : CA-21 (lc-tabs, lc-nav-list, lc-segmented-control), CA-22 (bouton), part de CA-3 / CA-31 des composants de T8, D-20, D-21,
// lc-nav-group (repli comme lc-disclosure), lc-switch (d46), lc-stepper (d13, d51). Les valeurs attendues viennent de la spec (§5.2, §5.4.1), jamais de la sortie du code ; chaque durée est aussi
// vérifiée par surcharge du token composant (preuve que le composant lit le token et ne garde pas un nombre en dur).
//   node tools/qa/indicators-browser.mjs        Storybook statique (STORYBOOK_DIR ou dist/storybook) ; BASE=http://… pour un Storybook déjà lancé
// Stories : `QA/Motion/Navigation` (Tabs, Nav : `.lc-tabs__indicator`, `.lc-nav-list__indicator`, `.lc-nav-group__toggle`), `QA/Motion/Acceptance` (Buttons : #solid #outline #flat #icon #disabled),
//   `QA/Motion/Indicators navigation` (TabsCascade, Stepper), `QA/Motion/Indicators forms` (Segmented : `[role=radio]`, `.lc-segmented-control__indicator`, arg fillMode ; Switches : #sw1 #sw2).
// Contrat de mesure : la zone visible d'un indicateur est sa boîte (`getBoundingClientRect`) rognée par son `clip-path: inset()` calculé ; ses deux bords sont animés (n'importe quelle technique :
// left / right, clip-path, custom property…), la mesure ne regarde que les positions aux instants 90, 180, 260, 330 ms (animations mises en pause puis placées à `currentTime`).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');

const server = process.env.BASE ? null : await staticServer(storybookDir);
const base = process.env.BASE ?? server.base;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };

// ---------- Valeurs de la spec (§5.2 et §5.4.1), écrites en clair ----------
const EASE = { title: [0.22, 1, 0.36, 1], inout: [0.645, 0.045, 0.355, 1], out: [0.215, 0.61, 0.355, 1], pop: [0.34, 1.7, 0.64, 1], popStrong: [0.34, 2, 0.64, 1], soft: [0.34, 1, 0.64, 1], standard: [0.2, 0, 0, 1], entrance: [0.16, 1, 0.3, 1] };
const EDGES = {
  tabs: { front: [380, 0, EASE.title], back: [400, 80, EASE.inout] },
  nav: { front: [380, 0, EASE.title], back: [400, 80, EASE.inout] },
  segmented: { front: [300, 0, EASE.out], back: [410, 75, EASE.inout] },
};
const TIMES = [90, 180, 260, 330];

// Courbe de Bézier : y pour un temps normalisé x (indépendant du navigateur).
const bezier = ([x1, y1, x2, y2]) => (x) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const at = (a, b, t) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; if (at(x1, x2, mid) < x) lo = mid; else hi = mid; }
  return at(y1, y2, (lo + hi) / 2);
};
const numbers = (s) => String(s).match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) ?? [];
const sameCurve = (observed, expected) => { const n = numbers(observed); return /^cubic-bezier/.test(observed) && n.length === 4 && n.every((v, i) => Math.abs(v - expected[i]) <= 1e-3); };
const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;

/** Injecté avant la page : enregistreur de toutes les animations (CSSTransition, CSSAnimation, WAAPI) à leur première apparition, plus les événements `transitionrun` / `animationstart`. */
const INIT = () => {
  const rec = (window.__rec = { list: [], events: [] });
  const kind = (a) => (a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'animation' : 'waapi');
  const SKIP = ['offset', 'computedOffset', 'easing', 'composite'];
  const known = new WeakSet();
  const scan = () => {
    for (const a of document.getAnimations()) {
      if (known.has(a)) continue;
      known.add(a);
      const target = a.effect?.target;
      if (!target) continue;
      const tm = a.effect.getComputedTiming();
      const kf = a.effect.getKeyframes();
      const easing = tm.easing === 'linear' && kf[0]?.easing && kf[0].easing !== 'linear' ? kf[0].easing : tm.easing;
      rec.list.push({ a, kind: kind(a), target, pseudo: a.effect.pseudoElement ?? '', delay: tm.delay, duration: tm.duration, easing, props: [...new Set(kf.flatMap((k) => Object.keys(k)).filter((p) => !SKIP.includes(p)))], kf });
    }
    requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
  for (const name of ['transitionrun', 'animationstart']) document.addEventListener(name, (e) => rec.events.push({ name, target: e.target, pseudo: e.pseudoElement ?? '' }), true);
  const frames = (n = 2) => new Promise((resolve) => { const step = (left) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1))); step(n); });
  /** Zone visible d'un indicateur sur un axe : boîte rognée par `clip-path: inset()`. */
  const vis = (el, axis) => {
    const r = el.getBoundingClientRect();
    let [s, e] = axis === 'x' ? [r.left, r.right] : [r.top, r.bottom];
    const m = /^inset\((.*?)(?: round .*)?\)$/.exec(getComputedStyle(el).clipPath);
    if (m) {
      const v = m[1].trim().split(/\s+/);
      const [t, rt = t, b = t, l = rt] = v;
      const len = (x, size) => (x.endsWith('%') ? (parseFloat(x) / 100) * size : parseFloat(x));
      if (axis === 'x') { s += len(l, r.width); e -= len(rt, r.width); } else { s += len(t, r.height); e -= len(b, r.height); }
    }
    return [s, e];
  };
  /** Anime l'indicateur : pause de ses animations (pseudo-éléments compris), placées à chaque instant de `times`, puis terminées. */
  const scrub = (el, axis, times) => {
    const anims = el.getAnimations({ subtree: true });
    anims.forEach((a) => a.pause());
    const at = times.map((t) => { anims.forEach((a) => { a.currentTime = t; }); return vis(el, axis); });
    anims.forEach((a) => a.finish());
    return at;
  };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  window.__t8 = { frames, vis, scrub, rect };
};

/** Un bloc qui lève (sélecteur absent, page cassée) est un KO écrit, pas un arrêt du script. */
const run = async (label, fn) => { try { await fn(); } catch (error) { check(false, `${label} : exception`, error.message.split('\n')[0]); } };

async function open(id, { reduced = false, width = 1280, args = '', hash = '' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${args ? `&args=${args}` : ''}${hash}`);
  await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 });
  await page.evaluate(() => window.__t8.frames(10));
  return { context, page, errors };
}
const idle = (page) => page.waitForFunction(() => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)), null, { timeout: 15000 }).catch(() => undefined);
/** Animations apparues depuis `mark` dont la cible est dans `host` (l'élément ou un descendant, pseudo-éléments compris). */
const since = (page, mark, hostSel) => page.evaluate(([from, sel]) => window.__rec.list.slice(from).filter((r) => document.querySelector(sel)?.contains(r.target)).map((r) => ({ kind: r.kind, target: `${r.target.localName}.${String(r.target.className?.baseVal ?? r.target.className).split(' ')[0]}${r.pseudo}`, pseudo: r.pseudo, inToggle: !!r.target.closest?.('.lc-nav-group__toggle'), delay: r.delay, duration: r.duration, easing: r.easing, props: r.props, kf: r.kf.map((k) => Object.fromEntries(Object.entries(k).filter(([p]) => !['computedOffset', 'easing', 'composite'].includes(p)))) })), [mark, hostSel]);
const mark = (page) => page.evaluate(() => window.__rec.list.length);
const events = (page, hostSel) => page.evaluate((sel) => window.__rec.events.filter((e) => document.querySelector(sel)?.contains(e.target)).length, hostSel);

// ---------- CA-21 : indicateur à deux bords (tabs, nav-list, segmented) ----------
/** @param spec { name, story, args?, hash?, host, indicator, axis, edges, moves: [{ click, target }] , override: [token…] } */
async function twoEdges(spec, { reduced = false, width = 1280, tag }) {
  const { context, page, errors } = await open(spec.story, { reduced, width, args: spec.args, hash: spec.hash });
  const present = await page.waitForSelector(spec.indicator, { state: 'attached', timeout: 5000 }).then(() => true, () => false);
  check(present, `CA-21 ${spec.name} ${tag} indicateur ${spec.indicator} présent`, 'élément absent');
  if (!present) { await context.close(); return; }
  await idle(page);
  const axis = spec.axis;
  const [s0, e0] = axis === 'x' ? ['left', 'right'] : ['top', 'bottom'];
  const dur = (a) => a.duration;
  const geometry = !(spec.name === 'lc-tabs' && width === 360); // 360 px : la liste d'onglets défile, ses rectangles bougent pendant la mesure (CA-4 de storybook-browser.mjs motion la couvre)
  for (const [n, move] of spec.moves.entries()) {
    const label = `${spec.name} ${tag} déplacement ${n + 1}`;
    const from = await page.evaluate(([sel, ax]) => window.__t8.vis(document.querySelector(sel), ax), [spec.indicator, axis]);
    await page.locator(move.target).first().evaluate((el) => { document.querySelectorAll('[data-t8]').forEach((e) => e.removeAttribute('data-t8')); el.setAttribute('data-t8', ''); }); // Playwright et querySelector ne partagent pas leurs sélecteurs
    const m = await mark(page);
    await page.click(move.click);
    if (reduced) {
      await page.evaluate(() => window.__t8.frames(3));
      const list = await since(page, m, spec.host);
      check(list.every((a) => dur(a) <= 0.01 && a.delay <= 0.01), `CA-3 ${label} mouvement réduit : durées et délais ≤ 0,01 ms`, JSON.stringify(list.slice(0, 3)));
      const to = await page.evaluate(([sel, ax, tsel]) => ({ v: window.__t8.vis(document.querySelector(sel), ax), t: window.__t8.rect(document.querySelector(tsel)) }), [spec.indicator, axis, '[data-t8]']);
      check(near(to.v[0], to.t[s0], 1) && near(to.v[1], to.t[e0], 1), `CA-3 ${label} mouvement réduit : indicateur sous la cible aussitôt`, `${to.v} cible ${to.t[s0]},${to.t[e0]}`);
      continue;
    }
    await page.waitForFunction((sel) => document.querySelector(sel).getAnimations({ subtree: true }).length > 0, spec.indicator, { timeout: 4000 }).catch(() => undefined);
    await page.evaluate(() => window.__t8.frames(2));
    const list = await since(page, m, spec.indicator);
    const [fd, fdelay, fease] = spec.edges.front;
    const [bd, bdelay, bease] = spec.edges.back;
    const front = list.find((a) => near(a.duration, fd) && near(a.delay, fdelay) && sameCurve(a.easing, fease));
    const back = list.find((a) => near(a.duration, bd) && near(a.delay, bdelay) && sameCurve(a.easing, bease));
    check(!!front && !!back, `CA-21 ${label} deux animations : avant ${fd} ms délai ${fdelay}, arrière ${bd} ms délai ${bdelay} aux courbes de la spec`, JSON.stringify(list.map((a) => [a.target, a.duration, a.delay, a.easing.slice(0, 40)])));
    if (!geometry) { await page.evaluate(([sel]) => document.querySelector(sel).getAnimations({ subtree: true }).forEach((a) => a.finish()), [spec.indicator]); const end = await page.evaluate(([sel, ax, tsel]) => ({ v: window.__t8.vis(document.querySelector(sel), ax), t: window.__t8.rect(document.querySelector(tsel)) }), [spec.indicator, axis, '[data-t8]']); check(near(end.v[0], end.t[s0], 1) && near(end.v[1], end.t[e0], 1), `CA-2 ${label} fin : indicateur sous la cible (±1 px)`, `${end.v} cible ${end.t[s0]},${end.t[e0]}`); continue; }
    const scrubbed = await page.evaluate(([sel, ax, times]) => window.__t8.scrub(document.querySelector(sel), ax, times), [spec.indicator, axis, [0, ...TIMES]]);
    const to = await page.evaluate(([sel, ax, tsel]) => ({ v: window.__t8.vis(document.querySelector(sel), ax), t: window.__t8.rect(document.querySelector(tsel)) }), [spec.indicator, axis, '[data-t8]']);
    check(near(to.v[0], to.t[s0], 1) && near(to.v[1], to.t[e0], 1), `CA-2 ${label} fin : indicateur sous la cible (±1 px)`, `${to.v} cible ${to.t[s0]},${to.t[e0]}`);
    const [startTarget, endTarget] = [to.t[s0], to.t[e0]];
    const forward = (startTarget + endTarget) / 2 > (from[0] + from[1]) / 2; // vers les coordonnées croissantes : le bord de fin mène
    const ease = (e, t, delay, d) => bezier(e)((t - delay) / d);
    const edge = (side, t) => { // position attendue du bord `side` (0 = début, 1 = fin) à l'instant t
      const leads = forward ? side === 1 : side === 0;
      const [d, delay, e] = leads ? [fd, fdelay, fease] : [bd, bdelay, bease];
      const [a, b] = [from[side], side === 0 ? startTarget : endTarget];
      return a + (b - a) * ease(e, t, delay, d);
    };
    const bad = [];
    for (const [i, t] of [0, ...TIMES].entries()) for (const side of [0, 1]) { const want = edge(side, t); if (!near(scrubbed[i][side], want, 1.5)) bad.push(`t=${t} bord ${side ? 'fin' : 'début'} : ${scrubbed[i][side].toFixed(1)} attendu ${want.toFixed(1)}`); }
    check(bad.length === 0, `CA-21 ${label} positions des deux bords à 0, ${TIMES.join(', ')} ms (bord ${forward ? 'de fin' : 'de début'} devant, l'autre retardé)`, bad.slice(0, 4).join(' ; '));
  }
  check(errors.length === 0, `erreurs page ${spec.name} ${tag}`, errors.join(' ; '));
  await context.close();
}

/** Surcharge des tokens : les durées observées suivent les valeurs posées sur :root (le composant lit ses tokens). */
async function overrideTokens(spec, token, tag) {
  const { context, page } = await open(spec.story, { args: spec.args, hash: spec.hash });
  if (!(await page.waitForSelector(spec.indicator, { state: 'attached', timeout: 5000 }).then(() => true, () => false))) { check(false, `CA-21 ${spec.name} lit ses tokens`, `indicateur ${spec.indicator} absent`); await context.close(); return; }
  await idle(page);
  await page.evaluate((t) => { for (const [k, v] of Object.entries(t)) document.documentElement.style.setProperty(`--lc-${k}`, v); }, { [`${token}-indicator-front-duration`]: '777ms', [`${token}-indicator-back-duration`]: '333ms', [`${token}-indicator-back-delay`]: '55ms' });
  const m = await mark(page);
  await page.click(spec.moves[0].click);
  await page.waitForFunction((sel) => document.querySelector(sel).getAnimations({ subtree: true }).length > 0, spec.indicator, { timeout: 4000 }).catch(() => undefined);
  await page.evaluate(() => window.__t8.frames(2));
  const list = await since(page, m, spec.indicator);
  check(list.some((a) => near(a.duration, 777) && near(a.delay, 0)) && list.some((a) => near(a.duration, 333) && near(a.delay, 55)), `CA-21 ${spec.name} ${tag} lit ses tokens : surcharge 777 ms / 333 ms décalé de 55 ms suivie`, JSON.stringify(list.map((a) => [a.duration, a.delay])));
  await context.close();
}

/** Premier affichage : aucune animation sous l'hôte (CA-21). */
async function firstDisplay(name, story, host, { args, hash, width = 1280 } = {}) {
  const { context, page } = await open(story, { args, hash, width });
  await page.evaluate(() => window.__t8.frames(60));
  const list = await since(page, 0, host);
  const ev = await events(page, host);
  check(list.length === 0 && ev === 0, `CA-21 ${name} ${width} px aucune animation au premier affichage`, `${list.length} animation(s), ${ev} événement(s) : ${JSON.stringify(list.slice(0, 3).map((a) => [a.target, a.duration]))}`);
  await context.close();
}

const SPECS = {
  tabs: { name: 'lc-tabs', story: 'qa-motion-navigation--tabs', host: 'lc-tabs', indicator: '.lc-tabs__indicator', axis: 'x', edges: EDGES.tabs, token: 'tabs', moves: [{ click: '[role=tab]:has-text("Graphiques")', target: '[role=tab]:has-text("Graphiques")' }, { click: '[role=tab]:has-text("Synthèse")', target: '[role=tab]:has-text("Synthèse")' }] },
  nav: { name: 'lc-nav-list', story: 'qa-motion-navigation--nav', hash: '#/a', host: 'lc-nav-list', indicator: '.lc-nav-list__indicator', axis: 'y', edges: EDGES.nav, token: 'nav-item', moves: [{ click: '#item-c', target: '#item-c' }, { click: '#item-a', target: '#item-a' }] },
};
const segmented = (fillMode) => ({ name: `lc-segmented-control ${fillMode}`, story: 'qa-motion-indicators-forms--segmented', args: `fillMode:${fillMode}`, host: 'lc-segmented-control', indicator: '.lc-segmented-control__indicator', axis: 'x', edges: EDGES.segmented, token: 'segmented-control', moves: [{ click: '[role=radio] >> nth=3', target: '[role=radio] >> nth=3' }, { click: '[role=radio] >> nth=1', target: '[role=radio] >> nth=1' }] });

for (const width of [1280, 360]) {
  const tag = `${width} px`;
  for (const spec of [SPECS.tabs, SPECS.nav, segmented('outline'), segmented('solid')]) {
    await run(`${spec.name} ${tag}`, () => twoEdges(spec, { width, tag }));
    await run(`${spec.name} réduit ${tag}`, () => twoEdges(spec, { width, tag: `mouvement réduit ${tag}`, reduced: true }));
  }
}
for (const spec of [SPECS.tabs, SPECS.nav, segmented('outline'), segmented('solid')]) await run(`${spec.name} tokens`, () => overrideTokens(spec, spec.token, '1280 px'));
await run('premier affichage tabs', () => firstDisplay('lc-tabs', SPECS.tabs.story, 'lc-tabs'));
await run('premier affichage tabs 360', () => firstDisplay('lc-tabs', SPECS.tabs.story, 'lc-tabs', { width: 360 }));
await run('premier affichage nav', () => firstDisplay('lc-nav-list', SPECS.nav.story, 'lc-nav-list', { hash: '#/b' }));
for (const fill of ['outline', 'solid']) for (const width of [1280, 360]) await run(`premier affichage segmenté ${fill} ${width}`, () => firstDisplay(`lc-segmented-control ${fill}`, 'qa-motion-indicators-forms--segmented', 'lc-segmented-control', { args: `fillMode:${fill}`, width }));

// ---------- D-20 : pastille du segmenté dans les deux fillMode, sous l'option choisie ; CA-31 : pas de débordement à 360 px ----------
await run('bloc 2', async () => {
  for (const fill of ['outline', 'solid']) for (const width of [1280, 360]) {
    const { context, page } = await open('qa-motion-indicators-forms--segmented', { width, args: `fillMode:${fill}` });
    const r = await page.evaluate(() => {
      const ind = document.querySelector('.lc-segmented-control__indicator');
      const radio = document.querySelector('[role=radio][aria-checked=true]');
      const host = document.querySelector('lc-segmented-control').getBoundingClientRect();
      const doc = document.scrollingElement;
      return { exists: !!ind, display: ind && getComputedStyle(ind).display, vis: ind && window.__t8.vis(ind, 'x'), radio: window.__t8.rect(radio), right: host.right, vw: doc.clientWidth, scroll: doc.scrollWidth };
    });
    check(r.exists && r.display !== 'none' && near(r.vis[0], r.radio.left, 1) && near(r.vis[1], r.radio.right, 1), `D-20 lc-segmented-control ${fill} ${width} px pastille présente sous l'option choisie`, JSON.stringify(r));
    check(r.right <= r.vw && r.scroll <= r.vw, `CA-31 lc-segmented-control ${fill} ${width} px ne dépasse pas de l'écran (bord droit ${r.right.toFixed(1)}, largeur ${r.vw}, défilement ${r.scroll})`, JSON.stringify(r));
    await context.close();
  }
});

// ---------- D-21 / CA-21 : cascade du panneau d'onglets à la première ouverture seulement ----------
await run('bloc 3', async () => {
    const { context, page, errors } = await open('qa-motion-indicators-navigation--tabs-cascade');
    const panelRows = (m, panelText) => page.evaluate(([from, text]) => window.__rec.list.slice(from).filter((r) => r.target.matches('.row') && r.target.textContent.startsWith(text)).map((r) => ({ delay: r.delay, duration: r.duration, easing: r.easing, text: r.target.textContent })), [m, panelText]);
    const cascade = (list, label) => {
      const byRow = new Map();
      for (const a of list) byRow.set(a.text, Math.min(byRow.get(a.text) ?? Infinity, a.delay));
      const delays = [...byRow.values()].sort((x, y) => x - y);
      check(delays.length === 3 && delays.every((d, i) => near(d, i * 40)), `D-21 ${label} : trois lignes en cascade, décalage 40 ms (0, 40, 80)`, JSON.stringify([...byRow]));
      check(list.length > 0 && list.every((a) => near(a.duration, 550) && sameCurve(a.easing, EASE.out)), `D-21 ${label} : 550 ms, courbe « out » (lcReveal, spec 2026-12-mouvement-v2 §13 « Alignement sur le code du site Talmo »)`, JSON.stringify(list.slice(0, 2)));
    };
    await page.evaluate(() => window.__t8.frames(30));
    check((await since(page, 0, 'lc-tabs')).length === 0 && (await events(page, 'lc-tabs')) === 0, 'D-21 premier affichage du panneau ouvert : aucune animation', 'animation(s) au premier affichage');
    let m = await mark(page);
    await page.click('[role=tab]:has-text("Deux")');
    await page.evaluate(() => window.__t8.frames(12));
    cascade(await panelRows(m, 'Deux'), 'première ouverture de « Deux »');
    await idle(page);
    m = await mark(page);
    await page.click('[role=tab]:has-text("Trois")');
    await page.evaluate(() => window.__t8.frames(12));
    cascade(await panelRows(m, 'Trois'), 'première ouverture de « Trois » (contenu rendu à la première sélection)');
    await idle(page);
    for (const name of ['Un', 'Deux', 'Trois']) {
      m = await mark(page);
      await page.click(`[role=tab]:has-text("${name}")`);
      await page.evaluate(() => window.__t8.frames(30));
      const again = await panelRows(m, name);
      check(again.length === 0, `D-21 « ${name} » déjà ouvert : la cascade ne se rejoue pas`, JSON.stringify(again.slice(0, 3)));
      await idle(page);
    }
    check(errors.length === 0, 'erreurs page tabs cascade', errors.join(' ; '));
    await context.close();
});
await run('bloc 4', async () => {
    const { context, page } = await open('qa-motion-indicators-navigation--tabs-cascade', { reduced: true });
    const m = await mark(page);
    await page.click('[role=tab]:has-text("Deux")');
    await page.evaluate(() => window.__t8.frames(4));
    const list = await since(page, m, '[role=tabpanel]:not([hidden])');
    check(list.every((a) => a.duration <= 0.01 && a.delay <= 0.01), 'CA-3 D-21 mouvement réduit : aucune cascade', JSON.stringify(list.slice(0, 3)));
    await context.close();
});

// ---------- lc-nav-group : repli comme lc-disclosure (§5.4.1 d48 ; tokens disclosure.* : 300 ms à l'ouverture, 100 ms à la fermeture, −5 px) ----------
await run('bloc 5', async () => {
    const { context, page, errors } = await open('qa-motion-navigation--nav', { hash: '#/a' });
    await idle(page);
    const group = async () => {
      const open = await page.evaluate(() => document.querySelector('.lc-nav-group__toggle').getAttribute('aria-expanded') === 'true');
      const [label, expectMs] = open ? ['repli', 100] : ['ouverture', 300];
      const m = await mark(page);
      await page.evaluate(() => document.querySelector('.lc-nav-group__toggle').click());
      await page.evaluate(() => window.__t8.frames(10));
      const list = await since(page, m, 'lc-nav-group');
      const chevron = list.filter((a) => a.inToggle && a.props.some((p) => ['transform', 'rotate'].includes(p)));
      const rows = list.filter((a) => a.props.includes('gridTemplateRows'));
      const fade = list.filter((a) => !a.inToggle && a.props.includes('opacity'));
      const slide = list.filter((a) => !a.inToggle && a.props.some((p) => ['transform', 'translate'].includes(p)));
      const all = JSON.stringify(list.map((a) => [a.target, a.props.join('+'), a.duration]));
      check(rows.length > 0 && rows.every((a) => near(a.duration, expectMs)), `d48 nav-group ${label} : hauteur (grid-template-rows) en ${expectMs} ms`, all);
      check(fade.length > 0 && fade.every((a) => near(a.duration, expectMs)), `d48 nav-group ${label} : fondu du contenu en ${expectMs} ms`, all);
      check(slide.length > 0 && slide.every((a) => near(a.duration, expectMs) && JSON.stringify(a.kf).includes('5px')), `d48 nav-group ${label} : glissement de 5 px du contenu en ${expectMs} ms`, JSON.stringify(slide.map((a) => [a.target, a.duration, a.kf])));
      check(chevron.length > 0 && chevron.every((a) => near(a.duration, 300)), `d48 nav-group ${label} : chevron en 300 ms`, all);
      await idle(page);
    };
    await group();
    await group();
    check(errors.length === 0, 'erreurs page nav-group', errors.join(' ; '));
    await context.close();
});

// ---------- lc-switch (d46) : bouton 465 ms « pop », piste de couleur 200 ms ----------
await run('bloc 6', async () => {
  for (const reduced of [false, true]) {
    const { context, page } = await open('qa-motion-indicators-forms--switches', { reduced });
    for (const id of ['sw2', 'sw1']) {
      const m = await mark(page);
      await page.click(`#${id}`);
      await page.evaluate(() => window.__t8.frames(6));
      const list = await since(page, m, `#${id}`);
      const label = `lc-switch #${id}${reduced ? ' mouvement réduit' : ''}`;
      if (reduced) { check(list.every((a) => a.duration <= 0.01 && a.delay <= 0.01), `CA-3 ${label} : durées ≤ 0,01 ms`, JSON.stringify(list.slice(0, 3))); continue; }
      const thumb = list.filter((a) => near(a.duration, 465));
      check(thumb.length > 0 && thumb.every((a) => near(a.delay, 0) && sameCurve(a.easing, EASE.pop)), `d46 ${label} : bouton 465 ms, courbe « pop »`, JSON.stringify(list.map((a) => [a.target, a.props.join('+'), a.duration, a.easing.slice(0, 40)])));
      const track = list.filter((a) => a.props.some((p) => /color|background/i.test(p)));
      check(track.length > 0 && track.every((a) => near(a.duration, 200) && sameCurve(a.easing, EASE.standard)), `d46 ${label} : piste de couleur 200 ms`, JSON.stringify(track.map((a) => [a.target, a.duration, a.easing.slice(0, 40)])));
      const over = Math.max(...Array.from({ length: 101 }, (_, i) => bezier(EASE.pop)(i / 100))) - 1;
      check(over > 0.12 && over < 0.15, `d46 ${label} : dépassement de la courbe « pop » entre 12 et 15 % (${(over * 100).toFixed(1)} %)`, '');
      await idle(page);
    }
    await context.close();
  }
});
await run('bloc 7', async () => {
    const { context, page } = await open('qa-motion-indicators-forms--switches');
    await page.evaluate(() => document.documentElement.style.setProperty('--lc-switch-duration', '777ms'));
    const m = await mark(page);
    await page.click('#sw2');
    await page.evaluate(() => window.__t8.frames(6));
    const list = await since(page, m, '#sw2');
    check(list.some((a) => near(a.duration, 777)), 'd46 lc-switch lit --lc-switch-duration (surcharge 777 ms suivie)', JSON.stringify(list.map((a) => [a.target, a.duration])));
    await context.close();
});

// ---------- lc-stepper (d13, d51) : barres 800 ms décalées de 117 ms, pastille 600 ms « pop-strong » décalée de 40 ms ----------
await run('bloc 8', async () => {
    const { context, page, errors } = await open('qa-motion-indicators-navigation--stepper');
    await idle(page);
    const parts = (list) => ({ bars: list.filter((a) => near(a.duration, 800)), dots: list.filter((a) => near(a.duration, 600)) });
    const sorted = (xs) => xs.map((a) => a.delay).sort((p, q) => p - q);
    let m = await mark(page);
    await page.click('#show');
    await page.evaluate(() => window.__t8.frames(12));
    let all = await since(page, m, 'lc-stepper');
  const every = () => JSON.stringify(all.map((a) => [a.target, a.props.join('+'), a.duration, a.delay]));
  let { bars, dots } = parts(all);
    const bd = sorted(bars);
    check(bd.length >= 2 && bd.every((d, i) => near(d, i * 117)) && bars.every((a) => sameCurve(a.easing, EASE.entrance)), 'd51 lc-stepper à l\'affichage : barres tracées l\'une après l\'autre, 800 ms, décalage 117 ms, courbe « entrance »', `animations vues : ${every()}`);
    const dd = sorted(dots);
    check(dd.length >= 1 && dd.every((d, i) => near(d, i * 40)) && dots.every((a) => sameCurve(a.easing, EASE.popStrong)), 'd13 lc-stepper à l\'affichage : pastilles en pop 600 ms « pop-strong », décalage 40 ms', `animations vues : ${every()}`);
    await idle(page);
    m = await mark(page);
    await page.click('#next');
    await page.evaluate(() => window.__t8.frames(12));
    all = await since(page, m, 'lc-stepper');
  ({ bars, dots } = parts(all));
    check(bars.length >= 1 && bars.every((a) => sameCurve(a.easing, EASE.entrance)), 'd51 lc-stepper à « Suivant » : la barre atteinte est tracée en 800 ms', `animations vues : ${every()}`);
    check(dots.length >= 1 && dots.every((a) => sameCurve(a.easing, EASE.popStrong)), 'd13 lc-stepper à « Suivant » : la pastille courante pop en 600 ms « pop-strong »', `animations vues : ${every()}`);
    check(errors.length === 0, 'erreurs page stepper', errors.join(' ; '));
    await context.close();
});
await run('bloc 9', async () => {
    const { context, page } = await open('qa-motion-indicators-navigation--stepper');
    await page.evaluate(() => { const s = document.documentElement.style; s.setProperty('--lc-steps-bar-duration', '777ms'); s.setProperty('--lc-steps-bar-stagger', '51ms'); s.setProperty('--lc-steps-dot-duration', '555ms'); });
    const m = await mark(page);
    await page.click('#show');
    await page.evaluate(() => window.__t8.frames(12));
    const list = await since(page, m, 'lc-stepper');
    const bars = list.filter((a) => near(a.duration, 777)).map((a) => a.delay).sort((p, q) => p - q);
    check(bars.length >= 2 && bars.every((d, i) => near(d, i * 51)) && list.some((a) => near(a.duration, 555)), 'd51 lc-stepper lit ses tokens (barres 777 ms décalées de 51 ms, pastille 555 ms)', `animations vues : ${JSON.stringify(list.map((a) => [a.target, a.duration, a.delay]))}`);
    await context.close();
});
await run('bloc 10', async () => {
  for (const reduced of [true]) {
    const { context, page } = await open('qa-motion-indicators-navigation--stepper', { reduced });
    const m = await mark(page);
    await page.click('#show');
    await page.evaluate(() => window.__t8.frames(4));
    await page.click('#next');
    await page.evaluate(() => window.__t8.frames(4));
    const list = await since(page, m, 'lc-stepper');
    check(list.every((a) => a.duration <= 0.01 && a.delay <= 0.01), 'CA-3 lc-stepper mouvement réduit : durées et délais ≤ 0,01 ms', JSON.stringify(list.slice(0, 3)));
    await context.close();
  }
});

// ---------- CA-22 : l'appui du bouton lit --lc-button-press-* (valeurs par défaut 0,97 / 100 ms, puis surcharge) ----------
await run('bloc 11', async () => {
  for (const [label, tokens, scale, ms] of [['valeurs par défaut', null, 0.97, 100], ['surcharge 0,9 / 333 ms', { '--lc-button-press-scale': '0.9', '--lc-button-press-duration': '333ms' }, 0.9, 333]]) {
    const { context, page } = await open('qa-motion-acceptance--buttons');
    if (tokens) await page.evaluate((t) => Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v)), tokens);
    for (const id of ['solid', 'outline', 'flat', 'icon']) {
      const box = await page.locator(`#${id}`).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const got = await page.evaluate(async (id) => {
        const el = document.getElementById(id);
        await window.__t8.frames(2);
        const list = el.getAnimations().filter((a) => a instanceof CSSTransition && ['transform', 'scale'].includes(a.transitionProperty));
        const durations = list.map((a) => a.effect.getComputedTiming().duration);
        list.forEach((a) => a.finish());
        const cs = getComputedStyle(el);
        const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
        const s = cs.scale === 'none' ? 1 : parseFloat(cs.scale);
        return { durations, a: m.a * s, d: m.d * s, active: el.matches(':active') };
      }, id);
      await page.mouse.up();
      check(got.active && got.durations.length > 0 && got.durations.every((d) => near(d, ms)) && near(got.a, scale, 0.001) && near(got.d, scale, 0.001), `CA-22 bouton #${id} ${label} : échelle ${scale}, ${ms} ms`, `échelle ${got.a.toFixed(3)}, durées ${got.durations}, actif ${got.active}`);
    }
    await context.close();
  }
});

// ---------- CA-20 / CA-38 : contrat des stories Animation (§9) : la story existe, chaque démo est dans `[data-demo="dNN"]` avec son bouton « Rejouer » à l'intérieur ----------
await run('contrat des stories', async () => {
  const index = await (await fetch(`${base}/index.json`)).json();
  const CONTRACT = { 'navigation-tabs--animation': ['d10', 'd45'], 'navigation-stepper--animation': ['d13', 'd51'], 'forms-switch--animation': ['d46'], 'forms-segmented-control--animation': ['d62'], 'navigation-nav-group--animation': ['d48'], 'buttons-button--animation': [] };
  for (const [id, demos] of Object.entries(CONTRACT)) {
    if (!index.entries[id]) { check(false, `CA-20 story ${id} dans l'index`, 'story absente'); continue; } // CA-38 : vérifié dans `storybook-browser.mjs motion`
    const { context, page } = await open(id);
    for (const d of demos) {
      const inside = await page.locator(`[data-demo="${d}"] >> button:has-text("Rejouer")`).count();
      check(inside === 1, `CA-20 ${id} : [data-demo="${d}"] contient son bouton « Rejouer »`, `${inside} bouton(s)`);
    }
    await context.close();
  }
});

await browser.close();
server?.close();
console.log(failures === 0 ? '\nTout est vert.' : `\n${failures} KO.`);
process.exit(failures > 0 ? 1 : 0);
