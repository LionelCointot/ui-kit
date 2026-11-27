// CA-12 et CA-13 de la spec vitrine : le code affiché pour chaque story publique est un composant Angular qui compile tel quel.
// Usage : npm run build-storybook && node tools/qa/storybook-snippets.mjs [fragment-d-id ...]
// 1. Sert dist/storybook en local (aucun accès réseau) et relève, pour chaque story, le code de l'onglet Code
//    (`parameters.docs.source.code` s'il est écrit à la main, sinon l'extrait émis par le décorateur de .storybook/code-snippet-docs.ts).
// 2. CA-12 : dans chaque Playground, change un contrôle (liste ou booléen) et vérifie que le code affiché change.
// 3. CA-13 : écrit chaque extrait dans un dossier temporaire et le compile avec `ngc` (mode strict, gabarits stricts), le kit
//    résolu depuis ses sources comme le fait .storybook/tsconfig.json. Code de sortie 1 au moindre échec.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storybookDir = path.join(root, 'dist', 'storybook');
const workDir = path.join(root, 'node_modules', '.cache', 'storybook-snippets');
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

const filters = process.argv.slice(2);
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const index = JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
const ids = Object.values(index.entries)
  .filter((entry) => entry.type === 'story' && !entry.title.startsWith('QA/')) // la vitrine publique n'a pas les stories de QA : le même contrôle sert sur la construction complète
  .map((entry) => entry.id)
  .filter((id) => filters.length === 0 || filters.some((fragment) => id.includes(fragment)));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
page.on('pageerror', () => {});
await page.goto(`${base}/iframe.html?id=${ids[0]}&viewMode=story`);

/** Code affiché de la story courante : texte écrit à la main, sinon dernier extrait émis pour elle. */
const displayedCode = (id) =>
  page
    .waitForFunction(
      (storyId) => {
        const preview = window.__STORYBOOK_PREVIEW__;
        const render = preview?.currentRender;
        if (render?.id !== storyId || render.phase !== 'finished') return false;
        const authored = preview.storyStoreValue.getStoryContext(render.story).parameters.docs?.source?.code;
        const emitted = window.__STORYBOOK_ADDONS_CHANNEL__.last('storybook/docs/snippet-rendered')?.[0];
        return authored ?? (emitted?.id === storyId ? emitted.source : false);
      },
      id,
      { timeout: 15000 },
    )
    .then((handle) => handle.jsonValue(), () => undefined);

const select = (id) => page.evaluate((storyId) => window.__STORYBOOK_ADDONS_CHANNEL__.emit('setCurrentStory', { storyId, viewMode: 'story' }), id);

const snippets = new Map();
const failures = [];
for (const id of ids) {
  await select(id);
  const code = await displayedCode(id);
  if (code) snippets.set(id, code);
  else failures.push({ id, reason: "aucun code affiché" });
}

// CA-12 : un contrôle modifié change le code affiché.
const ca12 = { checked: 0, failed: [] };
for (const id of ids.filter((storyId) => storyId.endsWith('--playground') && snippets.has(storyId))) {
  await select(id);
  const info = await page.evaluate(async (storyId) => {
    const preview = window.__STORYBOOK_PREVIEW__;
    const context = preview.storyStoreValue.getStoryContext(await preview.storyStoreValue.loadStory({ storyId }));
    const candidates = Object.entries(context.argTypes).flatMap(([name, argType]) => {
      const type = argType.control?.type ?? argType.control;
      if (type === 'boolean' && typeof context.args[name] === 'boolean') return [{ name, value: !context.args[name] }];
      if (['select', 'radio', 'inline-radio'].includes(type) && typeof context.args[name] === 'string') {
        const other = (argType.options ?? []).find((option) => typeof option === 'string' && option !== context.args[name]);
        return other === undefined ? [] : [{ name, value: other }];
      }
      return [];
    });
    return { authored: context.parameters.docs?.source?.code !== undefined, candidates };
  }, id);
  if (info.authored || info.candidates.length === 0) continue;
  const before = snippets.get(id);
  const changedBy = [];
  for (const { name, value } of info.candidates.slice(0, 6)) {
    await page.evaluate(([storyId, args]) => window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateStoryArgs', { storyId, updatedArgs: args }), [id, { [name]: value }]);
    const changed = await page
      .waitForFunction(({ storyId, previous }) => {
        const emitted = window.__STORYBOOK_ADDONS_CHANNEL__.last('storybook/docs/snippet-rendered')?.[0];
        return emitted?.id === storyId && emitted.source !== previous;
      }, { storyId: id, previous: before }, { timeout: 3000 })
      .then(() => true, () => false);
    if (changed) changedBy.push(name);
    await page.evaluate((storyId) => window.__STORYBOOK_ADDONS_CHANNEL__.emit('resetStoryArgs', { storyId }), id);
    await page.waitForTimeout(150);
  }
  ca12.checked += 1;
  if (changedBy.length === 0) ca12.failed.push(id);
}
await browser.close();
server.close();

// CA-13 : compilation de chaque extrait.
await rm(workDir, { recursive: true, force: true });
await mkdir(workDir, { recursive: true });
const files = new Map();
for (const [id, code] of snippets) {
  const file = path.join(workDir, `${id}.ts`);
  await writeFile(file, code);
  files.set(file, id);
}
await writeFile(
  path.join(workDir, 'tsconfig.json'),
  JSON.stringify({
    extends: '../../../tsconfig.json',
    compilerOptions: {
      strict: true,
      noEmit: true,
      types: [],
      moduleResolution: 'bundler',
      paths: {
        '@lionelcointot/ui-angular': ['../../../packages/angular/src/public-api.ts'],
        '@lionelcointot/ui-angular/*': ['../../../packages/angular/*/src/public-api.ts'],
      },
    },
    angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, strictInputAccessModifiers: true },
    files: [...files.keys()].map((file) => path.relative(workDir, file)),
  }),
);
const ngc = path.join(root, 'node_modules', '.bin', 'ngc');
const { stdout, stderr } = await promisify(execFile)(ngc, ['-p', path.join(workDir, 'tsconfig.json')], { cwd: root, maxBuffer: 64 * 1024 * 1024 }).catch((error) => error);
const output = `${stdout ?? ''}${stderr ?? ''}`;
// Une erreur par fichier d'extrait : on garde celles qui le citent (les sources du kit sont compilées avec, mais ne sont pas jugées ici).
const errors = new Map();
const otherErrors = [];
for (const m of output.replace(/\u001b\[[0-9;]*m/g, '').matchAll(/^(?:(\S+?\.ts):(\d+):\d+ - )?error ((?:TS|NG)\d+): (.*)$/gm)) {
  const [, file, line, code, message] = m;
  // Les extraits sont à la racine du dossier de travail (chemin sans « / ») ; une erreur dans les sources du kit a un chemin relatif.
  if (file && !file.includes('/')) {
    const id = file.replace(/\.ts$/, '');
    errors.set(id, [...(errors.get(id) ?? []), `  ligne ${line} ${code} : ${message}`]);
  } else otherErrors.push(`${file ?? ''}${line ? `:${line} ` : ''}${code} : ${message}`);
}
for (const [id, messages] of errors) failures.push({ id, reason: messages.join('\n') });
// Une erreur hors des extraits (configuration, sources du kit) rendrait le verdict sans valeur : elle fait échouer la vérification.
if (otherErrors.length) {
  console.log(`ÉCHEC de la compilation elle-même :\n${otherErrors.slice(0, 5).join('\n')}\n`);
  process.exit(1);
}

const total = ids.length;
const compiled = total - new Set(failures.map((failure) => failure.id)).size;
for (const { id, reason } of failures) console.log(`ÉCHEC ${id}\n${reason}\n`);
console.log(`CA-13 : ${compiled} extraits sur ${total} compilent (${failures.length === 0 ? '100' : Math.round((compiled / total) * 100)} %).`);
console.log(`CA-12 : ${ca12.checked - ca12.failed.length} Playground sur ${ca12.checked} changent de code quand un contrôle change.${ca12.failed.length ? ` Sans effet : ${ca12.failed.join(', ')}.` : ''}`);
process.exit(failures.length === 0 && ca12.failed.length === 0 ? 0 : 1);
