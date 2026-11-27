import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LcStaggerDirective } from '@lionelcointot/ui-angular';
import { LcGridComponent } from '../grid/grid.component';
import { LcCardComponent } from './card.component';

@Component({
  imports: [LcCardComponent, LcGridComponent, LcStaggerDirective],
  template: `
    <div id="handmade">@for (n of count; track n) { <lc-card>{{ n }}</lc-card> }</div>
    <lc-grid id="grid">@for (n of count; track n) { <lc-card>{{ n }}</lc-card> }</lc-grid>
    <div id="above" lcStagger="fine">@for (n of count; track n) { <lc-card>{{ n }}</lc-card> }</div>
    <div id="later">@if (more()) { <lc-card>later</lc-card> }</div>
  `,
})
class HostComponent {
  count = [0, 1, 2];
  more = signal(false);
}

/** jsdom n'a pas `getAnimations` : on simule une animation d'entrée en cours pour que la classe reste posée. */
function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const cards = (id: string) => [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(`#${id} lc-card`)];
  const ranks = (id: string) => cards(id).map((card) => card.style.getPropertyValue('--lc-reveal-rank'));
  return { fixture, cards, ranks };
}

describe('lc-card : entrée seule, sans attribut côté application', () => {
  beforeEach(() => Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] }));
  afterEach(() => delete (Element.prototype as { getAnimations?: unknown }).getAnimations);

  it('entre avec la variante card', () => {
    const { cards } = setup();
    for (const card of cards('handmade')) expect(card.className).toContain('lc-reveal lc-reveal--card');
  });

  it('dans une grille faite main (sans lcStagger), chaque carte prend son rang selon sa position parmi ses frères', () => {
    expect(setup().ranks('handmade')).toEqual(['0', '1', '2']);
  });

  it('une carte ajoutée seule plus tard repart du rang 0 (pas de retard hérité de ses frères)', async () => {
    const { fixture, ranks } = setup();
    await Promise.resolve(); // le lot repart de 0 à la microtâche : un rendu ultérieur est une autre cascade
    fixture.componentInstance.more.set(true);
    fixture.detectChanges();
    expect(ranks('later')).toEqual(['0']);
  });

  it('lc-grid porte la cascade : rang dans l\'ordre du DOM, rythme des cartes', () => {
    const { fixture, ranks } = setup();
    expect(ranks('grid')).toEqual(['0', '1', '2']);
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#grid')!.style.getPropertyValue('--lc-stagger-pace')).toBe('var(--lc-sys-motion-stagger-cards)');
  });

  it('un lcStagger au-dessus garde son rythme et son compteur (un seul compteur)', () => {
    const { fixture, ranks } = setup();
    expect(ranks('above')).toEqual(['0', '1', '2']);
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#above')!.style.getPropertyValue('--lc-stagger-pace')).toBe('var(--lc-sys-motion-stagger-fine)');
  });
});
