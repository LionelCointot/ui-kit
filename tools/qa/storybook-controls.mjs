// CA-4 de la spec vitrine : dans chaque story « Playground », chaque contrôle doit changer le rendu.
// Usage : npm run build-storybook:public && node tools/qa/storybook-controls.mjs [fragment-d-id ...]
// Pour chaque contrôle simple (booléen, liste, texte, nombre), la valeur est changée via le canal Storybook
// (comme le panneau Controls) et le HTML de l'aperçu est comparé. Code de sortie 1 si un contrôle n'a aucun effet.
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
      response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Valeur différente de la valeur courante pour un contrôle simple, ou undefined si le contrôle n'est pas testable. */
function otherValue(argType, current) {
  const type = argType.control?.type ?? (typeof argType.control === 'string' ? argType.control : undefined);
  if (argType.control === false || argType.action) return undefined;
  if (type === 'boolean') return !current;
  if (['select', 'radio', 'inline-radio', 'check', 'inline-check', 'multi-select'].includes(type)) {
    const options = argType.options ?? [];
    return options.find((option) => option !== current && option !== undefined && option !== null);
  }
  if (type === 'text') return `${current ?? ''} modifié`;
  if (type === 'number' || type === 'range') return typeof current === 'number' ? current + (argType.control?.step ?? 1) * 3 : 3;
  if (type === 'color') return '#ff00aa';
  return undefined;
}

const filters = process.argv.slice(2);
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
const ids = Object.values(index.entries)
  .filter((entry) => entry.type === 'story' && entry.id.endsWith('--playground'))
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

for (const id of ids) {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForFunction(() => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'completed', null, { timeout: 15000 }).catch(() => {});
  const story = await page.evaluate(async (storyId) => {
    const preview = window.__STORYBOOK_PREVIEW__;
    const loaded = await preview.storyStoreValue.loadStory({ storyId });
    const context = preview.storyStoreValue.getStoryContext(loaded);
    const controls = Object.entries(loaded.argTypes)
      .filter(([, argType]) => !argType.table?.disable && argType.control !== false)
      .map(([name, argType]) => ({ name, argType: JSON.parse(JSON.stringify({ control: argType.control, options: argType.options, action: argType.action })) }));
    return { args: JSON.parse(JSON.stringify(context.args, (key, value) => (typeof value === 'function' ? undefined : value))), controls };
  }, id);

  const dead = [];
  let tested = 0;
  for (const { name, argType } of story.controls) {
    const next = otherValue(argType, story.args[name]);
    if (next === undefined) continue;
    tested += 1;
    const before = await rendered();
    await page.evaluate(({ storyId, name, next }) => {
      window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateStoryArgs', { storyId, updatedArgs: { [name]: next } });
    }, { storyId: id, name, next });
    await page.waitForTimeout(300);
    const after = await rendered();
    if (after === before) dead.push(`${name} → ${JSON.stringify(next)}`);
    await page.evaluate(({ storyId, name }) => {
      window.__STORYBOOK_ADDONS_CHANNEL__.emit('resetStoryArgs', { storyId, argNames: [name] });
    }, { storyId: id, name });
    await page.waitForTimeout(150);
  }
  const status = dead.length ? 'ÉCHEC' : 'OK';
  console.log(`${status.padEnd(5)} ${id} (${tested} contrôles)${dead.length ? ` sans effet : ${dead.join(', ')}` : ''}`);
  if (dead.length) failures.push(id);
}

await browser.close();
server.close();
console.log(`\n${ids.length} Playground, ${failures.length} en échec`);
process.exit(failures.length ? 1 : 0);
