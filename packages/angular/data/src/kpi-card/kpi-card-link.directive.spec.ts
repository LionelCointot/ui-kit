import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
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
  it('nomme l\'ancre « libellé : valeur, variation tendance, précision » et retire le rôle de la carte', async () => {
    const { card, link } = await render();
    const name = link()!.getAttribute('aria-label')!.replace(/\s/g, ' ');
    expect(name).toMatch(/^Mensualité : .*1 200.*, −2,50 % baisse, Sur 12 mois$/);
    expect(card.classList).toContain('lc-kpi-card--linked');
    expect(card.hasAttribute('role')).toBe(false);
    expect(card.hasAttribute('aria-label')).toBe(false);
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

  it('ajoute le chevron masqué aux technologies d\'assistance, dans le pied', async () => {
    const { card } = await render();
    const chevron = card.querySelector('.lc-kpi-card__footer .lc-kpi-card__chevron')!;
    expect(chevron.getAttribute('aria-hidden')).toBe('true');
    expect(chevron.getAttribute('name')).toBe('chevron-right');
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
