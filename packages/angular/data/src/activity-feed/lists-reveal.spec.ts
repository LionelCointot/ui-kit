import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LcDescriptionListComponent } from '../description-list/description-list.component';
import { LcActivityFeedComponent } from './activity-feed.component';
import { LcActivityItemComponent } from './activity-item.component';

@Component({
  imports: [LcActivityFeedComponent, LcActivityItemComponent, LcDescriptionListComponent],
  template: `
    <ol lcActivityFeed>@for (n of [0, 1, 2]; track n) { <li lcActivityItem heading="Étape {{ n }}"></li> }</ol>
    <lc-description-list [items]="items" />
  `,
})
class HostComponent {
  items = [{ term: 'A', value: 1 }, { term: 'B', value: 2 }];
}

describe('listes : cascade d\'entrée par lcStagger (lignes du site : 8 px, rythme normal)', () => {
  // jsdom n'a pas `getAnimations` : on simule une animation d'entrée en cours pour que la classe reste posée.
  beforeEach(() => Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] }));
  afterEach(() => delete (Element.prototype as { getAnimations?: unknown }).getAnimations);

  const render = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const ranks = (nodes: NodeListOf<HTMLElement>) => [...nodes].map((n) => n.style.getPropertyValue('--lc-reveal-rank'));

  it('fil d\'activité : chaque événement entre en rise, au rang de son ordre, rythme normal', () => {
    const root = render();
    const items = root.querySelectorAll<HTMLElement>('li[lcActivityItem]');
    expect(ranks(items)).toEqual(['0', '1', '2']);
    expect(items[0].className).toContain('lc-reveal');
    expect(items[0].className).not.toContain('lc-reveal--');
    expect(root.querySelector<HTMLElement>('ol')!.style.getPropertyValue('--lc-stagger-pace')).toBe('var(--lc-sys-motion-stagger-normal)');
  });

  it('liste de définitions : les lignes entrent en cascade', () => {
    expect(ranks(render().querySelectorAll<HTMLElement>('.lc-description-list__row'))).toEqual(['0', '1']);
  });
});
