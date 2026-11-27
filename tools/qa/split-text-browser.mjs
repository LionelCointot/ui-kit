// lcSplitText et titre de lc-page en navigateur réel (spec 2026-12-mouvement-v2, T6) : CA-16, CA-3 (texte non découpé), CA-38 (story Animation), et le contrat de d01 / d02.
// Les valeurs attendues viennent de la spec (§5.3, §5.4.1) et des tokens lus dans le navigateur, jamais d'un nombre recopié de l'implémentation.
//   node tools/qa/split-text-browser.mjs        Storybook statique (STORYBOOK_DIR ou dist/storybook)
// Contrat de structure (la spec ne nomme aucune classe : le test se fonde sur la structure) :
//   lettre = `span` sans enfant élément, dans l'hôte, qui a un ancêtre (ou lui-même) `aria-hidden="true"` dans l'hôte ; contient un seul graphème ;
//   mot = `span` parent des lettres, un par mot, `overflow` hidden ou clip (le masque) ; les espaces ne sont pas des lettres ;
//   hôte : `aria-label` = texte complet ; sous mouvement réduit : aucun `span` dans l'hôte, texte brut.
//   lc-page : le `h1` porte `tabindex="-1"` et `lcSplitText` ; le trait est un élément `aria-hidden="true"` à classe `lc-page__line`, frère suivant du `h1`
//   (dans `.lc-page__heading`), `transform-origin` à gauche, entrée en `scale` / `transform` de 0 à 1.
// Stories : `qa-motion-split-text-acceptance--text` et `--page` (split-text.acceptance.qa.stories.ts), `layout-page--animation` (data-demo d01 « Projets », d02 « Rapports », chacun avec son « Rejouer »).
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const story = (name) => `qa-motion-split-text-acceptance--${name}`;

const server = await staticServer(storybookDir);
const { base } = server;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };
const section = async (n, fn) => { try { await fn(); } catch (error) { check(false, `bloc ${n} interrompu`, error.message.split('\n')[0]); } };
const near = (a, b, eps = 0.6) => Math.abs(a - b) <= eps;

/** Lecture dans la page : tokens, lettres, mots, pose (translate · rotate · scale · transform), animation d'un élément. */
const INIT = () => {
  const root = () => getComputedStyle(document.documentElement);
  const ms = (n) => { const v = root().getPropertyValue(n).trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible : ${n}="${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  const flat = (s) => { const n = s.match(/-?\d*\.?\d+/g); return n ? n.map(Number).join(',') : s.trim(); };
  const raw = (n) => flat(root().getPropertyValue(n));
  const letters = (host) => [...host.querySelectorAll('span')].filter((s) => !s.querySelector('*') && s.closest('[aria-hidden="true"]') && host.contains(s.closest('[aria-hidden="true"]')) && s.textContent.trim() !== '');
  const words = (host) => [...host.querySelectorAll('span')].filter((s) => s.querySelector('span') && s.querySelectorAll(':scope > span').length > 0);
  const graphemes = (t) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map((x) => x.segment).filter((g) => g.trim() !== '');
  const pose = (el) => {
    const cs = getComputedStyle(el);
    // `translate` calculé garde les pourcentages (largeur / hauteur de la boîte) : on les résout en px.
    const t = cs.translate === 'none' ? [0, 0] : cs.translate.split(' ').map((v, i) => (v.endsWith('%') ? (parseFloat(v) / 100) * (i ? el.offsetHeight : el.offsetWidth) : parseFloat(v)));
    const m = new DOMMatrix().translateSelf(t[0] || 0, t[1] || 0);
    if (cs.rotate !== 'none') m.rotateSelf(parseFloat(cs.rotate));
    if (cs.scale !== 'none') { const s = cs.scale.split(' ').map(parseFloat); m.scaleSelf(s[0], s[1] ?? s[0]); }
    if (cs.transform !== 'none') m.multiplySelf(new DOMMatrix(cs.transform));
    return { dx: m.e, dy: m.f, sx: Math.hypot(m.a, m.b), rot: (Math.atan2(m.b, m.a) * 180) / Math.PI, opacity: parseFloat(cs.opacity), translate: cs.translate };
  };
  /** Animation finie de l'élément (CSS ou WAAPI), état de départ relevé en la mettant en pause à 0. */
  const anim = (el) => el.getAnimations().find((a) => Number.isFinite(a.effect.getComputedTiming().endTime));
  /** La courbe d'`animation-timing-function` d'une CSSAnimation se lit sur les keyframes (`getTiming().easing` vaut toujours `linear`). */
  const info = (a) => { const c = a.effect.getComputedTiming(); return { delay: c.delay, duration: c.duration, easing: flat(a.effect.getKeyframes()[0].easing), props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)))] }; };
  window.__st = { ms, flat, raw, letters, words, graphemes, pose, anim, info };
};

async function open(id, { reduced = false, width = 1280 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector('#storybook-root > *', { timeout: 20000 });
  return { page, context, errors };
}
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Pose de chaque lettre et de la ligne à t = 0 (animations en pause), tokens et temporisations. */
const probe = (page, host, line) => page.evaluate(([host, line]) => {
  const { letters, pose, anim, info, ms, raw } = window.__st;
  const el = document.querySelector(host);
  const ls = letters(el);
  const rows = ls.map((l) => { const a = anim(l); if (!a) return { text: l.textContent, none: true }; a.pause(); a.currentTime = 0; return { text: l.textContent, ...info(a), ...pose(l), h: l.offsetHeight }; });
  let lineRow = null;
  if (line) {
    const ln = document.querySelector(line);
    const a = ln && anim(ln);
    if (a) { a.pause(); a.currentTime = 0; lineRow = { ...info(a), ...pose(ln), origin: getComputedStyle(ln).transformOrigin, hidden: ln.getAttribute('aria-hidden') }; }
  }
  const probeRot = document.createElement('i'); probeRot.style.cssText = 'rotate:var(--lc-sys-motion-rotate-char);position:absolute'; document.body.append(probeRot);
  const tokenRot = parseFloat(getComputedStyle(probeRot).rotate); probeRot.remove();
  return { rows, lineRow, tokens: { stagger: ms('--lc-sys-motion-stagger-chars'), duration: ms('--lc-sys-duration-title'), easing: raw('--lc-sys-easing-title'), lineEasing: raw('--lc-sys-easing-inout'), rot: tokenRot } };
}, [host, line]);

/** CA-16 : départ des lettres (115 % et 6°, sans fondu), décalage, durée, courbe aux tokens. */
function checkLetters(label, got, expectedGraphemes) {
  const { rows, tokens: t } = got;
  check(rows.length === expectedGraphemes.length && rows.every((r, i) => r.text === expectedGraphemes[i]), `CA-16 ${label} lettres = graphèmes`, `${JSON.stringify(rows.map((r) => r.text))} attendu ${JSON.stringify(expectedGraphemes)}`);
  check(rows.length > 0 && rows.every((r) => !r.none), `CA-16 ${label} chaque lettre a une animation finie`, `${rows.filter((r) => r.none).length}/${rows.length} sans animation`);
  const ok = rows.filter((r) => !r.none);
  check(ok.length > 0 && ok.every((r) => near(r.dy, 1.15 * r.h, 0.01 * 1.15 * r.h + 0.5) && near(r.dx, 0, 0.5)), `CA-16 ${label} départ ≈ 115 % de la hauteur de la lettre`, JSON.stringify(ok.map((r) => [r.dy, 1.15 * r.h])));
  check(ok.length > 0 && ok.every((r) => near(r.rot, 6, 0.1)) && near(t.rot, 6, 0.01), `CA-16 ${label} rotation de départ 6° (token inclus)`, JSON.stringify(ok.map((r) => r.rot)) + ` token=${t.rot}`);
  check(ok.every((r) => r.props.every((p) => ['translate', 'rotate'].includes(p))) && ok.every((r) => near(r.opacity, 1, 0.001)), `CA-5 ${label} lettres : translate et rotate seulement, pas de fondu`, JSON.stringify(ok.map((r) => r.props)));
  check(ok.every((r, i) => near(r.delay, i * t.stagger, 0.5)), `CA-16 ${label} décalage = i × stagger-chars`, JSON.stringify(ok.map((r) => r.delay)) + ` pas=${t.stagger}`);
  check(ok.every((r) => near(r.duration, t.duration, 0.5) && r.easing === t.easing), `CA-16 ${label} durée et courbe = sys.duration.title / sys.easing.title`, JSON.stringify(ok.map((r) => [r.duration, r.easing])) + ` attendu ${t.duration} ${t.easing}`);
}

// ---------- CA-16 : lcSplitText nu, mouvement normal ----------
await section(1, async () => {
  const { page, context, errors } = await open(story('text'));
  await frames(page);
  const a = await page.evaluate(() => {
    const { letters, words, graphemes } = window.__st;
    const out = {};
    for (const id of ['t', 'g-accent', 'g-family', 'g-flag', 'g-words']) {
      const el = document.getElementById(id);
      const text = id === 't' ? 'Projets' : id === 'g-accent' ? 'Café' : id === 'g-family' ? '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}' : id === 'g-flag' ? '\u{1F1EB}\u{1F1F7}' : 'Un deux trois';
      out[id] = { text, label: el.getAttribute('aria-label'), letters: letters(el).map((l) => l.textContent), expected: graphemes(text), hidden: letters(el).every((l) => l.closest('[aria-hidden="true"]')), words: words(el).map((w) => getComputedStyle(w).overflowX), textContent: el.textContent.replace(/\s/g, '') };
    }
    return out;
  });
  for (const [id, r] of Object.entries(a)) {
    check(r.label === r.text, `CA-16 #${id} aria-label = texte complet`, `${JSON.stringify(r.label)}`);
    check(r.letters.length > 0 && r.hidden, `CA-16 #${id} lettres aria-hidden`, `${r.letters.length} lettres`);
    check(JSON.stringify(r.letters) === JSON.stringify(r.expected), `CA-16 #${id} graphèmes entiers (Intl.Segmenter)`, `${JSON.stringify(r.letters)} attendu ${JSON.stringify(r.expected)}`);
  }
  check(a['g-accent'].letters.length === 4 && a['g-family'].letters.length === 1 && a['g-flag'].letters.length === 1, 'CA-16 e + accent = 1 lettre, famille = 1, drapeau = 1', JSON.stringify([a['g-accent'].letters.length, a['g-family'].letters.length, a['g-flag'].letters.length]));
  check(a['g-words'].words.length === 3 && a['g-words'].words.every((o) => o === 'hidden' || o === 'clip'), 'CA-16 un masque (overflow hidden/clip) par mot', JSON.stringify(a['g-words'].words));
  checkLetters('#t', await probe(page, '#t'), ['P', 'r', 'o', 'j', 'e', 't', 's']);
  // Changer le texte met à jour l'affichage et l'aria-label, sans lettre résiduelle.
  await page.click('#change');
  await frames(page);
  const b = await page.evaluate(() => { const { letters } = window.__st; const el = document.getElementById('t'); return { label: el.getAttribute('aria-label'), letters: letters(el).map((l) => l.textContent), text: el.textContent }; });
  check(b.label === 'Rapports' && b.letters.join('') === 'Rapports' && b.letters.length === 8, 'CA-16 changer le texte met à jour lettres et aria-label', JSON.stringify(b));
  checkLetters('#t après changement', await probe(page, '#t'), [...'Rapports']);
  check(errors.length === 0, 'CA-16 aucune erreur de page', errors.join(' ; '));
  await context.close();
});

// ---------- CA-16 / CA-3 : mouvement réduit, texte non découpé ----------
await section(2, async () => {
  const { page, context, errors } = await open(story('text'), { reduced: true });
  await frames(page);
  const r = await page.evaluate(() => {
    const out = {};
    for (const id of ['t', 'g-accent', 'g-family', 'g-flag', 'g-words']) { const el = document.getElementById(id); out[id] = { spans: el.querySelectorAll('span').length, text: el.textContent }; }
    return { out, running: document.getAnimations().filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)).length };
  });
  check(Object.values(r.out).every((o) => o.spans === 0), 'CA-16 / CA-3 mouvement réduit : aucun span de lettre', JSON.stringify(r.out));
  check(r.out.t.text === 'Projets' && r.out['g-words'].text === 'Un deux trois', 'CA-3 texte de l\'hôte conservé', JSON.stringify(r.out.t));
  check(r.running === 0, 'CA-3 aucune animation en cours', `${r.running}`);
  await page.click('#change');
  await frames(page);
  const c = await page.evaluate(() => { const el = document.getElementById('t'); return { spans: el.querySelectorAll('span').length, text: el.textContent }; });
  check(c.spans === 0 && c.text === 'Rapports', 'CA-3 changer le texte sous mouvement réduit : toujours non découpé', JSON.stringify(c));
  check(errors.length === 0, 'CA-3 aucune erreur de page (réduit)', errors.join(' ; '));
  await context.close();
});

// ---------- lc-page : titre, focus, trait (§5.4.1) ----------
const PAGE_H1 = 'lc-page h1';
const PAGE_LINE = 'lc-page .lc-page__line';
await section(3, async () => {
  const { page, context } = await open(story('page'));
  await frames(page);
  const f = await page.evaluate(() => { const h = document.querySelector('lc-page h1'); h.focus(); return { tabindex: h.getAttribute('tabindex'), focused: document.activeElement === h, label: h.getAttribute('aria-label'), next: h.nextElementSibling?.className ?? null }; });
  check(f.tabindex === '-1' && f.focused, 'CA-16 (T6) h1 de lc-page : tabindex="-1" et focus programmatique', JSON.stringify(f));
  check(f.label === 'Projets', 'CA-16 (T6) h1 de lc-page : aria-label = titre', JSON.stringify(f));
  const got = await probe(page, PAGE_H1, PAGE_LINE);
  checkLetters('lc-page', got, [...'Projets']);
  const l = got.lineRow, t = got.tokens;
  check(!!l && l.hidden === 'true', 'T6 trait : élément .lc-page__line aria-hidden avec animation finie', JSON.stringify(l));
  check(!!l && near(l.duration, 700, 0.5), 'T6 trait : 700 ms (Talmo)', `${l?.duration}`);
  check(!!l && l.easing === t.lineEasing, 'T6 trait : courbe inout (sys.easing.inout)', `${l?.easing} attendu ${t.lineEasing}`);
  check(!!l && near(l.delay - got.rows[0].delay, 320, 0.5), 'T6 trait : démarre 320 ms après la première lettre', `${l?.delay} - ${got.rows[0]?.delay}`);
  check(!!l && near(l.sx, 0, 0.001) && /^0(px|%)?\b/.test(l.origin), 'T6 trait : de scaleX 0 depuis la gauche', `sx=${l?.sx} origine=${l?.origin}`);
  check(!!l && l.props.every((p) => ['scale', 'transform'].includes(p)), 'CA-5 trait : scale / transform seulement', JSON.stringify(l?.props));
  await context.close();
});
await section(4, async () => {
  const { page, context } = await open(story('page'), { reduced: true });
  await frames(page);
  const r = await page.evaluate(() => {
    const h = document.querySelector('lc-page h1'); const ln = document.querySelector('lc-page .lc-page__line');
    return { spans: h.querySelectorAll('span').length, text: h.textContent, tabindex: h.getAttribute('tabindex'), line: ln ? { sx: window.__st.pose(ln).sx, running: ln.getAnimations().filter((a) => a.playState === 'running' || a.pending).length, anims: ln.getAnimations().length, w: ln.getBoundingClientRect().width } : null };
  });
  check(r.spans === 0 && r.text === 'Projets' && r.tabindex === '-1', 'CA-3 (T6) lc-page sous mouvement réduit : titre non découpé, tabindex="-1"', JSON.stringify(r));
  check(!!r.line && near(r.line.sx, 1, 0.001) && r.line.running === 0 && r.line.w > 0, 'CA-3 (T6) trait sous mouvement réduit : tracé tout de suite, aucune animation en cours', JSON.stringify(r.line));
  await context.close();
});

// ---------- CA-38 / d01 / d02 : story Animation de lc-page ----------
await section(5, async () => {
  const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
  check(!!index.entries['layout-page--animation'], 'CA-38 story layout-page--animation dans l\'index', 'absente');
  const { page, context } = await open('layout-page--animation');
  for (const [demo, title] of [['d01', 'Projets'], ['d02', 'Rapports']]) {
    const sel = `[data-demo="${demo}"]`;
    const n = await page.locator(`${sel} >> button:has-text("Rejouer")`).count();
    check(n === 1, `${demo} : un bouton « Rejouer » dans [data-demo="${demo}"]`, `${n}`);
    if (n !== 1) continue;
    await page.evaluate((s) => { window.__before = document.querySelector(s + ' h1').getAnimations({ subtree: true }).length; }, sel);
    await page.click(`${sel} >> button:has-text("Rejouer")`);
    await frames(page);
    const r = await page.evaluate((s) => { const root = document.querySelector(s); const h = root.querySelector('h1'); return { label: h.getAttribute('aria-label'), running: root.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' || a.pending).length, letters: window.__st.letters(h).length }; }, sel);
    check(r.label === title && r.letters === title.length && r.running >= title.length + 1, `${demo} Rejouer relance les ${title.length} lettres et le trait`, JSON.stringify(r));
  }
  await context.close();
});

await browser.close();
server?.close();
console.log(failures === 0 ? 'split-text-browser : tout est OK' : `split-text-browser : ${failures} KO`);
process.exit(failures === 0 ? 0 : 1);
