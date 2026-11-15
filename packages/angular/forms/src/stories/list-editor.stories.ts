import { Component, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
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
  imports: [LcListEditorComponent, LcFormFieldComponent],
  template: `
    <lc-form-field label="Éléments à gérer" hint="Alt + flèche haut ou bas déplace la ligne depuis n'importe quel contrôle.">
      <lc-list-editor #editor [items]="items()" [savedItems]="saved()" [minActive]="minActive()" [maxLength]="20"
        addLabel="Nouvel élément" [addError]="addError()"
        (add)="add($event)" (rename)="rename($event)" (move)="move($event)" (toggle)="toggle($event)" />
    </lc-form-field>
    <p style="margin-top:12px">
      {{ editor.modified() ? 'Modifié depuis le dernier enregistrement.' : 'Aucune modification.' }}
      <button type="button" (click)="saved.set(items())" [disabled]="!editor.modified()">Enregistrer</button>
    </p>
  `,
})
class ListEditorDemoComponent {
  readonly minActive = input(1);
  protected readonly items = signal<readonly LcListEditorItem[]>([...SHORT, { id: 'p', label: 'Toujours présent', active: true, locked: true, lockedReason: 'Fourni par le système.' }]);
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

const meta: Meta<LcListEditorComponent> = {
  title: 'Formulaires/Liste modifiable',
  component: LcListEditorComponent,
  decorators: [moduleMetadata({ imports: [LcListEditorComponent, LcFormFieldComponent, ListEditorDemoComponent] })],
  args: { items: SHORT, minActive: 0, maxLength: null, addLabel: 'Nouvel élément', disabled: false, busy: false, ariaLabel: 'Éléments' },
  argTypes: { maxLength: { control: 'number' } },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width:40rem">
        <lc-list-editor [items]="items" [minActive]="minActive" [maxLength]="maxLength" [addLabel]="addLabel"
          [disabled]="disabled" [busy]="busy" [ariaLabel]="ariaLabel" />
      </div>`,
  }),
};
export default meta;
type Story = StoryObj<LcListEditorComponent>;

/** Trois éléments, dont un désactivé (badge « Désactivé » en plus du libellé estompé). */
export const Courte: Story = {};

/** Un élément protégé : ni renommable ni désactivable, mais réordonnable ; la raison vient de l'application. */
export const LigneProtegee: Story = {
  args: { items: [...SHORT, { id: 'p', label: 'Toujours présent', active: true, locked: true, lockedReason: 'Fourni par le système, il ne peut pas être modifié.' }] },
};

/** Erreurs fournies par l'application : sous une ligne (`error`) et sous le champ d'ajout (`addError`). Vide, trop long et doublon : voir `Interactif`. */
export const ErreursDeLApplication: Story = {
  render: () => ({
    props: { items: [SHORT[0], { ...SHORT[1], error: 'Ce libellé existe déjà dans une autre liste.' }, SHORT[2]] },
    template: `
      <div style="max-width:40rem">
        <lc-list-editor [items]="items" ariaLabel="Éléments" addError="Ce libellé est refusé par le serveur." />
      </div>`,
  }),
};

/** Un seul élément actif avec `minActive` à 1 : son interrupteur est inerte (`aria-disabled`, atteignable au clavier) et le dit. */
export const DernierElementActif: Story = {
  args: { items: [{ id: 'a', label: 'Seul actif', active: true }, { id: 'b', label: 'Désactivé', active: false }, { id: 'c', label: 'Autre désactivé', active: false }], minActive: 1 },
};

export const ListeLongue: Story = { args: { items: LONG, minActive: 1 } };

export const Occupee: Story = {
  args: { items: [SHORT[0], { ...SHORT[1], busy: true }, SHORT[2]], busy: false },
};

export const Desactivee: Story = { args: { disabled: true } };

export const Vide: Story = { args: { items: [] } };

/** Largeur d'un téléphone : les commandes passent sous le libellé, sans défilement horizontal (essayez aussi 320 px). */
export const A360Pixels: Story = {
  render: () => ({
    props: { items: [...SHORT, { id: 'l', label: 'Un libellé particulièrement long qui doit passer à la ligne sans déborder', active: true }] },
    template: `
      <div style="max-width:360px;border:1px dashed #888;padding:8px">
        <lc-form-field label="Éléments" hint="Une aide sous le libellé.">
          <lc-list-editor [items]="items" [minActive]="1" />
        </lc-form-field>
      </div>`,
  }),
};

/** Dans `lc-form-field` : le libellé nomme le groupe, l'aide et l'erreur lui sont reliées. */
export const DansUnChamp: Story = {
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
 * État tenu par la démo : ajoutez (Entrée), renommez (Entrée enregistre, Échap annule), déplacez (boutons ou Alt + flèches),
 * désactivez. Essayez un champ vide, un doublon (« premier »), plus de 20 caractères, ou un libellé contenant « refus ».
 */
export const Interactif: Story = {
  render: () => ({ template: `<div style="max-width:40rem"><lc-list-editor-demo /></div>` }),
};
