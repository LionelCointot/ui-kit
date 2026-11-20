import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/angular-vite';
import { buildSnippetData } from './snippet-data.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const angularPackagesDir = resolve(here, '../packages/angular');
const tokensThemeModule = resolve(here, '../packages/tokens/theme/index.js');

/**
 * Vitrine publique (GitHub Pages) : sans les stories de QA (`*.qa.stories.ts`). Activée par les scripts npm
 * `storybook:public` et `build-storybook:public` (nom du script, valable sous Windows) ou par `STORYBOOK_PUBLIC=1`.
 * Sinon (développement, tests `addon-vitest`), toutes les stories sont chargées ; la QA est rangée sous « QA ».
 */
const publicBuild =
  process.env['STORYBOOK_PUBLIC'] === '1' || (process.env['npm_lifecycle_event'] ?? '').endsWith(':public');

/** Module virtuel des données du code affiché (sélecteurs du kit, imports et démos locales des stories) : voir snippet-data.mjs. */
const snippetDataModule = {
  name: 'lc-snippet-data',
  resolveId: (id: string) => (id === 'virtual:lc-snippet-data' ? '\0virtual:lc-snippet-data' : undefined),
  load: (id: string) => (id === '\0virtual:lc-snippet-data' ? `export default ${JSON.stringify(buildSnippetData())};` : undefined),
};

const config: StorybookConfig = {
  stories: [
    '../docs/storybook/**/*.mdx',
    '../docs/storybook/**/*.stories.ts',
    publicBuild ? '../packages/angular/**/!(*.qa).stories.ts' : '../packages/angular/**/*.stories.ts',
  ],
  docs: { defaultName: 'Overview' },
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest'
  ],
  // Table d'API limitée au contrat public (entrées, sorties, model()) : mode `api` de l'extraction Angular.
  framework: { name: '@storybook/angular-vite', options: { propsTable: 'api' } },
  features: { experimentalDocgenServer: true },
  // Placé en dernier, ce maillon enveloppe l'extraction Angular et retire les membres internes de la table d'API.
  // shortcut: API expérimentale de Storybook 10 (docgen server), à revérifier à chaque montée de version.
  experimental_docgenProvider: async (existing = []) => [
    ...existing,
    { moduleSpecifier: resolve(here, 'docgen-public-api.mjs'), options: {} },
  ],
  // `packages/angular/package.json` n'expose, via `exports`, que ce que publie le paquet
  // (contrat public, voir CLAUDE.md). Storybook lit les sources TypeScript directement :
  // on fait pointer l'alias vers les points d'entrée source plutôt que de modifier `exports`.
  async viteFinal(viteConfig) {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), snippetDataModule];
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = [
      ...(Array.isArray(viteConfig.resolve.alias) ? viteConfig.resolve.alias : []),
      // Cœur de thème des tokens (ESM sans dépendance Node) : lu directement depuis les sources du workspace.
      { find: /^@lionelcointot\/ui-tokens\/theme$/, replacement: tokensThemeModule },
      // Aides des stories (contrôles de l'API commune, exemples figés), hors paquet publié.
      { find: /^@lc\/storybook$/, replacement: resolve(here, 'story-helpers.ts') },
      { find: /^@lionelcointot\/ui-angular$/, replacement: resolve(angularPackagesDir, 'src/public-api.ts') },
      { find: /^@lionelcointot\/ui-angular\/(.+)$/, replacement: `${angularPackagesDir}/$1/src/public-api.ts` },
    ];
    return viteConfig;
  },
};

export default config;
