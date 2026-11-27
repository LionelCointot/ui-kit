// Lanceur des vérifications du kit : `npm run qa` (tout) · `-- --failed` (les KO du dernier passage) · `-- --changed` (d'après `git diff main`) · `-- --only a,b` · `--logs <dossier>` (défaut .qa-logs).
// Détails et noms des suites : tools/qa/README.md. Dernier résultat : .qa-last.json (KO par suite et par id).
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { staticServer } from './static-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const qa = (file, ...args) => ['node', `tools/qa/${file}`, ...args];
const SB = ['packages/**', '.storybook/**', 'docs/storybook/**', 'tools/qa/static-server.mjs', 'tools/qa/wait.mjs']; // ce qui peut changer une story
const nav = (nom, cmd, own = [], extra = ['packages/**'], more = {}) => ({ nom, groupe: 'nav', cmd, surveille: [...(extra[0] === 'packages/**' ? SB : extra.concat(SB.slice(1))), ...own], ...more });
const first = (re) => (line) => line.match(re)?.[1] ?? null;
const BLOCKS = [[/CA-40|couche/, 'layers'], [/grilles/, 'grids'], [/CA-25/, 'toast'], [/tabbar/, 'tabbar'], [/CA-36/, 'ca36'], [/^KO\s+d05/, 'topbar'], [/démo/, 'demo']];
export const suites = [
  nav('motion', qa('storybook-browser.mjs', 'motion'), ['tools/qa/storybook-browser.mjs', 'docs/design/**'], undefined, { id: first(/^KO\s+CA-(?:3|5|16[abc]|31)\b.* (\S+--[a-z0-9-]+)/), avec: (ids) => ids }),
  nav('axe', qa('storybook-browser.mjs', 'axe'), ['tools/qa/storybook-browser.mjs'], undefined, { id: first(/^KO\s+(?:default|dark)\s+(\S+)/), avec: (ids) => ids }),
  nav('axe-autres', qa('storybook-browser.mjs', 'axe', '--hors-mouvement'), ['tools/qa/storybook-browser.mjs'], undefined, { id: first(/^KO\s+(?:default|dark)\s+(\S+)/), avec: (ids) => ids }),
  nav('fidelite', qa('motion-fidelity.mjs'), ['tools/qa/motion-fidelity.mjs', 'docs/design/**'], undefined, { id: first(/^KO\s.*?\b(d\d\d)\b/), avec: (ids) => ids }),
  nav('motion-final', qa('motion-final-browser.mjs'), ['tools/qa/motion-final-browser.mjs'], undefined, { id: (line) => (/^KO/.test(line) ? BLOCKS.find(([re]) => re.test(line))?.[1] ?? null : null), avec: (ids) => ids }),
  nav('ios-motion', qa('ios-motion-browser.mjs'), ['tools/qa/ios-motion-browser.mjs']),
  nav('thread', qa('message-thread-browser.mjs'), ['tools/qa/message-thread-browser.mjs'], ['packages/angular/feedback/src/message-thread/**', 'packages/angular/styles/**', 'packages/tokens/**', '.storybook/**']),
  nav('composer', qa('message-composer-browser.mjs', 'all'), ['tools/qa/message-composer-browser.mjs'], ['packages/angular/forms/src/message-composer/**', 'packages/angular/styles/**', 'packages/tokens/**', '.storybook/**']),
  nav('page-transitions', qa('page-transitions-browser.mjs'), ['tools/qa/page-transitions/**', 'tools/qa/page-transitions-browser.mjs'], ['packages/angular/layout/**', 'packages/angular/styles/**', 'packages/tokens/**']),
  ...['indicators', 'reveal', 'fill-draw', 'count-flash', 'split-text', 'flip', 'theme-toggle', 'overlays-motion', 'motion-runtime'].map((n) => nav(n, qa(`${n}-browser.mjs`), [`tools/qa/${n}-browser.mjs`])),
  ...['dom', 'treegrid', 'filter-date', 'swipe'].map((n) => nav(n, qa('storybook-browser.mjs', n), ['tools/qa/storybook-browser.mjs'])),
  nav('snippets', qa('storybook-snippets.mjs'), ['tools/qa/storybook-snippets.mjs', '.storybook/**', '**/*.stories.ts'], ['.storybook/**', '**/*.stories.ts']),
  nav('controls', qa('storybook-controls.mjs'), ['tools/qa/storybook-controls.mjs', '.storybook/**', '**/*.stories.ts'], ['.storybook/**', '**/*.stories.ts']),
  nav('perf', qa('storybook-browser.mjs', 'perf'), ['packages/angular/data/**'], ['packages/angular/data/**', '.storybook/**'], { groupe: 'seul' }), // mesure de durée : jamais en parallèle
  { nom: 'unit', groupe: 'leger', cmd: ['npx', 'ng', 'test', 'ui-angular', '--watch=false'], surveille: ['packages/**'] },
  { nom: 'statique', groupe: 'leger', cmd: ['node', '--test', ...readdirSync(path.join(root, 'tools', 'qa')).filter((f) => f.endsWith('.test.mjs')).map((f) => `tools/qa/${f}`)], surveille: ['packages/**', 'tools/qa/**'] },
  { nom: 'outils', groupe: 'leger', cmd: ['sh', '-c', 'npm run catalogue:check && npm run catalogue:test && npm run snippets:test && npm test --workspace @lionelcointot/ui-tokens'], surveille: ['packages/**', 'tools/**', '.storybook/**'] },
];

export const globToRegExp = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*').replace(/\u0001/g, '(?:.*/)?').replace(/\u0002/g, '.*')}$`);
export const changedSuites = (files) => suites.filter((s) => s.surveille.some((g) => files.some((f) => globToRegExp(g).test(f)))).map((s) => s.nom);

const newest = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).reduce((m, e) => (e.name === 'node_modules' || e.name.startsWith('.') && e.name !== '.storybook' ? m : Math.max(m, e.isDirectory() ? newest(path.join(dir, e.name)) : statSync(path.join(dir, e.name)).mtimeMs)), 0) : 0);
const run = (cmd, log, env) => new Promise((resolve) => {
  const t0 = Date.now(), out = createWriteStream(log), lines = [];
  const child = spawn(cmd[0], cmd.slice(1), { cwd: root, env });
  let tail = '';
  const sink = (chunk) => { out.write(chunk); const parts = (tail + chunk).split('\n'); tail = parts.pop(); lines.push(...parts.filter((l) => /^KO\s/.test(l))); };
  child.stdout.on('data', sink); child.stderr.on('data', sink);
  child.on('close', (code) => { if (/^KO\s/.test(tail)) lines.push(tail); out.end(); resolve({ ok: code === 0, kos: lines, ms: Date.now() - t0 }); });
});
const pool = async (jobs, n) => { const q = [...jobs]; await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { for (let j; (j = q.shift());) await j(); })); };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (name) => args[args.indexOf(name) + 1];
  const logs = path.resolve(args.includes('--logs') ? opt('--logs') : path.join(root, '.qa-logs'));
  const lastFile = path.join(root, '.qa-last.json');
  const last = existsSync(lastFile) ? JSON.parse(readFileSync(lastFile, 'utf8')) : {};
  let chosen = suites.map((s) => s.nom);
  if (args.includes('--only')) chosen = opt('--only').split(',');
  if (args.includes('--changed')) chosen = changedSuites([...execFileSync('git', ['diff', '--name-only', 'main'], { cwd: root, encoding: 'utf8' }).split('\n'), ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n')].filter(Boolean));
  if (args.includes('--failed')) chosen = chosen.filter((n) => last[n] && !last[n].ok);
  const todo = suites.filter((s) => chosen.includes(s.nom));
  const unknown = chosen.filter((n) => !suites.some((s) => s.nom === n));
  if (unknown.length) { console.error(`suite inconnue : ${unknown.join(', ')}`); process.exit(2); }
  mkdirSync(logs, { recursive: true });
  const env = { ...process.env };
  let server = null;
  if (todo.some((s) => s.groupe !== 'leger')) {
    const sources = Math.max(...['packages', '.storybook', 'docs/storybook'].map((d) => newest(path.join(root, d))));
    const index = path.join(dist, 'index.json');
    if (!args.includes('--no-build') && (!existsSync(index) || statSync(index).mtimeMs < sources)) {
      console.log('build-storybook…');
      const r = await run(['npm', 'run', 'build-storybook'], path.join(logs, 'build.log'), env);
      if (!r.ok) { console.error(`KO build-storybook (${logs}/build.log)`); process.exit(1); }
    }
    server = await staticServer(dist);
    env.BASE = server.base; env.STORYBOOK_DIR = dist;
  }
  const results = {};
  const job = (s) => async () => {
    const prev = args.includes('--failed') ? last[s.nom]?.ko : null; // ids KO connus : relance ciblée si la suite sait les filtrer
    const filtered = prev?.length && s.avec ? s.avec(prev) : [];
    const cmd = filtered.length ? [...s.cmd.filter((a) => a !== '--hors-mouvement' || !filtered.length), ...filtered] : s.cmd;
    const r = await run(cmd, path.join(logs, `${s.nom}.log`), env);
    const ids = r.kos.map(s.id ?? (() => null));
    results[s.nom] = { ok: r.ok, ko: r.ok ? [] : ids.length && ids.every(Boolean) && s.avec ? [...new Set(ids)] : null, ms: r.ms, cible: filtered };
    console.log(`${r.ok ? 'OK' : 'KO'} ${s.nom.padEnd(18)} ${(r.ms / 1000).toFixed(0).padStart(4)} s${filtered.length ? ` (relance : ${filtered.join(' ')})` : ''}${r.ok ? '' : ` ${results[s.nom].ko ? results[s.nom].ko.join(' ') : 'voir le journal'}`}`);
  };
  const by = (g) => todo.filter((s) => s.groupe === g).map(job);
  const t0 = Date.now();
  await Promise.all([pool(by('nav'), 3), pool(by('leger'), 1)]);
  await pool(by('seul'), 1);
  server?.close();
  const merged = { ...last, ...Object.fromEntries(Object.entries(results).map(([n, r]) => [n, { ok: r.ok, ko: r.ko }])) };
  writeFileSync(lastFile, `${JSON.stringify(merged, null, 1)}\n`);
  const bad = Object.entries(results).filter(([, r]) => !r.ok).map(([n]) => n);
  console.log(`\n${bad.length ? `${bad.length} suite(s) KO : ${bad.join(', ')}` : 'tout est vert'} en ${((Date.now() - t0) / 1000).toFixed(0)} s ; journaux : ${logs}`);
  process.exit(bad.length ? 1 : 0);
}
