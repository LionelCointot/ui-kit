import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcKpiCardComponent, LcKpiDelta } from './kpi-card.component';
import { LcKpiCardLinkDirective } from './kpi-card-link.directive';

@Component({
  imports: [LcKpiCardComponent, LcKpiCardLinkDirective],
  template: `
    <lc-kpi-card label="Mensualité" [value]="1200" [delta]="delta()" [hint]="hint()" [loading]="loading()">
      @if (linked()) {
        <a lcKpiCardLink href="/detail"></a>
      }
    </lc-kpi-card>
  `,
})
class HostComponent {
  readonly linked = signal(true);
  readonly delta = signal<LcKpiDelta | undefined>({ value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' });
  readonly hint = signal<string | undefined>('Sur 12 mois');
  readonly loading = signal(false);
}

async function render() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const card = (fixture.nativeElement as HTMLElement).querySelector('lc-kpi-card') as HTMLElement;
  return { fixture, card, link: () => card.querySelector('a') };
}

describe('LcKpiCardLinkDirective', () => {
  it('compose le nom avec le jeu de libellés (anglais : sans espace avant les deux-points)', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
    const { link } = await render();
    expect(link()!.getAttribute('aria-label')!.replace(/\s/g, ' ')).toMatch(/^Mensualité: .*, .* down, Sur 12 mois$/);
  });

  it('omet les parties absentes du nom', async () => {
    const { fixture, link } = await render();
    fixture.componentInstance.delta.set(undefined);
    fixture.componentInstance.hint.set(undefined);
    await fixture.whenStable();
    expect(link()!.getAttribute('aria-label')).toMatch(/^Mensualité : 1.200,00$/);
  });

  it('en chargement, le nom se réduit au libellé', async () => {
    const { fixture, link } = await render();
    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    expect(link()!.getAttribute('aria-label')).toBe('Mensualité');
  });

  it('sans ancre, la carte garde son rôle, son nom et n\'a pas de chevron', async () => {
    const { fixture, card } = await render();
    fixture.componentInstance.linked.set(false);
    await fixture.whenStable();
    expect(card.getAttribute('role')).toBe('group');
    expect(card.getAttribute('aria-label')).toMatch(/^Mensualité : /);
    expect(card.classList).not.toContain('lc-kpi-card--linked');
    expect(card.querySelector('.lc-kpi-card__chevron')).toBeNull();
  });
});
