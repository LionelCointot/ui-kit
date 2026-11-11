import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcSliderComponent, LcSliderMark, LcSliderShowValue } from './slider.component';

@Component({
  imports: [LcSliderComponent],
  template: `
    <lc-slider ariaLabel="Part épargnée" [(value)]="value" [min]="min()" [max]="max()" [step]="step()" [unit]="unit()"
      [decimals]="decimals()" [showValue]="showValue()" [marks]="marks()" [readonly]="readonly()"
      (committed)="committed.push($event)" />
  `,
})
class SliderHostComponent {
  readonly value = signal<number | null>(60);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(5);
  readonly unit = signal<string | undefined>('%');
  readonly decimals = signal(0);
  readonly showValue = signal<LcSliderShowValue>('label');
  readonly marks = signal<readonly LcSliderMark[]>([]);
  readonly readonly = signal(false);
  readonly committed: (number | null)[] = [];
}

@Component({
  imports: [LcSliderComponent, LcFormFieldComponent],
  template: `<lc-form-field label="Épargne"><lc-slider [(value)]="value" unit="€" showValue="input" [max]="3000" /></lc-form-field>`,
})
class SliderInFieldComponent {
  readonly value = signal<number | null>(1500);
}

/** Les espaces de la locale (fines insécables) deviennent des espaces simples pour comparer. */
const plain = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ');

@Component({
  imports: [LcSliderComponent],
  template: `<lc-slider ariaLabel="Avancement" themeColor="highlight" [value]="40" />`,
})
class HighlightSliderHostComponent {}

describe('LcSliderComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(SliderHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const range = () => element.querySelector<HTMLInputElement>('input[type="range"]')!;
    const drag = async (to: number, finish = true) => {
      range().value = String(to);
      range().dispatchEvent(new Event('input', { bubbles: true }));
      if (finish) range().dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.whenStable();
    };
    return { fixture, host: fixture.componentInstance, element, range, drag };
  }

  it('est un input range natif avec bornes et pas', async () => {
    const { range } = await setup();
    expect(range().type).toBe('range');
    expect([range().min, range().max, range().step, range().value]).toEqual(['0', '100', '5', '60']);
    expect(range().getAttribute('aria-label')).toBe('Part épargnée');
  });

  it('aria-valuetext : « 60 % » avec l\'unité %, « 1 500 € » avec l\'unité €', async () => {
    const { fixture, host, range } = await setup();
    expect(plain(range().getAttribute('aria-valuetext'))).toBe('60 %');
    host.unit.set('€');
    host.max.set(3000);
    host.step.set(50);
    host.value.set(1500);
    await fixture.whenStable();
    expect(plain(range().getAttribute('aria-valuetext'))).toBe('1 500 €');
  });

  it('valueText personnalisé', async () => {
    @Component({
      imports: [LcSliderComponent],
      template: `<lc-slider ariaLabel="Part" [value]="60" unit="%" [valueText]="text" />`,
    })
    class CustomTextComponent {
      readonly text = (value: number) => `${value} % de l'écart`;
    }
    const fixture = TestBed.createComponent(CustomTextComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('input')!.getAttribute('aria-valuetext')).toBe('60 % de l\'écart');
  });

  it('affiche la valeur formatée et l\'unité à droite (showValue label)', async () => {
    const { element } = await setup();
    expect(plain(element.querySelector('.lc-slider__value')?.textContent)).toBe('60 %');
  });

  it('le glissement met à jour la valeur en direct ; committed suit la fin du geste', async () => {
    const { host, drag } = await setup();
    await drag(75, false);
    expect(host.value()).toBe(75);
    expect(host.committed).toEqual([]);
    await drag(80);
    expect(host.value()).toBe(80);
    expect(host.committed).toEqual([80]);
  });

  it('arrondit la valeur émise à `decimals`', async () => {
    const { fixture, host, drag } = await setup();
    host.step.set(0.01);
    host.decimals.set(1);
    host.unit.set('ans');
    await fixture.whenStable();
    await drag(7.37);
    expect(host.value()).toBe(7.4);
  });

  it('valeur nulle : poignée à min, aucune valeur ni aria-valuetext', async () => {
    const { fixture, host, range, element } = await setup();
    host.value.set(null);
    await fixture.whenStable();
    expect(range().value).toBe('0');
    expect(range().hasAttribute('aria-valuetext')).toBe(false);
    expect(element.querySelector('.lc-slider__value')?.textContent?.trim()).toBe('');
  });

  it('valeur hors bornes : conservée dans le modèle, poignée à la borne', async () => {
    const { fixture, host, range } = await setup();
    host.value.set(250);
    await fixture.whenStable();
    expect(host.value()).toBe(250);
    expect(range().value).toBe('100');
    expect(range().getAttribute('aria-valuetext')).not.toBeNull();
  });

  it('showValue input : le champ couplé et le curseur restent synchronisés', async () => {
    const { fixture, host, element, range } = await setup();
    host.showValue.set('input');
    await fixture.whenStable();
    const number = element.querySelector<HTMLInputElement>('lc-number-input input')!;
    expect(number.value).toBe('60');
    expect(plain(element.querySelector('lc-number-input')?.textContent)).toContain('%');
    number.focus();
    number.value = '42';
    number.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(host.value()).toBe(42);
    expect(range().value).toBe('42');
    number.blur();
    await fixture.whenStable();
    expect(host.committed).toEqual([42]);
    range().value = '10';
    range().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(number.value).toBe('10');
  });

  it('showValue input : au focus du champ couplé, tout le texte est sélectionné et la frappe remplace la valeur', async () => {
    const { fixture, host, element, range } = await setup();
    host.showValue.set('input');
    await fixture.whenStable();
    const number = element.querySelector<HTMLInputElement>('lc-number-input input')!;
    number.focus();
    await fixture.whenStable();
    expect([number.selectionStart, number.selectionEnd]).toEqual([0, 2]);
    number.setRangeText('85', 0, 2, 'end');
    number.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(host.value()).toBe(85);
    expect(range().value).toBe('85');
  });

  it('showValue none : rien à côté de la piste', async () => {
    const { fixture, host, element } = await setup();
    host.showValue.set('none');
    await fixture.whenStable();
    expect(element.querySelector('.lc-slider__value')).toBeNull();
    expect(element.querySelector('lc-number-input')).toBeNull();
  });

  it('graduations : datalist relié, libellés, repères hors bornes ignorés', async () => {
    const { fixture, host, element, range } = await setup();
    host.marks.set([{ value: 0, label: '0 %' }, { value: 50, label: '50 %' }, { value: 100 }, { value: 150, label: 'hors' }]);
    await fixture.whenStable();
    const list = element.querySelector('datalist')!;
    expect(range().getAttribute('list')).toBe(list.id);
    expect(list.querySelectorAll('option')).toHaveLength(3);
    expect(Array.from(element.querySelectorAll('.lc-slider__mark-label')).map((label) => label.textContent)).toEqual(['0 %', '50 %']);
  });

  it('lecture seule : aria-readonly, la valeur ne change pas, le curseur reste focalisable', async () => {
    const { fixture, host, range, drag } = await setup();
    host.readonly.set(true);
    await fixture.whenStable();
    expect(range().getAttribute('aria-readonly')).toBe('true');
    expect(range().disabled).toBe(false);
    await drag(10);
    expect(host.value()).toBe(60);
    expect(range().value).toBe('60');
    expect(host.committed).toEqual([]);
  });

  it('expose --lc-slider-fill (pourcentage calculé)', async () => {
    const { element } = await setup();
    expect(element.querySelector<HTMLElement>('lc-slider')!.style.getPropertyValue('--lc-slider-fill')).toBe('60%');
  });

  it('dans lc-form-field : libellé relié au curseur, champ couplé nommé par le libellé', async () => {
    const fixture = TestBed.createComponent(SliderInFieldComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const range = element.querySelector<HTMLInputElement>('input[type="range"]')!;
    const label = element.querySelector('label')!;
    expect(label.htmlFor).toBe(range.id);
    expect(element.querySelector('lc-number-input input')?.getAttribute('aria-label')).toBe('Épargne');
    expect(plain(range.getAttribute('aria-valuetext'))).toBe('1 500 €');
  });

  // CA-K2.2
  it('CA-K2.2 : themeColor="highlight" pose la classe de rôle et laisse le curseur natif intact', async () => {
    const fixture = TestBed.createComponent(HighlightSliderHostComponent);
    await fixture.whenStable();
    const slider = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('lc-slider')!;
    expect(slider.classList).toContain('lc-slider--highlight');
    expect(slider.classList).not.toContain('lc-slider--primary');
    const range = slider.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(range.value).toBe('40');
    expect(range.getAttribute('aria-label')).toBe('Avancement');
  });
});
