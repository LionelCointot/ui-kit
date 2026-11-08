import { TestBed } from '@angular/core/testing';
import { LcKpiCardComponent } from './kpi-card.component';

describe('LcKpiCardComponent', () => {
  it('affiche la valeur formatée et une variation avec signe et icône', async () => {
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Mensualité');
    fixture.componentRef.setInput('value', 1159.92);
    fixture.componentRef.setInput('format', 'money');
    fixture.componentRef.setInput('delta', { value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.lc-kpi-card__value')!.textContent!.replace(/\s/g, ' ')).toContain('1 159,92');
    const delta = element.querySelector('.lc-kpi-card__delta')!;
    expect(delta.textContent!.replace(/\s/g, ' ')).toContain('−2,50 %');
    expect(delta.querySelector('lc-icon')).not.toBeNull();
    expect(delta.classList).toContain('lc-kpi-card__delta--positive');
  });

  it('affiche un tiret sans valeur et un squelette pendant le chargement', async () => {
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Coût total');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.lc-kpi-card__value')!.textContent).toBe('—');
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(element.querySelector('lc-skeleton')).not.toBeNull();
    expect(element.getAttribute('aria-busy')).toBe('true');
  });
});
