// Génère packages/angular/CATALOGUE.md : composants, directives et pipes publics du kit, par point d'entrée.
// Lecture des public-api.ts par expressions régulières ; repose sur les conventions du kit (input(), model(),
// output(), sélecteur en chaîne littérale). Usage : node tools/generate-catalogue.mjs [--check]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG_DIR = path.join(ROOT, 'packages', 'angular');
const OUTPUT = path.join(PKG_DIR, 'CATALOGUE.md');
const KINDS = { Component: 'composant', Directive: 'directive', Pipe: 'pipe' };

/** Exports d'un public-api.ts : `{ from, names }` ; `names` vaut null pour `export *`. */
export function parseExports(src) {
  const out = [];
  for (const m of src.matchAll(/^export\s+\*\s+from\s+'([^']+)'/gm)) out.push({ from: m[1], names: null });
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}\s*from\s+'([^']+)'/gm)) {
    const names = m[1]
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n && !n.startsWith('type '))
      .map((n) => n.split(/\s+as\s+/)[0]);
    out.push({ from: m[2], names });
  }
  return out;
}

/** Déclarations `@Component|@Directive|@Pipe` d'une classe exportée, avec sélecteur, entrées et sorties. */
export function extractDeclarations(src) {
  const decls = [];
  const re = /@(Component|Directive|Pipe)\(\{([\s\S]*?)\}\)\s*export\s+(?:abstract\s+)?class\s+(\w+)/g;
  for (const m of src.matchAll(re)) {
    const [, decorator, meta, className] = m;
    const selector =
      decorator === 'Pipe'
        ? meta.match(/\bname:\s*(['"`])(.+?)\1/)?.[2]
        : meta.match(/\bselector:\s*(['"`])(.+?)\1/)?.[2];
    if (!selector) continue;
    // Le corps de la classe s'arrête à la première accolade fermante en colonne 0.
    const start = m.index + m[0].length;
    const end = src.indexOf('\n}', start);
    const body = src.slice(start, end < 0 ? undefined : end);
    const inputs = [];
    const outputs = [];
    const member = /^  (?:readonly\s+)?(\w+)\s*=\s*(input|model|output)(\.required)?\s*[<(]/gm;
    for (const f of body.matchAll(member)) {
      // shortcut: l'instruction s'arrête au premier ";\n", un type générique contenant ";" la tronquerait.
      const stmt = body.slice(f.index, body.indexOf(';\n', f.index));
      const alias = stmt.match(/\balias:\s*'([^']+)'/)?.[1];
      const entry = { name: alias ?? f[1], alias: alias ? f[1] : undefined, required: !!f[3], model: f[2] === 'model' };
      (f[2] === 'output' ? outputs : inputs).push(entry);
    }
    decls.push({ className, kind: KINDS[decorator], selector, inputs, outputs });
  }
  return decls;
}

function resolveSource(dir, from) {
  const base = path.resolve(dir, from);
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) if (existsSync(candidate)) return candidate;
  throw new Error(`Fichier exporté introuvable : ${base}.ts`);
}

/** Déclarations publiques d'un point d'entrée, triées par sélecteur. */
export function collectEntryPoint(publicApiPath) {
  const dir = path.dirname(publicApiPath);
  const byClass = new Map();
  for (const { from, names } of parseExports(readFileSync(publicApiPath, 'utf8'))) {
    const file = resolveSource(dir, from);
    for (const d of extractDeclarations(readFileSync(file, 'utf8'))) {
      if (!names || names.includes(d.className)) byClass.set(d.className, d);
    }
  }
  return [...byClass.values()].sort((a, b) => a.selector.localeCompare(b.selector));
}

const fmtMember = ({ name, alias, required, model }) => {
  const notes = [alias && `alias de ${alias}`, required && 'requis', model && 'model'].filter(Boolean);
  return notes.length ? `${name} (${notes.join(', ')})` : name;
};
const cell = (items) => (items.length ? items.map(fmtMember).join(', ') : '–').replace(/\|/g, '\\|');

export function renderCatalogue(version, entryPoints) {
  const lines = [
    '# Catalogue des composants',
    '',
    `Paquet \`@lionelcointot/ui-angular\` version ${version}. Fichier généré par \`npm run catalogue:build\` : ne pas modifier à la main.`,
    'Entrées : `input()` et `model()` (liaison `[x]`, et `[(x)]` pour `model`) ; sorties : `output()`.',
  ];
  for (const { name, decls } of entryPoints) {
    lines.push('', `## \`${name}\``, '');
    lines.push('| Sélecteur | Classe | Genre | Entrées | Sorties |', '|---|---|---|---|---|');
    for (const d of decls) {
      const sel = `\`${d.selector.replace(/\|/g, '\\|')}\``;
      lines.push(`| ${sel} | ${d.className} | ${d.kind} | ${cell(d.inputs)} | ${cell(d.outputs)} |`);
    }
  }
  return lines.join('\n') + '\n';
}

function build() {
  const { name, version } = JSON.parse(readFileSync(path.join(PKG_DIR, 'package.json'), 'utf8'));
  const secondary = readdirSync(PKG_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(PKG_DIR, e.name, 'ng-package.json')))
    .map((e) => e.name)
    .sort();
  const points = [{ name, file: path.join(PKG_DIR, 'src', 'public-api.ts') }].concat(
    secondary.map((d) => ({ name: `${name}/${d}`, file: path.join(PKG_DIR, d, 'src', 'public-api.ts') })),
  );
  const entryPoints = points.map(({ name: n, file }) => {
    const decls = collectEntryPoint(file);
    console.log(`${n} : ${decls.length}`);
    return { name: n, decls };
  });
  return renderCatalogue(version, entryPoints);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const content = build();
  if (process.argv.includes('--check')) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
    if (current !== content) {
      console.error('CATALOGUE.md n\'est pas à jour : lancer `npm run catalogue:build`.');
      process.exit(1);
    }
  } else {
    writeFileSync(OUTPUT, content);
  }
}
