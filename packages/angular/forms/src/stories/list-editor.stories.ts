import { Component, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import {
  LcListEditorComponent,
  type LcListEditorItem,
  type LcListEditorMove,
  type LcListEditorRename,
  type LcListEditorToggle,
} from '../list-editor/list-editor.component';

const SHORT: readonly LcListEditorItem[] = [
  { id: 'a', label: 'Premier', active: true },
  { id: 'b', label: 'Deuxième', active: true, detail: 'Modifié le 12 novembre' },
  { id: 'c', label: 'Troisième', active: false },
];

const LONG: readonly LcListEditorItem[] = Array.from({ length: 20 }, (_, index) => ({
  id: `item-${index + 1}`,
  label: `Élément ${index + 1}`,
  active: index % 4 !== 3,
}));

/** Liste dont l'état est tenu ici : chaque demande du composant est appliquée, comme le ferait une application. */
@Component({
  selector: 'lc-list-editor-demo',
  imports: [LcListEditorComponent, LcFormFieldComponent, LcButtonComponent],
  template: `
    <lc-form-field label="Éléments à gérer" hint="Alt + flèche haut ou bas déplace la ligne depuis n'importe quel contrôle.">
      <lc-list-editor #editor [items]="items()" [savedItems]="saved()" [minActive]="minActive()" [maxLength]="20"
        addLabel="Nouvel élément" [addError]="addError()"
        (add)="add($event)" (rename)="rename($event)" (move)="move($event)" (toggle)="toggle($event)" />
    </lc-form-field>
    <p style="margin-top:12px">
      {{ editor.modified() ? 'Modifié depuis le dernier enregistrement.' : 'Aucune modification.' }}
      <button lcButton type="button" themeColor="primary" (click)="saved.set(items())" [disabled]="!editor.modified()">Enregistrer</button>
    </p>
  `,
})
class ListEditorDemoComponent {
  readonly minActive = input(1);
  protected readonly items = signal<readonly LcListEditorItem[]>([...SHORT, { id: 'p', label: 'Toujours présent', active: true, locked: true, lockedReason: 'Fourni par le système.', lockedLabel: 'Toujours actif' }]);
  protected readonly saved = signal<readonly LcListEditorItem[]>(this.items());
  protected readonly addError = signal<string | null>(null);
  private nextId = 0;

  protected add(label: string): void {
    if (label.toLowerCase().includes('refus')) {
      this.addError.set('Refusé par le serveur (exemple d\'erreur fournie par l\'application).');
      return;
    }
    this.addError.set(null);
    this.items.update((items) => [...items, { id: `n${++this.nextId}`, label, active: true }]);
  }

  protected rename({ id, label }: LcListEditorRename): void {
    this.items.update((items) => items.map((item) => (item.id === id ? { ...item, label } : item)));
  }

  protected toggle({ id, active }: LcListEditorToggle): void {
    this.items.update((items) => items.map((item) => (item.id === id ? { ...item, active } : item)));
  }

  protected move({ id, direction }: LcListEditorMove): void {
    this.items.update((items) => {
      const from = items.findIndex((item) => item.id === id);
      const to = direction === 'up' ? from - 1 : from + 1;
      const next = [...items];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }
}

/**
 * Editable list managed by the application (`lc-list-editor`): add, rename, reorder (buttons or Alt + arrows) and enable or disable items.
 * The component only emits requests (`add`, `rename`, `move`, `toggle`); the application owns the state and passes `items` back.
 *
 * Import: `import { LcListEditorComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcListEditorComponent> = {
  title: 'Forms/List editor',
  component: LcListEditorComponent,
  decorators: [moduleMetadata({ imports: [LcListEditorComponent, LcFormFieldComponent, ListEditorDemoComponent] })],
  args: {
    minActive: 0, maxLength: null, addLabel: 'Nouvel élément', addButtonLabel: 'Ajouter', addError: null, emptyText: 'Aucun élément.',
    listLabel: 'Liste des éléments', disabled: false, busy: false, ariaLabel: 'Éléments',
  },
  argTypes: {
    maxLength: { control: 'number' },
    items: { control: false },
    savedItems: { control: false },
    isDuplicate: { control: false },
    add: { action: 'add' },
    rename: { action: 'rename' },
    move: { action: 'move' },
    toggle: { action: 'toggle' },
  },
};
export default meta;
type Story = StoryObj<LcListEditorComponent>;

/** Fixed list in a 40 rem column; `attributes` are plain template attributes. */
const fixed = (items: readonly LcListEditorItem[], attributes = ''): Story => ({
  parameters: fixedExample,
  render: () => ({ props: { items }, template: `<div style="max-width:40rem"><lc-list-editor [items]="items" ariaLabel="Éléments" ${attributes} /></div>` }),
});

/** Every input is bound: change them in the Controls panel (the list itself stays fixed; see `Interactive` for a live one). */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['maxLength', 'emptyText'] } },
  render: (args) => ({
    props: { ...args, items: SHORT },
    template: `
      <div style="max-width:40rem">
        <lc-list-editor [items]="items" [minActive]="minActive" [maxLength]="maxLength" [addLabel]="addLabel"
          [addButtonLabel]="addButtonLabel" [addError]="addError" [emptyText]="emptyText" [listLabel]="listLabel"
          [disabled]="disabled" [busy]="busy" [ariaLabel]="ariaLabel" (add)="add($event)" (rename)="rename($event)"
          (move)="move($event)" (toggle)="toggle($event)" />
      </div>`,
  }),
};

/** Three items, one of them disabled (a "Désactivé" badge in addition to the dimmed label). */
export const Short: Story = fixed(SHORT);

/** A locked item cannot be renamed or disabled but can be reordered; the reason comes from the application. */
export const LockedRow: Story = fixed([...SHORT, { id: 'p', label: 'Toujours présent', active: true, locked: true, lockedReason: 'Fourni par le système, il ne peut pas être modifié.' }]);

/** Errors supplied by the application: under a row (`error`) and under the add field (`addError`). Empty, too long and duplicate: see `Interactive`. */
export const ApplicationErrors: Story = fixed(
  [SHORT[0], { ...SHORT[1], error: 'Ce libellé existe déjà dans une autre liste.' }, SHORT[2]],
  'addError="Ce libellé est refusé par le serveur."',
);

/** A single active item with `minActive` at 1: its switch is inert (`aria-disabled`, still reachable by keyboard) and says so. */
export const LastActiveItem: Story = fixed(
  [{ id: 'a', label: 'Seul actif', active: true }, { id: 'b', label: 'Désactivé', active: false }, { id: 'c', label: 'Autre désactivé', active: false }],
  '[minActive]="1"',
);

/** Twenty items, at least one of them active. */
export const LongList: Story = fixed(LONG, '[minActive]="1"');

/** One row is busy (`busy: true` on the item). */
export const BusyRow: Story = fixed([SHORT[0], { ...SHORT[1], busy: true }, SHORT[2]]);

/** The whole list is disabled. */
export const Disabled: Story = fixed(SHORT, 'disabled');

/** No item: the empty text. */
export const Empty: Story = fixed([]);

/** Phone width: controls wrap under the label, without horizontal scrolling (also try 320 px). */
export const At360Pixels: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { items: [...SHORT, { id: 'l', label: 'Un libellé particulièrement long qui doit passer à la ligne sans déborder', active: true }] },
    template: `
      <div style="max-width:360px;border:1px dashed var(--lc-sys-color-border);padding:var(--lc-sys-space-2, 8px)">
        <lc-form-field label="Éléments" hint="Une aide sous le libellé.">
          <lc-list-editor [items]="items" [minActive]="1" />
        </lc-form-field>
      </div>`,
  }),
};

/** In `lc-form-field`: the label names the group, the hint and the error are linked to it. */
export const InAField: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { items: SHORT },
    template: `
      <div style="max-width:40rem">
        <lc-form-field label="Éléments à gérer" hint="Désactiver un élément le retire des nouveaux choix." [errors]="['Gardez au moins un élément actif.']">
          <lc-list-editor [items]="items" />
        </lc-form-field>
      </div>`,
  }),
};

/**
 * State held by the demo: add (Enter), rename (Enter saves, Escape cancels), move (buttons or Alt + arrows), disable.
 * Try an empty label, a duplicate ("premier"), more than 20 characters, or a label containing "refus".
 */
export const Interactive: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<div style="max-width:40rem"><lc-list-editor-demo /></div>` }),
};
