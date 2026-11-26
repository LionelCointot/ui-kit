// SPIKE jetable : node tools/qa/motion-spike.mjs [url-storybook]  (Storybook dev lancé avec les stories du dossier spike).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:6111';
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const out = {};

async function open(story, { reduced = false, width = 1100, query = '' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${base}/iframe.html?id=qa-motion-spike--${story}&viewMode=story${query}`);
  await page.waitForSelector('#storybook-root button', { timeout: 60000 });
  await settle(page);
  return { page, context, errors };
}
const settle = async (page) => {
  await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 15000 });
  await page.evaluate(() => { window.__starts.length = 0; });
};
const starts = (page) => page.evaluate(() => { const s = [...window.__starts]; window.__starts.length = 0; return s; });
const ids = (page, list) => page.evaluate((l) => [...document.querySelectorAll(`#${l} > li`)].map((li) => li.dataset.id), list);

// Mesure : clic, puis présence dans le DOM à t=50 ms, 250 ms, et délai jusqu'à disparition de `selector`.
async function leaveTimeline(page, clickId, selector) {
  return page.evaluate(async ([clickId, selector]) => {
    const t0 = performance.now();
    const probe = () => document.querySelectorAll(selector).length;
    document.getElementById(clickId).click();
    const samples = {};
    const marks = [30, 150, 330, 600];
    let gone = null;
    const classes = new Set();
    await new Promise((resolve) => {
      const tick = () => {
        const t = performance.now() - t0;
        document.querySelectorAll(selector).forEach((el) => el.classList.forEach((c) => classes.add(c)));
        for (const m of marks) if (t >= m && samples[m] === undefined) samples[m] = probe();
        if (gone === null && probe() === 0) gone = Math.round(t);
        if (t > 900) resolve(); else requestAnimationFrame(tick);
      };
      tick();
    });
    return { goneAtMs: gone, count: samples, classesSeen: [...classes].filter((c) => c.startsWith('lc-spike')) };
  }, [clickId, selector]);
}

// ---------- Q1 : sortie par @if et @for, quatre écritures ----------
{
  const { page, errors } = await open('lists');
  const r = { startupErrors: errors.splice(0) };
  r.attrBindingMatched = await page.evaluate(() => document.getElementById('attr-binding').classList.contains('lc-spike-reveal'));
  r.ifLeave = {};
  // @if : on retire les quatre blocs d'un coup, chaque id est sondé séparément.
  await page.evaluate(() => { window.__t0 = performance.now(); window.__gone = {}; });
  await page.evaluate(() => {
    const ids = ['if-a', 'if-b', 'if-c', 'if-d'];
    const mo = new MutationObserver(() => ids.forEach((id) => { if (!document.getElementById(id) && !(id in window.__gone)) window.__gone[id] = Math.round(performance.now() - window.__t0); }));
    mo.observe(document.body, { childList: true, subtree: true });
    window.__snap = {};
    document.getElementById('toggle').click();
    setTimeout(() => ids.forEach((id) => { const el = document.getElementById(id); window.__snap[id] = el ? { cls: el.className, anims: el.getAnimations().map((a) => a.animationName) } : null; }), 120);
  });
  await page.waitForTimeout(900);
  r.ifLeave = await page.evaluate(() => ({ goneAtMs: window.__gone, snapshotAt120ms: window.__snap }));
  r.ifErrors = errors.splice(0);
  out.q1_if = r;
  await settle(page);

  // @for : retrait de l'élément 2 dans chaque liste
  await page.evaluate(() => { window.__t0 = performance.now(); window.__gone = {}; window.__snap = {};
    const mo = new MutationObserver(() => ['a', 'b', 'c', 'd'].forEach((k) => { if (!document.querySelector(`[data-id=${k}2]`) && !(k in window.__gone)) window.__gone[k] = Math.round(performance.now() - window.__t0); }));
    mo.observe(document.body, { childList: true, subtree: true });
    document.getElementById('remove').click();
    setTimeout(() => ['a', 'b', 'c', 'd'].forEach((k) => { const el = document.querySelector(`[data-id=${k}2]`); window.__snap[k] = el ? { cls: el.className, anims: el.getAnimations().map((x) => x.animationName) } : null; }), 120);
  });
  await page.waitForTimeout(900);
  out.q1_for = await page.evaluate(() => ({ goneAtMs: window.__gone, snapshotAt120ms: window.__snap }));
  await settle(page);

  // ---------- Q2 : réordonnancement, ajout ----------
  await page.click('#reverse');
  await page.waitForTimeout(100);
  const afterReverse = await starts(page);
  out.q2_reverse = { orderA: await ids(page, 'list-a'), animationStarts: afterReverse, animatedNow: await page.evaluate(() => document.getAnimations().length) };
  await settle(page);
  await page.click('#append');
  await page.waitForTimeout(100);
  out.q2_append = { animationStarts: (await starts(page)).sort() };
  await settle(page);
  await page.click('#prepend');
  await page.waitForTimeout(100);
  out.q2_prepend = { orderA: await ids(page, 'list-a'), animationStarts: (await starts(page)).sort() };
  out.errors = errors;
  await page.context().close();
}

// ---------- Q3 : mouvement réduit ----------
{
  const { page, errors } = await open('lists', { reduced: true });
  const r = {};
  await page.evaluate(() => { window.__t0 = performance.now(); window.__gone = {};
    const ids = ['if-a', 'if-b', 'if-c', 'if-d'];
    const mo = new MutationObserver(() => ids.forEach((id) => { if (!document.getElementById(id) && !(id in window.__gone)) window.__gone[id] = Math.round(performance.now() - window.__t0); }));
    mo.observe(document.body, { childList: true, subtree: true });
    document.getElementById('toggle').click(); });
  await page.waitForTimeout(700);
  r.ifGoneAtMs = await page.evaluate(() => window.__gone);
  r.ifLeftover = await page.evaluate(() => ['if-a', 'if-b', 'if-c', 'if-d'].filter((id) => document.getElementById(id)));
  await page.evaluate(() => { window.__t0 = performance.now(); window.__gone = {};
    const mo = new MutationObserver(() => ['a', 'b', 'c', 'd'].forEach((k) => { if (!document.querySelector(`[data-id=${k}2]`) && !(k in window.__gone)) window.__gone[k] = Math.round(performance.now() - window.__t0); }));
    mo.observe(document.body, { childList: true, subtree: true });
    document.getElementById('remove').click(); });
  await page.waitForTimeout(700);
  r.forGoneAtMs = await page.evaluate(() => window.__gone);
  r.forLeftover = await page.evaluate(() => ['a', 'b', 'c', 'd'].filter((k) => document.querySelector(`[data-id=${k}2]`)));
  r.errors = errors;
  out.q3_reduced = r;
  await page.context().close();
}

// ---------- Q4 : lc-data-table ----------
for (const [label, opts] of Object.entries({ desktop: { width: 1100 }, phone360: { width: 360 } })) {
  for (const decorated of ['1', '0']) {
    const { page, errors } = await open('table', { ...opts, query: `&decorated=${decorated}` }).catch((e) => ({ page: null, errors: [String(e)] }));
    if (!page) { out[`q4_${label}_decorated${decorated}`] = { errors }; continue; }
    await page.waitForSelector('#tbl tbody tr');
    const r = { rowsBefore: await page.locator('#tbl tbody tr').count(), hostHasRevealClass: await page.evaluate(() => document.getElementById('tbl').classList.contains('lc-spike-reveal')) };
    r.trAttrLcReveal = await page.evaluate(() => document.querySelector('#tbl tbody tr')?.hasAttribute('lcReveal'));
    await page.waitForTimeout(1200); // fin de l'entrée
    await page.evaluate(() => { window.__t0 = performance.now(); window.__leaving = 0; window.__seen = new Set();
      new MutationObserver(() => document.querySelectorAll('#tbl tbody tr[data-leaving]').forEach((tr) => window.__seen.add(tr.textContent.trim().slice(0, 12)))).observe(document.body, { subtree: true, childList: true, attributes: true }); });
    await page.click('#fewer');
    await page.waitForTimeout(150);
    r.rowsAt150ms = await page.locator('#tbl tbody tr').count();
    r.leavingAt150ms = await page.locator('#tbl tbody tr[data-leaving]').count();
    await page.waitForTimeout(1200);
    r.rowsAfter = await page.locator('#tbl tbody tr').count();
    r.leavingStuck = await page.locator('#tbl tbody tr[data-leaving]').count();
    r.rowsSeenLeaving = await page.evaluate(() => [...window.__seen].length);
    // sortie de la table entière (hôte)
    await page.evaluate(() => { window.__t0 = performance.now(); window.__goneTbl = null;
      new MutationObserver(() => { if (!document.getElementById('tbl') && window.__goneTbl === null) window.__goneTbl = Math.round(performance.now() - window.__t0); }).observe(document.body, { subtree: true, childList: true }); });
    await page.click('#toggle');
    await page.waitForTimeout(150);
    r.tableAt150ms = await page.evaluate(() => { const t = document.getElementById('tbl'); return t ? { cls: t.className.includes('lc-spike-leave'), anims: t.getAnimations({ subtree: false }).map((a) => a.animationName) } : null; });
    await page.waitForTimeout(1500);
    r.tableGoneAtMs = await page.evaluate(() => window.__goneTbl);
    r.tableStillThere = await page.evaluate(() => !!document.getElementById('tbl'));
    r.errors = errors;
    out[`q4_${label}_decorated${decorated}`] = r;
    await page.context().close();
  }
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
