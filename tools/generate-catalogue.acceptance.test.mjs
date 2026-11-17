// Tests d'acceptation CA-1 à CA-4 de docs/specs/2026-11-catalogue-pour-agents.md, sur le dépôt réel.
// CA-5 (dist après `npm run build`) est vérifié par une commande à part. Le calcul de CA-2 est indépendant du script :
// parcours par lignes, récursif, sans les expressions régulières de generate-catalogue.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG = path.join(ROOT, 'packages', 'angular');
const CATALOGUE = path.join(PKG, 'CATALOGUE.md');
const SCRIPT = path.join(ROOT, 'tools', 'generate-catalogue.mjs');
const run = (...args) => execFileSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });

const resolveTs = (dir, from) => {
  const base = path.resolve(dir, from);
  return existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, 'index.ts');
};

/** Noms (ou '*') exportés par une instruction `export ... from './x'`, instruction éventuellement sur plusieurs lignes. */
function reExports(src) {
  const out = [];
  for (const stmt of src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').split(/;\s*\n/)) {
    const s = stmt.replace(/\s+/g, ' ').trim();
    const from = s.match(/from '(\.[^']*)'$/);
    if (!s.startsWith('export ') || !from || s.startsWith('export type')) continue;
    if (s.startsWith('export * from')) out.push({ from: from[1], names: '*' });
    else if (s.startsWith('export {')) {
      const names = s.slice(s.indexOf('{') + 1, s.indexOf('}')).split(',').map((n) => n.trim()).filter((n) => n && !n.startsWith('type '));
      out.push({ from: from[1], names: names.map((n) => n.split(' as ')[0]) });
    }
  }
  return out;
}

/** Classes exportées et décorées d'un fichier : [{ cls, selector }], lecture ligne à ligne. */
function decorated(src) {
  const lines = src.split('\n');
  const res = [];
  for (let i = 0; i < lines.length; i++) {
    const dec = lines[i].match(/^@(Component|Directive|Pipe)\(/);
    if (!dec) continue;
    let j = i;
    let selector;
    for (; j < lines.length && !/^export\s+(abstract\s+)?class\s/.test(lines[j]) && !/^class\s/.test(lines[j]); j++) {
      const key = dec[1] === 'Pipe' ? 'name' : 'selector';
      const m = lines[j].match(new RegExp(`(?:^|[\\s{(])${key}:\\s*['"\`]([^'"\`]*)['"\`]`));
      if (m && selector === undefined) selector = m[1];
    }
    const cls = lines[j]?.match(/^export\s+(?:abstract\s+)?class\s+(\w+)/)?.[1];
    if (cls && selector) res.push({ cls, selector });
  }
  return res;
}

function publicClasses(file, wanted = '*', seen = new Set()) {
  const key = `${file}|${wanted}`;
  if (seen.has(key)) return [];
  seen.add(key);
  const src = readFileSync(file, 'utf8');
  let found = decorated(src).filter((d) => wanted === '*' || wanted.includes(d.cls));
  for (const e of reExports(src)) {
    const target = resolveTs(path.dirname(file), e.from);
    const w = e.names === '*' ? wanted : wanted === '*' ? e.names : e.names.filter((n) => wanted.includes(n));
    found = found.concat(publicClasses(target, w, seen));
  }
  return found;
}

const entryPoints = () => {
  const pkgName = JSON.parse(readFileSync(path.join(PKG, 'package.json'), 'utf8')).name;
  const subs = readdirSync(PKG, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(PKG, e.name, 'ng-package.json')))
    .map((e) => e.name);
  return [
    { name: pkgName, api: path.join(PKG, 'src', 'public-api.ts') },
    ...subs.map((d) => ({ name: `${pkgName}/${d}`, api: path.join(PKG, d, 'src', 'public-api.ts') })),
  ];
};

/** Lignes du catalogue : Map point d'entrée -> Map classe -> cellules. */
function parseCatalogue(md) {
  const byEntry = new Map();
  let cur;
  for (const line of md.split('\n')) {
    const h = line.match(/^## `(.+)`$/);
    if (h) byEntry.set((cur = h[1]), new Map());
    else if (cur && line.startsWith('| `')) {
      const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
      byEntry.get(cur).set(cells[1], { selector: cells[0].slice(1, -1).replace(/\\\|/g, '|'), inputs: cells[3], outputs: cells[4] });
    }
  }
  return byEntry;
}

test('CA-1 : catalogue:build écrit CATALOGUE.md, deux lancements donnent un fichier identique', () => {
  const before = readFileSync(CATALOGUE, 'utf8');
  try {
    run();
    const a = readFileSync(CATALOGUE, 'utf8');
    run();
    const b = readFileSync(CATALOGUE, 'utf8');
    assert.ok(a.length > 0);
    assert.equal(a, b);
    assert.match(a, /^# Catalogue des composants/);
    assert.doesNotMatch(a, /\b20\d\d-\d\d-\d\d\b/, 'pas de date');
  } finally {
    writeFileSync(CATALOGUE, before);
  }
});

test('CA-2 : catalogue = classes exportées décorées, sous le bon point d\'entrée, sélecteur exact', () => {
  const catalogue = parseCatalogue(readFileSync(CATALOGUE, 'utf8'));
  const points = entryPoints();
  assert.deepEqual([...catalogue.keys()].sort(), points.map((p) => p.name).sort());
  let total = 0;
  for (const { name, api } of points) {
    const expected = new Map(publicClasses(api).map((d) => [d.cls, d.selector]));
    total += expected.size;
    const actual = new Map([...catalogue.get(name)].map(([cls, v]) => [cls, v.selector]));
    assert.deepEqual([...actual].sort(), [...expected].sort(), name);
  }
  assert.ok(total > 40, `trop peu de classes trouvées (${total}) : le calcul indépendant est suspect`);
  // Une classe ne figure que sous un seul point d'entrée.
  const all = [...catalogue.values()].flatMap((m) => [...m.keys()]);
  assert.equal(new Set(all).size, all.length);
});

test('CA-3 : entrées et sorties de lc-data-table et button[lcButton] relues dans la source', () => {
  const catalogue = parseCatalogue(readFileSync(CATALOGUE, 'utf8'));
  const members = (file) => {
    const ins = [];
    const outs = [];
    for (const l of readFileSync(path.join(PKG, file), 'utf8').split('\n')) {
      const m = l.match(/^ {2}readonly (\w+) = (input\.required|input|model|output)\b/);
      if (!m) continue;
      if (m[2] === 'output') outs.push(m[1]);
      else ins.push(m[2] === 'input.required' ? `${m[1]} (requis)` : m[2] === 'model' ? `${m[1]} (model)` : m[1]);
    }
    return { ins: ins.join(', ') || '–', outs: outs.join(', ') || '–' };
  };
  const cases = [
    ['@lionelcointot/ui-angular/data', 'LcDataTableComponent', 'data/src/data-table/data-table.component.ts', 'lc-data-table'],
    ['@lionelcointot/ui-angular', 'LcButtonComponent', 'src/lib/button/button.component.ts', 'button[lcButton], a[lcButton]'],
  ];
  for (const [entry, cls, file, selector] of cases) {
    const row = catalogue.get(entry).get(cls);
    const exp = members(file);
    assert.equal(row.selector, selector);
    assert.equal(row.inputs, exp.ins, `${cls} entrées`);
    assert.equal(row.outputs, exp.outs, `${cls} sorties`);
  }
  // Valeurs de la spec : lc-data-table a 4 entrées requises et un model, button aucune sortie.
  assert.match(catalogue.get(cases[0][0]).get('LcDataTableComponent').inputs, /source \(requis\).*query \(model\)/);
  assert.equal(catalogue.get(cases[1][0]).get('LcButtonComponent').outputs, '–');
});

test('CA-4 : catalogue:check réussit à jour, échoue après modification d\'un sélecteur, dépôt restauré', () => {
  const file = path.join(PKG, 'src', 'lib', 'spinner', 'spinner.component.ts');
  const original = readFileSync(file, 'utf8');
  assert.doesNotThrow(() => run('--check'));
  try {
    assert.ok(original.includes("selector: 'lc-spinner'"));
    writeFileSync(file, original.replace("selector: 'lc-spinner'", "selector: 'lc-spinner-x'"));
    assert.throws(() => run('--check'), (e) => e.status === 1 && /catalogue:build/.test(e.stderr));
  } finally {
    writeFileSync(file, original);
  }
  assert.equal(readFileSync(file, 'utf8'), original);
  assert.doesNotThrow(() => run('--check'));
});

test('cas limite : fichier exporté introuvable, le script échoue avec le chemin (copie temporaire)', async () => {
  const { mkdtempSync, mkdirSync, rmSync, cpSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const tmp = mkdtempSync(path.join(tmpdir(), 'cat-acc-'));
  try {
    mkdirSync(path.join(tmp, 'tools'));
    mkdirSync(path.join(tmp, 'packages/angular/src'), { recursive: true });
    cpSync(SCRIPT, path.join(tmp, 'tools/generate-catalogue.mjs'));
    writeFileSync(path.join(tmp, 'packages/angular/package.json'), '{"name":"@x/y","version":"1.0.0"}');
    writeFileSync(path.join(tmp, 'packages/angular/src/public-api.ts'), "export * from './nope';\n");
    assert.throws(
      () => execFileSync(process.execPath, [path.join(tmp, 'tools/generate-catalogue.mjs')], { encoding: 'utf8', stdio: 'pipe' }),
      (e) => e.status !== 0 && /nope\.ts/.test(e.stderr),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// CA-6 et CA-7 : entrées et sorties héritées. Calcul indépendant : index des classes par nom (tout le paquet hors specs et stories),
// corps de classe = de sa ligne `class` à la première ligne `}` en colonne 0, chaîne `extends` remontée à la main.
const tsFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : tsFiles(p);
    return /\.ts$/.test(e.name) && !/\.(spec|stories)\.ts$/.test(e.name) ? [p] : [];
  });
const classIndex = () => {
  const idx = new Map();
  for (const f of tsFiles(PKG)) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      const m = l.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<[^{]*?>)?(?:\s+extends\s+(\w+))?/);
      if (!m) return;
      let end = i + 1;
      while (!l.trimEnd().endsWith('}') && end < lines.length && lines[end] !== '}') end++;
      idx.set(m[1], { parent: m[2], body: lines.slice(i, end + 1) });
    });
  }
  return idx;
};
/** Membres publics input/model/output de la classe et de ses bases : { ins: Set, outs: Set } (un override compte une fois). */
const publicMembers = (idx, cls) => {
  const ins = new Set();
  const outs = new Set();
  for (let c = cls; c; c = idx.get(c)?.parent) {
    for (const l of idx.get(c)?.body ?? []) {
      const m = l.match(/^\s+((?:(?:public|override|readonly|protected|private)\s+)*)(\w+)\s*=\s*(input|model|output)(?:\.required)?\s*[<(]/);
      if (!m || /\b(private|protected)\b/.test(m[1]) || m[2].startsWith('#')) continue;
      (m[3] === 'output' ? outs : ins).add(m[2]);
    }
  }
  return { ins, outs };
};
const cellNames = (cell) => (cell === '–' ? [] : cell.split(/, (?![^(]*\))/).map((s) => s.replace(/ \((requis|model|requis, model)\)$/, '')));
const rowOf = (catalogue, cls) => [...catalogue.values()].map((m) => m.get(cls)).find(Boolean);

test('CA-6 : lc-money-input, lc-region-select, lc-line-chart listent leurs entrées et sorties héritées', () => {
  const catalogue = parseCatalogue(readFileSync(CATALOGUE, 'utf8'));
  const idx = classIndex();
  for (const cls of ['LcMoneyInputComponent', 'LcRegionSelectComponent', 'LcLineChartComponent']) {
    const row = rowOf(catalogue, cls);
    const exp = publicMembers(idx, cls);
    assert.deepEqual(new Set(cellNames(row.inputs)), exp.ins, `${cls} entrées`);
    assert.deepEqual(new Set(cellNames(row.outputs)), exp.outs, `${cls} sorties`);
  }
  // Valeurs de la spec.
  const money = cellNames(rowOf(catalogue, 'LcMoneyInputComponent').inputs);
  for (const n of ['value', 'disabled', 'min', 'max']) assert.ok(money.includes(n), `money-input : ${n}`);
  assert.ok(cellNames(rowOf(catalogue, 'LcRegionSelectComponent').outputs).includes('selectionChange'));
});

test('CA-7 : pour chaque classe du catalogue, nombre d\'entrées et de sorties = déclarations dans sa source et ses bases', () => {
  const catalogue = parseCatalogue(readFileSync(CATALOGUE, 'utf8'));
  const idx = classIndex();
  const gaps = [];
  let n = 0;
  for (const m of catalogue.values())
    for (const [cls, row] of m) {
      n++;
      const exp = publicMembers(idx, cls);
      const got = { ins: cellNames(row.inputs), outs: cellNames(row.outputs) };
      if (got.ins.length !== exp.ins.size) gaps.push(`${cls} entrées : ${got.ins.length} listées, ${exp.ins.size} déclarées, manque ${[...exp.ins].filter((x) => !got.ins.includes(x))}`);
      if (got.outs.length !== exp.outs.size) gaps.push(`${cls} sorties : ${got.outs.length} listées, ${exp.outs.size} déclarées, manque ${[...exp.outs].filter((x) => !got.outs.includes(x))}`);
    }
  assert.ok(n > 40);
  assert.deepEqual(gaps, []);
});
