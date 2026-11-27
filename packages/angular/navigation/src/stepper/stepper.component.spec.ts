/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_DEFAULT_ICONS, LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import refTokens from '../../../../tokens/src/ref/scale.tokens.json';
import sysTokens from '../../../../tokens/src/sys/default.tokens.json';
import { LcStepActionDirective } from './step-action.directive';
import { LcStep, LcStepperComponent, LcStepperDirection, LcStepperOrientation } from './stepper.component';

const STEPS: readonly LcStep[] = [
  { id: 's1', label: 'Un', state: 'done' },
  { id: 's2', label: 'Deux', state: 'done' },
  { id: 's3', label: 'Trois', state: 'current' },
  { id: 's4', label: 'Quatre', state: 'upcoming' },
];

/** `count` étapes dont l'étape en cours est à l'index `current` (les précédentes faites, les suivantes à venir). */
function stepsAt(current: number, count = 5): readonly LcStep[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `e${index + 1}`,
    label: `Etape ${index + 1}`,
    state: index < current ? ('done' as const) : index === current ? ('current' as const) : ('upcoming' as const),
  }));
}

interface SetupOptions {
  readonly compact?: 'auto' | boolean;
  readonly linear?: boolean;
  readonly orientation?: LcStepperOrientation;
}

async function setup(steps: readonly LcStep[] = STEPS, options: SetupOptions = {}) {
  const fixture = TestBed.createComponent(LcStepperComponent);
  fixture.componentRef.setInput('steps', steps);
  fixture.componentRef.setInput('ariaLabel', 'Progression');
  if (options.compact !== undefined) fixture.componentRef.setInput('compact', options.compact);
  if (options.linear !== undefined) fixture.componentRef.setInput('linear', options.linear);
  if (options.orientation !== undefined) fixture.componentRef.setInput('orientation', options.orientation);
  const emitted: string[] = [];
  const directions: LcStepperDirection[] = [];
  fixture.componentInstance.stepSelect.subscribe((id) => emitted.push(id));
  fixture.componentInstance.directionChange.subscribe((direction) => directions.push(direction));
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, emitted, directions };
}

async function update(fixture: Awaited<ReturnType<typeof setup>>['fixture'], steps: readonly LcStep[]) {
  fixture.componentRef.setInput('steps', steps);
  await fixture.whenStable();
}

const items = (element: HTMLElement) => Array.from(element.querySelectorAll<HTMLElement>('ol > li'));
const buttons = (element: HTMLElement) => Array.from(element.querySelectorAll<HTMLButtonElement>('ol button'));
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]';

/** Nom accessible d'une étape : `aria-label` du bouton, sinon texte non masqué aux lecteurs d'écran. */
function accessibleName(item: HTMLElement): string {
  const button = item.querySelector('button');
  if (button) return button.getAttribute('aria-label') ?? '';
  const read = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node instanceof HTMLElement && node.getAttribute('aria-hidden') === 'true') return '';
    return Array.from(node.childNodes).map(read).join('');
  };
  return read(item).replace(/\s+/g, ' ').trim();
}

/** Nom de l'icône du registre affichée dans la pastille, `null` s'il n'y en a pas (numéro). */
function iconInBadge(item: HTMLElement): string | null {
  const svg = item.querySelector('.lc-stepper__badge lc-icon svg');
  if (!svg) return null;
  for (const [name, markup] of Object.entries(LC_DEFAULT_ICONS)) {
    const holder = document.createElement('div');
    holder.innerHTML = markup;
    if (holder.querySelector('svg')!.innerHTML === svg.innerHTML) return name;
  }
  return 'inconnue';
}

/** Valeur en pixels d'une variable `--lc-sys-*` : lue dans les sources des tokens, jamais dans le composant. */
function tokenPx(cssVar: string): number {
  const name = /var\(--lc-sys-([a-z0-9-]+)\)/.exec(cssVar)?.[1];
  if (!name) throw new Error(`Variable de token attendue, reçu : ${cssVar}`);
  const walk = (root: unknown, path: readonly string[]) => path.reduce<any>((node, key) => node?.[key], root);
  let value: string = walk((sysTokens as any).sys, name.split('-')).$value;
  const ref = /^\{ref\.(.+)\}$/.exec(value);
  if (ref) value = walk((refTokens as any).ref, ref[1].split('.')).$value;
  return parseFloat(value);
}

interface CssDeclaration {
  readonly selector: string;
  readonly media: string | null;
  readonly style: CSSStyleDeclaration;
}

/** Sépare une liste de sélecteurs sur les virgules de premier niveau (pas celles de `:not(a, b)`). */
function splitSelectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += char;
  }
  return [...parts, current].map((part) => part.replace(/\[_ng(?:content|host)-[^\]]*\]/g, '').replace(/\s+/g, ' ').trim());
}

/** Règles CSS du composant, aplaties (jsdom n'évalue pas les `@media` : on lit les règles). Appeler après un rendu. */
function stepperCss(): { rules: CssDeclaration[]; keyframes: CSSKeyframesRule[] } {
  const rules: CssDeclaration[] = [];
  const keyframes: CSSKeyframesRule[] = [];
  const visit = (list: CSSRuleList, media: string | null) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSStyleRule) {
        for (const selector of splitSelectors(rule.selectorText)) rules.push({ selector, media, style: rule.style });
      } else if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules, rule.media.mediaText);
      } else if (rule instanceof CSSKeyframesRule) {
        keyframes.push(rule);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    if (Array.from(sheet.cssRules).some((rule) => rule.cssText.includes('lc-stepper__'))) visit(sheet.cssRules, null);
  }
  return { rules, keyframes };
}

/** Valeur déclarée pour `property` sur `selector` (dans `media` ou hors média) ; la dernière déclaration l'emporte. */
function declared(selector: string, property: string, media: string | null = null): string {
  const matches = stepperCss().rules.filter((rule) => rule.selector === selector && rule.media === media && rule.style.getPropertyValue(property));
  if (!matches.length) throw new Error(`Aucune règle « ${selector} » ne déclare ${property}${media ? ` sous ${media}` : ''}`);
  return matches[matches.length - 1].style.getPropertyValue(property);
}

const filled = (element: HTMLElement) => Array.from(element.querySelectorAll('.lc-stepper__segment')).map((segment) => segment.querySelector('.lc-stepper__fill')!.classList.contains('lc-stepper__fill--on'));

const REDUCED = '(prefers-reduced-motion: reduce)';

/** Appels de `Element.animate` (cible, images clés, options) et résolveurs des `finished` en attente : la fin des animations est pilotée par `endAnimation`. */
const animated: { target: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
const pending: (() => void)[] = [];
const TOKENS = { '--lc-steps-bar-duration': '800ms', '--lc-steps-bar-stagger': '117ms', '--lc-steps-dot-duration': '600ms', '--lc-steps-dot-delay': '40ms', '--lc-steps-dot-easing': 'ease', '--lc-steps-dot-scale': '0.6', '--lc-sys-easing-entrance': 'ease' };

beforeEach(() => {
  animated.length = 0;
  pending.length = 0;
  Object.entries(TOKENS).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
  // jsdom n'a pas `Element.animate` : un faux qui garde les appels et ne finit que sur `endAnimation`.
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value(this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      animated.push({ target: this, keyframes, options });
      const finished = new Promise<void>((resolve) => pending.push(resolve));
      return { finished, cancel() {}, finish() {} } as unknown as Animation;
    },
  });
});

afterEach(() => {
  Object.keys(TOKENS).forEach((name) => document.documentElement.style.removeProperty(name));
  delete (Element.prototype as { animate?: unknown }).animate;
});

describe('LcStepperComponent', () => {
  describe('structure et accessibilité (CA-3)', () => {
    it('CA-3 : rend un nav[aria-label] contenant un ol, un li par étape', async () => {
      const { element } = await setup();
      const nav = element.querySelector('nav')!;
      expect(nav.getAttribute('aria-label')).toBe('Progression');
      expect(nav.querySelector('ol')).not.toBeNull();
      expect(nav.querySelectorAll('ol > li').length).toBe(4);
    });

    it('CA-3 : seule l\'étape en cours porte aria-current="step"', async () => {
      const { element } = await setup();
      const current = element.querySelectorAll('[aria-current]');
      expect(current.length).toBe(1);
      expect(current[0].getAttribute('aria-current')).toBe('step');
      expect(current[0].textContent).toContain('Trois');
    });

    it('CA-3 / CA-11 : une étape faite est un button nommé « Aller à l\'étape n : {nom} »', async () => {
      const { element } = await setup();
      expect(buttons(element).map((button) => button.getAttribute('aria-label'))).toEqual(["Aller à l'étape 1 : Un", "Aller à l'étape 2 : Deux"]);
      expect(buttons(element).every((button) => button.type === 'button')).toBe(true);
    });

    it('CA-3 : le nom « Revenir à : » de la v1 n\'est plus utilisé', async () => {
      const { element } = await setup();
      expect(buttons(element).some((button) => (button.getAttribute('aria-label') ?? '').startsWith('Revenir'))).toBe(false);
    });

    it('CA-3 : les étapes en cours et à venir n\'ont aucun élément focalisable', async () => {
      const { element } = await setup();
      for (const item of items(element).slice(2)) expect(item.querySelector(FOCUSABLE)).toBeNull();
    });

    it('CA-3 : stepSelect émet l\'id d\'une étape faite au clic', async () => {
      const { element, emitted } = await setup();
      buttons(element)[1].click();
      buttons(element)[0].click();
      expect(emitted).toEqual(['s2', 's1']);
    });

    it('CA-3 : stepSelect n\'émet jamais pour une étape en cours ou à venir', async () => {
      const { element, emitted } = await setup();
      for (const item of items(element).slice(2)) {
        item.click();
        item.querySelector<HTMLElement>('.lc-stepper__step')!.click();
      }
      expect(emitted).toEqual([]);
    });

    it('CA-3 : le nom accessible du bouton suit la langue (LC_LABELS en)', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { element } = await setup();
      expect(buttons(element)[0].getAttribute('aria-label')).toBe('Go to step 1: Un');
    });

    it('CA-3 / §13.5 : le marqueur (pastille, numéro, coche) est masqué aux lecteurs d\'écran ; le rang d\'une étape non faite est son numéro', async () => {
      const { element } = await setup();
      const last = items(element)[3];
      expect(last.querySelector('.lc-stepper__marker')!.getAttribute('aria-hidden')).toBe('true');
      expect(last.querySelector('.lc-stepper__badge')!.textContent!.trim()).toBe('4');
      for (const item of items(element)) expect(item.querySelector('.lc-stepper__marker')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('§13.5 : le nom d\'une étape non cliquable est son libellé, sans le numéro décoratif', async () => {
      const { element } = await setup();
      expect(items(element).map(accessibleName)).toEqual(["Aller à l'étape 1 : Un", "Aller à l'étape 2 : Deux", 'Trois', 'Quatre']);
    });

    it('l\'état d\'une étape se met à jour (étape en cours devenue faite)', async () => {
      const { fixture, element } = await setup();
      await update(fixture, STEPS.map((step) => (step.id === 's3' ? { ...step, state: 'done' as const } : step)));
      expect(buttons(element).length).toBe(3);
    });
  });

  describe('forme compacte (CA-4, §13.4)', () => {
    it('CA-4 : forme compacte « Étape n sur N : nom » pour l\'étape en cours, dans .lc-stepper__summary', async () => {
      const { element } = await setup(STEPS, { compact: true });
      expect(element.classList).toContain('lc-stepper--compact');
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 3 sur 4 : Trois');
    });

    it('CA-4 : le résumé suit la langue (LC_LABELS en)', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { element } = await setup(STEPS, { compact: true });
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Step 3 of 4 : Trois');
    });

    it('CA-4 / §13.4 : (CSS) compact vrai garde la liste et la piste, masque les libellés à l\'écran sans les retirer, et montre le résumé', async () => {
      const { element } = await setup(STEPS, { compact: true });
      expect(getComputedStyle(element.querySelector('.lc-stepper__list')!).display).not.toBe('none');
      expect(element.querySelector('.lc-stepper__rail')).not.toBeNull();
      expect(element.querySelectorAll('.lc-stepper__marker').length).toBe(4);
      expect(getComputedStyle(element.querySelector('.lc-stepper__summary')!).display).not.toBe('none');
      for (const text of Array.from(element.querySelectorAll('.lc-stepper__text'))) {
        const style = getComputedStyle(text);
        expect(style.position).toBe('absolute');
        expect(style.overflow).toBe('hidden');
        expect(style.display).not.toBe('none');
        expect(style.visibility).not.toBe('hidden');
      }
      expect(declared('.lc-stepper--compact:not(.lc-stepper--vertical) .lc-stepper__text', 'inline-size')).toBe('1px');
    });

    it('CA-4 : compact vrai garde le nom accessible complet des étapes (libellé hors écran, présent dans le DOM)', async () => {
      const { element } = await setup(STEPS, { compact: true });
      expect(buttons(element).map((button) => button.getAttribute('aria-label'))).toEqual(["Aller à l'étape 1 : Un", "Aller à l'étape 2 : Deux"]);
      expect(items(element)[2].textContent).toContain('Trois');
    });

    it('CA-4 : compact faux montre les libellés et masque le résumé ; la liste et la piste restent', async () => {
      const { element } = await setup(STEPS, { compact: false });
      expect(getComputedStyle(element.querySelector('.lc-stepper__summary')!).display).toBe('none');
      expect(getComputedStyle(element.querySelector('.lc-stepper__list')!).display).not.toBe('none');
      expect(getComputedStyle(element.querySelector('.lc-stepper__text')!).position).not.toBe('absolute');
      expect(element.querySelector('.lc-stepper__rail')).not.toBeNull();
    });

    it('CA-4 : compact faux force la liste complète (classe --full, pas --compact)', async () => {
      const { element } = await setup(STEPS, { compact: false });
      expect(element.classList).toContain('lc-stepper--full');
      expect(element.classList).not.toContain('lc-stepper--compact');
    });

    it('CA-4 : compact "auto" (défaut) ne pose ni --compact ni --full ; le seuil est une règle @media (max-width: 767.98px)', async () => {
      const { element } = await setup();
      expect(element.classList).not.toContain('lc-stepper--compact');
      expect(element.classList).not.toContain('lc-stepper--full');
      const media = '(max-width: 767.98px)';
      expect(declared(':not(.lc-stepper--full, .lc-stepper--vertical) .lc-stepper__summary', 'display', media)).toBe('block');
      expect(declared(':not(.lc-stepper--full, .lc-stepper--vertical) .lc-stepper__text', 'position', media)).toBe('absolute');
    });

    it('§13.4 : une étape cliquable offre une cible d\'au moins 44 px', async () => {
      await setup();
      expect(tokenPx(declared('.lc-stepper__step', 'min-block-size'))).toBeGreaterThanOrEqual(44);
      expect(tokenPx(declared('.lc-stepper__step', 'min-inline-size'))).toBeGreaterThanOrEqual(44);
    });

    it('CA-4 : la piste décorative est masquée aux lecteurs d\'écran et ses segments sont pleins jusqu\'à l\'étape en cours', async () => {
      const { element } = await setup(STEPS, { compact: true });
      expect(element.querySelector('.lc-stepper__rail')!.getAttribute('aria-hidden')).toBe('true');
      expect(filled(element)).toEqual([true, true, false]);
    });

    it('CA-4 : sans étape en cours, la forme compacte montre la première étape non faite', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done' },
        { id: 'b', label: 'B', state: 'upcoming' },
        { id: 'c', label: 'C', state: 'upcoming' },
      ];
      const { element } = await setup(steps, { compact: true });
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 2 sur 3 : B');
      expect(filled(element)).toEqual([true, false]);
    });

    it('CA-4 : sans étape en cours ni à venir, la forme compacte montre la dernière étape', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done' },
        { id: 'b', label: 'B', state: 'done' },
      ];
      const { element } = await setup(steps, { compact: true });
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 2 sur 2 : B');
      expect(element.querySelector('[aria-current]')).toBeNull();
      expect(filled(element)).toEqual([true]);
    });

    it('liste vide : aucun li, aucune piste, résumé vide, pas d\'erreur', async () => {
      const { element } = await setup([], { compact: true });
      expect(element.querySelectorAll('ol > li').length).toBe(0);
      expect(element.querySelector('.lc-stepper__rail')).toBeNull();
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('');
    });
  });

  describe('CA-10 : anatomie horizontale, pastilles reliées par une piste', () => {
    it('CA-10 : la pastille en cours fait 40 px, les autres 32 px (valeurs des tokens utilisés)', async () => {
      await setup();
      expect(tokenPx(declared('.lc-stepper__badge', 'inline-size'))).toBe(32);
      expect(tokenPx(declared('.lc-stepper__badge', 'block-size'))).toBe(32);
      expect(tokenPx(declared('.lc-stepper__item--current .lc-stepper__badge', 'inline-size'))).toBe(40);
      expect(tokenPx(declared('.lc-stepper__item--current .lc-stepper__badge', 'block-size'))).toBe(40);
      // Zone fixe de 40 px : la pastille de 32 px reste centrée, la piste passe à mi-hauteur.
      expect(tokenPx(declared('.lc-stepper__marker', 'inline-size'))).toBe(40);
      expect(tokenPx(declared('.lc-stepper__marker', 'block-size'))).toBe(40);
    });

    it('CA-10 : l\'étape en cours porte un anneau de 4 px en primary-container, visible seulement sur elle', async () => {
      await setup();
      const ring = declared('.lc-stepper__badge::after', 'border');
      expect(tokenPx(/^(var\(--lc-sys-space-\d+\))/.exec(ring)![1])).toBe(4);
      expect(ring).toMatch(/solid var\(--lc-sys-color-primary-container\)$/);
      expect(declared('.lc-stepper__badge::after', 'opacity')).toBe('0');
      expect(declared('.lc-stepper__item--current .lc-stepper__badge::after', 'opacity')).toBe('1');
    });

    it('CA-10 : faite = remplie primary avec une coche on-primary ; en cours = remplie primary avec son numéro on-primary', async () => {
      const { element } = await setup();
      const [done, , current] = items(element);
      expect(iconInBadge(done)).toBe('check');
      expect(done.querySelector('.lc-stepper__badge')!.textContent!.trim()).toBe('');
      expect(declared('.lc-stepper__item--done .lc-stepper__badge', 'background')).toMatch(/--lc-sys-color-primary\)/);
      expect(declared('.lc-stepper__item--done .lc-stepper__badge', 'color')).toBe('var(--lc-sys-color-on-primary)');
      expect(iconInBadge(current)).toBeNull();
      expect(current.querySelector('.lc-stepper__badge')!.textContent!.trim()).toBe('3');
      expect(declared('.lc-stepper__item--current .lc-stepper__badge', 'background')).toMatch(/--lc-sys-color-primary\)/);
      expect(declared('.lc-stepper__item--current .lc-stepper__badge', 'color')).toBe('var(--lc-sys-color-on-primary)');
    });

    it('CA-10 : à venir = numéro on-surface-muted sur fond surface, bord de 2 px border-strong', async () => {
      const { element } = await setup();
      expect(iconInBadge(items(element)[3])).toBeNull();
      expect(items(element)[3].querySelector('.lc-stepper__badge')!.textContent!.trim()).toBe('4');
      expect(declared('.lc-stepper__badge', 'background')).toBe('var(--lc-sys-color-surface)');
      expect(declared('.lc-stepper__badge', 'color')).toBe('var(--lc-sys-color-on-surface-muted)');
      expect(declared('.lc-stepper__badge', 'border')).toMatch(/^var\(--lc-sys-border-width-thick\) solid var\(--lc-sys-color-border-strong\)$/);
      expect(tokenPx('var(--lc-sys-border-width-thick)')).toBe(2);
    });

    it('CA-10 : l\'étape en cours a un libellé en 600, les autres en 500', async () => {
      await setup();
      expect(declared('.lc-stepper__name', 'font-weight')).toBe('var(--lc-sys-font-weight-medium)');
      expect(declared('.lc-stepper__item--current .lc-stepper__name', 'font-weight')).toBe('var(--lc-sys-font-weight-semibold)');
      expect(tokenPx('var(--lc-sys-font-weight-medium)')).toBe(500);
      expect(tokenPx('var(--lc-sys-font-weight-semibold)')).toBe(600);
    });

    it('CA-10 : la piste est un trait de 2 px en border, rempli en primary sur les segments parcourus (échelle nulle tant qu\'ils ne le sont pas)', async () => {
      await setup();
      expect(declared('.lc-stepper__rail', 'block-size')).toBe('var(--lc-sys-border-width-thick)');
      expect(declared('.lc-stepper__rail', 'background')).toMatch(/--lc-sys-color-border\)+$/);
      expect(declared('.lc-stepper__fill', 'background')).toMatch(/--lc-sys-color-primary\)+$/);
      expect(declared('.lc-stepper__fill', 'scale')).toBe('0 1');
      expect(declared('.lc-stepper__fill--on', 'scale')).toBe('1');
    });

    it('CA-10 : la piste précède la liste dans le corps et chaque étape est une pastille de la liste', async () => {
      const { element } = await setup();
      const body = element.querySelector('.lc-stepper__body')!;
      expect(Array.from(body.children).map((child) => child.tagName.toLowerCase() + '.' + child.className.split(' ')[0])).toEqual(['span.lc-stepper__rail', 'ol.lc-stepper__list']);
      expect(element.querySelectorAll('.lc-stepper__badge').length).toBe(4);
    });

    it('CA-10 : la piste a un segment par intervalle, plein pour les index inférieurs à l\'étape en cours', async () => {
      for (const current of [0, 1, 2, 3, 4]) {
        const { element } = await setup(stepsAt(current));
        expect(filled(element)).toEqual([0, 1, 2, 3].map((segment) => segment < current));
      }
    });

    it('CA-10 : les segments pleins suivent une mise à jour de `steps`', async () => {
      const { fixture, element } = await setup(stepsAt(1));
      expect(filled(element)).toEqual([true, false, false, false]);
      await update(fixture, stepsAt(3));
      expect(filled(element)).toEqual([true, true, true, false]);
    });

    it('CA-10 : avec une seule étape, ni piste ni division par zéro', async () => {
      const { element } = await setup([{ id: 'a', label: 'Seule', state: 'current' }]);
      expect(element.querySelectorAll('ol > li').length).toBe(1);
      expect(element.querySelector('.lc-stepper__rail')).toBeNull();
      expect(element.querySelector('.lc-stepper__fill')).toBeNull();
      expect(element.innerHTML).not.toContain('NaN');
      expect(element.innerHTML).not.toContain('Infinity');
    });

    it('CA-10 : sans étape, ni piste ni erreur', async () => {
      const { element } = await setup([]);
      expect(element.querySelector('.lc-stepper__rail')).toBeNull();
      expect(element.innerHTML).not.toContain('NaN');
    });

    it('CA-10 : la piste apparaît dès la deuxième étape', async () => {
      const { fixture, element } = await setup([{ id: 'a', label: 'A', state: 'current' }]);
      expect(element.querySelector('.lc-stepper__rail')).toBeNull();
      await update(fixture, [{ id: 'a', label: 'A', state: 'done' }, { id: 'b', label: 'B', state: 'current' }]);
      expect(element.querySelector('.lc-stepper__rail')).not.toBeNull();
      expect(filled(element)).toEqual([true]);
    });
  });

  describe('CA-11 : navigation au clic (linear)', () => {
    it('CA-11 : `linear` est vrai par défaut : seules les étapes faites sont des boutons', async () => {
      const { element } = await setup();
      expect(items(element).map((item) => item.querySelector('button') !== null)).toEqual([true, true, false, false]);
    });

    it('CA-11 : `linear` vrai explicite se comporte comme le défaut', async () => {
      const { element } = await setup(STEPS, { linear: true });
      expect(buttons(element).length).toBe(2);
    });

    it('CA-11 : `linear` faux : toute étape non désactivée est un bouton (faites, en cours, à venir)', async () => {
      const { element } = await setup(STEPS, { linear: false });
      expect(buttons(element).map((button) => button.getAttribute('aria-label'))).toEqual([
        "Aller à l'étape 1 : Un",
        "Aller à l'étape 2 : Deux",
        "Aller à l'étape 3 : Trois",
        "Aller à l'étape 4 : Quatre",
      ]);
    });

    it('CA-11 : `linear` faux : l\'étape en cours reste marquée aria-current même si elle est un bouton', async () => {
      const { element } = await setup(STEPS, { linear: false });
      expect(element.querySelectorAll('[aria-current="step"]').length).toBe(1);
      expect(items(element)[2].getAttribute('aria-current')).toBe('step');
    });

    it('CA-11 : `linear` faux : stepSelect émet l\'id de chaque étape cliquée, en avant comme en arrière', async () => {
      const { element, emitted } = await setup(STEPS, { linear: false });
      buttons(element)[3].click();
      buttons(element)[0].click();
      buttons(element)[2].click();
      expect(emitted).toEqual(['s4', 's1', 's3']);
    });

    it('CA-11 : basculer `linear` à l\'exécution change les étapes cliquables', async () => {
      const { fixture, element } = await setup();
      expect(buttons(element).length).toBe(2);
      fixture.componentRef.setInput('linear', false);
      await fixture.whenStable();
      expect(buttons(element).length).toBe(4);
      fixture.componentRef.setInput('linear', true);
      await fixture.whenStable();
      expect(buttons(element).length).toBe(2);
    });

    it('CA-11 : une étape désactivée n\'est jamais un bouton, avec `linear` vrai ou faux, même faite', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done', disabled: true },
        { id: 'b', label: 'B', state: 'done' },
        { id: 'c', label: 'C', state: 'current' },
        { id: 'd', label: 'D', state: 'upcoming', disabled: true },
      ];
      for (const linear of [true, false]) {
        const { element } = await setup(steps, { linear });
        const list = items(element);
        expect(list[0].querySelector(FOCUSABLE)).toBeNull();
        expect(list[3].querySelector(FOCUSABLE)).toBeNull();
        expect(list[0].querySelector('.lc-stepper__step')!.getAttribute('aria-disabled')).toBe('true');
        expect(list[3].querySelector('.lc-stepper__step')!.getAttribute('aria-disabled')).toBe('true');
        expect(list[1].querySelector('button')).not.toBeNull();
      }
    });

    it('CA-11 : stepSelect n\'est jamais émis pour une étape désactivée, quel que soit `linear`', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done', disabled: true },
        { id: 'b', label: 'B', state: 'upcoming', disabled: true },
        { id: 'c', label: 'C', state: 'upcoming' },
      ];
      for (const linear of [true, false]) {
        const { element, emitted } = await setup(steps, { linear });
        for (const item of items(element).slice(0, 2)) {
          item.click();
          item.querySelector<HTMLElement>('.lc-stepper__step')!.click();
        }
        expect(emitted).toEqual([]);
      }
    });

    it('CA-11 : une étape en cours désactivée n\'est pas un bouton en mode non linéaire', async () => {
      const steps: LcStep[] = [{ id: 'a', label: 'A', state: 'current', disabled: true }, { id: 'b', label: 'B', state: 'upcoming' }];
      const { element } = await setup(steps, { linear: false });
      expect(items(element)[0].querySelector('button')).toBeNull();
      expect(items(element)[1].querySelector('button')).not.toBeNull();
    });

    it('CA-11 : une étape désactivée porte la classe --disabled et l\'opacité réduite du token', async () => {
      const { element } = await setup([{ id: 'a', label: 'A', state: 'done' }, { id: 'b', label: 'B', state: 'upcoming', disabled: true }]);
      expect(items(element)[1].classList).toContain('lc-stepper__item--disabled');
      expect(items(element)[0].classList).not.toContain('lc-stepper__item--disabled');
      expect(declared('.lc-stepper__item--disabled', 'opacity')).toBe('var(--lc-sys-state-disabled-opacity)');
    });

    it('CA-11 : les noms accessibles en français (étape en erreur « (à corriger) », facultative « (facultative) »)', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'Un', state: 'done', invalid: true },
        { id: 'b', label: 'Deux', state: 'done', optional: true },
        { id: 'c', label: 'Trois', state: 'done', invalid: true, optional: true },
        { id: 'd', label: 'Quatre', state: 'current' },
      ];
      const { element } = await setup(steps);
      const [a, b, c] = buttons(element).map((button) => button.getAttribute('aria-label')!);
      expect(a).toBe("Aller à l'étape 1 : Un (à corriger)");
      expect(b).toBe("Aller à l'étape 2 : Deux (facultative)");
      expect(c).toContain("Aller à l'étape 3 : Trois");
      expect(c).toContain('(à corriger)');
      expect(c).toContain('(facultative)');
    });

    it('CA-11 : les noms accessibles en anglais (« (to fix) », « (optional) »)', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const steps: LcStep[] = [
        { id: 'a', label: 'One', state: 'done', invalid: true },
        { id: 'b', label: 'Two', state: 'done', optional: true },
        { id: 'c', label: 'Three', state: 'current' },
      ];
      const { element } = await setup(steps);
      expect(buttons(element).map((button) => button.getAttribute('aria-label'))).toEqual(['Go to step 1: One (to fix)', 'Go to step 2: Two (optional)']);
    });

    it('CA-11 / §13.5 : une étape non cliquable en erreur ou facultative garde un nom complet lu par les lecteurs d\'écran (fr)', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'Un', state: 'done' },
        { id: 'b', label: 'Deux', state: 'current', invalid: true },
        { id: 'c', label: 'Trois', state: 'upcoming', optional: true },
        { id: 'd', label: 'Quatre', state: 'upcoming', disabled: true, invalid: true },
      ];
      const { element } = await setup(steps);
      expect(accessibleName(items(element)[1])).toBe('Deux (à corriger)');
      expect(accessibleName(items(element)[2])).toBe('Trois (facultative)');
      expect(accessibleName(items(element)[3])).toBe('Quatre (à corriger)');
    });

    it('CA-11 : le nom d\'une étape non cliquable suit la langue (en)', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const steps: LcStep[] = [
        { id: 'a', label: 'One', state: 'current', invalid: true },
        { id: 'b', label: 'Two', state: 'upcoming', optional: true },
      ];
      const { element } = await setup(steps);
      expect(accessibleName(items(element)[0])).toBe('One (to fix)');
      expect(accessibleName(items(element)[1])).toBe('Two (optional)');
    });

    it('CA-11 : stepSelect émet l\'id exact même quand le libellé est identique à celui d\'une autre étape', async () => {
      const steps: LcStep[] = [
        { id: 'x1', label: 'Même', state: 'done' },
        { id: 'x2', label: 'Même', state: 'done' },
        { id: 'x3', label: 'Fin', state: 'current' },
      ];
      const { element, emitted } = await setup(steps);
      buttons(element)[1].click();
      expect(emitted).toEqual(['x2']);
    });

    it('CA-11 : le composant ne change jamais lui-même l\'étape en cours', async () => {
      const { element, emitted } = await setup();
      buttons(element)[0].click();
      await Promise.resolve();
      expect(emitted).toEqual(['s1']);
      expect(items(element)[2].getAttribute('aria-current')).toBe('step');
      expect(items(element)[0].getAttribute('aria-current')).toBeNull();
    });
  });

  describe('CA-12 : sens du changement et directionChange', () => {
    it('CA-12 : aucune classe de sens ni émission au premier rendu', async () => {
      const { element, directions } = await setup(stepsAt(2));
      expect(element.classList).not.toContain('lc-stepper--forward');
      expect(element.classList).not.toContain('lc-stepper--backward');
      expect(directions).toEqual([]);
    });

    it('CA-12 : avancer pose lc-stepper--forward sur l\'hôte et émet « forward »', async () => {
      const { fixture, element, directions } = await setup(stepsAt(1));
      await update(fixture, stepsAt(2));
      expect(element.classList).toContain('lc-stepper--forward');
      expect(element.classList).not.toContain('lc-stepper--backward');
      expect(directions).toEqual(['forward']);
    });

    it('CA-12 : reculer émet « backward » et ne joue aucune animation (la classe de sens est retirée aussitôt)', async () => {
      const { fixture, element, directions } = await setup(stepsAt(3));
      animated.length = 0;
      await update(fixture, stepsAt(2));
      expect(directions).toEqual(['backward']);
      expect(animated).toEqual([]);
      expect(element.classList).not.toContain('lc-stepper--backward');
    });

    it('CA-12 : deux changements de même sens émettent chacun', async () => {
      const { fixture, directions } = await setup(stepsAt(0));
      await update(fixture, stepsAt(1));
      await update(fixture, stepsAt(2));
      expect(directions).toEqual(['forward', 'forward']);
    });

    it('CA-12 : deux changements de même sens, séparés par la fin des animations, émettent chacun', async () => {
      const { fixture, element, directions } = await setup(stepsAt(0));
      await update(fixture, stepsAt(1));
      await endAnimation();
      await fixture.whenStable();
      await update(fixture, stepsAt(2));
      expect(directions).toEqual(['forward', 'forward']);
      expect(element.classList).toContain('lc-stepper--forward');
    });

    it('CA-12 : un changement de sens contraire inverse la classe et émet le nouveau sens', async () => {
      const { fixture, element, directions } = await setup(stepsAt(1));
      await update(fixture, stepsAt(2));
      await update(fixture, stepsAt(1));
      expect(directions).toEqual(['forward', 'backward']);
      expect(element.classList).not.toContain('lc-stepper--forward');
    });

    it('CA-12 : un saut de plusieurs étapes n\'émet qu\'une fois, dans le bon sens', async () => {
      const { fixture, directions } = await setup(stepsAt(0));
      await update(fixture, stepsAt(4));
      await update(fixture, stepsAt(1));
      expect(directions).toEqual(['forward', 'backward']);
    });

    it('CA-12 : sans changement d\'étape en cours (mêmes états, libellé modifié, nouvelle instance), rien n\'est émis', async () => {
      const { fixture, element, directions } = await setup(stepsAt(2));
      await update(fixture, stepsAt(2).map((step) => ({ ...step })));
      await update(fixture, stepsAt(2).map((step) => ({ ...step, label: step.label + ' bis', optional: true })));
      expect(directions).toEqual([]);
      expect(element.classList).not.toContain('lc-stepper--forward');
      expect(element.classList).not.toContain('lc-stepper--backward');
    });

    it('CA-12 : le sens est calculé sur l\'étape en cours, pas sur une autre étape qui change d\'état', async () => {
      const { fixture, directions } = await setup(stepsAt(2));
      await update(fixture, stepsAt(2).map((step, index) => (index === 4 ? { ...step, state: 'done' as const } : step)));
      expect(directions).toEqual([]);
    });

    it('CA-12 : changer l\'orientation ou `linear` n\'émet rien', async () => {
      const { fixture, directions } = await setup(stepsAt(2));
      fixture.componentRef.setInput('orientation', 'vertical');
      await fixture.whenStable();
      fixture.componentRef.setInput('linear', false);
      await fixture.whenStable();
      expect(directions).toEqual([]);
    });

    it('CA-12 : la classe de sens reste posée tant que les animations de l\'étape atteinte jouent, puis est retirée', async () => {
      const { fixture, element, directions } = await setup(stepsAt(1));
      await update(fixture, stepsAt(2));
      expect(element.classList).toContain('lc-stepper--forward');
      await endAnimation();
      await fixture.whenStable();
      expect(element.classList).not.toContain('lc-stepper--forward');
      expect(directions).toEqual(['forward']);
    });

    it('CA-12 : une animation qui finit après un nouveau changement ne retire pas la classe du nouveau sens', async () => {
      const { fixture, element } = await setup(stepsAt(1));
      await update(fixture, stepsAt(2));
      const [first] = pending.splice(0);
      await update(fixture, stepsAt(3));
      first();
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
      expect(element.classList).toContain('lc-stepper--forward');
    });

    it('CA-12 : le sens s\'applique aussi en vertical', async () => {
      const { fixture, element, directions } = await setup(stepsAt(1), { orientation: 'vertical' });
      await update(fixture, stepsAt(2));
      expect(element.classList).toContain('lc-stepper--forward');
      expect(directions).toEqual(['forward']);
    });

    it('CA-12 : la feuille du composant ne déclare ni transition ni @keyframes : le mouvement vient des tokens `steps.*` via lcAnimate', async () => {
      await setup();
      const { rules, keyframes } = stepperCss();
      expect(keyframes).toEqual([]);
      expect(rules.filter((rule) => rule.style.getPropertyValue('transition') || rule.style.getPropertyValue('animation')).map((rule) => rule.selector)).toEqual([]);
    });

    it('§13.3 : aucune durée ni courbe en dur hors du bloc prefers-reduced-motion', async () => {
      await setup();
      const literal = /(^|[\s,(])\d*\.?\d+m?s\b|cubic-bezier|\b(ease|ease-in|ease-out|ease-in-out)\b/;
      const offenders = stepperCss()
        .rules.filter((rule) => rule.media !== REDUCED)
        .flatMap((rule) => Array.from(rule.style).filter((property) => /^(transition|animation)/.test(property) && literal.test(rule.style.getPropertyValue(property).replace(/\s*linear\b/, ''))).map((property) => `${rule.selector} ${property}`));
      expect(offenders).toEqual([]);
    });
  });

  describe('CA-13 : prefers-reduced-motion: reduce', () => {
    // jsdom n'évalue pas les @media : on lit les règles CSS du composant.
    it('CA-13 : le bloc reduced-motion ne déclare aucune transition ou durée non nulle', async () => {
      await setup();
      for (const rule of stepperCss().rules.filter((candidate) => candidate.media === REDUCED)) {
        const transition = rule.style.getPropertyValue('transition');
        if (transition) expect(transition).toBe('none');
        const delay = rule.style.getPropertyValue('transition-delay');
        if (delay) expect(delay).toMatch(/^0(s|ms)$/);
      }
    });

    it('CA-13 : aucune transformation (transform, scale, translate, rotate) n\'est appliquée hors du remplissage de la piste', async () => {
      await setup();
      const offenders = stepperCss()
        .rules.filter((rule) => !rule.selector.includes('.lc-stepper__fill')) // l'échelle du remplissage (0 1 puis 1) est l'état que le composant anime
        .flatMap((rule) =>
          Array.from(rule.style)
            .filter((property) => /^(transform|scale|translate|rotate|perspective)/.test(property) || /\b(scale|translate|rotate|matrix)[a-z0-9]*\(/.test(rule.style.getPropertyValue(property)))
            .map((property) => `${rule.selector} ${property}`),
        );
      expect(offenders).toEqual([]);
    });

    it('CA-13 : sous mouvement réduit, aucune animation n\'est lancée (lcAnimate rend une animation finie) mais la classe de sens est retirée', async () => {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) => ({ matches: query === REDUCED, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
      try {
        const { fixture, element, directions } = await setup(stepsAt(1));
        await update(fixture, stepsAt(2));
        await new Promise((resolve) => setTimeout(resolve));
        await fixture.whenStable();
        expect(animated).toEqual([]);
        expect(directions).toEqual(['forward']);
        expect(element.classList).not.toContain('lc-stepper--forward');
      } finally {
        window.matchMedia = original;
      }
    });
  });

  describe('CA-14 : vertical, facultative, erreur, désactivée, icône', () => {
    it('CA-14 : orientation="vertical" pose --vertical et met pastilles en colonne, libellé à droite, piste verticale', async () => {
      const { element } = await setup(STEPS, { orientation: 'vertical' });
      expect(element.classList).toContain('lc-stepper--vertical');
      expect(declared('.lc-stepper--vertical .lc-stepper__list', 'grid-auto-flow')).toBe('row');
      expect(declared('.lc-stepper--vertical .lc-stepper__step', 'flex-direction')).toBe('row');
      expect(declared('.lc-stepper--vertical .lc-stepper__rail', 'inline-size')).toBe('var(--lc-sys-border-width-thick)');
      expect(declared('.lc-stepper--vertical .lc-stepper__fill', 'scale')).toBe('1 0');
      expect(declared('.lc-stepper--vertical .lc-stepper__fill--on', 'scale')).toBe('1');
    });

    it('CA-14 : horizontal par défaut (pas de classe --vertical, étapes en ligne, libellé sous la pastille)', async () => {
      const { element } = await setup();
      expect(element.classList).not.toContain('lc-stepper--vertical');
      expect(declared('.lc-stepper__list', 'grid-auto-flow')).toBe('column');
      expect(declared('.lc-stepper__step', 'flex-direction')).toBe('column');
    });

    it('CA-14 : en vertical, la structure nav > ol > li, aria-current et les boutons restent identiques', async () => {
      const { element } = await setup(STEPS, { orientation: 'vertical' });
      expect(element.querySelectorAll('nav > .lc-stepper__body > ol > li').length).toBe(4);
      expect(element.querySelectorAll('[aria-current="step"]').length).toBe(1);
      expect(buttons(element).map((button) => button.getAttribute('aria-label'))).toEqual(["Aller à l'étape 1 : Un", "Aller à l'étape 2 : Deux"]);
      expect(element.querySelector('.lc-stepper__rail')).not.toBeNull();
    });

    it('CA-14 : en vertical, `compact` est ignoré : libellés affichés, aucun résumé', async () => {
      for (const compact of [true, 'auto'] as const) {
        const { element } = await setup(STEPS, { orientation: 'vertical', compact });
        expect(getComputedStyle(element.querySelector('.lc-stepper__summary')!).display).toBe('none');
        for (const text of Array.from(element.querySelectorAll('.lc-stepper__text'))) expect(getComputedStyle(text).position).not.toBe('absolute');
      }
      expect(declared(':not(.lc-stepper--full, .lc-stepper--vertical) .lc-stepper__text', 'position', '(max-width: 767.98px)')).toBe('absolute');
    });

    it('CA-14 : étape facultative : mention « Facultative » visible (masquée aux lecteurs), « (facultative) » dans le nom', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done' },
        { id: 'b', label: 'B', state: 'current', optional: true },
        { id: 'c', label: 'C', state: 'upcoming' },
      ];
      const { element } = await setup(steps);
      const optional = items(element)[1].querySelector('.lc-stepper__optional')!;
      expect(optional.textContent!.trim()).toBe('Facultative');
      expect(optional.getAttribute('aria-hidden')).toBe('true');
      expect(items(element)[1].classList).toContain('lc-stepper__item--optional');
      expect(element.querySelectorAll('.lc-stepper__optional').length).toBe(1);
      expect(accessibleName(items(element)[1])).toBe('B (facultative)');
      expect(declared('.lc-stepper__optional', 'font-size')).toBe('var(--lc-sys-font-size-sm)');
      expect(declared('.lc-stepper__optional', 'color')).toBe('var(--lc-sys-color-on-surface-muted)');
    });

    it('CA-14 : la mention facultative suit la langue (en : « Optional »)', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { element } = await setup([{ id: 'a', label: 'A', state: 'current', optional: true }]);
      expect(element.querySelector('.lc-stepper__optional')!.textContent!.trim()).toBe('Optional');
    });

    it('CA-14 : une étape facultative cliquable porte « (facultative) » dans le nom du bouton, la mention visible reste hors du nom', async () => {
      const { element } = await setup([{ id: 'a', label: 'A', state: 'done', optional: true }, { id: 'b', label: 'B', state: 'current' }]);
      expect(buttons(element)[0].getAttribute('aria-label')).toBe("Aller à l'étape 1 : A (facultative)");
      expect(items(element)[0].querySelector('.lc-stepper__optional')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('CA-14 : étape en erreur : icône circle-alert (même si l\'étape est faite, en cours ou à venir), classe --invalid, bord et icône error', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done', invalid: true },
        { id: 'b', label: 'B', state: 'current', invalid: true },
        { id: 'c', label: 'C', state: 'upcoming', invalid: true },
        { id: 'd', label: 'D', state: 'upcoming' },
      ];
      const { element } = await setup(steps);
      expect(items(element).map(iconInBadge)).toEqual(['circle-alert', 'circle-alert', 'circle-alert', null]);
      expect(items(element).map((item) => item.classList.contains('lc-stepper__item--invalid'))).toEqual([true, true, true, false]);
      expect(declared('.lc-stepper__item--invalid .lc-stepper__badge', 'border-color')).toBe('var(--lc-sys-color-error)');
      expect(declared('.lc-stepper__item--invalid .lc-stepper__badge', 'color')).toBe('var(--lc-sys-color-error)');
    });

    it('CA-14 : le libellé d\'une étape en erreur reste lisible (non estompé, non retiré)', async () => {
      const { element } = await setup([{ id: 'a', label: 'Adresse', state: 'current', invalid: true }, { id: 'b', label: 'B', state: 'upcoming' }]);
      expect(element.querySelector('.lc-stepper__item--invalid .lc-stepper__name')!.textContent).toBe('Adresse');
      expect(stepperCss().rules.filter((rule) => rule.selector.includes('--invalid') && rule.selector.includes('__name'))).toEqual([]);
    });

    it('CA-14 : étape désactivée : non cliquable, opacité réduite, classe --disabled, aria-disabled', async () => {
      const { element } = await setup(STEPS.map((step, index) => (index === 1 ? { ...step, disabled: true } : step)));
      const disabled = items(element)[1];
      expect(disabled.querySelector('button')).toBeNull();
      expect(disabled.classList).toContain('lc-stepper__item--disabled');
      expect(disabled.querySelector('.lc-stepper__step')!.getAttribute('aria-disabled')).toBe('true');
      expect(buttons(element).length).toBe(1);
    });

    it('CA-14 : `icon` remplace le numéro d\'une étape en cours ou à venir', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done' },
        { id: 'b', label: 'B', state: 'current', icon: 'info' },
        { id: 'c', label: 'C', state: 'upcoming', icon: 'user' },
        { id: 'd', label: 'D', state: 'upcoming' },
      ];
      const { element } = await setup(steps);
      expect(items(element).map(iconInBadge)).toEqual(['check', 'info', 'user', null]);
      expect(items(element)[1].querySelector('.lc-stepper__badge')!.textContent!.trim()).toBe('');
      expect(items(element)[3].querySelector('.lc-stepper__badge')!.textContent!.trim()).toBe('4');
    });

    it('CA-14 : `icon` ne remplace ni la coche d\'une étape faite ni l\'icône d\'erreur', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done', icon: 'info' },
        { id: 'b', label: 'B', state: 'current', icon: 'info', invalid: true },
        { id: 'c', label: 'C', state: 'done', icon: 'info', invalid: true },
      ];
      const { element } = await setup(steps);
      expect(items(element).map(iconInBadge)).toEqual(['check', 'circle-alert', 'circle-alert']);
    });

    it('CA-14 : l\'icône est décorative et masquée aux lecteurs, le nom reste le libellé', async () => {
      const { element } = await setup([{ id: 'a', label: 'A', state: 'current', icon: 'info' }, { id: 'b', label: 'B', state: 'upcoming' }]);
      expect(items(element)[0].querySelector('lc-icon')!.getAttribute('aria-hidden')).toBe('true');
      expect(accessibleName(items(element)[0])).toBe('A');
    });
  });

  describe('CA-15 : compatibilité avec un consommateur v1', () => {
    @Component({
      imports: [LcStepperComponent],
      template: `<lc-stepper ariaLabel="Progression" [steps]="steps()" [compact]="compact" (stepSelect)="picked.push($event)" />`,
    })
    class V1ConsumerComponent {
      readonly steps = signal<readonly LcStep[]>([
        { id: 'a', label: 'Un', state: 'done' },
        { id: 'b', label: 'Deux', state: 'done' },
        { id: 'c', label: 'Trois', state: 'current' },
        { id: 'd', label: 'Quatre', state: 'upcoming' },
      ]);
      compact: 'auto' | boolean = true;
      readonly picked: string[] = [];
    }

    async function v1() {
      const fixture = TestBed.createComponent(V1ConsumerComponent);
      await fixture.whenStable();
      return { fixture, element: fixture.nativeElement as HTMLElement };
    }

    it('CA-15 : `steps` avec `state`, `compact` et `stepSelect` seuls : même structure, mêmes étapes cliquables, même résumé', async () => {
      const { element } = await v1();
      expect(element.querySelector('nav')!.getAttribute('aria-label')).toBe('Progression');
      expect(element.querySelectorAll('nav ol > li').length).toBe(4);
      expect(element.querySelectorAll('[aria-current="step"]').length).toBe(1);
      expect(items(element)[2].getAttribute('aria-current')).toBe('step');
      expect(buttons(element).length).toBe(2);
      expect(items(element).slice(2).every((item) => item.querySelector(FOCUSABLE) === null)).toBe(true);
      expect(element.querySelector('lc-stepper')!.classList).toContain('lc-stepper--compact');
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 3 sur 4 : Trois');
    });

    it('CA-15 : le clic sur une étape faite émet son id ; rien pour les autres ; seul le nom accessible change', async () => {
      const { fixture, element } = await v1();
      buttons(element)[1].click();
      buttons(element)[0].click();
      for (const item of items(element).slice(2)) item.querySelector<HTMLElement>('.lc-stepper__step')!.click();
      expect(fixture.componentInstance.picked).toEqual(['b', 'a']);
      expect(buttons(element).map((button) => button.getAttribute('aria-label'))).toEqual(["Aller à l'étape 1 : Un", "Aller à l'étape 2 : Deux"]);
    });

    it('CA-15 : le consommateur reste maître de l\'étape en cours (rien ne change sans mise à jour de `steps`)', async () => {
      const { fixture, element } = await v1();
      buttons(element)[0].click();
      await fixture.whenStable();
      expect(items(element)[2].getAttribute('aria-current')).toBe('step');
      fixture.componentInstance.steps.set([
        { id: 'a', label: 'Un', state: 'current' },
        { id: 'b', label: 'Deux', state: 'upcoming' },
        { id: 'c', label: 'Trois', state: 'upcoming' },
        { id: 'd', label: 'Quatre', state: 'upcoming' },
      ]);
      await fixture.whenStable();
      expect(items(element)[0].getAttribute('aria-current')).toBe('step');
      expect(buttons(element).length).toBe(0);
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 1 sur 4 : Un');
    });

    it('CA-15 : sans entrée supplémentaire, le comportement par défaut est celui de la v1 (linéaire, horizontal, compact auto)', async () => {
      const { element } = await setup();
      expect(buttons(element).length).toBe(2);
      expect(element.classList).not.toContain('lc-stepper--vertical');
      expect(element.classList).not.toContain('lc-stepper--compact');
      expect(element.classList).not.toContain('lc-stepper--full');
    });
  });
});

/** Variante `rail` (fil du projet) : CA-16 à CA-18 de `docs/specs/2026-11-composants-parcours-guide.md` §14. */
describe('LcStepperComponent : mouvement des barres et des pastilles', () => {
  const fills = () => animated.filter((call) => call.target.classList.contains('lc-stepper__fill'));
  const dots = () => animated.filter((call) => call.target.classList.contains('lc-stepper__badge'));
  const delays = (calls: typeof animated) => calls.map((call) => call.options.delay);

  it('à l\'affichage : les segments pleins sont tracés l\'un après l\'autre (800 ms, 117 ms), les pastilles faites ou en cours entrent en pop (600 ms, 40 ms)', async () => {
    await setup(stepsAt(3));
    expect(delays(fills())).toEqual([0, 117, 234]);
    expect(fills().map((call) => call.options.duration)).toEqual([800, 800, 800]);
    expect(fills()[0].keyframes).toEqual([{ scale: '0 1' }, { scale: '1 1' }]);
    expect(delays(dots())).toEqual([0, 40, 80, 120]);
    expect(dots().every((call) => call.options.duration === 600)).toBe(true);
    expect(dots()[0].keyframes).toEqual([{ scale: 'var(--lc-steps-dot-scale)', opacity: 0 }, { scale: '1', opacity: 1 }]);
  });

  it('à l\'affichage de la première étape : une pastille, aucune barre', async () => {
    await setup(stepsAt(0));
    expect(fills()).toEqual([]);
    expect(delays(dots())).toEqual([0]);
  });

  it('en avançant : seule la barre atteinte est tracée et seule la pastille de l\'étape atteinte entre, sans décalage', async () => {
    const { fixture } = await setup(stepsAt(2));
    animated.length = 0;
    await update(fixture, stepsAt(3));
    expect(fills().map((call) => (call.target.closest('.lc-stepper__segment') as HTMLElement).previousElementSibling === null)).toEqual([false]);
    expect(delays(fills())).toEqual([0]);
    expect(dots().map((call) => call.target.textContent!.trim())).toEqual(['4']);
    expect(delays(dots())).toEqual([0]);
  });

  it('en sautant plusieurs étapes : les barres et pastilles atteintes jouent l\'une après l\'autre', async () => {
    const { fixture } = await setup(stepsAt(1));
    animated.length = 0;
    await update(fixture, stepsAt(4));
    expect(delays(fills())).toEqual([0, 117, 234]);
    expect(delays(dots())).toEqual([0, 40, 80]);
  });

  it('un changement qui ne déplace pas l\'étape en cours (libellé) ne rejoue rien', async () => {
    const { fixture } = await setup(stepsAt(2));
    animated.length = 0;
    await update(fixture, stepsAt(2).map((step) => ({ ...step, label: `${step.label} bis` })));
    expect(animated).toEqual([]);
  });

  it('vertical : la barre est tracée sur la hauteur (échelle 1 0 vers 1 1)', async () => {
    await setup(stepsAt(2), { orientation: 'vertical' });
    expect(fills()[0].keyframes).toEqual([{ scale: '1 0' }, { scale: '1 1' }]);
  });

  it('une étape à venir ne fait pas entrer sa pastille, même avant l\'étape en cours (états libres)', async () => {
    await setup([{ id: 'a', label: 'A', state: 'upcoming' }, { id: 'b', label: 'B', state: 'current' }]);
    expect(dots().map((call) => call.target.textContent!.trim())).toEqual(['2']);
  });

  it('variante rail : les barres pleines (une par étape atteinte, la courante comprise) sont tracées', async () => {
    const fixture = TestBed.createComponent(LcStepperComponent);
    fixture.componentRef.setInput('steps', stepsAt(2));
    fixture.componentRef.setInput('ariaLabel', 'Progression');
    fixture.componentRef.setInput('variant', 'rail');
    await fixture.whenStable();
    expect(delays(fills())).toEqual([0, 117, 234]);
    expect(fills().every((call) => call.target.parentElement!.classList.contains('lc-stepper__bar--on'))).toBe(true);
  });
});

describe('LcStepperComponent : variante rail', () => {
  const RAIL_STEPS: readonly LcStep[] = [
    { id: 'e1', label: 'Etape 1', state: 'done', answer: 'Maison à 250 000 €', detail: 'Apport de 20 000 €' },
    { id: 'e2', label: 'Etape 2', state: 'done', answer: 'Célibataire' },
    { id: 'e3', label: 'Etape 3', state: 'current' },
    { id: 'e4', label: 'Etape 4', state: 'upcoming', detail: 'Prêt sur 20 ans' },
    { id: 'e5', label: 'Etape 5', state: 'upcoming' },
  ];

  @Component({
    imports: [LcStepperComponent, LcStepActionDirective],
    template: `
      <lc-stepper ariaLabel="Fil" [variant]="variant()" [steps]="steps()" [compact]="compact()">
        <ng-template lcStepAction let-step>
          <button type="button" class="act" (click)="edited.push(step.id)">Modifier {{ step.label }}</button>
        </ng-template>
      </lc-stepper>
    `,
  })
  class RailHostComponent {
    readonly variant = signal<'default' | 'rail'>('rail');
    readonly steps = signal<readonly LcStep[]>(RAIL_STEPS);
    readonly compact = signal<'auto' | boolean>('auto');
    readonly edited: string[] = [];
  }

  @Component({
    imports: [LcStepperComponent],
    template: `<lc-stepper ariaLabel="Fil" variant="rail" [steps]="steps" />`,
  })
  class RailWithoutActionComponent {
    readonly steps = RAIL_STEPS;
  }

  async function rail(steps: readonly LcStep[] = RAIL_STEPS, compact: 'auto' | boolean = 'auto') {
    const fixture = TestBed.createComponent(RailHostComponent);
    fixture.componentInstance.steps.set(steps);
    fixture.componentInstance.compact.set(compact);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const stepper = root.querySelector('lc-stepper') as HTMLElement;
    return { fixture, host: fixture.componentInstance, root, stepper };
  }

  const railItems = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('ol.lc-stepper__answers > li'));
  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();
  const toggle = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('button.lc-stepper__toggle')!;
  const answersList = (root: HTMLElement) => root.querySelector<HTMLOListElement>('ol.lc-stepper__answers')!;

  /** Nom de l'icône du registre affichée dans `element`, `null` s'il n'y en a pas. */
  function iconIn(element: Element): string | null {
    const svg = element.querySelector('lc-icon svg');
    if (!svg) return null;
    for (const [name, markup] of Object.entries(LC_DEFAULT_ICONS)) {
      const holder = document.createElement('div');
      holder.innerHTML = markup;
      if (holder.querySelector('svg')!.innerHTML === svg.innerHTML) return name;
    }
    return 'inconnue';
  }

  const STEPPER_CSS = 'packages/angular/navigation/src/stepper/stepper.component.css';

  /** Bloc `{ … }` (accolades appariées) qui commence à `start`, en-tête compris. */
  function blockAt(css: string, start: number): string {
    let depth = 0;
    for (let index = css.indexOf('{', start); index < css.length; index++) {
      if (css[index] === '{') depth++;
      if (css[index] === '}' && --depth === 0) return css.slice(start, index + 1);
    }
    throw new Error('Accolades non appariées');
  }

  /** Valeur de `property` dans la règle `selector` de la feuille (lue en texte) ; `within` : en-tête d'un `@container` qui la contient. */
  function cssDecl(selector: string, property: string, within?: string): string {
    const css = readFileSync(resolve(process.cwd(), STEPPER_CSS), 'utf8');
    const scope = within ? blockAt(css, css.indexOf(within)) : css;
    const start = scope.indexOf(`\n${within ? '  ' : ''}${selector} {`);
    if (start < 0) throw new Error(`Règle « ${selector} » introuvable${within ? ` dans ${within}` : ''}`);
    const match = new RegExp(`\\s${property}:\\s*([^;]+);`).exec(blockAt(scope, start + 1));
    if (!match) throw new Error(`« ${selector} » ne déclare pas ${property}`);
    return match[1].trim();
  }

  describe('CA-16 : rendu des champs de chaque étape', () => {
    it('CA-16 : chaque étape affiche son titre, sa réponse et son détail quand ils existent', async () => {
      const { root } = await rail();
      const [e1, e2] = railItems(root);
      expect(railItems(root).length).toBe(5);
      expect(text(e1.querySelector('.lc-stepper__title'))).toBe('Etape 1');
      expect(text(e1.querySelector('.lc-stepper__answer'))).toBe('Maison à 250 000 €');
      expect(text(e1.querySelector('.lc-stepper__detail'))).toBe('Apport de 20 000 €');
      expect(text(e2.querySelector('.lc-stepper__answer'))).toBe('Célibataire');
    });

    it('CA-16 : un champ absent ne rend aucun élément (pas de paragraphe vide)', async () => {
      const { root } = await rail();
      const [, e2, e3, e4] = railItems(root);
      expect(e2.querySelector('.lc-stepper__detail')).toBeNull();
      expect(e3.querySelector('.lc-stepper__answer')).toBeNull();
      expect(e3.querySelector('.lc-stepper__detail')).toBeNull();
      expect(e4.querySelector('.lc-stepper__answer')).toBeNull();
      expect(text(e4.querySelector('.lc-stepper__detail'))).toBe('Prêt sur 20 ans');
      expect(Array.from(root.querySelectorAll('.lc-stepper__answer, .lc-stepper__detail')).every((p) => p.textContent!.trim() !== '')).toBe(true);
    });

    it('CA-16 : réponse et détail sont du texte brut (aucun HTML interprété)', async () => {
      const { root } = await rail([{ id: 'x', label: 'X', state: 'current', answer: '<b>gras</b>', detail: '<i>italique</i>' }]);
      const [item] = railItems(root);
      expect(item.querySelector('b, i')).toBeNull();
      expect(item.querySelector('.lc-stepper__answer')!.textContent).toBe('<b>gras</b>');
      expect(item.querySelector('.lc-stepper__detail')!.textContent).toBe('<i>italique</i>');
    });

    it('CA-16 : le gabarit lcStepAction est rendu une fois par étape, avec l\'étape en contexte', async () => {
      const { root, host } = await rail();
      const acts = Array.from(root.querySelectorAll<HTMLButtonElement>('.lc-stepper__actions .act'));
      expect(acts.map((button) => text(button))).toEqual(['Modifier Etape 1', 'Modifier Etape 2', 'Modifier Etape 3', 'Modifier Etape 4', 'Modifier Etape 5']);
      railItems(root).forEach((item) => expect(item.querySelectorAll('.lc-stepper__actions .act').length).toBe(1));
      acts[1].click();
      acts[4].click();
      expect(host.edited).toEqual(['e2', 'e5']);
    });

    it('CA-16 : l\'action vient après la réponse et le détail de son étape', async () => {
      const { root } = await rail();
      const content = railItems(root)[0].querySelector('.lc-stepper__content')!;
      expect(Array.from(content.children).map((child) => child.className)).toEqual(['lc-stepper__title', 'lc-stepper__answer', 'lc-stepper__detail', 'lc-stepper__actions']);
    });

    it('CA-16 : sans gabarit lcStepAction, aucun bloc d\'actions', async () => {
      const fixture = TestBed.createComponent(RailWithoutActionComponent);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(railItems(root).length).toBe(5);
      expect(root.querySelector('.lc-stepper__actions')).toBeNull();
      expect(root.querySelectorAll('ol button').length).toBe(0);
    });

    it('CA-16 : l\'étape en cours est la seule à porter aria-current="step"', async () => {
      const { root } = await rail();
      expect(root.querySelectorAll('[aria-current]').length).toBe(1);
      expect(railItems(root)[2].getAttribute('aria-current')).toBe('step');
    });

    it('CA-16 : aucune étape en cours = aucun aria-current', async () => {
      const { root } = await rail(RAIL_STEPS.map((step) => ({ ...step, state: 'done' as const })));
      expect(root.querySelector('[aria-current]')).toBeNull();
    });

    it('CA-16 : les titres ne sont pas cliquables (ni bouton, ni lien), même pour une étape faite', async () => {
      const { root, host } = await rail();
      for (const item of railItems(root)) {
        expect(item.querySelector('.lc-stepper__title button, .lc-stepper__title a, .lc-stepper__title [tabindex]')).toBeNull();
      }
      expect(root.querySelector('.lc-stepper__step')).toBeNull();
      expect(root.querySelector('nav')!.getAttribute('aria-label')).toBe('Fil');
      expect(host.edited).toEqual([]);
    });

    it('CA-16 : un clic sur le titre n\'émet pas stepSelect', async () => {
      const { fixture, root } = await rail();
      const picked: string[] = [];
      fixture.debugElement.query((node) => node.name === 'lc-stepper').componentInstance.stepSelect.subscribe((id: string) => picked.push(id));
      root.querySelector<HTMLElement>('.lc-stepper__title')!.click();
      expect(picked).toEqual([]);
    });

    it('CA-16 : pastille décorative (aria-hidden) : coche pour une étape faite, numéro sinon', async () => {
      const { root } = await rail();
      const markers = Array.from(root.querySelectorAll('.lc-stepper__marker'));
      expect(markers.length).toBe(5);
      expect(markers.every((marker) => marker.getAttribute('aria-hidden') === 'true')).toBe(true);
      expect(iconIn(markers[0])).toBe('check');
      expect(text(markers[2])).toBe('3');
      expect(iconIn(markers[2])).toBeNull();
    });

    it('CA-16 : « (à corriger) » et « (facultative) » sont lus avec le titre, « Facultative » est masquée aux lecteurs d\'écran', async () => {
      const { root } = await rail([
        { id: 'a', label: 'Alpha', state: 'upcoming', invalid: true },
        { id: 'b', label: 'Beta', state: 'upcoming', optional: true },
        { id: 'c', label: 'Gamma', state: 'upcoming', invalid: true, optional: true },
        { id: 'd', label: 'Delta', state: 'upcoming' },
      ]);
      const [a, b, c, d] = railItems(root);
      expect(text(a.querySelector('.lc-stepper__hidden'))).toBe('(à corriger)');
      expect(text(b.querySelector('.lc-stepper__hidden'))).toBe('(facultative)');
      expect(text(c.querySelector('.lc-stepper__hidden'))).toBe('(à corriger) (facultative)');
      expect(d.querySelector('.lc-stepper__hidden')).toBeNull();
      expect(text(b.querySelector('.lc-stepper__optional'))).toBe('Facultative');
      expect(b.querySelector('.lc-stepper__optional')!.getAttribute('aria-hidden')).toBe('true');
      expect(d.querySelector('.lc-stepper__optional')).toBeNull();
      expect(a.classList).toContain('lc-stepper__item--invalid');
    });

    it('CA-16 : l\'hôte porte lc-stepper--rail', async () => {
      const { stepper } = await rail();
      expect(stepper.classList).toContain('lc-stepper--rail');
    });
  });

  describe('CA-17 : étape affichée, en-tête et segments', () => {
    it('CA-17 : « Étape n sur N · nom » pour l\'étape en cours', async () => {
      const { root } = await rail();
      expect(text(root.querySelector('.lc-stepper__where'))).toBe('Étape 3 sur 5 · Etape 3');
    });

    it('CA-17 : N segments décoratifs (aria-hidden), dont les n premiers pleins', async () => {
      const { root } = await rail();
      const bars = root.querySelector('.lc-stepper__bars')!;
      expect(bars.getAttribute('aria-hidden')).toBe('true');
      const segments = Array.from(bars.querySelectorAll('.lc-stepper__bar'));
      expect(segments.length).toBe(5);
      expect(segments.map((bar) => bar.classList.contains('lc-stepper__bar--on'))).toEqual([true, true, true, false, false]);
    });

    it('CA-17 : sans étape en cours, la première étape non faite est affichée', async () => {
      const steps = RAIL_STEPS.map((step, index) => ({ ...step, state: index < 2 ? ('done' as const) : ('upcoming' as const) }));
      const { root } = await rail(steps);
      expect(text(root.querySelector('.lc-stepper__where'))).toBe('Étape 3 sur 5 · Etape 3');
      expect(root.querySelectorAll('.lc-stepper__bar--on').length).toBe(3);
    });

    it('CA-17 : toutes les étapes faites : la dernière est affichée, tous les segments sont pleins', async () => {
      const { root } = await rail(RAIL_STEPS.map((step) => ({ ...step, state: 'done' as const })));
      expect(text(root.querySelector('.lc-stepper__where'))).toBe('Étape 5 sur 5 · Etape 5');
      expect(root.querySelectorAll('.lc-stepper__bar--on').length).toBe(5);
    });

    it('CA-17 : l\'étape en cours l\'emporte sur une étape non faite antérieure', async () => {
      const steps: readonly LcStep[] = [
        { id: 'a', label: 'A', state: 'upcoming' },
        { id: 'b', label: 'B', state: 'current' },
        { id: 'c', label: 'C', state: 'upcoming' },
      ];
      const { root } = await rail(steps);
      expect(text(root.querySelector('.lc-stepper__where'))).toBe('Étape 2 sur 3 · B');
      expect(root.querySelectorAll('.lc-stepper__bar--on').length).toBe(2);
    });

    it('CA-17 : première étape en cours : un seul segment plein', async () => {
      const { root } = await rail(stepsAt(0));
      expect(text(root.querySelector('.lc-stepper__where'))).toBe('Étape 1 sur 5 · Etape 1');
      expect(root.querySelectorAll('.lc-stepper__bar--on').length).toBe(1);
    });

    it('CA-17 : l\'en-tête suit un changement d\'étape', async () => {
      const { fixture, host, root } = await rail(stepsAt(1));
      host.steps.set(stepsAt(3));
      await fixture.whenStable();
      expect(text(root.querySelector('.lc-stepper__where'))).toBe('Étape 4 sur 5 · Etape 4');
      expect(root.querySelectorAll('.lc-stepper__bar--on').length).toBe(4);
    });

    it('CA-17 : seules les étapes avec réponse ou détail ne sont pas marquées « bare » (absentes de la liste repliée)', async () => {
      const { root } = await rail();
      expect(railItems(root).map((item) => item.classList.contains('lc-stepper__item--bare'))).toEqual([false, false, true, false, true]);
    });

    it('CA-17 : compact vrai = classe lc-stepper--compact, faux = lc-stepper--full, auto = aucune', async () => {
      expect((await rail(RAIL_STEPS, true)).stepper.classList).toContain('lc-stepper--compact');
      const full = (await rail(RAIL_STEPS, false)).stepper;
      expect(full.classList).toContain('lc-stepper--full');
      expect(full.classList).not.toContain('lc-stepper--compact');
      const auto = (await rail(RAIL_STEPS, 'auto')).stepper;
      expect(auto.classList).not.toContain('lc-stepper--compact');
      expect(auto.classList).not.toContain('lc-stepper--full');
    });
  });

  describe('CA-17 : bouton « Voir vos réponses »', () => {
    it('CA-17 : bouton natif (type button) avec le libellé LC_LABELS.stepAnswers, replié au départ', async () => {
      const { root } = await rail();
      const button = toggle(root);
      expect(button.type).toBe('button');
      expect(text(button)).toBe('Voir vos réponses');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('CA-17 : libellé anglais « View your answers »', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { root } = await rail();
      expect(text(toggle(root))).toBe('View your answers');
    });

    it('CA-17 : aria-controls désigne l\'ol des réponses', async () => {
      const { root } = await rail();
      const id = toggle(root).getAttribute('aria-controls')!;
      expect(id).toBeTruthy();
      expect(answersList(root).id).toBe(id);
      expect(root.querySelectorAll(`[id="${id}"]`).length).toBe(1);
    });

    it('CA-17 : deux fils sur la page ont des aria-controls distincts', async () => {
      const first = (await rail()).root;
      const second = (await rail()).root;
      expect(toggle(first).getAttribute('aria-controls')).not.toBe(toggle(second).getAttribute('aria-controls'));
    });

    it('CA-17 : le clic bascule aria-expanded, l\'icône chevron et le repli de la liste, dans les deux sens', async () => {
      const { fixture, root } = await rail();
      expect(iconIn(toggle(root))).toBe('chevron-right');
      expect(answersList(root).classList).toContain('lc-stepper__answers--collapsed');

      toggle(root).click();
      await fixture.whenStable();
      expect(toggle(root).getAttribute('aria-expanded')).toBe('true');
      expect(iconIn(toggle(root))).toBe('chevron-down');
      expect(answersList(root).classList).not.toContain('lc-stepper__answers--collapsed');

      toggle(root).click();
      await fixture.whenStable();
      expect(toggle(root).getAttribute('aria-expanded')).toBe('false');
      expect(iconIn(toggle(root))).toBe('chevron-right');
      expect(answersList(root).classList).toContain('lc-stepper__answers--collapsed');
    });

    it('CA-17 : déplier ne change ni la liste ni l\'étape en cours (même ol, mêmes items)', async () => {
      const { fixture, root } = await rail();
      const list = answersList(root);
      const before = railItems(root);
      toggle(root).click();
      await fixture.whenStable();
      expect(answersList(root)).toBe(list);
      expect(railItems(root)).toEqual(before);
      expect(root.querySelectorAll('[aria-current]').length).toBe(1);
    });
  });

  describe('CA-17 : clavier (ordre de tabulation)', () => {
    it('le bouton précède la liste dans l\'ordre du DOM : il est le premier élément focalisable', async () => {
      const { root } = await rail();
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      expect(focusable[0]).toBe(toggle(root));
      expect(focusable.slice(1).every((element) => answersList(root).contains(element))).toBe(true);
    });

    it('les actions sont toutes dans l\'ol repliable : repliée, la liste est display:none (hors tabulation) ; dépliée, elle est atteignable', async () => {
      const { fixture, root } = await rail();
      const actions = Array.from(root.querySelectorAll<HTMLElement>('.act'));
      expect(actions.length).toBe(5);
      expect(actions.every((action) => answersList(root).contains(action))).toBe(true);
      expect(answersList(root).classList).toContain('lc-stepper__answers--collapsed');
      expect(cssDecl('.lc-stepper__answers--collapsed', 'display')).toBe('var(--_collapsed, block)');
      expect(cssDecl(':host(.lc-stepper--rail)', '--_collapsed')).toBe('none');

      toggle(root).click();
      await fixture.whenStable();
      expect(answersList(root).classList).not.toContain('lc-stepper__answers--collapsed');
      expect(actions.every((action) => answersList(root).contains(action))).toBe(true);
    });
  });

  describe('CA-17 : règles CSS des deux formes (jsdom n\'évalue pas @container : lecture de la feuille)', () => {
    it('forme étroite par défaut (aussi sans conteneur) : en-tête affiché, liste repliée, sans pastilles ni liaisons, étapes « bare » masquées', () => {
      const base = (property: string) => cssDecl(':host(.lc-stepper--rail)', property);
      expect(base('--_head')).toBe('block');
      expect(base('--_collapsed')).toBe('none');
      expect(base('--_marker')).toBe('none');
      expect(base('--_connector')).toBe('none');
      expect(base('--_bare')).toBe('none');
      expect(cssDecl('.lc-stepper__head', 'display')).toBe('var(--_head, none)');
      expect(cssDecl(':host(.lc-stepper--rail) .lc-stepper__item--bare', 'display')).toBe('var(--_bare, none)');
      expect(cssDecl(':host(.lc-stepper--rail) .lc-stepper__marker', 'display')).toBe('var(--_marker, none)');
      expect(cssDecl(':host(.lc-stepper--rail) .lc-stepper__item::before', 'display')).toBe('var(--_connector, none)');
    });

    it('conteneur de 900 px ou plus : forme large (liste visible, en-tête masqué, pastilles reliées), sauf compact vrai', () => {
      const wide = (property: string) => cssDecl(':host(.lc-stepper--rail:not(.lc-stepper--compact))', property, '@container (min-width: 900px)');
      expect(wide('--_head')).toBe('none');
      expect(wide('--_collapsed')).toBe('block');
      expect(wide('--_marker')).toBe('flex');
      expect(wide('--_item')).toBe('grid');
      expect(wide('--_bare')).toBe('grid');
      expect(wide('--_connector')).toBe('block');
    });

    it('compact faux : forme large quelle que soit la largeur du conteneur (règle hors @container)', () => {
      const full = (property: string) => cssDecl(':host(.lc-stepper--rail.lc-stepper--full)', property);
      expect(full('--_head')).toBe('none');
      expect(full('--_collapsed')).toBe('block');
      expect(full('--_marker')).toBe('flex');
      expect(full('--_bare')).toBe('grid');
      expect(full('--_connector')).toBe('block');
    });

    it('la forme ne dépend que du conteneur : aucune requête de fenêtre ne vise la variante rail', () => {
      const css = readFileSync(resolve(process.cwd(), STEPPER_CSS), 'utf8');
      const widths = Array.from(css.matchAll(/@media[^{]*\{/g)).map((match) => blockAt(css, match.index!));
      for (const media of widths.filter((block) => !block.startsWith('@media (prefers-') && !block.startsWith('@media (forced-colors'))) {
        expect(media).not.toContain('lc-stepper--rail');
      }
      expect(css).toContain('@container (min-width: 900px)');
    });

    it('la forme étroite conserve le lien entre actions et liste : la liste est le même ol (pas de seconde liste)', async () => {
      const { root } = await rail();
      expect(root.querySelectorAll('ol').length).toBe(1);
    });
  });

  describe('CA-18 : sans variant, rien ne change', () => {
    it('CA-18 : `variant` absent ou `default` : mêmes éléments que la v1, answer, detail et gabarit d\'action ignorés', async () => {
      const fixture = TestBed.createComponent(RailHostComponent);
      fixture.componentInstance.variant.set('default');
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('lc-stepper')!.classList).not.toContain('lc-stepper--rail');
      for (const selector of ['.lc-stepper__head', '.lc-stepper__toggle', '.lc-stepper__answers', '.lc-stepper__where', '.lc-stepper__bars', '.lc-stepper__actions', '.lc-stepper__answer', '.lc-stepper__detail', '.act']) {
        expect(root.querySelector(selector), selector).toBeNull();
      }
      expect(root.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 3 sur 5 : Etape 3');
      expect(root.querySelectorAll('ol.lc-stepper__list > li').length).toBe(5);
      expect(root.querySelectorAll('button.lc-stepper__step').length).toBe(2);
    });

    it('CA-18 : le DOM par défaut est identique avec ou sans answer, detail et gabarit', async () => {
      const plain = await setup(RAIL_STEPS.map(({ answer, detail, ...step }) => step));
      const fixture = TestBed.createComponent(RailHostComponent);
      fixture.componentInstance.variant.set('default');
      await fixture.whenStable();
      const strip = (html: string) => html.replace(/\s+/g, ' ').replace(/ ?(ng-reflect|_ngcontent|_nghost|ng-version|id|aria-label)="[^"]*"/g, '');
      expect(strip(fixture.nativeElement.querySelector('nav').innerHTML)).toBe(strip(plain.element.querySelector('nav')!.innerHTML));
    });

    it('CA-18 : en variante rail, orientation, linear et stepSelect sont sans effet', async () => {
      const fixture = TestBed.createComponent(LcStepperComponent);
      fixture.componentRef.setInput('steps', RAIL_STEPS);
      fixture.componentRef.setInput('ariaLabel', 'Fil');
      fixture.componentRef.setInput('variant', 'rail');
      fixture.componentRef.setInput('orientation', 'vertical');
      fixture.componentRef.setInput('linear', false);
      const picked: string[] = [];
      fixture.componentInstance.stepSelect.subscribe((id) => picked.push(id));
      await fixture.whenStable();
      const rootRail = fixture.nativeElement as HTMLElement;
      expect(rootRail.classList).not.toContain('lc-stepper--vertical');
      expect(rootRail.querySelector('.lc-stepper__step')).toBeNull();
      rootRail.querySelectorAll<HTMLElement>('.lc-stepper__title').forEach((title) => title.click());
      expect(picked).toEqual([]);
      expect(rootRail.querySelector('.lc-stepper__toggle')).not.toBeNull();
    });
  });
});

/** Termine les animations lancées par le composant (résout leur `finished`) et laisse passer les microtâches qui retirent la classe de sens ; l'appelant attend ensuite `fixture.whenStable()`. */
async function endAnimation(): Promise<void> {
  pending.splice(0).forEach((resolve) => resolve());
  await new Promise((resolve) => setTimeout(resolve));
}
