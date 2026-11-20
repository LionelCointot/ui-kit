// Code affiché pour une story (onglet Code, « Show code ») : un composant Angular complet, prêt à coller dans une application.
// Fonctions pures, sans dépendance au navigateur ni à Storybook (testées par code-snippet.test.ts) : l'adaptation à Storybook
// (contexte de la story, données calculées au démarrage) est dans code-snippet-docs.ts.

/** Données calculées par snippet-data.mjs. */
export interface SnippetData {
  kit: Record<string, { module: string; selectors?: string[]; pipe?: string }>;
  files: Record<string, { imports: Record<string, string>; locals: SnippetLocal[]; stories: Record<string, Record<string, SnippetProp>> }>;
}
/** Valeur de `props` telle qu'écrite dans le `render` de la story, avec les noms (locaux ou importés) qu'elle utilise. */
export interface SnippetProp {
  text: string;
  uses: string[];
  /** Le texte lit `args` ou une variable du `render` : il ne peut pas être recopié dans l'extrait. */
  args: boolean;
  /** Le texte est un littéral objet ou tableau (sans conversion de type) : on lui ajoute `as const`. */
  literal: boolean;
}
export interface SnippetLocal {
  names: string[];
  text: string;
  selectors?: string[];
  pipe?: string;
  uses: string[];
}
/** Ce que le rendu de la story fournit : le gabarit (absent pour une story réduite au composant) et les valeurs liées. */
export interface SnippetInput {
  template?: string;
  props: Record<string, unknown>;
  data: SnippetData;
  fileName?: string;
  /** Nom affiché de la story (clé des valeurs de `props` écrites dans le fichier). */
  storyName?: string;
  /** Options des contrôles à choix (valeurs texte) : le champ est typé par l'union de ces valeurs. */
  options?: Record<string, readonly string[]>;
  /** Composant de la story, pour générer le gabarit quand la story n'en fournit pas. */
  component?: { selector?: string[]; inputs: string[]; outputs: string[] };
  /** Reconnaissance des signaux et des actions Storybook, injectée pour garder ce module sans dépendance. */
  isSignal: (value: unknown) => boolean;
}

/** Éléments d'Angular et de ses bibliothèques que les démos emploient, hors du kit : sélecteur d'attribut ou nom de pipe. */
const BUILTINS = {
  attributes: {
    routerLink: { name: 'RouterLink', module: '@angular/router' },
    formField: { name: 'FormField', module: '@angular/forms/signals' },
    ngTemplateOutlet: { name: 'NgTemplateOutlet', module: '@angular/common' },
    ngClass: { name: 'NgClass', module: '@angular/common' },
    ngStyle: { name: 'NgStyle', module: '@angular/common' },
  } as Record<string, { name: string; module: string }>,
  pipes: {
    json: { name: 'JsonPipe', module: '@angular/common' },
    async: { name: 'AsyncPipe', module: '@angular/common' },
  } as Record<string, { name: string; module: string }>,
};
const CORE_NAMES = ['Component', 'signal'];
const MAX_ITEMS = 10;
const MAX_DEPTH = 6;
const INLINE_WIDTH = 80;
const KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'this', 'typeof', 'in', 'of', 'as', 'track', 'let', 'new', 'void']);

// ---------------------------------------------------------------------------------------------------------------------
// Analyse du gabarit

export interface TemplateAnalysis {
  elements: { tag: string; attrs: Record<string, string> }[];
  pipes: Set<string>;
  /** Identifiants racines lus par les expressions, hors variables locales du gabarit. */
  roots: string[];
  /** Racines appelées comme une fonction : nom → texte des arguments du premier appel. */
  called: Map<string, string>;
  /** Racines modifiées par le gabarit (affectation, liaison bidirectionnelle) : le champ ne peut pas être `readonly`. */
  mutated: Set<string>;
}

const STRING_LITERAL = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

/** Texte entre parenthèses équilibrées à partir de `open` (position de « ( »). */
function balanced(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')' && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

export function analyzeTemplate(template: string): TemplateAnalysis {
  const expressions: string[] = [];
  const statements: string[] = [];
  const declared = new Set<string>();
  const mutated = new Set<string>();

  for (const m of template.matchAll(/\{\{([\s\S]*?)\}\}/g)) expressions.push(m[1]);
  for (const m of template.matchAll(/(\[\(?[\w.:-]+\)?\]|\([\w.:-]+\)|\*\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const value = m[2] ?? m[3];
    if (m[1].startsWith('(')) statements.push(value);
    else {
      expressions.push(value);
      if (m[1].startsWith('[(')) mutated.add(value.trim());
    }
  }
  for (const m of template.matchAll(/@(?:else\s+if|if|for|switch|case|defer)\s*\(/g)) {
    const inner = balanced(template, m.index + m[0].length - 1);
    if (m[0].startsWith('@for')) {
      const [head = '', ...rest] = inner.split(';');
      const of = /^\s*(\w+)\s+of\s+([\s\S]*)$/.exec(head);
      if (of) {
        declared.add(of[1]);
        expressions.push(of[2]);
      }
      for (const part of rest) {
        const track = /^\s*track\s+([\s\S]*)$/.exec(part);
        if (track) expressions.push(track[1]);
        for (const alias of part.replace(/^\s*let\s+/, '').matchAll(/(\w+)\s*=\s*\$\w+/g)) declared.add(alias[1]);
      }
    } else {
      const [expression, ...rest] = inner.split(';');
      expressions.push(expression);
      for (const part of rest) {
        const alias = /\bas\s+(\w+)/.exec(part);
        if (alias) declared.add(alias[1]);
      }
    }
  }
  for (const m of template.matchAll(/@let\s+(\w+)\s*=\s*([^;]+);/g)) {
    declared.add(m[1]);
    expressions.push(m[2]);
  }
  for (const m of template.matchAll(/#(\w+)|\blet-(\w+)(?:\s*=\s*"[^"]*")?/g)) declared.add(m[1] ?? m[2]);

  const roots: string[] = [];
  const called = new Map<string, string>();
  const pipes = new Set<string>();
  const scan = (source: string) => {
    const code = source.replace(STRING_LITERAL, "''");
    for (const m of code.matchAll(/(?<![|])\|(?![|])\s*([A-Za-z_]\w*)/g)) pipes.add(m[1]);
    for (const m of code.matchAll(/\(?\s*([\w\s,]*?)\s*\)?\s*=>/g)) m[1].split(',').forEach((name) => declared.add(name.trim()));
    for (const m of code.matchAll(/(?<![\w$.])([A-Za-z_][\w$]*)(\s*\()?/g)) {
      const name = m[1];
      if (KEYWORDS.has(name) || roots.includes(name)) continue;
      roots.push(name);
      if (m[2]) called.set(name, balanced(code, m.index + m[0].length - 1).trim());
    }
    for (const m of code.matchAll(/(?<![\w$.])([A-Za-z_]\w*)\s*(?:=(?!=)|\+=|-=|\+\+|--)/g)) mutated.add(m[1]);
  };
  expressions.forEach(scan);
  statements.forEach((statement) => statement.split(';').forEach(scan));

  const elements: TemplateAnalysis['elements'] = [];
  const tagPattern = /<([a-zA-Z][\w-]*)((?:\s+[^\s>=/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*\/?>/g;
  for (const tag of template.matchAll(tagPattern)) {
    const attrs: Record<string, string> = {};
    for (const a of tag[2].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) {
      const name = a[1].replace(/^\*|^\[\(?|\)?\]$|^\(|\)$/g, '');
      if (!/^(attr|class|style)\./.test(name)) attrs[name] = a[2] ?? a[3] ?? '';
    }
    elements.push({ tag: tag[1], attrs });
  }
  return {
    elements,
    pipes,
    roots: roots.filter((name) => !declared.has(name) && !pipes.has(name)),
    called,
    mutated,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Sélecteurs

/** `tag[attr=valeur][autre]` contre un élément du gabarit (attributs : nom → valeur statique). */
export function selectorMatches(selector: string, tag: string, attrs: Record<string, string>): boolean {
  const parsed = /^([\w-]*)((?:\[[^\]]+\])*)$/.exec(selector.trim());
  if (!parsed) return false;
  if (parsed[1] && parsed[1] !== tag) return false;
  return [...parsed[2].matchAll(/\[([^\]=]+)(?:=([^\]]*))?\]/g)].every(([, name, value]) => name in attrs && (value === undefined || attrs[name] === value));
}

// ---------------------------------------------------------------------------------------------------------------------
// Valeurs littérales

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export function quote(text: string): string {
  const q = text.includes("'") && !text.includes('"') ? '"' : "'";
  const escaped = text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(new RegExp(q, 'g'), `\\${q}`);
  return q + escaped + q;
}

function indentBlock(text: string, pad: string): string {
  return text.split('\n').join(`\n${pad}`);
}

/**
 * Écrit une valeur sous forme de littéral TypeScript (tableaux longs tronqués, signaux, fonctions, dates).
 * `asConst` : tableaux et objets gardent leurs types littéraux (`'solid'` et non `string`), nécessaires aux entrées à union de chaînes.
 */
export function formatValue(value: unknown, isSignal: (v: unknown) => boolean, depth = 0, seen = new WeakSet<object>()): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'symbol') return 'undefined';
  if (typeof value === 'function') {
    if (isSignal(value)) return `signal(${formatValue((value as () => unknown)(), isSignal, depth, seen)})`;
    return functionSource(value as (...args: unknown[]) => unknown);
  }
  const object = value as object;
  if (seen.has(object) || depth > MAX_DEPTH) return 'undefined';
  seen.add(object);
  try {
    if (value instanceof Date) return `new Date(${quote(value.toISOString())})`;
    const recurse = (item: unknown) => formatValue(item, isSignal, depth + 1, seen);
    if (value instanceof Map) return `new Map(${formatEntries([...value].map(([k, v]) => `[${recurse(k)}, ${recurse(v)}]`), '[', ']')})`;
    if (value instanceof Set) return `new Set(${formatEntries([...value].map(recurse), '[', ']')})`;
    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ITEMS).map(recurse);
      if (value.length > MAX_ITEMS) items.push(`// … ${value.length - MAX_ITEMS} de plus`);
      return formatEntries(items, '[', ']');
    }
    const entries = Object.entries(object).map(([key, item]) => `${IDENTIFIER.test(key) ? key : quote(key)}: ${recurse(item)}`);
    return formatEntries(entries, '{', '}');
  } finally {
    seen.delete(object);
  }
}

/** Une ligne si c'est court et sans commentaire, sinon un élément par ligne. */
function formatEntries(entries: string[], open: string, close: string): string {
  if (entries.length === 0) return open + close;
  const inline = `${open}${open === '{' ? ' ' : ''}${entries.join(', ')}${open === '{' ? ' ' : ''}${close}`;
  if (inline.length <= INLINE_WIDTH && !inline.includes('\n') && !inline.includes('//')) return inline;
  return `${open}\n${entries.map((entry) => `  ${indentBlock(entry, '  ')}${entry.startsWith('//') ? '' : ','}`).join('\n')}\n${close}`;
}

/** Code source d'une fonction ; une fonction native (liée) devient une fonction vide. */
function functionSource(fn: (...args: unknown[]) => unknown): string {
  const source = Function.prototype.toString.call(fn);
  return /\[native code\]/.test(source) ? '() => {}' : source;
}

/** Action Storybook (`argTypes.x.action`), mock ou fonction native : le gabarit l'appelle, l'extrait en fait une méthode vide. */
const isStub = (fn: unknown): boolean =>
  typeof fn === 'function' && (/\[native code\]/.test(Function.prototype.toString.call(fn)) || 'isAction' in fn || 'mock' in fn);

// ---------------------------------------------------------------------------------------------------------------------
// Assemblage

export function reindentTemplate(template: string, pad: string): string {
  const lines = template.split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const firstStartsLine = template.length > 0 && !/^\s*\n/.test(template);
  const body = firstStartsLine ? lines.slice(1) : lines;
  const base = Math.min(...body.filter((line) => line.trim()).map((line) => /^ */.exec(line)![0].length));
  const dedented = [
    ...(firstStartsLine && lines.length ? [lines[0].trim()] : []),
    ...body.map((line) => (line.trim() ? line.slice(Number.isFinite(base) ? base : 0).trimEnd() : '')),
  ];
  return dedented.map((line) => (line ? pad + line : line)).join('\n');
}

/** `@for (x of ['a', 'b'])` : le tableau devient un champ `as const`, car en ligne ses éléments seraient typés `string`. */
export function hoistLoopLiterals(template: string): { template: string; fields: { name: string; code: string }[] } {
  const fields: { name: string; code: string }[] = [];
  const hoisted = template.replace(/@for\s*\(\s*(\w+)\s+of\s+(\[[^\]]*\])\s*;/g, (_match, item: string, literal: string) => {
    const base = `${item}Values`;
    const name = fields.some((field) => field.name === base) ? `${base}${fields.length + 1}` : base;
    fields.push({ name, code: `readonly ${name} = ${literal} as const;` });
    return `@for (${item} of ${name};`;
  });
  return { template: hoisted, fields };
}

const escapeTemplate = (text: string) => text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/** Gabarit d'une story réduite au composant : l'élément du composant avec ses entrées et ses sorties liées aux valeurs. */
function generatedTemplate(input: SnippetInput): string {
  const [selector] = input.component?.selector ?? [];
  const parsed = selector ? /^([\w-]*)((?:\[[^\]]+\])*)$/.exec(selector) : null;
  const tag = parsed?.[1] || 'div';
  const staticAttrs = parsed ? [...parsed[2].matchAll(/\[([^\]=]+)(?:=([^\]]*))?\]/g)].map(([, n, v]) => (v ? `${n}="${v}"` : n)) : [];
  const bindings = Object.entries(input.props).flatMap(([name, value]) => {
    if (input.component?.outputs.includes(name) && typeof value === 'function') return [`(${name})="${name}($event)"`];
    return input.component?.inputs.includes(name) && value !== undefined ? [`[${name}]="${name}"`] : [];
  });
  const attrs = [...staticAttrs, ...bindings];
  return `<${[tag, ...attrs].join(' ')}></${tag}>`;
}

function methodStub(name: string, args: string): string {
  const parameters = args === '' ? '' : args === '$event' ? 'event: unknown' : '..._args: unknown[]';
  return `${name}(${parameters}): void {\n  // À compléter : réaction à l'événement.\n}`;
}

/** Champ (ou méthode) de la classe pour un identifiant du gabarit. */
function member(name: string, analysis: TemplateAnalysis, input: SnippetInput): { code: string; usesSignal: boolean; uses: string[] } {
  const { props } = input;
  const has = Object.prototype.hasOwnProperty.call(props, name);
  const value = props[name];
  const args = analysis.called.get(name);
  if (!has) {
    return { code: args !== undefined ? methodStub(name, args) : `readonly ${name} = undefined;`, usesSignal: false, uses: [] };
  }
  if (typeof value === 'function' && isStub(value)) return { code: methodStub(name, args ?? '$event'), usesSignal: false, uses: [] };
  const written = input.storyName && input.fileName ? input.data.files[normalizeFileName(input.fileName)]?.stories[input.storyName]?.[name] : undefined;
  const mutable = analysis.mutated.has(name) && !input.isSignal(value);
  if (written && !written.args) {
    const text = written.literal && !mutable ? `${written.text} as const` : written.text;
    return { code: `${mutable ? '' : 'readonly '}${name} = ${text};`, usesSignal: false, uses: written.uses };
  }
  if (typeof value === 'function' && !input.isSignal(value)) {
    const source = functionSource(value as (...a: unknown[]) => unknown);
    return { code: `${name} = ${source};`, usesSignal: false, uses: [] };
  }
  const options = input.options?.[name];
  const keepsLiterals = !mutable && typeof value === 'object' && value !== null && !(value instanceof Date) && !input.isSignal(value);
  const literal = formatValue(value, input.isSignal) + (keepsLiterals && !/signal\(|=>|function/.test(formatValue(value, input.isSignal)) ? ' as const' : '');
  const type = typeof value === 'string' && options?.includes(value) ? `: ${options.map(quote).join(' | ')}` : '';
  return { code: `${mutable ? '' : 'readonly '}${name}${type} = ${literal};`, usesSignal: literal.includes('signal('), uses: [] };
}

function resolveModule(name: string, input: SnippetInput): string | undefined {
  const fromKit = input.data.kit[name]?.module;
  if (fromKit) return fromKit;
  const fileModule = input.fileName ? input.data.files[normalizeFileName(input.fileName)]?.imports[name] : undefined;
  if (fileModule && !fileModule.startsWith('.')) return fileModule;
  const builtin = [...Object.values(BUILTINS.attributes), ...Object.values(BUILTINS.pipes)].find((entry) => entry.name === name);
  return builtin?.module ?? (CORE_NAMES.includes(name) ? '@angular/core' : undefined);
}

export const normalizeFileName = (fileName: string) => fileName.replace(/^\.\//, '');

/** Composant Angular complet pour la story : imports, déclarations locales de démonstration, `@Component` et classe. */
export function buildSnippet(input: SnippetInput): string {
  const hoisted = hoistLoopLiterals(input.template ?? generatedTemplate(input));
  const template = hoisted.template;
  const analysis = analyzeTemplate(template);
  const file = input.fileName ? input.data.files[normalizeFileName(input.fileName)] : undefined;
  const locals = file?.locals ?? [];

  // Classes (et pipes) du gabarit : kit, éléments d'Angular, composants de démonstration du fichier.
  const imported = new Set<string>();
  const neededLocals = new Set<SnippetLocal>();
  const candidates = [
    ...Object.entries(input.data.kit).map(([name, info]) => ({ name, ...info, local: undefined as SnippetLocal | undefined })),
    ...locals.filter((l) => l.selectors || l.pipe).map((local) => ({ name: local.names[0], selectors: local.selectors, pipe: local.pipe, module: '', local })),
  ];
  for (const candidate of candidates) {
    const used =
      (candidate.pipe !== undefined && analysis.pipes.has(candidate.pipe)) ||
      (candidate.selectors?.some((selector) => analysis.elements.some((el) => selectorMatches(selector, el.tag, el.attrs))) ?? false);
    if (!used) continue;
    imported.add(candidate.name);
    if (candidate.local) neededLocals.add(candidate.local);
  }
  for (const element of analysis.elements)
    for (const attr of Object.keys(element.attrs)) if (BUILTINS.attributes[attr]) imported.add(BUILTINS.attributes[attr].name);
  for (const pipe of analysis.pipes) if (BUILTINS.pipes[pipe]) imported.add(BUILTINS.pipes[pipe].name);

  // Champs et méthodes : un par identifiant lu par le gabarit.
  const members = [
    ...hoisted.fields.map(({ code }) => ({ code, usesSignal: false, uses: [] as string[] })),
    ...analysis.roots.filter((name) => !hoisted.fields.some((field) => field.name === name)).map((name) => member(name, analysis, input)),
  ];

  // Déclarations locales utilisées, avec leurs dépendances (interfaces, constantes, autres composants).
  const byName = new Map(locals.flatMap((local) => local.names.map((name) => [name, local] as const)));
  const memberUses = members.flatMap((m) => m.uses);
  for (const use of memberUses) {
    const local = byName.get(use);
    if (local) neededLocals.add(local);
  }
  const queue = [...neededLocals];
  while (queue.length) {
    for (const dependency of queue.pop()!.uses) {
      const local = byName.get(dependency);
      if (local && !neededLocals.has(local)) {
        neededLocals.add(local);
        queue.push(local);
      }
    }
  }
  const orderedLocals = locals.filter((local) => neededLocals.has(local));

  const names = new Set<string>(['Component', ...imported, ...memberUses]);
  if (members.some((m) => m.usesSignal)) names.add('signal');
  orderedLocals.forEach((local) => local.uses.forEach((use) => names.add(use)));
  orderedLocals.forEach((local) => local.names.forEach((name) => names.delete(name)));

  const byModule = new Map<string, string[]>();
  for (const name of names) {
    const module = resolveModule(name, input);
    if (module) byModule.set(module, [...(byModule.get(module) ?? []), name]);
  }
  const moduleRank = (module: string) => (module.startsWith('@angular/') || module === 'rxjs' ? 0 : module.startsWith('@lionelcointot') ? 1 : 2);
  const importLines = [...byModule.entries()]
    .sort(([a], [b]) => moduleRank(a) - moduleRank(b) || a.localeCompare(b))
    .map(([module, list]) => `import { ${list.sort().join(', ')} } from '${module}';`);

  const hostImports = [...imported].sort().join(', ');
  const classBody = members.length ? `{\n${members.map((m) => `  ${indentBlock(m.code, '  ')}`).join('\n')}\n}` : '{}';
  return [
    importLines.join('\n'),
    ...orderedLocals.map((local) => local.text),
    [
      '@Component({',
      "  selector: 'app-example',",
      `  imports: [${hostImports}],`,
      `  template: \`\n${escapeTemplate(reindentTemplate(template, '    '))}\n  \`,`,
      '})',
      `export class ExampleComponent ${classBody}`,
    ].join('\n'),
  ].join('\n\n') + '\n';
}
