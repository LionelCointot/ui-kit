import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcInputDirective } from './input.directive';

@Component({
  imports: [LcInputDirective],
  template: `<textarea lcInput autoResize [value]="text()"></textarea><textarea lcInput id="fixed" [value]="text()"></textarea>`,
})
class HostComponent {
  readonly text = signal('une ligne');
}

describe('LcInputDirective : autoResize', () => {
  // jsdom ne mesure rien : la hauteur de contenu vaut 10 px par caractère.
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')!;
  beforeEach(() => Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLTextAreaElement) { return (this.value?.length ?? 0) * 10; },
  }));
  afterEach(() => Object.defineProperty(Element.prototype, 'scrollHeight', original));

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [area, fixed] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLTextAreaElement>('textarea'));
    return { fixture, area, fixed };
  }

  it('ajuste la hauteur dès l\'initialisation (valeur déjà présente)', async () => {
    const { area } = await setup();
    expect(area.style.height).toBe('90px');
  });

  it('ajuste la hauteur quand la valeur change par programme (sans événement input)', async () => {
    const { fixture, area } = await setup();
    fixture.componentInstance.text.set('une ligne de plus');
    await fixture.whenStable();
    expect(area.style.height).toBe('170px');
  });

  it('ajuste la hauteur à la frappe', async () => {
    const { area } = await setup();
    area.value = 'x'.repeat(20);
    area.dispatchEvent(new Event('input'));
    expect(area.style.height).toBe('200px');
  });

  it('sans autoResize, la hauteur n\'est jamais fixée', async () => {
    const { fixture, fixed } = await setup();
    fixture.componentInstance.text.set('autre texte');
    await fixture.whenStable();
    expect(fixed.style.height).toBe('');
  });
});
