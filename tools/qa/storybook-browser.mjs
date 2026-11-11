// Vérifications dans un vrai navigateur (Chromium via Playwright) sur le Storybook statique (`npm run build-storybook`) :
//   node tools/qa/storybook-browser.mjs axe [fragment-d-id ...]   axe-core sur chaque story, thèmes clair et sombre
//   node tools/qa/storybook-browser.mjs perf                      temps de rendu des 2 000 lignes de lc-tree-table (CA-K3.5)
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

const NEW_STORY_FRAGMENTS = ['indicateur-d-état', 'jauge', 'tableau-hi', 'pagination', 'bloc-de-code', 'groupe-de-navigation', 'barres-par-role', 'aires-par-role', 'actions-bouton--variantes', 'curseur--pourcentage', 'theme-builder'];

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
  const id = 'données-tableau-hiérarchique--troncature-au-dela-de-deux-mille';
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
    const { page, context, errors } = await openStory(browser, base, 'données-pagination--defaut', 'default');
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
    const { page, context } = await openStory(browser, base, 'navigation-groupe-de-navigation--repliable', 'default');
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
    const { page, context } = await openStory(browser, base, 'navigation-groupe-de-navigation--liste-reduite', 'default');
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
    const { page, context } = await openStory(browser, base, 'données-bloc-de-code--numeros-de-ligne', 'default');
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
    const { page, context } = await openStory(browser, base, 'données-tableau-hiérarchique--tous-deplies', 'default');
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
  } else if (mode === 'perf') {
    failures = await perf(browser, base);
  } else {
    console.error('Usage : storybook-browser.mjs axe [fragments] | perf | dom');
    failures = 1;
  }
} finally {
  await browser.close();
  server.close();
}
process.exit(failures > 0 ? 1 : 0);
