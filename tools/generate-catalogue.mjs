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

/** Classes exportées d'un fichier (décorées ou non) : sélecteur éventuel, classe parente, entrées et sorties propres. */
export function extractClasses(src) {
  const classes = [];
  const re = /(?:@(Component|Directive|Pipe)\((?:\{([\s\S]*?)\})?\)\s*)?export\s+(?:abstract\s+)?class\s+(\w+)([^{]*)\{/g;
  for (const m of src.matchAll(re)) {
    const [, decorator, meta = '', className, header] = m;
    const selector =
      decorator === 'Pipe'
        ? meta.match(/\bname:\s*(['"`])(.+?)\1/)?.[2]
        : meta.match(/\bselector:\s*(['"`])(.+?)\1/)?.[2];
    // Génériques retirés (`<T extends X>`) pour ne garder que le `extends` de la classe.
    const parent = header.replace(/<[^<>]*(?:<[^<>]*>[^<>]*)*>/g, '').match(/\bextends\s+(\w+)/)?.[1];
    // Le corps de la classe s'arrête à la première accolade fermante en colonne 0.
    const start = m.index + m[0].length;
    const end = src.indexOf('\n}', start);
    const body = src.slice(start, end < 0 ? undefined : end);
    const inputs = [];
    const outputs = [];
    // Membres publics seulement : un membre `protected` ou `private` n'est pas une entrée publique.
    const member = /^  (?:override\s+)?(?:readonly\s+)?(\w+)\s*=\s*(input|model|output)(\.required)?\s*[<(]/gm;
    for (const f of body.matchAll(member)) {
      // shortcut: l'instruction s'arrête au premier ";\n", un type générique contenant ";" la tronquerait.
      const stmt = body.slice(f.index, body.indexOf(';\n', f.index));
      const alias = stmt.match(/\balias:\s*'([^']+)'/)?.[1];
      const entry = { key: f[1], name: alias ?? f[1], alias: alias ? f[1] : undefined, required: !!f[3], model: f[2] === 'model' };
      (f[2] === 'output' ? outputs : inputs).push(entry);
    }
    classes.push({ className, kind: decorator && KINDS[decorator], selector, parent, inputs, outputs });
  }
  return classes;
}

/** Entrées et sorties d'une classe et de toute sa chaîne de bases : bases d'abord, un membre redéclaré une seule fois. */
function mergeMembers(cls, index) {
  const chain = [];
  for (let c = cls, seen = new Set(); c && !seen.has(c.className); c = index.get(c.parent)) {
    seen.add(c.className);
    chain.unshift(c);
  }
  const merged = { inputs: new Map(), outputs: new Map() };
  for (const c of chain) {
    for (const kind of ['inputs', 'outputs']) for (const e of c[kind]) merged[kind].set(e.key, e);
  }
  const strip = ({ key, ...rest }) => rest;
  return { inputs: [...merged.inputs.values()].map(strip), outputs: [...merged.outputs.values()].map(strip) };
}

/** Déclarations `@Component|@Directive|@Pipe` d'un source, entrées et sorties héritées comprises (bases de `extra` incluses). */
export function extractDeclarations(src, extra = []) {
  const classes = extractClasses(src);
  const index = new Map([...extra, ...classes].map((c) => [c.className, c]));
  return classes
    .filter((c) => c.kind && c.selector)
    .map((c) => ({ className: c.className, kind: c.kind, selector: c.selector, ...mergeMembers(c, index) }));
}

/** Toutes les classes des `.ts` de dir (hors tests et stories), pour retrouver les classes de base. */
export function buildClassIndex(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) e.name !== 'node_modules' && e.name !== 'dist' && walk(p);
      else if (/\.ts$/.test(e.name) && !/\.(spec|stories)\.ts$/.test(e.name)) out.push(...extractClasses(readFileSync(p, 'utf8')));
    }
  };
  walk(dir);
  return out;
}

function resolveSource(dir, from) {
  const base = path.resolve(dir, from);
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) if (existsSync(candidate)) return candidate;
  throw new Error(`Fichier exporté introuvable : ${base}.ts`);
}

/** Déclarations publiques d'un point d'entrée, triées par sélecteur. */
export function collectEntryPoint(publicApiPath, bases = buildClassIndex(path.dirname(publicApiPath))) {
  const byClass = new Map();
  const seen = new Set();
  /** Lit un fichier et les fichiers qu'il réexporte (un `index.ts` de dossier qui réexporte des directives) ; `names` : filtre de l'export nommé qui y mène. */
  const visit = (file, names) => {
    const src = readFileSync(file, 'utf8');
    for (const d of extractDeclarations(src, bases)) if (!names || names.includes(d.className)) byClass.set(d.className, d);
    if (seen.has(file)) return;
    seen.add(file);
    for (const next of parseExports(src)) visit(resolveSource(path.dirname(file), next.from), next.names ?? names);
  };
  for (const { from, names } of parseExports(readFileSync(publicApiPath, 'utf8'))) visit(resolveSource(path.dirname(publicApiPath), from), names);
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
  const bases = buildClassIndex(PKG_DIR);
  const entryPoints = points.map(({ name: n, file }) => {
    const decls = collectEntryPoint(file, bases);
    console.log(`${n} : ${decls.length}`);
    return { name: n, decls };
  });
  // Tokens supprimés ou renommés : note écrite à la main, ajoutée telle quelle à la fin du catalogue.
  return renderCatalogue(version, entryPoints) + '\n' + readFileSync(path.join(ROOT, 'tools', 'catalogue-motion-v2.md'), 'utf8');
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
