// Vérifications dans un vrai navigateur (Chromium via Playwright) sur le Storybook statique (`npm run build-storybook`) :
//   node tools/qa/storybook-browser.mjs axe [fragment-d-id ...]   axe-core sur chaque story, thèmes clair et sombre
//   node tools/qa/storybook-browser.mjs perf                      temps de rendu des 2 000 lignes de lc-tree-table (CA-K3.5)
//   node tools/qa/storybook-browser.mjs treegrid                  clavier complet de lc-tree-table, focus après re-rendu, tri sur 2 000 lignes
//   node tools/qa/storybook-browser.mjs filter-date               filtre de période de lc-data-table : calendrier dans le menu (CA-P5), panneau 360 px natif (CA-P10b)
//   node tools/qa/storybook-browser.mjs motion                    mouvement (spec 2026-11-mouvement) : appui du bouton, lcReveal, entrée et sortie des panneaux ; contextes normal, réduction, forced-colors, 360 et 1280 px
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
  // Entrée des panneaux CDK : CSSAnimation `lc-overlay-enter` sur le contenu du panneau (premier enfant) ; fondu de sortie : CSSTransition d'opacité sur le conteneur.
  q.starts = 0;
  document.addEventListener('animationstart', (e) => { if (e.animationName === 'lc-overlay-enter') q.starts += 1; }, true);
  const enterAnims = (pane) => (pane.firstElementChild?.getAnimations() ?? []).filter((a) => a instanceof CSSAnimation && a.animationName === 'lc-overlay-enter');
  q.enterAnims = enterAnims;
  const measureEnter = (pane, keepPaused) => {
    const content = pane.firstElementChild;
    const list = enterAnims(pane);
    list.forEach((a) => a.pause());
    list.forEach((a) => { a.currentTime = 0; });
    const cs = getComputedStyle(content);
    const info = { className: pane.className, count: list.length, durations: list.map((a) => a.effect.getComputedTiming().duration), delays: list.map((a) => a.effect.getComputedTiming().delay), startOpacity: cs.opacity, startTransform: cs.transform, cssDuration: cs.animationDuration, cssDelay: cs.animationDelay };
    if (!keepPaused) list.forEach((a) => a.finish());
    const end = getComputedStyle(content);
    Object.assign(info, { endOpacity: end.opacity, endTransform: end.transform });
    return info;
  };
  q.watchPane = (selector, keepEnterPaused = false) => {
    new MutationObserver(() => {
      const pane = document.querySelector(selector);
      if (!pane) return;
      if (!q.pane) {
        q.pane = pane;
        q.classAtAttach = pane.className;
        requestAnimationFrame(() => {
          q.enter = measureEnter(pane, keepEnterPaused);
          q.enterRect = pane.getBoundingClientRect().toJSON();
          q.aboveAtEnter = pane.classList.contains('lc-overlay--above');
          q.startsAtEnter = q.starts;
        });
      } else if (pane.classList.contains('lc-overlay--closing') && !q.closing) {
        const list = transitions(pane);
        q.closing = { connected: pane.isConnected, enterStillRunning: enterAnims(pane).length > 0, props: list.map((a) => [a.transitionProperty, a.effect.getComputedTiming().duration]), transitionDuration: getComputedStyle(pane).transitionDuration, transitionDelay: getComputedStyle(pane).transitionDelay };
        if (q.hold) list.forEach((a) => a.pause());
        if (keepEnterPaused) enterAnims(pane).forEach((a) => a.play());
      } else if (q.enter && !q.closing && !q.flip && pane.classList.contains('lc-overlay--above') !== q.aboveAtEnter) {
        q.flip = { above: pane.classList.contains('lc-overlay--above'), entering: enterAnims(pane).length };
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  };
};

const PANELS = {
  menu: { pane: '.cdk-overlay-pane.lc-menu-overlay', open: '#trigger', host: '#trigger', reopen: 'Enter' },
  combobox: { pane: '.cdk-overlay-pane.lc-combobox-overlay', open: 'lc-combobox input', host: 'lc-combobox', reopen: 'ArrowDown' },
  date: { pane: '.cdk-overlay-pane.lc-calendar-overlay', open: 'lc-date-input button[aria-expanded]', host: 'lc-date-input', reopen: 'Enter' },
  range: { pane: '.cdk-overlay-pane.lc-calendar-overlay', open: 'lc-date-range-input button[aria-expanded]', host: 'lc-date-range-input', reopen: 'Enter' },
};
const msList = (value) => value.split(',').map((v) => v.trim()).map((v) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000));
/** Décalage vertical (m42) d'un `transform` calculé : `none`, `matrix(a,b,c,d,e,f)` ou `matrix3d(…)` (lu à la main : DOMMatrix n'existe pas côté Node). */
const m42 = (value) => (value === 'none' ? 0 : parseFloat(value.slice(value.indexOf('(') + 1, -1).split(',')[value.startsWith('matrix3d') ? 13 : 5]));
const near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;

async function motionPage(context, base, id, args = '') {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${args ? `&args=${args}` : ''}`);
  await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 20000 });
  return { page, errors };
}

async function motion(browser, base) {
  let failures = 0;
  const check = (ok, label, detail = '') => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK ' : 'KO '} ${label}${detail ? ` ${detail}` : ''}`);
  };
  const contexts = [['normal', {}], ['reduced', { reducedMotion: 'reduce' }], ['forced', { forcedColors: 'active' }]];
  const sizes = [[1280, 720], [360, 640]];
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

      // CA-9 : lcReveal.
      {
        const { page, errors } = await motionPage(context, base, 'qa-motion-acceptance--reveal');
        await page.evaluate(() => {
          const q = window.__qa;
          new MutationObserver(() => {
            if (q.reveal || !document.querySelector('li[lcreveal]')) return;
            q.reveal = 'pending';
            requestAnimationFrame(() => {
              const items = [...document.querySelectorAll('li[lcreveal]')];
              const all = items.map((li) => ({ li, list: q.transitions(li) }));
              all.forEach(({ list }) => list.forEach((a) => a.pause()));
              all.forEach(({ list }) => list.forEach((a) => { a.currentTime = 0; }));
              q.reveal = all.map(({ li, list }) => {
                const cs = getComputedStyle(li);
                return { index: li.dataset.index, props: list.map((a) => a.transitionProperty), delays: list.map((a) => a.effect.getComputedTiming().delay), durations: list.map((a) => a.effect.getComputedTiming().duration), startOpacity: cs.opacity, startTransform: cs.transform, cssDelay: cs.transitionDelay, cssDuration: cs.transitionDuration };
              });
              all.forEach(({ list }) => list.forEach((a) => a.finish()));
            });
          }).observe(document.body, { subtree: true, childList: true });
        });
        await page.click('#toggle');
        await page.waitForFunction(() => Array.isArray(window.__qa.reveal));
        const rows = await page.evaluate(() => window.__qa.reveal);
        const staggerMs = await page.evaluate(() => window.__qa.tokenMs('--lc-reveal-stagger'));
        const durationMs = await page.evaluate(() => window.__qa.tokenMs('--lc-reveal-duration'));
        const offset = await page.evaluate(() => window.__qa.tokenPx('--lc-sys-motion-offset'));
        const expected = { 0: 0, 3: 3, 7: 7, 12: 7, '-1': 0, '1.5': 0 };
        for (const row of rows) {
          const rank = expected[row.index];
          if (reduced) {
            check(msList(row.cssDelay).every((ms) => ms <= 0.01) && msList(row.cssDuration).every((ms) => ms <= 0.01), `CA-9/13 ${tag} index ${row.index}`, `délai=${row.cssDelay} durée=${row.cssDuration}`);
            continue;
          }
          const props = [...row.props].sort().join('+');
          const ok = props === 'opacity+transform' && row.delays.every((d) => near(d, rank * staggerMs)) && row.durations.every((d) => near(d, durationMs)) && row.startOpacity === '0' && near(m42(row.startTransform), -offset);
          check(ok, `CA-9 ${tag} index ${row.index}`, `props=${props} délais=${row.delays} attendu ${rank * staggerMs} (${rank}×${staggerMs}), durées=${row.durations} attendu ${durationMs}, départ opacité=${row.startOpacity} transform=${row.startTransform}`);
        }
        check(errors.length === 0, `erreurs page ${tag} reveal`, errors.join(' ; '));
        await page.close();
      }

      // CA-7, CA-8 : panneaux, en haut (descente) puis en bas d'écran (montée).
      for (const [control, spec] of Object.entries(PANELS)) {
        for (const place of ['top', 'bottom']) {
          const above = place === 'bottom';
          const label = `${tag} ${control} ${place}`;
          const { page, errors } = await motionPage(context, base, 'qa-motion-acceptance--panel', `control:${control};place:${place}`);
          await page.evaluate((selector) => window.__qa.watchPane(selector), spec.pane);
          await page.click(spec.open);
          await page.waitForFunction(() => window.__qa.enter !== null);
          const got = await page.evaluate((host) => {
            const q = window.__qa;
            return { enter: q.enter, rect: q.enterRect, classAtAttach: q.classAtAttach, hostRect: document.querySelector(host).getBoundingClientRect().toJSON(), enterMs: q.tokenMs('--lc-overlay-enter-duration'), offset: q.tokenPx('--lc-sys-motion-offset') };
          }, spec.host);
          const e = got.enter;
          if (reduced) {
            check(e.count === 0 || (msList(e.cssDuration).every((ms) => ms <= 0.01) && msList(e.cssDelay).every((ms) => ms <= 0.01)), `CA-7/13 ${label} entrée`, `animation=${e.cssDuration} délai=${e.cssDelay} opacité finale=${e.endOpacity}`);
          } else {
            const sign = above ? 1 : -1;
            const placed = above ? got.rect.bottom <= got.hostRect.top + 1 : got.rect.top >= got.hostRect.bottom - 1;
            const dy = m42(e.startTransform);
            const ok = e.count === 1 && near(e.durations[0], got.enterMs) && e.delays[0] === 0 && e.startOpacity === '0' && e.endOpacity === '1' && near(dy, sign * got.offset, 0.01) && m42(e.endTransform) === 0 && e.className.includes('lc-overlay--above') === above;
            check(ok, `CA-7 ${label} entrée`, `animations lc-overlay-enter=${e.count} durée=${e.durations} attendu ${got.enterMs}, départ opacité=${e.startOpacity} décalageY=${dy} attendu ${sign * got.offset}, fin=${e.endOpacity}/${e.endTransform}, classe à l'attache="${got.classAtAttach}"`);
            // Le calendrier de la période recouvre le champ à 360 px (positions de calendar-overlay.ts antérieures à T3) : information, pas un échec (spec mouvement, section 13).
            if (!placed && control === 'range' && width === 360) console.log(`INFO placement ${label} : le panneau recouvre le champ (limite connue antérieure au mouvement, hors CA-7, spec section 13) ; haut ${Math.round(got.rect.top)}, bas ${Math.round(got.rect.bottom)} ; champ haut ${Math.round(got.hostRect.top)}, bas ${Math.round(got.hostRect.bottom)}`);
            else check(placed, `placement ${label} (précondition de CA-7, hors critère)`, `panneau ${above ? 'au-dessus' : 'au-dessous'} du champ=${placed} (haut ${Math.round(got.rect.top)}, bas ${Math.round(got.rect.bottom)} ; champ haut ${Math.round(got.hostRect.top)}, bas ${Math.round(got.hostRect.bottom)})`);
          }
          // CA-8a et 8c : fermeture au clavier.
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => window.__qa.closing !== null);
          await page.waitForFunction(() => !window.__qa.pane.isConnected, undefined, { timeout: 5000 });
          const closed = await page.evaluate((s) => ({ closing: window.__qa.closing, exitMs: window.__qa.tokenMs('--lc-overlay-exit-duration'), focused: document.activeElement?.matches(s) ?? false, active: document.activeElement?.outerHTML.slice(0, 80) }), spec.open);
          const c = closed.closing;
          if (reduced) check(c.connected && msList(c.transitionDuration).every((ms) => ms <= 0.01) && closed.focused, `CA-8/13 ${label} fermeture`, `durée=${c.transitionDuration} focus déclencheur=${closed.focused}`);
          else check(c.connected && c.props.some(([prop, ms]) => prop === 'opacity' && near(ms, closed.exitMs)) && closed.focused, `CA-8a/8c ${label} fermeture`, `classe posée, présent=${c.connected}, transitions=${JSON.stringify(c.props)} attendu opacity ${closed.exitMs}, retiré du DOM=oui, focus déclencheur=${closed.focused} (${closed.active})`);
          check(errors.length === 0, `erreurs page ${label}`, errors.join(' ; '));
          await page.close();
        }
        if (reduced) continue;

        // CA-8a bis : fermeture pendant l'entrée (animation d'entrée suspendue à 0, relancée à la fermeture) : le fondu d'opacité du conteneur dure quand même `--lc-overlay-exit-duration`.
        {
          const label = `${tag} ${control}`;
          const { page } = await motionPage(context, base, 'qa-motion-acceptance--panel', `control:${control};place:top`);
          await page.evaluate((selector) => window.__qa.watchPane(selector, true), spec.pane);
          await page.click(spec.open);
          await page.waitForFunction(() => window.__qa.enter !== null);
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => window.__qa.closing !== null);
          await page.waitForFunction(() => !window.__qa.pane.isConnected, undefined, { timeout: 5000 });
          const r = await page.evaluate(() => ({ closing: window.__qa.closing, exitMs: window.__qa.tokenMs('--lc-overlay-exit-duration') }));
          check(r.closing.enterStillRunning && r.closing.props.some(([prop, ms]) => prop === 'opacity' && near(ms, r.exitMs)), `CA-8a ${label} fermeture pendant l'entrée`, `entrée en cours=${r.closing.enterStillRunning}, transitions=${JSON.stringify(r.closing.props)} attendu opacity ${r.exitMs}, retiré du DOM=oui`);
          await page.close();
        }

        // CA-8b : réouverture pendant le fondu (fondu suspendu pour ne pas dépendre de l'horloge).
        {
          const label = `${tag} ${control}`;
          const { page } = await motionPage(context, base, 'qa-motion-acceptance--panel', `control:${control};place:top`);
          await page.evaluate((selector) => window.__qa.watchPane(selector), spec.pane);
          await page.click(spec.open);
          await page.waitForFunction(() => window.__qa.enter !== null);
          await page.evaluate(() => { window.__qa.hold = true; });
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => window.__qa.closing !== null);
          // Au clavier : pendant le fondu, le fond transparent du CDK intercepte encore la souris.
          await page.keyboard.press(spec.reopen);
          const got = await page.evaluate(async () => {
            const pane = window.__qa.pane;
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            pane.getAnimations().forEach((a) => { if (a.playState === 'paused') a.play(); });
            await Promise.allSettled(pane.getAnimations().map((a) => a.finished));
            return { connected: pane.isConnected, closingClass: pane.classList.contains('lc-overlay--closing'), opacity: getComputedStyle(pane).opacity };
          });
          check(got.connected && !got.closingClass && got.opacity === '1', `CA-8b ${label} réouverture pendant le fondu`, `présent=${got.connected} classe closing=${got.closingClass} opacité=${got.opacity}`);
          await page.close();
        }
      }

      // CA-7b : retournement après ouverture (vraie bascule : la fenêtre rétrécit, le CDK passe le panneau au-dessus) : aucune nouvelle entrée.
      if (!reduced && width === 1280) {
        for (const [control, spec] of Object.entries(PANELS)) {
          const { page } = await motionPage(context, base, 'qa-motion-acceptance--panel', `control:${control};place:middle`);
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate((selector) => window.__qa.watchPane(selector), spec.pane);
          await page.click(spec.open);
          await page.waitForFunction(() => window.__qa.enter !== null);
          await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); window.__qa.startsAtEnter = window.__qa.starts; });
          await page.setViewportSize({ width, height: 480 });
          const flipped = await page.waitForFunction(() => window.__qa.flip, undefined, { timeout: 3000 }).then((h) => h.jsonValue()).catch(() => null);
          const restarts = flipped === null ? -1 : await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return window.__qa.starts - window.__qa.startsAtEnter; });
          check(flipped !== null && flipped.above && flipped.entering === 0 && restarts === 0, `CA-7b ${tag} ${control} retournement`, flipped === null ? 'le panneau ne s\'est pas retourné (classe lc-overlay--above non posée)' : `au-dessus=${flipped.above}, animations lc-overlay-enter en cours=${flipped.entering}, démarrées depuis l'entrée=${restarts}`);
          await page.close();
        }
      }
      await context.close();
    }
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
  } else if (mode === 'perf') {
    failures = await perf(browser, base);
  } else {
    console.error('Usage : storybook-browser.mjs axe [fragments] | perf | motion | dom | treegrid | filter-date');
    failures = 1;
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failures > 0 ? 1 : 0);
