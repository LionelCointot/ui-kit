// Données du générateur de code affiché (voir code-snippet.ts), calculées au démarrage de Storybook avec l'API TypeScript
// et exposées au navigateur par le module virtuel `virtual:lc-snippet-data` (voir main.ts).
//  - kit : pour chaque nom exporté par un point d'entrée public, son module (`@lionelcointot/ui-angular[/<entrée>]`)
//    et, pour les composants, directives et pipes, leurs sélecteurs (ou nom de pipe) ;
//  - files : pour chaque fichier de story publié, ses imports (nom → module) et ses déclarations locales
//    (composants de démonstration, interfaces, constantes) avec le texte source à recopier dans l'extrait.
// shortcut: calculé une fois au démarrage, un changement de sélecteur en cours de `storybook dev` demande un redémarrage.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyNameFromExport } from 'storybook/internal/csf';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const angularDir = join(root, 'packages/angular');
const MAIN_MODULE = '@lionelcointot/ui-angular';
const DECORATORS = new Set(['Component', 'Directive', 'Pipe']);

/** Points d'entrée publics : le principal (`src`) et un par dossier `<entrée>/src/public-api.ts`. */
function entryPoints() {
  const entries = [{ module: MAIN_MODULE, file: join(angularDir, 'src/public-api.ts') }];
  for (const dirent of readdirSync(angularDir, { withFileTypes: true })) {
    const file = join(angularDir, dirent.name, 'src/public-api.ts');
    if (dirent.isDirectory() && dirent.name !== 'src') {
      try {
        readFileSync(file);
        entries.push({ module: `${MAIN_MODULE}/${dirent.name}`, file });
      } catch {
        /* dossier sans point d'entrée (styles…) */
      }
    }
  }
  return entries;
}

/** Valeur d'une propriété de chaîne littérale dans le premier argument objet d'un décorateur (`selector`, `name`). */
function decoratorString(decorator, property) {
  const call = decorator.expression;
  const argument = ts.isCallExpression(call) ? call.arguments[0] : undefined;
  if (!argument || !ts.isObjectLiteralExpression(argument)) return undefined;
  for (const member of argument.properties) {
    if (ts.isPropertyAssignment(member) && member.name.getText() === property && ts.isStringLiteralLike(member.initializer)) {
      return member.initializer.text;
    }
  }
  return undefined;
}

function declarationInfo(declaration) {
  if (!ts.isClassDeclaration(declaration)) return {};
  for (const decorator of ts.getDecorators(declaration) ?? []) {
    const kind = ts.isCallExpression(decorator.expression) ? decorator.expression.expression.getText() : '';
    if (!DECORATORS.has(kind)) continue;
    const raw = decoratorString(decorator, kind === 'Pipe' ? 'name' : 'selector');
    if (raw === undefined) return {};
    return kind === 'Pipe' ? { pipe: raw } : { selectors: raw.split(',').map((part) => part.trim()) };
  }
  return {};
}

/** nom exporté → { module, selectors?, pipe? } pour tous les points d'entrée publics. */
function kitExports() {
  const entries = entryPoints();
  const program = ts.createProgram(
    entries.map((entry) => entry.file),
    { experimentalDecorators: true, module: ts.ModuleKind.Preserve, target: ts.ScriptTarget.ES2022, skipLibCheck: true, noEmit: true },
  );
  const checker = program.getTypeChecker();
  const kit = {};
  for (const entry of entries) {
    const sourceFile = program.getSourceFile(entry.file);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    for (const symbol of moduleSymbol ? checker.getExportsOfModule(moduleSymbol) : []) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      kit[symbol.name] = { module: entry.module, ...declarationInfo(target.declarations?.[0] ?? {}) };
    }
  }
  return kit;
}

function storyFiles(directory) {
  const files = [];
  for (const dirent of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, dirent.name);
    if (dirent.isDirectory()) {
      if (dirent.name !== 'node_modules' && dirent.name !== 'dist') files.push(...storyFiles(path));
    } else if (dirent.name.endsWith('.stories.ts') && !dirent.name.endsWith('.qa.stories.ts')) files.push(path);
  }
  return files;
}

const SKIPPED_MODULES = /^(@storybook|storybook|vitest)|\.css$/;

/** Imports d'un fichier de story (hors Storybook, vitest, feuilles de style) : nom local → module. */
function fileImports(sourceFile) {
  const imports = {};
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const module = statement.moduleSpecifier.text;
    const named = statement.importClause?.namedBindings;
    if (SKIPPED_MODULES.test(module) || module === '@lc/storybook' || !named || !ts.isNamedImports(named)) continue;
    for (const element of named.elements) imports[element.name.text] = module;
  }
  return imports;
}

function declaredNames(statement) {
  if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.map((d) => d.name.getText());
  return statement.name ? [statement.name.text] : [];
}

/**
 * Déclarations de premier niveau non exportées du fichier (hors `meta`, `Story`…, qui ne servent pas à l'extrait) :
 * texte source, sélecteurs, et les noms locaux ou importés qu'elles utilisent (`uses`).
 */
function fileLocals(sourceFile, imports) {
  const locals = [];
  for (const statement of sourceFile.statements) {
    const isDeclaration =
      ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
      ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement);
    if (!isDeclaration || ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    const names = declaredNames(statement);
    if (names.length === 0 || names.some((name) => name === 'meta' || name === 'Story')) continue;
    const identifiers = new Set();
    const visit = (node) => {
      if (ts.isIdentifier(node)) identifiers.add(node.text);
      ts.forEachChild(node, visit);
    };
    visit(statement);
    locals.push({
      names,
      text: statement.getText(),
      ...declarationInfo(statement),
      uses: [...identifiers].filter((id) => !names.includes(id)),
    });
  }
  // `uses` : seulement les noms que l'extrait doit résoudre (imports du fichier ou autres déclarations locales).
  const localNames = new Set(locals.flatMap((local) => local.names));
  for (const local of locals) local.uses = local.uses.filter((id) => id in imports || localNames.has(id));
  return locals;
}

const unwrap = (node) => {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
  return node;
};

/** Objet renvoyé par le `render` d'une story (corps-expression ou `return` final). */
function renderedObject(story) {
  const render = story.properties.find((p) => p.name?.getText() === 'render');
  const fn = ts.isPropertyAssignment(render ?? {}) ? unwrap(render.initializer) : render;
  const body = fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isMethodDeclaration(fn)) ? fn.body : undefined;
  const returned = body && ts.isBlock(body) ? body.statements.findLast(ts.isReturnStatement)?.expression : body;
  const object = unwrap(returned);
  return object && ts.isObjectLiteralExpression(object) ? object : undefined;
}

/** Noms liés dans le `render` (paramètres, déclarations de son corps) : un texte qui les lit ne peut pas être recopié tel quel. */
function renderBoundNames(story) {
  const render = story.properties.find((p) => p.name?.getText() === 'render');
  const fn = ts.isPropertyAssignment(render ?? {}) ? unwrap(render.initializer) : render;
  const names = new Set();
  const collect = (name) => {
    if (ts.isIdentifier(name)) names.add(name.text);
    else name.elements.forEach((element) => !ts.isOmittedExpression(element) && collect(element.name));
  };
  fn?.parameters?.forEach((parameter) => collect(parameter.name));
  if (fn?.body && ts.isBlock(fn.body)) {
    fn.body.statements.filter(ts.isVariableStatement).forEach((statement) => statement.declarationList.declarations.forEach((d) => collect(d.name)));
  }
  return names;
}

/** Déclaration de premier niveau `const nom = …` ou `function nom() {}` : son initialiseur (ou la fonction). */
const topLevelValue = (sourceFile, name) => {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement;
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find((d) => d.name.getText() === name);
      if (declaration?.initializer) return unwrap(declaration.initializer);
    }
  }
  return undefined;
};

const identifiersOf = (node, into = new Set()) => {
  if (ts.isIdentifier(node)) into.add(node.text);
  ts.forEachChild(node, (child) => {
    identifiersOf(child, into); // le retour ne doit pas être truthy : forEachChild s'arrêterait
  });
  return into;
};

/**
 * Valeurs d'un objet de `props` : texte source de chaque propriété, en suivant les `...spread`, un identifiant ou l'appel
 * d'une fonction locale qui renvoie un objet (ses paramètres sont remplacés par le texte des arguments).
 */
function propEntries(node, sourceFile, known, depth = 0, bound = new Set()) {
  node = unwrap(node);
  if (!node || depth > 4) return {};
  if (ts.isIdentifier(node)) return propEntries(topLevelValue(sourceFile, node.text), sourceFile, known, depth + 1, bound);
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) return helperEntries(node, sourceFile, known, depth, bound);
  if (!ts.isObjectLiteralExpression(node)) return {};
  const entries = {};
  for (const property of node.properties) {
    if (ts.isSpreadAssignment(property)) Object.assign(entries, propEntries(property.expression, sourceFile, known, depth + 1, bound));
    else if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      const value = ts.isPropertyAssignment(property) ? property.initializer : property.name;
      const uses = identifiersOf(value);
      entries[property.name.getText()] = { text: value.getText(), uses: [...uses].filter((id) => known(id)), args: [...uses].some((id) => bound.has(id)), literal: ts.isObjectLiteralExpression(value) || ts.isArrayLiteralExpression(value) };
    }
  }
  return entries;
}

function helperEntries(call, sourceFile, known, depth, bound) {
  const fn = topLevelValue(sourceFile, call.expression.text);
  if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn))) return {};
  const body = ts.isBlock(fn.body) ? fn.body.statements.findLast(ts.isReturnStatement)?.expression : fn.body;
  const object = unwrap(body);
  if (!object || !ts.isObjectLiteralExpression(object)) return {};
  // Paramètre → texte de l'argument (ou de sa valeur par défaut), et noms que ce texte utilise.
  const substitutions = new Map();
  fn.parameters.forEach((parameter, index) => {
    const source = call.arguments[index] ?? parameter.initializer;
    if (source) substitutions.set(parameter.name.getText(), source);
  });
  const entries = propEntries(object, sourceFile, known, depth + 1, bound);
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue;
    const value = ts.isPropertyAssignment(property) ? property.initializer : property.name;
    const replacements = [];
    const visit = (child) => {
      if (ts.isIdentifier(child) && substitutions.has(child.text) && !(ts.isPropertyAccessExpression(child.parent) && child.parent.name === child)) {
        replacements.push({ start: child.getStart() - value.getStart(), end: child.getEnd() - value.getStart(), source: substitutions.get(child.text) });
      }
      ts.forEachChild(child, visit);
    };
    visit(value);
    const key = property.name.getText();
    if (replacements.length === 0 || !entries[key]) continue;
    let text = value.getText();
    const uses = new Set(entries[key].uses);
    let readsBound = entries[key].args;
    for (const { start, end, source } of replacements.sort((a, b) => b.start - a.start)) {
      text = text.slice(0, start) + source.getText() + text.slice(end);
      identifiersOf(source).forEach((id) => {
        if (known(id)) uses.add(id);
        if (bound.has(id)) readsBound = true;
      });
    }
    entries[key] = { text, uses: [...uses].filter((id) => !substitutions.has(id) || known(id)), args: readsBound, literal: entries[key].literal };
  }
  return entries;
}

/**
 * Par story (nom affiché) : le texte source de chaque valeur de `props` du `render`. Il sert quand la valeur contient des
 * fonctions, dont le code exécuté perd les types (et, une fois minifié, les noms) : on recopie alors le source écrit.
 */
function fileStories(sourceFile, imports, localNames) {
  const known = (id) => id in imports || localNames.has(id);
  const stories = {};
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const story = unwrap(declaration.initializer);
      if (!story || !ts.isObjectLiteralExpression(story)) continue;
      const named = story.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'name');
      const name = named && ts.isStringLiteralLike(named.initializer) ? named.initializer.text : storyNameFromExport(declaration.name.getText());
      const propsNode = renderedObject(story)?.properties.find((p) => p.name?.getText() === 'props');
      if (!propsNode || !ts.isPropertyAssignment(propsNode)) continue;
      stories[name] = propEntries(propsNode.initializer, sourceFile, known, 0, renderBoundNames(story));
    }
  }
  return stories;
}

export function buildSnippetData() {
  const files = {};
  for (const path of [...storyFiles(angularDir), ...storyFiles(join(root, 'docs/storybook'))]) {
    const sourceFile = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ES2022, true);
    const imports = fileImports(sourceFile);
    const locals = fileLocals(sourceFile, imports);
    const stories = fileStories(sourceFile, imports, new Set(locals.flatMap((local) => local.names)));
    files[relative(root, path).split('\\').join('/')] = { imports, locals, stories };
  }
  return { kit: kitExports(), files };
}
