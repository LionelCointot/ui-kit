// Vérifications dans un vrai navigateur (Chromium via Playwright) sur le Storybook statique (`npm run build-storybook`) :
//   node tools/qa/storybook-browser.mjs axe [fragment-d-id ... | --hors-mouvement]   axe-core sur chaque story, thèmes clair et sombre (même page) ; sans argument : stories de mouvement (`--animation`, `qa-motion`) ; `--hors-mouvement` : status-badge, tree-table, slider, theme-builder…
//   node tools/qa/storybook-browser.mjs perf                      temps de rendu des 2 000 lignes de lc-tree-table (CA-K3.5)
//   node tools/qa/storybook-browser.mjs treegrid                  clavier complet de lc-tree-table, focus après re-rendu, tri sur 2 000 lignes
//   node tools/qa/storybook-browser.mjs filter-date               filtre de période de lc-data-table : calendrier dans le menu (CA-P5), panneau 360 px natif (CA-P10b)
//   node tools/qa/storybook-browser.mjs motion [fragment-d-id ...]                  mouvement (spec 2026-11-mouvement) : appui du bouton, lcReveal, entrée et sortie des panneaux ; contextes normal, réduction, forced-colors, 360 et 1280 px ; puis, sur chaque story d'animation de l'index, toute animation (CSSTransition, CSSAnimation, WAAPI) : CA-3, CA-5, CA-31 de 2026-12-mouvement-v2, puis CA-16a à CA-16c de 2026-11-mouvement (ouverture sans erreur, « Rejouer », bandeau de réduction)
//   node tools/qa/storybook-browser.mjs swipe                     lc-swipe-panels, lc-tabs en swipe, fond du segmenté (spec 2026-11-bande-a-panneaux-et-reperes, CA-1 à CA-11) ; normal et mouvement réduit à 360 px, colonnes à 1280 px
//   node tools/qa/storybook-browser.mjs dom                       comportements qui dépendent du CSS (sélection, repli, tabulation)
// Sortie : un résumé par story ; code de sortie 1 au moindre échec. Aucun accès réseau (serveur local sur dist/storybook).
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook'); // STORYBOOK_DIR : construction à part (évite de piétiner celle d'un autre processus)
const { chromium } = require('playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

/** `axe` sans argument : les stories de mouvement (ce qu'étaient `axe --animation` et `axe qa-motion`). `axe --hors-mouvement` : les stories des autres lots. */
const MOTION_AXE_FRAGMENTS = ['--animation', 'qa-motion'];
const NEW_STORY_FRAGMENTS = ['feedback-status-badge', 'data-tree-table', 'navigation-nav-group', 'bar-chart--by-role', 'area-chart--by-role', 'buttons-button--variants', 'forms-slider', 'theme-builder'];

/** Rendu fini : police chargée, deux images, plus aucune animation finie en cours (les boucles infinies, comme .lc-pulse, ne finissent jamais : ignorées), sinon axe mesure le contraste d'un texte à mi-fondu. */
async function settled(page) {
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
  await page.waitForFunction(() => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)), null, { timeout: 15000 });
}

async function openStory(browser, base, id, theme) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  // `attached` : une story dont le seul enfant est en `position:fixed` (overlays-tooltip--near-edges) a un hôte sans boîte, jamais « visible ».
  await page.waitForSelector('#storybook-root > *, #storybook-docs', { state: 'attached', timeout: 20000 });
  await settled(page).catch(() => errors.push('animations finies encore en cours après 15 s')); // un KO écrit, pas un plantage
  return { page, context, errors };
}

async function axeRun(browser, base, entries) {
  let failures = 0;
  for (const [id, title] of entries) {
    const t0 = Date.now();
    const { page, context, errors } = await openStory(browser, base, id, 'default');
    await page.addScriptTag({ content: axeSource });
    for (const theme of ['default', 'dark']) {
      if (theme === 'dark') { // même page : le sélecteur de thème de Storybook ne fait que poser ces deux attributs (.storybook/preview.ts)
        // Graphiques : ChartThemeService relit les tokens sur mutation de `data-theme` puis ECharts redessine ; état observable = le tracé (canvas ou svg) a changé puis ne bouge plus 5 images (5 s au plus : un graphique sans texte ni couleur de thème ne change pas).
        const sig = () => [...document.querySelectorAll('lc-chart-host canvas, lc-chart-host svg')].map((e) => (e.tagName === 'CANVAS' ? e.toDataURL() : e.outerHTML)).join('|');
        const hadChart = await page.evaluate(`(() => { window.__sigBefore = (${sig.toString()})(); return window.__sigBefore !== ''; })()`);
        await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); document.documentElement.style.colorScheme = 'dark'; });
        if (hadChart) {
          await page.waitForFunction(`(${sig.toString()})() !== window.__sigBefore`, null, { timeout: 5000 }).catch(() => undefined);
          await page.evaluate(`(async () => { const sig = ${sig.toString()}; let last = sig(), same = 0; while (same < 5) { await new Promise((r) => requestAnimationFrame(r)); const now = sig(); same = now === last ? same + 1 : 0; last = now; } })()`);
        }
        await settled(page).catch(() => errors.push('animations finies encore en cours après 15 s'));
      }
      const result = await page.evaluate(async () => {
        // L'addon a11y de Storybook peut avoir son propre axe.run en cours (sous charge) : attendre qu'il finisse.
        let run;
        for (let i = 0; !run; i += 1) {
          try {
            run = await window.axe.run(document.querySelector('#storybook-root'), { resultTypes: ['violations'] });
          } catch (error) {
            if (i >= 50 || !String(error?.message).includes('already running')) throw error;
            await new Promise((r) => setTimeout(r, 200));
          }
        }
        return run.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length, target: violation.nodes[0]?.target?.join(' '), summary: violation.nodes[0]?.failureSummary?.split('\n').slice(0, 3).join(' | ') }));
      });
      const ok = result.length === 0 && errors.length === 0;
      if (!ok) failures += 1;
      console.log(`${ok ? 'OK ' : 'KO '} ${theme.padEnd(7)} ${id}${ok ? '' : `\n     ${JSON.stringify(result)}${errors.length ? ` erreurs page: ${errors.join(' ; ')}` : ''}`}`);
    }
    await context.close();
    console.log(`TEMPS axe ${id} ${Date.now() - t0} ms`);
  }
  return failures;
}

/** Temps de rendu des 2 000 lignes visibles de lc-tree-table (CA-K3.5 : < 500 ms). */
async function perf(browser, base) {
  const id = 'data-tree-table--truncated-beyond-two-thousand';
  const measures = [];
  for (let run = 0; run < 5; run += 1) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    const page = await context.newPage();
    // Du premier <tr> créé jusqu'à la peinture suivant la création du 2 000e (création, mise en page, peinture).
    await page.addInitScript(() => {
      window.__perf = { first: null, done: null };
      const create = Document.prototype.createElement;
      let rows = 0;
      Document.prototype.createElement = function (name, options) {
        const element = create.call(this, name, options);
        if (String(name).toLowerCase() === 'tr') {
          rows += 1;
          if (window.__perf.first === null) window.__perf.first = performance.now();
          if (rows === 2000) window.__perf.created = performance.now();
          if (rows === 2000) requestAnimationFrame(() => requestAnimationFrame(() => { window.__perf.done = performance.now(); }));
        }
        return element;
      };
    });
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
    await page.waitForFunction(() => window.__perf.done !== null, undefined, { timeout: 30000 });
    const { first, done, created } = await page.evaluate(() => window.__perf);
    const devMode = await page.evaluate(() => typeof window.ngDevMode !== 'undefined' && !!window.ngDevMode);
    const rows = done - first;
    if (run === 0) console.log(`mode développement Angular : ${devMode} ; création des lignes : ${Math.round(created - first)} ms, mise en page et peinture : ${Math.round(done - created)} ms`);
    const count = await page.locator('tbody tr[aria-level]').count();
    measures.push({ ms: Math.round(rows), rows: count });
    await context.close();
  }
  console.log(`rendu de lc-tree-table (2 000 lignes visibles), 5 passes à froid : ${measures.map((m) => `${m.ms} ms`).join(', ')} ; lignes : ${measures[0].rows}`);
  const worst = Math.max(...measures.map((m) => m.ms));
  console.log(`${worst < 500 ? 'OK ' : 'KO '} pire passe ${worst} ms (seuil 500 ms)`);
  return worst < 500 && measures.every((m) => m.rows === 2000) ? 0 : 1;
}


/** Comportements qui dépendent du CSS réel et du focus du navigateur (non vérifiables dans jsdom). */
async function dom(browser, base) {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? 'OK ' : 'KO '} ${name}${detail ? ` : ${detail}` : ''}`);
  };

  // CA-K8.2 : groupe replié, liens hors tabulation et hors arbre d'accessibilité.
  {
    const { page, context } = await openStory(browser, base, 'navigation-nav-group--collapsible', 'default');
    const toggle = page.locator('button.lc-nav-group__toggle').first();
    const before = await toggle.getAttribute('aria-expanded');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const after = await toggle.getAttribute('aria-expanded');
    const links = page.locator('lc-nav-group').first().locator('a');
    // Replié, le contenu reste mis en page (grille à 0fr, mouvement-ios : `hidden` remplacé par `inert`) : hors tabulation et hors arbre d'accessibilité par `inert`.
    const hiddenLinks = await links.evaluateAll((nodes) => nodes.map((node) => node.closest('[inert]') !== null || node.offsetParent === null || getComputedStyle(node).visibility === 'hidden'));
    await page.keyboard.press('Tab');
    const tabbedInto = await page.evaluate(() => !!document.activeElement?.closest('lc-nav-group a'));
    check('CA-K8.2 Entrée bascule aria-expanded', before !== after, `${before} -> ${after}`);
    check('CA-K8.2 liens repliés non rendus (hors tabulation)', hiddenLinks.length > 0 && hiddenLinks.every(Boolean) && !tabbedInto, `inert ou masqués : ${hiddenLinks.join()} ; Tab entre dans un lien : ${tabbedInto}`);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    check('CA-K8.2 Espace rouvre le groupe', (await toggle.getAttribute('aria-expanded')) === before);
    await context.close();
  }

  // CA-K8.1 : mode réduit, titre lisible (dans l'arbre) mais invisible, séparateur présent.
  {
    const { page, context } = await openStory(browser, base, 'navigation-nav-group--reduced-list', 'default');
    const info = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('lc-nav-group')];
      return groups.map((group) => {
        const title = group.querySelector('.lc-nav-group__title');
        const rect = title.getBoundingClientRect();
        return { text: title.textContent.trim(), width: rect.width, height: rect.height, border: getComputedStyle(group).borderBlockStartWidth, first: group === groups[0] };
      });
    });
    check('CA-K8.1 mode réduit : titres conservés mais réduits à 1 px', info.length > 0 && info.every((entry) => entry.text && entry.width <= 1.5 && entry.height <= 1.5), JSON.stringify(info));
    check('CA-K8.1 mode réduit : séparateur visible entre groupes (hors premier)', info.slice(1).every((entry) => parseFloat(entry.border) > 0));
    await context.close();
  }

  // CA-K3.2 : un seul arrêt de tabulation dans le tableau hiérarchique.
  {
    const { page, context } = await openStory(browser, base, 'data-tree-table--all-expanded', 'default');
    const tableStops = new Set();
    await page.locator('lc-tree-table').first().evaluate((table) => table.scrollIntoView());
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Tab');
    for (let index = 0; index < 40; index += 1) {
      const inside = await page.evaluate(() => {
        const active = document.activeElement;
        const row = active?.closest?.('lc-tree-table tbody');
        return row ? `${active.tagName}.${active.getAttribute('aria-level') ?? ''}.${active.textContent.trim().slice(0, 20)}` : null;
      });
      if (inside) tableStops.add(inside);
      await page.keyboard.press('Tab');
    }
    check('CA-K3.2 Tab parcourt une seule ligne du tableau', tableStops.size === 1, JSON.stringify([...tableStops]));
    // Flèches : ↓ puis → au clavier réel.
    const firstRow = page.locator('lc-tree-table tbody tr[tabindex="0"]').first();
    await firstRow.focus();
    const firstText = await firstRow.textContent();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    const next = await page.evaluate(() => ({ text: document.activeElement?.textContent, level: document.activeElement?.getAttribute('aria-level'), tag: document.activeElement?.tagName }));
    check('CA-K3.2 ↓ déplace le focus sur la ligne suivante, niveau 2 (navigateur réel)', next.tag === 'TR' && next.text !== firstText && next.level === '2', JSON.stringify({ ...next, text: next.text?.slice(0, 20) }));
    await context.close();
  }

  // CA-K1.3 : forced-colors (bordure visible du badge).
  {
    const context = await browser.newContext({ forcedColors: 'active', viewport: { width: 1100, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${base}/iframe.html?id=feedback-status-badge--by-kind&viewMode=story`);
    await page.waitForSelector('lc-status-badge');
    const borders = await page.locator('lc-status-badge').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).borderTopColor));
    check('CA-K1.3 forced-colors : bordure du badge visible (non transparente)', borders.length === 6 && borders.every((color) => color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'), borders.join(' | '));
    await context.close();
  }
  return results.every(Boolean) ? 0 : 1;
}


/** Clavier complet du treegrid dans Chromium (focus réel, lignes re-rendues après dépliage ou repli). */
async function treegrid(browser, base) {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? 'OK ' : 'KO '} ${name}${detail ? ` : ${detail}` : ''}`);
  };
  const state = (page) => page.evaluate(() => {
    const active = document.activeElement;
    const rows = [...document.querySelectorAll('lc-tree-table tbody tr[aria-level]')];
    return {
      isRow: active?.tagName === 'TR' && !!active.closest('lc-tree-table'),
      index: rows.indexOf(active),
      level: active?.getAttribute('aria-level'),
      expanded: active?.getAttribute('aria-expanded'),
      name: active?.querySelector('.lc-tree-table__content')?.textContent.trim(),
      count: rows.length,
      tabStops: rows.filter((row) => row.getAttribute('tabindex') === '0').length,
    };
  });
  const press = async (page, key) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
    return state(page);
  };
  const open = async (id, theme = 'default') => {
    const story = await openStory(browser, base, id, theme);
    await story.page.locator('lc-tree-table tbody tr[tabindex="0"]').first().focus();
    return story;
  };

  {
    const { page, context } = await open('data-tree-table--all-expanded');
    let current = await state(page);
    const total = current.count;
    check('treegrid départ : focus sur la première ligne, niveau 1, un seul tabindex=0', current.index === 0 && current.level === '1' && current.tabStops === 1, JSON.stringify(current));
    current = await press(page, 'ArrowDown');
    check('↓ : ligne suivante (niveau 2)', current.index === 1 && current.level === '2', JSON.stringify(current));
    current = await press(page, 'ArrowUp');
    check('↑ : retour à la première ligne', current.index === 0, JSON.stringify(current));
    current = await press(page, 'ArrowUp');
    check('↑ en première ligne : sans effet, sans bouclage', current.index === 0, JSON.stringify(current));
    current = await press(page, 'End');
    check('Fin : dernière ligne visible', current.index === total - 1, JSON.stringify(current));
    current = await press(page, 'ArrowDown');
    check('↓ en dernière ligne : sans effet, sans bouclage', current.index === total - 1, JSON.stringify(current));
    current = await press(page, 'Home');
    check('Début : première ligne', current.index === 0, JSON.stringify(current));
    current = await press(page, 'ArrowLeft');
    check('← sur un parent déplié : replie, focus conservé sur la même ligne (re-rendu)', current.isRow && current.index === 0 && current.expanded === 'false' && current.count < total, JSON.stringify(current));
    current = await press(page, 'ArrowRight');
    check('→ sur un parent replié : déplie, focus conservé', current.isRow && current.index === 0 && current.expanded === 'true' && current.count === total, JSON.stringify(current));
    current = await press(page, 'ArrowRight');
    check('→ sur un parent déplié : premier enfant (niveau 2)', current.index === 1 && current.level === '2', JSON.stringify(current));
    current = await press(page, 'ArrowLeft');
    check('← sur un enfant parent déplié : replie (focus conservé)', current.index === 1 && current.expanded === 'false', JSON.stringify(current));
    current = await press(page, 'ArrowLeft');
    check('← sur un parent replié : remonte au parent (niveau 1)', current.index === 0 && current.level === '1', JSON.stringify(current));
    current = await press(page, 'Enter');
    check('Entrée : bascule (replie), focus conservé', current.isRow && current.index === 0 && current.expanded === 'false', JSON.stringify(current));
    current = await press(page, 'Space');
    check('Espace : bascule (déplie), focus conservé', current.isRow && current.index === 0 && current.expanded === 'true', JSON.stringify(current));
    // Tabulation : sortir puis revenir sur la dernière ligne active.
    await press(page, 'ArrowDown');
    await press(page, 'ArrowDown');
    const before = await state(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(80);
    current = await state(page);
    check('Tab puis Maj+Tab : retour sur la dernière ligne active, un seul arrêt', current.index === before.index && current.tabStops === 1, `${before.index} -> ${current.index}`);
    await context.close();
  }

  {
    const { page, context } = await open('données-tableau-hiérarchique--defaut');
    const start = await state(page);
    const current = await press(page, '*');
    check('* : déplie tous les frères repliés du niveau, focus conservé', current.isRow && current.index === 0 && current.count > start.count && current.expanded === 'true', JSON.stringify({ start: start.count, current }));
    const roots = await page.evaluate(() => [...document.querySelectorAll('lc-tree-table tbody tr[aria-level="1"][aria-expanded]')].map((row) => row.getAttribute('aria-expanded')));
    check('* : toutes les racines parentes sont dépliées, pas les niveaux inférieurs', roots.every((value) => value === 'true') && (await page.locator('tr[aria-level="2"][aria-expanded="true"]').count()) === 0, roots.join(','));
    await context.close();
  }

  {
    // Clic souris sur le bouton de dépliage : la ligne bascule, aucune erreur ; le focus clavier reste cohérent ensuite.
    const { page, context, errors } = await open('données-tableau-hiérarchique--defaut');
    const toggle = page.locator('lc-tree-table tbody tr[aria-level="1"] .lc-tree-table__toggle').first();
    await toggle.click();
    await page.waitForTimeout(100);
    const afterClick = await state(page);
    const expanded = await page.locator('lc-tree-table tbody tr').first().getAttribute('aria-expanded');
    check('clic sur le bouton de dépliage : ligne dépliée, un seul arrêt de tabulation', expanded === 'true' && afterClick.tabStops === 1, JSON.stringify(afterClick));
    const focusAfterClick = await page.evaluate(() => ({ tag: document.activeElement?.tagName, hidden: document.activeElement?.getAttribute('aria-hidden'), cls: document.activeElement?.className }));
    const arrow = await press(page, 'ArrowDown');
    check('après un clic souris sur le bouton de dépliage, ↓ déplace le focus de ligne (sans re-cliquer la ligne)', arrow.isRow && arrow.index >= 0, `focus après clic : ${JSON.stringify(focusAfterClick)} ; après ↓ : ${JSON.stringify(arrow)}`);
    await page.locator('lc-tree-table tbody tr').first().focus();
    const down = await press(page, 'ArrowDown');
    check('clavier après un clic souris : ↓ atteint l\'enfant', down.index === 1 && down.level === '2', JSON.stringify(down));
    check('aucune erreur de page pendant la navigation', errors.length === 0, errors.join(' ; '));
    await context.close();
  }

  {
    // Tri sur la grande arborescence : la hiérarchie et le focus unique survivent, durée mesurée.
    const { page, context } = await openStory(browser, base, 'data-tree-table--truncated-beyond-two-thousand', 'default');
    await page.waitForSelector('lc-tree-table tbody tr[aria-level]');
    const sortButton = page.locator('lc-tree-table thead th button.lc-table__sort').nth(2);
    const timings = [];
    for (let pass = 0; pass < 3; pass += 1) {
      const ms = await page.evaluate(async () => {
        const button = document.querySelectorAll('lc-tree-table thead th button.lc-table__sort')[2];
        const started = performance.now();
        button.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return performance.now() - started;
      });
      timings.push(Math.round(ms));
    }
    await sortButton.waitFor();
    const rows = await state(page);
    const ariaSort = await page.locator('lc-tree-table thead th').nth(2).getAttribute('aria-sort');
    check('tri sur 2 000 lignes visibles : 3 clics (asc, desc, aucun), chaque réaffichage < 500 ms', timings.every((ms) => ms < 500), `${timings.join(' ms, ')} ms`);
    check('tri sur 2 000 lignes : 2 000 lignes, un seul arrêt de tabulation, aria-sort retiré au 3e clic', rows.count === 2000 && rows.tabStops === 1 && ariaSort === null, JSON.stringify({ count: rows.count, tabStops: rows.tabStops, ariaSort }));
    await page.evaluate(() => document.querySelectorAll('lc-tree-table thead th button.lc-table__sort')[2].click());
    await page.waitForTimeout(300);
    const asc = await page.locator('lc-tree-table thead th').nth(2).getAttribute('aria-sort');
    const levels = await page.evaluate(() => [...document.querySelectorAll('lc-tree-table tbody tr[aria-level]')].slice(0, 400).map((row) => Number(row.getAttribute('aria-level'))));
    const jumps = levels.slice(1).filter((level, index) => level - levels[index] > 1).length;
    check('tri : aria-sort ascending et aucun saut de niveau (hiérarchie conservée)', asc === 'ascending' && jumps === 0, `aria-sort ${asc}, sauts ${jumps}`);
    // Dépliage / repli sur 2 000 lignes : durée d'une bascule au clavier.
    await page.locator('lc-tree-table tbody tr[tabindex="0"]').first().focus();
    const toggleMs = await page.evaluate(async () => {
      const row = document.querySelector('lc-tree-table tbody tr[tabindex="0"]');
      const started = performance.now();
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return performance.now() - started;
    });
    const afterToggle = await state(page);
    check('repli d\'une racine sur 2 000 lignes : < 500 ms, focus conservé sur la ligne', toggleMs < 500 && afterToggle.isRow && afterToggle.index === 0, `${Math.round(toggleMs)} ms ; ${JSON.stringify(afterToggle)}`);
    await context.close();
  }
  return results.every(Boolean) ? 0 : 1;
}

/** Filtre de période du tableau : superpositions du menu (1280 px) et mode natif du panneau (360 px), pointeur fin. */
async function filterDate(browser, base) {
  const id = 'qa-data-date-filter-of-the-table--filtre-de-periode';
  let failures = 0;
  const check = (name, ok, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK ' : 'KO '} ${name}${ok ? '' : ` : ${detail}`}`);
  };
  const open = async (width) => {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
    await page.waitForSelector('lc-data-table', { timeout: 20000 });
    await page.waitForTimeout(400);
    return { page, context };
  };
  const count = (page, selector) => page.locator(selector).count();
  const emitted = (page) => page.evaluate(() => (window.__emitted ?? []).length);
  const onFunnel = (page) => page.evaluate(() => document.activeElement?.id?.endsWith('-funnel-date') === true);
  const openCalendar = async (page) => {
    await page.click('[id$="-funnel-date"]');
    await page.waitForSelector('.lc-data-table__menu');
    await page.click('.lc-data-table__menu .lc-date-range-input__button');
    await page.waitForSelector('lc-calendar-panel');
  };

  {
    const { page, context } = await open(1280);
    await openCalendar(page);
    check('CA-P5 calendrier ouvert depuis le menu', await count(page, 'lc-calendar-panel') === 1);
    await page.click('lc-calendar-panel td.lc-calendar__day:not([aria-disabled="true"])');
    await page.waitForTimeout(300);
    check('CA-P5 clic sur une date : menu ouvert', await count(page, '.lc-data-table__menu') === 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check('CA-P5 Échap : calendrier fermé, menu ouvert', await count(page, 'lc-calendar-panel') === 0 && await count(page, '.lc-data-table__menu') === 1,
      `calendrier ${await count(page, 'lc-calendar-panel')}, menu ${await count(page, '.lc-data-table__menu')}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check('CA-P5 second Échap : menu fermé, focus sur l\'entonnoir, rien émis', await count(page, '.lc-data-table__menu') === 0 && await onFunnel(page) && await emitted(page) === 0,
      `menu ${await count(page, '.lc-data-table__menu')}, entonnoir ${await onFunnel(page)}, émissions ${await emitted(page)}`);
    await openCalendar(page);
    await page.mouse.click(1270, 400); // sur le corps de la page (un clic sur <html>, sous le corps, n'atteint pas le CDK)
    await page.waitForTimeout(300);
    check('CA-P5 clic hors des deux : les deux fermés, focus non ramené sur l\'entonnoir, rien émis',
      await count(page, 'lc-calendar-panel') === 0 && await count(page, '.lc-data-table__menu') === 0 && !(await onFunnel(page)) && await emitted(page) === 0,
      `calendrier ${await count(page, 'lc-calendar-panel')}, menu ${await count(page, '.lc-data-table__menu')}, entonnoir ${await onFunnel(page)}, émissions ${await emitted(page)}`);
    await context.close();
  }

  {
    const { page, context } = await open(360);
    await page.click('[id$="-filters"]');
    await page.waitForSelector('lc-sheet dialog[open]');
    await page.locator('lc-sheet dialog .lc-data-table__section-toggle', { hasText: 'Reçue le' }).click();
    await page.waitForSelector('dialog lc-date-range-input input');
    const types = await page.locator('dialog lc-date-range-input input').evaluateAll((nodes) => nodes.map((n) => n.type));
    check('CA-P10b 360 px, pointeur fin : champs natifs', types.length === 2 && types.every((t) => t === 'date'), JSON.stringify(types));
    check('CA-P10b aucun bouton ni calendrier du kit', await count(page, '.lc-date-range-input__button') === 0 && await count(page, 'lc-calendar-panel') === 0);
    await context.close();
  }
  return failures;
}

/** Mouvement (spec 2026-11-mouvement, section 9) : CA-6, CA-7, CA-7b, CA-8, CA-9 et la part de CA-13 qui les concerne. Stories `QA/Motion/Acceptance`. */
const MOTION_INIT = () => {
  const q = (window.__qa = { pane: null, enter: null, closing: null, flip: null, hold: false, reveal: null });
  const rootStyle = () => getComputedStyle(document.documentElement);
  const toMs = (value) => { const v = value.trim(); if (!/^-?[\d.]+m?s$/.test(v)) throw new Error(`durée illisible : "${v}"`); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000; };
  q.tokenMs = (name) => toMs(rootStyle().getPropertyValue(name));
  q.tokenPx = (name) => {
    const probe = Object.assign(document.createElement('div'), {});
    probe.style.cssText = `position:absolute;width:var(${name})`;
    document.body.append(probe);
    const px = parseFloat(getComputedStyle(probe).width);
    probe.remove();
    return px;
  };
  const transitions = (el, filter = () => true) => el.getAnimations().filter((a) => a instanceof CSSTransition && filter(a));
  const measure = (el) => {
    const list = transitions(el);
    const info = { className: el.className, props: {} };
    list.forEach((a) => a.pause());
    list.forEach((a) => { a.currentTime = 0; });
    list.forEach((a) => {
      const timing = a.effect.getComputedTiming();
      const cs = getComputedStyle(el);
      info.props[a.transitionProperty] = { duration: timing.duration, delay: timing.delay, startOpacity: cs.opacity, startTransform: cs.transform };
    });
    list.forEach((a) => a.finish());
    const cs = getComputedStyle(el);
    Object.assign(info, { endOpacity: cs.opacity, endTransform: cs.transform, transitionDuration: cs.transitionDuration, transitionDelay: cs.transitionDelay });
    return info;
  };
  q.measure = measure;
  q.transitions = transitions;
  // Pops d'ancrage (T9c, spec 2026-12-mouvement-v2) : animations (CSSTransition, CSSAnimation ou WAAPI) sur le contenu du panneau (premier enfant, hors ancres du piège à focus du CDK) ; fondu de sortie : CSSTransition d'opacité sur le conteneur.
  q.tokenMsSafe = (name) => { try { return q.tokenMs(name); } catch { return Number.NaN; } };
  const contentOf = (pane) => pane.querySelector(':scope > :not(.cdk-focus-trap-anchor)');
  const animsOf = (pane) => contentOf(pane)?.getAnimations() ?? [];
  const FAMILY = ['transform', 'translate', 'scale', 'rotate'];
  const propsOf = (a) => [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p));
  const curveOf = (a) => { const t = a.effect.getComputedTiming().easing; const k = a.effect.getKeyframes()[0]?.easing; return t === 'linear' && k && k !== 'linear' ? k : t; };
  /** Valeurs calculées de l'élément : opacité et matrice composée translate, rotate, scale, transform (comme motion-fidelity.mjs). */
  const stateOf = (el) => {
    const cs = getComputedStyle(el);
    const m = new DOMMatrix();
    const len = (v, ref) => (v.endsWith('%') ? (parseFloat(v) / 100) * ref : parseFloat(v));
    if (cs.translate !== 'none') { const [x = '0', y = '0'] = cs.translate.split(' '); m.translateSelf(len(x, el.offsetWidth), len(y, el.offsetHeight)); }
    if (cs.rotate !== 'none') m.rotateSelf(parseFloat(cs.rotate));
    if (cs.scale !== 'none') { const [x, y = x] = cs.scale.split(' ').map(parseFloat); m.scaleSelf(x, y); }
    if (cs.transform !== 'none') m.multiplySelf(new DOMMatrix(cs.transform));
    return { opacity: cs.opacity, a: m.a, d: m.d, e: m.e, f: m.f };
  };
  q.stateOf = stateOf;
  const frames = (n) => new Promise((resolve) => { const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))); step(n); });
  q.frames = frames;
  /** Mesure l'entrée d'un panneau : attend l'apparition des animations (dix images au plus), les suspend à 0 puis relève valeurs de départ, d'arrivée, durées, courbes. */
  const measurePop = async (pane, keepPaused) => {
    const content = contentOf(pane);
    let list = [];
    for (let i = 0; i < 10 && list.length === 0; i += 1) { await frames(1); list = animsOf(pane); }
    await frames(1); // le CDK pose la position et `lc-overlay--above` après le premier calcul
    list = animsOf(pane);
    q.enterSet = new Set(list);
    list.forEach((a) => a.pause());
    list.forEach((a) => { a.currentTime = 0; });
    const timings = list.map((a) => ({ props: propsOf(a), duration: a.effect.getComputedTiming().duration, delay: a.effect.getComputedTiming().delay, easing: curveOf(a) }));
    const cs = getComputedStyle(content);
    const info = { className: pane.className, list: timings, start: stateOf(content), originY: parseFloat(cs.transformOrigin.split(' ')[1]), height: content.offsetHeight };
    if (!keepPaused) list.forEach((a) => a.finish());
    info.end = stateOf(content);
    return info;
  };
  q.watchPane = (selector, keepEnterPaused = false) => {
    new MutationObserver(() => {
      const pane = document.querySelector(selector);
      if (!pane) return;
      if (!q.pane) {
        q.pane = pane;
        q.classAtAttach = pane.className;
        measurePop(pane, keepEnterPaused).then((info) => {
          q.enter = info;
          q.enterRect = pane.getBoundingClientRect().toJSON();
          q.aboveAtEnter = pane.classList.contains('lc-overlay--above');
          info.above = q.aboveAtEnter;
        });
      } else if (pane.classList.contains('lc-overlay--closing') && !q.closing) {
        const list = transitions(pane);
        q.closing = { connected: pane.isConnected, children: pane.childElementCount, enterStillRunning: animsOf(pane).some((a) => q.enterSet?.has(a) && a.playState !== 'finished'), props: list.map((a) => [a.transitionProperty, a.effect.getComputedTiming().duration]), transitionDuration: getComputedStyle(pane).transitionDuration, transitionDelay: getComputedStyle(pane).transitionDelay };
        if (q.hold) list.forEach((a) => a.pause());
        if (keepEnterPaused) animsOf(pane).forEach((a) => a.play());
      } else if (q.enter && !q.closing && !q.flip && pane.classList.contains('lc-overlay--above') !== q.aboveAtEnter) {
        q.flip = { above: pane.classList.contains('lc-overlay--above'), entering: animsOf(pane).filter((a) => !q.enterSet.has(a)).length };
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  };

  // --- lc-data-table (T6) ---
  // Cartes : à chaque insertion d'une ligne `lcReveal` (classe `lc-reveal` ou attribut), instantané des lignes (animations `lc-reveal-in` suspendues à 0, puis terminées).
  q.cardSnaps = [];
  const revealAnims = (tr) => tr.getAnimations().filter((a) => a instanceof CSSAnimation && a.animationName === 'lc-reveal-in');
  const isReveal = (n) => n.nodeType === 1 && n.matches('tr.lc-reveal, tr[lcreveal]');
  const snapCards = () => {
    const all = [...document.querySelectorAll('lc-data-table tbody tr:not(.lc-data-table__state)')].map((tr) => ({ tr, list: revealAnims(tr) }));
    all.forEach(({ list }) => list.forEach((a) => a.pause()));
    all.forEach(({ list }) => list.forEach((a) => { a.currentTime = 0; }));
    const snap = all.map(({ tr, list }, i) => {
      const cs = getComputedStyle(tr);
      return { n: i + 1, reveal: tr.classList.contains('lc-reveal') || tr.hasAttribute('lcreveal') || list.length > 0, props: list.map((a) => a.animationName), delays: list.map((a) => a.effect.getComputedTiming().delay), durations: list.map((a) => a.effect.getComputedTiming().duration), easings: list.map((a) => a.effect.getKeyframes()[0]?.easing) /* CSSAnimation : la courbe est celle des keyframes, getComputedTiming().easing vaut toujours linear */, startOpacity: cs.opacity, cssDelay: cs.animationDelay, cssDuration: cs.animationDuration };
    });
    snap.t = performance.now();
    q.cardSnaps.push(snap);
    all.forEach(({ list }) => list.forEach((a) => a.play())); // l'instantané ne doit pas terminer les entrées (sinon les lignes d'un délai de remplissage deviennent visibles : l'observateur fausserait CA-26)
  };
  new MutationObserver((records) => {
    if (records.some((r) => [...r.addedNodes].some(isReveal))) snapCards();
  }).observe(document, { subtree: true, childList: true });

  // Dialogue du téléphone : entrée (à l'attribut `open`) et sortie (à `data-closing`, fondu suspendu pour ne pas dépendre de l'horloge).
  q.watchDialog = () => {
    const dialog = document.querySelector('lc-sheet dialog');
    const own = () => dialog.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSAnimation) && a.effect.target === dialog); // T9b : glissement et fondu d'ouverture en Web Animations, fondu de sortie du voile en transition CSS
    const read = (list) => {
      list.forEach((a) => a.pause());
      list.forEach((a) => { a.currentTime = 0; });
      const cs = getComputedStyle(dialog);
      const bd = getComputedStyle(dialog, '::backdrop');
      const info = { height: dialog.offsetHeight, open: dialog.open, props: list.map((a) => `${a.effect.pseudoElement ?? 'dialog'}:${a.transitionProperty ?? [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)).join('+')}`), durations: list.map((a) => a.effect.getComputedTiming().duration), delays: list.map((a) => a.effect.getComputedTiming().delay), startOpacity: cs.opacity, startTransform: cs.transform, startTranslateY: parseFloat(cs.translate.split(' ')[1] ?? '0'), backdropStartOpacity: bd.opacity, cssDuration: cs.transitionDuration, backdropCssDuration: bd.transitionDuration };
      return info;
    };
    q.dlg = { held: [] };
    q.resetDialog = () => { q.dlg = { held: [] }; };
    new MutationObserver(() => {
      if (dialog.open && !q.dlg.enter) {
        const list = own();
        q.dlg.enter = read(list);
        list.forEach((a) => a.finish());
        q.dlg.enter.endOpacity = getComputedStyle(dialog).opacity;
        q.dlg.enter.backdropEndOpacity = getComputedStyle(dialog, '::backdrop').opacity;
      } else if (dialog.hasAttribute('data-closing') && !q.dlg.closing) {
        q.dlg.held = own();
        q.dlg.closing = read(q.dlg.held);
      }
    }).observe(dialog, { attributes: true, attributeFilter: ['open', 'data-closing'] });
    q.releaseDialog = async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const stillOpen = { open: dialog.open, closing: dialog.hasAttribute('data-closing') };
      q.dlg.held.forEach((a) => a.play());
      return stillOpen;
    };
  };

  // Pastilles : entrée à l'insertion, sortie à la suppression.
  q.chipsIn = [];
  q.chipOut = null;
  // Voisines = les autres pastilles (le survol d'un bouton qui glisse sous le pointeur n'est pas une transition de pastille).
  const chipAnims = (box) => [...box.querySelectorAll('li.lc-data-table__chip')].flatMap((li) => li.getAnimations({ subtree: true }));
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) if (n.nodeType === 1 && n.matches('li.lc-data-table__chip')) q.chipsIn.push(measure(n));
      for (const n of r.removedNodes) {
        if (n.nodeType !== 1 || !n.matches('li.lc-data-table__chip')) continue;
        const box = document.querySelector('.lc-data-table__chips');
        const out = { connected: n.isConnected, own: n.getAnimations().length, neighbours: chipAnims(box).length, remaining: box.querySelectorAll('li.lc-data-table__chip').length };
        q.chipOut = out;
        requestAnimationFrame(() => requestAnimationFrame(() => { out.neighboursLater = chipAnims(box).length; out.laterWhich = box.getAnimations({ subtree: true }).map((a) => `${a.transitionProperty ?? a.animationName}@${a.effect.target.className}`); }));
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // --- Indicateurs (T4, T5) ---
  q.frames = (n = 2) => new Promise((resolve) => { const step = (left) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1))); step(n); });
  // Forme calculée d'une courbe (même sérialisation que celle des animations) : une sonde porte `var(name)`.
  q.easing = (name) => {
    const probe = document.createElement('div');
    probe.style.animationTimingFunction = `var(${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).animationTimingFunction;
    probe.remove();
    return value;
  };
  q.rect = (el) => el.getBoundingClientRect().toJSON();
  // Zone visible d'un indicateur (T8 : deux bords animés, quelle que soit la technique) : boîte rognée par son `clip-path: inset()` calculé ; `{ left, width }` ou `{ top, height }` selon l'axe.
  q.vis = (el, axis = 'x') => {
    const r = el.getBoundingClientRect();
    let [s, e] = axis === 'x' ? [r.left, r.right] : [r.top, r.bottom];
    const m = /^inset\((.*?)(?: round .*)?\)$/.exec(getComputedStyle(el).clipPath);
    if (m) {
      const [t, rt = t, b = t, l = rt] = m[1].trim().split(/\s+/);
      const len = (x, size) => (x.endsWith('%') ? (parseFloat(x) / 100) * size : parseFloat(x));
      if (axis === 'x') { s += len(l, r.width); e -= len(rt, r.width); } else { s += len(t, r.height); e -= len(b, r.height); }
    }
    return axis === 'x' ? { left: s, right: e, top: r.top, bottom: r.bottom, width: e - s, height: r.height } : { left: r.left, right: r.right, top: s, bottom: e, width: r.width, height: e - s };
  };
  // CA-3 : état du trait des onglets à la première mesure (observateur installé avant le premier rendu) ; « mesuré » = déjà sous l'onglet sélectionné (géométrie, et non plus un style en ligne).
  q.tabs3 = { readyAt: null, firstSeen: null };
  new MutationObserver(() => {
    const host = document.querySelector('lc-tabs');
    const ind = host?.querySelector('.lc-tabs__indicator');
    if (!ind) return;
    const ready = host.classList.contains('lc-tabs--ready');
    const sel = host.querySelector('[role=tab][aria-selected=true]');
    const fit = () => { if (!sel) return false; const v = q.vis(ind), t = sel.getBoundingClientRect(); const instant = ind.getAnimations({ subtree: true }); return (Math.abs(v.left - t.left) <= 1 && Math.abs(v.width - t.width) <= 1) || (instant.length > 0 && instant.every((a) => a.effect.getTiming().duration <= 0.01)); }; // mouvement réduit : une animation de 0,01 ms n'a pas encore rendu sa valeur finale à la première lecture
    if (!q.tabs3.firstSeen) q.tabs3.firstSeen = { ready, measured: fit() };
    if (ready && !q.tabs3.readyAt) q.tabs3.readyAt = { measured: fit(), animations: ind.getAnimations({ subtree: true }).map((a) => a.effect.getTiming().duration) };
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });

  // --- Différence de liste (T6b, décision 26) : enregistreur par image des animations des lignes de lc-data-table ---
  const ROWS = 'lc-data-table tbody tr:not(.lc-data-table__state)';
  const rowKey = (tr) => tr.textContent.match(/Demande \d+/)?.[0] ?? '?';
  q.rowKeys = () => [...document.querySelectorAll(ROWS)].map(rowKey);
  q.list = null;
  /** Instantané « avant » (éléments, positions), puis enregistrement de chaque animation de ligne à sa première image. */
  q.startList = () => {
    if (q.list) q.list.stop = true;
    const rec = (q.list = { stop: false, idle: 0, before: new Map(), els: new Map(), anims: [], block: [], frames: [], changedAt: null, leavingSeen: false, keysBefore: q.rowKeys().join(), cardSnapsBefore: q.cardSnaps.length });
    document.querySelectorAll(ROWS).forEach((tr) => { rec.before.set(rowKey(tr), tr.getBoundingClientRect().top); rec.els.set(rowKey(tr), tr); });
    const seen = new WeakSet();
    const tick = (now) => {
      if (rec.stop) return;
      const all = [...document.querySelectorAll('lc-data-table tbody tr')];
      // T7 : visibilité par image (liste vidée ?), instant du premier changement de lignes, sortie en cours (data-leaving, lc-leave).
      const shown = [...document.querySelectorAll(ROWS)];
      if (rec.changedAt === null && shown.map(rowKey).join() !== rec.keysBefore) rec.changedAt = now;
      rec.frames.push({ t: now, visible: shown.filter((tr) => parseFloat(getComputedStyle(tr).opacity) > 0.01 && tr.getClientRects().length > 0 && getComputedStyle(tr).visibility !== 'hidden').length });
      if (document.querySelector('tr[data-leaving], tr.lc-leave')) rec.leavingSeen = true;
      let running = 0;
      for (const tr of all) {
        for (const a of tr.getAnimations()) {
          running += 1;
          if (seen.has(a)) continue;
          seen.add(a);
          const kf = a.effect.getKeyframes();
          const t = a.effect.getTiming();
          rec.anims.push({ seenAt: now, name: a.animationName ?? null, key: rowKey(tr), kind: a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'css' : 'waapi', props: Object.keys(kf[0] ?? {}).filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)), first: kf[0], last: kf.at(-1), duration: t.duration, delay: t.delay, easing: t.easing, fill: t.fill, leaving: tr.hasAttribute('data-leaving'), connected: tr.isConnected, leavingConnected: document.querySelectorAll('tr[data-leaving]').length });
        }
      }
      for (const a of document.querySelector('.lc-data-table__scroll')?.getAnimations() ?? []) if (!seen.has(a)) { seen.add(a); rec.block.push({ first: a.effect.getKeyframes()[0]?.transform, duration: a.effect.getTiming().duration }); }
      rec.idle = running === 0 && !document.querySelector('tr[data-leaving], tr.lc-leave') ? rec.idle + 1 : 0;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return true;
  };
  /** Bilan depuis `startList` : conservées (même élément ? positions), retirées (disparues ?), ajoutées, animations, cascades rejouées. */
  q.listReport = () => {
    const r = q.list;
    const after = new Map([...document.querySelectorAll(ROWS)].map((tr) => [rowKey(tr), tr]));
    const keys = [...r.before.keys()];
    return {
      kept: keys.filter((k) => after.has(k)).map((k) => ({ key: k, same: after.get(k) === r.els.get(k), from: r.before.get(k), to: after.get(k).getBoundingClientRect().top })),
      removed: keys.filter((k) => !after.has(k)).map((k) => ({ key: k, gone: !r.els.get(k).isConnected })),
      added: [...after.keys()].filter((k) => !r.before.has(k)),
      order: [...after.keys()],
      anims: r.anims,
      block: r.block,
      cascades: q.cardSnaps.length - r.cardSnapsBefore,
      snaps: q.cardSnaps.slice(r.cardSnapsBefore).map((s) => ({ t: s.t, rows: s.map((c) => ({ reveal: c.reveal, delay: c.delays[0], duration: c.durations[0], easing: c.easings?.[0], startOpacity: c.startOpacity })) })),
      frames: r.frames, changedAt: r.changedAt, leavingSeen: r.leavingSeen,
      move: q.tokenMs('--lc-list-move-duration'), moveEase: q.easing('--lc-list-move-easing'), exit: q.tokenMs('--lc-sys-duration-exit'), reveal: q.tokenMs('--lc-reveal-duration'), refill: (() => { try { return q.tokenMs('--lc-table-refill-delay'); } catch { return NaN; } })(), stagger: q.tokenMs('--lc-sys-motion-stagger-normal'), entrance: q.easing('--lc-sys-easing-entrance'), out: q.easing('--lc-sys-easing-out'), draw: q.easing('--lc-sys-easing-draw'), soft: q.easing('--lc-sys-easing-soft'),
    };
  };
};

/** Empreinte d'une démo de `fidelite.json` (CA-20 : la source de vérité des valeurs, avec les §5.4.1 de la spec) : durée et courbe du fondu et du mouvement, décalage et échelle de départ du pop. */
const FID = JSON.parse(await readFile(path.join(root, 'docs', 'design', 'explorations', '2026-12-mouvement-v2', 'fidelite.json'), 'utf8')).fingerprints;
const popRef = (demo, target) => {
  const list = FID[demo].triggers[0].animations.filter((a) => a.target.startsWith(target));
  const opacity = list.find((a) => a.props.length === 1 && a.props[0] === 'opacity');
  const move = list.find((a) => a.props.includes('transform') && !a.props.includes('opacity'));
  const [ty, scale] = move.keyframes[0].transform.match(/-?[\d.]+/g).map(Number);
  return { opacity: { ms: opacity.duration, easing: opacity.easing }, move: { ms: move.duration, easing: move.easing }, ty, scale };
};
// Valeurs de la spec (§5.4.1) : `menu.*` pour le menu, la liste du combobox, les calendriers et le menu de filtre ; `popover.*` pour lc-toggletip.
const MENU = { tokens: 'menu', enterMs: 400, exitMs: 150, scale: 0.92, ref: popRef('d28', 'div.menu-panel') };
const POPOVER = { tokens: 'popover', enterMs: 450, exitMs: 150, scale: 0.95, ref: popRef('d39', 'div#d39pop'), revive: false };
const PANELS = {
  menu: { ...MENU, pane: '.cdk-overlay-pane.lc-menu-overlay', open: '#trigger', host: '#trigger', reopen: 'Enter' },
  combobox: { ...MENU, pane: '.cdk-overlay-pane.lc-combobox-overlay', open: 'lc-combobox input', host: 'lc-combobox', reopen: 'ArrowDown' },
  date: { ...MENU, pane: '.cdk-overlay-pane.lc-calendar-overlay', open: 'lc-date-input button[aria-expanded]', host: 'lc-date-input', reopen: 'Enter' },
  range: { ...MENU, pane: '.cdk-overlay-pane.lc-calendar-overlay', open: 'lc-date-range-input button[aria-expanded]', host: 'lc-date-range-input', reopen: 'Enter' },
  // Menu de filtre de lc-data-table : ordinateur seulement, pas de place « middle » dans sa story ; il partage la règle CSS des panneaux et passe aux valeurs `menu.*`.
  filter: { ...MENU, pane: '.cdk-overlay-pane.lc-data-table__overlay', open: '[id$="-funnel-cat"]', host: '[id$="-funnel-cat"]', reopen: 'Enter', table: true },
  // lc-toggletip : le conteneur du panneau porte `lc-toggletip-overlay` (et `lc-overlay--above` quand il s'ouvre au-dessus), comme les autres panneaux.
  toggletip: { ...POPOVER, pane: '.cdk-overlay-pane.lc-toggletip-overlay', open: '#trigger', host: '#trigger', reopen: 'Enter' },
};
const panelStory = (spec, control, place) => (spec.table ? ['qa-motion-data-table--table', `place:${place}`] : ['qa-motion-acceptance--panel', `control:${control};place:${place}`]);
const msList = (value) => value.split(',').map((v) => v.trim()).map((v) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000));
/** Feuille du téléphone : glissement 550 ms à l'ouverture (talmo-source.md, ligne lc-sheet : « entrée 550 ms »), 300 ms à la fermeture ; fondu du voile 300 ms. */
const SHEET = { enter: 550, exit: 300, backdrop: 300 };
/** Décalage vertical (m42) d'un `transform` calculé : `none`, `matrix(a,b,c,d,e,f)` ou `matrix3d(…)` (lu à la main : DOMMatrix n'existe pas côté Node). */
const m42 = (value) => (value === 'none' ? 0 : parseFloat(value.slice(value.indexOf('(') + 1, -1).split(',')[value.startsWith('matrix3d') ? 13 : 5]));
/** Le panneau a été mesuré à l'ouverture (5 s au plus) ; sinon un échec écrit, pas un délai de 30 s qui interrompt la suite. */
const panelOpened = (page) => page.waitForFunction(() => window.__qa.enter !== null, undefined, { timeout: 5000 }).then(() => true, () => false);
const near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;
/** Deux `cubic-bezier(...)` égaux à 1e-3 près (CA-1) ; toute autre courbe : égalité de texte. */
const sameCurve = (x, y) => { const n = (c) => (/^cubic-bezier\(/.test(c) ? c.match(/-?[\d.]+/g).map(Number) : null); const [a, b] = [n(x), n(y)]; return a && b ? a.every((v, i) => near(v, b[i], 1e-3)) : x === y; };

async function motionPage(context, base, id, args = '', hash = '') {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${args ? `&args=${args}` : ''}${hash}`);
  await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 });
  return { page, errors };
}

/** lc-data-table à 360 px (spec mouvement, T6) : CA-6 (« Filtres (N) »), CA-10, CA-11, CA-12 et la part de CA-13 (dialogue, cartes, sections, pastilles). */
async function motionPhone(context, base, reduced, tag, check) {
  const ID = 'qa-motion-data-table--table';
  const FILTERS = 'button[id$="-filters"]';
  const DIALOG = 'lc-sheet dialog';
  const quick = (list) => msList(list).every((ms) => ms <= 0.01);
  const start = async () => {
    const { page, errors } = await motionPage(context, base, ID);
    await page.evaluate(() => window.__qa.watchDialog());
    await page.waitForFunction(() => window.__qa.cardSnaps.length >= 1);
    return { page, errors };
  };
  const tokens = (page) => page.evaluate(() => { const q = window.__qa; return { enter: q.tokenMs('--lc-overlay-enter-duration'), slideEnter: q.tokenMs('--lc-slide-enter-duration'), slideExit: q.tokenMs('--lc-slide-exit-duration'), exit: q.tokenMs('--lc-overlay-exit-duration'), chip: q.tokenMs('--lc-chip-enter-duration'), stagger: q.tokenMs('--lc-sys-motion-stagger-normal'), reveal: q.tokenMs('--lc-reveal-duration'), offset: q.tokenPx('--lc-sys-motion-offset-sm') }; });
  const emitted = (page) => page.evaluate(() => (window.__emitted ?? []).length);
  const openPanel = async (page) => { await page.click(FILTERS); await page.waitForFunction(() => window.__qa.dlg.enter && document.querySelector('lc-sheet dialog').open); };
  const tick = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const pick = async (page, section, option) => {
    await page.locator(`${DIALOG} .lc-data-table__section-toggle`, { hasText: section }).click();
    await page.locator(`${DIALOG} label.lc-column-filter__option`, { hasText: option }).locator('input').check();
  };
  const focusOnFilters = (page) => page.waitForFunction(() => document.activeElement?.id.endsWith('-filters'), undefined, { timeout: 3000 }).then(() => true, () => false);

  // CA-12 : cartes (rang 1 à 8 : délai croissant ; 9e et suivantes : rien).
  const cards = async (page, snap, label, rows) => {
    const t = await tokens(page);
    if (reduced) { check(snap.slice(0, 8).every((c) => quick(c.cssDelay) && quick(c.cssDuration)), `CA-12/13 ${tag} ${label}`, `délai=${snap[0].cssDelay} durée=${snap[0].cssDuration}`); return; }
    const first = snap.slice(0, 8);
    const ok1 = first.length === Math.min(8, rows) && first.every((c, i) => c.reveal && c.props.join() === 'lc-reveal-in' && c.delays.every((d) => near(d, i * t.stagger)) && c.durations.every((d) => near(d, t.reveal)) && c.startOpacity === '0');
    check(ok1, `CA-12 ${tag} ${label} cartes 1 à ${first.length}`, `délais=${first.map((c) => c.delays[0])} attendu ${first.map((c, i) => i * t.stagger)}, durées=${first[0].durations} attendu ${t.reveal}, opacité de départ=${first.map((c) => c.startOpacity)}`);
    const rest = snap.slice(8);
    if (rest.length) check(rest.every((c) => !c.reveal && c.props.length === 0 && msList(c.cssDelay).every((ms) => ms === 0)), `CA-12 ${tag} ${label} cartes 9 et suivantes (${rest.length})`, `animations=${rest.map((c) => c.props.length)} délais=${rest.map((c) => c.cssDelay)} reveal=${rest.map((c) => c.reveal)}`);
  };

  // CA-6 : appui sur « Filtres (N) ».
  const press = async (page, label) => {
    const box = await page.locator(FILTERS).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const got = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const list = window.__qa.transitions(el, (a) => ['transform', 'scale'].includes(a.transitionProperty));
      const durations = list.map((a) => a.effect.getComputedTiming().duration);
      list.forEach((a) => a.finish());
      const cs = getComputedStyle(el);
      return { durations, scale: parseFloat(cs.getPropertyValue('--lc-button-press-scale')), a: new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform).a * (cs.scale === 'none' ? 1 : parseFloat(cs.scale)), text: el.textContent.trim(), active: el.matches(':active'), cssDuration: cs.transitionDuration, pressMs: window.__qa.tokenMs('--lc-button-press-duration') };
    }, FILTERS);
    await page.mouse.move(0, 0); // relâché hors du bouton : pas de clic, le panneau ne s'ouvre pas
    await page.mouse.up();
    if (reduced) check(got.active && quick(got.cssDuration) && got.durations.every((ms) => ms <= 0.01), `CA-6/13 ${tag} ${label} « ${got.text} »`, `durées=${got.cssDuration}`);
    else check(got.active && near(got.scale, 0.97, 0.0005) && near(got.pressMs, 100) && got.durations.length > 0 && got.durations.every((ms) => near(ms, 100)) && near(got.a, 0.97, 0.001), `CA-22 (v2) ${tag} ${label} « ${got.text} »`, `échelle=${got.a.toFixed(3)} (token ${got.scale}) attendu 0,97, durées=${got.durations} (token ${got.pressMs}) attendu 100, actif=${got.active}`);
  };

  // CA-10 : entrée du dialogue.
  const entry = async (page, label) => {
    const t = await tokens(page);
    const e = await page.evaluate(() => window.__qa.dlg.enter);
        if (reduced) check(quick(e.cssDuration) && quick(e.backdropCssDuration) && e.endOpacity === '1', `CA-10/13 ${tag} ${label} entrée`, `durée dialogue=${e.cssDuration} fond=${e.backdropCssDuration} opacité finale=${e.endOpacity}`);
    else check(['dialog:translate', '::backdrop:opacity'].every((p) => e.props.includes(p)) && e.props.every((p, i) => near(e.durations[i], p.endsWith('translate') ? SHEET.enter : SHEET.backdrop)) && e.delays.every((d) => d === 0) && near(e.startTranslateY, e.height, 1) && e.backdropStartOpacity === '0' && e.endOpacity === '1' && e.backdropEndOpacity === '1', `CA-10 ${tag} ${label} entrée (feuille : translateY(100%) → 0, fond en fondu)`, `transitions=${e.props} durées=${e.durations} attendu ${SHEET.enter} (feuille) et ${SHEET.backdrop} (fond), décalageY=${e.startTranslateY} attendu ${e.height}, fond départ=${e.backdropStartOpacity}, fin=${e.endOpacity}/${e.backdropEndOpacity}`);
  };

  // CA-10 : sortie (data-closing, puis dialog.open === false après la fin du fondu).
  const exit = async (page, label, before) => {
    const t = await tokens(page);
    await page.waitForFunction(() => window.__qa.dlg.closing);
    const got = await page.evaluate(async () => ({ closing: window.__qa.dlg.closing, held: await window.__qa.releaseDialog() }));
    await page.waitForFunction(() => !document.querySelector('lc-sheet dialog').open, undefined, { timeout: 5000 });
    const after = await page.evaluate(() => ({ closingAttr: document.querySelector('lc-sheet dialog').hasAttribute('data-closing'), query: (window.__emitted ?? []).length }));
    const c = got.closing;
    if (reduced) {
      check(c.open && quick(c.cssDuration) && c.durations.every((d) => d <= 0.01), `CA-10/13 ${tag} ${label} sortie sans attente (dialogue)`, `durée dialogue=${c.cssDuration} transitions=${c.props} durées=${c.durations}`);
      check(quick(c.backdropCssDuration), `CA-13 ${tag} ${label} durée calculée du fond (::backdrop) ≤ 0,01 ms`, `durée du fond=${c.backdropCssDuration} (aucune transition ne joue : ${c.props.includes('::backdrop:opacity') ? 'si, une joue' : 'transition-property: none'})`);
    }
    else check(c.open && c.props.includes('dialog:translate') && c.props.includes('::backdrop:opacity') && c.durations.every((d) => near(d, SHEET.exit)) && got.held.open && got.held.closing, `CA-10 ${tag} ${label} sortie`, `data-closing posé, ouvert à ce moment=${c.open}, transitions=${c.props} durées=${c.durations} attendu ${SHEET.exit}, descente en cours : ouvert=${got.held.open} data-closing=${got.held.closing}`);
    check(!after.closingAttr, `CA-10 ${tag} ${label} fermé après le fondu`, `open=false, data-closing retiré=${!after.closingAttr}`);
    check(await focusOnFilters(page), `CA-10 ${tag} ${label} focus rendu au bouton « Filtres »`);
    return after.query;
  };

  // Sorties 1 et 2 : croix, Échap (rien n'est appliqué).
  for (const way of ['croix', 'Échap']) {
    const { page, errors } = await start();
    await openPanel(page);
    await entry(page, way);
    check(await page.evaluate(() => document.activeElement?.closest('.lc-sheet__header') !== null && document.querySelector('lc-sheet dialog').open), `CA-10 ${tag} ${way} focus initial dans le dialogue (croix autofocus)`);
    if (way === 'croix') await page.click(`${DIALOG} .lc-sheet__close`); else await page.keyboard.press('Escape');
    const emissions = await exit(page, way);
    check(emissions === 0, `CA-10 ${tag} ${way} aucun filtre appliqué`, `émissions=${emissions}`);
    check(errors.length === 0, `erreurs page ${tag} ${way}`, errors.join(' ; '));
    await page.close();
  }

  // Sortie 3 (« Afficher N … ") + CA-11 + CA-12 + CA-6, dans un même parcours.
  const { page, errors } = await start();
  await cards(page, (await page.evaluate(() => window.__qa.cardSnaps[0])), 'chargement', 14);
  await press(page, 'sans filtre');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await tick(page);
  check(await page.evaluate(() => document.querySelector('tbody').getAnimations({ subtree: true }).length) === 0, `CA-12 ${tag} aucune transition au défilement`);
  await openPanel(page);
  await entry(page, 'Afficher');
  await pick(page, 'Catégorie', 'Beta');
  await page.evaluate(() => window.__qa.startList());
  // Section dépliée : hauteur animée de la spec 2026-11-mouvement-ios (CA-H1 à H5, `ios-motion-browser.mjs collapse`).
  await page.locator(`${DIALOG} .lc-data-table__panel-apply`, { hasText: /\d/ }).waitFor();
  const label = await page.locator(`${DIALOG} .lc-data-table__panel-apply`).innerText();
  await page.click(`${DIALOG} .lc-data-table__panel-apply`);
  const emissions = await exit(page, `« ${label.trim()} »`);
  const filters = await page.evaluate(() => JSON.stringify((window.__emitted ?? []).at(-1)?.filters));
  check(emissions === 1 && filters === '{"cat":["Beta"]}', `CA-10 ${tag} « Afficher N » : filtres appliqués inchangés`, `émissions=${emissions}, filtres=${filters}`);
  // Pastille ajoutée.
  await page.waitForFunction(() => window.__qa.chipsIn.length >= 1);
  {
    const t = await tokens(page);
    const chip = await page.evaluate(() => window.__qa.chipsIn[0]);
    if (reduced) check(quick(chip.transitionDuration), `CA-11b/13 ${tag} pastille ajoutée`, `durée=${chip.transitionDuration}`);
    else check(Object.keys(chip.props).join() === 'opacity' && near(chip.props.opacity.duration, t.chip) && chip.props.opacity.delay === 0 && chip.props.opacity.startOpacity === '0' && chip.endOpacity === '1', `CA-11b ${tag} pastille ajoutée`, `props=${JSON.stringify(chip.props)} attendu opacité seule, durée ${t.chip}, fin=${chip.endOpacity}`);
  }
  // CA-26 (spec mouvement-v2 §12, qui remplace la décision 26 de 2026-11-mouvement) : après « Afficher N … », la liste est vidée puis les 10 cartes entrent en cascade (détail dans `motionList`).
  await page.waitForFunction(() => window.__qa.rowKeys().length === 10 && window.__qa.list.idle >= 6, undefined, { timeout: 10000 });
  {
    const r = await page.evaluate(() => window.__qa.listReport());
    check(r.order.length === 10 && (reduced || r.cascades >= 1), `CA-26 ${tag} après « Afficher N » : liste reconstruite, une cascade rejouée (10 cartes)`, `cascades rejouées=${r.cascades}, cartes=${r.order.length}`);
  }
  await press(page, 'avec filtres');
  // Deuxième filtre : deux pastilles, puis retrait de l'une.
  await page.evaluate(() => window.__qa.resetDialog());
  await openPanel(page);
  await pick(page, 'Zone', 'Nord');
  await page.locator(`${DIALOG} .lc-data-table__panel-apply`, { hasText: /\d/ }).waitFor();
  await page.click(`${DIALOG} .lc-data-table__panel-apply`);
  await page.waitForFunction(() => window.__qa.dlg.closing);
  await page.evaluate(() => window.__qa.releaseDialog());
  await page.waitForFunction(() => !document.querySelector('lc-sheet dialog').open && document.querySelectorAll('li.lc-data-table__chip').length === 2, undefined, { timeout: 5000 });
  await page.waitForFunction(() => window.__qa.list.idle >= 6 && window.__qa.rowKeys().length > 0, undefined, { timeout: 10000 }); // cascade du deuxième filtre terminée
  const snapsBefore = await page.evaluate(() => window.__qa.cardSnaps.length);
  await page.evaluate(() => { window.__qa.chipOut = null; });
  await page.locator('.lc-data-table__chip-remove').first().click();
  await page.waitForFunction(() => window.__qa.chipOut?.neighboursLater !== undefined);
  const out = await page.evaluate(() => window.__qa.chipOut);
  check(!out.connected && out.own === 0 && out.neighbours === 0 && out.neighboursLater === 0 && out.remaining === 1, `CA-11c ${tag} pastille retirée`, `dans le DOM=${out.connected}, animations de la pastille=${out.own}, des pastilles voisines=${out.neighbours} puis ${out.neighboursLater} (toutes animations de la zone : ${out.laterWhich}), pastilles restantes=${out.remaining}`);
  const replayed = await page.waitForFunction((n) => window.__qa.cardSnaps.length > n, snapsBefore, { timeout: 4000 }).then(() => true, () => false);
  await page.waitForFunction(() => window.__qa.list.idle >= 6 && window.__qa.rowKeys().length > 0, undefined, { timeout: 10000 });
  const snapsAfterChip = await page.evaluate(() => window.__qa.cardSnaps.length);
  check(reduced || replayed, `CA-26 ${tag} retrait d'une pastille = changement de filtre : la cascade est rejouée`, `cascades rejouées=${snapsAfterChip - snapsBefore}`);
  await page.selectOption('select.lc-data-table__sort-select', 'name:desc');
  await tick(page);
  await tick(page);
  const snapsAfterSort = await page.evaluate(() => window.__qa.cardSnaps.length);
  check(snapsAfterSort === snapsAfterChip, `CA-12 ${tag} aucune cascade au tri`, `cascades rejouées=${snapsAfterSort - snapsAfterChip}`);
  check(errors.length === 0, `erreurs page ${tag} parcours filtre`, errors.join(' ; '));
  await page.close();

  // Ordinateur : pas de cascade (cartes du téléphone seulement) : vérifié à 1280 px ci-dessous par l'appelant.
}

const easeNums = (e) => e.match(/-?[\d.]+/g)?.map(Number) ?? [];
/** Deux courbes identiques à la sérialisation près (nombres arrondis différemment) ; `linear` seul est refusé : la courbe attendue est `cubic-bezier` (easing-standard). */
const sameEase = (a, b) => a.startsWith('cubic-bezier(') && b.startsWith('cubic-bezier(') && easeNums(a).length === easeNums(b).length && easeNums(a).every((n, i) => Math.abs(n - easeNums(b)[i]) < 1e-3);
const reducedMs = (list) => msList(list).every((ms) => ms <= 0.01);
const ink = (el) => { const cs = getComputedStyle(el); const solid = (c) => c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'; const b = parseFloat(cs.borderBlockEndWidth) > 0 && cs.borderBlockEndStyle !== 'none' ? cs.borderBlockEndColor : 'none'; const o = parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none' ? cs.outlineColor : 'none'; return { border: b, outline: o, background: cs.backgroundColor, visible: solid(b === 'none' ? 'transparent' : b) || solid(o === 'none' ? 'transparent' : o) || solid(cs.backgroundColor) }; };

/** lc-tabs et lc-nav-list (spec mouvement, T4, T5, T6c) : CA-2, 2b, 2c, 3, 4, 4b, CA-5, CA-14, CA-24 (indicateurs) et la part de CA-13. */
async function motionIndicators(context, base, name, tag, width, check) {
  const reduced = name === 'reduced';
  const forced = name === 'forced';
  const TABS = 'qa-motion-navigation--tabs';
  const NAV = 'qa-motion-navigation--nav';
  const byText = (text) => `[...document.querySelectorAll('[role=tab]')].find((b) => b.textContent.includes('${text}'))`;
  const fitTab = (page) => page.evaluate(() => { const q = window.__qa; const ind = q.vis(document.querySelector('.lc-tabs__indicator')); const tab = q.rect(document.querySelector('[role=tab][aria-selected=true]')); return { ind, tab }; });
  const finishTabs = (page) => page.evaluate(() => document.querySelector('.lc-tabs__indicator').getAnimations({ subtree: true }).forEach((a) => a.finish()));
  const fits = (r) => near(r.ind.left, r.tab.left, 1) && near(r.ind.width, r.tab.width, 1);
  const fmt = (r) => `indicateur x=${r.ind.left.toFixed(1)} l=${r.ind.width.toFixed(1)}, onglet x=${r.tab.left.toFixed(1)} l=${r.tab.width.toFixed(1)}`;
  const start = async (id, args = '', hash = '') => { const r = await motionPage(context, base, id, args, hash); return r; };

  // CA-3 puis CA-2 / CA-24 / CA-13 : premier affichage, puis clic sur un autre onglet.
  {
    const { page, errors } = await start(TABS);
    await page.waitForFunction(() => document.querySelector('.lc-tabs__indicator:not([hidden])') && window.__qa.tabs3.readyAt);
    await page.evaluate(() => window.__qa.frames(3));
    const t3 = await page.evaluate(() => window.__qa.tabs3);
    check(t3.firstSeen && !(t3.firstSeen.ready && !t3.firstSeen.measured) && t3.readyAt.measured && t3.readyAt.animations.every((d) => d <= 0.01), `CA-3 ${tag} premier affichage sans transition, ready après la mesure`, `vu en premier=${JSON.stringify(t3.firstSeen)}, à ready=${JSON.stringify(t3.readyAt)}`);
    check(fits(await fitTab(page)), `CA-3 ${tag} trait sous l'onglet sélectionné au départ`, fmt(await fitTab(page)));
    const got = await page.evaluate(async (js) => {
      const q = window.__qa; const ind = document.querySelector('.lc-tabs__indicator');
      const tab = eval(js);
      tab.click(); await q.frames(2);
      const list = ind.getAnimations({ subtree: true });
      const info = list.map((a) => { const kf = a.effect.getKeyframes(); const t = a.effect.getTiming(); return { p: a.transitionProperty ?? a.animationName ?? '', d: t.duration, delay: t.delay, e: t.easing === 'linear' && kf[0]?.easing && kf[0].easing !== 'linear' ? kf[0].easing : t.easing }; });
      const css = getComputedStyle(ind);
      const out = { info, cssDuration: css.transitionDuration, front: q.tokenMs('--lc-tabs-indicator-front-duration'), back: q.tokenMs('--lc-tabs-indicator-back-duration'), backDelay: q.tokenMs('--lc-tabs-indicator-back-delay'), frontEase: q.easing('--lc-tabs-indicator-front-easing'), backEase: q.easing('--lc-tabs-indicator-back-easing') };
      list.forEach((a) => a.finish());
      out.rect = q.vis(ind); out.tab = q.rect(tab);
      return out;
    }, byText('Graphiques'));
    if (reduced) {
      check(got.info.every((i) => i.d <= 0.01 && i.delay <= 0.01), `CA-2/13 ${tag} indicateur saute (durées et délais ≤ 0,01 ms)`, `transitions=${JSON.stringify(got.info)}`);
    } else if (!forced) {
      // CA-21 : deux bords, avant 380 ms « title », arrière 400 ms « inout » décalé de 80 ms (§5.4.1 ; valeurs de la spec, puis tokens résolus). La géométrie des deux bords est mesurée par `indicators-browser.mjs`.
      check(near(got.front, 380) && near(got.back, 400) && near(got.backDelay, 80), `CA-21 ${tag} onglets : tokens résolus 380 ms / 400 ms / 80 ms`, `front=${got.front} back=${got.back} délai=${got.backDelay}`);
      check(got.info.some((i) => near(i.d, 380) && i.delay === 0 && sameEase(i.e, got.frontEase)) && got.info.some((i) => near(i.d, 400) && near(i.delay, 80) && sameEase(i.e, got.backEase)), `CA-21 ${tag} onglets : bord avant 380 ms (title), bord arrière 400 ms (inout) décalé de 80 ms`, `animations=${JSON.stringify(got.info.map((i) => [i.p, i.d, i.delay, i.e.slice(0, 30)]))}`);
    }
    check(fits({ ind: got.rect, tab: got.tab }), `CA-2 ${tag} après finish : position et largeur de l'onglet (± 1 px)`, fmt({ ind: got.rect, tab: got.tab }));
    check(errors.length === 0, `erreurs page ${tag} tabs`, errors.join(' ; '));
    await page.close();
  }

  if (!reduced && !forced) {
    // CA-2b : deux clics rapprochés.
    {
      const { page } = await start(TABS);
      await page.waitForSelector('.lc-tabs--ready');
      await page.evaluate(() => window.__qa.frames(3));
      const r = await page.evaluate(async () => {
        const q = window.__qa; const ind = document.querySelector('.lc-tabs__indicator');
        const by = (t) => [...document.querySelectorAll('[role=tab]')].find((b) => b.textContent.includes(t));
        const x = () => q.vis(ind).right; // bord de fin, bord avant des déplacements vers la droite (T8 : deux bords animés)
        const c = by('Graphiques'); const j = by('Journal');
        const x0 = x();
        c.click(); await q.frames(4);
        const mid = x(); const x1 = c.getBoundingClientRect().right;
        j.click(); await q.frames(2);
        const list = ind.getAnimations({ subtree: true });
        list.forEach((a) => a.pause()); list.forEach((a) => { a.currentTime = 0; });
        const startX = x();
        // Les deux bords animent : tout terminer avant de mesurer l'arrivée.
        ind.getAnimations({ subtree: true }).forEach((a) => a.finish());
        return { x0, x1, mid, startX, count: list.length, rect: q.vis(ind), tab: q.rect(j) };
      });
      check(r.count > 0 && r.startX > r.x0 + 0.5 && r.startX < r.x1 - 0.5 && r.mid > r.x0 + 0.5 && r.mid < r.x1 - 0.5, `CA-2b ${tag} la seconde animation part de la position courante (bord de fin)`, `départ=${r.x0.toFixed(1)}, arrivée de la première=${r.x1.toFixed(1)}, position à mi-course=${r.mid.toFixed(1)}, départ de la seconde=${r.startX.toFixed(1)}`);
      check(fits({ ind: r.rect, tab: r.tab }), `CA-2b ${tag} finit sous le dernier onglet cliqué`, fmt({ ind: r.rect, tab: r.tab }));
      await page.close();
    }
    // CA-4 : défilement et redimensionnement (360 px : onglets qui défilent).
    if (width === 360) {
      const { page } = await start(TABS);
      await page.waitForSelector('.lc-tabs--ready');
      await page.evaluate((js) => { eval(js).click(); }, byText('Couverture'));
      await page.evaluate(() => window.__qa.frames(3));
      await finishTabs(page);
      const overflow = await page.evaluate(() => { const l = document.querySelector('.lc-tabs__list'); return l.scrollWidth - l.clientWidth; });
      check(overflow > 0, `CA-4 ${tag} précondition : les onglets défilent`, `débordement=${overflow}px`);
      for (const where of ['0', 'max']) {
        await page.evaluate(async (w) => { const l = document.querySelector('.lc-tabs__list'); l.scrollTo({ left: w === '0' ? 0 : l.scrollWidth, behavior: 'instant' }); await window.__qa.frames(3); }, where);
        const r = await fitTab(page);
        check(fits(r), `CA-4 ${tag} après défilement (scrollLeft ${where})`, fmt(r));
      }
      for (const w of [300, 360]) {
        await page.setViewportSize({ width: w, height: 640 });
        await page.evaluate(() => window.__qa.frames(4));
        await finishTabs(page);
        const r = await fitTab(page);
        check(fits(r), `CA-4 ${tag} après changement de largeur (${w} px)`, fmt(r));
      }
      await page.close();
    }
    // CA-4b : libellé plus long, onglet ajouté, onglet retiré.
    {
      const { page } = await start(TABS);
      await page.waitForSelector('.lc-tabs--ready');
      for (const [id, what] of [['relabel', 'libellé modifié'], ['add', 'onglet ajouté'], ['remove', 'onglet retiré']]) {
        await page.click(`#${id}`);
        await page.evaluate(() => window.__qa.frames(4));
        await finishTabs(page);
        const r = await fitTab(page);
        check(fits(r), `CA-4b ${tag} ${what}`, fmt(r));
      }
      await page.close();
    }
  }

  // CA-2c : aucun onglet sélectionné (tous désactivés) : trait masqué.
  {
    const { page } = await start(TABS, 'none:!true');
    await page.waitForSelector('lc-tabs');
    await page.evaluate(() => window.__qa.frames(3));
    const r = await page.evaluate(() => { const ind = document.querySelector('.lc-tabs__indicator'); return { hidden: ind.hidden, display: getComputedStyle(ind).display, selected: document.querySelectorAll('[role=tab][aria-selected=true]').length }; });
    check(r.hidden && r.display === 'none' && r.selected === 0, `CA-2c ${tag} indicateur masqué sans onglet sélectionné`, `hidden=${r.hidden} display=${r.display} onglets sélectionnés=${r.selected}`);
    await page.close();
  }

  // CA-14 : forced-colors, onglet sélectionné distinct d'un onglet inactif.
  if (forced) {
    const { page } = await start(TABS);
    await page.waitForSelector('.lc-tabs--ready');
    const r = await page.evaluate((ink) => { const f = eval(ink); const sel = document.querySelector('[role=tab][aria-selected=true]'); const other = document.querySelector('[role=tab][aria-selected=false]'); const ind = document.querySelector('.lc-tabs__indicator'); return { sel: f(sel), other: f(other), indicator: getComputedStyle(ind).backgroundColor }; }, ink.toString());
    check(r.sel.visible && JSON.stringify(r.sel) !== JSON.stringify(r.other), `CA-14 ${tag} onglet sélectionné distinct d'un onglet inactif`, `sélectionné=${JSON.stringify(r.sel)} inactif=${JSON.stringify(r.other)} trait=${r.indicator}`);
    await page.close();
  }

  // --- lc-nav-list ---
  const navRect = (page, item) => page.evaluate((sel) => { const q = window.__qa; return { ind: q.vis(document.querySelector('.lc-nav-list__indicator'), 'y'), item: q.rect(document.querySelector(sel)) }; }, item);
  const navFits = (r) => near(r.ind.top, r.item.top, 1) && near(r.ind.height, r.item.height, 1);
  const navFmt = (r) => `indicateur y=${r.ind.top.toFixed(1)} h=${r.ind.height.toFixed(1)}, élément y=${r.item.top.toFixed(1)} h=${r.item.height.toFixed(1)}`;
  {
    const { page, errors } = await start(NAV, '', '#/a');
    await page.waitForSelector('#item-a.lc-nav-item--active');
    await page.evaluate(() => window.__qa.frames(3));
    await page.evaluate(() => document.querySelector('.lc-nav-list__indicator').getAnimations({ subtree: true }).forEach((a) => a.finish()));
    if (!forced) check(navFits(await navRect(page, '#item-a')), `CA-5a ${tag} indicateur sur l'élément actif au départ`, navFmt(await navRect(page, '#item-a')));
    const got = await page.evaluate(async () => {
      const q = window.__qa; const ind = document.querySelector('.lc-nav-list__indicator');
      document.querySelector('#item-b').click(); await q.frames(2);
      const list = ind.getAnimations({ subtree: true });
      const info = list.map((a) => { const kf = a.effect.getKeyframes(); const t = a.effect.getTiming(); return { p: a.transitionProperty ?? a.animationName ?? '', d: t.duration, delay: t.delay, e: t.easing === 'linear' && kf[0]?.easing && kf[0].easing !== 'linear' ? kf[0].easing : t.easing }; });
      const out = { info, cssDuration: getComputedStyle(ind).transitionDuration, front: q.tokenMs('--lc-nav-item-indicator-front-duration'), back: q.tokenMs('--lc-nav-item-indicator-back-duration'), backDelay: q.tokenMs('--lc-nav-item-indicator-back-delay'), frontEase: q.easing('--lc-nav-item-indicator-front-easing'), backEase: q.easing('--lc-nav-item-indicator-back-easing') };
      list.forEach((a) => a.finish());
      return out;
    });
    if (forced) {
      const r = await page.evaluate((ink) => { const f = eval(ink); return { active: f(document.querySelector('#item-b')), other: f(document.querySelector('#item-c')), indicator: getComputedStyle(document.querySelector('.lc-nav-list__indicator')).display }; }, ink.toString());
      check(r.active.visible && JSON.stringify(r.active) !== JSON.stringify(r.other) && r.indicator === 'none', `CA-14 ${tag} élément de nav actif distinct d'un inactif, indicateur masqué`, `actif=${JSON.stringify(r.active)} inactif=${JSON.stringify(r.other)} indicateur display=${r.indicator}`);
    } else if (reduced) {
      check(got.info.every((i) => i.d <= 0.01 && i.delay <= 0.01), `CA-5a/13 ${tag} indicateur saute (durées et délais ≤ 0,01 ms)`, `transitions=${JSON.stringify(got.info)}`);
      check(navFits(await navRect(page, '#item-b')), `CA-5a/13 ${tag} indicateur sur l'élément actif après le clic`, navFmt(await navRect(page, '#item-b')));
    } else {
      check(near(got.front, 380) && near(got.back, 400) && near(got.backDelay, 80), `CA-21 ${tag} nav : tokens résolus 380 ms / 400 ms / 80 ms`, `front=${got.front} back=${got.back} délai=${got.backDelay}`);
      check(got.info.some((i) => near(i.d, 380) && i.delay === 0 && sameEase(i.e, got.frontEase)) && got.info.some((i) => near(i.d, 400) && near(i.delay, 80) && sameEase(i.e, got.backEase)), `CA-21 ${tag} nav : bord avant 380 ms (title), bord arrière 400 ms (inout) décalé de 80 ms`, `animations=${JSON.stringify(got.info.map((i) => [i.p, i.d, i.delay, i.e.slice(0, 30)]))}`);
      check(navFits(await navRect(page, '#item-b')), `CA-5a ${tag} après finish : indicateur sur l'élément (± 1 px)`, navFmt(await navRect(page, '#item-b')));
    }
    check(errors.length === 0, `erreurs page ${tag} nav`, errors.join(' ; '));
    await page.close();
  }
  if (!forced) {
    // CA-5b, 5c : élément actif dans un groupe replié, puis dépliage.
    {
      const { page } = await start(NAV, 'g2:!false', '#/d');
      await page.waitForSelector('#item-d.lc-nav-item--active', { state: 'attached' });
      await page.evaluate(() => window.__qa.frames(3));
      const hidden = await page.evaluate(() => { const ind = document.querySelector('.lc-nav-list__indicator'); ind.getAnimations({ subtree: true }).forEach((a) => a.finish()); return { cls: ind.classList.contains('lc-nav-list__indicator--hidden'), opacity: getComputedStyle(ind).opacity, itemRect: document.querySelector('#item-d').getBoundingClientRect().height }; });
      check(hidden.cls && hidden.opacity === '0', `CA-5b ${tag} groupe replié : indicateur masqué`, `masqué=${hidden.cls} opacité=${hidden.opacity} hauteur de l'élément actif=${hidden.itemRect}`);
      const r = await page.evaluate(async () => {
        const q = window.__qa; const ind = document.querySelector('.lc-nav-list__indicator');
        [...document.querySelectorAll('.lc-nav-group__toggle')][1].click();
        const perFrame = [];
        for (let i = 0; i < 6; i += 1) { await q.frames(1); perFrame.push(ind.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSTransition && a.transitionProperty === 'opacity')).length); }
        ind.getAnimations({ subtree: true }).forEach((a) => a.finish());
        await q.frames(2);
        return { perFrame, ind: q.vis(ind, 'y'), item: q.rect(document.querySelector('#item-d')), opacity: getComputedStyle(ind).opacity };
      });
      check(r.perFrame.every((n) => n === 0), `CA-5c ${tag} au dépliage : aucune animation de position de l'indicateur (6 premières images)`, `animations hors opacité par image=${r.perFrame}`);
      check(navFits(r) && r.opacity === '1', `CA-5c ${tag} après dépliage : indicateur sous l'élément actif, visible`, `${navFmt(r)}, opacité=${r.opacity}`);
      await page.close();
    }
    // CA-5d : élément hors liste.
    {
      const { page } = await start(NAV, '', '#/out');
      await page.waitForSelector('#item-out.lc-nav-item--active', { state: 'attached' });
      // La couleur de fond est lue une fois les transitions finies (sinon elle est lue à mi-chemin, ou avant leur création : test instable) ; attente bornée.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await finiteIdle(page, `CA-5d ${tag} hors liste`, check, 3000);
      const r = await page.evaluate(() => ({ out: getComputedStyle(document.querySelector('#item-out')).backgroundColor, indicated: document.querySelector('#item-out').classList.contains('lc-nav-item--indicated'), inactive: getComputedStyle(document.querySelector('#item-a')).backgroundColor, primary: (() => { const p = document.createElement('div'); p.style.background = 'var(--lc-nav-item-active-background, var(--lc-sys-color-primary-container))'; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; })() }));
      check(!r.indicated && r.out === r.primary && r.out !== 'rgba(0, 0, 0, 0)' && r.out !== r.inactive, `CA-5d ${tag} hors liste : fond actif porté par l'élément`, `fond=${r.out} attendu ${r.primary}, inactif=${r.inactive}, indicated=${r.indicated}`);
      await page.close();
    }
  }
}

/** Ferme les panneaux modaux laissés ouverts par un « Rejouer » (feuille, dialogue) : sinon les « Rejouer » suivants sont inaccessibles au rôle. Un panneau naît une ou deux images après le clic : on attend d'abord le calme (aucune animation finie en cours, 300 ms de suite), puis Échap tant qu'un panneau reste ouvert. */
const closePanels = async (page) => {
  const calm = async () => { for (let quiet = 0, i = 0; quiet < 3 && i < 80; i += 1) { quiet = (await page.evaluate(() => [...document.getAnimations()].some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending)))) ? 0 : quiet + 1; await page.waitForTimeout(100); } };
  await calm();
  for (let i = 0; i < 6 && (await page.evaluate(() => !!document.querySelector('dialog[open], .cdk-overlay-pane'))); i += 1) {
    await page.keyboard.press('Escape');
    await calm();
  }
};
/** Liste de lc-data-table (spec mouvement-v2, T7) : CA-26 sur de vraies actions ; cartes à 360 px, lignes à 1 280 px.
 *  Attendus tirés de la spec (§5.4.2) et des démos d07, d08, d33, d36 du catalogue, pas du code : filtre (et retrait du filtre) = liste vidée, puis cascade après 200 ms (40 ms par rang, 550 ms, 8 rangs au plus) ;
 *  tri = glissement de 420 ms `draw` des lignes qui changent de place, rien d'autre ; suppression = sortie `lc-leave` (token d'exit, sans fondu propre), puis glissement des voisines (420 ms `draw`). */
async function motionList(context, base, reduced, tag, phone, check) {
  const ID = 'qa-motion-data-table--table';
  const { page, errors } = await motionPage(context, base, ID);
  await page.waitForFunction(() => window.__qa.rowKeys().length === 14);
  if (phone) await page.waitForFunction(() => window.__qa.cardSnaps.length >= 1);
  const all = Array.from({ length: 14 }, (_, i) => `Demande ${i + 1}`);
  // Les animations naissent une ou deux images après le changement du DOM : on laisse passer 8 images avant de compter le calme.
  const idle = async (extra = '') => { await page.evaluate(() => window.__qa.frames(8)); await idle0(extra); };
  const idle0 = (extra = '') => page.waitForFunction((cond) => window.__qa.list.idle >= 6 && (cond ? eval(cond) : true), extra, { timeout: 10000 });
  const begin = async () => { await page.evaluate(() => window.__qa.startList()); await idle0(); };
  const beta = async () => {
    if (phone) {
      await page.click('button[id$="-filters"]');
      await page.waitForFunction(() => document.querySelector('lc-sheet dialog')?.open);
      await page.locator('lc-sheet dialog .lc-data-table__section-toggle', { hasText: 'Catégorie' }).click();
      await page.locator('lc-sheet dialog label.lc-column-filter__option', { hasText: 'Beta' }).locator('input').check();
      await page.locator('lc-sheet dialog .lc-data-table__panel-apply', { hasText: /\d/ }).click();
    } else {
      await page.click('[id$="-funnel-cat"]');
      await page.locator('.lc-data-table__overlay label.lc-column-filter__option', { hasText: 'Beta' }).locator('input').check();
      await page.locator('.lc-data-table__overlay button', { hasText: 'Appliquer' }).click();
    }
  };
  const report = () => page.evaluate(() => window.__qa.listReport());
  const near1 = (a, b) => Math.abs(a - b) <= 1.5;
  const translateY = (t) => parseFloat(t?.match(/translateY\((-?[\d.]+)px\)/)?.[1] ?? 'NaN');
  const waapiOf = (r) => r.anims.filter((a) => a.kind === 'waapi');
  const lastGlide = (r, key) => waapiOf(r).filter((a) => a.key === key && a.props.includes('transform')).at(-1);

  /** Conservées : même élément DOM, qui glissent de leur ancienne place à la nouvelle (420 ms, courbe draw) ; `strict` : celles qui n'ont pas bougé n'animent rien. */
  const glides = (r, label, { strict = false } = {}) => {
    const moved = r.kept.filter((k) => Math.abs(k.from - k.to) >= 0.5);
    const bad = moved.filter((k) => {
      const a = lastGlide(r, k.key);
      if (!a || !(a.last.transform === 'none' && near(a.duration, 420) && near(a.duration, r.move) && a.delay === 0 && sameEase(a.easing, r.moveEase))) return true;
      const slack = Math.max(1.5, 0.1 * Math.abs(k.from - k.to));
      const start = k.to + translateY(a.first.transform);
      return !(start >= Math.min(k.from, k.to) - slack && start <= Math.max(k.from, k.to) + slack) || (strict && !near1(translateY(a.first.transform), k.from - k.to));
    });
    check(moved.length > 0 && bad.length === 0, `CA-26 ${tag} ${label} conservées : glissement de 420 ms, courbe draw, de l'ancienne à la nouvelle place`, `déplacées=${moved.length}, non conformes=${bad.map((k) => `${k.key} (de ${k.from} à ${k.to}, animations ${JSON.stringify(waapiOf(r).filter((a) => a.key === k.key).map((a) => [a.first.transform, a.duration, a.easing.slice(0, 30)]))})`)}`);
    check(near(r.move, 420) && sameEase(r.moveEase, r.draw), `CA-26 ${tag} ${label} tokens list-move : 420 ms, easing draw`, `durée=${r.move} courbe=${r.moveEase.slice(0, 40)}`);
    if (strict) {
      const still = r.kept.filter((k) => Math.abs(k.from - k.to) < 0.5);
      check(still.every((k) => !lastGlide(r, k.key)), `CA-26 ${tag} ${label} pas de glissement pour une ligne qui n'a pas bougé`, `lignes immobiles animées=${still.filter((k) => lastGlide(r, k.key)).map((k) => k.key)}`);
    }
  };

  /** Filtre : liste vidée d'un coup (rien ne sort), puis cascade des lignes affichées après `refill` (200 ms, d08), 40 ms par rang, 550 ms, rang plafonné à 8. */
  const refill = (r, label, expectCount) => {
    if (reduced) {
      check(r.anims.length === 0, `CA-23 ${tag} ${label} aucune animation de ligne en réduction`, `animations=${JSON.stringify(r.anims.map((a) => [a.key, a.kind, a.props.join('+')]))}`);
      check(r.order.length === expectCount && r.removed.every((x) => x.gone), `CA-23 ${tag} ${label} retraits immédiats, lignes affichées`, `affichées=${r.order.length}, retirées non disparues=${r.removed.filter((x) => !x.gone).length}`);
      return;
    }
    check(r.order.length === expectCount, `CA-26 ${tag} ${label} lignes affichées (${expectCount})`, `ordre=${r.order}`);
    check(r.changedAt !== null && !r.leavingSeen && !r.anims.some((a) => a.leaving || a.name === 'lc-leave' || (a.props.includes('opacity') && String(a.last.opacity) === '0' && a.kind === 'waapi')), `CA-26 ${tag} ${label} rien ne sort : aucune ligne retirée n'est animée en sortie`, `changement vu=${r.changedAt !== null}, sortie vue=${r.leavingSeen}`);
    const during = r.frames.filter((f) => r.changedAt !== null && f.t >= r.changedAt + 40 && f.t <= r.changedAt + r.refill - 40);
    check(during.length >= 3 && during.every((f) => f.visible === 0), `CA-26 ${tag} ${label} liste vidée : aucune ligne visible pendant le délai de ${r.refill} ms`, `images=${during.length}, lignes visibles=${during.map((f) => f.visible)}`);
    check(near(r.refill, 200) && near(r.stagger, 40) && near(r.reveal, 550), `CA-26 ${tag} ${label} tokens : délai 200 ms, rang 40 ms, entrée 550 ms`, `refill=${r.refill} stagger=${r.stagger} reveal=${r.reveal}`);
    // Cascade lue dans l'instantané pris à l'insertion des lignes (les entrées sont terminées aussitôt) : celui qui compte le plus de lignes animées.
    const snap = [...r.snaps].sort((x, y) => y.rows.filter((c) => c.reveal).length - x.rows.filter((c) => c.reveal).length)[0];
    const rows = snap?.rows ?? [];
    const first = snap ? snap.t + rows[0]?.delay : NaN;
    // Rangs 0 à 7 : une entrée chacun (délai = rang × 40 ms) ; au-delà (cascade plafonnée, comme les cartes de CA-12) : pas d'entrée obligatoire, mais jamais après le plafond.
    const bad = rows.map((c, i) => ({ c, i })).filter(({ c, i }) => (i < 8 && (!c.reveal || !near(c.delay - rows[0].delay, i * 40, 1.5))) || (c.reveal && (!near(c.duration, r.reveal) || !sameEase(c.easing, r.out) || c.startOpacity !== '0' || c.delay - rows[0].delay > 8 * 40 + 1.5)));
    check(!!snap && rows.length === expectCount && bad.length === 0 && rows.slice(0, 8).every((c) => c.reveal), `CA-26 ${tag} ${label} cascade : une entrée par rang (8 au plus), 550 ms out (d08), 40 ms par rang`, `instantanés=${r.snaps.length}, lignes=${rows.length}, hors contrat=${JSON.stringify(bad.map(({ c, i }) => [i, c.reveal, c.delay, c.duration]))}`);
    check(!!snap && first - r.changedAt >= r.refill - 40 && first - r.changedAt <= r.refill + 60, `CA-26 ${tag} ${label} la première ligne entre ${r.refill} ms après le changement (à une image près)`, `écart=${(first - r.changedAt).toFixed(1)} ms`);
    check(!waapiOf(r).some((a) => a.props.includes('transform')), `CA-26 ${tag} ${label} aucune glissade de ligne (la liste est reconstruite)`, `glissades=${waapiOf(r).filter((a) => a.props.includes('transform')).map((a) => a.key)}`);
  };

  // 1. Filtre « Beta » : 4 lignes retirées, 10 affichées en cascade.
  await begin();
  await beta();
  await idle(`window.__qa.rowKeys().length === 10`);
  const beta1 = await report();
  const betaKeys = all.filter((_, i) => i % 4 !== 0);
  check(beta1.order.join() === betaKeys.join(), `CA-26 ${tag} filtre : lignes affichées`, `ordre=${beta1.order}`);
  refill(beta1, 'filtre', 10);

  // 2. Retrait de la pastille (téléphone) ou « Effacer les filtres » (ordinateur) : c'est un changement de filtre, 14 lignes en cascade.
  await begin();
  if (phone) await page.locator('.lc-data-table__chip-remove').first().click();
  else await page.getByRole('button', { name: 'Effacer les filtres' }).click();
  await idle(`window.__qa.rowKeys().length === 14`);
  refill(await report(), 'retrait de pastille', 14);

  // 3. Tri : toutes les lignes conservées, certaines changent de place ; rien ne sort, rien n'entre.
  await page.evaluate(() => window.__qa.frames(40));
  await begin();
  const order0 = await page.evaluate(() => window.__qa.rowKeys().join());
  if (phone) await page.selectOption('select.lc-data-table__sort-select', 'name:desc');
  else { const head = page.locator('thead button', { hasText: 'Objet' }); await head.click(); await page.evaluate(() => window.__qa.frames(40)); await begin(); await head.click(); }
  await idle(`window.__qa.rowKeys().join() !== ${JSON.stringify(order0)}`);
  const sorted = await report();
  check(sorted.order.join() !== order0, `CA-26 ${tag} tri : l'ordre a changé`, `avant=${order0.slice(0, 40)}… après=${sorted.order.join().slice(0, 40)}…`);
  check(sorted.kept.length === 14 && sorted.kept.every((k) => k.same), `CA-26 ${tag} tri lignes conservées : même élément DOM (14)`, `conservées=${sorted.kept.length}, identiques=${sorted.kept.filter((k) => k.same).length}`);
  check(sorted.cascades === 0 && !sorted.leavingSeen && !sorted.anims.some((a) => a.props.includes('opacity')), `CA-26 ${tag} tri : aucune cascade, aucune entrée ni sortie`, `cascades=${sorted.cascades}, animations d'opacité=${sorted.anims.filter((a) => a.props.includes('opacity')).map((a) => a.key)}`);
  if (reduced) check(sorted.anims.length === 0, `CA-23 ${tag} tri aucune animation de ligne en réduction`, `animations=${JSON.stringify(sorted.anims.map((a) => [a.key, a.kind, a.props.join('+')]))}`);
  else glides(sorted, 'tri', { strict: true });
  if (!phone) check(await page.evaluate(() => document.querySelectorAll('tr[lcreveal], tr.lc-reveal').length) === 0, `CA-12 ${tag} pas de cascade sur ordinateur après un tri`);

  // 4. Suppression de « Demande 5 » : sortie par lc-leave seule (durée du token d'exit, sans fondu propre), puis glissement des voisines.
  await page.evaluate(() => window.__qa.frames(40));
  await begin();
  const orderBefore = await page.evaluate(() => window.__qa.rowKeys()); // le tri précédent reste appliqué : l'ordre se lit, il ne se suppose pas
  const followers = orderBefore.slice(orderBefore.indexOf('Demande 5') + 1);
  await page.click('#qa-remove');
  await idle(`window.__qa.rowKeys().length === 13`);
  const del = await report();
  check(del.order.join() === orderBefore.filter((k) => k !== 'Demande 5').join() && del.removed.length === 1 && del.removed[0].key === 'Demande 5' && del.removed[0].gone, `CA-26 ${tag} suppression : ligne retirée du DOM à la fin de la sortie`, `ordre=${del.order}, retirées=${JSON.stringify(del.removed)}`);
  if (reduced) {
    check(del.anims.length === 0, `CA-23 ${tag} suppression : aucune animation en réduction`, `animations=${JSON.stringify(del.anims.map((a) => [a.key, a.kind, a.name, a.props.join('+')]))}`);
  } else {
    const out = del.anims.filter((a) => a.key === 'Demande 5');
    const leave = out.find((a) => a.name === 'lc-leave');
    check(!!leave && near(leave.duration, 200) && near(leave.duration, del.exit) && leave.connected && out.every((a) => a.name === 'lc-leave'), `CA-26 ${tag} suppression : une seule sortie, lc-leave de ${del.exit} ms (200 ms), sans fondu ni second délai`, `animations de la ligne=${JSON.stringify(out.map((a) => [a.kind, a.name, a.duration, a.props.join('+')]))}`);
    const below = del.kept.filter((k) => Math.abs(k.from - k.to) >= 0.5);
    check(followers.length > 0 && below.length === followers.length && below.every((k) => followers.includes(k.key)), `CA-26 ${tag} suppression : seules les voisines suivantes bougent (${followers.length})`, `déplacées=${below.map((k) => k.key)}, attendues=${followers}`);
    glides({ ...del, kept: del.kept }, 'suppression', { strict: true });
    check(below.every((k) => lastGlide(del, k.key)?.leavingConnected === 0), `CA-26 ${tag} suppression : le glissement des voisines commence après la disparition de la ligne`, `lignes encore en sortie au début du glissement=${below.map((k) => lastGlide(del, k.key)?.leavingConnected)}`);
  }
  // 5. Position de défilement conservée quand on applique puis retire un filtre (le tbody est masqué le temps d'un rendu) : conteneur à défilement, puis page (suite de 2 hauteurs de fenêtre sous le tableau : aucun raccourcissement naturel ne peut faire reculer le défilement, comme une vraie page).
  const scrollOf = { box: () => page.evaluate(() => document.querySelector('.lc-data-table__scroll').scrollTop), page: () => page.evaluate(() => Math.round(window.scrollY)) };
  const clear = async () => { if (phone) await page.locator('.lc-data-table__chip-remove').first().click(); else await page.getByRole('button', { name: 'Effacer les filtres' }).click(); await idle(`window.__qa.rowKeys().length === 13`); };
  await page.evaluate(() => { const s = document.querySelector('.lc-data-table__scroll'); s.style.maxHeight = '150px'; s.style.overflowY = 'auto'; s.scrollTop = 60; });
  const boxMax = () => page.evaluate(() => { const s = document.querySelector('.lc-data-table__scroll'); return s.scrollHeight - s.clientHeight; });
  const box0 = await scrollOf.box();
  await begin(); await beta(); await idle(`window.__qa.rowKeys().length === 10`); const box1 = await scrollOf.box(); const max1 = await boxMax(); await begin(); await clear(); const box2 = await scrollOf.box();
  console.log(`scrollTop conteneur ${tag} : avant=${box0} après filtre=${box1} (plafond naturel ${max1}) après retrait=${box2}`);
  // Moins de lignes = un plafond de défilement plus bas, que le navigateur impose même sans mouvement : la position attendue est min(avant, plafond) ; le retrait du filtre ne la fait pas reculer davantage ; 8 px de marge : le retour du focus sur l'entonnoir de l'en-tête collant décale de 4 px le conteneur, même en mouvement réduit (mesuré).
  check(box0 > 0 && Math.abs(box1 - Math.min(box0, Math.floor(max1))) <= 8 && Math.abs(box2 - box1) <= 8, `CA-26 ${tag} défilement du conteneur conservé après filtre puis retrait (hors plafond naturel)`, `scrollTop ${box0} -> ${box1} (attendu ${Math.min(box0, Math.floor(max1))}) -> ${box2}`);
  await page.evaluate(() => { const s = document.querySelector('.lc-data-table__scroll'); s.style.maxHeight = ''; s.style.overflowY = ''; const sp = document.createElement('div'); sp.id = 'qa-spacer'; sp.style.height = `${2 * innerHeight}px`; document.querySelector('lc-data-table').after(sp); const top = document.createElement('div'); top.style.height = '400px'; document.querySelector('lc-data-table').before(top); });
  // Défilement de la page à ~300 px, mais en gardant le déclencheur du filtre à 120 px du haut de la fenêtre (cale de 400 px au-dessus du tableau) : sinon le clic de Playwright ou le retour du focus sur le déclencheur déplacent la page eux-mêmes, avec ou sans mouvement (le test mesurerait ce défilement-là).
  await page.evaluate((sel) => window.scrollTo(0, Math.floor(document.querySelector(sel).getBoundingClientRect().top + scrollY) - 120), phone ? 'button[id$="-filters"]' : '[id$="-funnel-cat"]'); await page.evaluate(() => window.__qa.frames(4));
  const pg0 = scrollOf.page;
  const p0 = await pg0();
  await begin(); await beta(); await idle(`window.__qa.rowKeys().length === 10`); const p1 = await pg0(); await begin(); await clear(); const p2 = await pg0();
  console.log(`scrollY page ${tag} : avant=${p0} après filtre=${p1} après retrait=${p2}`);
  check(p0 > 0 && p1 === p0 && p2 === p0, `CA-26 ${tag} défilement de la page conservé après filtre puis retrait`, `scrollY ${p0} -> ${p1} -> ${p2}`);
  check(errors.length === 0, `erreurs page ${tag} liste`, errors.join(' ; '));
  await page.close();
}

async function motion(browser, base, fragments = []) {
  let failures = 0;
  const check = (ok, label, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK ' : 'KO '} ${label}${detail ? ` ${detail}` : ''}`);
  };
  const contexts = [['normal', {}], ['reduced', { reducedMotion: 'reduce' }], ['forced', { forcedColors: 'active' }]];
  const sizes = [[1280, 720], [360, 640]];
  const animationIds = await animationStoryIds(fragments);
  if (fragments.length > 0 && animationIds.length === 0) check(false, `aucune story d'animation ne correspond à ${fragments.join(' ')}`);
  if (fragments.length > 0) { // relance ciblée : seulement la boucle générale (CA-3, CA-5, CA-31, CA-16) des stories dont l'id contient un fragment
    console.log(`${animationIds.length} story(ies) d'animation`);
    for (const [name, options] of contexts.slice(0, 2)) {
      for (const [width, height] of sizes) {
        const context = await browser.newContext({ viewport: { width, height }, ...options });
        await context.addInitScript(MOTION_INIT);
        await motionAnimations(context, base, animationIds, name === 'reduced', width, check);
        await context.close();
      }
    }
    return failures;
  }
  // CA-38 : seule vérification de présence (sans chargement de page) ; les boutons « Rejouer » sont comptés par la boucle générale, les démos citées par la fidélité (motion-fidelity.mjs).
  const fromTable = Object.values(JSON.parse(await readFile(path.join(root, 'docs', 'design', 'explorations', '2026-12-mouvement-v2', 'fidelite.json'), 'utf8')).table).map((e) => e.story);
  for (const id of new Set([...fromTable, ...CA38_PRIMITIVES])) check(animationIds.includes(id), `CA-38 story ${id} dans l'index`);
  for (const [name, options] of contexts) {
    const reduced = name === 'reduced';
    for (const [width, height] of sizes) {
      const context = await browser.newContext({ viewport: { width, height }, ...options });
      await context.addInitScript(MOTION_INIT);
      const tag = `${name} ${width}px`;

      // CA-6 : appui du bouton.
      {
        const { page, errors } = await motionPage(context, base, 'qa-motion-acceptance--buttons');
        for (const id of ['solid', 'outline', 'flat', 'icon', 'disabled']) {
          const box = await page.locator(`#${id}`).boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          const got = await page.evaluate((id) => {
            const el = document.getElementById(id);
            const list = window.__qa.transitions(el, (a) => ['transform', 'scale'].includes(a.transitionProperty));
            const durations = list.map((a) => a.effect.getComputedTiming().duration);
            list.forEach((a) => a.finish());
            const cs = getComputedStyle(el);
            const scale = parseFloat(cs.getPropertyValue('--lc-button-press-scale'));
            const matrix = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
            const own = cs.scale === 'none' ? 1 : parseFloat(cs.scale);
            const pressMs = window.__qa.tokenMs('--lc-button-press-duration');
            return { durations, scale, a: matrix.a * own, d: matrix.d * own, raw: cs.transform, pressMs, active: el.matches(':active'), cssDuration: cs.transitionDuration };
          }, id);
          await page.mouse.up();
          if (id === 'disabled') check(got.raw === 'none' && got.durations.length === 0, `CA-6 ${tag} ${id}`, `transform=${got.raw}, transitions transform=${got.durations.length}`);
          else if (reduced) check(got.active && msList(got.cssDuration).every((ms) => ms <= 0.01) && got.durations.every((ms) => ms <= 0.01), `CA-6/13 ${tag} ${id}`, `durées=${got.cssDuration}, a=${got.a}`);
          // CA-22 : l'appui lit `--lc-button-press-*` ; valeurs de la spec (§5.2, D-11) : 0,97 et 100 ms, découplées de `duration-fast` (150 ms).
          else check(got.active && near(got.scale, 0.97, 0.0005) && near(got.pressMs, 100) && got.durations.length > 0 && got.durations.every((ms) => near(ms, 100)) && near(got.a, 0.97, 0.001) && near(got.d, 0.97, 0.001), `CA-22 (v2) ${tag} ${id}`, `échelle=${got.a.toFixed(3)} (token ${got.scale}) attendu 0,97, durées=${got.durations} (token ${got.pressMs}) attendu 100, actif=${got.active}`);
        }
        check(errors.length === 0, `erreurs page ${tag} buttons`, errors.join(' ; '));
        await page.close();
      }

      // lc-data-table (T6) : téléphone seulement ici ; le menu de filtre est dans la boucle des panneaux.
      if (width === 360 && name !== 'forced') await motionPhone(context, base, reduced, tag, check);
      if (width === 1280 && name === 'normal') {
        // Spec v2 §5.4.1 (d07 relevé à 1280 px) : cascade à l'ouverture aussi sur ordinateur, 550 ms `out`, 40 ms par rang, 8 px.
        const { page } = await motionPage(context, base, 'qa-motion-data-table--table');
        await page.waitForFunction(() => window.__qa.cardSnaps.length >= 1, undefined, { timeout: 5000 }).catch(() => {});
        const open = await page.evaluate(() => ({ snap: window.__qa.cardSnaps[0]?.map((c) => ({ reveal: c.reveal, delay: c.delays[0], duration: c.durations[0], easing: c.easings?.[0], startOpacity: c.startOpacity })) ?? [], out: window.__qa.easing('--lc-sys-easing-out'), reveal: window.__qa.tokenMs('--lc-reveal-duration') }));
        const rows8 = open.snap.slice(0, 8);
        check(rows8.length === 8 && rows8.every((c, i) => c.reveal && near(c.delay, i * 40, 1.5) && near(c.duration, 550) && near(open.reveal, 550) && sameEase(c.easing, open.out) && c.startOpacity === '0'), `CA-26 ${tag} cascade à l'ouverture sur ordinateur : 550 ms out, 40 ms par rang`, JSON.stringify(rows8.map((c) => [c.reveal, c.delay, c.duration])));
        await page.close();
      }

      // Indicateurs (CA-2 à CA-5, CA-14, CA-24) et différence de liste (CA-20 à CA-24).
      await motionIndicators(context, base, name, tag, width, check);
      if (name !== 'forced') await motionList(context, base, reduced, tag, width === 360, check);

      // lcReveal / lcStagger (spec 2026-12-mouvement-v2, T3) : CA-11 (rangs aux tokens) et CA-3 (mouvement réduit) dans chaque contexte ; le détail (8 variantes, sortie, 500 éléments) est dans `reveal-browser.mjs`.
      {
        const { page, errors } = await motionPage(context, base, 'qa-motion-reveal-acceptance--stagger');
        await page.click('#show');
        await page.waitForFunction(() => document.querySelector('#s-normal [data-i]'));
        const got = await page.evaluate(() => {
          const q = window.__qa;
          const rows = [...document.querySelectorAll('#s-normal [data-i]')].map((el) => {
            const a = el.getAnimations().find((x) => x instanceof CSSAnimation && x.animationName === 'lc-reveal-in');
            const timing = a?.effect.getComputedTiming();
            return { i: Number(el.dataset.i), delay: timing?.delay ?? null, duration: timing?.duration ?? null, cssDelay: getComputedStyle(el).animationDelay, cssDuration: getComputedStyle(el).animationDuration };
          });
          return { rows, stagger: q.tokenMs('--lc-sys-motion-stagger-normal'), enter: q.tokenMs('--lc-reveal-duration'), cap: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lc-sys-motion-stagger-cap')) };
        });
        if (reduced) {
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' || a.pending).length);
          check(running === 0 && got.rows.every((r) => msList(r.cssDelay).every((ms) => ms <= 0.01) && msList(r.cssDuration).every((ms) => ms <= 0.01)), `CA-3 ${tag} lcReveal : aucune animation en cours, délais et durées ≤ 0,01 ms`, `en cours=${running} délais=${got.rows.map((r) => r.cssDelay)} durées=${got.rows.map((r) => r.cssDuration)}`);
        } else {
          check(got.rows.length === 12 && got.rows.every((r) => r.delay !== null && near(r.delay, Math.min(r.i, got.cap) * got.stagger) && near(r.duration, got.enter)), `CA-11 ${tag} lcStagger : délai = min(rang, ${got.cap}) × ${got.stagger} ms, durée = ${got.enter} ms`, `délais=${got.rows.map((r) => r.delay)} durées=${got.rows.map((r) => r.duration)}`);
        }
        check(errors.length === 0, `erreurs page ${tag} reveal`, errors.join(' ; '));
        await page.close();
      }

      if (name !== 'forced' && width === 1280) await motionCalendar(context, base, reduced, tag, check);

      // CA-7, CA-8 : panneaux, en haut (descente) puis en bas d'écran (montée).
      for (const [control, spec] of Object.entries(PANELS)) {
        if (spec.table && width < 768) continue;
        for (const place of ['top', 'bottom']) {
          const above = place === 'bottom';
          const label = `${tag} ${control} ${place}`;
          const { page, errors } = await motionPage(context, base, ...panelStory(spec, control, place));
          await page.evaluate((selector) => window.__qa.watchPane(selector), spec.pane);
          await page.click(spec.open);
          if (!(await panelOpened(page))) { check(false, `CA-7/20 ${label} le panneau ${spec.pane} n'apparaît pas`); await page.close(); continue; }
          const got = await page.evaluate(([host, tokens]) => {
            const q = window.__qa;
            return { enter: q.enter, rect: q.enterRect, classAtAttach: q.classAtAttach, hostRect: document.querySelector(host).getBoundingClientRect().toJSON(), enterMs: q.tokenMsSafe(`--lc-${tokens}-enter-duration`), exitMs: q.tokenMsSafe(`--lc-${tokens}-exit-duration`), scaleToken: parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--lc-${tokens}-enter-scale`)) };
          }, [spec.host, spec.tokens]);
          const e = got.enter;
          if (reduced) {
            check(e.list.every((x) => x.duration <= 0.01 && x.delay <= 0.01) && e.end.opacity === '1', `CA-7/13 ${label} entrée`, `animations=${JSON.stringify(e.list.map((x) => [x.props.join('+'), x.duration, x.delay]))} opacité finale=${e.end.opacity}`);
          } else {
            const sign = above ? 1 : -1;
            const placed = above ? got.rect.bottom <= got.hostRect.top + 1 : got.rect.top >= got.hostRect.bottom - 1;
            const { ref } = spec;
            const opacityAnims = e.list.filter((x) => x.props.includes('opacity'));
            const moveAnims = e.list.filter((x) => x.props.some((p) => ['transform', 'translate', 'scale', 'rotate'].includes(p)));
            const [fade, move] = [opacityAnims[0], moveAnims[0]];
            const ok = e.list.length === 2 && opacityAnims.length === 1 && moveAnims.length === 1 && fade !== move
              && near(fade.duration, ref.opacity.ms) && sameCurve(fade.easing, ref.opacity.easing)
              && near(move.duration, ref.move.ms) && sameCurve(move.easing, ref.move.easing) && e.list.every((x) => x.delay === 0)
              && near(got.enterMs, spec.enterMs) && near(move.duration, got.enterMs) && near(got.exitMs, spec.exitMs) && near(got.scaleToken, spec.scale, 0.005)
              && e.start.opacity === '0' && e.end.opacity === '1' && near(e.start.a, spec.scale, 0.005) && near(e.start.d, spec.scale, 0.005)
              && near(e.start.f, sign * Math.abs(ref.ty), 0.5) && near(e.end.a, 1, 0.001) && near(e.end.d, 1, 0.001) && near(e.end.f, 0, 0.01) && e.above === above
              && near(e.originY, above ? e.height : 0, 1);
            check(ok, `CA-7/20 ${label} entrée pop`, `animations=${JSON.stringify(e.list.map((x) => [x.props.join('+'), x.duration, x.delay, x.easing]))} attendu fondu ${ref.opacity.ms} ms et mouvement ${ref.move.ms} ms (jeton ${got.enterMs}, fermeture ${got.exitMs} attendu ${spec.enterMs}/${spec.exitMs}), échelle de départ=${e.start.a?.toFixed(3)} attendu ${spec.scale} (jeton ${got.scaleToken}), décalageY=${e.start.f} attendu ${sign * Math.abs(ref.ty)}, opacité ${e.start.opacity}->${e.end.opacity}, fin a=${e.end.a} f=${e.end.f}, origine y=${e.originY} attendu ${above ? e.height : 0}, au-dessus=${e.above}`);
            // Le calendrier de la période recouvre le champ à 360 px (positions de calendar-overlay.ts antérieures à T3) : information, pas un échec (spec mouvement, section 13).
            if (!placed && control === 'range' && width === 360) console.log(`INFO placement ${label} : le panneau recouvre le champ (limite connue antérieure au mouvement, hors CA-7, spec section 13) ; haut ${Math.round(got.rect.top)}, bas ${Math.round(got.rect.bottom)} ; champ haut ${Math.round(got.hostRect.top)}, bas ${Math.round(got.hostRect.bottom)}`);
            else check(placed, `placement ${label} (précondition de CA-7, hors critère)`, `panneau ${above ? 'au-dessus' : 'au-dessous'} du champ=${placed} (haut ${Math.round(got.rect.top)}, bas ${Math.round(got.rect.bottom)} ; champ haut ${Math.round(got.hostRect.top)}, bas ${Math.round(got.hostRect.bottom)})`);
          }
          // CA-8a et 8c : fermeture au clavier.
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => window.__qa.closing !== null);
          await page.waitForFunction(() => !window.__qa.pane.isConnected, undefined, { timeout: 5000 });
          const closed = await page.evaluate((s) => ({ closing: window.__qa.closing, exitMs: window.__qa.tokenMsSafe(`--lc-${s.tokens}-exit-duration`), focused: document.activeElement?.matches(s.open) ?? false, active: document.activeElement?.outerHTML.slice(0, 80) }), spec);
          const c = closed.closing;
          if (reduced) check(c.connected && msList(c.transitionDuration).every((ms) => ms <= 0.01) && closed.focused, `CA-8/13 ${label} fermeture`, `durée=${c.transitionDuration} focus déclencheur=${closed.focused}`);
          else check(c.connected && c.children > 0 && c.props.some(([prop, ms]) => prop === 'opacity' && near(ms, closed.exitMs)) && near(closed.exitMs, spec.exitMs) && closed.focused, `CA-8a/8c ${label} fermeture`, `classe posée, présent=${c.connected}, contenu présent pendant le fondu=${c.children > 0}, transitions=${JSON.stringify(c.props)} attendu opacity ${closed.exitMs} (spec ${spec.exitMs}), retiré du DOM=oui, focus déclencheur=${closed.focused} (${closed.active})`);
          check(errors.length === 0, `erreurs page ${label}`, errors.join(' ; '));
          await page.close();
        }
        if (reduced) continue;

        // CA-8a bis : fermeture pendant l'entrée (animation d'entrée suspendue à 0, relancée à la fermeture) : le fondu d'opacité du conteneur dure quand même `--lc-overlay-exit-duration`.
        {
          const label = `${tag} ${control}`;
          const { page } = await motionPage(context, base, ...panelStory(spec, control, 'top'));
          await page.evaluate((selector) => window.__qa.watchPane(selector, true), spec.pane);
          await page.click(spec.open);
          if (!(await panelOpened(page))) { check(false, `CA-7/20 ${label} le panneau ${spec.pane} n'apparaît pas`); await page.close(); continue; }
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => window.__qa.closing !== null);
          await page.waitForFunction(() => !window.__qa.pane.isConnected, undefined, { timeout: 5000 });
          const r = await page.evaluate((tokens) => ({ closing: window.__qa.closing, exitMs: window.__qa.tokenMsSafe(`--lc-${tokens}-exit-duration`) }), spec.tokens);
          check(r.closing.enterStillRunning && r.closing.props.some(([prop, ms]) => prop === 'opacity' && near(ms, r.exitMs)), `CA-8a ${label} fermeture pendant l'entrée`, `entrée en cours=${r.closing.enterStillRunning}, transitions=${JSON.stringify(r.closing.props)} attendu opacity ${r.exitMs}, retiré du DOM=oui`);
          await page.close();
        }

        // CA-8b : réouverture pendant le fondu (fondu suspendu pour ne pas dépendre de l'horloge).
        {
          const label = `${tag} ${control}`;
          const { page } = await motionPage(context, base, ...panelStory(spec, control, 'top'));
          await page.evaluate((selector) => window.__qa.watchPane(selector), spec.pane);
          await page.click(spec.open);
          if (!(await panelOpened(page))) { check(false, `CA-7/20 ${label} le panneau ${spec.pane} n'apparaît pas`); await page.close(); continue; }
          await page.evaluate(() => { window.__qa.hold = true; });
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => window.__qa.closing !== null);
          // Au clavier : pendant le fondu, le fond transparent du CDK intercepte encore la souris.
          await page.waitForFunction((open) => document.activeElement?.matches(open), spec.open); // le focus revient au déclencheur après le prochain rendu
          await page.keyboard.press(spec.reopen);
          const got = await page.evaluate(async (selector) => {
            const pane = window.__qa.pane;
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            pane.getAnimations().forEach((a) => { if (a.playState === 'paused') a.play(); });
            await Promise.allSettled(pane.getAnimations().map((a) => a.finished));
            const live = [...document.querySelectorAll(selector)].find((p) => !p.classList.contains('lc-overlay--closing'));
            return { connected: pane.isConnected, closingClass: pane.classList.contains('lc-overlay--closing'), opacity: getComputedStyle(pane).opacity, reopened: !!live && getComputedStyle(live).opacity === '1' };
          }, spec.pane);
          check((spec.revive === false ? got.reopened : got.connected && !got.closingClass && got.opacity === '1'), `CA-8b ${label} réouverture pendant le fondu`, `présent=${got.connected} classe closing=${got.closingClass} opacité=${got.opacity}`);
          await page.close();
        }
      }

      // CA-7b : retournement après ouverture (vraie bascule : la fenêtre rétrécit, le CDK passe le panneau au-dessus) : aucune nouvelle entrée.
      if (!reduced && width === 1280) {
        for (const [control, spec] of Object.entries(PANELS)) {
          if (spec.table) continue;
          const { page } = await motionPage(context, base, 'qa-motion-acceptance--panel', `control:${control};place:middle`);
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate((selector) => window.__qa.watchPane(selector), spec.pane);
          await page.click(spec.open);
          if (!(await panelOpened(page))) { check(false, `CA-7b ${tag} ${control} le panneau n'apparaît pas`); await page.close(); continue; }
          await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
          await page.setViewportSize({ width, height: 480 });
          const flipped = await page.waitForFunction(() => window.__qa.flip, undefined, { timeout: 3000 }).then((h) => h.jsonValue()).catch(() => null);
          check(flipped !== null && flipped.above && flipped.entering === 0, `CA-7b ${tag} ${control} retournement`, flipped === null ? 'le panneau ne s\'est pas retourné (classe lc-overlay--above non posée)' : `au-dessus=${flipped.above}, nouvelles animations sur le contenu après le retournement=${flipped.entering}`);
          await page.close();
        }
      }
      if (name !== 'forced') await motionAnimations(context, base, animationIds, reduced, width, check);
      await context.close();
    }
  }
  return failures;
}

/** Calendrier (T9c, spec 2026-12-mouvement-v2 §5.4.1, d41 et d61) : l'anneau de sélection ne bouge pas ; le changement de mois glisse de ±calendar.slide-offset, calendar.slide-duration, calendar.row-stagger par ligne. Valeurs de d61 dans `fidelite.json`. */
async function motionCalendar(context, base, reduced, tag, check) {
  const slideRef = FID.d61.triggers[0].animations[0];
  const [slidePx, slideFrom] = [Math.abs(parseFloat(slideRef.keyframes[0].transform.match(/-?[\d.]+/)[0])), Number(slideRef.keyframes[0].opacity)];
  const { page, errors } = await motionPage(context, base, 'qa-motion-acceptance--panel', 'control:date;place:top');
  await page.click('lc-date-input button[aria-expanded]');
  await page.waitForSelector('.cdk-overlay-pane.lc-calendar-overlay lc-calendar-panel');
  await finiteIdle(page, `${tag} calendrier`, check);
  // d41 : l'anneau de sélection / de focus ne bouge pas (seuls les retours de couleur des contrôles sont admis).
  await page.evaluate(() => { window.__ring = new Set(document.getAnimations()); });
  await page.keyboard.press('ArrowRight');
  await page.evaluate(() => window.__qa.frames(3));
  const ring = await page.evaluate(() => {
    const panel = document.querySelector('lc-calendar-panel');
    return [...document.getAnimations()].filter((a) => !window.__ring.has(a) && a.effect?.target && panel.contains(a.effect.target))
      .flatMap((a) => [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)));
  });
  const moving = ring.filter((p) => !/^(color|background|backgroundColor|border\w*Color)$/.test(p));
  check(moving.length === 0, `CA-20 d41 ${tag} l'anneau de sélection et de focus ne bouge pas`, `propriétés animées au déplacement du focus : ${JSON.stringify(ring)}`);
  // d61 : glissement du changement de mois, dans les deux sens.
  for (const [button, sign, name] of [['.lc-calendar__nav--next', 1, 'mois suivant'], ['.lc-calendar__nav:not(.lc-calendar__nav--next)', -1, 'mois précédent']]) {
    await finiteIdle(page, `${tag} ${name}`, check);
    const got = await page.evaluate(async (selector) => {
      const q = window.__qa;
      const before = new Set(document.getAnimations());
      document.querySelector(selector).click();
      await q.frames(4);
      const cells = [...document.getAnimations()].filter((a) => !before.has(a) && a.effect?.target?.closest('.lc-calendar__grid tbody tr'));
      const rowOf = (el) => { const tr = el.closest('tr'); return [...tr.parentElement.children].indexOf(tr); };
      const rows = cells.map((a) => ({ row: rowOf(a.effect.target), duration: a.effect.getComputedTiming().duration, delay: a.effect.getComputedTiming().delay, easing: a.effect.getComputedTiming().easing === 'linear' ? a.effect.getKeyframes()[0].easing : a.effect.getComputedTiming().easing, props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)) }));
      cells.forEach((a) => a.pause());
      cells.forEach((a) => { a.currentTime = 0; });
      const starts = cells.map((a) => q.stateOf(a.effect.target));
      cells.forEach((a) => a.finish());
      const ends = cells.map((a) => q.stateOf(a.effect.target));
      return { rows, starts, ends, duration: q.tokenMsSafe('--lc-calendar-slide-duration'), stagger: q.tokenMsSafe('--lc-calendar-row-stagger'), offset: q.tokenPx('--lc-calendar-slide-offset'), running: document.getAnimations().filter((a) => !before.has(a) && (a.playState === 'running' || a.pending)).length };
    }, button);
    if (reduced) { check(got.rows.every((r) => r.duration <= 0.01 && r.delay <= 0.01), `CA-3 ${tag} calendrier ${name} : aucune animation`, JSON.stringify(got.rows.slice(0, 3))); continue; }
    const rowCount = new Set(got.rows.map((r) => r.row)).size;
    const ok = got.rows.length >= 28 && rowCount >= 4
      && got.rows.every((r, i) => near(r.duration, slideRef.duration) && sameCurve(r.easing, slideRef.easing) && near(r.delay, r.row * 30, 0.5) && r.props.includes('opacity')
        && near(got.starts[i].opacity === undefined ? Number.NaN : Number(got.starts[i].opacity), slideFrom, 0.005) && near(got.starts[i].e, sign * slidePx, 0.5) && near(got.starts[i].f, 0, 0.5)
        && near(got.ends[i].e, 0, 0.01) && near(Number(got.ends[i].opacity), 1, 0.001))
      && near(got.duration, slideRef.duration) && near(got.stagger, 30) && near(got.offset, slidePx, 0.5);
    check(ok, `CA-20 d61 ${tag} calendrier ${name} : glissement ${sign * slidePx} px, ${slideRef.duration} ms, ${30} ms par ligne`, `cellules animées=${got.rows.length} sur ${rowCount} ligne(s) ; jetons durée=${got.duration} décalage=${got.stagger} distance=${got.offset} ; première=${JSON.stringify(got.rows[0])} départ=${JSON.stringify(got.starts[0])}`);
  }
  check(errors.length === 0, `erreurs page ${tag} calendrier`, errors.join(' ; '));
  await page.close();
}

/** CA-38 : primitives sans démo dNN dans la table de fidélité. */
const CA38_PRIMITIVES = ['layout-fill--animation', 'layout-draw--animation', 'layout-pulse-lift--animation', 'layout-count-up--animation', 'layout-flash--animation', 'layout-reveal--animation'];

/** Stories d'animation, dérivées de l'index de Storybook (CA-38 de 2026-12-mouvement-v2 : plus de liste codée en dur) : toute story `Animation*`, la page Foundations/Motion et les deux pages gardées de 2026-11 (Elevation, Playground de Reveal). */
const ANIMATION_STORY = /--animation|^foundations-(motion|elevation)--|^layout-reveal--playground$/;
async function animationStoryIds(fragments = []) {
  const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
  return Object.values(index.entries).filter((entry) => entry.type === 'story' && ANIMATION_STORY.test(entry.id) && (fragments.length === 0 || fragments.some((f) => entry.id.includes(f)))).map((entry) => entry.id);
}

/** Toute animation (CSSTransition, CSSAnimation, WAAPI) d'une story d'animation, relevée une image après chaque « Rejouer » (spec 2026-12-mouvement-v2) :
 *  CA-3 (mouvement réduit : durées et délais ≤ 0,01 ms, rien en cours), CA-5 (propriétés animées), CA-31 (aucun défilement horizontal à 360 px à 0, 50 et 100 %). */
const CA5_PROPS = new Set(['opacity', 'transform', 'translate', 'scale', 'rotate', 'strokeDashoffset']);
const CA5_INDICATORS = '.lc-tabs__indicator, .lc-nav-list__indicator, .lc-segmented-control__indicator, .lc-switch__thumb';
const CA5_CONTROLS = 'button[lcbutton], button.lc-button, [lcinput], input, textarea, select, .lc-switch__track'; // lc-switch : la piste change de couleur à la bascule (d46, retour d'état) ; le bouton ne fait que se déplacer (`translate`)
/** Liste blanche de CA-5 : [propriétés, sélecteur de l'élément animé, préfixe du pseudo-élément animé (absent : l'élément lui-même), 'transition' : transitions seulement]. Tout le reste est un écart. */
/** Stories dont « Rejouer » n'a volontairement aucun effet visible : exemptées de CA-16b, avec la raison (motion-fidelity.mjs marque d17 « aucun mouvement »). */
const REPLAY_NO_EFFECT = new Map([['feedback-status-badge--animation', 'd17 lc-status-badge : aucun mouvement, le rejeu ne change rien de visible (voulu)']]);
const CA5_ALLOW = [
  [['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'], CA5_CONTROLS, undefined, 'transition'], // retour d'état des contrôles (survol, focus, appui)
  [['color'], '.lc-flash'], // lcFlash : l'hôte porte `lc-flash` (contrat fixé par la QA de T5, tools/qa/count-flash-browser.mjs)
  [['gridTemplateRows'], '.lc-disclosure__region, .lc-nav-group__items'],
  [['visibility'], '.lc-disclosure__region', undefined, 'transition'], // propriété discrète : ne passe à hidden qu'à la fin du repli (décision de l'orchestrateur), sans effet visible
  [['inlineSize'], '.lc-shell__nav'], // barre latérale de lc-app-shell
  [['left', 'right'], '.lc-tabbar__indicator', undefined, 'transition'], // pastille de la barre du bas : deux bords, `left` et `right` (lcPlaceIndicator, mode edges), sans clip-path
  [['color'], '.lc-tabbar__tab', undefined, 'transition'], // le texte de l'onglet bascule d'un bloc (durée 0, délai) quand le bord de la pastille le recouvre
  [['clipPath'], CA5_INDICATORS], // pastilles à deux bords
  [['clipPath'], ':root', '::view-transition'],
  [['width', 'height', 'left', 'top', 'insetInlineStart', 'insetBlockStart'], CA5_INDICATORS],
];
// Animations finies en cours : une animation infinie (`.lc-pulse`, spinner, squelette) ne se termine jamais, une animation `fill: forwards` terminée reste dans `getAnimations()` : ni l'une ni l'autre n'est attendue.
const NO_FINITE_ANIMATION = () => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending));
/** Attend la fin des animations finies ; une expiration est un échec écrit, pas un silence. */
const finiteIdle = (page, label, check, timeout = 15000) => page.waitForFunction(NO_FINITE_ANIMATION, null, { timeout }).then(() => true, () => { check(false, `${label} animations finies encore en cours après ${timeout} ms`); return false; });
/** CA-16c : le bandeau accompagne la page Motion et les stories `Animation` (spec 5.4) ; ni Elevation ni le Playground de Reveal n'en ont. */
const NOTICE = 'Les animations sont réduites par votre système : rien ne bouge dans cette démo.';
const chains = new Set(); // stories où une animation démarre après la première image suivant le clic (relevé en mouvement normal, relu en réduit)
let freshPageCa31 = false; // `--ca31-page-neuve` : ancien mode de CA-31 (page neuve pour chaque « Rejouer »), pour comparer
async function motionAnimations(context, base, ids, reduced, width, check) {
  const tag = `${reduced ? 'reduced' : 'normal'} ${width}px`;
  for (const id of ids) {
    if (id.startsWith('foundations-')) continue; // pages de documentation : pas de story d'animation à mesurer
    const t0 = Date.now();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => message.type() === 'error' && errors.push(`console: ${message.text()}`)); // CA-16a
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
    await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 }).catch((error) => errors.push(`rendu : ${error.message.split('\n')[0]}`));
    const buttons = page.getByRole('button', { name: 'Rejouer' });
    const count = await buttons.count();
    if (id.includes('--animation')) { // contrat de docs/storybook/CONVENTIONS.md : un « Rejouer » par démo (couvre aussi lcReveal + lcStagger de layout-reveal--animation)
      const demos = await page.locator('[data-demo]').count();
      check(count >= Math.max(1, demos, id === 'layout-reveal--animation' ? 2 : 0), `CA-16b CA-38 ${tag} ${id} au moins un « Rejouer » par démo (deux pour layout-reveal : lcReveal et lcStagger)`, `${count} bouton(s) pour ${demos} démo(s)`);
    }
    for (let n = 0; n < count; n += 1) {
      const label = `${tag} ${id} « Rejouer » n°${n + 1}/${count}`;
      await finiteIdle(page, label, check);
      // Dans le même `evaluate` que le clic : les animations sont relevées à leur première apparition (certains « Rejouer » démarrent après un rendu Angular).
      // Fenêtre de relevé : `min` ms au moins (900 ; 400 en réduit sauf chaîne), prolongée tant qu'une nouvelle animation apparaît (`quiet` ms de calme), 4 s au plus (une chaîne de « Rejouer » comme d61 : 300 ms puis 1,4 s) ;
      // `waitFirst` : tant qu'aucune animation nouvelle n'est apparue, on attend jusqu'à 8 s (démarrage tardif) ; seules comptent les animations absentes de l'instantané pris juste avant le clic.
      // `scrub` (CA-31) : chaque animation est mise en pause à sa première vue, puis amenée à 0, 50 et 100 % ; sinon on ne touche à rien.
      // `late` : animations apparues après la première image suivant le clic = chaîne (une animation qui démarre à la fin d'une autre) : la mise en pause la casserait, CA-31 repasse alors sur une page neuve.
      const scrubRun = async (button, { scrub, allow, min, quiet, waitFirst }) => {
        const MAX_MS = 4000;
        const kind = (a) => (a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'animation' : 'waapi');
        const skip = new Set(['offset', 'computedOffset', 'easing', 'composite']);
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        const before = new Set(document.getAnimations());
        const seen = new Map();
        // Rejeu piloté en JavaScript (compteur, canvas, style posé par script) : aucune animation du navigateur, mais le DOM ou les pixels d'un canvas changent après le clic.
        const root = document.querySelector('#storybook-root');
        const snap = () => root.outerHTML + [...root.querySelectorAll('canvas')].map((c) => { try { return c.toDataURL(); } catch { return ''; } }).join(); // toDataURL seulement par canvas présent
        const base = snap();
        let changed = false;
        const row = (a) => {
          const timing = a.effect.getComputedTiming();
          const target = a.effect.target;
          const pseudo = a.effect.pseudoElement ?? '';
          const props = [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !skip.has(k)))];
          const listed = props.filter((p) => allow.some(([names, selector, pseudoPrefix, only]) => names.includes(p) && target.matches(selector) && (pseudoPrefix === undefined ? !pseudo : pseudo.startsWith(pseudoPrefix)) && (only === undefined || only === kind(a))));
          return { kind: kind(a), state: a.playState, pending: a.pending, delay: timing.delay, duration: timing.duration, target: `${target.localName}.${String(target.className?.baseVal ?? target.className).split(' ')[0]}${pseudo}`, props, listed };
        };
        let lastNew = performance.now();
        const collect = () => { changed ||= snap() !== base; document.getAnimations().forEach((a) => { if (!before.has(a) && !seen.has(a)) { seen.set(a, row(a)); lastNew = performance.now(); if (scrub) a.pause(); } }); };
        button.click();
        const t0 = performance.now();
        await frame();
        collect();
        const early = seen.size;
        await frame();
        const running = document.getAnimations().filter((a) => a.playState === 'running' || a.pending).map(row); // une image après l'action
        for (let now = t0; now - t0 < (waitFirst ? 8000 : MAX_MS) && ((waitFirst && seen.size === 0 && !changed) || (now - t0 < MAX_MS && (now - t0 < min || now - lastNew < quiet))); now = performance.now()) { collect(); await frame(); }
        collect();
        const overflow = [];
        if (scrub) {
          const finite = [...seen.keys()].filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime));
          for (const p of [0, 0.5, 1]) {
            finite.forEach((a) => { a.currentTime = p * a.effect.getComputedTiming().endTime; });
            overflow.push(document.documentElement.scrollWidth > document.documentElement.clientWidth);
          }
          finite.forEach((a) => a.finish());
        }
        const rows = [...seen.values()];
        return { rows, running, overflow, late: rows.length - early, changed };
      };
      const win = reduced ? { min: chains.has(id) ? 900 : 400, quiet: 250 } : { min: 900, quiet: 600, waitFirst: true };
      const got = await buttons.nth(n).evaluate(scrubRun, { scrub: false, allow: CA5_ALLOW, ...win });
      if (reduced) {
        const bad = got.rows.filter((r) => r.duration > 0.01 || r.delay > 0.01);
        check(bad.length === 0 && got.running.length === 0, `CA-3 ${label} aucune animation en cours après une image, durées et délais ≤ 0,01 ms`, JSON.stringify([...got.running, ...bad].slice(0, 3)));
      } else {
        if (got.late > 0) chains.add(id);
        if (REPLAY_NO_EFFECT.has(id)) console.log(`EXEMPT CA-16b ${label} : ${REPLAY_NO_EFFECT.get(id)}`);
        else check(got.rows.length > 0 || got.changed, `CA-16b ${label} relance une animation`); // CA-16b : « Rejouer » démarre une animation du navigateur, ou change le DOM ou un canvas (démo pilotée en JavaScript)
        const bad = got.rows.flatMap((r) => r.props.filter((p) => !CA5_PROPS.has(p) && !r.listed.includes(p)).map((p) => `${r.kind}:${p}@${r.target}`));
        check(bad.length === 0, `CA-5 ${label} propriétés animées (${got.rows.length} animation(s))`, [...new Set(bad)].join(', '));
      }
      await closePanels(page);
      if (width === 360 && !reduced) {
        // Même page que CA-5 (seconde lecture) ; page neuve seulement pour une chaîne d'animations (`late`), que la mise en pause casserait.
        let target = page, fresh = null;
        if (got.late > 0 || freshPageCa31) {
          if (got.late > 0) console.log(`INFO ${label} chaîne d'animations (${got.late} tardive(s)) : CA-31 sur page neuve`);
          fresh = await context.newPage();
          await fresh.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
          await fresh.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 });
          target = fresh;
        }
        await finiteIdle(target, `${label}${fresh ? ' (page neuve)' : ' (relecture)'}`, check);
        const scrubbed = await target.getByRole('button', { name: 'Rejouer' }).nth(n).evaluate(scrubRun, { scrub: true, allow: CA5_ALLOW, ...win });
        await fresh?.close();
        if (!fresh) await closePanels(page);
        check(!scrubbed.overflow.some(Boolean), `CA-31 ${label} aucun défilement horizontal à 0, 50, 100 %`, JSON.stringify(scrubbed.overflow));
      }
    }
    // CA-16c : bandeau selon `prefers-reduced-motion` (le contexte porte la préférence)
    if (id.includes('motion') || id.includes('--animation')) {
      const notice = await page.locator(`text=${NOTICE}`).count();
      check(notice === (reduced ? 1 : 0), `CA-16c ${tag} ${id} bandeau ${reduced ? 'présent' : 'absent'}`, `(${notice})`);
    }
    check(errors.length === 0, `CA-16a erreurs page ou console ${tag} ${id}`, errors.join(' | '));
    await page.close();
    console.log(`TEMPS ${tag} ${id} ${Date.now() - t0} ms`);
  }
}

/** lc-swipe-panels, lc-tabs en swipe, lc-segmented-control suivi (spec 2026-11-bande-a-panneaux-et-reperes) : CA-1 à CA-11, 360 px, mouvement normal et réduit, 1 280 px en colonnes. */
async function swipe(browser, base) {
  let failures = 0;
  const check = (ok, label, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK ' : 'KO '} ${label}${detail ? ` ${detail}` : ''}`);
  };
  const near = (a, b, eps = 1) => Math.abs(a - b) <= eps;
  const PLAY = 'navigation-swipe-panels--playground';
  const SEG = 'navigation-swipe-panels--with-segmented-control';
  const NESTED = 'navigation-swipe-panels--nested';
  const TABS = 'navigation-tabs--swipe';
  const STRIP = 'lc-swipe-panels';
  const open = async (id, { width = 360, reduced = false, args = '' } = {}) => {
    const context = await browser.newContext({ viewport: { width, height: 700 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${args ? `&args=${args}` : ''}`);
    await page.waitForSelector(`${STRIP} .lc-swipe-panel`, { state: 'attached', timeout: 20000 });
    // Sorties du composant : les actions de Storybook passent par le canal ; `__ev` les range.
    await page.evaluate(() => {
      window.__ev = [];
      window.__STORYBOOK_ADDONS_CHANNEL__?.on('storybook/actions/action-event', (event) => window.__ev.push(event?.data?.data?.name ?? event?.data?.name));
    });
    return { context, page, errors };
  };
  // Défilement scripté : instantané, puis fin du défilement (`scrollend`, repli 1,5 s) et deux images.
  const scrollTo = (page, left, sel = STRIP) =>
    page.evaluate(([sel, left]) => new Promise((resolve) => {
      const strip = document.querySelector(sel);
      const done = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
      strip.addEventListener('scrollend', done, { once: true });
      setTimeout(done, 1500);
      strip.scrollTo({ left, behavior: 'instant' });
    }), [sel, left]);
  const frames = (page, n = 2) => page.evaluate((n) => new Promise((resolve) => { const step = (k) => (k === 0 ? resolve() : requestAnimationFrame(() => step(k - 1))); step(n); }), n);
  const setArgs = (page, id, updatedArgs) => page.evaluate(([id, updatedArgs]) => window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateStoryArgs', { storyId: id, updatedArgs }), [id, updatedArgs]);
  const poll = (page, fn, arg, timeout = 5000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);
  const state = (page, sel = STRIP) => page.evaluate((sel) => {
    const strip = document.querySelector(sel);
    const panels = [...strip.querySelectorAll(':scope > .lc-swipe-panel')];
    return { left: strip.scrollLeft, width: strip.clientWidth, inert: panels.map((p) => p.hasAttribute('inert')), progress: parseFloat(strip.style.getPropertyValue('--lc-swipe-panels-progress')), rects: panels.map((p) => p.getBoundingClientRect().left), host: strip.getBoundingClientRect().left };
  }, sel);

  for (const reduced of [false, true]) {
    const tag = reduced ? 'réduit 360px' : 'normal 360px';

    // CA-1 : glissement jusqu'au panneau 2.
    {
      const { context, page, errors } = await open(PLAY, { reduced });
      const { width } = await state(page);
      await scrollTo(page, 2 * width);
      await poll(page, () => window.__ev.length >= 1, null);
      const s = await state(page);
      const ev = JSON.stringify(await page.evaluate(() => window.__ev));
      check(ev === '["activeIndexChange"]', `CA-1 ${tag} activeIndexChange émis une fois`, ev);
      check(JSON.stringify(s.inert) === '[true,true,false]', `CA-1 ${tag} inert [0,1] oui, [2] non`, JSON.stringify(s.inert));
      check(errors.length === 0, `CA-1 ${tag} sans erreur`, errors.join(' | '));
      await context.close();
    }

    // CA-2 et CA-6 : activeIndex posé par le parent (0 → 2, en traversant le panneau 1).
    {
      const { context, page } = await open(PLAY, { reduced });
      await page.evaluate(() => { window.__seen = [0]; new MutationObserver(() => document.querySelectorAll('.lc-swipe-panel').forEach((p, i) => !p.hasAttribute('inert') && !window.__seen.includes(i) && window.__seen.push(i))).observe(document.querySelector('lc-swipe-panels'), { attributes: true, subtree: true, attributeFilter: ['inert'] }); });
      await setArgs(page, PLAY, { activeIndex: 2 });
      await poll(page, () => !document.querySelectorAll('.lc-swipe-panel')[2].hasAttribute('inert'), null);
      await frames(page, 2);
      const at = await state(page);
      if (reduced) check(near(at.left, 2 * at.width), `CA-6 ${tag} changement d'index : bande en place deux images après (instant)`, `scrollLeft ${at.left}`);
      else check(at.left < 2 * at.width - 1, `CA-6 contrôle ${tag} sans réduction : encore en chemin deux images après (smooth)`, `scrollLeft ${at.left}`);
      await poll(page, () => { const s = document.querySelector('lc-swipe-panels'); return s.scrollLeft >= s.clientWidth * 2 - 1; }, null);
      await frames(page, 30);
      const done = await state(page);
      check(near(done.left, 2 * done.width) && JSON.stringify(done.inert) === '[true,true,false]', `CA-2 ${tag} activeIndex 2 : bande au panneau 2 (±1 px), inert suit`, `scrollLeft ${done.left} ${JSON.stringify(done.inert)}`);
      check((await page.evaluate(() => window.__ev.length)) === 0, `CA-2 ${tag} aucune émission par le parent`);
      const seen = JSON.stringify(await page.evaluate(() => window.__seen));
      check(seen === '[0,2]', `CA-2 ${tag} le panneau 1 n'est jamais actif pendant le défilement`, seen);
      await context.close();
    }

    // CA-2 (parent qui réécrit l'index) et CA-5 (fond du segmenté) : story WithSegmentedControl.
    {
      const { context, page, errors } = await open(SEG, { reduced });
      await page.evaluate(() => { window.__ends = 0; document.querySelector('lc-swipe-panels').addEventListener('scrollend', () => window.__ends++); });
      await page.locator('[role=radio]').nth(2).click();
      await poll(page, () => document.querySelector('lc-swipe-panels').scrollLeft >= 2 * document.querySelector('lc-swipe-panels').clientWidth - 1, null);
      await frames(page, 30);
      const s = await state(page);
      check(near(s.left, 2 * s.width) && JSON.stringify(s.inert) === '[true,true,false]', `CA-2 ${tag} clic segment 2 : bande au panneau 2`, `scrollLeft ${s.left}`);
      const ends = await page.evaluate(() => window.__ends);
      check(ends <= 1, `CA-2 ${tag} index réécrit par le parent : un seul défilement de fin`, `scrollend ×${ends}`);
      // CA-5 : mi-chemin 0 → 1, accrochage coupé pour tenir la position.
      await scrollTo(page, 0);
      await page.evaluate(() => (document.querySelector('lc-swipe-panels').style.scrollSnapType = 'none'));
      await page.locator(STRIP).evaluate((el) => el.scrollTo({ left: el.clientWidth / 2, behavior: 'instant' }));
      await frames(page, 3);
      const m = await page.evaluate(() => {
        const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.width]; };
        const visible = (el) => { const b = el.getBoundingClientRect(); const m = /^inset\((.*?)(?: round .*)?\)$/.exec(getComputedStyle(el).clipPath); if (!m) return [b.left, b.width]; const [t, rt = t, , l = rt] = m[1].trim().split(/\s+/); const len = (x) => (x.endsWith('%') ? (parseFloat(x) / 100) * b.width : parseFloat(x)); return [b.left + len(l), b.width - len(l) - len(rt)]; }; // zone visible : boîte rognée par clip-path (T8, deux bords)
        const [o0, o1] = [...document.querySelectorAll('[role=radio]')].map(r);
        const ind = document.querySelector('.lc-segmented-control__indicator');
        return { progress: parseFloat(document.querySelector('lc-swipe-panels').style.getPropertyValue('--lc-swipe-panels-progress')), o0, o1, ind: visible(ind), anims: ind.getAnimations({ subtree: true }).length };
      });
      check(near(m.progress, 0.5, 0.02), `CA-5 ${tag} --lc-swipe-panels-progress ≈ 0,5`, String(m.progress));
      check(near(m.ind[0], (m.o0[0] + m.o1[0]) / 2) && near(m.ind[1], (m.o0[1] + m.o1[1]) / 2) && m.anims === 0, `CA-5 ${tag} fond du segmenté à mi-chemin (position, largeur, aucune animation)`, JSON.stringify(m));
      check(errors.length === 0, `CA-2/5 ${tag} sans erreur`, errors.join(' | '));
      await context.close();
    }

    // CA-5 (trait des onglets), CA-6 (trait), CA-11 : lc-tabs en swipe.
    {
      const { context, page, errors } = await open(TABS, { reduced });
      const dom = await page.evaluate(() => { const p = [...document.querySelectorAll('[role=tabpanel]')]; return { n: p.length, inert: p.map((e) => e.hasAttribute('inert')), hidden: p.map((e) => e.hasAttribute('hidden')) }; });
      check(dom.n === 3 && JSON.stringify(dom.inert) === '[false,true,true]' && !dom.hidden.some(Boolean), `CA-11 ${tag} trois tabpanel dès l'affichage, inert sur les non sélectionnés, aucun hidden`, JSON.stringify(dom));
      await page.locator('[role=tab]').nth(1).focus();
      await page.keyboard.press('ArrowRight');
      await frames(page, 3);
      const key = await page.evaluate(() => ({ focus: [...document.querySelectorAll('[role=tab]')].indexOf(document.activeElement), sel: [...document.querySelectorAll('[role=tab]')].map((t) => t.getAttribute('aria-selected')).join() }));
      check(key.focus === 2 && key.sel === 'false,false,true', `CA-11 ${tag} flèche droite : focus et sélection à l'onglet suivant (activation automatique comme avant)`, JSON.stringify(key));
      await page.locator('[role=tab]').first().click();
      await poll(page, () => document.querySelector('lc-swipe-panels').scrollLeft === 0, null);
      await frames(page, 30);
      const w = (await state(page)).width;
      await page.locator('[role=tab]').nth(1).click();
      if (reduced) {
        await frames(page, 2);
        const left = (await state(page)).left;
        check(near(left, w), `CA-6 ${tag} clic d'onglet : bande en place deux images après`, `scrollLeft ${left}`);
      }
      await poll(page, (w) => document.querySelector('lc-swipe-panels').scrollLeft >= w - 1, w);
      await frames(page, 30);
      await scrollTo(page, 0);
      await page.evaluate(() => (document.querySelector('lc-swipe-panels').style.scrollSnapType = 'none'));
      await page.locator(STRIP).evaluate((el) => el.scrollTo({ left: el.clientWidth / 2, behavior: 'instant' }));
      await frames(page, 3);
      const m = await page.evaluate(() => {
        const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.width]; };
        const visible = (el) => { const b = el.getBoundingClientRect(); const m = /^inset\((.*?)(?: round .*)?\)$/.exec(getComputedStyle(el).clipPath); if (!m) return [b.left, b.width]; const [t, rt = t, , l = rt] = m[1].trim().split(/\s+/); const len = (x) => (x.endsWith('%') ? (parseFloat(x) / 100) * b.width : parseFloat(x)); return [b.left + len(l), b.width - len(l) - len(rt)]; }; // zone visible (T8)
        const [t0, t1] = [...document.querySelectorAll('[role=tab]')].map(r);
        const ind = document.querySelector('.lc-tabs__indicator');
        return { t0, t1, ind: visible(ind), anims: ind.getAnimations({ subtree: true }).length };
      });
      check(near(m.ind[0], (m.t0[0] + m.t1[0]) / 2) && near(m.ind[1], (m.t0[1] + m.t1[1]) / 2) && m.anims === 0, `CA-5 ${tag} trait des onglets à mi-chemin (position, largeur, aucune animation)`, JSON.stringify(m));
      check(errors.length === 0, `CA-11 ${tag} sans erreur`, errors.join(' | '));
      await context.close();
    }
  }

  // CA-3 : sans scrollend, la sourdine finit avant 800 ms et un glissement suivant est suivi.
  {
    const { context, page } = await open(PLAY);
    await page.evaluate(() => { const add = HTMLElement.prototype.addEventListener; HTMLElement.prototype.addEventListener = function (type, ...rest) { return this.localName === 'lc-swipe-panels' && type === 'scrollend' ? undefined : add.call(this, type, ...rest); }; });
    await setArgs(page, PLAY, { activeIndex: 2 });
    const t0 = await page.evaluate(() => performance.now());
    await poll(page, () => { const s = document.querySelector('lc-swipe-panels'); return s.scrollLeft >= s.clientWidth * 2 - 1; }, null);
    const during = await page.evaluate(() => window.__ev.length);
    await page.evaluate((t0) => new Promise((resolve) => { const step = () => (performance.now() - t0 >= 850 ? resolve() : requestAnimationFrame(step)); step(); }), t0);
    await scrollTo(page, 0);
    const followed = await poll(page, () => window.__ev.length >= 1, null);
    check(during === 0 && followed, 'CA-3 sans scrollend : aucune émission pendant le défilement, glissement suivi à 850 ms', `pendant ${during}, suivi ${followed}`);
    await context.close();
  }

  // CA-4 : imbrication et chaînage (molette horizontale).
  for (const chain of [true, false]) {
    const { context, page } = await open(NESTED);
    await page.locator('[role=radio]').nth(1).click();
    const w = (await state(page)).width;
    await poll(page, (w) => document.querySelector('lc-swipe-panels').scrollLeft >= w - 1, w);
    await frames(page, 30);
    if (!chain) await page.evaluate(() => document.querySelectorAll('lc-swipe-panels')[1].classList.remove('lc-swipe-panels--chain'));
    const oba = await page.evaluate(() => getComputedStyle(document.querySelectorAll('lc-swipe-panels')[1]).overscrollBehaviorX);
    const box = await page.locator('lc-tabs [role=tabpanel]').first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(-250, 0);
    await frames(page, 30);
    const left = await page.evaluate(() => document.querySelector('lc-swipe-panels').scrollLeft);
    check(oba === (chain ? 'auto' : 'contain'), `CA-4 chain ${chain} : overscroll-behavior-x ${oba}`);
    check(chain ? near(left, 0) : near(left, w), `CA-4 chain ${chain} : molette vers le début, bande extérieure ${chain ? 'revient au panneau 0' : 'ne bouge pas'}`, `scrollLeft ${left}`);
    await context.close();
  }

  // CA-7 : focus et inert.
  {
    const { context, page } = await open(PLAY);
    await page.evaluate(() => {
      document.querySelectorAll('.lc-swipe-panel').forEach((p, i) => p.insertAdjacentHTML('beforeend', `<button id="b${i}">b${i}</button>`));
      document.querySelector('lc-swipe-panels').insertAdjacentHTML('beforebegin', '<button id="before">avant</button>');
    });
    await page.locator('#before').focus();
    const seen = [];
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.localName)); }
    check(seen[0] === 'b0' && !seen.includes('b1') && !seen.includes('b2'), 'CA-7 Tab depuis l\'élément précédent : seul le panneau actif est atteint', seen.join());
    await page.locator('#b0').focus();
    const { width } = await state(page);
    await scrollTo(page, width);
    await frames(page, 3);
    const active = await page.evaluate(() => { const a = document.activeElement; return { panel: [...document.querySelectorAll('.lc-swipe-panel')].indexOf(a), tag: a.localName }; });
    check(active.panel === 1, 'CA-7 focus dans le panneau 0 puis glissement : activeElement est le panneau 1', JSON.stringify(active));
    await context.close();
  }

  // CA-8 : 20 glissements dans Nested, aucune tâche longue.
  {
    const { context, page, errors } = await open(NESTED);
    await frames(page, 90); // le démarrage de Storybook et d'Angular (~1 s) produit ses propres tâches longues : mesure une fois la page au repos
    await page.evaluate(() => { window.__long = []; new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: false }); });
    const { width } = await state(page);
    const marks = [];
    for (let i = 0; i < 20; i++) { marks.push(Math.round(await page.evaluate(() => performance.now()))); await scrollTo(page, i % 2 === 0 ? width : 0); }
    const long = (await page.evaluate(() => window.__long)).filter(([, d]) => d > 50);
    if (long.length) console.log(`   tâches longues [début, durée] ${JSON.stringify(long)}, début des glissements ${marks[0]} ms`);
    check(long.length === 0 && errors.length === 0, 'CA-8 Nested : 20 glissements, aucune tâche longue > 50 ms, aucune erreur', `tâches ${JSON.stringify(long)} ${errors.join(' | ')}`);
    await context.close();
  }

  // CA-9 et CA-10 : colonnes puis bande ; rotation.
  {
    const { context, page } = await open(PLAY);
    await page.evaluate(() => document.querySelectorAll('.lc-swipe-panel').forEach((p, i) => p.insertAdjacentHTML('beforeend', `<input id="i${i}">`)));
    await setArgs(page, PLAY, { activeIndex: 1 });
    await poll(page, () => { const s = document.querySelector('lc-swipe-panels'); return s.scrollLeft >= s.clientWidth - 1; }, null);
    await frames(page, 30);
    await page.locator('#i1').fill('saisie');
    await page.evaluate(() => { window.__nodes = [...document.querySelectorAll('.lc-swipe-panel')]; window.__ev.length = 0; });
    await setArgs(page, PLAY, { layout: 'columns' });
    await poll(page, () => document.querySelector('lc-swipe-panels').classList.contains('lc-swipe-panels--columns'), null);
    await frames(page, 3);
    await page.evaluate(() => document.querySelector('lc-swipe-panels').style.setProperty('--lc-swipe-panels-columns', 'minmax(0, 1fr) 21rem'));
    await frames(page, 2);
    const col = await page.evaluate(() => { const p = [...document.querySelectorAll('.lc-swipe-panel')]; return { inert: p.some((e) => e.hasAttribute('inert')), same: p.every((e, i) => e === window.__nodes[i]), value: document.querySelector('#i1').value, w1: p[1].getBoundingClientRect().width, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) }; });
    check(!col.inert && col.same && col.value === 'saisie', 'CA-9 colonnes : aucun inert, mêmes nœuds, champ saisi conservé', JSON.stringify(col));
    check(near(col.w1, 21 * col.rem), 'CA-9 colonnes : second panneau de 21 rem (±1 px)', `${col.w1} px, 21 rem = ${21 * col.rem}`);
    await page.evaluate(() => document.querySelector('lc-swipe-panels').style.removeProperty('--lc-swipe-panels-columns'));
    await setArgs(page, PLAY, { layout: 'strip' });
    await poll(page, () => !document.querySelector('lc-swipe-panels').classList.contains('lc-swipe-panels--columns'), null);
    await frames(page, 5);
    const back = await state(page);
    const same = await page.evaluate(() => [...document.querySelectorAll('.lc-swipe-panel')].every((e, i) => e === window.__nodes[i]));
    check(same && near(back.rects[1], back.host) && back.inert.join() === 'true,false,true', 'CA-9 retour en bande : mêmes nœuds, panneau 1 affiché (±1 px)', JSON.stringify(back));
    // CA-10 : rotation, le conteneur de la story passe de 360 à 740 px.
    await page.evaluate(() => (window.__ev.length = 0));
    await page.setViewportSize({ width: 740, height: 360 });
    await page.evaluate(() => (document.querySelector('lc-swipe-panels').parentElement.style.inlineSize = '740px'));
    await frames(page, 5);
    const rot = await state(page);
    check(rot.width > 600 && near(rot.rects[1], rot.host) && near(rot.left, rot.width) && (await page.evaluate(() => window.__ev.length)) === 0, 'CA-10 rotation 360 → 740 px : panneau actif aligné (±1 px), aucune émission', JSON.stringify(rot));
    await context.close();
  }

  // 1 280 px : colonnes, rien ne défile.
  {
    const { context, page } = await open(PLAY, { width: 1280, args: 'layout:columns' });
    const s = await page.evaluate(() => { const el = document.querySelector('lc-swipe-panels'); const p = [...el.querySelectorAll('.lc-swipe-panel')].map((e) => e.getBoundingClientRect().left); return { overflow: el.scrollWidth > el.clientWidth, inert: !!el.querySelector('[inert]'), lefts: p }; });
    check(!s.overflow && !s.inert && s.lefts[0] < s.lefts[1] && s.lefts[1] < s.lefts[2], 'CA-9 1280 px en colonnes : panneaux côte à côte, aucun inert, rien ne défile', JSON.stringify(s));
    await context.close();
  }
  return failures;
}

const server = await staticServer(storybookDir); // BASE (variable d'environnement) : serveur partagé du lanceur `run.mjs`
const { base } = server;
const browser = await chromium.launch();
let failures = 0;
try {
  const [mode, ...rest] = process.argv.slice(2);
  freshPageCa31 = rest.includes('--ca31-page-neuve');
  const fragments = rest.filter((a) => a !== '--ca31-page-neuve');
  if (mode === 'axe') {
    const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
    const wanted = fragments.length === 0 ? MOTION_AXE_FRAGMENTS : fragments[0] === '--hors-mouvement' ? NEW_STORY_FRAGMENTS : fragments;
    const entries = Object.entries(index.entries).filter(([id, entry]) => entry.type === 'story' && wanted.some((fragment) => id.includes(fragment))).map(([id, entry]) => [id, entry.title]);
    console.log(`${entries.length} stories × 2 thèmes`);
    if (entries.length === 0) { console.log(`KO aucune story ne correspond à ${wanted.join(' ')}`); failures = 1; }
    failures += await axeRun(browser, base, entries);
  } else if (mode === 'dom') {
    failures = await dom(browser, base);
  } else if (mode === 'filter-date') {
    failures = await filterDate(browser, base);
  } else if (mode === 'treegrid') {
    failures = await treegrid(browser, base);
  } else if (mode === 'motion') {
    failures = await motion(browser, base, fragments);
  } else if (mode === 'swipe') {
    failures = await swipe(browser, base);
  } else if (mode === 'perf') {
    failures = await perf(browser, base);
  } else {
    console.error('Usage : storybook-browser.mjs axe [fragments|--hors-mouvement] | perf | motion | swipe | dom | treegrid | filter-date');
    failures = 1;
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failures > 0 ? 1 : 0);
