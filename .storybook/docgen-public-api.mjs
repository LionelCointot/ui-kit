// Maillon ajouté en bout de la chaîne d'extraction (docgen) de Storybook, exécuté dans un worker Node.
// L'extraction Angular (mode `api`) garde les membres `protected` des composants (aides de gabarit) :
// la table d'API ne garde que le contrat public (entrées, sorties, model()).
const INTERNAL_CATEGORIES = new Set(['properties', 'methods']);

export const createDocgenProvider = () => (next) => async (input) => {
  const payload = await next(input);
  if (!payload?.argTypes) return payload;
  const argTypes = Object.fromEntries(
    Object.entries(payload.argTypes).filter(([, argType]) => !INTERNAL_CATEGORIES.has(argType?.table?.category)),
  );
  return { ...payload, argTypes };
};
