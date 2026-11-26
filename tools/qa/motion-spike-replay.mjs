// SPIKE jetable : rejeu des animations d'entrée au réordonnancement / à l'ajout (variantes A à E), et sortie sous mouvement réduit.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:6111';
const browser = await chromium.launch({ channel: 'chrome' });
const out = { chrome: browser.version() };

async function open(reduced = false, extraCss = '') {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  await page.goto(`${base}/iframe.html?id=qa-motion-spike--lists&viewMode=story`);
  await page.waitForSelector('#list-e li');
  if (extraCss) await page.addStyleTag({ content: extraCss });
  await settle(page);
  return page;
}
const settle = async (page) => {
  await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 15000 });
  await page.evaluate(() => { window.__starts.length = 0; });
};
// Après un clic : consigne les démarrages d'animation (« nom|data-id ») pendant 900 ms, regroupés par variante.
async function act(page, id) {
  await page.click(`#${id}`);
  await page.waitForTimeout(900);
  const starts = await page.evaluate(() => { const s = [...window.__starts]; window.__starts.length = 0; return s; });
  const byVariant = {};
  for (const s of starts) { const [name, did] = s.split('|'); (byVariant[did[0]] ??= []).push(`${did.slice(1)}${name === 'lc-spike-in' ? '' : ':' + name}`); }
  for (const k of Object.keys(byVariant)) byVariant[k].sort();
  return byVariant;
}
const order = (page) => page.evaluate(() => [...document.querySelectorAll('#list-a > li')].map((li) => li.dataset.id.slice(1)).join(','));

{
  const page = await open();
  out.moveBeforeSupported = await page.evaluate(() => typeof Element.prototype.moveBefore);
  out.initialOrder = await order(page);
  out.append = { order: undefined, starts: await act(page, 'append') };   // 6 ajouté en fin
  out.append.order = await order(page);
  out.prepend = { starts: await act(page, 'prepend') };                    // 7 ajouté en tête
  out.prepend.order = await order(page);
  out.reverse = { starts: await act(page, 'reverse') };                    // tous les éléments existants se déplacent
  out.reverse.order = await order(page);
  out.remove = { starts: await act(page, 'remove') };                      // retrait de 2 : aucun rejeu attendu
  out.remove.order = await order(page);
  // Variante E : la classe d'entrée est-elle retirée après l'animation ?
  out.eClassesAfterEnter = await page.evaluate(() => [...document.querySelectorAll('#list-e > li')].map((li) => li.className).filter(Boolean));
  await page.context().close();
}

// Mouvement réduit : sortie avec la coupure globale du kit (0,01 ms), puis avec `animation: none` seul.
for (const [label, css] of [['baseCss0.01ms', ''], ['animationNone', '@media (prefers-reduced-motion: reduce){.lc-spike-leave,.lc-spike-reveal,.lc-spike-enter{animation:none !important}}']]) {
  const page = await open(true, css);
  const r = await page.evaluate(async () => {
    const t0 = performance.now(); const gone = {};
    const ids = ['if-a', 'if-b', 'if-c', 'if-d', 'if-e'];
    new MutationObserver(() => ids.forEach((id) => { if (!document.getElementById(id) && !(id in gone)) gone[id] = Math.round(performance.now() - t0); })).observe(document.body, { subtree: true, childList: true });
    document.getElementById('toggle').click();
    document.getElementById('remove').click();
    await new Promise((r) => setTimeout(r, 800));
    return { ifGoneMs: gone, leftover: ids.filter((id) => document.getElementById(id)), forLeftover: [...document.querySelectorAll('[data-id$="2"]')].map((e) => e.dataset.id) };
  });
  out[`reduced_${label}`] = r;
  await page.context().close();
}
await browser.close();
console.log(JSON.stringify(out));
