// Acceptation navigateur de docs/specs/2026-11-fil-de-messages.md (lc-message-thread ; Chromium, Storybook statique dist/storybook ; STORYBOOK_DIR pour une autre construction).
//   node tools/qa/message-thread-browser.mjs layout|attach|text|motion|scroll|axe|engines|all
//   layout : CA-T1 T2 T5 T7 T17 · attach : T6 · text : T8 T15 T16 T17 (DOM) · motion : T3 T4 T13 · scroll : T9 T10 · axe : T11 (+ T19 rendu minimal) · engines : T10 sous Firefox et WebKit si Playwright les a
// Stories : QA/Feedback/Message thread (Acceptance, AcceptanceEn, Bare) ; fil piloté par window.__thread, événements lus dans window.__qa.events.
// Écrit AVANT le code (F0) : rouge attendu tant que lc-message-thread manque. Code de sortie 1 au moindre échec.
// Sélecteurs imposés (spec 5.1 / 5.4) : lc-message-thread, [role="log"], .lc-message-thread__bubble, lc-avatar, <time>, <bdi>, <a target>, vignettes <button> + <img> dans la bulle.
// Méthode de CA-T3 : toutes les animations sont mises en pause à currentTime = 0 juste après l'insertion, puis on mesure.
// Limites : le geste tactile réel et la lecture d'écran ne sont pas essayés ; les avertissements « développement » (CA-T17) sont dans message-thread.acceptance.spec.ts (Storybook statique = mode production).
// Interprétations de la spec à confirmer (voir le rapport) : CA-T3(b) = aucun trou POSITIF > 1 px entre la dernière bulle précédente et la première nouvelle à t = 0 (la nouvelle bulle est réduite à enter-scale) ;
//   CA-T1 écart entre groupes mesuré en minimum (≥ group-gap), le contenu de l'en-tête n'étant pas spécifié ; bord gauche des « autres » mesuré sans avatar, avec avatar on mesure l'avatar.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const pw = require('playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = await new Promise((ok) => { const s = createServer(async (rq, rs) => { try { const f = path.join(dir, path.normalize(decodeURIComponent(new URL(rq.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')); const body = await readFile(f); rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }).end(body); } catch { rs.writeHead(404).end(); } }); s.listen(0, '127.0.0.1', () => ok(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let browser = await pw.chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${name}${ok ? '' : ` : ${detail}`}`); };
const near = (a, b, eps = 1) => Math.abs(a - b) <= eps;

const ACC = 'qa-feedback-message-thread--acceptance';
const EN = 'qa-feedback-message-thread--acceptance-en';
const BARE = 'qa-feedback-message-thread--bare';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const T0 = Date.parse('2026-11-21T09:00:00Z');
// Message n : texte « msg n », écart en secondes (s) depuis T0 (défaut : n secondes) ; Alice (a) à gauche sauf indication.
const mk = (n, o = {}) => { const { s = n, ...r } = o; return { id: `m${n}`, authorId: 'a', authorName: 'Alice', mine: false, sentAt: new Date(T0 + s * 1000).toISOString(), text: `msg ${n}`, ...r }; };
const me = (n, o = {}) => mk(n, { authorId: 'me', authorName: 'Vous', mine: true, ...o });
const alt = (n, o = {}) => (n % 2 ? mk(n, o) : mk(n, { authorId: 'b', authorName: 'Bob', ...o })); // auteurs alternés : une bulle par groupe
const PHONE = { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true };
const DESK = { viewport: { width: 1280, height: 800 } };
const ctxs = { phone: PHONE, desk: DESK, deskReduced: { ...DESK, reducedMotion: 'reduce' }, deskParis: { ...DESK, timezoneId: 'Europe/Paris', locale: 'fr-FR' }, deskLA: { ...DESK, timezoneId: 'America/Los_Angeles', locale: 'en-US' } };
const withCtx = async (name, fn) => { const c = await browser.newContext(ctxs[name]); try { await fn(c); } catch (e) { check(`${name} : exception`, false, String(e.message).split('\n')[0]); } finally { await c.close(); } };
const sec = async (label, fn) => { try { await fn(); } catch (e) { check(`${label} : exception`, false, String(e.message).split('\n')[0]); } };

// Utilitaires côté page (window.Q).
const INIT = () => {
  const rootCs = getComputedStyle(document.documentElement);
  const Q = (window.Q = {});
  Q.ms = (n) => { const v = rootCs.getPropertyValue(n).trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible ${n}="${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  Q.probe = (css, prop) => { const p = document.createElement('div'); p.style.cssText = `position:absolute;${css}`; document.body.append(p); const v = getComputedStyle(p)[prop]; p.remove(); return v; };
  Q.px = (n) => parseFloat(Q.probe(`width:var(${n})`, 'width'));
  Q.num = (n) => parseFloat(Q.probe(`scale:var(${n})`, 'scale'));
  Q.raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  Q.until = async (f, t = 3000) => { const s = performance.now(); while (!f()) { if (performance.now() - s > t) return false; await new Promise((r) => setTimeout(r, 8)); } return true; };
  Q.settle = async () => { await Q.raf(); await Promise.allSettled(document.getAnimations().map((a) => a.finished)); await Q.raf(); };
  Q.R = (el) => el.getBoundingClientRect();
  Q.log = () => document.querySelector('[role="log"]');
  Q.bubbles = () => [...document.querySelectorAll('.lc-message-thread__bubble')];
  Q.numOf = (b) => parseInt(/msg (\d+)/.exec(b.textContent)?.[1] ?? '-1', 10);
  Q.bubble = (n) => Q.bubbles().find((b) => new RegExp(`\\bmsg ${n}\\b`).test(b.textContent));
  Q.nums = () => Q.bubbles().map(Q.numOf);
  Q.anims = () => document.getAnimations().filter((a) => a.effect?.target?.closest?.('lc-message-thread') || a.effect?.target?.localName === 'lc-message-thread');
  Q.pauseAll = (t) => document.getAnimations().forEach((a) => { a.pause(); if (t !== null) a.currentTime = t; });
  Q.names = () => [...Q.log().querySelectorAll('bdi')].map((b) => b.textContent.trim());
  Q.clockTimes = () => [...Q.log().querySelectorAll('time')].filter((t) => /\d{1,2}[:h]\d{2}/.test(t.textContent));
  Q.dayLabels = (re, sel = 'time, [class*="day"]') => [...Q.log().querySelectorAll(sel)].map((t) => t.textContent.replace(/[  ]/g, ' ').replace('’', "'").trim()).filter((t) => re.test(t));
  // Zone des bulles : le remplissage du fil est celui du CSS du fil ou, à défaut, le jeton thread-padding (posé sur un conteneur interne).
  Q.content = () => { const l = Q.log(), cs = getComputedStyle(l), r = Q.R(l); const pad = Math.max(parseFloat(cs.paddingLeft), Q.px('--lc-message-thread-thread-padding')); const left = r.left + l.clientLeft + pad; const right = r.left + l.clientLeft + l.clientWidth - pad; return { left, right, mid: (left + right) / 2 }; };
  // Animation d'entrée d'un élément (bulle ou ancêtre jusqu'au fil) : celle dont la durée vaut enter-duration.
  Q.enter = (b) => { const D = Q.ms('--lc-message-thread-enter-duration'); for (let e = b; e && e.localName !== 'lc-message-thread'; e = e.parentElement) { const a = e.getAnimations().find((x) => near(x.effect.getComputedTiming().duration, D)); if (a) return { a, el: e, t: a.effect.getComputedTiming() }; } return null; };
  Q.progressAt = (f) => { const p = document.createElement('div'); document.body.append(p); const a = p.animate([{ scale: 0 }, { scale: 1 }], { duration: 1000, easing: getComputedStyle(document.documentElement).getPropertyValue('--lc-message-thread-enter-easing').trim() || Q.probe('transition-timing-function:var(--lc-message-thread-enter-easing)', 'transitionTimingFunction'), fill: 'both' }); a.pause(); a.currentTime = f * 1000; const v = parseFloat(getComputedStyle(p).scale); a.cancel(); p.remove(); return v; };
  function near(a, b, e = 1) { return Math.abs(a - b) <= e; }
  Q.textRect = (root, str) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) { const i = n.textContent.indexOf(str); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + str.length); return { rect: r.getBoundingClientRect(), node: n }; } } return null; };
};

async function open(ctx, id = ACC, { theme = 'default', now } = {}) {
  const page = await ctx.newPage(); page.errors = []; page.logs = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => page.logs.push(`${m.type()}: ${m.text()}`));
  if (now) await page.clock.setFixedTime(new Date(now)); // l'horloge n'est figée que pour les dates (les minuteries courent)
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  await page.waitForSelector('lc-message-thread', { state: 'attached', timeout: 15000 }); // en attente du code : le composant n'existe pas encore
  await page.evaluate(INIT);
  await page.waitForTimeout(300);
  return page;
}
const put = (page, list) => page.evaluate(async (l) => { window.__thread.set(l); await window.Q.raf(); await window.Q.settle(); }, list);
const patch = (page, p) => page.evaluate(async (x) => { window.__thread.patch(x); await window.Q.raf(); }, p);
const events = (page) => page.evaluate(() => window.__qa.events);

// ---------- mise en page : CA-T1 T2 T5 T7 T17 ----------
async function layout() {
  await withCtx('desk', async (c) => {
    const page = await open(c);
    const LIST = [mk(1), mk(2), me(3, { s: 60 }), alt(4, { s: 120 }), alt(6, { s: 540 })]; // m1 m2 : groupe d'Alice ; m3 : moi ; m4, m6 : Bob, 7 min d'écart = deux groupes
    await patch(page, { showAvatars: false }); await put(page, LIST);
    const g = await page.evaluate(() => { const C = Q.content(), R = Q.R, b = (n) => R(Q.bubble(n)); return { mineRight: C.right - b(3).right, otherLeft: b(1).left - C.left, gapSame: b(2).top - b(1).bottom, gapGroup: b(3).top - b(2).bottom, bubbleGap: Q.px('--lc-message-thread-bubble-gap'), groupGap: Q.px('--lc-message-thread-group-gap'), names: Q.names(), times: Q.clockTimes().length, avatars: document.querySelectorAll('lc-avatar').length, left2: b(2).left, left1: b(1).left, n: Q.nums() }; });
    check('CA-T1 mes messages à droite : bord de bulle à ≤ 2 px du bord du fil moins son remplissage', Math.abs(g.mineRight) <= 2, JSON.stringify(g));
    check('CA-T1 messages des autres à gauche : bord de bulle à ≤ 2 px du bord gauche moins son remplissage (sans avatar)', Math.abs(g.otherLeft) <= 2, JSON.stringify(g));
    check('CA-T1 bulles d\'un groupe séparées de bubble-gap (± 1 px) ; groupes séparés d\'au moins group-gap, plus que bubble-gap', near(g.gapSame, g.bubbleGap) && g.gapGroup >= g.groupGap - 1 && g.groupGap > g.bubbleGap, JSON.stringify(g));
    check('CA-T1 nom une fois en tête de groupe : Alice ×1, Bob ×2 (7 min = deux groupes) ; une heure par en-tête', g.names.filter((x) => x === 'Alice').length === 1 && g.names.filter((x) => x === 'Bob').length === 2 && g.times === g.names.length, JSON.stringify(g));
    check('CA-T2 sans showAvatars : aucun lc-avatar', g.avatars === 0, String(g.avatars));
    check('CA-T17 ordre de la liste conservé', JSON.stringify(g.n) === '[1,2,3,4,6]', JSON.stringify(g.n));

    // CA-T2 : avatars.
    await patch(page, { showAvatars: true }); await page.evaluate(() => Q.settle());
    const a = await page.evaluate(() => { const C = Q.content(), R = Q.R; const av = [...document.querySelectorAll('lc-avatar')]; const grp = (n) => av.find((x) => Math.abs(R(x).bottom - R(Q.bubble(n)).bottom) <= 2); return { count: av.length, texts: av.map((x) => x.textContent.trim()), hidden: av.every((x) => x.closest('[aria-hidden="true"]') || x.getAttribute('aria-hidden') === 'true'), alice: !!grp(2), aliceFirst: !!av.find((x) => Math.abs(R(x).bottom - R(Q.bubble(1)).bottom) <= 2 && x.textContent.trim() === 'A'), bob: !!grp(4) && !!grp(6), mine: av.some((x) => Math.abs(R(x).bottom - R(Q.bubble(3)).bottom) <= 2), avLeft: av[0] ? R(av[0]).left - C.left : null, left1: R(Q.bubble(1)).left, left2: R(Q.bubble(2)).left, avRight: av[0] ? R(av[0]).right : null }; });
    check('CA-T2 avec showAvatars (défaut) : un avatar par groupe des autres (3), initiales A / B / B, aucun pour mes messages', a.count === 3 && JSON.stringify(a.texts) === '["A","B","B"]' && !a.mine, JSON.stringify(a));
    check('CA-T2 avatar aligné sur le bas de la dernière bulle du groupe (± 2 px), décoratif (aria-hidden), au bord gauche du fil', a.alice && a.bob && !a.aliceFirst && a.hidden && Math.abs(a.avLeft) <= 2, JSON.stringify(a));
    check('CA-T2 les bulles d\'un groupe restent alignées entre elles (± 1 px), à droite de l\'avatar', near(a.left1, a.left2) && a.left1 >= a.avRight - 1, JSON.stringify(a));
    await patch(page, { showAvatars: false }); await page.evaluate(() => Q.settle());
    const b = await page.evaluate(() => ({ count: document.querySelectorAll('lc-avatar').length, l1: Q.R(Q.bubble(1)).left, l2: Q.R(Q.bubble(2)).left }));
    check('CA-T2 showAvatars retiré à chaud : aucun lc-avatar, bulles d\'un groupe alignées', b.count === 0 && near(b.l1, b.l2), JSON.stringify(b));

    // CA-T1 : 5 min 00 s ouvre un groupe, 4 min 59 s non.
    await put(page, [mk(1, { s: 0 }), mk(2, { s: 299 })]);
    const four = await page.evaluate(() => Q.names().filter((x) => x === 'Alice').length);
    await put(page, [mk(1, { s: 0 }), mk(2, { s: 300 })]);
    const five = await page.evaluate(() => Q.names().filter((x) => x === 'Alice').length);
    check('CA-T1 écart de 4 min 59 s : un groupe ; 5 min 00 s : un nouveau groupe', four === 1 && five === 2, `${four} / ${five}`);
    // même auteur, visibilité différente : deux groupes.
    await put(page, [mk(1), mk(2, { cssClass: 'qa-note' })]);
    check('CA-T1 même auteur, cssClass différente : deux groupes', (await page.evaluate(() => Q.names().filter((x) => x === 'Alice').length)) === 2);
    await put(page, [mk(1, { authorId: 'a', authorName: 'Alice' }), mk(2, { authorId: 'c', authorName: 'Alice' })]);
    check('CA-T1 authorId différent (même nom affiché) : deux groupes', (await page.evaluate(() => Q.names().length)) === 2);
    check('CA-T1/T17 aucune erreur de page', page.errors.length === 0, page.errors.join(' | '));
    await page.close();
  });

  // CA-T1 : jours (fuseau et langue), 23:59 et 00:01 locaux.
  for (const [ctxName, story, off, now, want] of [['deskParis', ACC, '+01:00', '2026-11-21T10:00:00+01:00', ['18 nov.', 'Hier', "Aujourd'hui"]], ['deskLA', EN, '-08:00', '2026-11-21T10:00:00-08:00', ['Nov 18', 'Yesterday', 'Today']]]) {
    await withCtx(ctxName, async (c) => {
      const page = await open(c, story, { now });
      const L = (iso, n) => mk(n, { sentAt: new Date(iso).toISOString() });
      await put(page, [L(`2026-11-18T09:00:00${off}`, 1), L(`2026-11-20T23:59:00${off}`, 2), L(`2026-11-21T00:01:00${off}`, 3), L(`2026-11-21T09:30:00${off}`, 4)]);
      const r = await page.evaluate(() => { const re = /^(Aujourd'hui|Hier|Today|Yesterday|\d{1,2} \p{L}+\.?|\p{L}{3}\.? \d{1,2})$/u; return { days: Q.dayLabels(re), inTime: Q.dayLabels(re, 'time'), names: Q.names().length, now: new Date().toISOString() }; });
      check(`CA-T1 ${ctxName} : séparateurs ${want.join(' / ')}, un par jour, dans l'ordre ; 23:59 et 00:01 = deux groupes (4 groupes en tout)`, JSON.stringify(r.days) === JSON.stringify(want) && r.names === 4, JSON.stringify(r));
      check(`CA-T1 ${ctxName} : chaque séparateur de jour est un <time> (spec 5.4)`, JSON.stringify(r.inTime) === JSON.stringify(want), JSON.stringify(r));
      await page.close();
    });
  }

  // CA-T5 : note interne par classe d'application.
  await withCtx('desk', async (c) => {
    const page = await open(c);
    await put(page, [mk(1), me(2, { s: 2 }), mk(3, { authorId: 'b', authorName: 'Bob', cssClass: 'qa-note', mention: 'Note interne', s: 4 }), me(4, { cssClass: 'qa-note', s: 6 })]);
    const r = await page.evaluate(() => {
      const st = (n) => { const cs = getComputedStyle(Q.bubble(n)); return { bg: cs.backgroundColor, color: cs.color, bs: cs.borderTopStyle, bw: parseFloat(cs.borderTopWidth), bc: cs.borderTopColor }; };
      const exp = { bg: Q.probe('background:var(--lc-sys-color-warning-container)', 'backgroundColor'), color: Q.probe('color:var(--lc-sys-color-on-warning-container)', 'color'), w: Q.px('--lc-sys-border-width-thick'), bc: Q.probe('color:var(--lc-sys-color-warning)', 'color'), other: Q.probe('background:var(--lc-sys-color-secondary-container)', 'backgroundColor'), mine: Q.probe('background:var(--lc-sys-color-primary-container)', 'backgroundColor') };
      const own = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === 'Note interne'); const mention = [...Q.log().querySelectorAll('*')].find(own);
      const text = Q.textRect(Q.bubble(3), 'msg 3')?.node;
      return { s: [1, 2, 3, 4].map(st), exp, mention: !!mention, before: !!(mention && text && (mention.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING)), inBubble: !!mention?.closest('.lc-message-thread__bubble'), mentions: [...Q.log().querySelectorAll('*')].filter(own).length };
    });
    const noteOk = (s) => s.bg === r.exp.bg && s.color === r.exp.color && s.bs === 'dashed' && near(s.bw, r.exp.w, 0.1) && s.bc === r.exp.bc;
    check('CA-T5 la classe d\'application donne fond, couleur et bordure en pointillés à la bulle, du côté des autres comme du mien', noteOk(r.s[2]) && noteOk(r.s[3]), JSON.stringify(r));
    check('CA-T5 les autres bulles ne changent pas (fonds par défaut secondaire / principal, sans bordure)', r.s[0].bg === r.exp.other && r.s[1].bg === r.exp.mine && r.s[0].bs !== 'dashed' && r.s[1].bs !== 'dashed' && r.s[0].bw === 0 && r.s[1].bw === 0, JSON.stringify(r));
    check('CA-T5 mention affichée une fois, avant le texte dans l\'ordre du DOM (lue avant), hors de la bulle', r.mention && r.mentions === 1 && r.before, JSON.stringify({ m: r.mention, b: r.before, n: r.mentions, inB: r.inBubble }));
    await page.close();
  });

  // CA-T7 : message système.
  await withCtx('desk', async (c) => {
    const page = await open(c);
    const SYS = 'Demande qualifiée par Marc';
    await put(page, [mk(1), mk(2, { kind: 'system', authorName: 'Marc', text: SYS, s: 60 }), mk(3, { s: 120 })]);
    const r = await page.evaluate((txt) => {
      const C = Q.content(); const hit = Q.textRect(Q.log(), txt); const tp = hit?.node.parentElement;
      let row = tp; while (row && row !== Q.log() && !row.querySelector('time')) row = row.parentElement;
      let rr = hit?.rect; const tm = row && row !== Q.log() && row.querySelector('time'); if (rr && tm) { const t = Q.R(tm); rr = { left: Math.min(rr.left, t.left), right: Math.max(rr.right, t.right) }; } // ligne = texte · heure
      return { found: !!hit, mid: rr && (rr.left + rr.right) / 2, C: C.mid, color: tp && getComputedStyle(tp).color, sys: Q.probe('color:var(--lc-message-thread-system-color)', 'color'), time: !!(row && row !== Q.log() && row.querySelector('time')), noBdi: !row?.querySelector('bdi'), noAvatar: !row?.querySelector('lc-avatar'), notBubble: !tp?.closest('.lc-message-thread__bubble'), alice: Q.names().filter((x) => x === 'Alice').length, avatars: document.querySelectorAll('lc-avatar').length, marc: Q.names().includes('Marc') };
    }, SYS);
    check('CA-T7 ligne système centrée (± 2 px), hors bulle, couleur system-color', r.found && near(r.mid, r.C, 2) && r.notBubble && r.color === r.sys, JSON.stringify(r));
    check('CA-T7 heure dans <time>, ni nom ni avatar sur la ligne système', r.time && r.noBdi && r.noAvatar && !r.marc, JSON.stringify(r));
    check('CA-T7 le système rompt le groupe : même auteur de part et d\'autre = deux groupes (deux avatars)', r.alice === 2 && r.avatars === 2, JSON.stringify(r));
    await page.close();
  });
}

// ---------- pièces jointes : CA-T6 ----------
async function attach() {
  await withCtx('desk', async (c) => {
    const page = await open(c);
    const info = await page.evaluate(() => ({ blob: URL.createObjectURL(new Blob(['x'], { type: 'image/png' })), origin: location.origin }));
    const ATT = [
      { id: 'none', name: 'sans-apercu.pdf' }, { id: 'js', name: 'js.png', previewUrl: 'javascript:alert(1)' }, { id: 'html', name: 'html.png', previewUrl: 'data:text/html,<b>x</b>' },
      { id: 'other', name: 'autre.png', previewUrl: 'http://evil.test/x.png' }, { id: 'blob', name: 'blob.png', previewUrl: info.blob }, { id: 'png', name: 'png.png', previewUrl: PNG }, { id: 'same', name: 'same.png', previewUrl: `${info.origin}/nope.png` },
    ];
    await put(page, [mk(1, { text: 'msg 1', attachments: ATT }), mk(2, { authorId: 'b', authorName: 'Bob', text: undefined, attachments: [{ id: 'solo', name: 'solo.png', previewUrl: PNG }] })]);
    const r = await page.evaluate(() => {
      const b1 = Q.bubbles()[0], btns = [...b1.querySelectorAll('button')];
      const img = (i) => btns[i]?.querySelector('img');
      const b2 = Q.bubbles()[1];
      const empties = [...b2.querySelectorAll('*')].filter((e) => !e.closest('button') && !['IMG', 'svg', 'path', 'LC-ICON'].includes(e.tagName) && e.children.length === 0 && e.textContent.trim() === '');
      return { btns: btns.length, names: btns.map((b) => b.getAttribute('aria-label') ?? b.textContent.trim()), imgs: btns.map((_, i) => img(i)?.getAttribute('src') ?? null), size: btns.map((b) => [Q.R(b).width, Q.R(b).height]), attrs: btns.map((_, i) => img(i) ? ['width', 'height', 'alt'].filter((a) => !img(i).hasAttribute(a)).join('+') || true : true), allImgs: [...document.querySelectorAll('img')].map((i) => i.getAttribute('src')), empties: empties.length, b2buttons: b2.querySelectorAll('button').length, b2text: b2.textContent.trim() };
    });
    const ids = ['none', 'js', 'html', 'other', 'blob', 'png', 'same'];
    check('CA-T6 une vignette <button> par pièce jointe, nom accessible contenant le nom du fichier', r.btns === 7 && ids.every((_, i) => r.names[i].includes(['sans-apercu.pdf', 'js.png', 'html.png', 'autre.png', 'blob.png', 'png.png', 'same.png'][i])), JSON.stringify(r.names));
    check('CA-T6 aperçu absent, javascript:, data:text/html, http(s) d\'une autre origine → icône, jamais d\'<img> avec cette src', [0, 1, 2, 3].every((i) => r.imgs[i] === null) && !r.allImgs.some((s) => /^javascript:|text\/html|evil\.test/i.test(s ?? '')), JSON.stringify(r.imgs));
    check('CA-T6 blob:, data:image/png, même origine → <img> (width, height, alt présents)', r.imgs[4]?.startsWith('blob:') && r.imgs[5] === PNG && r.imgs[6]?.startsWith(info.origin) && r.attrs.every((a) => a === true), JSON.stringify({ imgs: r.imgs, attrs: r.attrs }));
    check('CA-T6 cible tactile des vignettes ≥ 44 px', r.size.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(r.size));
    check('CA-T6 message sans texte : bulle de vignettes, aucune zone de texte vide', r.b2buttons === 1 && r.empties === 0 && r.b2text.length <= 40, JSON.stringify({ e: r.empties, t: r.b2text }));
    // Clavier et souris : une seule émission par geste.
    const btn = (id) => page.locator('.lc-message-thread__bubble button').nth(id);
    await page.evaluate(() => { window.__qa.events.length = 0; });
    await btn(5).click(); const e1 = (await events(page)).filter((e) => e.type === 'attachmentOpen');
    await btn(4).focus(); await page.keyboard.press('Enter'); const e2 = (await events(page)).filter((e) => e.type === 'attachmentOpen');
    await btn(6).focus(); await page.keyboard.press('Space'); const e3 = (await events(page)).filter((e) => e.type === 'attachmentOpen');
    check('CA-T6 clic, Entrée, Espace : attachmentOpen émis une fois chacun, avec message et pièce jointe', e1.length === 1 && e2.length === 2 && e3.length === 3 && JSON.stringify(e3.map((e) => e.detail)) === JSON.stringify([{ messageId: 'm1', attachmentId: 'png' }, { messageId: 'm1', attachmentId: 'blob' }, { messageId: 'm1', attachmentId: 'same' }]), JSON.stringify(e3));
    check('CA-T6 aucune erreur de page', page.errors.length === 0, page.errors.join(' | '));
    await page.close();
  });
}

// ---------- texte : CA-T8 T15 T16 T17 ----------
async function text() {
  await withCtx('desk', async (c) => {
    const page = await open(c);
    await put(page, [mk(1, { text: 'Voir https://x.test/a. Merci\nligne 2 javascript:alert(1) <b>x</b> & "q" et http://y.test/p?a=1&b=2, fin (https://z.test/w) www.example.com' })]);
    const r = await page.evaluate(() => {
      const b = Q.bubbles()[0], as = [...b.querySelectorAll('a')];
      const l1 = Q.textRect(b, 'Voir'), l2 = Q.textRect(b, 'ligne 2');
      return { as: as.map((a) => [a.textContent, a.getAttribute('href'), a.target, a.rel]), after: (() => { let n = as[0]?.nextSibling; while (n && n.nodeType !== 3) n = n.nextSibling; return n?.textContent.slice(0, 7); })(), bold: !!b.querySelector('b'), text: b.textContent, lineBreak: l1 && l2 && l2.rect.top - l1.rect.top > 5, anyJs: [...document.querySelectorAll('a')].some((a) => !/^https?:/.test(a.href)) };
    });
    check('CA-T8 trois adresses http(s) sont des <a target="_blank" rel="noopener noreferrer"> sans ponctuation finale', JSON.stringify(r.as.map((x) => x[0])) === '["https://x.test/a","http://y.test/p?a=1&b=2","https://z.test/w"]' && r.as.every((x) => x[2] === '_blank' && /\bnoopener\b/.test(x[3]) && /\bnoreferrer\b/.test(x[3]) && /^https?:\/\//.test(x[1])), JSON.stringify(r.as));
    check('CA-T8 le point final reste du texte après le lien', r.after === '. Merci', String(r.after));
    check('CA-T8/T15 javascript:, www., <b>, &, guillemets restent du texte littéral, aucun élément <b>, aucun <a> non http(s)', !r.bold && !r.anyJs && ['javascript:alert(1)', '<b>x</b>', '& "q"', 'www.example.com'].every((s) => r.text.includes(s)), JSON.stringify({ b: r.bold, js: r.anyJs }));
    check('CA-T8 retour à la ligne conservé (la deuxième ligne est plus bas)', r.lineBreak, JSON.stringify(r.lineBreak));
    await page.close();
  });

  await withCtx('phone', async (c) => {
    const page = await open(c);
    await put(page, [mk(1, { text: `https://x.test/${'a'.repeat(200_000)}` }), mk(2, { authorId: 'b', authorName: 'Bob', text: `${'x'.repeat(3000)}` }), mk(3, { authorId: 'c', authorName: 'Cy', text: '😀'.repeat(60), attachments: Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, name: `fichier-avec-un-nom-assez-long-${i}.png`, previewUrl: PNG })) })]);
    const r = await page.evaluate(() => { const l = Q.log(); return { logScroll: l.scrollWidth - l.clientWidth, doc: document.documentElement.scrollWidth - innerWidth, bubbles: Q.bubbles().map((b) => b.scrollWidth - b.clientWidth), link: Q.bubbles()[0]?.querySelectorAll('a').length, thumbs: Q.bubbles()[2]?.querySelectorAll('button').length }; });
    check('CA-T15/T17 adresse de 200 000 caractères, mot de 3 000, 12 pièces jointes à 360 px : aucun défilement horizontal, aucune bulle qui déborde', r.logScroll <= 1 && r.doc <= 0 && r.bubbles.every((x) => x <= 1) && r.link === 1 && r.thumbs === 12, JSON.stringify(r));
    await page.close();
  });

  await withCtx('desk', async (c) => {
    const page = await open(c);
    const UNSAFE = '[\\u0000-\\u0009\\u000B-\\u001F\\u007F-\\u009F\\u061C\\u200B-\\u200F\\u2028-\\u202E\\u2060\\u2066-\\u2069\\uFEFF]';
    await put(page, [mk(1, { authorName: 'Al\u202Eice\u0007 Dupontsecret', text: 'Bon\u202Ejour\u0000secret\nsuite\u200F' }), mk(2, { authorId: 'b', authorName: 'محمد علي', text: 'مرحبا' }), mk(3, { authorId: 'c', authorName: '𝒜lice 𝒝ob', text: 'astral' }), mk(4, { authorId: 'd', authorName: '', text: 'sans nom' }), mk(5, { authorId: 'e', authorName: 'Eve', text: 'latin' })]);
    const r = await page.evaluate((U) => {
      const re = new RegExp(U); const l = Q.log();
      const attrs = [...l.querySelectorAll('*')].flatMap((e) => [...e.attributes].map((a) => a.value)).concat([l.innerHTML]);
      const av = [...document.querySelectorAll('lc-avatar')].map((a) => a.textContent.trim());
      const header = (name) => { const bdi = [...l.querySelectorAll('bdi')].find((x) => x.textContent.includes(name)); if (!bdi) return null; const t = [...l.querySelectorAll('time')].find((x) => (bdi.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING) && !x.closest('.lc-message-thread__bubble')); return t ? Q.R(t).left - Q.R(bdi).right : null; };
      return { unsafe: attrs.some((v) => re.test(v)), bdi: [...l.querySelectorAll('bdi')].map((b) => b.textContent), b1: Q.bubbles()[0]?.textContent, av, lone: av.some((a) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(a)), gapAr: header('محمد'), gapLa: header('Eve'), nb: Q.bubbles().length };
    }, UNSAFE);
    check('CA-T16 aucun caractère de contrôle ni bidi dans le DOM, les attributs (aria-label, title…) ; nom nettoyé dans <bdi>', !r.unsafe && r.bdi.includes('Alice Dupontsecret'), JSON.stringify({ u: r.unsafe, bdi: r.bdi }));
    check('CA-T16 texte nettoyé mais retour à la ligne conservé', /Bonjoursecret\s*suite/.test(r.b1 ?? '') && (r.b1 ?? '').includes('\n'), JSON.stringify(r.b1));
    check('CA-T16 un nom en arabe ne déplace pas l\'heure (écart nom → heure identique à un nom latin, ± 1 px, heure après le nom)', r.gapAr !== null && r.gapLa !== null && near(r.gapAr, r.gapLa, 1) && r.gapAr >= -0.5, JSON.stringify({ ar: r.gapAr, la: r.gapLa }));
    check('CA-T16 initiales sans couper un point de code ; nom vide : bulle rendue sans erreur', !r.lone && r.av.every((a) => Array.from(a).length <= 2) && r.nb === 5 && page.errors.length === 0, JSON.stringify({ av: r.av, nb: r.nb, e: page.errors }));
    check('CA-T16 aucun nom ni texte de message dans la console', !page.logs.some((l) => /secret|Dupont|محمد/.test(l)), page.logs.join(' | '));
    const perf = await page.evaluate(async () => { const t = performance.now(); window.__thread.set([{ id: 'big', authorId: 'a', authorName: 'Alice', mine: false, sentAt: '2026-11-21T09:00:00Z', text: 'mot '.repeat(25_000) }]); await Q.until(() => Q.bubbles().length === 1); Q.log().offsetHeight; return performance.now() - t; });
    check('CA-T16 texte de 100 000 caractères rendu en < 200 ms', perf < 200, `${perf.toFixed(0)} ms`);
    // CA-T17 : liste vide, groupe d'un message.
    await put(page, []);
    check('CA-T17 liste vide : aucune bulle, role="log" présent', await page.evaluate(() => Q.bubbles().length === 0 && !!Q.log()));
    await put(page, [mk(1)]);
    check('CA-T17 groupe d\'un message : en-tête (nom) et avatar sur cette bulle', await page.evaluate(() => Q.names().length === 1 && document.querySelectorAll('lc-avatar').length === 1 && Math.abs(Q.R(document.querySelector('lc-avatar')).bottom - Q.R(Q.bubble(1)).bottom) <= 2));
    await put(page, [mk(1, { sentAt: 'pas une date' })]);
    check('CA-T17 sentAt invalide : bulle rendue sans <time> propre, aucune erreur de page', await page.evaluate(() => Q.bubbles().length === 1 && Q.log().querySelectorAll('time').length === 0) && page.errors.length === 0);
    await put(page, [mk(1, { text: 'premier' }), mk(1, { text: 'second' })]);
    check('CA-T17 id en double : le premier est rendu', await page.evaluate(() => Q.bubbles().length === 1 && /premier/.test(Q.bubbles()[0].textContent) && !/second/.test(document.body.textContent)));
    await put(page, [mk(1, { text: undefined }), mk(2, { text: '   ', authorId: 'b' })]);
    check('CA-T17 message sans texte ni pièce jointe : aucune bulle vide', await page.evaluate(() => Q.bubbles().length === 0));
    await page.close();
  });
}

// ---------- mouvement : CA-T3 T4 T13 ----------
const FIVE = [alt(1), alt(2), alt(3), alt(4), me(5, { s: 5, text: 'msg 5 — ' + 'texte assez long pour occuper de la place dans la bulle, '.repeat(2) })].map((m) => ({ ...m, text: m.text.startsWith('msg') ? m.text : `${m.text}` }));
const long = (m) => ({ ...m, text: `${m.text} — ${'texte assez long pour occuper de la place dans la bulle, '.repeat(2)}` });
async function motion() {
  await withCtx('desk', async (c) => {
    const page = await open(c);
    await patch(page, { height: 300 });
    await put(page, FIVE.map(long));
    // CA-T3 : arrivées d'un message, de trois consécutifs du même côté, puis d'un message de l'autre côté.
    const arrive = (add) => page.evaluate(async ({ add }) => {
      await Q.settle();
      const log = Q.log(); log.scrollTop = log.scrollHeight; await Q.raf();
      const prev = Q.nums(); const before = Object.fromEntries(prev.map((n) => [n, Q.R(Q.bubble(n)).bottom])); const lastPrev = prev.at(-1);
      const overflow = log.scrollHeight - log.clientHeight;
      window.__thread.add(add);
      const rendered = await Q.until(() => Q.bubbles().length === prev.length + add.length);
      Q.pauseAll(0);
      const news = add.map((m) => Q.numOf({ textContent: m.text }));
      const R = Q.R; const tok = { scale: Q.num('--lc-message-thread-enter-scale'), dur: Q.ms('--lc-message-thread-enter-duration') };
      const moved = prev.filter((n) => Math.abs(R(Q.bubble(n)).bottom - before[n]) > 1).map((n) => [n, R(Q.bubble(n)).bottom - before[n]]);
      const hole = R(Q.bubble(news[0])).top - R(Q.bubble(lastPrev)).bottom;
      const per = news.map((n, i) => {
        const b = Q.bubble(n), e = Q.enter(b); if (!e) return { n, enter: false };
        const cs = getComputedStyle(e.el); const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
        const out = { n, enter: true, scale0: parseFloat(cs.scale), fill: e.t.fill, delay: e.t.delay, ox, oy, w: e.el.offsetWidth, h: e.el.offsetHeight, prog: [] };
        for (const f of [0.15, 0.3, 0.5, 0.8]) { e.a.currentTime = e.t.delay + f * e.t.duration; out.prog.push([f, (parseFloat(getComputedStyle(e.el).scale) - tok.scale) / (1 - tok.scale), Q.progressAt(f)]); }
        e.a.currentTime = 0;
        return out;
      });
      return { rendered, overflow, moved, hole, per, tok, scaleErr: per.map((p) => p.enter && Math.abs(p.scale0 - tok.scale)) };
    }, { add });
    const after = (nums) => page.evaluate(async (nums) => {
      await Q.settle(); const log = Q.log(); const pos = () => Object.fromEntries(Q.nums().map((n) => [n, Q.R(Q.bubble(n)).top - Q.R(log).top + log.scrollTop]));
      const a = Q.anims().length, p1 = pos(); window.__thread.remount(); await new Promise((r) => setTimeout(r, 300)); await Q.until(() => !!Q.log() && Q.bubbles().length === nums.length, 3000); await Q.raf(); await Q.raf(); const p2 = pos();
      return { anims: a, diff: Object.keys(p1).filter((k) => !(k in p2) || Math.abs(p1[k] - p2[k]) > 1) };
    }, nums);
    const steps = [['1 message (moi)', [long(me(6, { s: 6 }))], true], ['3 messages consécutifs (moi)', [long(me(7, { s: 7 })), long(me(8, { s: 8 })), long(me(9, { s: 9 }))], true], ['1 message de l\'autre côté', [long(mk(10, { authorId: 'b', authorName: 'Bob', s: 10 }))], false]];
    for (const [label, add, mine] of steps) {
      const r = await arrive(add);
      const tag = `CA-T3 ${label}`;
      check(`${tag} : précondition (conteneur limité qui défile, tous rendus)`, r.rendered && r.overflow > 40, JSON.stringify({ rendered: r.rendered, overflow: r.overflow }));
      check(`${tag} (a) à t = 0 le bas de chaque bulle déjà affichée est à ± 1 px de sa position d'avant`, r.moved.length === 0, JSON.stringify(r.moved));
      check(`${tag} (b) aucun trou entre la dernière bulle précédente et le premier nouveau message (écart positif ≤ 1 px)`, r.hole <= 1, `écart ${r.hole}`);
      check(`${tag} (c) chaque nouvelle bulle part de enter-scale (animation à fill backwards ou sans délai)`, r.per.every((p) => p.enter && Math.abs(p.scale0 - r.tok.scale) <= 0.01), JSON.stringify(r.per.map((p) => [p.n, p.enter, p.scale0, p.fill, p.delay])));
      check(`${tag} (c) accélération du jeton enter-easing (progression mesurée = progression du jeton, ± 0,03, à 15, 30, 50, 80 % de la durée)`, r.per.every((p) => p.enter && p.prog.every(([, got, want]) => Math.abs(got - want) <= 0.03)), JSON.stringify(r.per.map((p) => p.prog)));
      check(`${tag} (d) transform-origin au coin extérieur côté auteur (${mine ? 'bas droite' : 'bas gauche'})`, r.per.every((p) => p.enter && Math.abs(p.ox - (mine ? p.w : 0)) <= 1 && Math.abs(p.oy - p.h) <= 1), JSON.stringify(r.per.map((p) => [p.ox, p.oy, p.w, p.h])));
      await page.evaluate(() => { document.getAnimations().forEach((a) => a.play()); });
      const nums = await page.evaluate(() => Q.nums());
      const f = await after(nums);
      check(`${tag} : après finished, aucune animation et positions identiques à un rendu direct (remontage)`, f.anims === 0 && f.diff.length === 0, JSON.stringify(f));
    }
    check('CA-T3 aucune erreur de page ni de console', page.errors.length === 0 && !page.logs.some((l) => l.startsWith('error')), [...page.errors, ...page.logs.filter((l) => l.startsWith('error'))].join(' | '));
    await page.close();
  });

  // CA-T4 : aucune animation au premier rendu, au remplacement, et sous réduction des animations.
  await withCtx('desk', async (c) => {
    const page = await open(c);
    const probe = (list, expectN) => page.evaluate(async ({ list, expectN }) => { window.__thread.set(list); await Q.until(() => Q.bubbles().length === expectN); const now = Q.anims().length; await Q.raf(); await Q.raf(); return { now, later: Q.anims().length, n: Q.bubbles().length }; }, { list, expectN });
    await put(page, []);
    const first = await probe([alt(1), alt(2), alt(3), alt(4), alt(5), alt(6)], 6);
    check('CA-T4 premier rendu (liste vide puis remplie) : aucune animation, immédiatement et après deux images', first.n === 6 && first.now === 0 && first.later === 0, JSON.stringify(first));
    const same = await probe([alt(1), alt(2), alt(3), alt(4), alt(5), alt(6)].map((m) => ({ ...m })), 6);
    check('CA-T4 remplacement de la liste sans id nouveau : aucune animation', same.now === 0 && same.later === 0, JSON.stringify(same));
    await page.close();
  });
  await withCtx('deskReduced', async (c) => {
    const page = await open(c);
    await patch(page, { height: 300 }); await put(page, FIVE.map(long));
    const r = await page.evaluate(async (add) => {
      const old = Q.bubbles(); window.__thread.add(add); await Q.until(() => Q.bubbles().length === old.length + 1);
      const all = Q.anims().map((a) => ({ props: (a.effect.getKeyframes?.() ?? []).flatMap((k) => Object.keys(k)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).concat(a.transitionProperty ? [a.transitionProperty] : []), dur: a.effect.getComputedTiming().duration, target: a.effect.target }));
      const nb = Q.bubble(6);
      return { all: all.map((x) => [x.props, x.dur]), motionProps: all.filter((x) => x.props.some((p) => /transform|translate|scale|rotate/.test(p))).length, fade: all.some((x) => x.props.includes('opacity') && (x.target === nb || x.target.contains(nb) || nb.contains(x.target)) && x.dur > 1), onOld: all.filter((x) => x.dur > 1 && old.some((o) => x.target === o || o.contains(x.target) || x.target.contains(o))).length };
    }, [long(me(6, { s: 6 }))]);
    check('CA-T4 réduction des animations : l\'arrivée ne joue que l\'opacité (aucune animation de transform, translate ou scale), le fondu survit', r.motionProps === 0 && r.fade, JSON.stringify(r));
    check('CA-T4 réduction des animations : les messages précédents ne sont pas animés', r.onOld === 0, JSON.stringify(r));
    await page.close();
  });

  // CA-T13 : arrivées pendant une animation, lot, retrait pendant l'entrée.
  await withCtx('desk', async (c) => {
    const page = await open(c);
    await patch(page, { height: 300 }); await put(page, FIVE.map(long));
    const r = await page.evaluate(async ({ m6, m7 }) => {
      const log = Q.log(); log.scrollTop = log.scrollHeight; await Q.raf();
      window.__thread.add([m6]); await Q.until(() => Q.bubbles().length === 6);
      await new Promise((r) => setTimeout(r, 100));
      const A = Q.enter(Q.bubble(6)); const same = A?.a;
      document.getAnimations().forEach((a) => a.pause()); await Promise.all(document.getAnimations().map((a) => a.ready));
      const ct = same?.currentTime; const before = Object.fromEntries(Q.nums().map((n) => [n, Q.R(Q.bubble(n)).bottom]));
      const known = new Set(document.getAnimations());
      window.__thread.add([m7]); await Q.until(() => Q.bubbles().length === 7);
      document.getAnimations().filter((a) => !known.has(a)).forEach((a) => { a.pause(); a.currentTime = 0; });
      const B = Q.enter(Q.bubble(6));
      const jumps = Object.keys(before).filter((n) => Math.abs(Q.R(Q.bubble(n)).bottom - before[n]) > 1).map((n) => [n, Q.R(Q.bubble(n)).bottom - before[n]]);
      const hole = Q.R(Q.bubble(7)).top - Q.R(Q.bubble(6)).bottom;
      const out = { still: !!same && B?.a === same && same.playState !== 'idle' && Math.abs(same.currentTime - ct) < 1, jumps, hole, ct, now: same?.currentTime };
      document.getAnimations().forEach((a) => a.play()); await Q.settle();
      return out;
    }, { m6: long(me(6, { s: 6 })), m7: long(me(7, { s: 7 })) });
    check('CA-T13 un second message 100 ms après le premier ne relance pas l\'entrée du premier (même animation, même avancement)', r.still, JSON.stringify(r));
    check('CA-T13 ni saut (± 1 px) des bulles déjà affichées, ni trou positif > 1 px à l\'arrivée du second', r.jumps.length === 0 && r.hole <= 1, JSON.stringify(r));

    const batch = (n) => page.evaluate(async (add) => {
      await Q.settle(); const prev = Q.bubbles().length; window.__thread.add(add); await Q.until(() => Q.bubbles().length === prev + add.length);
      const delays = add.map((m) => Q.enter(Q.bubble(Q.numOf({ textContent: m.text })))?.t.delay);
      const stagger = Q.ms('--lc-message-thread-enter-stagger'); await Q.settle();
      return { delays, stagger, after: Q.anims().length };
    }, Array.from({ length: n }, (_, i) => long(me(100 + n * 10 + i, { s: 100 + n * 10 + i }))));
    const b5 = await batch(5);
    check('CA-T13 lot de 5 : cinq entrées décalées de enter-stagger (± 1 ms), 300 ms au plus au total', b5.delays.every((d) => typeof d === 'number') && b5.delays.every((d, i) => i === 0 ? d >= 0 && d <= 1 : Math.abs(d - b5.delays[i - 1] - b5.stagger) <= 1) && b5.delays.at(-1) <= 300 && b5.after === 0, JSON.stringify(b5));
    const b12 = await batch(12);
    check('CA-T13 lot de 12 : décalage plafonné à 300 ms, croissant', b12.delays.every((d) => typeof d === 'number') && Math.max(...b12.delays) <= 300 && b12.delays.every((d, i) => i === 0 || d >= b12.delays[i - 1]), JSON.stringify(b12.delays));
    const rm = await page.evaluate(async (m) => {
      await Q.settle(); const keep = Q.nums(); window.__thread.add([m]); await Q.until(() => !!Q.bubble(900)); await new Promise((r) => setTimeout(r, 100)); window.__thread.remove('m900'); await Q.raf(); await Q.settle();
      return { gone: !Q.bubble(900), anims: Q.anims().length, kept: JSON.stringify(keep) === JSON.stringify(Q.nums()) };
    }, long(me(900, { s: 900 })));
    check('CA-T13 message retiré pendant son entrée : ni élément ni animation restants, les autres intacts', rm.gone && rm.anims === 0 && rm.kept, JSON.stringify(rm));
    check('CA-T13 aucune erreur de page ni de console', page.errors.length === 0 && !page.logs.some((l) => l.startsWith('error')), [...page.errors, ...page.logs.filter((l) => l.startsWith('error'))].join(' | '));
    await page.close();
  });
}

// ---------- défilement : CA-T9 T10 ----------
async function scroll() {
  const LONG = Array.from({ length: 40 }, (_, i) => alt(i + 1, { text: `msg ${i + 1} ${'texte '.repeat(8)}` }));
  for (const name of ['phone', 'desk']) await withCtx(name, async (c) => {
    const page = await open(c); const V = name === 'phone' ? '360 × 640' : '1 280 × 800';
    await patch(page, { height: 400 }); await put(page, LONG);
    const geo = () => page.evaluate(() => { const box = Q.R(document.querySelector('#qa-box')), host = document.querySelector('lc-message-thread'), log = Q.log(), comp = document.querySelector('lc-message-composer'); return { boxH: box.height, hostH: Q.R(host).height, boxBottom: box.bottom, overflowY: getComputedStyle(log).overflowY, scrolls: log.scrollHeight > log.clientHeight + 20, pageScrolls: document.documentElement.scrollHeight > innerHeight + 1, hScroll: document.documentElement.scrollWidth > innerWidth, tab: log.getAttribute('tabindex'), compBottom: comp && Q.R(comp).bottom, compTop: comp && Q.R(comp).top, logBottom: Q.R(log).bottom, compVisible: comp && Q.R(comp).top >= 0 && Q.R(comp).bottom <= innerHeight, ownScroll: log.scrollHeight - log.clientHeight }; });
    let g = await geo();
    check(`CA-T9 ${V} parent limité : le fil remplit son conteneur et défile à l'intérieur, la page ne défile pas, tabindex="0"`, near(g.hostH, g.boxH, 1) && g.scrolls && /auto|scroll/.test(g.overflowY) && !g.pageScrolls && !g.hScroll && g.tab === '0', JSON.stringify(g));
    check(`CA-T9 ${V} la saisie projetée reste visible, en bas du conteneur, sous le fil, même défilé`, g.compVisible && g.compBottom <= g.boxBottom + 1 && g.compBottom >= g.boxBottom - 32 && g.compTop >= g.logBottom - 1, JSON.stringify(g));
    await page.evaluate(() => { Q.log().scrollTop = 120; }); const g2 = await geo();
    check(`CA-T9 ${V} la saisie ne bouge pas quand le fil défile`, near(g2.compTop, g.compTop, 1), `${g.compTop} → ${g2.compTop}`);
    await patch(page, { height: null });
    const un = await page.evaluate(async () => { const ok = await Q.until(() => Q.log().scrollHeight <= Q.log().clientHeight + 1, 2000); const l = Q.log(); return { ok, tab: l.getAttribute('tabindex'), pageScrolls: document.documentElement.scrollHeight > innerHeight + 1, own: l.scrollHeight - l.clientHeight }; });
    check(`CA-T9 ${V} parent sans hauteur : pas de défilement propre, la page s'allonge, tabindex absent`, un.ok && un.pageScrolls && un.tab !== '0', JSON.stringify(un));
    await patch(page, { height: 300 });
    const back = await page.evaluate(async () => { const ok = await Q.until(() => Q.log().scrollHeight > Q.log().clientHeight + 20, 2000); return { ok, tab: Q.log().getAttribute('tabindex'), pageScrolls: document.documentElement.scrollHeight > innerHeight + 1 }; });
    check(`CA-T9 ${V} un changement de hauteur du parent est pris en compte (limité de nouveau : défile, tabindex="0")`, back.ok && back.tab === '0' && !back.pageScrolls, JSON.stringify(back));
    await patch(page, { composer: false, height: 400 }); await page.evaluate(() => Q.settle());
    const nc = await geo();
    check(`CA-T9 ${V} sans projection : aucune erreur, le fil remplit toujours son conteneur`, page.errors.length === 0 && near(nc.hostH, nc.boxH, 1) && nc.scrolls, JSON.stringify({ e: page.errors, nc }));
    await page.close();
  });
  await withCtx('desk', async (c) => { // CA-T19 : valeurs par défaut sûres, 30 rendus
    const page = await open(c, BARE); await put(page, Array.from({ length: 100 }, (_, i) => alt(i + 1)));
    const n = await page.evaluate(() => ({ n: Q.bubbles().length, role: Q.log()?.getAttribute('aria-label') }));
    check('CA-T19 <lc-message-thread [messages] /> seul : fil nommé, 30 messages rendus par défaut, sans erreur', n.n === 30 && !!n.role && page.errors.length === 0, JSON.stringify({ ...n, e: page.errors }));
    await page.close();
  });
  await t10('Chromium');
}

// CA-T10 : paliers 30, 60, 90, 100, position conservée, pageSize invalide ; défilement interne puis de page.
async function t10(engine) {
  const L100 = Array.from({ length: 100 }, (_, i) => alt(i + 1));
  for (const mode of ['interne', 'de page']) {
    const c = await browser.newContext(DESK);
    try {
      const page = await open(c);
      await patch(page, mode === 'interne' ? { height: 400, pageSize: 30 } : { height: null, spacer: 1500, pageSize: 30 });
      await put(page, L100);
      const first = await page.evaluate(() => ({ n: Q.nums() }));
      check(`CA-T10 ${engine} (${mode}) : 30 messages rendus, les derniers (71 à 100)`, first.n.length === 30 && first.n[0] === 71 && first.n.at(-1) === 100, JSON.stringify(first.n));
      let ok = true; const log = [];
      for (const target of [60, 90, 100]) {
        const r = await page.evaluate(async ({ mode, target }) => {
          const wit = Q.nums()[0]; const topOf = () => Q.R(Q.bubble(wit)).top;
          if (mode === 'interne') Q.log().scrollTop = 0; else window.scrollTo(0, Q.R(Q.log()).top + scrollY);
          const t0 = topOf();
          const reached = await Q.until(() => Q.bubbles().length === target, 4000);
          const anims = Q.anims().length; await Q.raf(); await Q.raf();
          return { wit, drift: topOf() - t0, reached, n: Q.bubbles().length, anims, busy: Q.log().getAttribute('aria-busy') };
        }, { mode, target });
        log.push(r); if (!r.reached || Math.abs(r.drift) > 2 || r.anims !== 0 || r.busy === 'true') ok = false;
      }
      check(`CA-T10 ${engine} (${mode}) : paliers 60, 90, 100 ; le message témoin garde sa position (± 2 px) après deux images ; aucune animation ; aria-busy retiré`, ok, JSON.stringify(log));
      const more = await page.evaluate(async (mode) => { if (mode === 'interne') Q.log().scrollTop = 0; else window.scrollTo(0, Q.R(Q.log()).top + scrollY); await new Promise((r) => setTimeout(r, 600)); return Q.bubbles().length; }, mode);
      check(`CA-T10 ${engine} (${mode}) : plus de palier après 100`, more === 100, String(more));
      if (mode === 'interne') for (const v of [0, -3, 2.5, NaN]) {
        await put(page, []); await patch(page, { pageSize: v }); await put(page, L100);
        const n = await page.evaluate(() => Q.bubbles().length);
        check(`CA-T10 ${engine} pageSize = ${v} → 30`, n === 30, String(n));
      }
      await page.close();
    } catch (e) { check(`CA-T10 ${engine} (${mode}) : exception`, false, String(e.message).split('\n')[0]); } finally { await c.close(); }
  }
}

// ---------- axe : CA-T11 ----------
async function axe() {
  const TWELVE = [mk(1), mk(2, { text: 'Voir https://x.test/a. Merci' }), me(3, { s: 60 }), mk(4, { kind: 'system', authorName: 'Marc', text: 'Demande qualifiée par Marc', s: 100 }), alt(5, { s: 120, attachments: [{ id: 'p', name: 'photo.png', previewUrl: PNG }, { id: 'd', name: 'doc.pdf' }] }), me(6, { s: 130, text: undefined, attachments: [{ id: 'q', name: 'seule.png', previewUrl: PNG }] }), mk(7, { authorId: 'b', authorName: 'Bob', cssClass: 'qa-note', mention: 'Note interne', s: 140 }), me(8, { s: 700 }), alt(9, { s: 710 }), alt(10, { s: 720 }), me(11, { s: 730 }), mk(12, { s: 740 })];
  for (const [w, h] of [[360, 640], [1280, 800]]) for (const theme of ['default', 'dark']) {
    const c = await browser.newContext({ viewport: { width: w, height: h } });
    try {
      const page = await open(c, ACC, { theme }); await patch(page, { height: null }); await put(page, TWELVE); await page.waitForTimeout(300);
      await page.addScriptTag({ content: axeSource });
      const res = await page.evaluate(async () => { const run = await window.axe.run(document.querySelector('#storybook-root'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] }, resultTypes: ['violations'] }); const l = Q.log(); return { v: run.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, t: x.nodes[0]?.target?.join(' ') })), role: l?.getAttribute('role'), name: (l?.getAttribute('aria-label') ?? l?.getAttribute('aria-labelledby') ?? '').trim(), scroll: document.documentElement.scrollWidth <= innerWidth, n: Q.bubbles().length }; });
      check(`CA-T11 axe ${w} px ${theme.padEnd(7)} : aucune violation, role="log" nommé, aucune erreur`, res.v.length === 0 && res.role === 'log' && res.name.length > 0 && res.scroll && res.n >= 9 && page.errors.length === 0, JSON.stringify({ ...res, errors: page.errors }));
    } catch (e) { check(`CA-T11 axe ${w} px ${theme} : exception`, false, String(e.message).split('\n')[0]); } finally { await c.close(); }
  }
}

// ---------- WebKit et Firefox : CA-T10 ----------
async function engines() {
  const chromium = browser;
  for (const name of ['webkit', 'firefox']) {
    let b;
    try { b = await pw[name].launch(); } catch (e) { console.log(`INFO ${name} indisponible dans cet environnement (${String(e.message).split('\n')[0]}) : CA-T10 NON PROUVÉ sous ce moteur`); continue; }
    browser = b;
    try { await t10(name); } catch (e) { check(`CA-T10 ${name} : exception`, false, String(e.message).split('\n')[0]); } finally { browser = chromium; await b.close(); }
  }
}

try {
  const modes = { layout, attach, text, motion, scroll, axe, engines };
  const [mode = 'all'] = process.argv.slice(2);
  for (const m of mode === 'all' ? Object.keys(modes) : [mode]) { if (!modes[m]) { console.error(`Usage : message-thread-browser.mjs ${Object.keys(modes).join('|')}|all`); failures += 1; break; } console.log(`# ${m}`); try { await modes[m](); } catch (e) { failures += 1; console.log(`KO  ${m} : exception ${String(e.message).split('\n')[0]}`); } }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} échec(s)` : 'tout est vert');
process.exit(failures > 0 ? 1 : 0);
