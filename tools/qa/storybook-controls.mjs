// CA-4 de la spec vitrine : dans chaque story « Playground », chaque contrôle doit changer le rendu.
// Usage : npm run build-storybook && node tools/qa/storybook-controls.mjs [fragment-d-id ...]
// Pour chaque contrôle simple (booléen, liste, texte, nombre), la valeur est changée via le canal Storybook
// (comme le panneau Controls) et le HTML de l'aperçu est comparé. Code de sortie 1 si un contrôle n'a aucun effet.
// Un contrôle qui n'agit que dans un état précis (message de liste vide, erreur après interaction…) est déclaré
// par la story : `parameters.controlsCheck.stateDependent: ['emptyMessage', …]` ; il est listé, pas testé.
// Une story qui s'ouvre au clic (dialogue, tiroir, menu) déclare `controlsCheck.openWith: '<sélecteur du bouton>'` :
// chaque valeur est alors chargée par l'URL (`&args=`), le bouton est cliqué, puis le rendu est comparé.
// Aucun accès réseau : serveur local sur dist/storybook.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function serve() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const file = path.join(storybookDir, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''));
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/**
 * Valeurs à essayer pour un contrôle simple (différentes de la valeur courante) ; le contrôle passe si l'une d'elles
 * change le rendu. Liste vide si le contrôle n'est pas testable automatiquement.
 */
function candidates(argType, current) {
  const type = argType.control?.type ?? (typeof argType.control === 'string' ? argType.control : undefined);
  if (argType.control === false || argType.action) return [];
  if (type === 'boolean') return [!current];
  if (['select', 'radio', 'inline-radio', 'check', 'inline-check', 'multi-select'].includes(type)) {
    return (argType.options ?? []).filter((option) => option !== current && option !== undefined).slice(0, 4);
  }
  if (type === 'text') {
    // Longueur CSS (« 280px », « 20rem ») : on change le nombre pour garder une valeur valide.
    const length = /^(\d+(?:\.\d+)?)(px|rem|em|%|ch|vh|vw)$/.exec(String(current ?? ''));
    if (length) return [`${Number(length[1]) * 2}${length[2]}`];
    // Champ vide (valeur calculée par défaut) : peut attendre un texte ou une longueur CSS.
    return current ? [`${current} modifié`] : ['Texte de test', '48px'];
  }
  if (type === 'number' || type === 'range') return [typeof current === 'number' ? current + (argType.control?.step ?? 1) * 3 : 3];
  if (type === 'color') return ['#ff00aa'];
  return [];
}

const filters = process.argv.slice(2);
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
const ids = Object.values(index.entries)
  .filter((entry) => entry.type === 'story' && !entry.title.startsWith('QA/') && entry.id.endsWith('--playground'))
  .map((entry) => entry.id)
  .filter((id) => filters.length === 0 || filters.some((fragment) => id.includes(fragment)));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const failures = [];

const rendered = () =>
  page.evaluate(() => {
    const root = document.querySelector('#storybook-root');
    // Les panneaux CDK (superpositions) sont hors de la racine : on les inclut.
    const overlays = document.querySelector('.cdk-overlay-container');
    return (root?.innerHTML ?? '') + (overlays?.innerHTML ?? '');
  });

/** Valeur transmissible par l'URL de Storybook (caractères limités) : un texte devient « Texte de test ». */
const urlSafe = (value) => (typeof value === 'string' && !/^[\w -]*$/.test(value) ? 'Texte de test' : value);
const urlArg = (value) => (typeof value === 'boolean' ? `!${value}` : String(value));

/** Rendu d'une story qui s'ouvre au clic : page rechargée avec ces args, bouton cliqué, superpositions comprises. */
async function openedRender(id, selector, args) {
  const encoded = Object.entries(args).map(([key, value]) => `${key}:${urlArg(value)}`).join(';');
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${encoded ? `&args=${encodeURIComponent(encoded)}` : ''}`);
  await page.waitForFunction(() => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished', null, { timeout: 15000 });
  await page.locator(`#storybook-root ${selector}`).first().click();
  await page.waitForTimeout(500);
  return rendered();
}

for (const id of ids) {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  const ready = await page
    .waitForFunction(() => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished', null, { timeout: 15000 })
    .then(() => true, () => false);
  if (!ready) {
    console.log(`ÉCHEC ${id} : la story ne s'affiche pas`);
    failures.push(id);
    continue;
  }
  const story = await page.evaluate(async (storyId) => {
    const preview = window.__STORYBOOK_PREVIEW__;
    const loaded = await preview.storyStoreValue.loadStory({ storyId });
    const context = preview.storyStoreValue.getStoryContext(loaded);
    // Le panneau Controls montre les argTypes déclarés et, pour les args sans argType, un contrôle déduit de la valeur.
    const inferred = (value) => ({ boolean: 'boolean', string: 'text', number: 'number' })[typeof value];
    const names = new Set([...Object.keys(loaded.argTypes), ...Object.keys(context.args)]);
    const controls = [...names]
      .map((name) => {
        const argType = loaded.argTypes[name] ?? {};
        const control = argType.control ?? (inferred(context.args[name]) ? { type: inferred(context.args[name]) } : undefined);
        return { name, argType: JSON.parse(JSON.stringify({ control, options: argType.options, action: argType.action, disabled: !!argType.table?.disable })) };
      })
      .filter(({ argType }) => !argType.disabled && argType.control !== false && argType.control !== undefined);
    const stateDependent = loaded.parameters.controlsCheck?.stateDependent ?? [];
    const openWith = loaded.parameters.controlsCheck?.openWith ?? null;
    return { stateDependent, openWith, args: JSON.parse(JSON.stringify(context.args, (key, value) => (typeof value === 'function' ? undefined : value))), controls };
  }, id);

  const dead = [];
  let tested = 0;
  for (const { name, argType } of story.controls) {
    if (story.stateDependent.includes(name)) continue;
    const values = candidates(argType, story.args[name]);
    if (values.length === 0) continue;
    tested += 1;
    let changed = false;
    for (const next of story.openWith ? values.map(urlSafe) : values) {
      if (story.openWith) {
        changed = (await openedRender(id, story.openWith, {})) !== (await openedRender(id, story.openWith, { [name]: next }));
        if (changed) break;
        continue;
      }
      const before = await rendered();
      await page.evaluate(({ storyId, name, next }) => {
        window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateStoryArgs', { storyId, updatedArgs: { [name]: next } });
      }, { storyId: id, name, next });
      await page.waitForTimeout(300);
      changed = (await rendered()) !== before;
      await page.evaluate(({ storyId, name }) => {
        window.__STORYBOOK_ADDONS_CHANNEL__.emit('resetStoryArgs', { storyId, argNames: [name] });
      }, { storyId: id, name });
      await page.waitForTimeout(150);
      if (changed) break;
    }
    if (!changed) dead.push(`${name} (${values.map((value) => JSON.stringify(value)).join(', ')})`);
  }
  const status = dead.length ? 'ÉCHEC' : 'OK';
  const skipped = story.stateDependent.length ? ` ; selon l'état : ${story.stateDependent.join(', ')}` : '';
  console.log(`${status.padEnd(5)} ${id} (${tested} contrôles${skipped})${dead.length ? ` sans effet : ${dead.join(', ')}` : ''}`);
  if (dead.length) failures.push(id);
}

await browser.close();
server.close();
console.log(`\n${ids.length} Playground, ${failures.length} en échec`);
process.exit(failures.length ? 1 : 0);
