import { ConnectedPosition, FlexibleConnectedPositionStrategy } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcComboboxOptionDirective } from './combobox-option.directive';
import { LcComboboxComponent } from './combobox.component';
import { LcHighlightComponent } from './highlight.component';

interface Department {
  readonly code: string;
  readonly name: string;
}

const DEPARTMENTS: readonly Department[] = [
  { code: '01', name: 'Ain' },
  { code: '2A', name: 'Corse-du-Sud' },
  { code: '69', name: 'Rhône' },
  { code: '974', name: 'La Réunion' },
  { code: '95', name: 'Val-d\'Oise' },
];

@Component({
  imports: [LcComboboxComponent],
  template: `
    <lc-combobox ariaLabel="Département" [options]="options" [displayWith]="display" [trackBy]="key" [filterKeys]="keys"
      [(value)]="value" [clearable]="clearable()" [readonly]="readonly()" (selectionChange)="changes.push($event)" />
    <button id="other" type="button">autre</button>
  `,
})
class ComboboxHostComponent {
  readonly options: readonly Department[] = DEPARTMENTS;
  readonly value = signal<Department | null>(null);
  readonly clearable = signal(true);
  readonly readonly = signal(false);
  readonly changes: (Department | null)[] = [];
  readonly display = (d: Department) => `${d.code} – ${d.name}`;
  readonly key = (d: Department) => d.code;
  readonly keys = (d: Department) => [d.code, d.name];
}

@Component({
  imports: [LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent],
  template: `
    <lc-combobox ariaLabel="Département" [options]="options" [displayWith]="display" [trackBy]="key" [(value)]="value">
      <ng-template lcComboboxOption [lcComboboxOptionOf]="options" let-department let-text="text">
        <strong class="code">{{ department.code }}</strong>
        <span class="name" [lcHighlight]="department.name" [lcHighlightTerm]="text"></span>
      </ng-template>
    </lc-combobox>
  `,
})
class ComboboxTemplateHostComponent {
  readonly options: readonly Department[] = DEPARTMENTS;
  readonly value = signal<Department | null>(null);
  readonly display = (d: Department) => d.name;
  readonly key = (d: Department) => d.code;
}

function key(target: Element, name: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('LcComboboxComponent (mode local)', () => {
  let fixture: ComponentFixture<ComboboxHostComponent>;
  let input: HTMLInputElement;

  const panel = () => document.querySelector('.lc-combobox-panel');
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  const labels = () => options().map((option) => option.textContent?.trim());

  async function type(text: string): Promise<void> {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function press(name: string, init: KeyboardEventInit = {}): Promise<KeyboardEvent> {
    const event = key(input, name, init);
    await fixture.whenStable();
    return event;
  }

  async function setup(): Promise<void> {
    fixture = TestBed.createComponent(ComboboxHostComponent);
    await fixture.whenStable();
    input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
  }

  beforeEach(setup);
  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
  });

  it('expose le motif combobox : rôle, aria-autocomplete, aria-expanded', () => {
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-label')).toBe('Département');
    expect(input.getAttribute('aria-controls')).toBeNull();
  });

  it('ouvre la liste au focus et la relie par aria-controls', async () => {
    input.focus();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const listbox = document.querySelector('[role="listbox"]')!;
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(options()).toHaveLength(5);
    expect(listbox.getAttribute('aria-label')).toBe('Département');
  });

  it('filtre par nom ou numéro et place la meilleure proposition en tête, active', async () => {
    input.focus();
    await type('rho');
    expect(labels()).toEqual(['69 – Rhône']);
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[0].id);
    await type('2a');
    expect(labels()).toEqual(['2A – Corse-du-Sud']);
    await type('974');
    expect(labels()).toEqual(['974 – La Réunion']);
  });

  it('Entrée sélectionne l\'option active : valeur posée, texte affiché, une seule émission', async () => {
    input.focus();
    await type('rho');
    await press('Enter');
    expect(fixture.componentInstance.value()?.code).toBe('69');
    expect(input.value).toBe('69 – Rhône');
    expect(fixture.componentInstance.changes).toEqual([DEPARTMENTS[2]]);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  it('les flèches déplacent l\'option active en boucle ; Bas ouvre une liste fermée', async () => {
    input.focus();
    await press('Escape');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    await press('ArrowDown');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    await press('ArrowDown');
    expect(options()[0].classList).toContain('lc-combobox-panel__option--active');
    await press('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[1].id);
    await press('ArrowUp');
    await press('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[4].id);
  });

  it('Alt+Bas ouvre sans déplacer l\'option active', async () => {
    input.focus();
    await press('Escape');
    await press('ArrowDown', { altKey: true });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('Début et Fin ne sont pas interceptés (ils restent dans le texte)', async () => {
    input.focus();
    await fixture.whenStable();
    expect(key(input, 'Home').defaultPrevented).toBe(false);
    expect(key(input, 'End').defaultPrevented).toBe(false);
  });

  it('Échap ferme la liste, un second Échap vide le champ', async () => {
    input.focus();
    await type('rho');
    await press('Enter');
    input.blur();
    input.focus();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    await press('Escape');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.value).toBe('69 – Rhône');
    await press('Escape');
    expect(input.value).toBe('');
    expect(fixture.componentInstance.value()).toBeNull();
    expect(fixture.componentInstance.changes).toEqual([DEPARTMENTS[2], null]);
  });

  it('ferme en fondu (lc-overlay--closing puis retrait) ; rouvrir pendant le fondu garde la liste', async () => {
    input.focus();
    await fixture.whenStable();
    const pane = document.querySelector<HTMLElement>('.lc-combobox-overlay')!;
    key(input, 'Escape');
    expect(pane.classList.contains('lc-overlay--closing')).toBe(true);
    expect(panel()).not.toBeNull();
    key(input, 'ArrowDown');
    await fixture.whenStable();
    expect(pane.classList.contains('lc-overlay--closing')).toBe(false);
    expect(panel()).not.toBeNull();
    await press('Escape');
    expect(panel()).toBeNull();
  });

  it('les positions au-dessus portent lc-overlay--above, celles en dessous non', async () => {
    const withPositions = vi.spyOn(FlexibleConnectedPositionStrategy.prototype, 'withPositions');
    input.focus();
    await fixture.whenStable();
    const positions = withPositions.mock.calls[0][0] as ConnectedPosition[];
    withPositions.mockRestore();
    expect(positions.length).toBeGreaterThan(0);
    for (const position of positions) expect(position.panelClass).toBe(position.overlayY === 'bottom' ? 'lc-overlay--above' : undefined);
  });

  it('Tab ferme la liste sans sélectionner', async () => {
    input.focus();
    await type('rho');
    await press('Tab');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('saisir un texte différent remet la valeur à null, avec une seule émission', async () => {
    fixture.componentInstance.value.set(DEPARTMENTS[2]);
    await fixture.whenStable();
    expect(input.value).toBe('69 – Rhône');
    input.focus();
    await type('69 – Rhôn');
    expect(fixture.componentInstance.value()).toBeNull();
    expect(input.value).toBe('69 – Rhôn');
    await type('69 – Rh');
    expect(fixture.componentInstance.changes).toEqual([null]);
  });

  it('une valeur posée par le code s\'affiche sans émettre selectionChange', async () => {
    fixture.componentInstance.value.set(DEPARTMENTS[0]);
    await fixture.whenStable();
    expect(input.value).toBe('01 – Ain');
    fixture.componentInstance.value.set(null);
    await fixture.whenStable();
    expect(input.value).toBe('');
    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('à la sortie, un texte égal à une seule option la sélectionne', async () => {
    input.focus();
    await type('rhone');
    input.focus();
    input.blur();
    await fixture.whenStable();
    // « rhone » n'égale pas « 69 – Rhône » : aucune sélection
    expect(fixture.componentInstance.value()).toBeNull();
    input.focus();
    await type('69 - rhone');
    input.blur();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()?.code).toBe('69');
    expect(input.value).toBe('69 – Rhône');
  });

  it('à la sortie sans proposition : le texte reste, valeur null, aide reliée par aria-describedby', async () => {
    input.focus();
    await type('zzz');
    input.blur();
    await fixture.whenStable();
    const hint = (fixture.nativeElement as HTMLElement).querySelector('.lc-combobox__hint')!;
    expect(hint.textContent).toContain('Choisissez une proposition dans la liste');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
    expect(input.value).toBe('zzz');
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('affiche « Aucun résultat » sans correspondance', async () => {
    input.focus();
    await type('zzz');
    expect(document.querySelector('.lc-combobox-panel__message')?.textContent).toContain('Aucun résultat');
    expect(input.getAttribute('aria-controls')).toBeNull();
  });

  it('marque l\'option sélectionnée par aria-selected', async () => {
    fixture.componentInstance.value.set(DEPARTMENTS[3]);
    await fixture.whenStable();
    input.focus();
    await fixture.whenStable();
    expect(options().map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'true', 'false']);
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[3].id);
  });

  it('sélectionne au clic', async () => {
    input.focus();
    await fixture.whenStable();
    options()[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()?.code).toBe('2A');
  });

  it('le bouton Effacer vide le champ et la valeur', async () => {
    fixture.componentInstance.value.set(DEPARTMENTS[0]);
    await fixture.whenStable();
    const clear = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.lc-combobox__clear')!;
    expect(clear.getAttribute('aria-label')).toBe('Effacer');
    clear.click();
    await fixture.whenStable();
    expect(input.value).toBe('');
    expect(fixture.componentInstance.value()).toBeNull();
    expect(fixture.componentInstance.changes).toEqual([null]);
  });

  it('lecture seule : aucune ouverture, aria-readonly', async () => {
    fixture.componentInstance.readonly.set(true);
    await fixture.whenStable();
    input.focus();
    await press('ArrowDown');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-readonly')).toBe('true');
    expect(panel()).toBeNull();
  });
});

describe('LcComboboxComponent (gabarit d\'option)', () => {
  it('rend le gabarit fourni avec le texte saisi pour le surlignage', async () => {
    const fixture = TestBed.createComponent(ComboboxTemplateHostComponent);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    input.focus();
    input.value = 'rho';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    const option = document.querySelector('[role="option"]')!;
    expect(option.querySelector('.code')?.textContent).toBe('69');
    expect(option.querySelector('mark')?.textContent).toBe('Rhô');
    fixture.destroy();
  });
});
