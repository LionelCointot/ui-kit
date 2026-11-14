import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcMeterColor, LcMeterComponent } from './meter.component';

@Component({
  imports: [LcMeterComponent],
  template: `<lc-meter [value]="value()" [min]="min()" [max]="max()" label="Taux de remplissage" [valueText]="valueText()"
    [themeColor]="color()" [showValue]="showValue()" />`,
})
class MeterHostComponent {
  readonly value = signal<number | null>(40);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly valueText = signal<string | undefined>(undefined);
  readonly color = signal<LcMeterColor>('primary');
  readonly showValue = signal(false);
}

describe('LcMeterComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(MeterHostComponent);
    await fixture.whenStable();
    const meter = (fixture.nativeElement as HTMLElement).querySelector('lc-meter') as HTMLElement;
    const fill = () => meter.querySelector('.lc-meter__fill') as HTMLElement;
    const update = async (change: (host: MeterHostComponent) => void) => {
      change(fixture.componentInstance);
      await fixture.whenStable();
    };
    return { fixture, meter, fill, update };
  }

  // CA-K5.1
  describe('valeur et plage', () => {
    it('CA-K5.1 : expose role="meter" avec aria-valuenow / min / max / valuetext et aria-label', async () => {
      const { meter, fill } = await setup();
      expect(meter.getAttribute('role')).toBe('meter');
      expect(meter.getAttribute('aria-label')).toBe('Taux de remplissage');
      expect(meter.getAttribute('aria-valuenow')).toBe('40');
      expect(meter.getAttribute('aria-valuemin')).toBe('0');
      expect(meter.getAttribute('aria-valuemax')).toBe('100');
      expect(meter.getAttribute('aria-valuetext')).toBe('40');
      expect(fill().style.inlineSize).toBe('40%');
      expect(meter.querySelector('.lc-meter__track')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('un min et un max personnalisés calculent le remplissage dans la plage', async () => {
      const { meter, fill, update } = await setup();
      await update((host) => { host.min.set(10); host.max.set(30); host.value.set(20); });
      expect(fill().style.inlineSize).toBe('50%');
      expect(meter.getAttribute('aria-valuemin')).toBe('10');
      expect(meter.getAttribute('aria-valuemax')).toBe('30');
    });

    // CA-K5.1 (hors bornes)
    it.each([
      [150, '100%'],
      [-20, '0%'],
    ])('CA-K5.1 : la valeur %s est recadrée visuellement (%s), aria-valuenow reste inchangé', async (value, percent) => {
      const { meter, fill, update } = await setup();
      await update((host) => host.value.set(value));
      expect(fill().style.inlineSize).toBe(percent);
      expect(meter.getAttribute('aria-valuenow')).toBe(String(value));
    });

    // CA-K5.2
  });
  describe('valeur non mesurée', () => {
    it('CA-K5.2 : null → piste vide, « — » visible, aria-valuetext « Non mesuré »', async () => {
      const { meter, fill, update } = await setup();
      await update((host) => { host.value.set(null); host.showValue.set(true); host.valueText.set('Ignoré'); });
      expect(fill().style.inlineSize).toBe('0%');
      expect(meter.querySelector('.lc-meter__value')!.textContent).toBe('—');
      expect(meter.getAttribute('aria-valuetext')).toBe('Non mesuré');
      expect(meter.getAttribute('aria-valuenow')).toBe('0');
      expect(meter.getAttribute('role')).toBe('meter');
    });

    it('CA-K5.2 : « Non mesuré » suit la langue (LC_LABELS_EN)', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { meter, update } = await setup();
      await update((host) => host.value.set(null));
      expect(meter.getAttribute('aria-valuetext')).toBe('Not measured');
    });

    it('NaN est traité comme non mesuré', async () => {
      const { meter, fill, update } = await setup();
      await update((host) => host.value.set(Number.NaN));
      expect(fill().style.inlineSize).toBe('0%');
      expect(meter.getAttribute('aria-valuetext')).toBe('Non mesuré');
    });
  });

  describe('affichage', () => {
    it('valueText remplace la valeur formatée dans aria-valuetext et dans le texte visible', async () => {
      const { meter, update } = await setup();
      await update((host) => { host.valueText.set('40 sur 100 emplacements'); host.showValue.set(true); });
      expect(meter.getAttribute('aria-valuetext')).toBe('40 sur 100 emplacements');
      expect(meter.querySelector('.lc-meter__value')!.textContent).toBe('40 sur 100 emplacements');
    });

    it('showValue masqué par défaut : la valeur n\'est affichée qu\'à la demande', async () => {
      const { meter, update } = await setup();
      expect(meter.querySelector('.lc-meter__value')).toBeNull();
      await update((host) => host.showValue.set(true));
      expect(meter.querySelector('.lc-meter__value')!.textContent).toBe('40');
    });
  });

  describe('plage invalide', () => {
    it('max ≤ min : remplissage vide, sans division par zéro ni valeur négative', async () => {
      const { meter, fill, update } = await setup();
      await update((host) => { host.min.set(50); host.max.set(50); host.value.set(50); });
      expect(fill().style.inlineSize).toBe('0%');
      await update((host) => { host.min.set(100); host.max.set(0); host.value.set(30); });
      expect(fill().style.inlineSize).toBe('0%');
      expect(meter.getAttribute('aria-valuenow')).toBe('30');
    });
  });

  describe('couleurs et tailles', () => {
    it.each(['primary', 'success', 'warning', 'error', 'neutral'] as const)('applique la couleur « %s » et la taille small par défaut', async (color) => {
      const { meter, update } = await setup();
      await update((host) => host.color.set(color));
      expect(meter.classList).toContain(`lc-meter--${color}`);
      expect(meter.classList).toContain('lc-meter--small');
    });
  });
  });
