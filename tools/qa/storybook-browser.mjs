// Vérifications dans un vrai navigateur (Chromium via Playwright) sur le Storybook statique (`npm run build-storybook`) :
//   node tools/qa/storybook-browser.mjs axe [fragment-d-id ...]   axe-core sur chaque story, thèmes clair et sombre
//   node tools/qa/storybook-browser.mjs perf                      temps de rendu des 2 000 lignes de lc-tree-table (CA-K3.5)
//   node tools/qa/storybook-browser.mjs treegrid                  clavier complet de lc-tree-table, focus après re-rendu, tri sur 2 000 lignes
//   node tools/qa/storybook-browser.mjs filter-date               filtre de période de lc-data-table : calendrier dans le menu (CA-P5), panneau 360 px natif (CA-P10b)
//   node tools/qa/storybook-browser.mjs motion                    mouvement (spec 2026-11-mouvement) : appui du bouton, lcReveal, entrée et sortie des panneaux ; contextes normal, réduction, forced-colors, 360 et 1280 px ; puis, sur chaque story d'animation de l'index, toute animation (CSSTransition, CSSAnimation, WAAPI) : CA-3, CA-5, CA-31 de 2026-12-mouvement-v2
//   node tools/qa/storybook-browser.mjs swipe                     lc-swipe-panels, lc-tabs en swipe, fond du segmenté (spec 2026-11-bande-a-panneaux-et-reperes, CA-1 à CA-11) ; normal et mouvement réduit à 360 px, colonnes à 1280 px
//   node tools/qa/storybook-browser.mjs stories-motion           stories de mouvement (liste dérivée de l'index, CA-38) : ouverture sans erreur, « Rejouer », bandeau de réduction (CA-16a à CA-16c)
//   node tools/qa/storybook-browser.mjs dom                       comportements qui dépendent du CSS (sélection, repli, tabulation)
// Sortie : un résumé par story ; code de sortie 1 au moindre échec. Aucun accès réseau (serveur local sur dist/storybook).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook'); // STORYBOOK_DIR : construction à part (évite de piétiner celle d'un autre processus)
const { chromium } = require('playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };

function serve() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const file = path.join(storybookDir, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''));
    let body;
    try {
      body = await readFile(file);
    } catch {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(body);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const NEW_STORY_FRAGMENTS = ['feedback-status-badge', 'data-tree-table', 'navigation-nav-group', 'bar-chart--by-role', 'area-chart--by-role', 'buttons-button--variants', 'forms-slider', 'theme-builder'];

async function openStory(browser, base, id, theme) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  // `attached` : une story dont le seul enfant est en `position:fixed` (overlays-tooltip--near-edges) a un hôte sans boîte, jamais « visible ».
  await page.waitForSelector('#storybook-root > *, #storybook-docs', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(400);
  if (id.includes('--animation')) await page.waitForFunction(() => document.getAnimations().every((a) => !Number.isFinite(a.effect.getComputedTiming().endTime)), null, { timeout: 15000 }); // fin de la cascade (les boucles infinies, comme .lc-pulse, ne finissent jamais : ignorées) : sinon axe mesure le contraste d'un texte à mi-fondu
  return { page, context, errors };
}

async function axeRun(browser, base, entries) {
  let failures = 0;
  for (const [id, title] of entries) {
    for (const theme of ['default', 'dark']) {
      const { page, context, errors } = await openStory(browser, base, id, theme);
      await page.addScriptTag({ content: axeSource });
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
      await context.close();
    }
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
    const hiddenLinks = await links.evaluateAll((nodes) => nodes.map((node) => node.offsetParent === null || getComputedStyle(node).visibility === 'hidden'));
    check('CA-K8.2 Entrée bascule aria-expanded', before !== after, `${before} -> ${after}`);
    check('CA-K8.2 liens repliés non rendus (hors tabulation)', hiddenLinks.length > 0 && hiddenLinks.every(Boolean));
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
    q.cardSnaps.push(all.map(({ tr, list }, i) => {
      const cs = getComputedStyle(tr);
      return { n: i + 1, reveal: tr.classList.contains('lc-reveal') || tr.hasAttribute('lcreveal') || list.length > 0, props: list.map((a) => a.animationName), delays: list.map((a) => a.effect.getComputedTiming().delay), durations: list.map((a) => a.effect.getComputedTiming().duration), startOpacity: cs.opacity, cssDelay: cs.animationDelay, cssDuration: cs.animationDuration };
    }));
    all.forEach(({ list }) => list.forEach((a) => a.finish()));
  };
  new MutationObserver((records) => {
    if (records.some((r) => [...r.addedNodes].some(isReveal))) snapCards();
  }).observe(document, { subtree: true, childList: true });

  // Dialogue du téléphone : entrée (à l'attribut `open`) et sortie (à `data-closing`, fondu suspendu pour ne pas dépendre de l'horloge).
  q.watchDialog = () => {
    const dialog = document.querySelector('lc-sheet dialog');
    const own = () => dialog.getAnimations({ subtree: true }).filter((a) => a instanceof CSSTransition && a.effect.target === dialog);
    const read = (list) => {
      list.forEach((a) => a.pause());
      list.forEach((a) => { a.currentTime = 0; });
      const cs = getComputedStyle(dialog);
      const bd = getComputedStyle(dialog, '::backdrop');
      const info = { height: dialog.offsetHeight, open: dialog.open, props: list.map((a) => `${a.effect.pseudoElement ?? 'dialog'}:${a.transitionProperty}`), durations: list.map((a) => a.effect.getComputedTiming().duration), delays: list.map((a) => a.effect.getComputedTiming().delay), startOpacity: cs.opacity, startTransform: cs.transform, backdropStartOpacity: bd.opacity, cssDuration: cs.transitionDuration, backdropCssDuration: bd.transitionDuration };
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
  // CA-3 : état du trait des onglets à la première mesure (observateur installé avant le premier rendu).
  q.tabs3 = { readyAt: null, firstSeen: null };
  new MutationObserver(() => {
    const host = document.querySelector('lc-tabs');
    const ind = host?.querySelector('.lc-tabs__indicator');
    if (!ind) return;
    const ready = host.classList.contains('lc-tabs--ready');
    if (!q.tabs3.firstSeen) q.tabs3.firstSeen = { ready, measured: ind.style.transform !== '' };
    if (ready && !q.tabs3.readyAt) q.tabs3.readyAt = { measured: ind.style.transform !== '', animations: ind.getAnimations().map((a) => a.effect.getTiming().duration) };
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });

  // --- Différence de liste (T6b, décision 26) : enregistreur par image des animations des lignes de lc-data-table ---
  const ROWS = 'lc-data-table tbody tr:not(.lc-data-table__state)';
  const rowKey = (tr) => tr.textContent.match(/Demande \d+/)?.[0] ?? '?';
  q.rowKeys = () => [...document.querySelectorAll(ROWS)].map(rowKey);
  q.list = null;
  /** Instantané « avant » (éléments, positions), puis enregistrement de chaque animation de ligne à sa première image. */
  q.startList = () => {
    if (q.list) q.list.stop = true;
    const rec = (q.list = { stop: false, idle: 0, before: new Map(), els: new Map(), anims: [], block: [], cardSnapsBefore: q.cardSnaps.length });
    document.querySelectorAll(ROWS).forEach((tr) => { rec.before.set(rowKey(tr), tr.getBoundingClientRect().top); rec.els.set(rowKey(tr), tr); });
    const seen = new WeakSet();
    const tick = () => {
      if (rec.stop) return;
      const all = [...document.querySelectorAll('lc-data-table tbody tr')];
      let running = 0;
      for (const tr of all) {
        for (const a of tr.getAnimations()) {
          running += 1;
          if (seen.has(a)) continue;
          seen.add(a);
          const kf = a.effect.getKeyframes();
          const t = a.effect.getTiming();
          rec.anims.push({ key: rowKey(tr), kind: a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'css' : 'waapi', props: Object.keys(kf[0] ?? {}).filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)), first: kf[0], last: kf.at(-1), duration: t.duration, delay: t.delay, easing: t.easing, fill: t.fill, leaving: tr.hasAttribute('data-leaving'), connected: tr.isConnected, leavingConnected: document.querySelectorAll('tr[data-leaving]').length });
        }
      }
      for (const a of document.querySelector('.lc-data-table__scroll')?.getAnimations() ?? []) if (!seen.has(a)) { seen.add(a); rec.block.push({ first: a.effect.getKeyframes()[0]?.transform, duration: a.effect.getTiming().duration }); }
      rec.idle = running === 0 && !document.querySelector('tr[data-leaving]') ? rec.idle + 1 : 0;
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
      move: q.tokenMs('--lc-list-move-duration'), moveEase: q.easing('--lc-list-move-easing'), exit: q.tokenMs('--lc-overlay-exit-duration'), enter: q.tokenMs('--lc-overlay-enter-duration'),
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
const MENU = { tokens: 'menu', enterMs: 350, exitMs: 140, scale: 0.94, ref: popRef('d28', 'div.menu-panel') };
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
  const tokens = (page) => page.evaluate(() => { const q = window.__qa; return { enter: q.tokenMs('--lc-overlay-enter-duration'), slideEnter: q.tokenMs('--lc-slide-enter-duration'), slideExit: q.tokenMs('--lc-slide-exit-duration'), exit: q.tokenMs('--lc-overlay-exit-duration'), chip: q.tokenMs('--lc-chip-enter-duration'), stagger: q.tokenMs('--lc-sys-motion-stagger-normal'), reveal: q.tokenMs('--lc-sys-duration-enter'), offset: q.tokenPx('--lc-overlay-offset') }; });
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
      const list = window.__qa.transitions(el, (a) => a.transitionProperty === 'transform');
      const durations = list.map((a) => a.effect.getComputedTiming().duration);
      list.forEach((a) => a.finish());
      return { durations, scale: parseFloat(getComputedStyle(el).getPropertyValue('--lc-button-press-scale')), a: new DOMMatrix(getComputedStyle(el).transform).a, text: el.textContent.trim(), active: el.matches(':active'), cssDuration: getComputedStyle(el).transitionDuration, pressMs: window.__qa.tokenMs('--lc-sys-duration-fast') };
    }, FILTERS);
    await page.mouse.move(0, 0); // relâché hors du bouton : pas de clic, le panneau ne s'ouvre pas
    await page.mouse.up();
    if (reduced) check(got.active && quick(got.cssDuration) && got.durations.every((ms) => ms <= 0.01), `CA-6/13 ${tag} ${label} « ${got.text} »`, `durées=${got.cssDuration}`);
    else check(got.active && got.durations.length > 0 && got.durations.every((ms) => near(ms, got.pressMs)) && near(got.a, got.scale, 0.001), `CA-6 ${tag} ${label} « ${got.text} »`, `échelle=${got.a.toFixed(3)} attendu ${got.scale}, durées=${got.durations} attendu ${got.pressMs}, actif=${got.active}`);
  };

  // CA-10 : entrée du dialogue.
  const entry = async (page, label) => {
    const t = await tokens(page);
    const e = await page.evaluate(() => window.__qa.dlg.enter);
    const dy = m42(e.startTransform);
    if (reduced) check(quick(e.cssDuration) && quick(e.backdropCssDuration) && e.endOpacity === '1', `CA-10/13 ${tag} ${label} entrée`, `durée dialogue=${e.cssDuration} fond=${e.backdropCssDuration} opacité finale=${e.endOpacity}`);
    else check(['dialog:transform', '::backdrop:opacity'].every((p) => e.props.includes(p)) && e.props.every((p, i) => near(e.durations[i], p.endsWith('transform') ? t.slideEnter : t.enter)) && e.delays.every((d) => d === 0) && near(dy, e.height, 1) && e.backdropStartOpacity === '0' && e.endOpacity === '1' && e.backdropEndOpacity === '1', `CA-10 ${tag} ${label} entrée (feuille : translateY(100%) → 0, fond en fondu)`, `transitions=${e.props} durées=${e.durations} attendu ${t.slideEnter} (feuille) et ${t.enter} (fond), décalageY=${dy} attendu ${e.height}, fond départ=${e.backdropStartOpacity}, fin=${e.endOpacity}/${e.backdropEndOpacity}`);
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
    else check(c.open && c.props.includes('dialog:transform') && c.props.includes('::backdrop:opacity') && c.durations.every((d) => near(d, t.slideExit)) && got.held.open && got.held.closing, `CA-10 ${tag} ${label} sortie`, `data-closing posé, ouvert à ce moment=${c.open}, transitions=${c.props} durées=${c.durations} attendu ${t.slideExit}, descente en cours : ouvert=${got.held.open} data-closing=${got.held.closing}`);
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
  // CA-12 (décision 26) : après « Afficher N … », aucune cascade rejouée ; les cartes conservées gardent leur élément.
  await page.waitForFunction(() => window.__qa.rowKeys().length === 10 && window.__qa.list.idle >= 6, undefined, { timeout: 10000 });
  {
    const r = await page.evaluate(() => window.__qa.listReport());
    check(r.cascades === 0 && r.kept.length === 10 && r.kept.every((k) => k.same), `CA-12 ${tag} après « Afficher N » : aucune cascade rejouée, 10 cartes conservées (même élément)`, `cascades rejouées=${r.cascades}, conservées=${r.kept.length}, éléments identiques=${r.kept.filter((k) => k.same).length}`);
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
  const snapsBefore = await page.evaluate(() => window.__qa.cardSnaps.length);
  await page.evaluate(() => { window.__qa.chipOut = null; });
  await page.locator('.lc-data-table__chip-remove').first().click();
  await page.waitForFunction(() => window.__qa.chipOut?.neighboursLater !== undefined);
  const out = await page.evaluate(() => window.__qa.chipOut);
  check(!out.connected && out.own === 0 && out.neighbours === 0 && out.neighboursLater === 0 && out.remaining === 1, `CA-11c ${tag} pastille retirée`, `dans le DOM=${out.connected}, animations de la pastille=${out.own}, des pastilles voisines=${out.neighbours} puis ${out.neighboursLater} (toutes animations de la zone : ${out.laterWhich}), pastilles restantes=${out.remaining}`);
  await page.waitForFunction(() => document.querySelectorAll('lc-data-table tbody tr').length > 0);
  await tick(page);
  const snapsAfterChip = await page.evaluate(() => window.__qa.cardSnaps.length);
  check(snapsAfterChip === snapsBefore, `CA-12 ${tag} aucune cascade au retrait d'une pastille`, `cascades rejouées=${snapsAfterChip - snapsBefore}`);
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
  const fitTab = (page) => page.evaluate(() => { const q = window.__qa; const ind = q.rect(document.querySelector('.lc-tabs__indicator')); const tab = q.rect(document.querySelector('[role=tab][aria-selected=true]')); return { ind, tab }; });
  const finishTabs = (page) => page.evaluate(() => document.querySelector('.lc-tabs__indicator').getAnimations().forEach((a) => a.finish()));
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
      const list = ind.getAnimations().filter((a) => a instanceof CSSTransition);
      const info = list.map((a) => ({ p: a.transitionProperty, d: a.effect.getTiming().duration, delay: a.effect.getTiming().delay, e: a.effect.getTiming().easing }));
      const css = getComputedStyle(ind);
      const out = { info, cssDuration: css.transitionDuration, cssProp: css.transitionProperty, ms: q.tokenMs('--lc-tabs-indicator-front-duration'), move: q.tokenMs('--lc-sys-duration-move'), ease: q.easing('--lc-tabs-indicator-front-easing'), left: css.left };
      list.forEach((a) => a.finish());
      out.rect = q.rect(ind); out.tab = q.rect(tab);
      return out;
    }, byText('Graphiques'));
    if (reduced) {
      check(reducedMs(got.cssDuration) && got.info.every((i) => i.d <= 0.01), `CA-2/13 ${tag} indicateur saute (durée calculée ≤ 0,01 ms)`, `durée=${got.cssDuration} transitions=${JSON.stringify(got.info)}`);
    } else if (!forced) {
      const props = got.info.map((i) => i.p);
      check(props.includes('transform') && !props.includes('left') && got.info.every((i) => near(i.d, got.ms) && i.delay === 0), `CA-2 ${tag} transition de transform à la durée du token`, `transitions=${JSON.stringify(got.info)} attendu ${got.ms}ms`);
      check(got.info.length > 0 && got.info.every((i) => sameEase(i.e, got.ease)) && near(got.ms, 500) && near(got.move, 500), `CA-24 ${tag} onglets : easing-standard, 500 ms`, `durée token=${got.ms} duration-move=${got.move} courbe des transitions=${got.info[0]?.e?.slice(0, 40)}… courbe du token=${got.ease.slice(0, 40)}…`);
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
        const x = () => new DOMMatrix(getComputedStyle(ind).transform).m41;
        const c = by('Graphiques'); const j = by('Journal');
        const x0 = x();
        c.click(); await q.frames(4);
        const mid = x(); const x1 = c.offsetLeft;
        j.click(); await q.frames(2);
        const list = ind.getAnimations().filter((a) => a instanceof CSSTransition && a.transitionProperty === 'transform');
        list.forEach((a) => a.pause()); list.forEach((a) => { a.currentTime = 0; });
        const startX = x();
        // `width` anime aussi (même durée) : tout terminer avant de mesurer l'arrivée.
        ind.getAnimations().forEach((a) => a.finish());
        return { x0, x1, mid, startX, count: list.length, rect: q.rect(ind), tab: q.rect(j) };
      });
      check(r.count > 0 && r.startX > r.x0 + 0.5 && r.startX < r.x1 - 0.5 && r.mid > r.x0 + 0.5 && r.mid < r.x1 - 0.5, `CA-2b ${tag} la seconde transition part de la position courante`, `départ=${r.x0.toFixed(1)}, arrivée de la première=${r.x1.toFixed(1)}, position à mi-course=${r.mid.toFixed(1)}, départ de la seconde=${r.startX.toFixed(1)}`);
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
  const navRect = (page, item) => page.evaluate((sel) => { const q = window.__qa; return { ind: q.rect(document.querySelector('.lc-nav-list__indicator')), item: q.rect(document.querySelector(sel)) }; }, item);
  const navFits = (r) => near(r.ind.top, r.item.top, 1) && near(r.ind.height, r.item.height, 1);
  const navFmt = (r) => `indicateur y=${r.ind.top.toFixed(1)} h=${r.ind.height.toFixed(1)}, élément y=${r.item.top.toFixed(1)} h=${r.item.height.toFixed(1)}`;
  {
    const { page, errors } = await start(NAV, '', '#/a');
    await page.waitForSelector('#item-a.lc-nav-item--active');
    await page.evaluate(() => window.__qa.frames(3));
    await page.evaluate(() => document.querySelector('.lc-nav-list__indicator').getAnimations().forEach((a) => a.finish()));
    if (!forced) check(navFits(await navRect(page, '#item-a')), `CA-5a ${tag} indicateur sur l'élément actif au départ`, navFmt(await navRect(page, '#item-a')));
    const got = await page.evaluate(async () => {
      const q = window.__qa; const ind = document.querySelector('.lc-nav-list__indicator');
      document.querySelector('#item-b').click(); await q.frames(2);
      const list = ind.getAnimations().filter((a) => a instanceof CSSTransition);
      const info = list.map((a) => ({ p: a.transitionProperty, d: a.effect.getTiming().duration, delay: a.effect.getTiming().delay, e: a.effect.getTiming().easing }));
      const out = { info, cssDuration: getComputedStyle(ind).transitionDuration, ms: q.tokenMs('--lc-nav-item-indicator-front-duration'), move: q.tokenMs('--lc-sys-duration-move'), ease: q.easing('--lc-nav-item-indicator-front-easing') };
      list.forEach((a) => a.finish());
      return out;
    });
    if (forced) {
      const r = await page.evaluate((ink) => { const f = eval(ink); return { active: f(document.querySelector('#item-b')), other: f(document.querySelector('#item-c')), indicator: getComputedStyle(document.querySelector('.lc-nav-list__indicator')).display }; }, ink.toString());
      check(r.active.visible && JSON.stringify(r.active) !== JSON.stringify(r.other) && r.indicator === 'none', `CA-14 ${tag} élément de nav actif distinct d'un inactif, indicateur masqué`, `actif=${JSON.stringify(r.active)} inactif=${JSON.stringify(r.other)} indicateur display=${r.indicator}`);
    } else if (reduced) {
      check(reducedMs(got.cssDuration) && got.info.filter((i) => i.p !== 'opacity').every((i) => i.d <= 0.01), `CA-5a/13 ${tag} indicateur saute`, `durée=${got.cssDuration} transitions=${JSON.stringify(got.info)}`);
      check(navFits(await navRect(page, '#item-b')), `CA-5a/13 ${tag} indicateur sur l'élément actif après le clic`, navFmt(await navRect(page, '#item-b')));
    } else {
      check(got.info.some((i) => i.p === 'transform' && near(i.d, got.ms)), `CA-5a ${tag} transition de transform à la durée du token`, `transitions=${JSON.stringify(got.info.map((i) => [i.p, i.d]))} attendu ${got.ms}ms`);
      check(got.info.filter((i) => i.p === 'transform' || i.p === 'height').every((i) => sameEase(i.e, got.ease)) && near(got.ms, 500) && near(got.move, 500), `CA-24 ${tag} nav : easing-standard, 500 ms`, `durée token=${got.ms} duration-move=${got.move} courbe=${got.info[0]?.e?.slice(0, 40)}… token=${got.ease.slice(0, 40)}…`);
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
      const hidden = await page.evaluate(() => { const ind = document.querySelector('.lc-nav-list__indicator'); ind.getAnimations().forEach((a) => a.finish()); return { cls: ind.classList.contains('lc-nav-list__indicator--hidden'), opacity: getComputedStyle(ind).opacity, itemRect: document.querySelector('#item-d').getBoundingClientRect().height }; });
      check(hidden.cls && hidden.opacity === '0', `CA-5b ${tag} groupe replié : indicateur masqué`, `masqué=${hidden.cls} opacité=${hidden.opacity} hauteur de l'élément actif=${hidden.itemRect}`);
      const r = await page.evaluate(async () => {
        const q = window.__qa; const ind = document.querySelector('.lc-nav-list__indicator');
        [...document.querySelectorAll('.lc-nav-group__toggle')][1].click();
        const perFrame = [];
        for (let i = 0; i < 6; i += 1) { await q.frames(1); perFrame.push(ind.getAnimations().filter((a) => a instanceof CSSTransition && a.transitionProperty === 'transform').length); }
        ind.getAnimations().forEach((a) => a.finish());
        await q.frames(2);
        return { perFrame, ind: q.rect(ind), item: q.rect(document.querySelector('#item-d')), opacity: getComputedStyle(ind).opacity };
      });
      check(r.perFrame.every((n) => n === 0), `CA-5c ${tag} au dépliage : aucune transition de transform (6 premières images)`, `transitions de transform par image=${r.perFrame}`);
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

/** Différence de liste de lc-data-table (spec mouvement, T6b et T6c, décision 26) : CA-20 à CA-24 sur de vraies suppressions, ajouts et déplacements ; cartes à 360 px, lignes à 1 280 px. */
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
  const report = (expectedKeys) => page.evaluate(() => window.__qa.listReport());
  const near1 = (a, b) => Math.abs(a - b) <= 1.5;
  const translateY = (t) => parseFloat(t?.match(/translateY\((-?[\d.]+)px\)/)?.[1] ?? 'NaN');

  const analyse = (r, label, { expectKept, expectRemoved, expectAdded, strict = false, blockStart = false }) => {
    const moved = r.kept.filter((k) => Math.abs(k.from - k.to) >= 0.5);
    const waapi = r.anims.filter((a) => a.kind === 'waapi');
    check(r.kept.length === expectKept && r.kept.every((k) => k.same), `CA-20 ${tag} ${label} lignes conservées : même élément DOM (${r.kept.length})`, `conservées=${r.kept.length} attendu ${expectKept}, éléments identiques=${r.kept.filter((k) => k.same).length}`);
    check(r.cascades === 0 && !r.anims.some((a) => a.kind === 'transition' && a.delay > 0), `CA-20 ${tag} ${label} aucune cascade rejouée`, `insertions de cartes lcReveal=${r.cascades}, transitions à délai=${r.anims.filter((a) => a.kind === 'transition' && a.delay > 0).length}`);
    if (reduced) {
      check(r.anims.length === 0, `CA-23 ${tag} ${label} aucune animation de ligne en réduction`, `animations=${JSON.stringify(r.anims.map((a) => [a.key, a.kind, a.props.join('+')]))}`);
      check(r.removed.length === expectRemoved && r.removed.every((x) => x.gone) && r.added.length === expectAdded, `CA-23 ${tag} ${label} retraits immédiats, ajouts présents`, `retirées=${r.removed.length} disparues=${r.removed.filter((x) => x.gone).length}, ajoutées=${r.added.length}`);
      return;
    }
    // Dernière animation de transform de chaque ligne : elle part de la position visible à cet instant (continuité si une première glissade, due au décalage de la barre de filtres, est en cours) et finit à la place finale.
    const last = (key) => waapi.filter((a) => a.key === key && a.props.includes('transform')).at(-1);
    const bad = moved.filter((k) => {
      const a = last(k.key);
      if (!a && blockStart) return false; // le bloc porte tout le déplacement de cette ligne : départ vérifié plus bas
      if (!a || !(a.last.transform === 'none' && near(a.duration, r.move) && a.delay === 0 && sameEase(a.easing, r.moveEase))) return true;
      if (blockStart) return false; // départ vérifié plus bas (bloc + ligne)
      const start = k.to + translateY(a.first.transform);
      // Marge : 10 % du trajet (une glissade due au décalage de la barre de filtres peut dépasser de quelques pixels).
      const slack = Math.max(1.5, 0.1 * Math.abs(k.from - k.to));
      const inside = start >= Math.min(k.from, k.to) - slack && start <= Math.max(k.from, k.to) + slack;
      return !inside || (strict && !near1(translateY(a.first.transform), k.from - k.to));
    });
    check(moved.length > 0 && bad.length === 0, `CA-20 ${tag} ${label} conservées : glissement vers la nouvelle place (${r.move} ms, courbe du token), sans sortir de la zone`, `déplacées=${moved.length}, non conformes=${bad.map((k) => `${k.key} (de ${k.from} à ${k.to}, animations ${JSON.stringify(waapi.filter((a) => a.key === k.key).map((a) => [a.first.transform, a.duration]))})`)}`);
    // Retrait de pastille : le bloc de la liste glisse (une seule animation) et les lignes portent le reste ; ensemble, la position visuelle de départ de chaque ligne conservée est son ancienne place (± 1 px).
    if (blockStart) {
      const blockY = r.block.length ? translateY(r.block[0].first) : 0;
      const off = r.kept.map((k) => { const a = last(k.key); return { key: k.key, d: k.to + blockY + (a ? translateY(a.first.transform) : 0) - k.from }; });
      check(r.block.length <= 1 && off.every((o) => near1(o.d, 0)), `CA-20 ${tag} ${label} bloc + ligne : départ visuel de chaque ligne conservée = ancienne position (± 1 px)`, `animations du bloc=${r.block.length} (départ ${blockY}), écarts=${JSON.stringify(off.filter((o) => !near1(o.d, 0)))}`);
    }
    const still = r.kept.filter((k) => Math.abs(k.from - k.to) < 0.5);
    if (strict) check(still.every((k) => !last(k.key)), `CA-20 ${tag} ${label} pas de glissement pour une ligne qui n'a pas bougé`, `lignes immobiles animées=${still.filter((k) => last(k.key)).map((k) => k.key)}`);
    const moveEase = waapi.find((a) => a.props.includes('transform'));
    check(!!moveEase && sameEase(moveEase.easing, r.moveEase) && near(moveEase.duration, 500), `CA-24 ${tag} ${label} lignes : easing-standard, 500 ms`, `durée=${moveEase?.duration} courbe=${moveEase?.easing?.slice(0, 40)}…`);
    // Ajoutées : fondu à leur place.
    if (expectAdded > 0) {
      const fades = r.added.map((key) => waapi.find((a) => a.key === key && a.props.includes('opacity')));
      check(r.added.length === expectAdded && fades.every((a) => a && a.first.opacity === '0' && a.last.opacity === '1' && near(a.duration, r.enter) && a.delay === 0 && !a.leaving), `CA-21 ${tag} ${label} lignes ajoutées en fondu (${r.enter} ms)`, `ajoutées=${r.added}, fondus=${JSON.stringify(fades.map((a) => a && [a.key, a.first.opacity, a.last.opacity, a.duration]))}`);
      const ascending = r.order.every((k, i) => i === 0 || Number(k.split(' ')[1]) > Number(r.order[i - 1].split(' ')[1]));
      check(ascending, `CA-21 ${tag} ${label} ajoutées à leur place`, `ordre=${r.order}`);
    }
    // Retirées : restent le temps d'un fondu, puis disparaissent, puis les suivantes comblent.
    if (expectRemoved > 0) {
      const fades = r.removed.map((x) => waapi.find((a) => a.key === x.key && a.props.includes('opacity')));
      check(r.removed.length === expectRemoved && fades.every((a) => a && a.leaving && a.connected && a.first.opacity === '1' && a.last.opacity === '0' && near(a.duration, r.exit)) && r.removed.every((x) => x.gone), `CA-22 ${tag} ${label} lignes retirées : dans le DOM pendant un fondu (${r.exit} ms), puis disparues`, `retirées=${r.removed.map((x) => `${x.key}:disparue=${x.gone}`)}, fondus=${JSON.stringify(fades.map((a) => a && [a.key, a.leaving, a.connected, a.first.opacity, a.last.opacity, a.duration]))}`);
      check(moved.every((k) => last(k.key)?.leavingConnected === 0), `CA-22 ${tag} ${label} le comblement (dernier glissement) commence après la disparition des lignes en fondu`, `lignes encore en fondu au début du dernier glissement=${moved.map((k) => last(k.key)?.leavingConnected)}`);
    }
  };

  // 1. Filtre « Beta » : 4 lignes retirées, 10 conservées qui comblent.
  await begin();
  await beta();
  await idle(`window.__qa.rowKeys().length === 10`);
  const beta1 = await report();
  const betaKeys = all.filter((_, i) => i % 4 !== 0);
  check(beta1.order.join() === betaKeys.join(), `CA-20 ${tag} filtre : lignes affichées`, `ordre=${beta1.order}`);
  analyse(beta1, 'filtre', { expectKept: 10, expectRemoved: 4, expectAdded: 0 });

  // 2. Retrait de la pastille (téléphone) ou « Effacer les filtres » (ordinateur) : 4 lignes ajoutées, 10 conservées qui s'écartent.
  await begin();
  if (phone) await page.locator('.lc-data-table__chip-remove').first().click();
  else await page.getByRole('button', { name: 'Effacer les filtres' }).click();
  await idle(`window.__qa.rowKeys().length === 14`);
  analyse(await report(), 'retrait de pastille', { expectKept: 10, expectRemoved: 0, expectAdded: 4, blockStart: true });

  // 3. Tri : toutes les lignes conservées, certaines changent de place.
  await page.evaluate(() => window.__qa.frames(40));
  await begin();
  const order0 = await page.evaluate(() => window.__qa.rowKeys().join());
  if (phone) await page.selectOption('select.lc-data-table__sort-select', 'name:desc');
  else { const head = page.locator('thead button', { hasText: 'Objet' }); await head.click(); await page.evaluate(() => window.__qa.frames(40)); await begin(); await head.click(); }
  await idle(`window.__qa.rowKeys().join() !== ${JSON.stringify(order0)}`);
  const sorted = await report();
  check(sorted.order.join() !== order0, `CA-20 ${tag} tri : l'ordre a changé`, `avant=${order0.slice(0, 40)}… après=${sorted.order.join().slice(0, 40)}…`);
  analyse(sorted, 'tri', { expectKept: 14, expectRemoved: 0, expectAdded: 0, strict: true });
  if (!phone) check(await page.evaluate(() => document.querySelectorAll('tr[lcreveal], tr.lc-reveal').length) === 0, `CA-12 ${tag} pas de cascade sur ordinateur`);
  check(errors.length === 0, `erreurs page ${tag} liste`, errors.join(' ; '));
  await page.close();
}

async function motion(browser, base) {
  let failures = 0;
  const check = (ok, label, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK ' : 'KO '} ${label}${detail ? ` ${detail}` : ''}`);
  };
  const contexts = [['normal', {}], ['reduced', { reducedMotion: 'reduce' }], ['forced', { forcedColors: 'active' }]];
  const sizes = [[1280, 720], [360, 640]];
  const animationIds = await animationStoryIds();
  for (const id of T9C_STORIES) check(animationIds.includes(id), `CA-38 T9c story ${id} dans l'index`);
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
            const list = window.__qa.transitions(el, (a) => a.transitionProperty === 'transform');
            const durations = list.map((a) => a.effect.getComputedTiming().duration);
            list.forEach((a) => a.finish());
            const scale = parseFloat(getComputedStyle(el).getPropertyValue('--lc-button-press-scale'));
            const matrix = new DOMMatrix(getComputedStyle(el).transform);
            const pressMs = window.__qa.tokenMs('--lc-button-press-duration' in getComputedStyle(el) ? '--lc-button-press-duration' : '--lc-sys-duration-fast');
            return { durations, scale, a: matrix.a, d: matrix.d, raw: getComputedStyle(el).transform, pressMs, active: el.matches(':active'), cssDuration: getComputedStyle(el).transitionDuration };
          }, id);
          await page.mouse.up();
          if (id === 'disabled') check(got.raw === 'none' && got.durations.length === 0, `CA-6 ${tag} ${id}`, `transform=${got.raw}, transitions transform=${got.durations.length}`);
          else if (reduced) check(got.active && msList(got.cssDuration).every((ms) => ms <= 0.01) && got.durations.every((ms) => ms <= 0.01), `CA-6/13 ${tag} ${id}`, `durées=${got.cssDuration}, a=${got.a}`);
          else check(got.active && got.durations.length > 0 && got.durations.every((ms) => near(ms, got.pressMs)) && near(got.a, got.scale, 0.001) && near(got.d, got.scale, 0.001), `CA-6 ${tag} ${id}`, `échelle=${got.a.toFixed(3)} attendu ${got.scale}, durées=${got.durations} attendu ${got.pressMs}, actif=${got.active}`);
        }
        check(errors.length === 0, `erreurs page ${tag} buttons`, errors.join(' ; '));
        await page.close();
      }

      // lc-data-table (T6) : téléphone seulement ici ; le menu de filtre est dans la boucle des panneaux.
      if (width === 360 && name !== 'forced') await motionPhone(context, base, reduced, tag, check);
      if (width === 1280 && name === 'normal') {
        const { page } = await motionPage(context, base, 'qa-motion-data-table--table');
        const reveals = await page.locator('tr[lcreveal], tr.lc-reveal').count();
        check(reveals === 0, `CA-12 ${tag} pas de cascade sur ordinateur`, `tr[lcreveal]=${reveals}`);
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
          return { rows, stagger: q.tokenMs('--lc-sys-motion-stagger-normal'), enter: q.tokenMs('--lc-sys-duration-enter'), cap: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lc-sys-motion-stagger-cap')) };
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

/** Stories d'animation attendues par T9c (CA-38, CA-20 : démos d28, d39, d41, d61, d50) : présentes dans l'index de Storybook. */
const T9C_STORIES = ['navigation-menu--animation', 'overlays-toggletip--animation', 'overlays-tooltip--animation', 'forms-date-input--animation'];

/** Stories d'animation, dérivées de l'index de Storybook (CA-38 de 2026-12-mouvement-v2 : plus de liste codée en dur) : toute story `Animation*`, la page Foundations/Motion et les deux pages gardées de 2026-11 (Elevation, Playground de Reveal). */
const ANIMATION_STORY = /--animation|^foundations-(motion|elevation)--|^layout-reveal--playground$/;
async function animationStoryIds() {
  const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
  return Object.values(index.entries).filter((entry) => entry.type === 'story' && ANIMATION_STORY.test(entry.id)).map((entry) => entry.id);
}

/** Toute animation (CSSTransition, CSSAnimation, WAAPI) d'une story d'animation, relevée une image après chaque « Rejouer » (spec 2026-12-mouvement-v2) :
 *  CA-3 (mouvement réduit : durées et délais ≤ 0,01 ms, rien en cours), CA-5 (propriétés animées), CA-31 (aucun défilement horizontal à 360 px à 0, 50 et 100 %). */
const CA5_PROPS = new Set(['opacity', 'transform', 'translate', 'scale', 'rotate', 'strokeDashoffset']);
const CA5_INDICATORS = '.lc-tabs__indicator, .lc-nav-list__indicator, .lc-segmented-control__indicator, .lc-switch__thumb';
const CA5_CONTROLS = 'button[lcbutton], button.lc-button, [lcinput], input, textarea, select';
/** Liste blanche de CA-5 : [propriétés, sélecteur de l'élément animé, préfixe du pseudo-élément animé (absent : l'élément lui-même), 'transition' : transitions seulement]. Tout le reste est un écart. */
const CA5_ALLOW = [
  [['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'], CA5_CONTROLS, undefined, 'transition'], // retour d'état des contrôles (survol, focus, appui)
  [['color'], '.lc-flash'], // lcFlash : l'hôte porte `lc-flash` (contrat fixé par la QA de T5, tools/qa/count-flash-browser.mjs)
  [['gridTemplateRows'], '.lc-disclosure__region, .lc-nav-group__items'],
  [['inlineSize'], '.lc-shell__nav'], // barre latérale de lc-app-shell
  [['clipPath'], CA5_INDICATORS], // pastilles à deux bords
  [['clipPath'], ':root', '::view-transition'],
  [['width', 'height', 'left', 'top', 'insetInlineStart', 'insetBlockStart'], CA5_INDICATORS],
];
// Animations finies en cours : une animation infinie (`.lc-pulse`, spinner, squelette) ne se termine jamais, une animation `fill: forwards` terminée reste dans `getAnimations()` : ni l'une ni l'autre n'est attendue.
const NO_FINITE_ANIMATION = () => !document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending));
/** Attend la fin des animations finies ; une expiration est un échec écrit, pas un silence. */
const finiteIdle = (page, label, check, timeout = 15000) => page.waitForFunction(NO_FINITE_ANIMATION, null, { timeout }).then(() => true, () => { check(false, `${label} animations finies encore en cours après ${timeout} ms`); return false; });
async function motionAnimations(context, base, ids, reduced, width, check) {
  const tag = `${reduced ? 'reduced' : 'normal'} ${width}px`;
  for (const id of ids) {
    if (id.startsWith('foundations-')) continue; // pages de documentation : pas de story d'animation à mesurer
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
    await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 }).catch((error) => errors.push(`rendu : ${error.message.split('\n')[0]}`));
    const buttons = page.getByRole('button', { name: 'Rejouer' });
    const count = await buttons.count();
    for (let n = 0; n < count; n += 1) {
      const label = `${tag} ${id} « Rejouer » n°${n + 1}/${count}`;
      await finiteIdle(page, label, check);
      // Dans le même `evaluate` que le clic : les animations sont relevées à leur première apparition (certains « Rejouer » démarrent après un rendu Angular).
      // Fenêtre de relevé : 900 ms au moins, prolongée tant qu'une nouvelle animation apparaît (600 ms de calme), 4 s au plus (une chaîne de « Rejouer » comme d61 : 300 ms puis 1,4 s).
      // `scrub` (CA-31) : chaque animation est mise en pause à sa première vue, puis amenée à 0, 50 et 100 % ; sinon on ne touche à rien.
      const scrubRun = async (button, { scrub, allow }) => {
        const MIN_MS = 900, QUIET_MS = 600, MAX_MS = 4000;
        const kind = (a) => (a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'animation' : 'waapi');
        const skip = new Set(['offset', 'computedOffset', 'easing', 'composite']);
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        const seen = new Map();
        const row = (a) => {
          const timing = a.effect.getComputedTiming();
          const target = a.effect.target;
          const pseudo = a.effect.pseudoElement ?? '';
          const props = [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !skip.has(k)))];
          const listed = props.filter((p) => allow.some(([names, selector, pseudoPrefix, only]) => names.includes(p) && target.matches(selector) && (pseudoPrefix === undefined ? !pseudo : pseudo.startsWith(pseudoPrefix)) && (only === undefined || only === kind(a))));
          return { kind: kind(a), state: a.playState, pending: a.pending, delay: timing.delay, duration: timing.duration, target: `${target.localName}.${String(target.className?.baseVal ?? target.className).split(' ')[0]}${pseudo}`, props, listed };
        };
        let lastNew = performance.now();
        const collect = () => document.getAnimations().forEach((a) => { if (!seen.has(a)) { seen.set(a, row(a)); lastNew = performance.now(); if (scrub) a.pause(); } });
        button.click();
        const t0 = performance.now();
        await frame();
        await frame();
        const running = document.getAnimations().filter((a) => a.playState === 'running' || a.pending).map(row); // une image après l'action
        for (let now = t0; now - t0 < MAX_MS && (now - t0 < MIN_MS || now - lastNew < QUIET_MS); now = performance.now()) { collect(); await frame(); }
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
        return { rows: [...seen.values()], running, overflow };
      };
      const got = await buttons.nth(n).evaluate(scrubRun, { scrub: false, allow: CA5_ALLOW });
      if (reduced) {
        const bad = got.rows.filter((r) => r.duration > 0.01 || r.delay > 0.01);
        check(bad.length === 0 && got.running.length === 0, `CA-3 ${label} aucune animation en cours après une image, durées et délais ≤ 0,01 ms`, JSON.stringify([...got.running, ...bad].slice(0, 3)));
      } else {
        const bad = got.rows.flatMap((r) => r.props.filter((p) => !CA5_PROPS.has(p) && !r.listed.includes(p)).map((p) => `${r.kind}:${p}@${r.target}`));
        check(bad.length === 0, `CA-5 ${label} propriétés animées (${got.rows.length} animation(s))`, [...new Set(bad)].join(', '));
      }
      if (width === 360 && !reduced) {
        const fresh = await context.newPage(); // page neuve : les animations de la première passe ont été laissées en l'état
        await fresh.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
        await fresh.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 });
        await finiteIdle(fresh, `${label} (page neuve)`, check);
        const scrubbed = await fresh.getByRole('button', { name: 'Rejouer' }).nth(n).evaluate(scrubRun, { scrub: true, allow: CA5_ALLOW });
        await fresh.close();
        check(!scrubbed.overflow.some(Boolean), `CA-31 ${label} aucun défilement horizontal à 0, 50, 100 %`, JSON.stringify(scrubbed.overflow));
      }
    }
    check(errors.length === 0, `erreurs page ${tag} ${id}`, errors.join(' ; '));
    await page.close();
  }
}

/** Stories de mouvement (spec 2026-11-mouvement, T7) : CA-16a (ouverture sans erreur), CA-16b (« Rejouer » relance une animation), CA-16c (bandeau selon `prefers-reduced-motion`). */
const NOTICE = 'Les animations sont réduites par votre système : rien ne bouge dans cette démo.';

async function storiesMotion(browser, base) {
  let failures = 0;
  const check = (label, ok, detail = '') => { console.log(`${ok ? 'OK  ' : 'KO  '} ${label}${ok ? '' : ` ${detail}`}`); if (!ok) failures++; };
  const poll = (page, fn, arg, timeout = 8000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true, () => false);
  for (const id of await animationStoryIds()) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const wide = id.endsWith('desktop') || !id.startsWith('data-');
      const context = await browser.newContext({ viewport: { width: wide ? 1280 : 360, height: 800 }, reducedMotion });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => message.type() === 'error' && errors.push(`console: ${message.text()}`));
      await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
      await page.waitForSelector('#storybook-root > *, #storybook-docs', { timeout: 20000 }).catch((error) => errors.push(`rendu : ${error.message.split('\n')[0]}`));
      await page.waitForTimeout(400);
      const tag = `${id} [${reducedMotion}]`;
      const notice = await page.locator(`text=${NOTICE}`).count();
      // CA-16c : le bandeau accompagne la page Motion et les stories `Animation` (spec 5.4) ; ni Elevation ni le Playground de Reveal n'en ont
      if (id.includes('motion') || id.includes('--animation')) check(`CA-16c ${tag} bandeau ${reducedMotion === 'reduce' ? 'présent' : 'absent'}`, notice === (reducedMotion === 'reduce' ? 1 : 0), `(${notice})`);
      else console.log(`INFO ${tag} bandeau : ${notice}`);
      if (reducedMotion === 'no-preference') {
        const buttons = page.getByRole('button', { name: 'Rejouer' });
        const count = await buttons.count();
        console.log(`INFO ${id} : ${count} bouton(s) « Rejouer »`);
        for (let n = 0; n < count; n++) {
          await poll(page, () => document.getAnimations().length === 0, null, 12000); // l'animation d'entrée est finie : le clic seul peut relancer
          const before = await page.evaluate(() => document.getAnimations().length);
          await buttons.nth(n).click();
          const started = await poll(page, () => document.getAnimations().length > 0, null);
          check(`CA-16b ${id} « Rejouer » n°${n + 1}/${count} relance une animation (avant : ${before})`, started);
        }
      }
      check(`CA-16a ${tag} sans erreur de page ni de console`, errors.length === 0, errors.join(' | '));
      await context.close();
    }
  }
  return failures;
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
        const [o0, o1] = [...document.querySelectorAll('[role=radio]')].map(r);
        const ind = document.querySelector('.lc-segmented-control__indicator');
        return { progress: parseFloat(document.querySelector('lc-swipe-panels').style.getPropertyValue('--lc-swipe-panels-progress')), o0, o1, ind: r(ind), anims: ind.getAnimations().length };
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
        const [t0, t1] = [...document.querySelectorAll('[role=tab]')].map(r);
        const ind = document.querySelector('.lc-tabs__indicator');
        return { t0, t1, ind: r(ind), anims: ind.getAnimations().length };
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

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let failures = 0;
try {
  const [mode, ...fragments] = process.argv.slice(2);
  if (mode === 'axe') {
    const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
    const wanted = fragments.length > 0 ? fragments : NEW_STORY_FRAGMENTS;
    const entries = Object.entries(index.entries).filter(([id, entry]) => entry.type === 'story' && wanted.some((fragment) => id.includes(fragment))).map(([id, entry]) => [id, entry.title]);
    console.log(`${entries.length} stories × 2 thèmes`);
    failures = await axeRun(browser, base, entries);
  } else if (mode === 'dom') {
    failures = await dom(browser, base);
  } else if (mode === 'filter-date') {
    failures = await filterDate(browser, base);
  } else if (mode === 'treegrid') {
    failures = await treegrid(browser, base);
  } else if (mode === 'motion') {
    failures = await motion(browser, base);
  } else if (mode === 'stories-motion') {
    failures = await storiesMotion(browser, base);
  } else if (mode === 'swipe') {
    failures = await swipe(browser, base);
  } else if (mode === 'perf') {
    failures = await perf(browser, base);
  } else {
    console.error('Usage : storybook-browser.mjs axe [fragments] | perf | motion | swipe | stories-motion | dom | treegrid | filter-date');
    failures = 1;
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failures > 0 ? 1 : 0);
