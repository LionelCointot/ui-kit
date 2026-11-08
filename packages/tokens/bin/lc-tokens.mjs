#!/usr/bin/env node
// CLI des thèmes produit : lc-tokens build | check --theme <fichier.tokens.json> [--name <nom>] [--extends default|dark] [--out <fichier.css>]
import path from 'node:path';
import { buildCss, checkTheme } from '../lib/tokens.mjs';

const USAGE = `Usage :
  lc-tokens check --theme <fichier.tokens.json> [--extends default|dark]
  lc-tokens build --theme <fichier.tokens.json> --name <nom> --out <fichier.css> [--extends default|dark]`;

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const options = { extends: 'default' };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.replace(/^--/, '');
    if (!key || rest[i + 1] === undefined) throw new Error(`Option incomplète : ${rest[i] ?? ''}`);
    options[key] = rest[i + 1];
  }
  return { command, options };
}

try {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (!['build', 'check'].includes(command) || !options.theme) throw new Error(USAGE);
  const themeFile = path.resolve(options.theme);
  const { errors, report } = await checkTheme(options.extends, themeFile);
  for (const line of report) {
    console.log(`${line.ok ? 'OK ' : 'KO '} ${line.ratio.toFixed(2).padStart(5)}:1 (min ${line.minimum}) ${line.foregroundPath} / ${line.backgroundPath}`);
  }
  if (errors.length > 0) {
    for (const error of errors) console.error(`Erreur : ${error}`);
    process.exit(1);
  }
  if (command === 'build') {
    if (!options.name || !options.out) throw new Error(USAGE);
    if (!/^[a-z][a-z0-9-]*$/.test(options.name)) throw new Error('Le nom du thème doit être en minuscules (lettres, chiffres, tirets).');
    const out = path.resolve(options.out);
    await buildCss({
      baseTheme: options.extends,
      themeFile,
      selector: `[data-theme="${options.name}"]`,
      buildPath: path.dirname(out),
      destination: path.basename(out),
      filter: (token) => path.resolve(token.filePath) === themeFile,
    });
    console.log(`Thème « ${options.name} » écrit dans ${out}`);
  } else {
    console.log('Thème valide.');
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
