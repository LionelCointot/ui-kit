// lcReveal et lcStagger en navigateur réel (spec 2026-12-mouvement-v2, T3) : CA-3, CA-7 (animation unique), CA-8, CA-9, CA-10, CA-11.
// Les valeurs attendues viennent de la spec (§5.2, §5.3) et des tokens `--lc-sys-*` lus dans le navigateur, jamais d'un nombre recopié.
//   node tools/qa/reveal-browser.mjs                Storybook statique (STORYBOOK_DIR ou dist/storybook) ; BASE=http://… pour un Storybook déjà lancé
// Stories (packages/angular/src/lib/motion/stories/reveal.acceptance.qa.stories.ts, titre QA/Motion/Reveal acceptance) :
//   lists    : `#if-block` (@if), `#list > li[data-id]` (@for, 1 à 7), boutons `#toggle`, `#remove` (retire data-id 2), `#reverse`, `#append` (8), `#prepend` (9)
//   variants : bouton `#show`, puis `#v-rise #v-default #v-drop #v-fade #v-scale #v-pop #v-left #v-right` et `#v-tilt-1`, `#v-tilt-2` (frères sous un `lcStagger="cards"`)
//   stagger  : bouton `#show`, sections `#s-normal` (12 éléments `[data-i]` dans un composant enfant), `#s-default`, `#s-fine`, `#s-cards`, `#s-index` (lcRevealIndex 5, 0, 2, 11),
//              `#s-index-alone` (lcRevealIndex 3 sans lcStagger), bouton `#add` (13e élément de `#s-normal`)
//   many     : `#many` (lcStagger) avec 500 `span[lcReveal]` rendus au chargement
//   quiet    : `#quiet` (lcReveal, `animation: none`) : aucune animation ne tourne au premier rendu
// Autre contrat : la story `layout-reveal--animation` existe dans l'index et porte au moins deux boutons « Rejouer » (lcReveal et lcStagger) : la boucle de CA-3 / CA-5 de `storybook-browser.mjs motion` la mesure.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const story = (name) => `qa-motion-reveal-acceptance--${name}`;

const server = await staticServer(storybookDir);
const { base } = server;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };

/** Fonctions de lecture injectées dans la page : tokens résolus, animation d'entrée, état de départ composé (translate · rotate · scale · transform). */
const INIT = () => {
  window.__starts = [];
  document.addEventListener('animationstart', (e) => window.__starts.push(`${e.animationName}|${e.target.dataset?.id ?? e.target.id}`), true);
  const root = () => getComputedStyle(document.documentElement);
  const ms = (name) => { const v = root().getPropertyValue(name).trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible : ${name}="${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  const num = (name) => parseFloat(root().getPropertyValue(name));
  const px = (name) => { const p = document.createElement('div'); p.style.cssText = `position:absolute;width:var(${name})`; document.body.append(p); const v = parseFloat(getComputedStyle(p).width); p.remove(); return v; };
  const flat = (s) => { const n = s.match(/-?\d*\.?\d+/g); return n ? n.map(Number).join(',') : s.trim(); }; // courbes comparées par leurs nombres (0.16 = .16)
  const entry = (el) => el.getAnimations().find((a) => a instanceof CSSAnimation && a.animationName === 'lc-reveal-in');
  const pose = (el) => {
    const cs = getComputedStyle(el);
    const t = cs.translate === 'none' ? [0, 0] : cs.translate.split(' ').map(parseFloat);
    const m = new DOMMatrix().translateSelf(t[0] || 0, t[1] || 0);
    if (cs.rotate !== 'none') m.rotateSelf(parseFloat(cs.rotate));
    if (cs.scale !== 'none') { const s = cs.scale.split(' ').map(parseFloat); m.scaleSelf(s[0], s[1] ?? s[0]); }
    if (cs.transform !== 'none') m.multiplySelf(new DOMMatrix(cs.transform));
    return { dx: m.e, dy: m.f, scale: Math.hypot(m.a, m.b), rot: (Math.atan2(m.b, m.a) * 180) / Math.PI, opacity: parseFloat(cs.opacity) };
  };
  const easings = (a) => [a.effect.getTiming().easing, ...a.effect.getKeyframes().map((k) => k.easing)].map(flat);
  window.__rv = { ms, num, px, flat, entry, pose, easings };
};

async function open(id, { reduced = false, width = 1100, wait = '#storybook-root > *' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector(wait, { timeout: 20000 });
  return { page, context, errors };
}
const idle = (page, timeout = 15000) => page.waitForFunction(() => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)), null, { timeout });
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
/** Preuve négative : deux images (une entrée démarre au plus une ou deux images après le DOM), puis plus aucune animation finie en cours. */
const quiet = async (page) => { await frames(page); await idle(page, 5000); };
const settle = async (page) => { await idle(page); await page.evaluate(() => { window.__starts.length = 0; }); };

/** Clique `button`, relève l'élément `gone` : instant de disparition, animations vues pendant la sortie (nom, durée, courbes). */
const leave = (page, button, gone) => page.evaluate(async ([button, gone]) => {
  const t0 = performance.now();
  const seen = { goneAt: null, presentAt60: null, className: null, anims: [] };
  // Instant exact du retrait (MutationObserver) : l'échantillonnage par image arrondirait jusqu'à 17 ms au-dessus.
  new MutationObserver(() => { if (seen.goneAt === null && !document.querySelector(gone)) seen.goneAt = Math.round(performance.now() - t0); }).observe(document.body, { childList: true, subtree: true });
  document.getElementById(button).click();
  await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now() - t0;
      const el = document.querySelector(gone);
      if (el && seen.anims.length === 0) {
        seen.className = el.className;
        seen.anims = el.getAnimations().map((a) => ({ name: a.animationName ?? a.transitionProperty, duration: a.effect.getComputedTiming().endTime, easings: window.__rv.easings(a) }));
      }
      if (t >= 60 && seen.presentAt60 === null) seen.presentAt60 = !!el;
      if (t > 1200) resolve(); else requestAnimationFrame(tick);
    };
    tick();
  });
  return seen;
}, [button, gone]);

const tokens = (page) => page.evaluate(() => {
  const { ms, num, px, flat } = window.__rv;
  const raw = (n) => flat(getComputedStyle(document.documentElement).getPropertyValue(n));
  return { enter: ms('--lc-reveal-duration'), tiltDur: ms('--lc-reveal-tilt-duration'), easeOut: raw('--lc-sys-easing-out'), exit: ms('--lc-sys-duration-exit'), easeEntrance: raw('--lc-sys-easing-entrance'), easeExit: raw('--lc-sys-easing-exit'), easePop: raw('--lc-sys-easing-pop'), easeSoft: raw('--lc-sys-easing-soft'),
    offsets: { sm: px('--lc-sys-motion-offset-sm'), md: px('--lc-sys-motion-offset-md'), lg: px('--lc-sys-motion-offset-lg'), xl: px('--lc-sys-motion-offset-xl') },
    scaleEnter: num('--lc-sys-motion-scale-enter'), scalePop: num('--lc-sys-motion-scale-pop'), tilt: num('--lc-sys-motion-rotate-tilt'),
    pace: { fine: ms('--lc-sys-motion-stagger-fine'), normal: ms('--lc-sys-motion-stagger-normal'), cards: ms('--lc-sys-motion-stagger-cards') }, cap: num('--lc-sys-motion-stagger-cap') };
});
/** Un bloc qui lève (story absente, élément introuvable) est un échec écrit, et les blocs suivants continuent. */
const section = async (n, fn) => { try { await fn(); } catch (error) { check(false, `bloc ${n} interrompu`, error.message.split('\n')[0]); } };
const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;

// ---------- CA-8, CA-7 : les 8 variantes, mouvement normal ----------
await section(1, async () => {
  const { page, context, errors } = await open(story('variants'), { wait: '#show' });
  const t = await tokens(page);
  const got = await page.evaluate(async () => {
    const { entry, pose } = window.__rv;
    document.getElementById('show').click();
    const ids = ['rise', 'default', 'drop', 'fade', 'scale', 'pop', 'left', 'right', 'tilt-1', 'tilt-2'].map((n) => `v-${n}`);
    for (let i = 0; i < 30 && !document.getElementById(ids[0])?.getAnimations().length; i += 1) await new Promise((r) => requestAnimationFrame(r));
    const rows = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      const all = el.getAnimations();
      const a = entry(el);
      if (!a) { rows[id] = { missing: true, count: all.length, className: el.className }; continue; }
      a.pause();
      a.currentTime = 0;
      const timing = a.effect.getComputedTiming();
      rows[id] = { count: all.length, kinds: all.map((x) => `${x.constructor.name}:${x.animationName ?? x.transitionProperty}`), className: el.className, duration: timing.duration, easings: window.__rv.easings(a), start: pose(el) };
    }
    for (const id of ids) { const a = entry(document.getElementById(id)); if (a) { a.finish(); rows[id].end = pose(document.getElementById(id)); } }
    return rows;
  });
  const none = (id) => got[id].missing && `${id} : aucune CSSAnimation « lc-reveal-in » (animations=${got[id].count}, classe="${got[id].className}")`;
  for (const id of Object.keys(got)) {
    const r = got[id];
    check(!r.missing, `CA-8 ${id} joue l'animation d'entrée « lc-reveal-in »`, none(id));
    if (r.missing) continue;
    check(r.count === 1 && r.kinds[0] === 'CSSAnimation:lc-reveal-in', `CA-7 ${id} n'a qu'une animation (lc-reveal-in), aucune CSSTransition`, JSON.stringify(r.kinds));
    check(r.className.split(' ').includes('lc-reveal'), `CA-8 ${id} porte la classe lc-reveal pendant l'entrée`, r.className);
    const tilt = id.startsWith('v-tilt'), overshoot = tilt || id === 'v-pop', dur = tilt ? t.tiltDur : t.enter;
    check(near(r.duration, dur, 0.01), `CA-8 ${id} durée = ${tilt ? '--lc-reveal-tilt-duration' : '--lc-reveal-duration'} (${dur} ms)`, String(r.duration));
    const expected = overshoot ? t.easePop : t.easeOut;
    check(r.easings.includes(expected), `CA-8 ${id} courbe = ${overshoot ? 'easing-pop' : 'easing-out'} (${expected})`, JSON.stringify(r.easings));
    check(r.start.opacity === 0 && near(r.end.opacity, 1, 0.001) && near(r.end.dx, 0) && near(r.end.dy, 0) && near(r.end.scale, 1, 0.001) && near(r.end.rot, 0, 0.01), `CA-8 ${id} : opacité 0 → 1 et fin sans décalage, échelle ni rotation`, JSON.stringify({ start: r.start, end: r.end }));
  }
  const S = (id) => got[id].start ?? {};
  const offsets = Object.values(t.offsets);
  const isOffset = (v) => offsets.some((o) => near(Math.abs(v), o));
  const D = S('v-rise').dy;
  check(D > 0 && isOffset(D), 'CA-8 rise : part de +distance (un des tokens --lc-sys-motion-offset-*) vers 0, sans échelle ni rotation', JSON.stringify(S('v-rise')));
  check(near(S('v-default').dy, D) && S('v-default').dx === 0, 'CA-8 lcReveal vide = rise', JSON.stringify(S('v-default')));
  check(near(S('v-drop').dy, -D) && near(S('v-drop').dx, 0), 'CA-8 drop : part de −distance (même distance que rise)', JSON.stringify(S('v-drop')));
  check(near(S('v-left').dx, -D) && near(S('v-left').dy, 0), 'CA-8 left : arrive de la gauche (−distance en x)', JSON.stringify(S('v-left')));
  check(near(S('v-right').dx, D) && near(S('v-right').dy, 0), 'CA-8 right : arrive de la droite (+distance en x)', JSON.stringify(S('v-right')));
  check(near(S('v-fade').dx, 0) && near(S('v-fade').dy, 0) && near(S('v-fade').scale, 1, 0.001), 'CA-8 fade : apparaît sur place (aucun décalage ni échelle)', JSON.stringify(S('v-fade')));
  check(near(S('v-scale').scale, t.scaleEnter, 0.001) && near(S('v-scale').dy, 0), 'CA-8 scale : part de --lc-sys-motion-scale-enter, sur place', JSON.stringify(S('v-scale')));
  check(near(S('v-pop').scale, t.scalePop, 0.001), 'CA-8 pop : part de --lc-sys-motion-scale-pop', JSON.stringify(S('v-pop')));
  const [a, b] = [S('v-tilt-1'), S('v-tilt-2')];
  check(near(a.dy, t.offsets.xl) && near(b.dy, t.offsets.xl) && near(a.scale, t.scaleEnter, 0.001) && near(b.scale, t.scaleEnter, 0.001), 'CA-8 tilt : +40 px (offset-xl) et échelle scale-enter', JSON.stringify([a, b]));
  check(near(Math.abs(a.rot), t.tilt, 0.05) && near(Math.abs(b.rot), t.tilt, 0.05) && Math.sign(a.rot) === -Math.sign(b.rot), 'CA-8 tilt : ±--lc-sys-motion-rotate-tilt, signe alterné entre deux cartes voisines', JSON.stringify([a.rot, b.rot]));
  check(errors.length === 0, 'erreurs de page (variantes)', errors.join(' ; '));
  await context.close();
});

// ---------- CA-3 : variantes sous mouvement réduit ----------
await section(2, async () => {
  const { page, context } = await open(story('variants'), { reduced: true, wait: '#show' });
  await page.click('#show');
  await frames(page);
  const got = await page.evaluate(() => ({
    running: document.getAnimations().filter((a) => a.playState === 'running' || a.pending).map((a) => a.animationName ?? a.transitionProperty),
    longest: Math.max(0, ...document.getAnimations().map((a) => a.effect.getComputedTiming().duration)),
    poses: [...document.querySelectorAll('.qa-box')].map((el) => window.__rv.pose(el)),
  }));
  check(got.running.length === 0 && got.longest <= 0.01, 'CA-3 mouvement réduit : aucune animation en cours une image après l\'insertion, durées ≤ 0,01 ms', JSON.stringify(got.running));
  check(got.poses.length === 10 && got.poses.every((p) => p.opacity === 1 && near(p.dx, 0) && near(p.dy, 0) && near(p.scale, 1, 0.001) && near(p.rot, 0, 0.01)), 'CA-3 mouvement réduit : les 10 éléments sont dans leur état final', JSON.stringify(got.poses));
  await context.close();
});

// ---------- CA-9, CA-10 : @if, @for, mouvement normal ----------
await section(3, async () => {
  const { page, context, errors } = await open(story('lists'), { wait: '#list > li' });
  const t = await tokens(page);
  await settle(page);
  check(await page.evaluate(() => document.querySelectorAll('.lc-reveal').length) === 0, 'CA-10 la classe lc-reveal est retirée à animationend (aucun élément ne la garde)', 'classe encore posée');
  // CA-10 : sur 7 éléments, avant tout retrait.
  await page.click('#reverse');
  await quiet(page);
  const reverse = await page.evaluate(() => ({ starts: window.__starts.filter((s) => s.startsWith('lc-reveal-in')), order: [...document.querySelectorAll('#list > li')].map((l) => l.dataset.id).join() }));
  check(reverse.order === '7,6,5,4,3,2,1' && reverse.starts.length === 0, 'CA-10 inverser 7 éléments ne relance aucune animation d\'entrée', JSON.stringify(reverse));
  await page.click('#reverse');
  await quiet(page);
  await page.evaluate(() => { window.__starts.length = 0; });
  for (const [name, button, selector] of [['@if', 'toggle', '#if-block'], ['@for', 'remove', '#list > li[data-id="2"]']]) {
    const r = await leave(page, button, selector);
    const anim = r.anims.find((a) => a.name === 'lc-leave');
    check(r.presentAt60 === true && !!anim, `CA-9 ${name} : l'élément reste dans le DOM pendant sa sortie (animation lc-leave)`, `présent à 60 ms=${r.presentAt60}, animations=${JSON.stringify(r.anims)}, classe="${r.className}"`);
    check(!!anim && near(anim.duration, t.exit, 0.01) && anim.easings.includes(t.easeExit), `CA-9 ${name} : sortie = --lc-sys-duration-exit (${t.exit} ms) et --lc-sys-easing-exit`, JSON.stringify(anim));
    check(r.goneAt !== null && r.goneAt <= (anim?.duration ?? 0) + 50 + 34, `CA-9 ${name} : retiré à animation.finished + 50 ms au plus`, `retiré à ${r.goneAt} ms, animation ${anim?.duration} ms (+ une image de marge de mesure)`);
    await idle(page, 5000);
  }
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
});

// ---------- CA-9 (≤ 70 ms) et CA-3 : mouvement réduit ----------
await section(4, async () => {
  const { page, context, errors } = await open(story('lists'), { reduced: true, wait: '#list > li' });
  await settle(page);
  for (const [name, button, selector] of [['@if', 'toggle', '#if-block'], ['@for', 'remove', '#list > li[data-id="2"]']]) {
    const r = await leave(page, button, selector);
    check(r.goneAt !== null && r.goneAt <= 70, `CA-9 mouvement réduit ${name} : retiré en 70 ms au plus`, `retiré à ${r.goneAt} ms`);
    check(r.anims.every((a) => !(a.duration > 0.01)), `CA-3 mouvement réduit ${name} : aucune animation de sortie (durée ≤ 0,01 ms)`, JSON.stringify(r.anims));
  }
  check(errors.length === 0, 'erreurs de page (mouvement réduit)', errors.join(' ; '));
  await context.close();
});

// ---------- CA-10 : aucune animation au premier rendu (équivalent navigateur du rendu serveur) ----------
await section(5, async () => {
  const { page, context } = await open(story('quiet'), { wait: '#quiet' });
  await page.waitForFunction(() => !document.getElementById('quiet').classList.contains('lc-reveal'), null, { timeout: 5000 }).then(
    () => check(true, 'CA-10 élément déjà rendu sans animation en cours : lc-reveal retirée au premier rendu'),
    async () => check(false, 'CA-10 élément déjà rendu sans animation en cours : lc-reveal retirée au premier rendu', `classe="${await page.evaluate(() => document.getElementById('quiet').className)}"`));
  await context.close();
});

// ---------- CA-11 : rangs et décalages ----------
await section(6, async () => {
  const { page, context, errors } = await open(story('stagger'), { wait: '#show' });
  const t = await tokens(page);
  const delays = await page.evaluate(async () => {
    const { entry } = window.__rv;
    document.getElementById('show').click();
    for (let i = 0; i < 30 && !document.querySelector('#s-normal [data-i]')?.getAnimations().length; i += 1) await new Promise((r) => requestAnimationFrame(r));
    const read = (section) => [...document.querySelectorAll(`${section} [data-i]`)].map((el) => ({ i: Number(el.dataset.i), delay: entry(el)?.effect.getComputedTiming().delay ?? null }));
    return { normal: read('#s-normal'), dflt: read('#s-default'), fine: read('#s-fine'), cards: read('#s-cards'), index: read('#s-index'), alone: read('#s-index-alone') };
  });
  const rank = (i) => Math.min(i, t.cap);
  for (const [name, rows, pace] of [['normal (sans valeur)', delays.normal, t.pace.normal], ['normal (lcStagger="")', delays.dflt, t.pace.normal], ['fine', delays.fine, t.pace.fine], ['cards', delays.cards, t.pace.cards]]) {
    check(rows.length >= 3 && rows.every((r) => r.delay !== null && near(r.delay, rank(r.i) * pace, 0.01)), `CA-11 rythme ${name} : délai du rang n = min(n, ${t.cap}) × ${pace} ms (éléments d'un composant enfant)`, JSON.stringify(rows.map((r) => [r.i, r.delay])));
  }
  check(delays.index.length === 4 && delays.index.every((r) => near(r.delay, rank(r.i) * t.pace.normal, 0.01)), 'CA-11 lcRevealIndex impose le rang (5, 0, 2 et 11 plafonné à 8)', JSON.stringify(delays.index.map((r) => [r.i, r.delay])));
  check(delays.alone.length === 1 && near(delays.alone[0].delay, 3 * t.pace.normal, 0.01), 'CA-11 lcRevealIndex sans lcStagger : délai = rang × décalage normal', JSON.stringify(delays.alone));
  await settle(page);
  await page.click('#add');
  await quiet(page);
  const added = await page.evaluate(() => ({ starts: window.__starts.filter((s) => s.startsWith('lc-reveal-in')), item: document.querySelector('#s-normal [data-i="12"]') !== null }));
  check(added.item && added.starts.length === 1, 'CA-11 ajouter un 13e élément n\'anime que lui', JSON.stringify(added));
  check(errors.length === 0, 'erreurs de page (cascade)', errors.join(' ; '));
  await context.close();
});

// CA-11 : le lot est remis à zéro, un élément ajouté plus tard repart au rang 0.
await section(7, async () => {
  const { page, context } = await open(story('stagger'), { wait: '#show' });
  await page.click('#show');
  await page.waitForSelector('#s-normal [data-i]');
  await settle(page);
  const delay = await page.evaluate(async () => {
    document.getElementById('add').click();
    for (let i = 0; i < 30 && !document.querySelector('#s-normal [data-i="12"]')?.getAnimations().length; i += 1) await new Promise((r) => requestAnimationFrame(r));
    return window.__rv.entry(document.querySelector('#s-normal [data-i="12"]'))?.effect.getComputedTiming().delay ?? null;
  });
  check(delay === 0, 'CA-11 lot remis à zéro : un élément ajouté plus tard prend le rang 0 (délai 0)', String(delay));
  await context.close();
});

// ---------- CA-11 : 500 éléments ----------
await section(8, async () => {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'no-preference' });
  await context.addInitScript(INIT);
  await context.addInitScript(() => {
    window.__ev = [];
    for (const type of ['animationstart', 'animationend']) document.addEventListener(type, (e) => { if (e.animationName === 'lc-reveal-in') window.__ev.push([type, e.timeStamp]); }, true);
  });
  const page = await context.newPage();
  await page.goto(`${base}/iframe.html?id=${story('many')}&viewMode=story`);
  await page.waitForSelector('#many > span', { timeout: 20000 });
  await page.waitForFunction(() => window.__ev.filter((e) => e[0] === 'animationend').length >= 500, null, { timeout: 15000 }).catch(() => undefined);
  const r = await page.evaluate(() => {
    const starts = window.__ev.filter((e) => e[0] === 'animationstart').map((e) => e[1]);
    const ends = window.__ev.filter((e) => e[0] === 'animationend').map((e) => e[1]);
    const { ms, num } = window.__rv;
    return { starts: starts.length, ends: ends.length, span: Math.max(...ends) - Math.min(...starts), bound: num('--lc-sys-motion-stagger-cap') * ms('--lc-sys-motion-stagger-normal') + ms('--lc-reveal-duration') + 50 };
  });
  check(r.starts === 500 && r.ends === 500 && r.span <= r.bound, 'CA-11 500 éléments : dernier animationend − premier animationstart ≤ cap × décalage + durée + 50 ms', JSON.stringify(r));
  await context.close();
});

// ---------- CA-3, CA-5 : la boucle de storybook-browser.mjs doit mesurer la story d'animation de lcReveal / lcStagger ----------
await section(9, async () => {
  const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8').catch(() => '{"entries":{}}'));
  const entry = index.entries['layout-reveal--animation'];
  check(!!entry, 'CA-3/CA-5 la story layout-reveal--animation existe dans l\'index (mesurée par la boucle « Animation » de storybook-browser.mjs motion)', 'story absente de dist/storybook/index.json');
  if (entry) {
    const { page, context } = await open('layout-reveal--animation');
    const count = await page.getByRole('button', { name: 'Rejouer' }).count();
    check(count >= 2, 'CA-3/CA-5 layout-reveal--animation porte au moins deux boutons « Rejouer » (lcReveal, lcStagger)', `${count}`);
    await context.close();
  }
});

await browser.close();
server?.close();
process.exit(failures > 0 ? 1 : 0);
