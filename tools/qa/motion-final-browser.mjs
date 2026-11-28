// Acceptation finale du mouvement v2 (spec 2026-12-mouvement-v2) sur le Storybook statique : CA-40 (couches de l'entrée de page), cartes faites main, toast au-dessus de la barre d'onglets (CA-25),
// entrée de la barre du haut (d05), démo « Foundations/Motion demo » (T17 : rubriques, couches, focus après suppression, console, axe).
// Valeurs attendues : la spec (§5.4, §10) et talmo-source.md ; les jetons de décalage sont lus dans le navigateur.
//   node tools/qa/motion-final-browser.mjs [layers|grids|toast|topbar|demo ...]   (STORYBOOK_DIR ou dist/storybook ; la story QA « Page layers » : `npm run build-storybook` d'abord)
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';
import { calm, stable } from './wait.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = require('playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const server = await staticServer(process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook'));
const { base } = server;
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const wanted = process.argv.slice(2);
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };
const idle = (page) => calm(page).then((ok) => ok || check(false, 'animations finies encore en cours après 15 s'));
const still = (page, selector) => stable(page, selector).then((ok) => ok || check(false, `${selector} ne cesse de bouger pendant 15 s`));
const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
const FRAME = 17; // ± une image à 60 Hz

const open = async (id, { width = 1280, height = 900, reduced = false, touch = false, init } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  const errors = [];
  if (init) await page.addInitScript(init);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && !message.location().url.endsWith('favicon.ico') && errors.push(message.text().split('\n')[0]));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  return { page, context, errors };
};

/** Animations finies et mesurables du document, avec leur cible. */
const SNAP = () => document.getAnimations().map((a) => {
  const target = a.effect.target;
  const timing = a.effect.getComputedTiming();
  const first = a.effect.getKeyframes()[0] ?? {};
  return {
    name: a.animationName ?? a.transitionProperty, tag: target.tagName.toLowerCase(), cls: target.className?.toString() ?? '', zone: target.closest('[id]')?.id ?? '',
    delay: timing.delay, duration: timing.duration, y: first.translate ?? '', scale: first.scale ?? '', rotate: first.rotate ?? '', state: a.playState,
  };
}).filter((a) => Number.isFinite(a.duration));
const sorted = (list) => list.map((a) => a.delay).sort((x, y) => x - y);
const token = (page, name) => page.evaluate((n) => { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * (v.endsWith('s') ? 1000 : 1); }, name);

if (!wanted.length || wanted.includes('layers')) {
  const { page, context, errors } = await open('qa-motion-page-layers--full-page');
  await page.waitForSelector('lc-page h1');
  await idle(page);
  const stagger = await token(page, '--lc-sys-motion-stagger-normal');
  const tilt = await token(page, '--lc-reveal-tilt-pace');
  const cards = await token(page, '--lc-sys-motion-stagger-cards');
  const play = async (selector) => { await page.evaluate((s) => document.querySelector(s).click(), selector); await page.waitForTimeout(40); return page.evaluate(SNAP); };
  const entry = await play('#new-page');
  const by = (zoneOrTag, name) => entry.filter((a) => a.name === name && (a.zone === zoneOrTag || a.tag === zoneOrTag) && a.state !== 'finished');
  const kpi = by('kpis', 'lc-reveal-in');
  const cardsIn = entry.filter((a) => a.name === 'lc-reveal-in' && a.tag === 'lc-card' && a.zone === 'cards');
  const rows = [...by('feed', 'lc-reveal-in'), ...by('summary', 'lc-reveal-in')];
  const gauges = by('gauges', 'scale');
  check(kpi.length === 3 && near(sorted(kpi)[0], 100, FRAME), 'CA-40 couche KPI : premier délai 100 ms', JSON.stringify(sorted(kpi)));
  check(near(tilt, 70, 0.5), 'CA-40 KPI : jeton de rythme tilt = 70 ms (site, talmo-source)', `${tilt}`);
  check(sorted(kpi).every((d, i, l) => i === 0 || near(d - l[i - 1], 70, 1)), 'CA-40 KPI : 70 ms entre deux cartes d\'indicateur (rythme du site)', JSON.stringify(sorted(kpi)));
  check(cardsIn.length === 3 && near(sorted(cardsIn)[0], 120, FRAME), 'CA-40 couche cartes : premier délai 120 ms', JSON.stringify(sorted(cardsIn)));
  check(sorted(cardsIn).every((d, i, l) => i === 0 || near(d - l[i - 1], cards, 1)) && near(cards, 60, 0.5), 'CA-40 cartes : 60 ms entre deux cartes, cascade par rang', JSON.stringify(sorted(cardsIn)));
  check(cardsIn.every((a) => a.duration === 800 && /^0px 26px$/.test(a.y) && a.scale === '0.985'), 'CA-40 variante card : 26 px, échelle 0,985, 800 ms', JSON.stringify(cardsIn[0]));
  check(rows.length === 7 && near(sorted(rows)[0], 400, FRAME), 'CA-40 couche lignes : premier délai 400 ms (fil d\'activité et liste de définitions)', JSON.stringify(sorted(rows)));
  for (const zone of ['feed', 'summary']) {
    const delays = sorted(by(zone, 'lc-reveal-in'));
    check(delays.length > 0 && delays.every((d, i) => near(d, 400 + i * stagger, 1) || (i === 0 && near(d, 400, FRAME))), `CA-40 lignes ${zone} : cascade par rang, ${stagger} ms entre deux lignes`, JSON.stringify(delays));
  }
  const gaugeDelays = sorted(gauges);
  check(gaugeDelays.length === 3 && near(gaugeDelays[0], 500, FRAME), 'CA-40 couche jauges : premier délai 500 ms', JSON.stringify(gaugeDelays));
  check(gaugeDelays.every((d, i) => near(d, 500 + i * stagger, 1) || (i === 0 && near(d, 500, FRAME))), `CA-40 jauges sœurs : cascade par rang, ${stagger} ms entre deux jauges, sans rang écrit`, JSON.stringify(gaugeDelays));
  check(sorted(kpi)[0] < sorted(cardsIn)[0] && sorted(cardsIn)[0] < sorted(rows)[0] && sorted(rows)[0] < gaugeDelays[0], 'CA-40 ordre des couches : KPI, cartes, lignes, jauges', '');
  await idle(page);
  const added = await play('#add-event');
  const newRow = added.filter((a) => a.name === 'lc-reveal-in' && a.zone === 'feed');
  check(newRow.length === 1 && newRow[0].delay <= FRAME, 'CA-40 ligne ajoutée après l\'entrée : aucun délai de couche', JSON.stringify(newRow));
  await idle(page);
  const addedCard = (await play('#add-card')).filter((a) => a.name === 'lc-reveal-in' && a.tag === 'lc-card');
  check(addedCard.length === 1 && addedCard[0].delay <= FRAME, 'CA-40 carte ajoutée après l\'entrée : aucun délai de couche', JSON.stringify(addedCard));
  check(errors.length === 0, 'CA-40 aucune erreur de page ni de console', errors.join(' | '));
  await context.close();

  const reduced = await open('qa-motion-page-layers--full-page', { reduced: true });
  await reduced.page.waitForSelector('lc-page h1');
  await idle(reduced.page);
  await reduced.page.evaluate(() => document.querySelector('#new-page').click());
  await reduced.page.waitForTimeout(60);
  const quiet = await reduced.page.evaluate(SNAP);
  const bad = quiet.filter((a) => a.delay > 0.01 || a.duration > 0.01);
  check(bad.length === 0, 'CA-40 mouvement réduit : aucun délai ni durée > 0,01 ms', JSON.stringify(bad.slice(0, 3)));
  await reduced.page.evaluate(() => document.querySelector('#add-card').click());
  await reduced.page.waitForTimeout(60);
  const running = await reduced.page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && Number.isFinite(a.effect.getComputedTiming().endTime) && a.effect.getComputedTiming().endTime > 0.01).length);
  check(running === 0, 'CA-40 mouvement réduit : rien ne bouge à l\'ajout d\'une carte', `${running} animation(s)`);
  await reduced.context.close();
}

if (!wanted.length || wanted.includes('grids')) {
  const { page, context } = await open('qa-motion-page-layers--handmade-grids');
  await page.waitForSelector('lc-page h1');
  await page.waitForTimeout(30);
  const cards = (await page.evaluate(SNAP)).filter((a) => a.name === 'lc-reveal-in' && a.tag === 'lc-card');
  const delays = cards.map((a) => a.delay);
  check(cards.length === 6 && [0, 1, 2].every((i) => near(delays[i], 120 + i * 60, FRAME) && near(delays[i + 3], 120 + i * 60, FRAME)),
    'Deux grilles faites main voisines : chacune repart du rang 0 (120, 180, 240 ms), sans prolonger la cascade de l\'autre', JSON.stringify(delays));
  await context.close();
}

if (!wanted.length || wanted.includes('toast')) {
  for (const width of [360, 390]) {
    const { page, context, errors } = await open('qa-layout-app-shell-tab-bar--tab-bar', { width, height: 740, touch: true });
    await page.waitForSelector('nav[aria-label="Navigation principale"]');
    await idle(page);
    await page.click('#qa-toast');
    await page.waitForSelector('.lc-toast');
    await still(page, '.lc-toast');
    const m = await page.evaluate(() => ({ toast: document.querySelector('.lc-toast').getBoundingClientRect().bottom, bar: document.querySelector('nav[aria-label="Navigation principale"]').getBoundingClientRect().top }));
    check(near(m.bar - m.toast, 16, 0.5), `CA-25 toast à 16 px au-dessus de la barre d'onglets à ${width} px`, JSON.stringify(m));
    check(errors.length === 0, `CA-25 ${width} px : aucune erreur de console`, errors.join(' | '));
    await context.close();
  }
}

/** Ouvre la démo et attend la fin de la première entrée. */
const demo = async (width) => {
  const session = await open('foundations-motion-demo--demo', { width, height: width < 768 ? 740 : 900, touch: width < 768 });
  await session.page.waitForSelector('lc-page h1');
  await idle(session.page);
  return session;
};
const heading = (page) => page.evaluate(() => document.querySelector('lc-page h1 .lc-visually-hidden')?.textContent?.trim());
const axe = async (page, label) => {
  await page.waitForFunction(() => document.getAnimations().every((a) => !Number.isFinite(a.effect.getComputedTiming().endTime) || a.playState === 'finished'), null, { timeout: 15000 });
  await page.evaluate(axeSource);
  const result = await page.evaluate(() => window.axe.run(document.querySelector('#storybook-root'), { resultTypes: ['violations'] }).then((r) => r.violations.map((v) => `${v.id}:${v.nodes.length}:${v.nodes[0].target.join(' ')}`)));
  check(result.length === 0, `démo T17 axe sans violation (${label})`, result.join(' | '));
};

if (!wanted.length || wanted.includes('tabbar')) {
  // Couleur du texte des onglets pendant le glissement de la pastille : contraste ≥ 3 contre ce qui est réellement derrière (pastille visible ou fond de la barre), à chaque image.
  const { page, context } = await open('foundations-motion-demo--demo', { width: 390, height: 740, touch: true }); // la story QA de la barre n'a pas de routes valides (voir constats)
  await page.waitForSelector('.lc-tabbar__indicator');
  await idle(page);
  await page.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    window.__tab = [];
    const sample = () => {
      const bar = document.querySelector('.lc-tabbar');
      const pill = bar.querySelector('.lc-tabbar__indicator');
      const box = pill.getBoundingClientRect();
      const inset = getComputedStyle(pill).clipPath.match(/inset\(([^)]*?)(?: round|\))/)?.[1].split(/\s+/).map(parseFloat) ?? [0, 0, 0, 0];
      const [left, right] = [box.left + (inset[3] ?? 0), box.right - (inset[1] ?? 0)];
      for (const tab of bar.querySelectorAll('.lc-tabbar__tab')) {
        const label = tab.querySelector('.lc-tabbar__label');
        const r = label.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const behind = cx >= left && cx <= right ? getComputedStyle(pill).backgroundColor : getComputedStyle(bar).backgroundColor;
        window.__tab.push({ t: Math.round(performance.now()), tab: tab.textContent.trim(), current: tab.getAttribute('aria-current'), color: getComputedStyle(label).color, behind, ratio: ratio(getComputedStyle(label).color, behind) });
      }
    };
    // Relevé après les rappels d'image (setTimeout dans le rAF) : l'état peint de la même image. Un relevé dans le rAF passe avant celui du composant (enregistré plus tard) et lit sa classe d'une image trop tôt.
    const loop = () => { window.__raf = requestAnimationFrame(() => { setTimeout(sample, 0); loop(); }); };
    window.__start = () => { window.__tab.length = 0; loop(); };
  });
  await page.evaluate(() => window.__start());
  await page.getByRole('link', { name: 'Liste', exact: true }).locator('visible=true').first().click();
  await page.waitForFunction(() => window.__tab.some((x) => x.tab === 'Liste' && x.current === 'page'));
  await idle(page);
  const samples = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__tab; });
  const worst = samples.reduce((m, x) => (x.ratio < m.ratio ? x : m), samples[0]);
  check(samples.length > 40 && worst.ratio >= 3, 'tabbar : texte des onglets lisible (≥ 3:1) à chaque image du glissement de la pastille', `${samples.length} mesures, pire ${worst.ratio.toFixed(2)} : ${JSON.stringify(worst)} ; ${new Set(samples.filter((x) => x.ratio < 3).map((x) => x.t)).size} images sous 3:1 (de ${Math.min(...samples.filter((x) => x.ratio < 3).map((x) => x.t))} à ${Math.max(...samples.filter((x) => x.ratio < 3).map((x) => x.t))} ms)`);
  const current = samples.filter((x) => x.current === 'page' && x.tab === 'Liste');
  check(current.length > 0 && current.at(-1).ratio >= 4.5, 'tabbar : onglet actif au repos lisible (≥ 4,5:1)', JSON.stringify(samples.slice(-4)));
  await context.close();
}

if (!wanted.length || wanted.includes('ca36')) {
  // CA-36 sur la démo T17 (la story QA de la barre n'a pas de routes valides) : barre d'onglets sous 768 px, tiroir de 768 à 1023 px.
  for (const [width, bar] of [[360, true], [767, true], [768, false], [1023, false], [1024, false]]) {
    const { page, context } = await open('foundations-motion-demo--demo', { width, height: 800, touch: width < 768 });
    await page.waitForSelector('lc-page h1');
    await idle(page);
    const m = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Navigation principale"].lc-tabbar, .lc-tabbar');
      const tabs = nav ? [...nav.querySelectorAll('.lc-tabbar__tab')].map((t) => ({ text: t.textContent.trim(), h: t.getBoundingClientRect().height, w: t.getBoundingClientRect().width, current: t.getAttribute('aria-current') })) : [];
      return { bar: !!nav && getComputedStyle(nav).display !== 'none', label: nav?.getAttribute('aria-label') ?? nav?.closest('nav')?.getAttribute('aria-label'), tabs };
    });
    check(m.bar === bar, `CA-36 ${width} px : barre d'onglets ${bar ? 'présente' : 'absente'}`, JSON.stringify(m));
    if (bar) {
      check(m.tabs.length === 4 && m.tabs.filter((t) => t.current === 'page').length === 1 && m.tabs.at(-1).text === 'Plus', `CA-36 ${width} px : trois rubriques primary et « Plus », un seul onglet aria-current="page"`, JSON.stringify(m.tabs));
      check(m.tabs.every((t) => t.h >= 44 && t.w >= 44), `CA-36 ${width} px : cibles ≥ 44 px`, JSON.stringify(m.tabs));
      await page.getByRole('button', { name: 'Plus' }).click();
      await idle(page);
      const open = await page.evaluate(() => !!document.querySelector('.lc-shell__nav[aria-hidden="false"], #lc-shell-nav-1') && getComputedStyle(document.querySelector('#lc-shell-nav-1')).visibility !== 'hidden');
      check(open, `CA-36 ${width} px : « Plus » ouvre le tiroir`, '');
    }
    await context.close();
  }
}

if (!wanted.length || wanted.includes('topbar')) {
  // Le relevé démarre avant le premier rendu : l'entrée dure moins d'une seconde.
  const { page, context, errors } = await open('foundations-motion-demo--demo', {
    init: () => {
      window.__top = new Map();
      const poll = () => {
        for (const a of document.getAnimations()) {
          if (a.animationName === 'lc-topbar-enter' && !window.__top.has(a)) {
            const t = a.effect.getComputedTiming();
            window.__top.set(a, { who: a.effect.target.tagName.toLowerCase(), delay: t.delay, duration: t.duration, translate: a.effect.getKeyframes()[0].translate, opacity: a.effect.getKeyframes()[0].opacity });
          }
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    },
  });
  await page.waitForSelector('lc-page h1');
  await idle(page);
  const list = (await page.evaluate(() => [...window.__top.values()])).sort((a, b) => a.delay - b.delay);
  const delay = await token(page, '--lc-topbar-enter-delay');
  const stagger = await token(page, '--lc-topbar-enter-stagger');
  check(list.length >= 4, 'd05 entrée de la barre du haut : tous les éléments animés (bouton de menu, marque, « Rejouer », bascule de thème)', `${list.length} : ${JSON.stringify(list.map((a) => a.who))}`);
  check(near(delay, 80, 0.5) && near(stagger, 30, 0.5) && list.length > 0 && near(list[0].delay, 80, FRAME), 'd05 départ à 80 ms, décalage 30 ms (site)', `${delay} ${stagger} ${JSON.stringify(list[0])}`);
  check(list.length > 0 && list.every((a) => near(a.duration, 500, 1)) && list.every((a) => /^0px -10px/.test(a.translate ?? '') && Number(a.opacity) === 0), 'd05 10 px vers le bas, fondu, 500 ms', JSON.stringify(list[0]));
  check(list.length > 1 && list.every((a, i) => i === 0 || near(a.delay - list[i - 1].delay, 30, 1) || a.delay === list[i - 1].delay), 'd05 décalage de 30 ms d\'un élément au suivant', JSON.stringify(list.map((a) => a.delay)));
  await page.evaluate(() => window.__top.clear());
  await page.getByRole('link', { name: 'Liste' }).first().click();
  await idle(page);
  const replayed = await page.evaluate(() => window.__top.size);
  check(replayed === 0, 'd05 jamais rejouée à la navigation', `${replayed}`);
  check(errors.length === 0, 'd05 aucune erreur de console', errors.join(' | '));
  await context.close();
}

if (!wanted.length || wanted.includes('demo')) {
  for (const width of [1280, 360]) {
    const { page, context, errors } = await demo(width);
    const tag = `${width} px`;
    const nav = (name) => page.getByRole('link', { name, exact: true }).locator('visible=true').first();
    const go = (name) => nav(name).evaluate((a) => a.click()); // clic DOM : la barre d'onglets peut être hors de l'écran quand la page déborde, ce que `overflow` constate à part
    const overflow = async (label) => { const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); check(w[0] <= w[1], `démo ${tag} : aucun défilement horizontal (${label})`, `scrollWidth ${w[0]} > clientWidth ${w[1]}`); };
    check(await heading(page) === 'Tableau de bord', `démo ${tag} : ouverture sur le tableau de bord`, await heading(page));
    await overflow('tableau de bord');
    await axe(page, `${tag} tableau de bord`);

    await go('Liste');
    await page.waitForTimeout(80);
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime) && a.effect.getComputedTiming().endTime > 100).length);
    const entering = await page.evaluate(() => document.querySelector('lc-page')?.classList.contains('lc-page--entering'));
    check(moving > 0, `démo ${tag} : la navigation anime quelque chose`, `${moving}`);
    check(entering === true, `démo ${tag} : la page entrante porte la fenêtre de couches`, `${entering}`);
    await page.waitForSelector('lc-page h1 .lc-visually-hidden:text-is("Liste")', { state: 'attached' });
    check(await page.evaluate(() => document.activeElement?.tagName === 'H1'), `démo ${tag} : focus sur le titre après navigation`, await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
    await idle(page);
    await overflow('liste');
    await axe(page, `${tag} liste`);

    // Annulation : le focus revient au bouton de menu de la ligne.
    const rows = () => page.locator('[data-task]').count();
    const before = await rows();
    const trigger = page.getByRole('button', { name: /^Actions : Maquette/ });
    await trigger.click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await page.getByRole('alertdialog').waitFor();
    await idle(page);
    await page.getByRole('button', { name: 'Annuler' }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    await idle(page);
    const afterCancel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    check(afterCancel === 'Actions : Maquette de l\'accueil' && await rows() === before, `démo ${tag} : annulation, focus sur le bouton de menu de la ligne, rien de supprimé`, `${afterCancel} / ${before} -> ${await rows()}`);

    // Confirmation : la ligne part, le focus va à la ligne suivante.
    await trigger.click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await page.getByRole('alertdialog').waitFor();
    await idle(page);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    await idle(page);
    const afterDelete = await page.evaluate(() => ({ task: document.activeElement?.getAttribute('data-task'), rows: document.querySelectorAll('[data-task]').length }));
    check(afterDelete.task === '2' && afterDelete.rows === before - 1, `démo ${tag} : suppression, focus sur la ligne suivante, une ligne en moins`, JSON.stringify(afterDelete));

    // Détail (niveau 2) puis retour.
    await page.locator('[data-task="2"]').click();
    await page.waitForSelector('lc-page h1 .lc-visually-hidden:text-is("Plan de test")', { state: 'attached' });
    await idle(page);
    if (width < 768) {
      check(await page.getByRole('button', { name: /‹?\s*Liste/ }).count() > 0, `démo ${tag} : bouton retour portant le titre du parent`, '');
    }
    await overflow('détail');
    await axe(page, `${tag} détail`);
    await go('Réglages');
    await page.waitForSelector('lc-page h1 .lc-visually-hidden:text-is("Réglages")', { state: 'attached' });
    await idle(page);
    await overflow('réglages');
    await axe(page, `${tag} réglages`);
    await go('Tableau de bord');
    await page.waitForSelector('lc-page h1 .lc-visually-hidden:text-is("Tableau de bord")', { state: 'attached' });
    check(true, `démo ${tag} : retour au tableau de bord`);
    check(errors.length === 0, `démo ${tag} : aucune erreur de page ni de console (dont l'annulation de la suppression)`, errors.slice(0, 3).join(' | '));
    await context.close();
  }
}

await browser.close();
server.close();
console.log(failures === 0 ? 'Tout est vert.' : `${failures} échec(s).`);
process.exit(failures === 0 ? 0 : 1);
