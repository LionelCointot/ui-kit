import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/angular-vite';

const here = dirname(fileURLToPath(import.meta.url));
const angularPackagesDir = resolve(here, '../packages/angular');

const config: StorybookConfig = {
  stories: ['../packages/angular/**/*.stories.ts'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest'
  ],
  framework: { name: '@storybook/angular-vite', options: {} },
  // `packages/angular/package.json` n'expose, via `exports`, que ce que publie le paquet
  // (contrat public, voir CLAUDE.md). Storybook lit les sources TypeScript directement :
  // on fait pointer l'alias vers les points d'entrée source plutôt que de modifier `exports`.
  async viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = [
      ...(Array.isArray(viteConfig.resolve.alias) ? viteConfig.resolve.alias : []),
      { find: /^@lionelcointot\/ui-angular$/, replacement: resolve(angularPackagesDir, 'src/public-api.ts') },
      { find: /^@lionelcointot\/ui-angular\/(.+)$/, replacement: `${angularPackagesDir}/$1/src/public-api.ts` },
    ];
    return viteConfig;
  },
};

export default config;
