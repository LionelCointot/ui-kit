// Lanceur des vérifications du kit : `npm run qa` (tout) · `-- --failed` (les KO du dernier passage) · `-- --changed` (d'après `git diff` depuis le merge-base avec origin/main) · `-- --only a,b` · `--logs <dossier>` · `--rebuild` · `--no-build` · `--ca31-page-neuve`.
// Détails et noms des suites : tools/qa/README.md. Dernier résultat : .qa-last.json (KO par suite et par id).
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { staticServer } from './static-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const qa = (file, ...args) => ['node', `tools/qa/${file}`, ...args];
const CONF = ['package.json', 'package-lock.json', 'angular.json', '**/tsconfig*.json']; // un changement ici change le build de Storybook
const KIT = ['packages/**', '.storybook/**', 'docs/storybook/**', ...CONF, 'tools/qa/static-server.mjs', 'tools/qa/wait.mjs']; // ce qui peut changer une story
const STORIES = ['.storybook/**', '**/*.stories.ts', ...CONF];
const first = (re) => (line) => line.match(re)?.[1] ?? null;
const STORY_ID = '([a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9-]+)(?=\\s|$)';
const BLOCKS = [[/CA-40|couche/, 'layers'], [/grilles/, 'grids'], [/CA-25/, 'toast'], [/tabbar/, 'tabbar'], [/CA-36/, 'ca36'], [/^KO\s+d05/, 'topbar'], [/démo/, 'demo']];
const axeId = first(/^KO\s+(?:default|dark)\s+(\S+)/);
const browser = (nom, cmd, surveille, more = {}) => ({ nom, groupe: 'nav', cmd, surveille, ...more });
export const suites = [
  browser('motion', qa('storybook-browser.mjs', 'motion'), [...KIT, 'tools/qa/storybook-browser.mjs', 'docs/design/**'], { filtrable: true, id: first(new RegExp(`^KO\\s+CA-(?:3|5|16[abc]|31)\\b.*?\\b(?:normal|reduced) \\d+px ${STORY_ID}`)) }),
  browser('axe', qa('storybook-browser.mjs', 'axe'), [...KIT, 'tools/qa/storybook-browser.mjs'], { filtrable: true, id: axeId }),
  browser('axe-autres', qa('storybook-browser.mjs', 'axe', '--hors-mouvement'), [...KIT, 'tools/qa/storybook-browser.mjs'], { filtrable: true, id: axeId }),
  browser('fidelite', qa('motion-fidelity.mjs'), [...KIT, 'tools/qa/motion-fidelity.mjs', 'docs/design/**'], { groupe: 'seul', filtrable: true, id: first(/^KO\s.*?\b(d\d\d)\b/) }), // seule : pool de 3 pages, mesures de durée
  browser('motion-final', qa('motion-final-browser.mjs'), [...KIT, 'tools/qa/motion-final-browser.mjs'], { filtrable: true, id: (line) => BLOCKS.find(([re]) => re.test(line))?.[1] ?? null }),
  browser('ios-motion', qa('ios-motion-browser.mjs'), [...KIT, 'tools/qa/ios-motion-browser.mjs']),
  browser('thread', qa('message-thread-browser.mjs'), ['packages/angular/feedback/src/message-thread/**', 'packages/angular/styles/**', 'packages/tokens/**', '.storybook/**', ...CONF, 'tools/qa/message-thread-browser.mjs']),
  browser('composer', qa('message-composer-browser.mjs', 'all'), ['packages/angular/forms/src/message-composer/**', 'packages/angular/styles/**', 'packages/tokens/**', '.storybook/**', ...CONF, 'tools/qa/message-composer-browser.mjs', 'tools/qa/wait.mjs']),
  browser('page-transitions', qa('page-transitions-browser.mjs'), ['packages/angular/layout/**', 'packages/angular/styles/**', 'packages/tokens/**', ...CONF, 'tools/qa/page-transitions/**', 'tools/qa/page-transitions-browser.mjs']),
  ...['indicators', 'reveal', 'fill-draw', 'count-flash', 'split-text', 'flip', 'theme-toggle', 'overlays-motion', 'motion-runtime', 'relief'].map((n) => browser(n, qa(`${n}-browser.mjs`), [...KIT, `tools/qa/${n}-browser.mjs`])),
  ...['dom', 'treegrid', 'filter-date', 'swipe'].map((n) => browser(n, qa('storybook-browser.mjs', n), [...KIT, 'tools/qa/storybook-browser.mjs'])),
  browser('snippets', qa('storybook-snippets.mjs'), [...STORIES, 'tools/qa/storybook-snippets.mjs']),
  browser('controls', qa('storybook-controls.mjs'), [...STORIES, 'tools/qa/storybook-controls.mjs']),
  browser('perf', qa('storybook-browser.mjs', 'perf'), ['packages/angular/data/**', '.storybook/**', ...CONF, 'tools/qa/storybook-browser.mjs'], { groupe: 'seul' }), // mesure de durée : jamais en parallèle
  { nom: 'unit', groupe: 'leger', cmd: ['npx', 'ng', 'test', 'ui-angular', '--watch=false'], surveille: ['packages/**', ...CONF] },
  { nom: 'statique', groupe: 'leger', cmd: ['node', '--test', ...readdirSync(path.join(root, 'tools', 'qa')).filter((f) => f.endsWith('.test.mjs')).map((f) => `tools/qa/${f}`)], surveille: ['packages/**', 'tools/qa/**'] },
  { nom: 'outils', groupe: 'leger', cmd: ['sh', '-c', 'npm run catalogue:check && npm run catalogue:test && npm run snippets:test && npm test --workspace @lionelcointot/ui-tokens'], surveille: ['packages/**', 'tools/**', '.storybook/**', ...CONF] },
];

export const globToRegExp = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*').replace(/\u0001/g, '(?:.*/)?').replace(/\u0002/g, '.*')}$`);
export const changedSuites = (files) => suites.filter((s) => s.surveille.some((g) => files.some((f) => globToRegExp(g).test(f)))).map((s) => s.nom);

/** Signature des sources de Storybook (chemins et dates, donc les suppressions aussi) : la construction n'est refaite que si elle change. */
const SOURCE_DIRS = ['packages', '.storybook', 'docs/storybook'];
const SOURCE_FILES = ['package.json', 'package-lock.json', 'angular.json', 'tsconfig.json', 'tsconfig.base.json'];
const walk = (dir, out) => { for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) { if (e.name === 'node_modules' || (e.name.startsWith('.') && e.name !== '.storybook') || /\.(spec|test)\.[mc]?[jt]s$/.test(e.name)) continue; const f = path.join(dir, e.name); if (e.isDirectory()) walk(f, out); else out.push(`${path.relative(root, f)}:${statSync(f).mtimeMs}`); } return out; };
export const sourceSignature = () => createHash('sha1').update([...SOURCE_DIRS.flatMap((d) => walk(path.join(root, d), [])), ...SOURCE_FILES.filter((f) => existsSync(path.join(root, f))).map((f) => `${f}:${statSync(path.join(root, f)).mtimeMs}`)].sort().join('\n')).digest('hex');
const run = (cmd, log, env) => new Promise((resolve) => {
  const t0 = Date.now(), out = createWriteStream(log), lines = [];
  const child = spawn(cmd[0], cmd.slice(1), { cwd: root, env });
  let tail = '', done = false;
  const end = (ok) => { if (done) return; done = true; if (/^KO\s/.test(tail)) lines.push(tail); out.end(); resolve({ ok, kos: lines, ms: Date.now() - t0 }); };
  const sink = (chunk) => { out.write(chunk); const parts = (tail + chunk).split('\n'); tail = parts.pop(); lines.push(...parts.filter((l) => /^KO\s/.test(l))); };
  child.stdout.on('data', sink); child.stderr.on('data', sink);
  child.on('error', (e) => { out.write(`KO lancement impossible : ${e.message}\n`); end(false); });
  child.on('close', (code) => end(code === 0));
});
const pool = async (jobs, n) => { const q = [...jobs]; await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { for (let j; (j = q.shift());) await j(); })); };
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
const diffBase = () => { try { return git('merge-base', 'origin/main', 'HEAD').trim(); } catch { return 'main'; } };
/** Lit `.qa-last.json` ; null s'il est absent, illisible ou n'est pas un objet. */
export const readLast = (file) => { try { const v = JSON.parse(readFileSync(file, 'utf8')); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const usage = (msg) => { console.error(`${msg}\nUsage : npm run qa -- [--failed | --changed | --only a,b] [--logs dossier] [--no-build | --rebuild] [--ca31-page-neuve]`); process.exit(2); };
  const value = (name) => { const v = args[args.indexOf(name) + 1]; if (!v || v.startsWith('--')) usage(`${name} demande une valeur`); return v; };
  const logs = path.resolve(args.includes('--logs') ? value('--logs') : path.join(root, '.qa-logs'));
  const lastFile = path.join(root, '.qa-last.json');
  const last = readLast(lastFile);
  let chosen = suites.map((s) => s.nom);
  if (args.includes('--only')) chosen = value('--only').split(',');
  if (args.includes('--changed')) chosen = changedSuites([...git('diff', '--name-only', diffBase()).split('\n'), ...git('ls-files', '--others', '--exclude-standard').split('\n')].filter(Boolean));
  if (args.includes('--failed')) {
    if (!last) { console.error('Rien à relancer : .qa-last.json est absent ou illisible. Lancez npm run qa.'); process.exit(2); }
    chosen = chosen.filter((n) => last[n] && !last[n].ok);
    if (!chosen.length) { console.log('Aucune suite KO ou partielle dans .qa-last.json.'); process.exit(0); }
  }
  const todo = suites.filter((s) => chosen.includes(s.nom));
  const unknown = chosen.filter((n) => !suites.some((s) => s.nom === n));
  if (unknown.length) usage(`suite inconnue : ${unknown.join(', ')}`);
  mkdirSync(logs, { recursive: true });
  const env = { ...process.env };
  let server = null;
  if (todo.some((s) => s.groupe !== 'leger')) {
    const signatureFile = `${dist}.sources`;
    const signature = sourceSignature();
    const stale = args.includes('--rebuild') || !existsSync(path.join(dist, 'index.json')) || !existsSync(signatureFile) || readFileSync(signatureFile, 'utf8') !== signature;
    if (stale && !args.includes('--no-build')) {
      console.log('build-storybook…');
      const r = await run(['npm', 'run', 'build-storybook'], path.join(logs, 'build.log'), env);
      if (!r.ok) { console.error(`KO build-storybook (${logs}/build.log)`); process.exit(1); }
      writeFileSync(signatureFile, signature);
    }
    server = await staticServer(dist);
    env.BASE = server.base; env.STORYBOOK_DIR = dist;
  }
  const results = {};
  const job = (s) => async () => {
    const prev = args.includes('--failed') ? last[s.nom]?.ko : null; // ids KO connus : relance ciblée si la suite sait les filtrer
    const filtered = prev?.length && s.filtrable ? prev : [];
    const cmd = [...(filtered.length ? s.cmd.filter((a) => a !== '--hors-mouvement') : s.cmd), ...filtered, ...(s.nom === 'motion' && args.includes('--ca31-page-neuve') ? ['--ca31-page-neuve'] : [])];
    const r = await run(cmd, path.join(logs, `${s.nom}.log`), env);
    const ids = r.kos.map(s.id ?? (() => null));
    const ko = r.ok ? [] : ids.length && ids.every(Boolean) && s.filtrable ? [...new Set(ids)] : null;
    results[s.nom] = { ok: r.ok && !filtered.length, partiel: r.ok && filtered.length > 0, ko };
    console.log(`${r.ok ? 'OK' : 'KO'} ${s.nom.padEnd(18)} ${(r.ms / 1000).toFixed(0).padStart(4)} s${filtered.length ? ` (relance partielle : ${filtered.join(' ')})` : ''}${r.ok ? '' : ` ${ko ? ko.join(' ') : 'voir le journal'}`}`);
  };
  const by = (g) => todo.filter((s) => s.groupe === g).map(job);
  const t0 = Date.now();
  await Promise.all([pool(by('nav'), 3), pool(by('leger'), 1)]);
  await pool(by('seul'), 1); // fidélité puis perf : rien d'autre en même temps
  server?.close();
  writeFileSync(lastFile, `${JSON.stringify({ ...last, ...results }, null, 1)}\n`);
  const bad = Object.entries(results).filter(([, r]) => !r.ok && !r.partiel).map(([n]) => n);
  const partial = Object.entries(results).filter(([, r]) => r.partiel).map(([n]) => n);
  console.log(`\n${bad.length ? `${bad.length} suite(s) KO : ${bad.join(', ')}` : 'rien de KO'} en ${((Date.now() - t0) / 1000).toFixed(0)} s ; journaux : ${logs}`);
  if (partial.length) console.log(`Relance partielle (${partial.join(', ')}) : lancez npm run qa avant de livrer.`);
  else if (!bad.length && !args.includes('--failed') && !args.includes('--only') && !args.includes('--changed')) console.log('tout est vert');
  process.exit(bad.length ? 1 : 0);
}
