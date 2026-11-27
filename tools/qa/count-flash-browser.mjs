// lcCountUp et lcFlash en navigateur réel (spec 2026-12-mouvement-v2, T5) : CA-3, CA-14, CA-15, CA-38 (stories Animation).
// Les valeurs attendues viennent de la spec (§5.2, §5.3) : textes calculés par Intl (fr-FR, EUR), durées et couleurs lues dans les tokens, jamais recopiées de la sortie du code.
//   node tools/qa/count-flash-browser.mjs        Storybook statique (STORYBOOK_DIR ou dist/storybook)
// Stories (packages/angular/src/lib/motion/stories/count-flash.acceptance.qa.stories.ts, titre QA/Motion/Count flash acceptance) :
//   count : `#show` / `#hide` (zone `#zone`), `#to-1850` (1200 → 1850) ; `#cu` (number, porte `data-sample`, dans `#live[aria-live=polite]`), `#cu-int`, `#cu-pct` (12), `#cu-money`, `#cu-fn` (« #<valeur> »)
//   flash : `#show`, `#bump` (+1), `#same` (même valeur) ; `#fl` (72) dans `#wrap` (couleur rgb(10, 20, 30))
// Contrat pour le développeur (choix où la spec ne tranche pas) :
//   - `lcFlash` : l'hôte porte la classe `lc-flash` tant que la directive est posée (sélecteur de la liste blanche de CA-5) ; l'animation (CSS ou WAAPI) porte sur l'hôte, `color` seulement,
//     de `--lc-sys-color-primary` vers la couleur héritée, durée `--lc-flash-duration`, courbe `--lc-flash-easing` ; un nouveau changement pendant un flash le relance (jamais deux animations en même temps).
//   - `lcCountUp` : durée `--lc-sys-duration-draw` (1100 ms), courbe `--lc-sys-easing-out` ; aucune région `aria-live`, aucun attribut ARIA ajouté.
//   - stories Animation : `layout-count-up--animation` (élément `[data-sample]` au repos sur sa valeur finale, bouton « Rejouer » qui recompte) et `layout-flash--animation` (« Rejouer » change la valeur).
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const story = (name) => `qa-motion-count-flash-acceptance--${name}`;

const server = await staticServer(storybookDir);
const { base } = server;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };
const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
const section = async (name, fn) => { try { await fn(); } catch (error) { check(false, `${name} : le bloc a levé`, String(error.message).split('\n')[0]); } };

const INIT = () => {
  // Suivi de requestAnimationFrame / cancelAnimationFrame (CA-14 : annulation à la destruction).
  const raf = window.requestAnimationFrame.bind(window), caf = window.cancelAnimationFrame.bind(window);
  const pending = new Set(); const cancelled = [];
  window.requestAnimationFrame = (cb) => { const id = raf((t) => { pending.delete(id); cb(t); }); pending.add(id); return id; };
  window.cancelAnimationFrame = (id) => { if (pending.delete(id)) cancelled.push(id); caf(id); };
  window.__raf = { pending, cancelled };
  const ms = (name) => { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible : ${name}="${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  const flat = (s) => { const n = s.match(/-?\d*\.?\d+/g); return n ? n.map(Number).join(',') : s.trim(); };
  const color = (value) => { const p = document.createElement('span'); p.style.color = value; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  // Clique `button` puis relève, à chaque image pendant `duration` ms, le texte de chaque sélecteur (null : absent).
  const sample = (button, selectors, duration) => new Promise((resolve) => {
    const out = []; const t0 = performance.now();
    if (button) document.getElementById(button).click();
    const tick = () => {
      const t = performance.now() - t0;
      out.push({ t, texts: selectors.map((s) => document.querySelector(s)?.textContent ?? null) });
      if (t > duration) resolve(out); else requestAnimationFrame(tick);
    };
    tick();
  });
  const live = () => [...document.querySelectorAll('[aria-live],[role=status],[role=alert],[role=log],[aria-atomic],[aria-busy]')].map((e) => `${e.tagName}#${e.id}:${[...e.attributes].map((a) => `${a.name}=${a.value}`).sort().join(',')}`);
  window.__qa = { ms, flat, color, sample, live };
};

async function open(id, { reduced = false, width = 1280, wait = '#storybook-root > *' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForSelector(wait, { timeout: 20000 });
  return { page, context, errors };
}
const frames = (page, n = 2) => page.evaluate(async (n) => { for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(resolve)); }, n);
const idle = (page, timeout = 15000) => page.waitForFunction(() => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)), null, { timeout });
const sample = (page, button, selectors, duration) => page.evaluate(([b, s, d]) => window.__qa.sample(b, s, d), [button, selectors, duration]);

/** Textes attendus, calculés par Intl (fr-FR, EUR) : « number » = 2 décimales, « integer » = 0, comme `lc-data-table` ; « percent » : 12 → « 12,00 % ». */
const EXPECTED = (page, value) => page.evaluate((v) => {
  const f = (o) => new Intl.NumberFormat('fr-FR', o).format(v);
  return { number: f({ minimumFractionDigits: 2, maximumFractionDigits: 2 }), integer: f({ minimumFractionDigits: 0, maximumFractionDigits: 0 }), money: f({ style: 'currency', currency: 'EUR' }),
    percent: new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(12 / 100), fn: `#${v}` };
}, value);
const num = (t) => parseFloat(t.replace(/[^\d,.-]/g, '').replace(',', '.'));
const monotone = (list) => list.every((v, i) => i === 0 || v >= list[i - 1]);

// ---------- CA-14 : compteur, première apparition, changement, ARIA, annulation ----------
await section('CA-14', async () => {
  const { page, context, errors } = await open(story('count'), { wait: '#show' });
  const liveBefore = await page.evaluate(() => window.__qa.live());
  const run = await sample(page, 'show', ['#cu', '#cu-int', '#cu-pct', '#cu-money', '#cu-fn'], 1600);
  const seen = run.filter((r) => r.texts[0] !== null);
  const exp = await EXPECTED(page, 1200);
  const cu = seen.map((r) => r.texts[0]);
  const values = cu.map(num);
  const distinct = new Set(cu).size;
  check(seen.length > 0 && values[0] < 0.5 * 1200, 'CA-14 première apparition : le premier texte vu est près de 0 (compte depuis 0)', `premier=${cu[0]}`);
  check(monotone(values) && distinct >= 6, 'CA-14 première apparition : échantillons rAF monotones (≥ 6 valeurs distinctes)', `distinctes=${distinct} valeurs=${[...new Set(cu)].slice(0, 12)}`);
  check(cu.at(-1) === exp.number, 'CA-14 fin à la valeur exacte formatée (number : 2 décimales)', `fin=${cu.at(-1)} attendu=${exp.number}`);
  const lastChange = seen.findLast((r, i) => i === 0 || r.texts[0] !== seen[i - 1].texts[0]);
  const dur = await page.evaluate(() => window.__qa.ms('--lc-sys-duration-draw'));
  check(lastChange && lastChange.t - seen[0].t >= 0.6 * dur && lastChange.t - seen[0].t <= dur + 400, `CA-14 durée du compte ≈ --lc-sys-duration-draw (${dur} ms)`, `dernier changement à ${lastChange && Math.round(lastChange.t - seen[0].t)} ms`);
  // Arrondi selon le format, à chaque image.
  const col = (i) => run.map((r) => r.texts[i]).filter((t) => t !== null);
  check(col(1).every((t) => !/[,.]\d/.test(t.replace(/ | /g, ''))) && col(1).at(-1) === exp.integer, 'CA-14 integer : jamais de décimale, fin exacte', `fin=${col(1).at(-1)} attendu=${exp.integer}`);
  check(col(3).every((t) => /,\d{2}\D*€$/.test(t)) && col(3).at(-1) === exp.money, 'CA-14 money : 2 décimales et € à chaque image, fin exacte', `fin=${col(3).at(-1)} attendu=${exp.money}`);
  check(monotone(col(2).map(num)) && col(2).at(-1) === exp.percent, 'CA-14 percent : monotone, fin exacte (12 → « 12,00 % »)', `fin=${col(2).at(-1)} attendu=${exp.percent}`);
  check(col(4).at(-1) === exp.fn, 'CA-14 format fonction : fin = sortie de la fonction fournie', `fin=${col(4).at(-1)}`);
  // ARIA : seule la région du consommateur existe, inchangée ; la directive n'ajoute rien.
  const liveAfter = await page.evaluate(() => window.__qa.live());
  check(liveBefore.length === 0 && liveAfter.length === 1 && liveAfter[0] === 'P#live:aria-live=polite,id=live', 'CA-14 aucune région aria-live ajoutée ni modifiée (seule #live, intacte)', JSON.stringify({ liveBefore, liveAfter }));
  const attrs = await page.evaluate(() => ['cu', 'cu-int', 'cu-pct', 'cu-money', 'cu-fn'].map((id) => [...document.getElementById(id).attributes].map((a) => a.name).filter((n) => /^(aria-|role)/.test(n))));
  check(attrs.every((a) => a.length === 0), 'CA-14 aucun attribut ARIA ni role ajouté sur les éléments comptés', JSON.stringify(attrs));

  // Changement : de l'ancienne à la nouvelle valeur (1200 → 1850), sans repasser par 0.
  const change = await sample(page, 'to-1850', ['#cu'], 1600);
  const exp2 = await EXPECTED(page, 1850);
  const after = change.map((r) => r.texts[0]);
  const after1850 = after.map(num);
  check(after1850.every((v) => v >= 1200) && monotone(after1850) && new Set(after).size >= 6, 'CA-14 changement : monte de 1 200 vers 1 850, monotone, sans retour à 0', `min=${Math.min(...after1850)} distinctes=${new Set(after).size}`);
  check(after.at(-1) === exp2.number, 'CA-14 changement : fin à la nouvelle valeur exacte', `fin=${after.at(-1)} attendu=${exp2.number}`);
  check(JSON.stringify(await page.evaluate(() => window.__qa.live())) === JSON.stringify(liveAfter), 'CA-14 aucune région aria-live modifiée au changement');

  // Destruction en plein compte : cancelAnimationFrame appelé, texte figé.
  await page.evaluate(() => document.getElementById('hide').click()); // retire d'abord la zone (compte terminé), puis on la recrée
  await frames(page, 3);
  await page.evaluate(() => document.getElementById('show').click());
  await page.waitForSelector('#cu');
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 300)));
  const destroyed = await page.evaluate(async () => {
    const node = document.getElementById('cu');
    const pendingBefore = [...window.__raf.pending];
    const cancelledBefore = window.__raf.cancelled.length;
    document.getElementById('hide').click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const frozen = node.textContent;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { connected: node.isConnected, frozen, later: node.textContent, cancelled: window.__raf.cancelled.slice(cancelledBefore).filter((id) => pendingBefore.includes(id)).length, pendingBefore: pendingBefore.length };
  });
  check(!destroyed.connected && destroyed.pendingBefore > 0 && destroyed.cancelled > 0, 'CA-14 destruction en plein compte : cancelAnimationFrame appelé sur un rAF en attente', JSON.stringify(destroyed));
  check(destroyed.frozen === destroyed.later, 'CA-14 destruction : le texte de l\'élément retiré ne change plus', `${destroyed.frozen} → ${destroyed.later}`);
  check(errors.length === 0, 'erreurs de page (compteur)', errors.join(' ; '));
  await context.close();
});

// ---------- CA-3 : compteur à sa valeur finale sous mouvement réduit (360 et 1280 px) ----------
for (const width of [1280, 360]) {
  await section(`CA-3 compteur ${width}`, async () => {
    const { page, context } = await open(story('count'), { reduced: true, width, wait: '#show' });
    const run = await sample(page, 'show', ['#cu', '#cu-money'], 1200);
    const exp = await EXPECTED(page, 1200);
    const seen = new Set(run.map((r) => r.texts[0]).filter((t) => t !== null));
    check(seen.size === 1 && seen.has(exp.number), `CA-3 ${width}px réduit : le compteur n'affiche que sa valeur finale (aucune valeur intermédiaire)`, JSON.stringify([...seen]));
    check(new Set(run.map((r) => r.texts[1]).filter((t) => t !== null)).size === 1, `CA-3 ${width}px réduit : money, aucune valeur intermédiaire`);
    const change = await sample(page, 'to-1850', ['#cu'], 900);
    const exp2 = await EXPECTED(page, 1850);
    const texts = new Set(change.map((r) => r.texts[0]));
    check([...texts].every((t) => t === exp.number || t === exp2.number) && change.at(-1).texts[0] === exp2.number, `CA-3 ${width}px réduit : le changement saute à la nouvelle valeur finale`, JSON.stringify([...texts]));
    await page.evaluate(() => window.__qa.ms('--lc-sys-duration-draw')); // jetons lisibles
    check(await page.evaluate(() => !document.getAnimations().some((a) => a.playState === 'running' || a.pending)), `CA-3 ${width}px réduit : aucune animation en cours`);
    await context.close();
  });
}

// ---------- CA-15 : lcFlash ----------
await section('CA-15', async () => {
  const { page, context, errors } = await open(story('flash'), { wait: '#show' });
  const own = (page) => page.evaluate(() => { const el = document.getElementById('fl'); return el.getAnimations().map((a) => ({ state: a.playState, props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)))] })); });
  // Première valeur : aucun flash pendant 1,2 s (couleur constante, aucune animation).
  const first = await page.evaluate(async () => {
    document.getElementById('show').click();
    const t0 = performance.now(); const colors = new Set(); let max = 0; let seen = false;
    while (performance.now() - t0 < 1200) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const el = document.getElementById('fl');
      if (el) { seen = true; colors.add(getComputedStyle(el).color); max = Math.max(max, el.getAnimations().length); }
    }
    return { seen, colors: [...colors], max, hasClass: document.getElementById('fl')?.classList.contains('lc-flash') };
  });
  check(first.seen && first.max === 0 && first.colors.length === 1 && first.colors[0] === 'rgb(10, 20, 30)', 'CA-15 première valeur : aucun flash (aucune animation, couleur du texte constante)', JSON.stringify(first));
  check(first.hasClass === true, 'CA-15 l\'hôte porte la classe lc-flash (sélecteur de la liste blanche de CA-5)', String(first.hasClass));

  // Même valeur : pas de flash.
  await page.evaluate(() => document.getElementById('same').click());
  await frames(page, 4);
  check((await own(page)).length === 0, 'CA-15 même valeur réécrite : aucun flash');

  // Changement : un flash, couleur et durée des tokens.
  await page.evaluate(() => document.getElementById('bump').click());
  await frames(page, 3);
  const list = await own(page);
  check(list.length === 1 && list[0].props.join() === 'color', 'CA-15 un changement : une animation sur l\'hôte, propriété color seulement', JSON.stringify(list));
  const m = await page.evaluate(() => {
    const { ms, flat, color } = window.__qa;
    const el = document.getElementById('fl');
    const a = el.getAnimations()[0];
    if (!a) return null;
    const root = getComputedStyle(document.documentElement);
    const accent = color('var(--lc-sys-color-primary)');
    const duration = a.effect.getComputedTiming().endTime;
    const easings = [a.effect.getTiming().easing, ...a.effect.getKeyframes().map((k) => k.easing)].map(flat);
    a.pause(); a.currentTime = 0; const start = getComputedStyle(el).color;
    a.currentTime = duration; const end = getComputedStyle(el).color;
    a.finish();
    return { accent, start, end, duration, token: ms('--lc-flash-duration'), easings, tokenEasing: flat(root.getPropertyValue('--lc-flash-easing')), text: el.textContent, aria: [...el.attributes].map((x) => x.name).filter((n) => /^(aria-|role)/.test(n)) };
  });
  check(!!m && m.start === m.accent && m.start !== 'rgb(10, 20, 30)', 'CA-15 le flash part de la couleur d\'accent (--lc-sys-color-primary)', JSON.stringify(m));
  check(!!m && m.end === 'rgb(10, 20, 30)', 'CA-15 le flash revient à la couleur du texte', JSON.stringify(m));
  check(!!m && near(m.duration, m.token, 0.5) && m.token === 950, `CA-15 durée = --lc-flash-duration (950 ms)`, JSON.stringify(m));
  check(!!m && m.easings.includes(m.tokenEasing), 'CA-15 courbe = --lc-flash-easing', JSON.stringify(m));
  check(!!m && m.text === '73' && m.aria.length === 0, 'CA-15 le texte n\'est pas touché et aucun attribut ARIA n\'est ajouté', JSON.stringify(m));

  // Un flash à chaque changement, relancé (jamais empilé) si un changement arrive pendant le flash.
  await idle(page);
  await page.evaluate(() => document.getElementById('bump').click());
  await frames(page, 3);
  check((await own(page)).length === 1, 'CA-15 second changement : un nouveau flash');
  await page.evaluate(() => { document.getElementById('bump').click(); });
  await frames(page, 3);
  check((await own(page)).filter((a) => a.state === 'running').length === 1, 'CA-15 changement pendant un flash : relancé, une seule animation en cours');
  check(errors.length === 0, 'erreurs de page (flash)', errors.join(' ; '));
  await context.close();
});

// ---------- CA-3 : lcFlash sous mouvement réduit (360 et 1280 px) ----------
for (const width of [1280, 360]) {
  await section(`CA-3 flash ${width}`, async () => {
    const { page, context } = await open(story('flash'), { reduced: true, width, wait: '#show' });
    await page.evaluate(() => document.getElementById('show').click());
    await page.waitForSelector('#fl');
    await page.evaluate(() => document.getElementById('bump').click());
    await frames(page, 3);
    const got = await page.evaluate(() => { const el = document.getElementById('fl'); return { anims: el.getAnimations().filter((a) => a.playState === 'running' || a.pending).length, longest: Math.max(0, ...el.getAnimations().map((a) => a.effect.getComputedTiming().endTime)), color: getComputedStyle(el).color, text: el.textContent }; });
    check(got.anims === 0 && got.longest <= 0.01 && got.color === 'rgb(10, 20, 30)' && got.text === '73', `CA-3 ${width}px réduit : aucun flash (rien en cours, couleur du texte, nouvelle valeur affichée)`, JSON.stringify(got));
    await context.close();
  });
}

// ---------- CA-38, CA-3, CA-5 : stories Animation (mesurées aussi par la boucle de `storybook-browser.mjs motion`) ----------
await section('CA-38', async () => {
  const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8').catch(() => '{"entries":{}}'));
  for (const id of ['layout-count-up--animation', 'layout-flash--animation']) {
    const entry = index.entries[id];
    check(!!entry, `CA-38 la story ${id} existe dans l'index`, 'story absente de dist/storybook/index.json');
    if (!entry) continue;
    const { page, context } = await open(id);
    const buttons = await page.getByRole('button', { name: 'Rejouer' }).count();
    check(buttons >= 1, `CA-38 ${id} porte un bouton « Rejouer »`, `${buttons}`);
    if (id.includes('count-up')) {
      // Le premier comptage tourne en rAF (que `idle` n'attend pas) : le repos est le texte inchangé sur 5 images, lu après.
      await page.waitForFunction(() => { const el = document.querySelector('[data-sample]'); const w = window.__restWatch ??= { t: el.textContent, n: 0 }; w.n = el.textContent === w.t ? w.n + 1 : 0; w.t = el.textContent; return w.n >= 5; }, null, { polling: 'raf', timeout: 5000 });
      await idle(page).catch(() => undefined);
      const rest = await page.locator('[data-sample]').first().textContent();
      const run = await page.evaluate(() => window.__qa.sample(null, ['[data-sample]'], 0)); // texte au repos
      const clickRun = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Rejouer')); const p = window.__qa.sample(null, ['[data-sample]'], 1600); b.click(); return p; });
      const texts = clickRun.map((r) => r.texts[0]).filter((t) => t !== null);
      const values = texts.map(num);
      check(!!rest && run[0].texts[0] === rest && texts.at(-1) === rest, 'CA-14 story Animation : « Rejouer » recompte et finit sur la valeur de repos', `repos=${rest} fin=${texts.at(-1)}`);
      const from = values.findIndex((v) => v < 0.5 * values.at(-1)); // le compte repart près de 0
      check(from >= 0 && new Set(texts.slice(from)).size >= 6 && monotone(values.slice(from)), 'CA-14 story Animation : après « Rejouer », compte de 0 à la valeur (monotone, ≥ 6 valeurs distinctes)', `départ=${from} distinctes=${new Set(texts.slice(Math.max(from, 0))).size}`);
    } else {
      const started = await page.evaluate(async () => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Rejouer'));
        b.click();
        const t0 = performance.now();
        while (performance.now() - t0 < 1500) { await new Promise((resolve) => requestAnimationFrame(resolve)); if (document.getAnimations().some((a) => a.effect?.getKeyframes().some((k) => 'color' in k))) return true; }
        return false;
      });
      check(started, 'CA-15 story Animation : « Rejouer » déclenche une animation de couleur (flash)');
    }
    await context.close();
  }
});

await browser.close();
server?.close();
process.exit(failures > 0 ? 1 : 0);
