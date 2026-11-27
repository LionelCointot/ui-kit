import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LcCardComponent } from './card.component';
import { LcCardHeaderComponent } from './card-header.component';

@Component({
  imports: [LcCardComponent, LcCardHeaderComponent],
  template: `<lc-card [collapsible]="collapsible()"><lc-card-header title="Titre" [headingLevel]="level()" /></lc-card>`,
})
class HostComponent {
  level = signal<2 | 3 | 4>(2);
  collapsible = signal(false);
}

describe('lc-card-header : headingLevel', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture, heading: () => (fixture.nativeElement as HTMLElement).querySelector('.lc-card-header__title')! };
  };

  it('h2 par défaut', () => {
    expect(setup().heading().tagName).toBe('H2');
  });

  it.each([[3, 'H3'], [4, 'H4']] as const)('niveau %i : %s', (level, tag) => {
    const { fixture, heading } = setup();
    fixture.componentInstance.level.set(level);
    fixture.detectChanges();
    expect(heading().tagName).toBe(tag);
    expect(heading().textContent).toBe('Titre');
  });

  it('carte repliable : le titre est dans un bouton, sans titre de niveau', () => {
    const { fixture, heading } = setup();
    fixture.componentInstance.collapsible.set(true);
    fixture.componentInstance.level.set(3);
    fixture.detectChanges();
    expect(heading().tagName).toBe('SPAN');
  });
});
