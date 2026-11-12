import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcRadioGroupComponent } from '../radio/radio-group.component';
import { LcRadioDirective } from '../radio/radio.directive';
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
