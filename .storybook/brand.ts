import { create, type ThemeVars } from 'storybook/theming';
// Chemin relatif : le manager est compilé hors de Vite, sans les alias de main.ts.
import { baseValues } from '../packages/tokens/theme/index.js';

/**
 * Thèmes Storybook (manager et pages de documentation) construits depuis les tokens résolus du kit :
 * aucune couleur recopiée, un changement de token se répercute sur l'habillage de la vitrine.
 */
function brandTheme(base: 'light' | 'dark'): ThemeVars {
  const v = baseValues(base === 'light' ? 'default' : 'dark');
  return create({
    base,
    brandTitle: 'lc ui-kit',
    brandUrl: 'https://github.com/LionelCointot/ui-kit',
    brandTarget: '_blank',
    colorPrimary: v['color.primary'],
    colorSecondary: v['color.primary'],
    appBg: v['color.surface-sunken'],
    appContentBg: v['color.surface'],
    appPreviewBg: v['color.background'],
    appBorderColor: v['color.border'],
    appBorderRadius: 8,
    fontBase: v['font.family.base'],
    fontCode: v['font.family.mono'],
    textColor: v['color.on-surface'],
    textMutedColor: v['color.on-surface-muted'],
    textInverseColor: v['color.on-primary'],
    barBg: v['color.surface'],
    barTextColor: v['color.on-surface-muted'],
    barSelectedColor: v['color.primary'],
    barHoverColor: v['color.primary'],
    inputBg: v['color.surface-raised'],
    inputBorder: v['color.border'],
    inputTextColor: v['color.on-surface'],
    inputBorderRadius: 6,
  });
}

export const lightTheme = brandTheme('light');
export const darkTheme = brandTheme('dark');

/** Thème qui suit la préférence du système (le manager n'a pas de bascule propre). */
export function preferredTheme(): ThemeVars {
  const dark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return dark ? darkTheme : lightTheme;
}
