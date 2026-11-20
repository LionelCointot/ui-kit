import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/angular-vite';

const here = dirname(fileURLToPath(import.meta.url));
const angularPackagesDir = resolve(here, '../packages/angular');
const tokensThemeModule = resolve(here, '../packages/tokens/theme/index.js');

/**
 * Build public (vitrine GitHub Pages) : `STORYBOOK_PUBLIC=1` retire les stories de QA (`*.qa.stories.ts`).
 * Sans la variable (développement, tests `addon-vitest`), toutes les stories sont chargées ; la QA est rangée sous « QA ».
 */
const publicBuild = process.env['STORYBOOK_PUBLIC'] === '1';

/** Descripteur d'un maillon d'extraction (API expérimentale de Storybook, non typée dans StorybookConfig). */
interface DocgenProviderDescriptor { moduleSpecifier: string; options: Record<string, unknown> }

const config: StorybookConfig & { experimental_docgenProvider?: unknown } = {
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
  experimental_docgenProvider: async (existing: DocgenProviderDescriptor[] = []) => [
    ...existing,
    { moduleSpecifier: resolve(here, 'docgen-public-api.mjs'), options: {} },
  ],
  // `packages/angular/package.json` n'expose, via `exports`, que ce que publie le paquet
  // (contrat public, voir CLAUDE.md). Storybook lit les sources TypeScript directement :
  // on fait pointer l'alias vers les points d'entrée source plutôt que de modifier `exports`.
  async viteFinal(viteConfig) {
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
