import type { ArgTypes } from '@storybook/angular-vite';

/**
 * Aides partagées par les stories (importées via l'alias `@lc/storybook`, jamais livrées dans le paquet).
 * L'extraction Angular ne déplie pas les unions nommées (`LcFillMode`…) : on déclare leurs options ici.
 */
export const themeColorOptions = ['primary', 'secondary', 'success', 'warning', 'error', 'highlight', 'neutral'] as const;
export const fillModeOptions = ['solid', 'outline', 'flat'] as const;
export const sizeOptions = ['small', 'medium', 'large'] as const;
export const roundedOptions = ['none', 'small', 'medium', 'large', 'full'] as const;

/** Contrôles de l'API commune (`themeColor`, `fillMode`, `size`, `rounded`) : ne garder que ceux que le composant expose. */
export const commonArgTypes = {
  themeColor: { control: 'select', options: themeColorOptions },
  fillMode: { control: 'inline-radio', options: fillModeOptions },
  size: { control: 'inline-radio', options: sizeOptions },
  rounded: { control: 'select', options: roundedOptions },
} satisfies ArgTypes;

/** Paramètres d'une story d'exemple figée : son gabarit ignore les args, le panneau Controls est donc masqué. */
export const fixedExample = { controls: { disable: true } } as const;
