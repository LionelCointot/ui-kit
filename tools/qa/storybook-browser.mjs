// Vérifications dans un vrai navigateur (Chromium via Playwright) sur le Storybook statique (`npm run build-storybook`) :
//   node tools/qa/storybook-browser.mjs axe [fragment-d-id ...]   axe-core sur chaque story, thèmes clair et sombre
//   node tools/qa/storybook-browser.mjs perf                      temps de rendu des 2 000 lignes de lc-tree-table (CA-K3.5)
//   node tools/qa/storybook-browser.mjs treegrid                  clavier complet de lc-tree-table, focus après re-rendu, tri sur 2 000 lignes
//   node tools/qa/storybook-browser.mjs filter-date               filtre de période de lc-data-table : calendrier dans le menu (CA-P5), panneau 360 px natif (CA-P10b)
//   node tools/qa/storybook-browser.mjs dom                       comportements qui dépendent du CSS (sélection, repli, tabulation)
// Sortie : un résumé par story ; code de sortie 1 au moindre échec. Aucun accès réseau (serveur local sur dist/storybook).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };

function serve() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const file = path.join(storybookDir, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''));
    try {
      response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const NEW_STORY_FRAGMENTS = ['feedback-status-badge', 'feedback-meter', 'data-tree-table', 'data-paginator', 'data-code-block', 'navigation-nav-group', 'bar-chart--by-role', 'area-chart--by-role', 'buttons-button--variants', 'forms-slider', 'theme-builder'];

async function openStory(browser, base, id, theme) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  await page.waitForSelector('#storybook-root > *, #storybook-docs', { timeout: 20000 });
  await page.waitForTimeout(400);
  return { page, context, errors };
}

async function axeRun(browser, base, entries) {
  let failures = 0;
  for (const [id, title] of entries) {
    for (const theme of ['default', 'dark']) {
      const { page, context, errors } = await openStory(browser, base, id, theme);
      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate(async () => {
        const run = await window.axe.run(document.querySelector('#storybook-root'), { resultTypes: ['violations'] });
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

  // CA-K4.1 : atteindre la dernière page avec « Suivant » (clic réel).
  {
    const { page, context, errors } = await openStory(browser, base, 'data-paginator--playground', 'default');
    const next = page.getByRole('button', { name: 'Suivant' });
    let steps = 0;
    while ((await next.isEnabled()) && steps < 20) {
      await next.click();
      steps += 1;
      await page.waitForTimeout(50);
    }
    const status = (await page.locator('[role=status]').first().textContent())?.trim();
    const match = /Page (\d+) sur (\d+)/.exec(status ?? '');
    check('CA-K4.1 paginateur : « Suivant » mène à la dernière page', !!match && match[1] === match[2], `${status} après ${steps} clics ; erreurs : ${errors.join(' ; ') || 'aucune'}`);
    await context.close();
  }

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

  // CA-K7.3 : numéros de ligne non sélectionnables.
  {
    const { page, context } = await openStory(browser, base, 'data-code-block--line-numbers', 'default');
    const result = await page.evaluate(() => {
      const line = document.querySelector('.lc-code-block__line');
      const style = getComputedStyle(line, '::before');
      const pre = document.querySelector('.lc-code-block__pre');
      const selection = getSelection();
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(pre);
      selection.addRange(range);
      return { userSelect: style.userSelect, content: style.content, selected: selection.toString().slice(0, 60) };
    });
    check('CA-K7.3 numéros de ligne : user-select none sur le contenu généré', result.userSelect === 'none' && /\d|counter/.test(result.content), JSON.stringify(result));
    check('CA-K7.3 sélection du bloc : aucun numéro en tête du texte copié', !/^\s*1\s/.test(result.selected), JSON.stringify(result.selected));
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

  // CA-K1.3 / CA-K5 : forced-colors (bordure visible du badge, remplissage de la jauge en Highlight).
  {
    const context = await browser.newContext({ forcedColors: 'active', viewport: { width: 1100, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${base}/iframe.html?id=retours-d-état-indicateur-d-état--par-role&viewMode=story`);
    await page.waitForSelector('lc-status-badge');
    const borders = await page.locator('lc-status-badge').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).borderTopColor));
    check('CA-K1.3 forced-colors : bordure du badge visible (non transparente)', borders.length === 6 && borders.every((color) => color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'), borders.join(' | '));
    await page.goto(`${base}/iframe.html?id=retours-d-état-jauge--couleurs&viewMode=story`);
    await page.waitForSelector('lc-meter');
    const fills = await page.locator('.lc-meter__fill').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
    check('CA-K5 forced-colors : remplissage de la jauge uniforme (Highlight système)', fills.length >= 5 && new Set(fills).size === 1, fills.join(' | '));
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
    await page.waitForSelector('dialog.lc-data-table__panel[open]');
    await page.locator('dialog.lc-data-table__panel .lc-data-table__section-toggle', { hasText: 'Reçue le' }).click();
    await page.waitForSelector('dialog lc-date-range-input input');
    const types = await page.locator('dialog lc-date-range-input input').evaluateAll((nodes) => nodes.map((n) => n.type));
    check('CA-P10b 360 px, pointeur fin : champs natifs', types.length === 2 && types.every((t) => t === 'date'), JSON.stringify(types));
    check('CA-P10b aucun bouton ni calendrier du kit', await count(page, '.lc-date-range-input__button') === 0 && await count(page, 'lc-calendar-panel') === 0);
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
  } else if (mode === 'perf') {
    failures = await perf(browser, base);
  } else {
    console.error('Usage : storybook-browser.mjs axe [fragments] | perf | dom | treegrid | filter-date');
    failures = 1;
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failures > 0 ? 1 : 0);
