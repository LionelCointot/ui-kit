// Build du paquet : CSS (référence + composants, thèmes default et dark), JSON résolus, points de rupture, base.css.
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { BASE_THEMES, PACKAGE_ROOT, buildCss, checkTheme, isBaseToken, isSystemToken, resolvedTokens } from './tokens.mjs';

const DIST = path.join(PACKAGE_ROOT, 'dist');
const BREAKPOINTS = { sm: 360, md: 768, lg: 1024, xl: 1280 };
const SELECTORS = { default: ':root, [data-theme="default"]', dark: '[data-theme="dark"]' };

await mkdir(path.join(DIST, 'json'), { recursive: true });
await mkdir(path.join(DIST, 'scss'), { recursive: true });
await mkdir(path.join(DIST, 'js'), { recursive: true });

let failed = false;
for (const theme of BASE_THEMES) {
  const { errors } = await checkTheme(theme);
  for (const error of errors) console.error(`[${theme}] ${error}`);
  failed ||= errors.length > 0;
}
if (failed) {
  console.error('Échec : les thèmes de base ne respectent pas les contrastes WCAG.');
  process.exit(1);
}

await buildCss({ baseTheme: 'default', selector: ':root', buildPath: path.join(DIST, 'css'), destination: 'lc-tokens.css', filter: isBaseToken });
for (const theme of BASE_THEMES) {
  await buildCss({ baseTheme: theme, selector: SELECTORS[theme], buildPath: path.join(DIST, 'css'), destination: `theme-${theme}.css`, filter: isSystemToken });
  const flat = Object.fromEntries(await resolvedTokens(theme));
  await writeFile(path.join(DIST, 'json', `${theme}.json`), `${JSON.stringify(flat, null, 2)}\n`);
}
await copyFile(path.join(PACKAGE_ROOT, 'src', 'base.css'), path.join(DIST, 'css', 'base.css'));
await writeFile(path.join(DIST, 'scss', '_breakpoints.scss'),
  Object.entries(BREAKPOINTS).map(([name, px]) => `$lc-breakpoint-${name}: ${px}px;`).join('\n') + '\n');
await writeFile(path.join(DIST, 'js', 'breakpoints.js'), `export const LC_BREAKPOINTS = Object.freeze(${JSON.stringify(BREAKPOINTS)});\n`);
await writeFile(path.join(DIST, 'js', 'breakpoints.d.ts'),
  'export declare const LC_BREAKPOINTS: Readonly<{ sm: number; md: number; lg: number; xl: number }>;\n');
console.log('Tokens construits dans dist/ (contrastes WCAG vérifiés).');
