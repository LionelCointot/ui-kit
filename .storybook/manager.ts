import { addons } from 'storybook/manager-api';
import { preferredTheme } from './brand';

addons.setConfig({
  theme: preferredTheme(),
  sidebar: { showRoots: true },
  enableShortcuts: true,
});
