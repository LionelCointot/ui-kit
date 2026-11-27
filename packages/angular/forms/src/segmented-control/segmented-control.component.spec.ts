import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LcIconComponent, LcOption } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcSegmentedControlComponent } from './segmented-control.component';

type View = 'total' | 'loan' | 'year';

@Component({
  imports: [LcSegmentedControlComponent],
  template: '<lc-segmented-control ariaLabel="Vue" [options]="options" [(value)]="view" />',
})
class SegmentedHostComponent {
  readonly options: readonly LcOption<View>[] = [
    { value: 'total', label: 'Cumul' },
    { value: 'loan', label: 'Par prêt', disabled: true },
    { value: 'year', label: 'Par année', icon: 'calendar' },
  ];
  readonly view = signal<View | null>('total');
}

@Component({
  imports: [LcSegmentedControlComponent],
  template: `<lc-segmented-control ariaLabel="Vue" controlled [options]="options" [value]="view()"
    (valueChange)="changes.push($event)" (valueRequest)="requests.push($event)" />`,
})
class ControlledHostComponent {
  readonly options: readonly LcOption<View>[] = [
    { value: 'total', label: 'Cumul' },
    { value: 'loan', label: 'Par prêt', disabled: true },
    { value: 'year', label: 'Par année', icon: 'calendar' },
  ];
  readonly view = signal<View | null>('total');
  readonly requests: (View | null)[] = [];
  readonly changes: (View | null)[] = [];
}

@Component({
  imports: [LcSegmentedControlComponent],
  template: '<lc-segmented-control ariaLabel="Vue" [options]="options" [extraDescribedBy]="extra()" />',
})
class ExtraDescribedByHostComponent {
  readonly options: readonly LcOption<View>[] = [{ value: 'total', label: 'Cumul' }];
  readonly extra = signal<string | null>('aide-1 aide-2');
}

@Component({
  imports: [LcFormFieldComponent, LcSegmentedControlComponent],
  template: `<lc-form-field label="Vue" hint="Choisissez une vue">
    <lc-segmented-control [options]="options" [extraDescribedBy]="extra()" />
  </lc-form-field>`,
})
class ExtraDescribedByInFieldHostComponent {
  readonly options: readonly LcOption<View>[] = [{ value: 'total', label: 'Cumul' }];
  readonly extra = signal<string | null>('aide-externe');
}

describe('LcSegmentedControlComponent', () => {
  describe('aria-describedby (extraDescribedBy)', () => {
    it('seul, expose les identifiants fournis, puis retire l\'attribut quand ils disparaissent', async () => {
      const fixture = TestBed.createComponent(ExtraDescribedByHostComponent);
      await fixture.whenStable();
      const group = (fixture.nativeElement as HTMLElement).querySelector('lc-segmented-control')!;
      expect(group.getAttribute('aria-describedby')).toBe('aide-1 aide-2');
      fixture.componentInstance.extra.set(null);
      await fixture.whenStable();
      expect(group.hasAttribute('aria-describedby')).toBe(false);
    });

    it('dans un lc-form-field, ajoute les identifiants après ceux du champ', async () => {
      const fixture = TestBed.createComponent(ExtraDescribedByInFieldHostComponent);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const group = element.querySelector('lc-segmented-control')!;
      const hint = element.querySelector('.lc-form-field__hint')!;
      expect(group.getAttribute('aria-describedby')).toBe(`${hint.id} aide-externe`);
      fixture.componentInstance.extra.set(null);
      await fixture.whenStable();
      expect(group.getAttribute('aria-describedby')).toBe(hint.id);
    });

    it('sans extraDescribedBy ni champ, n\'a pas d\'aria-describedby', async () => {
      const fixture = TestBed.createComponent(SegmentedHostComponent);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('lc-segmented-control')!.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('coche de l\'option active', () => {
    it('l\'option active sans icône affiche la coche, une option avec icône garde son icône, et aria-checked', async () => {
      const fixture = TestBed.createComponent(SegmentedHostComponent);
      await fixture.whenStable();
      const radios = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="radio"]'));
      const icon = (radio: HTMLElement) =>
        fixture.debugElement.queryAll(By.directive(LcIconComponent))
          .find((debug) => radio.contains(debug.nativeElement))?.componentInstance.name() ?? null;
      expect(radios.map(icon)).toEqual(['check', null, 'calendar']);
      radios[2].click();
      await fixture.whenStable();
      expect(radios.map(icon)).toEqual([null, null, 'calendar']);
      expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
    });
  });

  describe('mode controlled', () => {
    async function setupControlled() {
      const fixture = TestBed.createComponent(ControlledHostComponent);
      await fixture.whenStable();
      const radios = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="radio"]'));
      const checked = () => radios.map((radio) => radio.getAttribute('aria-checked'));
      return { fixture, host: fixture.componentInstance, radios, checked };
    }

    it('un clic émet valueRequest sans changer la sélection ; le parent qui met value à jour fait suivre l\'affichage', async () => {
      const { fixture, host, radios, checked } = await setupControlled();
      radios[2].click();
      await fixture.whenStable();
      expect(host.requests).toEqual(['year']);
      expect(host.changes).toEqual([]);
      expect(checked()).toEqual(['true', 'false', 'false']);
      host.view.set('year');
      await fixture.whenStable();
      expect(checked()).toEqual(['false', 'false', 'true']);
    });

    it('flèches, Début et Fin émettent valueRequest sans changer la sélection', async () => {
      const { fixture, host, radios, checked } = await setupControlled();
      const press = async (radio: HTMLElement, key: string) => {
        radio.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        await fixture.whenStable();
      };
      await press(radios[0], 'ArrowRight');
      await press(radios[0], 'End');
      await press(radios[0], 'ArrowLeft');
      host.view.set('year');
      await fixture.whenStable();
      await press(radios[2], 'Home');
      expect(host.requests).toEqual(['year', 'year', 'year', 'total']);
      expect(host.changes).toEqual([]);
      expect(checked()).toEqual(['false', 'false', 'true']);
    });

    it('une option désactivée n\'émet rien', async () => {
      const { fixture, host, radios } = await setupControlled();
      radios[1].click();
      await fixture.whenStable();
      expect(host.requests).toEqual([]);
    });

    it('sans controlled, le comportement est inchangé : value change et valueRequest n\'est pas émis', async () => {
      const fixture = TestBed.createComponent(SegmentedHostComponent);
      await fixture.whenStable();
      const segmented = fixture.debugElement.query(By.directive(LcSegmentedControlComponent)).componentInstance;
      const requests: unknown[] = [];
      segmented.valueRequest.subscribe((value: unknown) => requests.push(value));
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="radio"]')[2].click();
      await fixture.whenStable();
      expect(fixture.componentInstance.view()).toBe('year');
      expect(requests).toEqual([]);
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(SegmentedHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const radios = Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    return { fixture, element, radios };
  }

  it('expose un radiogroup nommé et l\'option sélectionnée', async () => {
    const { element, radios } = await setup();
    const group = element.querySelector('lc-segmented-control')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Vue');
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
    expect(radios[1].disabled).toBe(true);
  });

  it('les flèches déplacent focus et sélection en sautant les options désactivées', async () => {
    const { fixture, radios } = await setup();
    radios[0].focus();
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('year');
    expect(document.activeElement).toBe(radios[2]);
    expect(radios[2].tabIndex).toBe(0);
    radios[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('total');
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('year');
  });

  it('sélectionne au clic', async () => {
    const { fixture, radios } = await setup();
    radios[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('year');
    expect(radios[2].getAttribute('aria-checked')).toBe('true');
  });
});

@Component({
  imports: [LcSegmentedControlComponent],
  template: '<lc-segmented-control ariaLabel="Vue" [options]="options" [indicatorProgress]="progress()" value="a" />',
})
class TrackedHostComponent {
  readonly options: readonly LcOption<string>[] = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
  readonly progress = signal<number | null>(0.5);
}

describe('LcSegmentedControlComponent indicatorProgress', () => {
  it('place le fond entre les segments voisins, et le pose sous le segment choisi quand la progression est nulle', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const b = this.getAttribute('role') === 'radio' && this.textContent!.includes('B');
      const radio = this.getAttribute('role') === 'radio';
      return { left: b ? 100 : 0, width: radio ? (b ? 60 : 100) : 160 } as DOMRect;
    });
    const fixture = TestBed.createComponent(TrackedHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const indicator = element.querySelector<HTMLElement>('.lc-segmented-control__indicator')!;
    expect(indicator.parentElement!.getAttribute('aria-hidden')).toBe('true');
    expect([indicator.style.left, indicator.style.width, /inset\(\S+ (\S+) /.exec(indicator.style.clipPath)?.[1]]).toEqual(['50px', '110px', '30px']);
    expect(element.querySelector('lc-segmented-control')!.classList).toContain('lc-segmented-control--tracked');
    fixture.componentInstance.progress.set(null);
    await fixture.whenStable();
    expect(element.querySelector('lc-segmented-control')!.classList).not.toContain('lc-segmented-control--tracked');
    expect(indicator.style.left).toBe('0px');
    vi.restoreAllMocks();
  });
});

@Component({
  imports: [LcSegmentedControlComponent],
  template: '<lc-segmented-control ariaLabel="Vue" fillMode="solid" [options]="options" [(value)]="value" />',
})
class SolidHostComponent {
  readonly options: readonly LcOption<string>[] = [{ value: 'a', label: 'A', icon: 'info' }, { value: 'b', label: 'B', icon: 'check' }];
  readonly value = signal<string | null>('a');
}

describe('LcSegmentedControlComponent fillMode solid', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pose la pastille sur le segment choisi, la fait glisser au choix, garde les icônes', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const b = this.getAttribute('role') === 'radio' && this.textContent!.includes('B');
      const radio = this.getAttribute('role') === 'radio';
      return { left: b ? 100 : 0, width: radio ? (b ? 60 : 100) : 160 } as DOMRect;
    });
    const fixture = TestBed.createComponent(SolidHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const indicator = element.querySelector<HTMLElement>('.lc-segmented-control__indicator')!;
    expect(element.querySelector('lc-segmented-control')!.classList).toContain('lc-segmented-control--solid');
    expect([indicator.style.left, indicator.style.width]).toEqual(['0px', '160px']);
    expect(indicator.classList).toContain('lc-segmented-control__indicator--instant');
    const icons = () => fixture.debugElement.queryAll(By.directive(LcIconComponent)).map((debug) => debug.componentInstance.name());
    expect(icons()).toEqual(['info', 'check']);
    element.querySelectorAll<HTMLElement>('[role=radio]')[1].click();
    await fixture.whenStable();
    expect([indicator.style.left, indicator.style.width, indicator.dataset['direction']]).toEqual(['100px', '60px', 'forward']);
    expect(indicator.classList).not.toContain('lc-segmented-control__indicator--instant');
    fixture.componentInstance.value.set(null);
    await fixture.whenStable();
    expect(indicator.hidden).toBe(true);
  });

  it('D-20 : la pastille existe aussi en `outline` (défaut), sous le segment choisi', async () => {
    const fixture = TestBed.createComponent(SegmentedHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('lc-segmented-control')!.classList).not.toContain('lc-segmented-control--solid');
    const indicator = element.querySelector<HTMLElement>('.lc-segmented-control__indicator')!;
    expect(indicator.hidden).toBe(false);
    expect(indicator.parentElement!.getAttribute('aria-hidden')).toBe('true');
  });
});
