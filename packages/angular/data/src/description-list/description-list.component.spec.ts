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
