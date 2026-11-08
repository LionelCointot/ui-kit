import { applicationConfig, type Preview } from '@storybook/angular-vite';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

/** Sélecteur de thème : pose data-theme sur <html> (default ou dark), comme LcThemeService en production. */
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Thème',
      toolbar: {
        title: 'Thème',
        icon: 'paintbrush',
        items: [
          { value: 'default', title: 'Clair (default)' },
          { value: 'dark', title: 'Sombre (dark)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'default' },
  decorators: [
    applicationConfig({ providers: [provideZonelessChangeDetection(), provideRouter([])] }),
    (story, context) => {
      const theme = (context.globals['theme'] as string) || 'default';
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
      document.body.style.background = 'var(--lc-sys-color-background)';
      document.body.style.color = 'var(--lc-sys-color-on-surface)';
      document.body.style.fontFamily = 'var(--lc-sys-font-family-base)';
      return story();
    },
  ],
  parameters: {
    layout: 'padded',
    a11y: { test: 'todo' },
    controls: { expanded: true },
  },
};

export default preview;
