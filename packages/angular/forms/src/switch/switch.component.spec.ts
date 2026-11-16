import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcSwitchComponent } from './switch.component';

@Component({
  imports: [LcSwitchComponent],
  template: '<button lcSwitch [(checked)]="insurance">Assurance</button>',
})
class SwitchHostComponent {
  readonly insurance = signal(false);
}

@Component({
  imports: [LcSwitchComponent],
  template: '<button lcSwitch aria-label="Option" [extraDescribedBy]="extra()">Option</button>',
})
class SwitchExtraHostComponent {
  readonly extra = signal<string | null>('raison-1 raison-2');
}

@Component({
  imports: [LcFormFieldComponent, LcSwitchComponent],
  template: `<lc-form-field label="Option" hint="Une aide" [errors]="errors()">
    <button lcSwitch [extraDescribedBy]="extra()">Option</button>
  </lc-form-field>`,
})
class SwitchExtraInFieldHostComponent {
  readonly extra = signal<string | null>('raison-externe');
  readonly errors = signal<readonly string[]>([]);
}

describe('LcSwitchComponent', () => {
  it('bascule au clic avec role="switch" et aria-checked', async () => {
    const fixture = TestBed.createComponent(SwitchHostComponent);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-checked')).toBe('false');
    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.insurance()).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  describe('aria-describedby (extraDescribedBy)', () => {
    it('seul, expose les identifiants fournis dès le premier rendu, puis retire l\'attribut quand ils disparaissent', async () => {
      const fixture = TestBed.createComponent(SwitchExtraHostComponent);
      await fixture.whenStable();
      const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
      expect(button.getAttribute('aria-describedby')).toBe('raison-1 raison-2');
      fixture.componentInstance.extra.set(null);
      await fixture.whenStable();
      expect(button.hasAttribute('aria-describedby')).toBe(false);
      fixture.componentInstance.extra.set('raison-3');
      await fixture.whenStable();
      expect(button.getAttribute('aria-describedby')).toBe('raison-3');
    });

    it('sans valeur ni champ, l\'attribut est absent comme avant', async () => {
      const fixture = TestBed.createComponent(SwitchHostComponent);
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('button')!.hasAttribute('aria-describedby')).toBe(false);
    });

    it('dans lc-form-field, l\'aide et l\'erreur du champ puis les identifiants fournis se cumulent, sans espace en trop', async () => {
      const fixture = TestBed.createComponent(SwitchExtraInFieldHostComponent);
      fixture.componentInstance.errors.set(['Une erreur']);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const button = element.querySelector('button')!;
      const hint = element.querySelector('.lc-form-field__hint')!;
      const errors = element.querySelector('.lc-form-field__errors')!;
      expect(button.getAttribute('aria-describedby')).toBe(`${hint.id} ${errors.id} raison-externe`);
      fixture.componentInstance.extra.set(null);
      await fixture.whenStable();
      expect(button.getAttribute('aria-describedby')).toBe(`${hint.id} ${errors.id}`);
      fixture.componentInstance.errors.set([]);
      await fixture.whenStable();
      expect(button.getAttribute('aria-describedby')).toBe(hint.id);
    });

    it('dans lc-form-field sans aide ni erreur, seuls les identifiants fournis restent ; sans rien, l\'attribut est absent', async () => {
      @Component({
        imports: [LcFormFieldComponent, LcSwitchComponent],
        template: '<lc-form-field label="Option"><button lcSwitch [extraDescribedBy]="extra()">Option</button></lc-form-field>',
      })
      class BareFieldHostComponent {
        readonly extra = signal<string | null>('seule');
      }
      const fixture = TestBed.createComponent(BareFieldHostComponent);
      await fixture.whenStable();
      const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
      expect(button.getAttribute('aria-describedby')).toBe('seule');
      fixture.componentInstance.extra.set(null);
      await fixture.whenStable();
      expect(button.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});
