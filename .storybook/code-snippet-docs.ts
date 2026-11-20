// Branche le générateur de code (code-snippet.ts) sur Storybook : transformation du code affiché (« Show code » des pages de
// documentation, onglet Code) et ré-émission quand les réglages du panneau Controls changent.
import { isSignal } from '@angular/core';
import type { Decorator } from '@storybook/angular-vite';
import { SNIPPET_RENDERED } from 'storybook/internal/docs-tools';
import { addons, useEffect } from 'storybook/preview-api';
import snippetData from 'virtual:lc-snippet-data';
import { buildSnippet, type SnippetData } from './code-snippet';

interface ComponentDef {
  selectors?: (string | string[])[][];
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

/** Sélecteurs, entrées et sorties du composant de la story, lus sur sa définition compilée (`ɵcmp`, `ɵdir`). */
function componentMeta(component: unknown) {
  const def = ((component as Record<string, ComponentDef> | undefined)?.['ɵcmp'] ?? (component as Record<string, ComponentDef> | undefined)?.['ɵdir']);
  if (!def) return undefined;
  const selectors = (def.selectors ?? []).map(([tag, ...attrs]) => {
    const names = attrs.filter((_, index) => index % 2 === 0);
    return `${tag}${names.map((name) => `[${name}]`).join('')}`;
  });
  return { selector: selectors, inputs: Object.keys(def.inputs ?? {}), outputs: Object.keys(def.outputs ?? {}) };
}

/** Options texte des contrôles à choix : elles typent les champs par une union de chaînes. */
function selectOptions(argTypes: Record<string, { options?: unknown[] }> = {}): Record<string, string[]> {
  const options: Record<string, string[]> = {};
  for (const [name, argType] of Object.entries(argTypes)) {
    if (Array.isArray(argType.options) && argType.options.length > 0 && argType.options.every((option) => typeof option === 'string')) {
      options[name] = argType.options as string[];
    }
  }
  return options;
}

/** Type affiché par la table d'API de chaque argument (`boolean`, `string | undefined`…), sans les types génériques de signaux. */
function tableTypes(argTypes: Record<string, { table?: { type?: { summary?: string } }; options?: unknown[] }> = {}): Record<string, string> {
  const types: Record<string, string> = {};
  for (const [name, argType] of Object.entries(argTypes)) {
    const summary = argType.table?.type?.summary;
    const options = (argType.options ?? []).filter((option) => option !== undefined);
    if (summary && /^[\w\s|'".<>\[\]-]+$/.test(summary) && !/Signal|\bany\b/.test(summary)) types[name] = summary;
    // Contrôle à choix de booléens, nombres ou `null` (ex. `[null, false, true]`) : union de ces valeurs.
    else if (options.length > 0 && options.every((option) => option === null || ['boolean', 'number'].includes(typeof option))) types[name] = options.map(String).join(' | ');
  }
  return types;
}

/** Code affiché : le composant Angular complet de la story, avec les valeurs courantes des contrôles. */
export function transformSnippet(code: string, context: any): string {
  try {
    const rendered = context.originalStoryFn(context.args, context) as { template?: string; props?: Record<string, unknown> };
    return buildSnippet({
      template: rendered.template,
      props: rendered.props ?? {},
      data: snippetData as SnippetData,
      fileName: context.parameters?.['fileName'],
      storyName: context.name,
      options: selectOptions(context.argTypes),
      types: tableTypes(context.argTypes),
      component: componentMeta(context.component),
      isSignal,
    });
  } catch (error) {
    // Hors production seulement (storybook dev) : sans ce message, un échec laisserait l'ancien code affiché sans explication.
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.warn(`Code affiché indisponible pour la story ${context?.id}`, error);
    return code;
  }
}

const argsKey = (args: unknown): string => {
  try {
    return JSON.stringify(args, (_key, value) => (typeof value === 'function' ? 'fn' : value));
  } catch {
    return String(Math.random());
  }
};

/**
 * Le panneau Code n'est alimenté qu'au chargement de la story : ce décorateur ré-émet l'extrait quand les args changent,
 * pour que le code affiché suive le panneau Controls.
 */
export const snippetDecorator: Decorator = (story, context) => {
  const hasAuthoredCode = context.parameters['docs']?.source?.code !== undefined;
  useEffect(() => {
    if (hasAuthoredCode) return;
    const source = transformSnippet('', context);
    if (source) addons.getChannel().emit(SNIPPET_RENDERED, { id: context.id, source, args: context['unmappedArgs'] });
  }, [argsKey(context.args)]);
  return story();
};
