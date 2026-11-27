// Acceptation navigateur de docs/specs/2026-11-messagerie.md, PR 1 (lc-message-composer ; Chromium, Storybook statique dist/storybook ; STORYBOOK_DIR pour une autre construction).
//   node tools/qa/message-composer-browser.mjs behaviour|files|style|axe|csp|all
//   behaviour : CA-C1 C2 C3 C4 C9 C11 C13 C16 · files : C5 C6 C7 C8 C15 C17 C18 S1 S2 S3 S4 S6 · style : C10 (+ réduction, forced-colors) · axe : C12 · csp : S5
// Story : QA/Forms/Message composer (Acceptance, Bare) ; état piloté par window.__composer, événements lus dans window.__qa.events.
// Écrit AVANT le code (M0) : rouge attendu tant que lc-message-composer manque (en attente du code). Code de sortie 1 au moindre échec.
// Limites : un dossier est simulé par un fichier de 0 octet (le navigateur n'en fournit pas d'autre au glisser synthétique) ; le geste tactile réel n'est pas essayé.
// CSP (CA-S5) : l'en-tête CSP de la spec est servi avec toutes les réponses (mode csp). Storybook et Angular violent eux-mêmes cette CSP (scripts et styles
//   en ligne, eval ; script-src est donc élargi à 'unsafe-inline' 'unsafe-eval', seule différence avec la CSP de la spec) : ces violations sont mesurées une fois l'histoire affichée (référence), et seules les violations NOUVELLES pendant les gestes du composant,
//   ou toute violation d'image, de réseau ou portant sur un élément du composant (attribut style en ligne compris), comptent.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calm } from './wait.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const CSP = "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'"; // script-src élargi : Storybook compile ses histoires (eval) et ouvre ses pages par des scripts en ligne ; le reste est celui de la spec
let csp = false;
const server = await new Promise((ok) => { const s = createServer(async (rq, rs) => { try { const f = path.join(dir, path.normalize(decodeURIComponent(new URL(rq.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')); const body = await readFile(f); rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', ...(csp ? { 'content-security-policy': CSP } : {}) }).end(body); } catch { rs.writeHead(404).end(); } }); s.listen(0, '127.0.0.1', () => ok(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${name}${ok ? '' : ` : ${detail}`}`); };
/** Rendu fait et transitions finies (aucune minuterie dans le composant : les anciennes pauses fixes n'attendaient que cela). */
const rest = (page) => calm(page, 100).then((ok) => ok || check('animations finies encore en cours après 15 s', false));
const near = (a, b, eps = 1) => Math.abs(a - b) <= eps;

const STORY = 'qa-forms-message-composer--acceptance';
const BARE = 'qa-forms-message-composer--bare';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const SEND_PATH = 'M14.536 21.686'; // tracé de l'icône `send` du kit (default-icons.ts)
const item = (id, name, status = 'done', extra = {}) => ({ id, name, size: 2048, status, ...extra });
const PHONE = { viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true };
const DESK = { viewport: { width: 1280, height: 800 } };
const ctxs = { phone: PHONE, desk: DESK, deskReduced: { ...DESK, reducedMotion: 'reduce' }, deskForced: { ...DESK, forcedColors: 'active' }, deskClip: { ...DESK, permissions: ['clipboard-read', 'clipboard-write'] } };
const withCtx = async (name, fn) => { const c = await browser.newContext(ctxs[name]); try { await fn(c); } catch (e) { check(`${name} : exception`, false, String(e.message).split('\n')[0]); } finally { await c.close(); } };

// Utilitaires côté page (window.Q).
const INIT = () => {
  const rootCs = getComputedStyle(document.documentElement);
  const Q = (window.Q = {});
  Q.ms = (n) => { const v = rootCs.getPropertyValue(n).trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible ${n}="${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  Q.probe = (css, prop) => { const p = document.createElement('div'); p.style.cssText = `position:absolute;${css}`; document.body.append(p); const v = getComputedStyle(p)[prop]; p.remove(); return v; };
  Q.px = (n) => parseFloat(Q.probe(`width:var(${n})`, 'width'));
  Q.raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  Q.settle = async () => { await Q.raf(); await Promise.allSettled(document.getAnimations().map((a) => a.finished)); await Q.raf(); };
  Q.host = () => document.querySelector('lc-message-composer');
  Q.ta = () => Q.host().querySelector('textarea');
  Q.name = (b) => (b.getAttribute('aria-label') ?? b.textContent).trim();
  Q.btn = (re) => [...Q.host().querySelectorAll('button, [role="button"]')].find((b) => re.test(Q.name(b)));
  Q.send = () => Q.btn(/^Envoyer$/);
  Q.attach = () => Q.btn(/^Joindre un fichier$/);
  // Le rectangle : premier ancêtre du champ qui porte une bordure.
  Q.rect = () => { for (let e = Q.ta().parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') return e; } return null; };
  Q.thumbs = () => [...Q.host().querySelectorAll('[role="list"] > *, ul > li')].filter((e) => e.closest('[role="list"], ul'));
  Q.alert = () => Q.host().parentElement.querySelector('[role="alert"]') ?? document.querySelector('[role="alert"]');
  Q.overlay = () => {
    const els = [...Q.host().querySelectorAll('*')].filter((e) => e.textContent.trim() === 'Déposez vos fichiers ici' && ![...e.children].some((c) => c.textContent.trim() === 'Déposez vos fichiers ici'));
    const e = els[0]; if (!e) return { exists: false, on: false };
    let o = 1, vis = true; for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); o = Math.min(o, parseFloat(cs.opacity)); if (cs.visibility === 'hidden' || cs.display === 'none') vis = false; }
    return { exists: true, el: e, opacity: o, on: vis && o > 0.95, off: !vis || o < 0.01 };
  };
  Q.file = (name, { type = 'image/png', size = 10 } = {}) => new File([new Uint8Array(size)], name, { type });
  Q.dt = (files = [], texts = []) => { const d = new DataTransfer(); for (const f of files) d.items.add(f); for (const t of texts) d.items.add(t, 'text/plain'); return d; };
  Q.fire = (el, type, dt, init = {}) => { const e = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, ...init }); el.dispatchEvent(e); return e.defaultPrevented; };
  Q.events = () => window.__qa.events;
  Q.byType = (t) => window.__qa.events.filter((e) => e.type === t);
  Q.reset = () => { window.__composer.patch({ items: [], sending: false, disabled: false, attachments: true, enterSends: 'auto', maxLength: undefined, maxFiles: 10, accept: 'image/*,.pdf', minRows: 1, maxRows: 7, errors: [], note: false, sendLabel: undefined, ariaLabel: undefined }); window.__composer.set(''); window.__qa.events.length = 0; };
  Q.reduced = (el) => el.getAnimations({ subtree: true }).every((a) => a.effect.getComputedTiming().duration <= 0.01 && a.effect.getComputedTiming().delay <= 0.01);
};

async function open(ctx, id = STORY, theme = 'default') {
  const page = await ctx.newPage(); page.errors = []; page.logs = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => page.logs.push(`${m.type()}: ${m.text()}`));
  await page.addInitScript(() => { window.__alerted = false; window.alert = () => { window.__alerted = true; }; window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.effectiveDirective}|${e.blockedURI}|${e.target?.closest?.('lc-message-composer') ? 'composant' : 'hors composant'}`)); });
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  await page.waitForSelector('lc-message-composer', { state: 'attached', timeout: 15000 }); // en attente du code : le composant n'existe pas encore
  await page.evaluate(INIT);
  await page.evaluate(() => window.Q.reset());
  await rest(page);
  return page;
}
// Une section en échec ne masque pas les suivantes.
const sec = async (label, fn) => { try { await fn(); } catch (e) { check(`${label} : exception`, false, String(e.message).split('\n')[0]); } };
const ev = (page, t) => page.evaluate((x) => (x ? window.Q.byType(x) : window.Q.events()), t);
const patch = (page, p) => page.evaluate(async (x) => { window.__composer.patch(x); await window.Q.raf(); }, p);
const reset = (page) => page.evaluate(async () => { window.Q.reset(); await window.Q.raf(); });
const TA = 'lc-message-composer textarea';
const sendBtn = (page) => page.locator('lc-message-composer button', { hasText: /^\s*Envoyer\s*$/ }).or(page.locator('lc-message-composer button[aria-label="Envoyer"]')).first();
const clickSend = (page) => sendBtn(page).click({ force: true });
const focused = (page) => page.evaluate(() => (document.activeElement === window.Q.ta() ? 'textarea' : document.activeElement?.tagName));
// Dépose des fichiers (Q.file) sur un élément ; renvoie { prevented } du dernier événement.
const dropFiles = (page, files, sel = TA, texts = []) => page.evaluate(([f, s, t]) => { const el = document.querySelector(s); const dt = window.Q.dt(f.map((x) => window.Q.file(x.name, x)), t); window.Q.fire(el, 'dragenter', dt); window.Q.fire(el, 'dragover', dt); return window.Q.fire(el, 'drop', dt); }, [files, sel, texts]);

// ---------- comportement : CA-C1 C2 C3 C4 C9 C11 C13 C16 ----------
async function behaviour() {
  await withCtx('phone', async (c) => {
    const page = await open(c);
    check('précondition : (pointer: coarse) vrai en contexte tactile', await page.evaluate(() => matchMedia('(pointer: coarse)').matches));
    await patch(page, { items: [item('a', 'a.pdf'), item('b', 'b.png')] });
    const r = await page.evaluate(() => {
      const { host, ta, rect, send, attach } = { host: Q.host(), ta: Q.ta(), rect: Q.rect(), send: Q.send(), attach: Q.attach() };
      const action = document.querySelector('#qa-action'); const list = Q.thumbs()[0]?.closest('[role="list"], ul');
      const before = (a, b) => !!(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      const cs = send && getComputedStyle(send); const sb = send?.getBoundingClientRect(); const rb = rect?.getBoundingClientRect(); const tb = ta.getBoundingClientRect();
      return { order: before(list, ta) && before(ta, attach) && before(attach, action) && before(action, send), has: !!(list && attach && action && send && rect),
        svg: send?.innerHTML.includes('M14.536 21.686'), bw: cs && parseFloat(cs.borderTopWidth), bs: cs?.borderTopStyle, bg: cs?.backgroundColor, color: cs?.color, primary: Q.probe('color:var(--lc-sys-color-primary)', 'color'),
        w: sb?.width, h: sb?.height, right: sb && rb && rb.right - sb.right, left: sb && attach && attach.getBoundingClientRect().left < sb.left, full: rb && tb.width >= 0.85 * rb.width, scroll: document.documentElement.scrollWidth <= innerWidth };
    });
    check('CA-C1 360 px : ordre DOM vignettes, champ, trombone, actions, envoi', r.has && r.order, JSON.stringify(r));
    check('CA-C1 champ pleine largeur du rectangle, aucun défilement horizontal à 360 px', r.full && r.scroll, JSON.stringify(r));
    check('CA-C1 envoi : icône send, sans bordure ni fond, couleur principale, tout à droite', r.svg && (r.bw === 0 || r.bs === 'none') && /rgba\(0, 0, 0, 0\)|transparent/.test(r.bg) && r.color === r.primary && r.right >= 0 && r.right < 24, JSON.stringify(r));
    check('CA-C1 envoi : cible ≥ 44 × 44 px à 360 px', r.w >= 44 && r.h >= 44, `${r.w}×${r.h}`);
    const att = await page.evaluate(() => { const b = Q.attach().getBoundingClientRect(); return [b.width, b.height]; });
    check('CA-C1 trombone : cible ≥ 44 × 44 px', att[0] >= 44 && att[1] >= 44, String(att));
    await patch(page, { sendLabel: 'Ajouter la note' });
    check('CA-C1 sendLabel : nom accessible de l\'envoi', await page.getByRole('button', { name: 'Ajouter la note', exact: true }).count() === 1);
    await patch(page, { sendLabel: undefined, attachments: false });
    check('CA-C1 attachments faux : pas de trombone', await page.evaluate(() => !Q.attach()));
    await reset(page);
    // CA-C2 : téléphone, Entrée va à la ligne en auto.
    const ta = page.locator(TA); await ta.fill('Bonjour'); await ta.press('Enter');
    check('CA-C2 pointeur grossier + auto : Entrée va à la ligne, rien n\'est émis', (await ev(page, 'send')).length === 0 && (await page.evaluate(() => __composer.value())) === 'Bonjour\n', JSON.stringify(await ev(page)));
    await patch(page, { enterSends: true }); await ta.press('Enter');
    check('CA-C2 enterSends=true sur téléphone : Entrée envoie', (await ev(page, 'send')).length === 1);
    await page.close();
  });

  await withCtx('desk', async (c) => {
    const page = await open(c); const ta = page.locator(TA);
    // CA-C2.
    await ta.fill('Bonjour'); await ta.press('Enter');
    let s = await ev(page, 'send');
    check('CA-C2 pointeur fin + auto : Entrée émet send une fois avec { text }', s.length === 1 && s[0].detail?.text === 'Bonjour', JSON.stringify(s));
    check('CA-C2 le composant ne modifie jamais value', (await page.evaluate(() => __composer.value())) === 'Bonjour');
    await reset(page); await ta.fill('Bonjour'); await ta.press('Shift+Enter');
    check('CA-C2 Maj+Entrée insère un saut de ligne, sans envoi', (await ev(page, 'send')).length === 0 && (await page.evaluate(() => __composer.value())) === 'Bonjour\n');
    await reset(page); await ta.fill('Bonjour');
    await page.evaluate(() => { const mm = window.matchMedia.bind(window); window.__coarse = false; window.matchMedia = (q) => (/pointer:\s*coarse/.test(q) ? { matches: window.__coarse, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false } : mm(q)); window.__coarse = true; });
    await ta.press('Enter');
    check('CA-C2 auto lit matchMedia à chaque appui : coarse devenu vrai => Entrée va à la ligne', (await ev(page, 'send')).length === 0 && (await page.evaluate(() => __composer.value())) === 'Bonjour\n');
    await page.evaluate(() => { window.__coarse = false; }); await ta.press('Enter');
    check('CA-C2 auto : coarse redevenu faux => Entrée envoie', (await ev(page, 'send')).length === 1);
    await reset(page); await ta.fill('Bonjour');
    const ime = await page.evaluate(() => { const e = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true }); Q.ta().dispatchEvent(e); return e.defaultPrevented; });
    check('CA-C2 Entrée pendant la composition (IME) : aucune émission', (await ev(page, 'send')).length === 0 && !ime);
    await patch(page, { enterSends: false }); await ta.press('Enter');
    check('CA-C2 enterSends=false : Entrée va à la ligne', (await ev(page, 'send')).length === 0 && (await page.evaluate(() => __composer.value())) === 'Bonjour\n');

    // CA-C3.
    await reset(page); await clickSend(page);
    check('CA-C3 texte vide, sans item : sendBlocked(empty), pas de send, focus dans le champ', JSON.stringify((await ev(page)).map((e) => [e.type, e.detail])) === '[["sendBlocked","empty"]]' && (await focused(page)) === 'textarea', JSON.stringify(await ev(page)));
    await reset(page); await ta.fill('   \n  '); await clickSend(page);
    check('CA-C3 texte blanc seulement = vide', (await ev(page, 'send')).length === 0 && (await ev(page, 'sendBlocked'))[0]?.detail === 'empty');
    await reset(page); await ta.fill('  salut  '); await clickSend(page);
    check('CA-C3 send émet { text: value().trim() }', JSON.stringify((await ev(page, 'send')).map((e) => e.detail)) === '[{"text":"salut"}]');
    await reset(page); await patch(page, { items: [item('a', 'a.png')] }); await clickSend(page);
    check('CA-C3 item sans texte : send émis', (await ev(page, 'send')).length === 1 && (await ev(page, 'send'))[0].detail.text === '');
    await reset(page); await ta.fill('x'); await patch(page, { sending: true }); await clickSend(page);
    check('CA-C3 pendant sending : sendBlocked(sending), pas de send', (await ev(page, 'send')).length === 0 && (await ev(page, 'sendBlocked'))[0]?.detail === 'sending');
    await reset(page); await ta.fill('x'); await patch(page, { items: [item('u', 'u.pdf', 'uploading', { progress: 10 })] }); await clickSend(page);
    check('CA-C3 item uploading : sendBlocked(uploading)', (await ev(page, 'send')).length === 0 && (await ev(page, 'sendBlocked'))[0]?.detail === 'uploading' && (await focused(page)) === 'textarea');
    await patch(page, { items: [item('u', 'u.pdf', 'done')] }); await clickSend(page);
    check('CA-C3 l\'item passe à done : l\'envoi se débloque sans autre action', (await ev(page, 'send')).length === 1);
    await reset(page); await ta.fill('x'); await patch(page, { items: [item('e', 'e.pdf', 'error')] }); await clickSend(page);
    check('CA-C3 item error : ne bloque pas', (await ev(page, 'send')).length === 1);
    await reset(page); await ta.fill('x'); await sendBtn(page).dblclick({ force: true }); await ta.press('Enter');
    check('CA-C3 deux clics puis Entrée dans le même cycle : un seul send', (await ev(page, 'send')).length === 1, String((await ev(page, 'send')).length));
    await patch(page, { sending: true }); await patch(page, { sending: false }); await clickSend(page);
    check('CA-C3 sending vrai puis faux : l\'envoi suivant est permis', (await ev(page, 'send')).length === 2);
    await ta.pressSequentially('y'); await ta.press('Enter');
    check('CA-C3 value modifiée : l\'envoi suivant est permis', (await ev(page, 'send')).length === 3);

    // CA-C4 : hauteur du champ.
    await reset(page);
    const H = () => page.evaluate(async () => { await Q.raf(); const t = Q.ta(); const cs = getComputedStyle(t); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return { h: t.getBoundingClientRect().height, lh, sh: t.scrollHeight, ch: t.clientHeight, oy: cs.overflowY, ok: (() => { const r = Q.rect().getBoundingClientRect(), b = Q.send().getBoundingClientRect(); return b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 && b.bottom <= innerHeight; })() }; });
    const h1 = await H(); await ta.fill('a\nb\nc'); const h3 = await H(); await ta.fill(Array(12).fill('l').join('\n')); const h12 = await H();
    await ta.fill(Array(7).fill('l').join('\n')); const h7 = await H();
    check('CA-C4 vide : minRows (1) lignes ; 3 lignes : + 2 lignes de hauteur', near(h3.h - h1.h, 2 * h1.lh, 3), JSON.stringify({ h1, h3 }));
    check('CA-C4 12 lignes : hauteur bornée à maxRows (7) lignes puis défilement', near(h12.h, h7.h, 1) && near(h12.h - h1.h, 6 * h1.lh, 4) && h12.sh > h12.ch && /auto|scroll/.test(h12.oy), JSON.stringify({ h1, h7, h12 }));
    check('CA-C4 la barre basse reste entièrement visible (rectangle et fenêtre)', h1.ok && h3.ok && h12.ok, JSON.stringify([h1.ok, h3.ok, h12.ok]));
    await reset(page); await patch(page, { minRows: 3 }); const m3 = await H();
    check('CA-C4 minRows 3 : trois lignes à vide', near(m3.h - h1.h, 2 * h1.lh, 3), JSON.stringify({ m3, h1 }));
    await reset(page); await ta.fill(Array(30).fill('mot').join(' ')); const wide = await H();
    await page.setViewportSize({ width: 360, height: 800 }); await rest(page); const narrow = await H();
    await page.setViewportSize({ width: 1280, height: 800 }); await rest(page); const back = await H();
    check('CA-C4 un changement de largeur recalcule la hauteur (étroit plus haut, retour identique)', narrow.h > wide.h + narrow.lh / 2 && near(back.h, wide.h, 1), JSON.stringify({ wide: wide.h, narrow: narrow.h, back: back.h }));

    // CA-C9 : sending.
    await reset(page); await ta.fill('Texte'); const sb0 = await page.evaluate(() => { const b = Q.send().getBoundingClientRect(); const cs = getComputedStyle(Q.ta()); return { w: b.width, h: b.height, color: cs.color, op: cs.opacity }; });
    await page.evaluate(() => Q.send().focus()); await patch(page, { sending: true }); await rest(page);
    const s9 = await page.evaluate(() => { const b = Q.send(); const t = Q.ta(); const cs = getComputedStyle(t); const st = [...Q.host().querySelectorAll('[role="status"]')].map((e) => e.textContent.trim()); const r = b.getBoundingClientRect(); return { ad: b.getAttribute('aria-disabled'), busy: b.getAttribute('aria-busy'), focus: document.activeElement === b, ro: t.readOnly, dis: t.disabled, color: cs.color, op: cs.opacity, us: cs.userSelect, st, w: r.width, h: r.height }; });
    check('CA-C9 sending : aria-disabled=true, aria-busy, le focus reste sur l\'envoi', s9.ad === 'true' && s9.busy === 'true' && s9.focus, JSON.stringify(s9));
    check('CA-C9 sending : champ readonly (pas disabled), texte sélectionnable, couleur et opacité inchangées', s9.ro && !s9.dis && s9.us !== 'none' && s9.color === sb0.color && s9.op === sb0.op, JSON.stringify({ s9, sb0 }));
    check('CA-C9 sending : « Envoi en cours… » en role=status, anneau de même taille', s9.st.includes('Envoi en cours…') && near(s9.w, sb0.w, 0.5) && near(s9.h, sb0.h, 0.5), JSON.stringify({ s9, sb0 }));

    // CA-C11 : en-tête, actions, ordre de Tab.
    await reset(page); await patch(page, { items: [item('a', 'a.pdf'), item('e', 'e.pdf', 'error', { errorMessage: 'Échec' })] });
    const pos = await page.evaluate(() => { const h = document.querySelector('#qa-header').getBoundingClientRect(), r = Q.rect().getBoundingClientRect(), a = Q.attach().getBoundingClientRect(), x = document.querySelector('#qa-action').getBoundingClientRect(), s = Q.send().getBoundingClientRect(); return { above: h.bottom <= r.top + 0.5, order: a.left < x.left && x.left < s.left, inside: x.top >= r.top && x.bottom <= r.bottom }; });
    check('CA-C11 lcComposerHeader au-dessus du rectangle ; lcComposerAction après le trombone et avant l\'envoi, dans le rectangle', pos.above && pos.order && pos.inside, JSON.stringify(pos));
    await page.focus('#qa-header-button'); const seq = [];
    for (let i = 0; i < 9; i++) { seq.push(await page.evaluate(() => { const a = document.activeElement; if (a.id === 'qa-header-button') return 'header'; if (a === Q.ta()) return 'field'; if (a.id === 'qa-action') return 'action'; const n = Q.name(a); if (/^Joindre/.test(n)) return 'attach'; if (n === 'Envoyer') return 'send'; if (/^(Retirer|Réessayer)/.test(n)) return 'thumb'; return `autre:${a.tagName}#${a.id}`; })); if (seq.at(-1) === 'send') break; await page.keyboard.press('Tab'); }
    const collapsed = seq.filter((x, i) => x !== seq[i - 1]);
    check('CA-C11 Tab : en-tête, vignettes, champ, trombone, actions, envoi', JSON.stringify(collapsed) === JSON.stringify(['header', 'thumb', 'field', 'attach', 'action', 'send']), seq.join(' > '));

    // CA-C13 : dans lc-form-field.
    await reset(page);
    const f = await page.evaluate(() => { const t = Q.ta(); const d = (t.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent.trim()); return { d, name: t.getAttribute('aria-labelledby') || t.getAttribute('aria-label') || t.labels?.[0]?.textContent.trim(), label: !!document.querySelector('label, [id]') }; });
    check('CA-C13 libellé et aide de lc-form-field appliqués au champ (nom accessible « Votre message », aria-describedby → aide)', (await page.getByRole('textbox', { name: 'Votre message' }).count()) === 1 && f.d.some((x) => x?.includes('Aide du champ')), JSON.stringify(f));
    await patch(page, { errors: ['Erreur QA'] }); await page.focus(TA); await page.evaluate(() => Q.ta().blur()); await rest(page);
    const inv = await page.evaluate(() => { const t = Q.ta(); return { ai: t.getAttribute('aria-invalid'), d: (t.getAttribute('aria-describedby') ?? '').split(' ').map((i) => document.getElementById(i)?.textContent.trim()) }; });
    check('CA-C13 erreur du champ : aria-invalid=true et aria-describedby → message, après la sortie du champ', inv.ai === 'true' && inv.d.some((x) => x?.includes('Erreur QA')), JSON.stringify(inv));
    await reset(page); await ta.fill('depuis la saisie');
    check('CA-C13 [(value)] : la saisie met à jour le modèle', (await page.evaluate(() => __composer.value())) === 'depuis la saisie');
    await page.evaluate(() => __composer.set('depuis le modèle')); await rest(page);
    check('CA-C13 [(value)] : le modèle met à jour le champ', (await ta.inputValue()) === 'depuis le modèle');
    check('CA-C13 dans lc-form-field : aucun avertissement d\'accessibilité en console', !page.logs.some((l) => /aria-?label/i.test(l)), page.logs.join(' | '));

    // CA-C16 : maxLength.
    await reset(page); await patch(page, { maxLength: 100 }); await ta.fill('x'.repeat(85));
    const counter = () => page.evaluate(() => { const e = [...Q.host().querySelectorAll('*')].find((x) => x.children.length === 0 && /\b\d+\s*\/\s*100\b/.test(x.textContent)); return e ? { text: e.textContent.trim(), live: !!e.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]') } : null; });
    check('CA-C16 compteur absent sous 90 %', (await counter()) === null, JSON.stringify(await counter()));
    await ta.fill('x'.repeat(90));
    const c90 = await counter();
    check('CA-C16 compteur affiché à partir de 90 %', c90 !== null && /90\s*\/\s*100/.test(c90.text), JSON.stringify(c90));
    await page.evaluate(() => { window.__live = 0; const ls = [...Q.host().querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"]')]; const mo = new MutationObserver((m) => { window.__live += m.length; }); for (const l of ls) mo.observe(l, { childList: true, characterData: true, subtree: true }); });
    await ta.pressSequentially('y'.repeat(9)); await rest(page);
    const live = await page.evaluate(() => window.__live);
    check('CA-C16 annonce sans répétition à chaque touche (≤ 2 mises à jour de la zone live pour 9 frappes) et compteur hors zone live', live <= 2 && !(await counter())?.live, `mutations=${live} ${JSON.stringify(await counter())}`);
    await ta.fill('z'.repeat(150));
    check('CA-C16 saisie limitée à maxLength', (await ta.inputValue()).length <= 100, String((await ta.inputValue()).length));
    await page.close();
  });

  // CA-C13 hors champ : l'avertissement de développement est prouvé par la spec Vitest (message-composer.acceptance.spec.ts) ; ici, la story Bare sans ariaLabel rend le champ.
  await withCtx('desk', async (c) => {
    const page = await open(c, BARE);
    check('CA-C13 hors lc-form-field : le composant se rend (avertissement de développement vérifié en Vitest)', await page.locator(TA).count() === 1);
    await page.close();
  });
}

// ---------- fichiers : CA-C5 C6 C7 C8 C15 C17 C18 S1 S2 S3 S4 S6 ----------
const overlay = (page) => page.evaluate(() => { const o = Q.overlay(); return { exists: o.exists, on: o.on, off: o.exists ? o.off : true, opacity: o.opacity }; });
async function files() {
  await withCtx('desk', async (c) => {
    const page = await open(c);
    // CA-C5 : trombone.
    const clip = page.locator('lc-message-composer button[aria-label="Joindre un fichier"], lc-message-composer button:has-text("Joindre un fichier")').first();
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }), clip.click()]);
    check('CA-C5 clic sur le trombone : sélecteur de fichiers multiple', fc.isMultiple());
    await fc.setFiles([{ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('1') }, { name: 'b.pdf', mimeType: 'application/pdf', buffer: Buffer.from('2') }, { name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('3') }]);
    await rest(page);
    check('CA-C5 acceptés par filesAdded', JSON.stringify((await ev(page, 'filesAdded')).at(-1)?.detail?.map((f) => f.name)) === '["a.png","b.pdf"]', JSON.stringify(await ev(page)));
    const rej = JSON.stringify(await ev(page, 'rejected'));
    check('CA-C5 refusés par rejected (raison type, x.txt)', /x\.txt/.test(rej) && /"type"/.test(rej), rej);
    // Le sélecteur natif n'est pas rapporté de façon fiable par Chromium après une activation clavier (7 échecs sur 20 sur une page nue : artefact du banc, pas du composant) :
    // le clavier est prouvé par le clic que le bouton reçoit (Entrée, Espace), l'ouverture du sélecteur par le clic souris ci-dessus.
    for (const key of ['Enter', 'Space']) {
      await page.evaluate(() => { const a = Q.attach(); window.__clicks = 0; a.addEventListener('click', (e) => { if (e.isTrusted) window.__clicks += 1; }, { once: true }); a.focus(); });
      await page.waitForFunction(() => document.activeElement === Q.attach());
      await page.keyboard.press(key === 'Space' ? ' ' : key); await rest(page);
      check(`CA-C5 trombone au clavier (${key}) : le bouton est activé (clic reçu, Entrée non interceptée par l'envoi)`, (await page.evaluate(() => window.__clicks)) === 1);
      await page.evaluate(() => document.querySelector('lc-message-composer input[type="file"]')?.dispatchEvent(new Event('cancel')));
    }
    await reset(page);
    const pick = async (list) => { const [x] = await Promise.all([page.waitForEvent('filechooser'), clip.click()]); await x.setFiles(list); await rest(page); };
    const same = { name: 'same.png', mimeType: 'image/png', buffer: Buffer.from('1') };
    await pick([same]); await pick([same]);
    check('CA-C5 le même fichier rechoisi est repris (entrée remise à vide)', (await ev(page, 'filesAdded')).length === 2, String((await ev(page, 'filesAdded')).length));
    await reset(page); await patch(page, { maxFiles: 2, items: [item('1', '1.png'), item('2', '2.png')] });
    check('CA-C5 maxFiles atteint : le trombone reste actif', await page.evaluate(() => { const b = Q.attach(); return !b.disabled && b.getAttribute('aria-disabled') !== 'true'; }));
    await pick([{ name: 'n.png', mimeType: 'image/png', buffer: Buffer.from('1') }]);
    check('CA-C5/C15 maxFiles atteint : refus count, rien dans filesAdded', (await ev(page, 'filesAdded')).length === 0 && /"count"/.test(JSON.stringify(await ev(page, 'rejected'))), JSON.stringify(await ev(page)));
    await reset(page); await patch(page, { maxFiles: 3, items: [item('1', '1.png')] });
    await pick([{ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('1') }, { name: 'b.png', mimeType: 'image/png', buffer: Buffer.from('1') }, { name: 'c.png', mimeType: 'image/png', buffer: Buffer.from('1') }, { name: 'd.txt', mimeType: 'text/plain', buffer: Buffer.from('1') }]);
    const rj = JSON.stringify(await ev(page, 'rejected'));
    check('CA-C5 lot en partie refusé : room = maxFiles − items (2 acceptés), refus count et type', (await ev(page, 'filesAdded')).at(-1)?.detail.length === 2 && /"count"/.test(rj) && /"type"/.test(rj) && /d\.txt/.test(rj), `${rj} ${JSON.stringify(await ev(page, 'filesAdded'))}`);
    check('CA-C8 un message par raison (type et count) dans un seul role=alert', await page.evaluate(() => { const a = document.querySelectorAll('[role="alert"]'); const t = a[0]?.textContent ?? ''; return a.length === 1 && /d\.txt/.test(t) && /c\.png/.test(t); }));

    await sec('CA-C6', async () => {
    // CA-C6 : calque de dépôt.
    await reset(page);
    const t = await page.evaluate(() => ({ fast: Q.ms('--lc-sys-duration-fast') }));
    check('CA-C6 hors glisser : calque éteint', (await overlay(page)).off);
    const lit = await page.evaluate(async () => { const ta = Q.ta(); const dt = Q.dt([Q.file('p.png')]); Q.fire(ta, 'dragenter', dt); Q.fire(ta, 'dragover', dt); await Q.raf(); const o = Q.overlay(); const anims = o.exists ? o.el.getAnimations({ subtree: false }).concat(o.el.parentElement?.getAnimations() ?? []).map((a) => ({ p: a.transitionProperty ?? a.animationName, d: a.effect.getComputedTiming().duration })) : []; await Q.settle(); const r = Q.rect().getBoundingClientRect(); const e = Q.overlay().el; return { anims, on: Q.overlay().on, pe: !!e && [...(function* () { for (let n = e; n && n !== document.body; n = n.parentElement) yield getComputedStyle(n).pointerEvents; })()].includes('none') }; });
    check('CA-C6 glisser avec fichier sur un enfant du rectangle : calque « Déposez vos fichiers ici » allumé, pointer-events: none', lit.on && lit.pe, JSON.stringify(lit));
    check('CA-C6 le calque s\'allume en duration-fast (transition d\'opacité)', lit.anims.some((a) => /opacity/.test(a.p) && near(a.d, t.fast, 0.5)), JSON.stringify({ lit, fast: t.fast }));
    const flick = await page.evaluate(async () => { const ta = Q.ta(), ob = Q.attach(); const dt = Q.dt([Q.file('p.png')]); const o = []; Q.fire(ta, 'dragleave', dt, { relatedTarget: ob }); Q.fire(ob, 'dragenter', dt, { relatedTarget: ta }); for (let i = 0; i < 6; i++) { await new Promise((r) => requestAnimationFrame(r)); o.push(Q.overlay().opacity); } return o; });
    check('CA-C6 passer d\'un enfant à un autre ne fait pas clignoter (opacité stable)', flick.every((v) => v > 0.95), JSON.stringify(flick));
    await page.evaluate(() => { const dt = Q.dt([Q.file('p.png')]); Q.fire(Q.ta(), 'dragleave', dt, { relatedTarget: document.body }); }); await rest(page);
    check('CA-C6 sortie du rectangle : calque éteint', (await overlay(page)).off);
    await page.evaluate(async () => { const dt = Q.dt([Q.file('p.png')]); Q.fire(Q.ta(), 'dragenter', dt); Q.fire(Q.ta(), 'dragover', dt); Q.fire(Q.ta(), 'drop', dt); }); await rest(page);
    check('CA-C6 lâcher : calque éteint, fichier émis par filesAdded', (await overlay(page)).off && (await ev(page, 'filesAdded')).length === 1);
    const txt = await page.evaluate(async () => { const dt = Q.dt([], ['du texte']); Q.fire(Q.ta(), 'dragenter', dt); const p = Q.fire(Q.ta(), 'dragover', dt); await Q.raf(); return { p, on: Q.overlay().on }; });
    check('CA-C6 glisser sans fichier : rien n\'est éclairé, dragover non annulé', !txt.p && !txt.on, JSON.stringify(txt));
    for (const [what, p] of [['disabled', { disabled: true }], ['attachments faux', { attachments: false }]]) {
      await reset(page); await patch(page, p);
      const d = await page.evaluate(async () => { const dt = Q.dt([Q.file('p.png')]); Q.fire(Q.ta(), 'dragenter', dt); const over = Q.fire(Q.ta(), 'dragover', dt); await Q.raf(); const on = Q.overlay().on; const dropped = Q.fire(Q.ta(), 'drop', dt); return { over, on, dropped }; });
      check(`CA-C6 ${what} : rien d'éclairé, le navigateur n'ouvre pas le fichier (dragover et drop annulés), rien d'émis`, !d.on && d.over && d.dropped && (await ev(page, 'filesAdded')).length === 0, JSON.stringify(d));
    }

    });

    await sec('CA-C7', async () => {
    // CA-C7 : vignettes.
    await reset(page);
    const items = [item('p', 'photo.png', 'done', { previewUrl: PNG }), item('u', 'up.pdf', 'uploading', { progress: 62 }), item('e', 'bad.pdf', 'error', { errorMessage: 'Réseau' })];
    await patch(page, { items }); await rest(page);
    const v = await page.evaluate(() => { const th = Q.thumbs(); return { n: th.length, img: !!th[0]?.querySelector('img'), icon1: !!th[1]?.querySelector('svg, lc-icon'), pb: th[1]?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), name: th.map((x) => x.textContent.includes(['photo.png', 'up.pdf', 'bad.pdf'][th.indexOf(x)])), fail: /Échec/.test(th[2]?.textContent ?? ''), retry: !!Q.btn(/^Réessayer/), rm: !!Q.btn(/^Retirer photo\.png$/), listName: !!document.querySelector('[role="list"][aria-label="Pièces jointes"], [role="list"][aria-labelledby]') }; });
    check('CA-C7 trois vignettes (liste « Pièces jointes »), aperçu <img>, noms affichés', v.n === 3 && v.img && v.name.every(Boolean) && v.listName, JSON.stringify(v));
    check('CA-C7 uploading : progressbar à 62 ; error : « Échec » et Réessayer ; ✕ nommé « Retirer photo.png »', v.pb === '62' && v.fail && v.retry && v.rm, JSON.stringify(v));
    await page.evaluate(() => Q.btn(/^Réessayer/).click()); await page.evaluate(() => Q.btn(/^Retirer photo\.png$/).click());
    check('CA-C7 Réessayer => retry(id) ; ✕ => remove(id)', (await ev(page, 'retry'))[0]?.detail === 'e' && (await ev(page, 'remove'))[0]?.detail === 'p', JSON.stringify(await ev(page)));
    await reset(page); await patch(page, { items: [item('a', 'a.png')] }); await rest(page);
    await page.evaluate(() => { window.__before = Q.thumbs().length; });
    await patch(page, { items: [item('a', 'a.png'), item('n', 'new.png')] });
    const ent = await page.evaluate(() => { const li = Q.thumbs()[1]; const normal = Q.ms('--lc-sys-duration-normal'); const out = []; for (const a of li.getAnimations({ subtree: true })) { const tg = a.effect.target; const t = a.effect.getComputedTiming(); a.pause(); a.currentTime = 0; const cs = getComputedStyle(tg); out.push({ p: a.transitionProperty ?? a.animationName, d: t.duration, op: cs.opacity, sc: new DOMMatrix(cs.transform).a }); a.cancel?.(); } return { out, normal }; });
    check('CA-C7 nouvelle vignette : fondu et 0,96 → 1 en duration-normal', ent.out.some((x) => x.op === '0' && near(x.d, ent.normal, 0.5)) && ent.out.some((x) => near(x.sc, 0.96, 0.005) && near(x.d, ent.normal, 0.5)), JSON.stringify(ent));
    await reset(page); await patch(page, { items: [item('a', 'a.png'), item('b', 'b.png')] }); await rest(page);
    await page.evaluate(() => Q.btn(/^Retirer a\.png$/).click()); await patch(page, { items: [item('b', 'b.png')] }); await rest(page);
    check('CA-C7 après retrait : le focus va à la vignette suivante', await page.evaluate(() => Q.thumbs()[0]?.contains(document.activeElement)), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
    await page.evaluate(() => Q.btn(/^Retirer b\.png$/).click()); await patch(page, { items: [] }); await rest(page);
    check('CA-C7 après retrait de la dernière : le focus va au champ', (await focused(page)) === 'textarea');

    });

    await sec('CA-C8', async () => {
    // CA-C8 : refus.
    await reset(page);
    await page.evaluate(() => { window.__t = []; });
    const t8 = await page.evaluate(() => ({ dur: Q.ms('--lc-message-composer-shake-duration'), dist: Q.px('--lc-message-composer-shake-distance') }));
    const sh = await page.evaluate(async () => { const dt = Q.dt([Q.file('x.txt', { type: 'text/plain' })]); Q.fire(Q.ta(), 'drop', dt); await Q.raf(); const a = Q.host().getAnimations({ subtree: true }).concat(Q.host().parentElement.getAnimations()).filter((x) => (x.transitionProperty ?? x.animationName) !== undefined && /transform|shake/i.test(x.transitionProperty ?? x.animationName)); const tg = a[0]?.effect.target; let max = 0; const d = a[0]?.effect.getComputedTiming().duration; if (a[0]) for (let ms = 0; ms <= d; ms += d / 40) { a[0].pause(); a[0].currentTime = ms; max = Math.max(max, Math.abs(new DOMMatrix(getComputedStyle(tg).transform).m41)); } return { n: a.length, d, max, al: Q.alert()?.getAttribute('role'), text: Q.alert()?.textContent }; });
    check('CA-C8 refus : secousse en transform, durée --lc-message-composer-shake-duration, amplitude --lc-message-composer-shake-distance', sh.n > 0 && near(sh.d, t8.dur, 0.5) && near(sh.max, t8.dist, 0.6), JSON.stringify({ sh, t8 }));
    check('CA-C8 message sous le rectangle en role=alert avec nom et raison ; rejected émis', sh.al === 'alert' && /x\.txt/.test(sh.text) && (await ev(page, 'rejected')).length === 1, JSON.stringify(sh));
    const below = await page.evaluate(() => Q.alert().getBoundingClientRect().top >= Q.rect().getBoundingClientRect().bottom - 0.5);
    check('CA-C8 le message est sous le rectangle', below);
    const gone = [];
    for (const how of ['saisie', 'ajout', 'retrait']) {
      await reset(page); await patch(page, { items: [item('a', 'a.png')] }); await dropFiles(page, [{ name: 'x.txt', type: 'text/plain' }]); await rest(page);
      const there = await page.evaluate(() => !!Q.alert()?.textContent.trim());
      if (how === 'saisie') await page.locator(TA).pressSequentially('a'); else if (how === 'ajout') await dropFiles(page, [{ name: 'ok.png' }]); else await page.evaluate(() => Q.btn(/^Retirer a\.png$/).click());
      await rest(page); gone.push([how, there, !(await page.evaluate(() => !!Q.alert()?.textContent.trim()))]);
    }
    check('CA-C8 le message disparaît à la saisie, à l\'ajout et au retrait', gone.every(([, a, b]) => a && b), JSON.stringify(gone));

    });

    await sec('CA-C15', async () => {
    // CA-C15 : éléments ignorés.
    await reset(page);
    const ign = await page.evaluate(async () => { const dt = Q.dt([Q.file('dossier', { type: '', size: 0 }), Q.file('vide.png', { size: 0 })], ['texte']); const ta = Q.ta(); Q.fire(ta, 'dragenter', dt); await Q.raf(); Q.fire(ta, 'drop', dt); await Q.settle(); return { on: Q.overlay().on, ev: Q.events().map((e) => e.type) }; });
    await rest(page);
    check('CA-C15 dossier, élément non fichier, fichier de 0 octet : ignorés (aucun événement), calque non coincé, aucune exception', JSON.stringify(ign.ev) === '[]' && (await overlay(page)).off && page.errors.length === 0, JSON.stringify({ ign, errors: page.errors }));
    await dropFiles(page, [{ name: 'vide.png', size: 0 }, { name: 'ok.png' }]);
    check('CA-C15 lot mixte : seul le fichier non vide est ajouté, sans refus', JSON.stringify((await ev(page, 'filesAdded')).map((e) => e.detail.map((f) => f.name))) === '[["ok.png"]]' && (await ev(page, 'rejected')).length === 0, JSON.stringify(await ev(page)));
    await reset(page); await patch(page, { items: Array.from({ length: 10 }, (_, i) => item(`i${i}`, `i${i}.png`)) }); await dropFiles(page, [{ name: 'onze.png' }]);
    check('CA-C15 maxFiles par défaut (10) atteint : refus count', (await ev(page, 'filesAdded')).length === 0 && /"count"/.test(JSON.stringify(await ev(page, 'rejected'))), JSON.stringify(await ev(page)));

    });

    await sec('CA-C17 autre input[type=file]', async () => {
      await reset(page);
      const o = await page.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = 'qa-other'; document.body.append(i); const dt = Q.dt([Q.file('p.png')]); return { over: Q.fire(i, 'dragover', dt), drop: Q.fire(i, 'drop', dt) }; });
      check('CA-C17 un fichier lâché sur un autre input[type=file] de la page n\'est pas bloqué, rien n\'est ajouté', !o.over && !o.drop && (await ev(page, 'filesAdded')).length === 0, JSON.stringify(o));
    });
    await sec('CA-C3 pièces jointes seules', async () => {
      await reset(page); await patch(page, { items: [item('a', 'a.png')] }); await clickSend(page); await clickSend(page);
      const one = (await ev(page, 'send')).length;
      await patch(page, { items: [item('a', 'a.png'), item('b', 'b.png')] }); await clickSend(page);
      const sends = await ev(page, 'send');
      check('CA-C3 pièces jointes seules : un envoi (texte vide), un deuxième clic refusé, nouvel envoi permis après changement des items', one === 1 && sends.length === 2 && sends.every((e) => e.detail.text === ''), JSON.stringify(await ev(page)));
    });
    await sec('CA-C17', async () => {
    // CA-C17 : fichier lâché hors du rectangle.
    await reset(page);
    const out = await page.evaluate(() => { const dt = Q.dt([Q.file('p.png')]); const after = document.querySelector('#qa-after'); const o = { over: Q.fire(after, 'dragover', dt), drop: Q.fire(after, 'drop', dt), body: Q.fire(document.body, 'dragover', dt) }; const tx = Q.dt([], ['lien ou texte']); o.txtOver = Q.fire(after, 'dragover', tx); o.txtDrop = Q.fire(after, 'drop', tx); return o; });
    check('CA-C17 fichier lâché hors du rectangle : dragover et drop annulés (le navigateur n\'ouvre pas), rien ajouté', out.over && out.drop && out.body && (await ev(page)).length === 0, JSON.stringify(out));
    check('CA-C17 texte ou lien glissé ailleurs : non bloqué', !out.txtOver && !out.txtDrop, JSON.stringify(out));
    await page.evaluate(() => __composer.destroy()); await rest(page);
    const dead = await page.evaluate(() => { const dt = Q.dt([Q.file('p.png')]); return { over: Q.fire(document.body, 'dragover', dt), drop: Q.fire(document.body, 'drop', dt) }; });
    check('CA-C17 composant détruit : les écouteurs du document sont retirés (ils annulaient avant)', out.over && !dead.over && !dead.drop, JSON.stringify(dead));
    });

    await page.close();
  });

  // CA-C18 : collage (presse-papiers réel).
  await withCtx('deskClip', async (c) => {
    const page = await open(c); const ta = page.locator(TA); await ta.click();
    await page.evaluate(async () => { await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob(['texte brut'], { type: 'text/plain' }), 'text/html': new Blob(['<b>gras</b> <img src=x onerror=alert(1)>'], { type: 'text/html' }) })]); });
    await page.keyboard.press('Control+V'); await rest(page);
    check('CA-C18 collage de texte et d\'HTML : seul le texte brut est inséré, aucune pièce jointe', (await ta.inputValue()) === 'texte brut' && (await ev(page)).length === 0 && !(await page.evaluate(() => window.__alerted)), `${await ta.inputValue()} ${JSON.stringify(await ev(page))}`);
    await reset(page); await ta.click();
    await page.evaluate(async (png) => { const b = await (await fetch(png)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); }, PNG);
    await page.keyboard.press('Control+V'); await rest(page);
    check('CA-C18 image collée : filesAdded (accept respecté), aucun texte inséré', (await ev(page, 'filesAdded')).length === 1 && (await ta.inputValue()) === '', JSON.stringify(await ev(page)));
    await reset(page); await ta.click();
    await page.evaluate(async (png) => { const b = await (await fetch(png)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob(['texte mixte'], { type: 'text/plain' }), 'image/png': b })]); }, PNG);
    await page.keyboard.press('Control+V'); await rest(page);
    check('CA-C18 collage mixte (texte et image) : texte natif inséré, aucune pièce jointe', (await ta.inputValue()) === 'texte mixte' && (await ev(page, 'filesAdded')).length === 0 && (await ev(page, 'rejected')).length === 0, `${await ta.inputValue()} ${JSON.stringify(await ev(page))}`);
    const paste = (files) => page.evaluate((fs) => { const dt = Q.dt(fs.map((f) => Q.file(f.name, f))); const e = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }); Q.ta().dispatchEvent(e); return e.defaultPrevented; }, files);
    await reset(page); await paste([{ name: 'x.txt', type: 'text/plain' }]); const shook = await page.evaluate(async () => { await Q.raf(); return Q.host().getAnimations({ subtree: true }).some((a) => /transform|shake/i.test(a.transitionProperty ?? a.animationName ?? '')); }); await rest(page);
    check('CA-C18 fichier collé refusé : rejected, message en role=alert, secousse, aucun texte', (await ev(page, 'rejected')).length === 1 && (await page.evaluate(() => !!Q.alert()?.textContent.includes('x.txt'))) && (await ta.inputValue()) === '' && shook, JSON.stringify({ shook, ev: await ev(page) }));
    for (const [what, p] of [['attachments faux', { attachments: false }], ['disabled', { disabled: true }]]) { await reset(page); await patch(page, p); await paste([{ name: 'p.png' }]); const none = (await ev(page, 'filesAdded')).length === 0 && (await ev(page, 'rejected')).length === 0; await reset(page); await paste([{ name: 'p.png' }]); check(`CA-C18 ${what} : aucun fichier ajouté (le même collage est pris en compte une fois le composant actif)`, none && (await ev(page, 'filesAdded')).length === 1, JSON.stringify({ none, après: await ev(page) })); }
    await page.close();
  });

  // CA-S1 à S4, S6 : noms et aperçus (360 px pour la mise en page).
  await withCtx('phone', async (c) => {
    const page = await open(c);
    await sec('CA-S1', async () => {
    const XSS = ['<img src=x onerror=alert(1)>.png', '<script>alert(1)</script>.pdf'];
    await patch(page, { items: XSS.map((n, i) => item(`x${i}`, n)) }); await rest(page);
    const s1 = await page.evaluate((names) => { const h = Q.host(); return { nodes: h.querySelectorAll('img, script, iframe, svg script').length, bad: !!h.querySelector('[onerror]'), texts: Q.thumbs().map((t, i) => t.textContent.includes(names[i])), btn: names.map((n) => !!Q.btn(new RegExp('^Retirer ' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))), alerted: window.__alerted, bdi: Q.thumbs().every((t) => !!t.querySelector('bdi')) }; }, XSS);
    check('CA-S1 nom HTML : affiché littéralement (texte), aucun nœud img/script/[onerror], rien d\'exécuté', s1.texts.length === 2 && s1.nodes === 0 && !s1.bad && s1.texts.every(Boolean) && !s1.alerted, JSON.stringify(s1));
    check('CA-S1 nom accessible du ✕ littéral', s1.btn.length === 2 && s1.btn.every(Boolean), JSON.stringify(s1));
    await dropFiles(page, [{ name: '<img src=x onerror=alert(1)>.exe', type: 'application/x-msdownload' }]); await rest(page);
    const s1b = await page.evaluate(() => { const a = Q.alert(); return { text: a?.textContent.includes('<img src=x onerror=alert(1)>'), kids: a?.querySelectorAll('img, script').length, alerted: window.__alerted }; });
    check('CA-S1 message de refus : nom littéral, aucun nœud HTML', s1b.text && s1b.kids === 0 && !s1b.alerted, JSON.stringify(s1b));
    });

    await sec('CA-S2', async () => {
    // S2.
    await reset(page); const LONG = `${'a'.repeat(296)}.png`;
    await patch(page, { items: [item('l', LONG)] }); await rest(page);
    const s2 = await page.evaluate((n) => { const th = Q.thumbs()[0]; const e = [...th.querySelectorAll('*')].find((x) => x.children.length === 0 && x.textContent.includes('aaaa')); const cs = getComputedStyle(e); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3; const lab = [...Q.host().querySelectorAll('[aria-label]')].map((x) => x.getAttribute('aria-label')); return { h: e.getBoundingClientRect().height, lh, scroll: document.documentElement.scrollWidth <= innerWidth, tw: th.getBoundingClientRect().right <= innerWidth + 0.5, ell: cs.textOverflow, maxLab: Math.max(0, ...lab.map((l) => l.length)), run: lab.some((l) => /a{81,}/.test(l)) }; }, LONG);
    check('CA-S2 nom de 300 caractères : une ligne coupée, pas de défilement horizontal, vignette dans l\'écran à 360 px', s2.h < 2 * s2.lh && s2.scroll && s2.tw, JSON.stringify(s2));
    check('CA-S2 nom accessible plafonné à 80 caractères de nom (+ préfixe)', s2.maxLab > 0 && !s2.run && s2.maxLab <= 80 + 'Retirer '.length + 1, JSON.stringify(s2));
    await reset(page); await dropFiles(page, [{ name: LONG }]); await rest(page);
    const live = await page.evaluate(() => [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')].map((e) => e.textContent).some((t) => /a{81,}/.test(t)));
    check('CA-S2 File.name émis inchangé (300 caractères) ; annonces plafonnées', (await ev(page, 'filesAdded'))[0]?.detail[0].name === LONG && !live, JSON.stringify({ live }));
    });

    await sec('CA-S3', async () => {
    // S3.
    await reset(page); const BIDI = 'facture‮fdp.exe', CTRL = 'a\u0007b‏c.pdf';
    await patch(page, { items: [item('b', BIDI), item('c', CTRL)] }); await rest(page);
    const s3 = await page.evaluate(() => { const bad = /[\u0000-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/; const th = Q.thumbs(); const txt = th.map((t) => t.textContent); const lab = [...Q.host().querySelectorAll('[aria-label]')].map((x) => x.getAttribute('aria-label')); return { badText: txt.some((t) => bad.test(t)), badLab: lab.some((l) => bad.test(l)), shown: txt.map((t) => t.includes('facturefdp.exe') || t.includes('abc.pdf')), bdi: th.every((t) => !!t.querySelector('bdi')), bdiTxt: th.map((t) => t.querySelector('bdi')?.textContent) }; });
    check('CA-S3 caractères de contrôle et marqueurs bidi retirés de l\'affichage et du nom accessible', !s3.badText && !s3.badLab && s3.shown.length === 2 && s3.shown.every(Boolean), JSON.stringify(s3));
    check('CA-S3 nom isolé dans <bdi> (facture‮fdp.exe ne s\'inverse pas)', s3.bdi && s3.bdiTxt[0] === 'facturefdp.exe', JSON.stringify(s3));
    await reset(page); await dropFiles(page, [{ name: 'facture‮fdp.png' }]);
    check('CA-S3 File.name émis inchangé (marqueur conservé)', (await ev(page, 'filesAdded'))[0]?.detail[0].name === 'facture‮fdp.png');
    });

    await sec('CA-S4', async () => {
    // S4.
    await reset(page);
    const reqs = []; await page.route(/evil\.example/, (r) => { reqs.push(r.request().url()); r.abort(); });
    const blob = await page.evaluate(async (png) => URL.createObjectURL(await (await fetch(png)).blob()), PNG);
    const bad = ['javascript:window.__alerted=true', 'data:text/html,<script>window.__alerted=true</script>', 'https://evil.example/x.png', 'http://evil.example/y.png'];
    const good = [blob, PNG, `${base}/favicon.svg`, '/favicon.svg'];
    await patch(page, { items: [...bad, ...good].map((u, i) => item(`s${i}`, `f${i}.png`, 'done', { previewUrl: u })) }); await rest(page);
    const s4 = await page.evaluate(() => Q.thumbs().map((t) => ({ img: t.querySelector('img')?.getAttribute('src') ?? null, icon: !!t.querySelector('svg, lc-icon') })));
    check('CA-S4 javascript:, data:text/html, http(s) d\'une autre origine : pas d\'<img>, icône de repli, aucun script, aucune requête vers le tiers', s4.length === 8 && s4.slice(0, 4).every((x) => x.img === null && x.icon) && !(await page.evaluate(() => window.__alerted)) && reqs.length === 0, JSON.stringify({ s4: s4.slice(0, 4), reqs }));
    check('CA-S4 blob:, data:image/, même origine : affichés par <img>', s4.length === 8 && s4.slice(4).every((x) => x.img !== null), JSON.stringify(s4.slice(4)));
    });

    // S6 : documentation (le type déclaré n'est pas un contrôle) et silence console.
    await reset(page); await patch(page, { accept: '.pdf' }); await dropFiles(page, [{ name: 'facture.pdf', type: '' }, { name: 'facture.pdf', type: 'application/x-msdownload' }]);
    check('CA-S6 (documentation) : un exécutable renommé facture.pdf (type vide ou application/x-msdownload) avec accept=".pdf" est accepté', (await ev(page, 'filesAdded'))[0]?.detail.length === 2 && (await ev(page, 'rejected')).length === 0, JSON.stringify(await ev(page)));
    await reset(page); await page.locator(TA).fill('SECRET-TEXTE-QA'); await dropFiles(page, [{ name: 'SECRET-NOM-QA.png' }, { name: 'SECRET-REFUS-QA.txt', type: 'text/plain' }]); await clickSend(page); await rest(page);
    check('CA-S6 aucun nom de fichier ni texte saisi dans la console', !page.logs.some((l) => /SECRET-(TEXTE|NOM|REFUS)-QA/.test(l)), page.logs.filter((l) => /SECRET/.test(l)).join(' | '));
    await page.close();
  });

  await withCtx('deskReduced', async (c) => {
    const page = await open(c); await dropFiles(page, [{ name: 'x.txt', type: 'text/plain' }]); await rest(page);
    const r = await page.evaluate(() => ({ red: Q.reduced(Q.host().parentElement), msg: !!Q.alert()?.textContent.includes('x.txt') }));
    check('CA-C8 réduction des animations : durée nulle (getAnimations), message affiché', r.red && r.msg, JSON.stringify(r));
    await page.close();
  });
}

// ---------- apparence : CA-C10 ----------
async function style() {
  await withCtx('desk', async (c) => {
    const page = await open(c);
    const R = () => page.evaluate(() => { const r = Q.rect(); const cs = getComputedStyle(r); const ic = (b) => getComputedStyle(b).color; return { bs: cs.borderTopStyle, bw: cs.borderTopWidth, bc: cs.borderTopColor, bg: cs.backgroundColor, att: ic(Q.attach()), send: ic(Q.send()), svg: Q.send().innerHTML, tp: cs.transitionProperty, td: cs.transitionDuration }; });
    const a = await R(); await patch(page, { note: true }); await rest(page); const b = await R();
    const exp = await page.evaluate(() => ({ w: Q.px('--lc-sys-border-width-thick'), warn: Q.probe('color:var(--lc-sys-color-warning)', 'color'), bg: Q.probe('background:var(--lc-sys-color-warning-container)', 'backgroundColor') }));
    check('CA-C10 classe d\'application : bordure en pointillés, épaisseur, couleur et fond redéfinis par les quatre tokens seulement', a.bs === 'solid' && b.bs === 'dashed' && near(parseFloat(b.bw), exp.w, 0.1) && b.bc === exp.warn && b.bg === exp.bg && a.bg !== b.bg, JSON.stringify({ a, b, exp }));
    check('CA-C10 le trombone, l\'envoi (icône et couleur principale) ne changent pas', a.att === b.att && a.send === b.send && a.svg === b.svg, JSON.stringify({ a: [a.att, a.send], b: [b.att, b.send] }));
    const tr = await page.evaluate(async () => { const r = Q.rect(); window.__composer.patch({ note: false }); await Q.raf(); const n = Q.ms('--lc-sys-duration-normal'); const an = r.getAnimations().map((x) => ({ p: x.transitionProperty, d: x.effect.getComputedTiming().duration })); return { an, n, tp: getComputedStyle(r).transitionProperty }; });
    check('CA-C10 couleur, épaisseur et fond de la bordure passent en duration-normal ; border-style n\'est pas animé', ['border-top-color', 'border-top-width', 'background-color'].every((p) => tr.an.some((x) => x.p === p && near(x.d, tr.n, 0.5))) && !/border-style|(^|,\s*)all\b/.test(tr.tp), JSON.stringify(tr));
    // Aucun jeton déclaré sur l'hôte : une valeur posée par un parent doit arriver au rectangle.
    const inh = await page.evaluate(async () => { const p = Q.host().parentElement; p.style.setProperty('--lc-message-composer-border-style', 'dotted'); p.style.setProperty('--lc-message-composer-background', 'rgb(1, 2, 3)'); await Q.raf(); const tr = Q.rect().getAnimations().some((a) => a.transitionProperty === 'background-color' && Math.abs(a.effect.getComputedTiming().duration - Q.ms('--lc-sys-duration-normal')) < 0.5); await Q.settle(); const cs = getComputedStyle(Q.rect()); return { bs: cs.borderTopStyle, bg: cs.backgroundColor, tr }; });
    check('CA-C10 aucun --lc-message-composer-* déclaré sur :host ni à l\'intérieur : la valeur d\'un ancêtre l\'emporte, fond en transition duration-normal, lu après sa fin', inh.bs === 'dotted' && inh.bg === 'rgb(1, 2, 3)' && inh.tr, JSON.stringify(inh));
    await page.close();
  });
  await withCtx('deskReduced', async (c) => {
    const page = await open(c); await patch(page, { note: true }); await rest(page);
    const r = await page.evaluate(() => ({ red: Q.reduced(Q.host()), td: getComputedStyle(Q.rect()).transitionDuration }));
    check('CA-C10 réduction des animations : transitions du rectangle supprimées', r.red && r.td.split(',').every((v) => parseFloat(v) * (v.trim().endsWith('ms') ? 1 : 1000) <= 0.01), JSON.stringify(r));
    await page.close();
  });
  await withCtx('deskForced', async (c) => {
    const page = await open(c);
    const f = await page.evaluate(() => ({ bc: getComputedStyle(Q.rect()).borderTopColor, ct: Q.probe('color:CanvasText', 'color'), send: getComputedStyle(Q.send()).color, bt: Q.probe('color:ButtonText', 'color') }));
    check('forced-colors : bordure CanvasText, envoi ButtonText', f.bc === f.ct && f.send === f.bt, JSON.stringify(f));
    await page.close();
  });
}

// ---------- axe : CA-C12 ----------
async function axe() {
  const STATES = {
    vide: async () => {},
    'items dont un en erreur': async (p) => patch(p, { items: [item('a', 'photo.png', 'done', { previewUrl: PNG }), item('u', 'up.pdf', 'uploading', { progress: 40 }), item('e', 'bad.pdf', 'error', { errorMessage: 'Réseau' })] }),
    'refus affiché': async (p) => dropFiles(p, [{ name: 'x.txt', type: 'text/plain' }]),
    'en-tête et classe note interne': async (p) => patch(p, { note: true }),
  };
  for (const [w, h] of [[360, 740], [1280, 800]]) for (const theme of ['default', 'dark']) for (const [name, make] of Object.entries(STATES)) {
    const c = await browser.newContext({ viewport: { width: w, height: h } });
    try {
      const page = await open(c, STORY, theme); await make(page); await page.evaluate(() => window.Q.settle()); await rest(page);
      await page.addScriptTag({ content: axeSource });
      const res = await page.evaluate(async () => { const run = await window.axe.run(document.querySelector('#storybook-root'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'] }); return { v: run.violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, t: x.nodes[0]?.target?.join(' ') })), scroll: document.documentElement.scrollWidth <= innerWidth }; });
      check(`CA-C12 axe ${w} px ${theme.padEnd(7)} « ${name} »`, res.v.length === 0 && res.scroll && page.errors.length === 0, JSON.stringify({ ...res, errors: page.errors }));
    } catch (e) { check(`CA-C12 axe ${w} px ${theme} « ${name} » : exception`, false, String(e.message).split('\n')[0]); } finally { await c.close(); }
  }
}

// ---------- CSP : CA-S5 ----------
async function cspMode() {
  csp = true;
  await withCtx('desk', async (c) => {
    const page = await open(c);
    const mark = await page.evaluate(() => window.__csp.length); // violations de Storybook et d'Angular, une fois l'histoire affichée
    check('CA-S5 sous la CSP de la spec, le composant est rendu', await page.locator(TA).count() === 1);
    await dropFiles(page, [{ name: 'p.png' }, { name: 'x.txt', type: 'text/plain' }]);
    await patch(page, { items: [item('p', 'photo.png', 'done', { previewUrl: PNG }), item('u', 'u.pdf', 'uploading', { progress: 30 })] });
    await page.locator(TA).fill(Array(10).fill('ligne').join('\n'));
    await page.evaluate(async () => { const dt = Q.dt([Q.file('p.png')]); Q.fire(Q.ta(), 'dragenter', dt); await Q.raf(); Q.fire(Q.ta(), 'dragleave', dt, { relatedTarget: document.body }); await Q.settle(); });
    await rest(page);
    check('CA-S5 précondition : les deux vignettes (aperçu data:image/ compris) sont rendues sous la CSP', (await page.evaluate(() => Q.thumbs().length)) === 2);
    const all = await page.evaluate(() => window.__csp); const fresh = all.slice(mark);
    const style = all.filter((v) => /^(img-src|script-src-attr|connect-src|default-src)|\|composant$/.test(v)); // image, réseau, ou tout élément du composant (attribut style compris)
    check('CA-S5 aucune violation CSP pendant dépôt, vignette, secousse et agrandissement (hors référence Storybook)', fresh.length === 0 && style.length === 0, JSON.stringify({ fresh, style, référence: all.slice(0, mark) }));
    await page.close();
  });
  csp = false;
}

try {
  const modes = { behaviour, files, style, axe, csp: cspMode };
  const [mode = 'all'] = process.argv.slice(2);
  for (const m of mode === 'all' ? Object.keys(modes) : [mode]) { if (!modes[m]) { console.error(`Usage : message-composer-browser.mjs ${Object.keys(modes).join('|')}|all`); failures += 1; break; } console.log(`# ${m}`); try { await modes[m](); } catch (e) { failures += 1; console.log(`KO  ${m} : exception ${String(e.message).split('\n')[0]}`); } }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} échec(s)` : 'tout est vert');
process.exit(failures > 0 ? 1 : 0);
