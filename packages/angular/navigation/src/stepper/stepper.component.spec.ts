import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_DEFAULT_ICONS, LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import refTokens from '../../../../tokens/src/ref/scale.tokens.json';
import sysTokens from '../../../../tokens/src/sys/default.tokens.json';
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

const REDUCED = '(prefers-reduced-motion: reduce)';

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

    it('CA-4 : la piste décorative est masquée aux lecteurs d\'écran et son remplissage est proportionnel à l\'avancement (index / (N - 1))', async () => {
      const { element } = await setup(STEPS, { compact: true });
      expect(element.querySelector('.lc-stepper__rail')!.getAttribute('aria-hidden')).toBe('true');
      const fill = element.querySelector<HTMLElement>('.lc-stepper__rail-fill')!;
      expect(parseFloat(fill.style.getPropertyValue('--lc-stepper-progress'))).toBeCloseTo((2 / 3) * 100, 5);
      expect(fill.style.getPropertyValue('--lc-stepper-progress')).toMatch(/%$/);
    });

    it('CA-4 : sans étape en cours, la forme compacte montre la première étape non faite', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done' },
        { id: 'b', label: 'B', state: 'upcoming' },
        { id: 'c', label: 'C', state: 'upcoming' },
      ];
      const { element } = await setup(steps, { compact: true });
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 2 sur 3 : B');
      expect(parseFloat(element.querySelector<HTMLElement>('.lc-stepper__rail-fill')!.style.getPropertyValue('--lc-stepper-progress'))).toBeCloseTo(50, 5);
    });

    it('CA-4 : sans étape en cours ni à venir, la forme compacte montre la dernière étape', async () => {
      const steps: LcStep[] = [
        { id: 'a', label: 'A', state: 'done' },
        { id: 'b', label: 'B', state: 'done' },
      ];
      const { element } = await setup(steps, { compact: true });
      expect(element.querySelector('.lc-stepper__summary')!.textContent!.trim()).toBe('Étape 2 sur 2 : B');
      expect(element.querySelector('[aria-current]')).toBeNull();
      expect(parseFloat(element.querySelector<HTMLElement>('.lc-stepper__rail-fill')!.style.getPropertyValue('--lc-stepper-progress'))).toBeCloseTo(100, 5);
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

    it('CA-10 : la piste est un trait de 2 px en border, remplie en primary sur la partie parcourue', async () => {
      await setup();
      expect(declared('.lc-stepper__rail', 'block-size')).toBe('var(--lc-sys-border-width-thick)');
      expect(declared('.lc-stepper__rail', 'background')).toMatch(/--lc-sys-color-border\)+$/);
      expect(declared('.lc-stepper__rail-fill', 'background')).toMatch(/--lc-sys-color-primary\)+$/);
      expect(declared('.lc-stepper__rail-fill', 'inline-size')).toBe('var(--lc-stepper-progress)');
    });

    it('CA-10 : la piste précède la liste dans le corps et chaque étape est une pastille de la liste', async () => {
      const { element } = await setup();
      const body = element.querySelector('.lc-stepper__body')!;
      expect(Array.from(body.children).map((child) => child.tagName.toLowerCase() + '.' + child.className.split(' ')[0])).toEqual(['span.lc-stepper__rail', 'ol.lc-stepper__list']);
      expect(element.querySelectorAll('.lc-stepper__badge').length).toBe(4);
    });

    it('CA-10 : la progression de la piste vaut index / (N - 1) pour chaque étape en cours', async () => {
      for (const [current, expected] of [[0, 0], [1, 25], [2, 50], [3, 75], [4, 100]] as const) {
        const { element } = await setup(stepsAt(current));
        const fill = element.querySelector<HTMLElement>('.lc-stepper__rail-fill')!;
        expect(parseFloat(fill.style.getPropertyValue('--lc-stepper-progress'))).toBeCloseTo(expected, 5);
      }
    });

    it('CA-10 : la progression suit une mise à jour de `steps`', async () => {
      const { fixture, element } = await setup(stepsAt(1));
      const progress = () => parseFloat(element.querySelector<HTMLElement>('.lc-stepper__rail-fill')!.style.getPropertyValue('--lc-stepper-progress'));
      expect(progress()).toBeCloseTo(25, 5);
      await update(fixture, stepsAt(3));
      expect(progress()).toBeCloseTo(75, 5);
    });

    it('CA-10 : avec une seule étape, ni piste ni division par zéro', async () => {
      const { element } = await setup([{ id: 'a', label: 'Seule', state: 'current' }]);
      expect(element.querySelectorAll('ol > li').length).toBe(1);
      expect(element.querySelector('.lc-stepper__rail')).toBeNull();
      expect(element.querySelector('.lc-stepper__rail-fill')).toBeNull();
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
      expect(parseFloat(element.querySelector<HTMLElement>('.lc-stepper__rail-fill')!.style.getPropertyValue('--lc-stepper-progress'))).toBeCloseTo(100, 5);
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

    it('CA-12 : reculer pose lc-stepper--backward sur l\'hôte et émet « backward »', async () => {
      const { fixture, element, directions } = await setup(stepsAt(3));
      await update(fixture, stepsAt(2));
      expect(element.classList).toContain('lc-stepper--backward');
      expect(element.classList).not.toContain('lc-stepper--forward');
      expect(directions).toEqual(['backward']);
    });

    it('CA-12 : deux changements de même sens émettent chacun', async () => {
      const { fixture, directions } = await setup(stepsAt(0));
      await update(fixture, stepsAt(1));
      await update(fixture, stepsAt(2));
      expect(directions).toEqual(['forward', 'forward']);
    });

    it('CA-12 : deux changements de même sens, séparés par la fin de l\'animation, émettent chacun', async () => {
      const { fixture, element, directions } = await setup(stepsAt(3));
      await update(fixture, stepsAt(2));
      endAnimation(element);
      await fixture.whenStable();
      await update(fixture, stepsAt(1));
      expect(directions).toEqual(['backward', 'backward']);
      expect(element.classList).toContain('lc-stepper--backward');
    });

    it('CA-12 : un changement de sens contraire inverse la classe et émet le nouveau sens', async () => {
      const { fixture, element, directions } = await setup(stepsAt(1));
      await update(fixture, stepsAt(2));
      await update(fixture, stepsAt(1));
      expect(directions).toEqual(['forward', 'backward']);
      expect(element.classList).toContain('lc-stepper--backward');
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

    it('CA-12 : la classe de sens est retirée à la fin de l\'animation de l\'hôte, mais pas à celle d\'une autre animation', async () => {
      const { fixture, element, directions } = await setup(stepsAt(1));
      await update(fixture, stepsAt(2));
      endAnimation(element, 'autre-animation');
      await fixture.whenStable();
      expect(element.classList).toContain('lc-stepper--forward');
      endAnimation(element);
      await fixture.whenStable();
      expect(element.classList).not.toContain('lc-stepper--forward');
      expect(directions).toEqual(['forward']);
    });

    it('CA-12 : le sens s\'applique aussi en vertical', async () => {
      const { fixture, element, directions } = await setup(stepsAt(1), { orientation: 'vertical' });
      await update(fixture, stepsAt(2));
      expect(element.classList).toContain('lc-stepper--forward');
      expect(directions).toEqual(['forward']);
    });

    it('CA-12 : la piste s\'allonge ou se raccourcit par une transition de largeur (hauteur en vertical), avec les tokens de durée', async () => {
      await setup();
      const transition = declared('.lc-stepper__rail-fill', 'transition');
      expect(transition).toBe('inline-size var(--lc-sys-duration-normal) var(--lc-sys-easing-standard)');
      expect(declared('.lc-stepper--vertical .lc-stepper__rail-fill', 'transition-property')).toBe('block-size');
    });

    it('CA-12 : la pastille qui devient « en cours » grandit par transition de taille, son anneau apparaît en fondu, après la piste', async () => {
      await setup();
      expect(declared('.lc-stepper__badge', 'transition')).toBe(
        'inline-size var(--lc-sys-duration-normal) var(--lc-sys-easing-standard), block-size var(--lc-sys-duration-normal) var(--lc-sys-easing-standard)',
      );
      expect(declared('.lc-stepper__badge::after', 'transition')).toBe('opacity var(--lc-sys-duration-normal) var(--lc-sys-easing-standard)');
      for (const direction of ['forward', 'backward']) {
        expect(declared(`.lc-stepper--${direction} .lc-stepper__item--current .lc-stepper__badge`, 'transition-delay')).toBe('var(--lc-sys-duration-normal)');
        expect(declared(`.lc-stepper--${direction} .lc-stepper__item--current .lc-stepper__badge::after`, 'transition-delay')).toBe('var(--lc-sys-duration-normal)');
      }
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
    it('CA-13 : transition: none sur la pastille, son anneau et le remplissage de la piste', async () => {
      await setup();
      for (const selector of ['.lc-stepper__badge', '.lc-stepper__badge::after', '.lc-stepper__rail-fill']) {
        expect(declared(selector, 'transition', REDUCED)).toBe('none');
      }
    });

    it('CA-13 : toute règle qui déclare une transition hors média est neutralisée sous reduced-motion', async () => {
      await setup();
      const { rules } = stepperCss();
      const animated = new Set(rules.filter((rule) => rule.media === null && rule.style.getPropertyValue('transition')).map((rule) => rule.selector));
      expect(animated.size).toBeGreaterThan(0);
      const neutralised = new Set(rules.filter((rule) => rule.media === REDUCED && rule.style.getPropertyValue('transition') === 'none').map((rule) => rule.selector));
      expect([...animated].filter((selector) => !neutralised.has(selector))).toEqual([]);
    });

    it('CA-13 : le bloc reduced-motion ne déclare aucune transition ou durée non nulle', async () => {
      await setup();
      for (const rule of stepperCss().rules.filter((candidate) => candidate.media === REDUCED)) {
        const transition = rule.style.getPropertyValue('transition');
        if (transition) expect(transition).toBe('none');
        const delay = rule.style.getPropertyValue('transition-delay');
        if (delay) expect(delay).toMatch(/^0(s|ms)$/);
      }
    });

    it('CA-13 : sous reduced-motion, les délais d\'enchaînement de l\'animation sont remis à zéro', async () => {
      await setup();
      for (const direction of ['forward', 'backward']) {
        expect(declared(`.lc-stepper--${direction} .lc-stepper__item--current .lc-stepper__badge`, 'transition-delay', REDUCED)).toBe('0s');
        expect(declared(`.lc-stepper--${direction} .lc-stepper__item--current .lc-stepper__badge::after`, 'transition-delay', REDUCED)).toBe('0s');
      }
    });

    it('CA-13 : aucune transformation (transform, scale, translate, rotate) n\'est appliquée nulle part', async () => {
      await setup();
      const offenders = stepperCss()
        .rules.flatMap((rule) =>
          Array.from(rule.style)
            .filter((property) => /^(transform|scale|translate|rotate|perspective)/.test(property) || /\b(scale|translate|rotate|matrix)[a-z0-9]*\(/.test(rule.style.getPropertyValue(property)))
            .map((property) => `${rule.selector} ${property}`),
        );
      expect(offenders).toEqual([]);
    });

    it('CA-13 : l\'animation de minuterie ne touche aucune propriété visible (variable personnalisée seulement) et dure 1 ms sous reduced-motion', async () => {
      await setup();
      const { keyframes } = stepperCss();
      expect(keyframes.length).toBe(1);
      for (const frame of Array.from(keyframes[0].cssRules) as CSSKeyframeRule[]) {
        expect(Array.from(frame.style).every((property) => property.startsWith('--'))).toBe(true);
      }
      expect(declared('.lc-stepper--forward', 'animation-duration', REDUCED)).toBe('1ms');
      expect(declared('.lc-stepper--backward', 'animation-duration', REDUCED)).toBe('1ms');
    });
  });

  describe('CA-14 : vertical, facultative, erreur, désactivée, icône', () => {
    it('CA-14 : orientation="vertical" pose --vertical et met pastilles en colonne, libellé à droite, piste verticale', async () => {
      const { element } = await setup(STEPS, { orientation: 'vertical' });
      expect(element.classList).toContain('lc-stepper--vertical');
      expect(declared('.lc-stepper--vertical .lc-stepper__list', 'grid-auto-flow')).toBe('row');
      expect(declared('.lc-stepper--vertical .lc-stepper__step', 'flex-direction')).toBe('row');
      expect(declared('.lc-stepper--vertical .lc-stepper__rail', 'inline-size')).toBe('var(--lc-sys-border-width-thick)');
      expect(declared('.lc-stepper--vertical .lc-stepper__rail-fill', 'block-size')).toBe('var(--lc-stepper-progress)');
      expect(declared('.lc-stepper--vertical .lc-stepper__rail-fill', 'inline-size')).toBe('100%');
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

/** Simule la fin de l'animation CSS de minuterie de l'hôte (jsdom n'exécute pas les animations). */
function endAnimation(element: HTMLElement, animationName = '_ngcontent-test_lc-stepper-sync'): void {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  element.dispatchEvent(event);
}
