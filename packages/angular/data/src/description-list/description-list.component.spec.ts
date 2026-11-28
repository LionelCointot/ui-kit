import { TestBed } from '@angular/core/testing';
import { LcDescriptionListComponent } from './description-list.component';

describe('LcDescriptionListComponent', () => {
  it('rend un dl avec termes, valeurs formatées, mention et ligne de total', async () => {
    const fixture = TestBed.createComponent(LcDescriptionListComponent);
    fixture.componentRef.setInput('items', [
      { term: 'Capital emprunté', value: 250000, format: 'money' },
      { term: 'Taux', value: 3.5, format: 'percent', badge: 'estimation' },
      { term: 'Coût total', value: 300000, format: 'money', emphasis: true },
    ]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('dl')).not.toBeNull();
    expect(element.querySelectorAll('dt').length).toBe(3);
    expect(element.querySelectorAll('dd')[0].textContent!.replace(/\s/g, ' ')).toContain('250 000,00');
    expect(element.querySelectorAll('dt')[1].querySelector('lc-badge')!.textContent).toContain('estimation');
    expect(element.querySelectorAll('.lc-description-list__row--emphasis').length).toBe(1);
  });
});

describe('LcDescriptionListComponent : états', () => {
  const render = async (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(LcDescriptionListComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };
  const items = [{ term: 'Taux', value: 3.5, format: 'percent' }];

  it('undefined : 3 paires en squelette et aria-busy, sans donnée', async () => {
    const element = await render({ items: undefined });
    expect(element.querySelectorAll('dt lc-skeleton').length).toBe(3);
    expect(element.querySelectorAll('dd lc-skeleton').length).toBe(3);
    expect(element.getAttribute('aria-busy')).toBe('true');
  });

  it('loading avec données : squelette, donnée non rendue', async () => {
    const element = await render({ items, loading: true });
    expect(element.textContent).not.toContain('Taux');
    expect(element.getAttribute('aria-busy')).toBe('true');
  });

  it('null et [] : état vide (emptyMessage, sinon noData), sans aria-busy', async () => {
    expect((await render({ items: null, emptyMessage: 'Rien' })).textContent).toContain('Rien');
    const element = await render({ items: [], emptyMessage: '' });
    expect(element.textContent).toContain('Aucune donnée');
    expect(element.querySelector('lc-skeleton')).toBeNull();
    expect(element.getAttribute('aria-busy')).toBeNull();
  });

  it('stale : données gardées, classe et aria-busy', async () => {
    const element = await render({ items, stale: true });
    expect(element.classList).toContain('lc-description-list--stale');
    expect(element.querySelectorAll('dt').length).toBe(1);
    expect(element.getAttribute('aria-busy')).toBe('true');
  });
});
