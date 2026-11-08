import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../packages/angular/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: { name: '@storybook/angular', options: {} },
};

export default config;
