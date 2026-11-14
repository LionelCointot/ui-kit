import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcDescriptionItem, LcDescriptionListComponent } from './description-list.component';

@Component({
  imports: [LcDescriptionListComponent],
  template: `<lc-description-list [items]="items()" (itemAction)="actions.push($event)" />`,
})
class HostComponent {
  readonly items = signal<readonly LcDescriptionItem[]>([
    { term: 'Premier', value: 'x' },
    { term: 'Deuxième', value: 'y', action: { label: 'Modifier', ariaLabel: 'Modifier : Deuxième' } },
    { term: 'Troisième', value: 'z', action: { label: 'Changer' } },
  ]);
  readonly actions: number[] = [];
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, buttons: () => Array.from(element.querySelectorAll<HTMLButtonElement>('dd button')) };
}

describe('LcDescriptionListComponent : action par ligne', () => {
  it('CA-8 : un bouton par ligne dotée d\'une action, aucun sans action', async () => {
    const { element, buttons } = await setup();
    expect(buttons().length).toBe(2);
    const rows = element.querySelectorAll('.lc-description-list__row');
    expect(rows[0].querySelector('button')).toBeNull();
    expect(rows[1].querySelector('button')!.textContent!.trim()).toBe('Modifier');
  });

  it('CA-8 : aria-label fourni sur le bouton, absent sinon', async () => {
    const { buttons } = await setup();
    expect(buttons()[0].getAttribute('aria-label')).toBe('Modifier : Deuxième');
    expect(buttons()[1].hasAttribute('aria-label')).toBe(false);
  });

  it('CA-8 : un clic émet itemAction avec l\'index de la ligne dans items', async () => {
    const { fixture, buttons } = await setup();
    buttons()[0].click();
    buttons()[1].click();
    expect(fixture.componentInstance.actions).toEqual([1, 2]);
  });

  it('CA-8 : l\'index reste correct après changement de items', async () => {
    const { fixture, buttons } = await setup();
    fixture.componentInstance.items.set([
      { term: 'A', value: '1' },
      { term: 'B', value: '2' },
      { term: 'C', value: '3' },
      { term: 'D', value: '4', action: { label: 'Éditer' } },
    ]);
    await fixture.whenStable();
    expect(buttons().length).toBe(1);
    buttons()[0].click();
    expect(fixture.componentInstance.actions).toEqual([3]);
  });

  it('CA-8 : sans aucune action, le rendu existant est inchangé (aucun bouton, un dd par ligne)', async () => {
    const { fixture, element } = await setup();
    fixture.componentInstance.items.set([
      { term: 'A', value: '1' },
      { term: 'B', value: '2', emphasis: true },
    ]);
    await fixture.whenStable();
    expect(element.querySelectorAll('button').length).toBe(0);
    expect(element.querySelectorAll('dt').length).toBe(2);
    expect(element.querySelectorAll('dd').length).toBe(2);
    expect(element.querySelector('.lc-description-list__action')).toBeNull();
    expect(element.querySelectorAll('.lc-description-list__row--emphasis').length).toBe(1);
  });
});
