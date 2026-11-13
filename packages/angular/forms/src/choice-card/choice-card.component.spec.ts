import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcRadioGroupComponent } from '../radio/radio-group.component';
import { LcRadioDirective } from '../radio/radio.directive';
import sysTokens from '../../../../tokens/src/sys/default.tokens.json';
import contrastPairs from '../../../../tokens/src/checks/contrast-pairs.json';
import sysDarkTokens from '../../../../tokens/src/sys/dark.tokens.json';
import { LcChoiceCardComponent } from './choice-card.component';

@Component({
  imports: [LcRadioGroupComponent, LcRadioDirective, LcChoiceCardComponent],
  template: `
    <lc-radio-group legend="Choix" orientation="horizontal">
      <lc-choice-card title="Option A" description="Explication de A"><input type="radio" lcRadio value="a" /></lc-choice-card>
      <lc-choice-card title="Option B"><input type="radio" lcRadio value="b" [disabled]="disabled()" [attr.aria-invalid]="invalid() ? 'true' : null" /></lc-choice-card>
      <lc-choice-card [title]="dynamicTitle()" [description]="dynamicDescription()"><input type="radio" lcRadio value="c" /></lc-choice-card>
    </lc-radio-group>
  `,
})
class ChoiceCardHostComponent {
  readonly disabled = signal(false);
  readonly invalid = signal(false);
  readonly dynamicTitle = signal('Titre C');
  readonly dynamicDescription = signal<string | undefined>('Description C');
}

async function setup() {
  const fixture = TestBed.createComponent(ChoiceCardHostComponent);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const cards = Array.from(element.querySelectorAll<HTMLElement>('lc-choice-card'));
  const radios = Array.from(element.querySelectorAll<HTMLInputElement>('input[type=radio]'));
  return { fixture, element, cards, radios };
}

/** Texte du ou des éléments désignés par une liste d'identifiants (calcul du nom / de la description accessibles). */
function textOf(root: HTMLElement, ids: string | null): string {
  return (ids ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => root.querySelector(`#${CSS.escape(id)}`)?.textContent?.trim() ?? '')
    .join(' ');
}

describe('LcChoiceCardComponent', () => {
  it('CA-1 : enveloppe l\'input[lcRadio] dans un label ; la valeur et le nom restent sur le radio', async () => {
    const { element, cards, radios } = await setup();
    expect(radios[0].closest('lc-choice-card')).toBe(cards[0]);
    expect(radios[0].closest('label')).not.toBeNull();
    expect(radios[0].value).toBe('a');
    expect(radios[0].classList).toContain('lc-radio');
    expect(radios[0].name).toBeTruthy();
    expect(radios[0].name).toBe(radios[1].name);
    expect(element.querySelectorAll('input[type=radio]').length).toBe(3);
  });

  it('CA-1 : le nom accessible du radio est le titre (aria-labelledby)', async () => {
    const { element, radios } = await setup();
    expect(textOf(element, radios[0].getAttribute('aria-labelledby'))).toBe('Option A');
    expect(textOf(element, radios[1].getAttribute('aria-labelledby'))).toBe('Option B');
  });

  it('CA-1 : la description est reliée au radio par aria-describedby', async () => {
    const { element, radios } = await setup();
    expect(textOf(element, radios[0].getAttribute('aria-describedby'))).toBe('Explication de A');
  });

  it('CA-1 : sans description, aria-describedby est absent et aucun élément de description n\'est rendu', async () => {
    const { cards, radios } = await setup();
    expect(radios[1].hasAttribute('aria-describedby')).toBe(false);
    expect(cards[1].querySelector('.lc-choice-card__description')).toBeNull();
  });

  it('CA-1 : aria-describedby suit la description (retirée puis rétablie)', async () => {
    const { fixture, radios } = await setup();
    expect(radios[2].hasAttribute('aria-describedby')).toBe(true);
    fixture.componentInstance.dynamicDescription.set(undefined);
    await fixture.whenStable();
    expect(radios[2].hasAttribute('aria-describedby')).toBe(false);
    fixture.componentInstance.dynamicDescription.set('Nouvelle description');
    await fixture.whenStable();
    expect(radios[2].hasAttribute('aria-describedby')).toBe(true);
  });

  it('CA-1 : les identifiants de titre et de description sont uniques entre cartes', async () => {
    const { element } = await setup();
    const ids = Array.from(element.querySelectorAll('[id]')).map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('CA-1 : un clic sur la carte (titre ou description) coche le radio', async () => {
    const { cards, radios } = await setup();
    cards[0].querySelector<HTMLElement>('.lc-choice-card__title')!.click();
    expect(radios[0].checked).toBe(true);
    cards[0].querySelector<HTMLElement>('.lc-choice-card__description')!.click();
    expect(radios[0].checked).toBe(true);
    cards[1].querySelector<HTMLElement>('.lc-choice-card__label')!.click();
    expect(radios[1].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
  });

  it('CA-2 : l\'état coché est porté par le radio (le point), pas par la carte', async () => {
    const { cards, radios } = await setup();
    radios[2].click();
    expect(radios[2].checked).toBe(true);
    expect(cards[2].querySelector('input:checked')).toBe(radios[2]);
    expect(cards[0].querySelector('input:checked')).toBeNull();
  });

  it('CA-2 : état désactivé porté par le radio, la carte ne coche pas', async () => {
    const { fixture, cards, radios } = await setup();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(radios[1].disabled).toBe(true);
    cards[1].querySelector<HTMLElement>('.lc-choice-card__label')!.click();
    expect(radios[1].checked).toBe(false);
  });

  it('CA-2 : état invalide porté par aria-invalid sur le radio', async () => {
    const { fixture, radios } = await setup();
    expect(radios[1].hasAttribute('aria-invalid')).toBe(false);
    fixture.componentInstance.invalid.set(true);
    await fixture.whenStable();
    expect(radios[1].getAttribute('aria-invalid')).toBe('true');
  });

  it('pas d\'attribut title sur l\'hôte (pas d\'info-bulle en double)', async () => {
    const { cards } = await setup();
    for (const card of cards) expect(card.hasAttribute('title')).toBe(false);
  });

  it('le titre affiché suit l\'entrée title', async () => {
    const { fixture, cards } = await setup();
    expect(cards[2].querySelector('.lc-choice-card__title')!.textContent).toBe('Titre C');
    fixture.componentInstance.dynamicTitle.set('Autre titre');
    await fixture.whenStable();
    expect(cards[2].querySelector('.lc-choice-card__title')!.textContent).toBe('Autre titre');
  });
});

interface CssRule {
  readonly selector: string;
  /** Conditions `@media` imbriquées, de la plus externe à la plus interne (vide : hors média). */
  readonly media: readonly string[];
  readonly style: CSSStyleDeclaration;
  readonly cssText: string;
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

/** Règles CSS de la carte, aplaties (jsdom n'évalue pas les `@media` : on lit les règles). Appeler après un rendu. */
function choiceCardCss(): CssRule[] {
  const rules: CssRule[] = [];
  const visit = (list: CSSRuleList, media: readonly string[]) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSStyleRule) {
        for (const selector of splitSelectors(rule.selectorText)) rules.push({ selector, media, style: rule.style, cssText: rule.cssText });
      } else if (rule instanceof CSSMediaRule) {
        visit(rule.cssRules, [...media, rule.media.mediaText]);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    if (Array.from(sheet.cssRules).some((rule) => rule.cssText.includes('lc-choice-card__'))) visit(sheet.cssRules, []);
  }
  return rules;
}

const HOVER_MEDIA = /\(?\s*hover:\s*hover\s*\)?/;
const FORCED_COLORS_MEDIA = /forced-colors:\s*active/;
const CHECKED = '.lc-choice-card__label:has(:checked)';

function declarations(selector: string, property: string, outside: RegExp | null = null): string[] {
  return choiceCardCss()
    .filter((rule) => rule.selector === selector && !(outside && rule.media.some((media) => outside.test(media))))
    .map((rule) => rule.style.getPropertyValue(property).replace(/\s+/g, ' ').replace(/,\s*/g, ', ').trim())
    .filter(Boolean);
}

/** Valeur d'un token `sys` désigné par son chemin pointé (`color.primary-container`, `border.width.thin`). */
function tokenValue(tokens: unknown, path: string): string | undefined {
  return (path.split('.').reduce<any>((node, key) => node?.[key], (tokens as any).sys) as { $value?: string } | undefined)?.$value;
}

describe('LcChoiceCardComponent : CSS (lecture des règles)', () => {
  beforeEach(async () => {
    await setup();
  });

  it('les règles du composant sont lisibles (garde contre un test vide)', () => {
    expect(choiceCardCss().length).toBeGreaterThan(5);
  });

  it('CA-2 : aucune règle de survol hors @media (hover: hover)', () => {
    const hoverRules = choiceCardCss().filter((rule) => rule.selector.includes(':hover'));
    expect(hoverRules.length).toBeGreaterThan(0);
    const unguarded = hoverRules.filter((rule) => !rule.media.some((media) => HOVER_MEDIA.test(media)));
    expect(unguarded.map((rule) => rule.selector)).toEqual([]);
  });

  it('CA-2 : le voile de survol, sous (hover: hover), pose l\'opacité d\'état du survol', () => {
    const rule = choiceCardCss().find((candidate) => candidate.selector.includes(':hover') && candidate.media.some((media) => HOVER_MEDIA.test(media)));
    expect(rule?.style.getPropertyValue('opacity')).toBe('var(--lc-sys-state-hover-opacity)');
    expect(rule?.selector).toContain('::before');
  });

  it('CA-2 : au repos, le voile est transparent (aucune opacité de survol hors média)', () => {
    expect(declarations('.lc-choice-card__label::before', 'opacity')).toEqual(['0']);
  });

  it('CA-2 : carte cochée = fond primary-container et texte on-primary-container', () => {
    expect(declarations(CHECKED, 'background', FORCED_COLORS_MEDIA)).toEqual(['var(--lc-choice-card-background-selected, var(--lc-sys-color-primary-container))']);
    expect(declarations(CHECKED, 'color', FORCED_COLORS_MEDIA)).toEqual(['var(--lc-sys-color-on-primary-container)']);
  });

  it('CA-2 : la description d\'une carte cochée suit la couleur du texte de la carte (on-primary-container)', () => {
    expect(declarations(`${CHECKED} .lc-choice-card__description`, 'color')).toEqual(['inherit']);
    // la description décochée reste en on-surface-muted : la règle cochée la surcharge bien
    expect(declarations('.lc-choice-card__description', 'color')).toEqual(['var(--lc-sys-color-on-surface-muted)']);
  });

  it('CA-2 : bord de la carte cochée sur le token primary (1 px de bord + 1 px d\'ombre interne), sans décalage de mise en page', () => {
    const border = declarations(CHECKED, '--_border', FORCED_COLORS_MEDIA);
    expect(border).toEqual(['var(--lc-choice-card-border-selected, var(--lc-sys-color-primary))']);
    expect(declarations(CHECKED, 'box-shadow', FORCED_COLORS_MEDIA)).toEqual(['inset 0 0 0 var(--lc-sys-border-width-thin) var(--_border)']);
    // bord de base : 1 px (token thin) ; la carte cochée ne change ni bordure, ni rembourrage, ni marge, ni dimension
    expect(declarations('.lc-choice-card__label', 'border')).toEqual(['var(--lc-sys-border-width-thin) solid var(--_border)']);
    const checkedRules = choiceCardCss().filter((rule) => rule.selector.startsWith(CHECKED) && !rule.media.some((media) => FORCED_COLORS_MEDIA.test(media)));
    for (const rule of checkedRules) {
      for (const property of ['border', 'border-width', 'padding', 'margin', 'width', 'height', 'inline-size', 'block-size', 'min-block-size']) {
        expect(rule.style.getPropertyValue(property), `${rule.selector} ${property}`).toBe('');
      }
    }
    // 1 px + 1 px = 2 px : la valeur du token thin est bien 1 px
    expect(parseFloat(tokenValue(sysTokens, 'border.width.thin') ?? '')).toBe(1);
  });

  it('CA-2 : la paire cochée existe dans les thèmes clair et sombre et figure dans les paires de contraste contrôlées (AA)', () => {
    for (const theme of [sysTokens, sysDarkTokens]) {
      expect(tokenValue(theme, 'color.primary-container')).toBeTruthy();
      expect(tokenValue(theme, 'color.on-primary-container')).toBeTruthy();
    }
    expect(tokenValue(sysTokens, 'color.primary')).toBeTruthy();
    expect(tokenValue(sysTokens, 'state.hover-opacity')).toBeTruthy();
    const pair = (contrastPairs as unknown as { pairs: [string, string, number][] }).pairs.find(([fg, bg]) => fg === 'sys.color.on-primary-container' && bg === 'sys.color.primary-container');
    expect(pair?.[2]).toBeGreaterThanOrEqual(4.5);
  });

  it('CA-9 : aucune couleur en dur (hex, rgb, hsl, oklch, mot-clé) : seulement des var(--lc-...) hors forced-colors', () => {
    const literal = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(|\b(?:white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|silver|navy|teal|maroon|lime|aqua|fuchsia|olive)\b/i;
    const offenders = choiceCardCss()
      .filter((rule) => !rule.media.some((media) => FORCED_COLORS_MEDIA.test(media)))
      .filter((rule) => literal.test(rule.cssText))
      .map((rule) => rule.selector);
    expect(offenders).toEqual([]);
  });

  it('CA-9 : aucune couleur en dur ni --lc-ref-* ; sous forced-colors, seulement des couleurs système', () => {
    const forced = choiceCardCss().filter((rule) => rule.media.some((media) => FORCED_COLORS_MEDIA.test(media)));
    expect(forced.length).toBeGreaterThan(0);
    const systemColors = /^(?:CanvasText|Canvas|Highlight|HighlightText|ButtonText|ButtonFace|GrayText|LinkText)$/i;
    for (const rule of forced) {
      for (const property of ['color', 'background', 'background-color', 'border-color']) {
        const value = rule.style.getPropertyValue(property);
        if (value) expect(value, `${rule.selector} ${property}`).toMatch(systemColors);
      }
    }
    for (const rule of choiceCardCss()) expect(rule.cssText, rule.selector).not.toContain('--lc-ref-');
  });

  it('CA-9 : toutes les couleurs de la carte passent par un token (color, background, outline, --_border)', () => {
    for (const rule of choiceCardCss().filter((candidate) => !candidate.media.some((media) => FORCED_COLORS_MEDIA.test(media)))) {
      for (const property of ['color', 'background', 'background-color', '--_border']) {
        const value = rule.style.getPropertyValue(property);
        if (!value || value === 'inherit' || value.toLowerCase() === 'currentcolor') continue;
        expect(value, `${rule.selector} ${property}`).toMatch(/^var\(--(?:lc-|_border)/);
      }
    }
  });
});
