// SPIKE jetable (branche spike/motion-flip) : mesures en navigateur réel du harnais packages/angular/src/lib/motion/spike.
//   BASE=http://127.0.0.1:6123 node tools/qa/flip-spike.mjs q1|q2|q4|q5|all     (Storybook en dev lancé au préalable)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE ?? 'http://127.0.0.1:6123';
const browser = await chromium.launch({ channel: process.env.CHANNEL });

/** Ouvre le harnais ; `params` : n, mode, reveal, ignoreReduced. Instrumente getBoundingClientRect et animate (séquence R/A). */
async function open(params = {}, { reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width: 800, height: 900 }, reducedMotion });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.log('PAGEERROR', error.message));
  await page.addInitScript(() => {
    window.__seq = [];
    window.__seqOn = false;
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (window.__seqOn) window.__seq.push('R');
      return rect.call(this);
    };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (window.__seqOn) window.__seq.push('A');
      return animate.apply(this, args);
    };
  });
  const query = new URLSearchParams({ id: 'qa-motion-flip-spike--spike', viewMode: 'story', ...params });
  await page.goto(`${BASE}/iframe.html?${query}`);
  await page.waitForSelector('#list .spike-row', { timeout: 60000 });
  await page.waitForTimeout(1200); // fin des animations d'entrée initiales
  await page.evaluate(() => { window.__flip = { log: [] }; });
  return { page, context };
}

/** Clique un bouton et échantillonne chaque image : clés du DOM, centre vertical de chaque ligne, animations. Retourne aussi l'état d'avant. */
async function clickAndSample(page, button, frames = 40, waitBefore = 0) {
  return page.evaluate(async ({ button, frames, waitBefore }) => {
    const list = document.querySelector('#list');
    const snap = () => [...list.children].map((el) => {
      const r = el.getBoundingClientRect();
      return { k: el.dataset.k, cy: r.top + r.height / 2, top: r.top, anims: el.getAnimations().length, opacity: +getComputedStyle(el).opacity };
    });
    await new Promise((r) => setTimeout(r, waitBefore));
    const before = snap();
    window.__seq = [];
    window.__seqOn = true;
    document.getElementById(button).click();
    const series = [];
    for (let i = 0; i < frames; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      window.__seqOn = false;
      series.push(snap());
      window.__seqOn = true;
    }
    window.__seqOn = false;
    return { before, series, log: window.__flip.log, seq: window.__seq.join('') };
  }, { button, frames, waitBefore });
}

const keysOf = (rows) => rows.map((row) => row.k).join(',');
const pct = (values, p) => [...values].sort((a, b) => a - b)[Math.floor(values.length * p)];

async function q1() {
  console.log('\n=== Q1 : moment de l\'instantané (écart entre ce que voit la directive et les positions réelles avant le clic) ===');
  for (const button of ['reverse', 'filter', 'prepend']) {
    for (const mode of ['effect', 'onchanges', 'transform']) {
      const { page, context } = await open({ n: 8, mode });
      const { before, series, log } = await clickAndSample(page, button, 40);
      const snapshot = log.find((entry) => entry.phase === 'snapshot');
      const play = log.find((entry) => entry.phase === 'play');
      const seenOld = snapshot && snapshot.keys.join(',') === keysOf(before);
      const oldTops = new Map(before.map((row) => [row.k, row.top]));
      const snapTopsOk = snapshot && snapshot.keys.every((k, i) => oldTops.has(k) && Math.abs(snapshot.tops[i] - oldTops.get(k)) < 0.5);
      // Première image où le DOM a changé : les lignes conservées sont encore à l'ancienne place (visuellement) ?
      const first = series.find((frame) => keysOf(frame) !== keysOf(before));
      const kept = first ? first.filter((row) => oldTops.has(row.k)) : [];
      const startGap = kept.length ? Math.max(...kept.map((row) => Math.abs(row.top - oldTops.get(row.k)))) : null;
      const last = series.at(-1);
      const expected = last.map((row, i) => last[0].top + i * 36); // pile de lignes de 36 px
      const finalOk = last.every((row, i) => Math.abs(row.top - expected[i]) < 0.5);
      const animated = first ? first.filter((row) => row.anims > 0).length : 0;
      console.log(`${button.padEnd(8)} ${mode.padEnd(10)} snapshot=${snapshot ? 'oui' : 'NON'} vitAncienDOM=${seenOld} ancienTops=${snapTopsOk} | 1ère image DOM neuf : écart max/ancienne place=${startGap?.toFixed(1)}px, ${animated}/${first?.length} animées | final exact=${finalOk} | lectures:${play?.moved ?? '?'} déplacées / ${play?.total ?? '?'}`);
      if (mode === 'onchanges') console.log(`   clés avant : ${keysOf(before)}\n   clés au snapshot : ${snapshot?.keys.join(',')}\n   clés après : ${keysOf(last)}`);
      await context.close();
    }
  }
}

async function q2() {
  console.log('\n=== Q2 : reveal (entrée) + FLIP sur le même élément ===');
  for (const reveal of ['none', 'v2', 'legacy']) {
    const { page, context } = await open({ n: 4, reveal });
    // 1er ajout : l'élément « New 1000 » s'anime en entrée ; 200 ms plus tard un 2e ajout le pousse (FLIP) pendant l'entrée.
    await page.evaluate(() => document.getElementById('prepend').click());
    await page.waitForTimeout(100);
    const out = await page.evaluate(async () => {
      const el = document.querySelector('#list [data-k="1000"]');
      const cy = () => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      const types = () => el.getAnimations().map((a) => a.constructor.name + (a.animationName ? ':' + a.animationName : a.transitionProperty ? ':' + a.transitionProperty : ':waapi')).join('|');
      const samples = [];
      let typesDuring = '';
      await new Promise((r) => requestAnimationFrame(r));
      samples.push(cy()); // dernière image avant le 2e ajout : un saut au démarrage du FLIP se voit contre elle
      document.getElementById('prepend').click();
      for (let i = 0; i < 70; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        samples.push(cy());
        if (i === 6) typesDuring = types();
      }
      const final = cy();
      return { samples, typesDuring, final, style: { transform: getComputedStyle(el).transform, translate: getComputedStyle(el).translate } };
    });
    const jumps = out.samples.slice(1).map((value, i) => Math.abs(value - out.samples[i]));
    const worst = Math.max(...jumps);
    console.log(`${reveal.padEnd(7)} saut max entre 2 images=${worst.toFixed(1)}px (à l'image ${jumps.indexOf(worst) + 1}) | animations au 7e frame: ${out.typesDuring || '(aucune)'} | position finale cy=${out.final.toFixed(1)} (attendu ${(await page.evaluate(() => { const l = document.querySelector('#list'); return l.getBoundingClientRect().top + 36 + 18; })).toFixed(1)})`);
    await context.close();
  }
}

async function q4() {
  console.log('\n=== Q4 : prefers-reduced-motion ===');
  for (const [label, params] of [['réduit (directive normale)', {}], ['réduit, contrôle (check ignoré)', { ignoreReduced: 1 }]]) {
    const { page, context } = await open({ n: 8, ...params }, { reducedMotion: 'reduce' });
    const { before, series, log } = await clickAndSample(page, 'reverse', 30);
    const first = series.find((frame) => keysOf(frame) !== keysOf(before));
    const expected = first.map((row, i) => first[0].top + i * 36);
    const atFinal = first.every((row, i) => Math.abs(row.top - expected[i]) < 0.5);
    const maxAnims = Math.max(...series.map((frame) => Math.max(...frame.map((row) => row.anims))));
    const play = log.find((entry) => entry.phase === 'play');
    console.log(`${label}: 1ère image DOM neuf déjà à l'état final=${atFinal} | animations actives max=${maxAnims} | log play: ${JSON.stringify({ moved: play.moved, skipped: play.skipped })}`);
    await context.close();
  }
}

async function q5() {
  console.log('\n=== Q5 : 200 éléments ===');
  for (const button of ['reverse', 'shuffle', 'all']) {
    const results = {};
    for (const mode of ['off', 'onchanges']) {
      const runs = [];
      for (let run = 0; run < 3; run++) {
        const { page, context } = await open({ n: 200, mode });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');
        const layouts = async () => (await cdp.send('Performance.getMetrics')).metrics.find((metric) => metric.name === 'LayoutCount').value;
        const l0 = await layouts();
        const { log, seq } = await clickAndSample(page, button, 6);
        const l1 = await layouts();
        runs.push({ layouts: l1 - l0, log, seq });
        await context.close();
      }
      results[mode] = runs;
    }
    const med = (runs, f) => pct(runs.map(f), 0.5);
    const base = med(results.off, (r) => r.layouts);
    const on = med(results.onchanges, (r) => r.layouts);
    const run = results.onchanges[0];
    const snapshot = run.log.find((e) => e.phase === 'snapshot');
    const play = run.log.find((e) => e.phase === 'play');
    const reads = (run.seq.match(/R/g) ?? []).length;
    const animates = (run.seq.match(/A/g) ?? []).length;
    const firstA = run.seq.indexOf('A');
    const readAfterFirstWrite = firstA >= 0 && run.seq.slice(firstA).includes('R');
    console.log(`${button.padEnd(9)} LayoutCount (3 passes, médiane) sans directive=${base} avec=${on} (+${on - base}) | snapshot ${snapshot.ms.toFixed(1)} ms | lecture après ${play.readMs.toFixed(1)} ms, écriture ${play.writeMs.toFixed(1)} ms | ${play.moved}/${play.total} déplacés | gBCR=${reads} animate=${animates} lecture après la 1re écriture=${readAfterFirstWrite} | séquence ${run.seq.replace(/(R+)/g, (m) => `R×${m.length} `).replace(/(A+)/g, (m) => `A×${m.length} `)}`);
  }
}

/** Bonus : 2e changement pendant un FLIP en cours (l'instantané doit contenir la position visuelle, la lecture « après » doit annuler d'abord l'animation) : pas de saut. */
async function q6() {
  console.log('\n=== Q6 : changement pendant un FLIP en cours ===');
  const { page, context } = await open({ n: 8 });
  const out = await page.evaluate(async () => {
    const list = document.querySelector('#list');
    const cys = () => [...list.children].map((el) => { const r = el.getBoundingClientRect(); return [el.dataset.k, r.top + r.height / 2]; });
    const frames = [];
    const run = async (n) => { for (let i = 0; i < n; i++) { await new Promise((r) => requestAnimationFrame(r)); frames.push(Object.fromEntries(cys())); } };
    document.getElementById('reverse').click();
    await run(6); // ~100 ms : FLIP à mi-course
    document.getElementById('reverse').click(); // revient à l'ordre initial, pendant le glissement
    await run(40);
    const jumps = frames.slice(1).map((frame, i) => Math.max(...Object.keys(frame).map((k) => Math.abs(frame[k] - frames[i][k]))));
    const finalOk = Object.entries(frames.at(-1)).every(([k, cy]) => Math.abs(cy - (list.getBoundingClientRect().top + (+k - 1) * 36 + 18)) < 0.5);
    return { switchJump: jumps[5], maxBefore: Math.max(...jumps.slice(0, 5)), maxJump: Math.max(...jumps), atFrame: jumps.indexOf(Math.max(...jumps)) + 1, finalOk, anims: [...list.children].reduce((n, el) => n + el.getAnimations().length, 0) };
  });
  console.log(`déplacement max d'un élément entre 2 images : avant le 2e clic ${out.maxBefore.toFixed(1)}px ; à l'image du 2e clic ${out.switchJump.toFixed(1)}px ; sur toute la durée ${out.maxJump.toFixed(1)}px (image ${out.atFrame}) | état final exact=${out.finalOk} | animations restantes=${out.anims}`);
  await context.close();
}

const which = process.argv[2] ?? 'all';
const all = { q1, q2, q4, q5, q6 };
for (const [name, fn] of Object.entries(all)) if (which === 'all' || which === name) await fn();
await browser.close();
