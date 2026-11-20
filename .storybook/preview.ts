import { applicationConfig, type Preview } from '@storybook/angular-vite';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { preferredTheme, darkTheme } from './brand';

/** Thème de départ : celui du système, pour que le manager, les pages de documentation et l'aperçu concordent. */
const startTheme = preferredTheme() === darkTheme ? 'dark' : 'default';
// Les pages MDX (accueil, démarrage) ne rendent aucune story : on pose le thème dès le chargement.
document.documentElement.setAttribute('data-theme', startTheme);

/** Sélecteur de thème : pose data-theme sur <html> (default ou dark), comme LcThemeService en production. */
const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'default', title: 'Light (default)', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: startTheme },
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
    controls: { expanded: true, sort: 'requiredFirst' },
    docs: { theme: preferredTheme(), toc: { headingSelector: 'h2, h3', title: 'On this page' }, codePanel: true },
    // Ordre de la barre latérale, écrit en ligne (Storybook lit storySort de façon statique) :
    // documentation, fondations, familles de composants, outils, puis QA.
    options: {
      storySort: {
        order: [
          'Introduction',
          'Getting started',
          'Foundations',
          ['Colors', 'Typography', 'Spacing and shape', 'Elevation and motion', 'Icons'],
          'Buttons',
          'Forms',
          'Data',
          'Charts',
          'Feedback',
          'Navigation',
          'Overlays',
          'Layout',
          'Geography',
          'Tools',
          'QA',
        ],
      },
    },
  },
};

export default preview;
