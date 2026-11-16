import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN, LC_LABELS_FR } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import {
  LcListEditorComponent,
  LcListEditorItem,
  LcListEditorMove,
  LcListEditorRename,
  LcListEditorToggle,
} from './list-editor.component';

const baseItems = (): LcListEditorItem[] => [
  { id: 'a', label: 'Premier', active: true },
  { id: 'b', label: 'Deuxième', active: true },
  { id: 'c', label: 'Troisième', active: false },
  { id: 'd', label: 'Quatrième', active: true },
];

/** Hôte qui joue le rôle de l'application : `apply` à faux simule un refus (items inchangés). */
@Component({
  imports: [LcListEditorComponent],
  template: `<lc-list-editor #editor ariaLabel="Liste" [items]="items()" [savedItems]="saved()" [minActive]="minActive()"
    [maxLength]="maxLength()" [addError]="addError()" [disabled]="disabled()" [busy]="busy()" [emptyText]="emptyText()"
    (add)="onAdd($event)" (rename)="onRename($event)" (move)="onMove($event)" (toggle)="onToggle($event)" />
    <output class="modified">{{ editor.modified() }}</output>`,
})
class ListHostComponent {
  readonly items = signal<readonly LcListEditorItem[]>(baseItems());
  readonly saved = signal<readonly LcListEditorItem[] | null>(null);
  readonly minActive = signal(0);
  readonly maxLength = signal<number | null>(null);
  readonly addError = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly busy = signal(false);
  readonly emptyText = signal('');
  apply = true;
  readonly added: string[] = [];
  readonly renamed: LcListEditorRename[] = [];
  readonly moved: LcListEditorMove[] = [];
  readonly toggled: LcListEditorToggle[] = [];

  onAdd(label: string): void {
    this.added.push(label);
    if (this.apply) this.items.update((items) => [...items, { id: `n${items.length}`, label, active: true }]);
  }

  onRename(event: LcListEditorRename): void {
    this.renamed.push(event);
    if (this.apply) this.items.update((items) => items.map((i) => (i.id === event.id ? { ...i, label: event.label } : i)));
  }

  onMove(event: LcListEditorMove): void {
    this.moved.push(event);
    if (!this.apply) return;
    this.items.update((items) => {
      const from = items.findIndex((i) => i.id === event.id);
      const to = event.direction === 'up' ? from - 1 : from + 1;
      const next = [...items];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  onToggle(event: LcListEditorToggle): void {
    this.toggled.push(event);
    if (this.apply) this.items.update((items) => items.map((i) => (i.id === event.id ? { ...i, active: event.active } : i)));
  }
}

@Component({
  imports: [LcListEditorComponent],
  template: `<lc-list-editor ariaLabel="Liste" [items]="items" [isDuplicate]="sameLength" (add)="added.push($event)" />`,
})
class CustomDuplicateHostComponent {
  readonly items: readonly LcListEditorItem[] = [{ id: 'a', label: 'abc', active: true }];
  readonly added: string[] = [];
  readonly sameLength = (existing: string, candidate: string) => existing.length === candidate.length;
}

@Component({
  imports: [LcFormFieldComponent, LcListEditorComponent],
  template: `<lc-form-field label="Catégories" hint="Aide du champ" [errors]="errors()">
    <lc-list-editor [items]="items()" [minActive]="minActive()" />
  </lc-form-field>`,
})
class ListInFieldHostComponent {
  readonly items = signal<readonly LcListEditorItem[]>(baseItems());
  readonly minActive = signal(0);
  readonly errors = signal<readonly string[]>([]);
}

async function setup(init?: (host: ListHostComponent) => void) {
  const fixture = TestBed.createComponent(ListHostComponent);
  init?.(fixture.componentInstance);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const host = fixture.componentInstance;
  const settle = () => fixture.whenStable();
  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('.lc-list-editor__row'));
  const labels = () => rows().map((row) => row.querySelector('.lc-list-editor__name')!.textContent!.trim());
  const control = (row: number, command: string) => rows()[row].querySelector<HTMLButtonElement>(`[data-command="${command}"]`)!;
  const addInput = () => root.querySelector<HTMLInputElement>('.lc-list-editor__add-input')!;
  const addButton = () => root.querySelector<HTMLButtonElement>('.lc-list-editor__add-row button')!;
  const status = () => root.querySelector('[role=status]')!.textContent!.trim();
  const type = async (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };
  const press = async (target: HTMLElement, key: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    await settle();
    return event;
  };
  const edit = async (row: number) => {
    control(row, 'rename').click();
    await settle();
    return rows()[row].querySelector<HTMLInputElement>('.lc-list-editor__edit-input')!;
  };
  return { fixture, host, root, settle, rows, labels, control, addInput, addButton, status, type, press, edit };
}

describe('LcListEditorComponent', () => {
  describe('ajout (CA-L2-12, CA-L2-14)', () => {
    it('Entrée émet le libellé sans espaces de bord ; le champ n\'est vidé qu\'une fois l\'élément apparu ; focus au champ ; ajout annoncé', async () => {
      const { host, addInput, labels, status, type, press, settle } = await setup();
      await type(addInput(), '  Nouveau  ');
      await press(addInput(), 'Enter');
      await settle();
      expect(host.added).toEqual(['Nouveau']);
      expect(labels().at(-1)).toBe('Nouveau');
      expect(addInput().value).toBe('');
      expect(document.activeElement).toBe(addInput());
      expect(status()).toBe('Nouveau ajouté en position 5.');
    });

    it('le bouton « Ajouter » fait de même', async () => {
      const { host, addInput, addButton, type, settle } = await setup();
      expect(addButton().textContent!.trim()).toBe('Ajouter');
      await type(addInput(), 'Cinq');
      addButton().click();
      await settle();
      expect(host.added).toEqual(['Cinq']);
      expect(addInput().value).toBe('');
    });

    it('si l\'application refuse (items inchangés), la saisie est gardée, rien n\'est annoncé', async () => {
      const { host, addInput, status, type, press, settle } = await setup((h) => { h.apply = false; });
      await type(addInput(), 'Refusé');
      await press(addInput(), 'Enter');
      await settle();
      expect(host.added).toEqual(['Refusé']);
      expect(addInput().value).toBe('Refusé');
      expect(status()).toBe('');
    });

    it('addError de l\'application s\'affiche sous le champ (role=alert) et lui est reliée', async () => {
      const { host, root, addInput, settle } = await setup();
      host.addError.set('Refusé par le serveur.');
      await settle();
      const alert = root.querySelector<HTMLElement>('.lc-list-editor__add [role=alert]')!;
      expect(alert.textContent!.trim()).toBe('Refusé par le serveur.');
      expect(addInput().getAttribute('aria-describedby')).toBe(alert.id);
      expect(addInput().getAttribute('aria-invalid')).toBe('true');
      host.addError.set(null);
      await settle();
      expect(addInput().hasAttribute('aria-describedby')).toBe(false);
    });

    it.each([[''], ['   ']])('libellé vide (%j) : message, aucune émission', async (value) => {
      const { host, root, addInput, type, press } = await setup();
      await type(addInput(), value);
      await press(addInput(), 'Enter');
      expect(host.added).toEqual([]);
      expect(root.querySelector('.lc-list-editor__add [role=alert]')!.textContent).toContain('Saisissez un libellé.');
      expect(addInput().getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(addInput());
    });

    it('la saisie efface le message d\'erreur détecté', async () => {
      const { root, addInput, type, press } = await setup();
      await press(addInput(), 'Enter');
      expect(root.querySelector('.lc-list-editor__add [role=alert]')).not.toBeNull();
      await type(addInput(), 'a');
      expect(root.querySelector('.lc-list-editor__add [role=alert]')).toBeNull();
    });

    it('maxLength : 6 caractères refusés pour 5, 5 acceptés', async () => {
      const { host, root, addInput, type, press } = await setup((h) => { h.maxLength.set(5); });
      await type(addInput(), 'abcdef');
      await press(addInput(), 'Enter');
      expect(host.added).toEqual([]);
      expect(root.querySelector('.lc-list-editor__add [role=alert]')!.textContent).toContain('Le libellé ne peut pas dépasser 5 caractères.');
      await type(addInput(), 'abcde');
      await press(addInput(), 'Enter');
      expect(host.added).toEqual(['abcde']);
    });

    it('doublon par défaut : insensible à la casse et aux espaces de bord, aucune émission', async () => {
      const { host, root, addInput, type, press } = await setup();
      await type(addInput(), '  DEUXIÈME ');
      await press(addInput(), 'Enter');
      expect(host.added).toEqual([]);
      expect(root.querySelector('.lc-list-editor__add [role=alert]')!.textContent).toContain('Ce libellé existe déjà.');
    });

    it('isDuplicate fourni : il remplace la comparaison par défaut', async () => {
      const fixture = TestBed.createComponent(CustomDuplicateHostComponent);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      const input = root.querySelector<HTMLInputElement>('.lc-list-editor__add-input')!;
      const submit = async (value: string) => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await fixture.whenStable();
      };
      await submit('xyz'); // même longueur que « abc » : doublon pour la fonction fournie
      expect(fixture.componentInstance.added).toEqual([]);
      await submit('abc!'); // la casse n'est plus en cause : seule la longueur compte
      expect(fixture.componentInstance.added).toEqual(['abc!']);
    });

    it('désactivé ou occupé : l\'ajout est ignoré', async () => {
      const { host, addInput, addButton, type, press, settle } = await setup();
      await type(addInput(), 'Un');
      host.busy.set(true);
      await settle();
      expect(addButton().getAttribute('aria-disabled')).toBe('true');
      await press(addInput(), 'Enter');
      addButton().click();
      host.busy.set(false);
      host.disabled.set(true);
      await settle();
      expect(addInput().disabled).toBe(true);
      expect(addButton().disabled).toBe(true);
      expect(host.added).toEqual([]);
    });
  });

  describe('renommage (CA-L2-12)', () => {
    it('ouvre un champ « Nouveau nom de … » rempli, au focus ; Entrée émet le libellé, ferme, rend le focus à « Renommer »', async () => {
      const { host, labels, control, edit, press, settle } = await setup();
      const input = await edit(1);
      expect(input.value).toBe('Deuxième');
      expect(input.getAttribute('aria-label')).toBe('Nouveau nom de Deuxième');
      expect(document.activeElement).toBe(input);
      input.value = '  Second ';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await press(input, 'Enter');
      await settle();
      expect(host.renamed).toEqual([{ id: 'b', label: 'Second' }]);
      expect(labels()[1]).toBe('Second');
      expect(document.activeElement).toBe(control(1, 'rename'));
    });

    it('Échap annule sans émettre et rend le focus à « Renommer »', async () => {
      const { host, labels, control, edit, press } = await setup();
      const input = await edit(0);
      input.value = 'Autre';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await press(input, 'Escape');
      expect(host.renamed).toEqual([]);
      expect(labels()[0]).toBe('Premier');
      expect(document.activeElement).toBe(control(0, 'rename'));
    });

    it('un libellé inchangé ferme l\'édition sans émettre', async () => {
      const { host, rows, edit, press } = await setup();
      const input = await edit(0);
      await press(input, 'Enter');
      expect(host.renamed).toEqual([]);
      expect(rows()[0].querySelector('.lc-list-editor__edit-input')).toBeNull();
    });

    it('« Enregistrer » et « Annuler » ont leurs noms et agissent comme Entrée et Échap', async () => {
      const { host, rows, edit, type, settle } = await setup();
      const input = await edit(0);
      const [save, cancel] = Array.from(rows()[0].querySelectorAll<HTMLButtonElement>('.lc-list-editor__edit button'));
      expect([save.getAttribute('aria-label'), cancel.getAttribute('aria-label')]).toEqual(['Enregistrer', 'Annuler']);
      await type(input, 'Un');
      save.click();
      await settle();
      expect(host.renamed).toEqual([{ id: 'a', label: 'Un' }]);
      const again = await edit(0);
      again.value = 'Zéro';
      again.dispatchEvent(new Event('input', { bubbles: true }));
      rows()[0].querySelectorAll<HTMLButtonElement>('.lc-list-editor__edit button')[1].click();
      await settle();
      expect(host.renamed.length).toBe(1);
    });

    it.each([
      ['vide', '', 'Saisissez un libellé.'],
      ['trop long', 'abcdefghij', 'Le libellé ne peut pas dépasser 9 caractères.'],
      ['doublon avec une autre ligne', 'troisième', 'Ce libellé existe déjà.'],
    ])('erreur (%s) : message relié au champ, aucune émission, l\'édition reste ouverte', async (_name, value, message) => {
      const { host, rows, edit, type, press } = await setup((h) => { h.maxLength.set(9); });
      const input = await edit(0);
      await type(input, value);
      await press(input, 'Enter');
      expect(host.renamed).toEqual([]);
      const alert = rows()[0].querySelector<HTMLElement>('[role=alert]')!;
      expect(alert.textContent).toContain(message);
      expect(input.getAttribute('aria-describedby')).toBe(alert.id);
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('un libellé qui ne diffère de son propre libellé que par la casse est accepté (doublon avec soi-même)', async () => {
      const { host, edit, type, press } = await setup();
      const input = await edit(1);
      await type(input, 'DEUXIÈME');
      await press(input, 'Enter');
      expect(host.renamed).toEqual([{ id: 'b', label: 'DEUXIÈME' }]);
    });

    it('le badge d\'une ligne protégée affiche « Protégé » par défaut, ou lockedLabel s\'il est fourni', async () => {
      const { rows, host, settle } = await setup((h) => {
        h.items.set([{ id: 'p', label: 'P', active: true, locked: true }, { id: 'q', label: 'Q', active: true, locked: true, lockedLabel: 'Toujours actif' }]);
      });
      const badge = (i: number) => rows()[i].querySelector('.lc-list-editor__badge')!.textContent!.trim();
      expect([badge(0), badge(1)]).toEqual(['Protégé', 'Toujours actif']);
      host.items.set([{ id: 'p', label: 'P', active: true, locked: true, lockedLabel: '' }]);
      await settle();
      expect(badge(0)).toBe('Protégé');
    });

    it('une ligne protégée n\'a ni « Renommer » ni interrupteur', async () => {
      const { rows } = await setup((h) => { h.items.set([{ id: 'p', label: 'Protégée', active: true, locked: true }]); });
      expect(rows()[0].querySelector('[data-command=rename]')).toBeNull();
      expect(rows()[0].querySelector('[role=switch]')).toBeNull();
    });
  });

  describe('déplacement (CA-L2-12, CA-L2-14)', () => {
    it('première « Monter » et dernière « Descendre » sont inertes mais atteignables, sans émission', async () => {
      const { host, control } = await setup();
      for (const button of [control(0, 'up'), control(3, 'down')]) {
        expect(button.getAttribute('aria-disabled')).toBe('true');
        expect(button.disabled).toBe(false);
        button.focus();
        expect(document.activeElement).toBe(button);
        button.click();
      }
      expect(host.moved).toEqual([]);
      expect(control(1, 'up').hasAttribute('aria-disabled')).toBe(false);
    });

    it('un clic émet l\'identifiant et le sens ; le focus suit la même commande dans la nouvelle ligne ; position annoncée', async () => {
      const { host, labels, control, status, settle } = await setup();
      control(0, 'down').focus();
      control(0, 'down').click();
      await settle();
      expect(host.moved).toEqual([{ id: 'a', direction: 'down' }]);
      expect(labels()).toEqual(['Deuxième', 'Premier', 'Troisième', 'Quatrième']);
      expect(document.activeElement).toBe(control(1, 'down'));
      expect(control(1, 'down').getAttribute('aria-label')).toBe('Descendre Premier');
      expect(status()).toBe('Premier, position 2 sur 4');
    });

    it('monter de deux rangs de suite : le focus reste sur « Monter » de l\'élément', async () => {
      const { host, labels, control, status, settle } = await setup();
      control(3, 'up').focus();
      control(3, 'up').click();
      await settle();
      control(2, 'up').click();
      await settle();
      expect(host.moved.map((m) => m.id)).toEqual(['d', 'd']);
      expect(labels()).toEqual(['Premier', 'Quatrième', 'Deuxième', 'Troisième']);
      expect(document.activeElement).toBe(control(1, 'up'));
      expect(status()).toBe('Quatrième, position 2 sur 4');
    });

    it.each([
      ['up', 'ArrowDown', 'down'],
      ['down', 'ArrowDown', 'down'],
      ['rename', 'ArrowUp', 'up'],
      ['toggle', 'ArrowDown', 'down'],
    ])('Alt + flèche depuis « %s » (%s) déplace la ligne et garde le focus sur la même commande', async (command, key, direction) => {
      const { host, control, press, settle } = await setup();
      const from = direction === 'up' ? 1 : 0;
      control(from, command).focus();
      const event = await press(control(from, command), key, { altKey: true });
      await settle();
      expect(event.defaultPrevented).toBe(true);
      expect(host.moved).toEqual([{ id: from === 0 ? 'a' : 'b', direction }]);
      expect(document.activeElement).toBe(control(direction === 'up' ? 0 : 1, command));
    });

    it('sans Alt, ou aux extrémités, les flèches ne déplacent rien', async () => {
      const { host, control, press } = await setup();
      control(1, 'rename').focus();
      const plain = await press(control(1, 'rename'), 'ArrowDown');
      expect(plain.defaultPrevented).toBe(false);
      await press(control(0, 'rename'), 'ArrowUp', { altKey: true });
      await press(control(3, 'rename'), 'ArrowDown', { altKey: true });
      expect(host.moved).toEqual([]);
    });

    it('pendant l\'édition du nom, Alt + flèche est ignoré', async () => {
      const { host, edit, press } = await setup();
      const input = await edit(1);
      await press(input, 'ArrowDown', { altKey: true });
      expect(host.moved).toEqual([]);
    });

    it('une ligne protégée se déplace (boutons) mais n\'a pas de « Renommer » ni d\'interrupteur', async () => {
      const { host, control, settle } = await setup((h) => { h.items.set([...baseItems(), { id: 'p', label: 'Protégée', active: true, locked: true }]); });
      control(4, 'up').click();
      await settle();
      expect(host.moved).toEqual([{ id: 'p', direction: 'up' }]);
    });

    it('si l\'application ne change pas items : ni annonce ni déplacement du focus', async () => {
      const { host, control, status, settle } = await setup((h) => { h.apply = false; });
      control(1, 'up').focus();
      control(1, 'up').click();
      await settle();
      expect(host.moved).toEqual([{ id: 'b', direction: 'up' }]);
      expect(status()).toBe('');
      expect(document.activeElement).toBe(control(1, 'up'));
    });

    it('le focus n\'est pas volé s\'il a quitté la liste avant que l\'application applique', async () => {
      const { host, control, settle } = await setup((h) => { h.apply = false; });
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      control(0, 'down').click();
      outside.focus();
      host.apply = true;
      host.items.set([baseItems()[1], baseItems()[0], ...baseItems().slice(2)]);
      await settle();
      expect(document.activeElement).toBe(outside);
      outside.remove();
    });
  });

  describe('interrupteur (CA-L2-12)', () => {
    it('désactiver un élément émet {id, active}, annonce « … est désactivé. » et affiche le badge « Désactivé »', async () => {
      const { host, rows, control, status, settle } = await setup();
      control(0, 'toggle').click();
      await settle();
      expect(host.toggled).toEqual([{ id: 'a', active: false }]);
      expect(status()).toBe('Premier est désactivé.');
      expect(rows()[0].querySelector('.lc-list-editor__badge')!.textContent!.trim()).toBe('Désactivé');
      expect(control(0, 'toggle').getAttribute('aria-checked')).toBe('false');
      control(0, 'toggle').click();
      await settle();
      expect(host.toggled.at(-1)).toEqual({ id: 'a', active: true });
      expect(status()).toBe('Premier est actif.');
    });

    it('le dernier élément actif (minActive 1) a un interrupteur inerte, avec sa raison reliée ; aucun clic n\'émet', async () => {
      const { host, root, control, settle } = await setup((h) => {
        h.minActive.set(1);
        h.items.set([{ id: 'a', label: 'Seul', active: true }, { id: 'b', label: 'Off', active: false }]);
      });
      const toggle = control(0, 'toggle');
      expect(toggle.getAttribute('aria-disabled')).toBe('true');
      expect(toggle.disabled).toBe(false);
      const reason = root.querySelector<HTMLElement>(`#${toggle.getAttribute('aria-describedby')}`)!;
      expect(reason.textContent!.trim()).toBe('Seul élément actif : il ne peut pas être désactivé.');
      toggle.click();
      await settle();
      expect(host.toggled).toEqual([]);
      expect(toggle.getAttribute('aria-checked')).toBe('true');
      expect(control(1, 'toggle').hasAttribute('aria-disabled')).toBe(false);
      control(1, 'toggle').click();
      await settle();
      expect(host.toggled).toEqual([{ id: 'b', active: true }]);
      expect(control(0, 'toggle').hasAttribute('aria-disabled')).toBe(false);
    });

    it('minActive 2 avec trois actifs : aucun interrupteur inerte, aucune raison affichée', async () => {
      const { root, control } = await setup((h) => { h.minActive.set(2); });
      expect(control(0, 'toggle').hasAttribute('aria-disabled')).toBe(false);
      expect(root.querySelector('.lc-list-editor__detail')).toBeNull();
    });

    it('minActive 2, deux actifs : « Au moins 2 éléments doivent rester actifs. »', async () => {
      const { root, control } = await setup((h) => {
        h.minActive.set(2);
        h.items.set([{ id: 'a', label: 'A', active: true }, { id: 'b', label: 'B', active: true }, { id: 'c', label: 'C', active: false }]);
      });
      expect(control(0, 'toggle').getAttribute('aria-disabled')).toBe('true');
      expect(control(1, 'toggle').getAttribute('aria-disabled')).toBe('true');
      expect(root.querySelector('.lc-list-editor__detail')!.textContent).toContain('Au moins 2 éléments doivent rester actifs.');
    });

    it('un élément protégé compte comme actif : il libère le dernier actif ordinaire', async () => {
      const { control } = await setup((h) => {
        h.minActive.set(1);
        h.items.set([{ id: 'a', label: 'A', active: true }, { id: 'p', label: 'P', active: false, locked: true }]);
      });
      expect(control(0, 'toggle').hasAttribute('aria-disabled')).toBe(false);
    });

    it('une suite de bascules refusées puis acceptées n\'émet toggle qu\'une fois par geste', async () => {
      const { host, control, status, settle } = await setup((h) => { h.apply = false; });
      control(0, 'toggle').click();
      await settle();
      control(0, 'toggle').click();
      await settle();
      expect(host.toggled).toEqual([{ id: 'a', active: false }, { id: 'a', active: false }]);
      expect(control(0, 'toggle').getAttribute('aria-checked')).toBe('true');
      host.apply = true;
      control(0, 'toggle').click();
      await settle();
      expect(host.toggled.length).toBe(3);
      expect(control(0, 'toggle').getAttribute('aria-checked')).toBe('false');
      expect(status()).toBe('Premier est désactivé.');
      control(2, 'toggle').click(); // « Troisième » inactif : refusé n'est plus en jeu, accepté
      await settle();
      expect(host.toggled.length).toBe(4);
      expect(host.toggled.at(-1)).toEqual({ id: 'c', active: true });
    });

    it('si l\'application refuse, l\'interrupteur revient à l\'état de items', async () => {
      const { host, control, status, settle } = await setup((h) => { h.apply = false; });
      control(0, 'toggle').click();
      await settle();
      expect(host.toggled).toEqual([{ id: 'a', active: false }]);
      expect(control(0, 'toggle').getAttribute('aria-checked')).toBe('true');
      expect(status()).toBe('');
    });
  });

  describe('modified', () => {
    const modified = (root: HTMLElement) => root.querySelector('.modified')!.textContent;

    it('faux sans savedItems', async () => {
      const { root, control, settle } = await setup();
      control(0, 'toggle').click();
      await settle();
      expect(modified(root)).toBe('false');
    });

    it('vrai pour un ordre, un libellé, une activation ou un ajout différents ; faux au retour à la référence', async () => {
      const { host, root, settle } = await setup((h) => { h.saved.set(baseItems()); });
      expect(modified(root)).toBe('false');
      const cases: LcListEditorItem[][] = [
        [baseItems()[1], baseItems()[0], ...baseItems().slice(2)],
        baseItems().map((i) => (i.id === 'a' ? { ...i, label: 'Autre' } : i)),
        baseItems().map((i) => (i.id === 'a' ? { ...i, active: false } : i)),
        [...baseItems(), { id: 'z', label: 'Z', active: true }],
        baseItems().slice(0, 3),
      ];
      for (const items of cases) {
        host.items.set(items);
        await settle();
        expect(modified(root)).toBe('true');
        host.items.set(baseItems());
        await settle();
        expect(modified(root)).toBe('false');
      }
    });

    it('les champs hors ordre, libellé et activation ne comptent pas', async () => {
      const { host, root, settle } = await setup((h) => { h.saved.set(baseItems()); });
      host.items.set(baseItems().map((i) => ({ ...i, detail: 'note', error: 'x', busy: true })));
      await settle();
      expect(modified(root)).toBe('false');
    });
  });

  describe('états (CA-L2-12)', () => {
    it('désactivé : tout est désactivé nativement et le groupe est aria-disabled', async () => {
      const { root, rows, addInput, settle, host, control } = await setup();
      host.disabled.set(true);
      await settle();
      expect(root.querySelector('lc-list-editor')!.getAttribute('aria-disabled')).toBe('true');
      expect(addInput().disabled).toBe(true);
      for (let i = 0; i < rows().length; i++) {
        for (const command of ['up', 'down', 'rename', 'toggle']) expect(control(i, command).disabled).toBe(true);
      }
    });

    it('occupé : commandes aria-disabled (focalisables), aucun effet, aria-busy', async () => {
      const { root, host, control, settle } = await setup();
      host.busy.set(true);
      await settle();
      expect(root.querySelector('lc-list-editor')!.getAttribute('aria-busy')).toBe('true');
      for (const command of ['up', 'down', 'rename', 'toggle']) {
        const button = control(1, command);
        expect(button.getAttribute('aria-disabled')).toBe('true');
        expect(button.disabled).toBe(false);
        button.click();
      }
      expect(host.moved).toEqual([]);
      expect(host.toggled).toEqual([]);
      expect(root.querySelector('.lc-list-editor__edit-input')).toBeNull();
    });

    it('item.busy n\'inertise que sa ligne', async () => {
      const { host, control, settle } = await setup((h) => {
        h.items.set(baseItems().map((i) => (i.id === 'b' ? { ...i, busy: true } : i)));
      });
      expect(control(1, 'down').getAttribute('aria-disabled')).toBe('true');
      expect(control(2, 'down').getAttribute('aria-disabled')).toBeNull();
      control(1, 'down').click();
      await settle();
      expect(host.moved).toEqual([]);
    });

    it('liste vide : texte par défaut, puis texte fourni ; pas de ul ; le champ d\'ajout reste', async () => {
      const { root, host, addInput, settle } = await setup((h) => { h.items.set([]); });
      expect(root.querySelector('ul')).toBeNull();
      expect(root.querySelector('.lc-list-editor__empty')!.textContent!.trim()).toBe('Aucun élément.');
      host.emptyText.set('Rien pour l\'instant.');
      await settle();
      expect(root.querySelector('.lc-list-editor__empty')!.textContent!.trim()).toBe('Rien pour l\'instant.');
      expect(addInput()).not.toBeNull();
    });

    it('detail, lockedReason et error de ligne (role=alert) s\'affichent', async () => {
      const { rows } = await setup((h) => {
        h.items.set([
          { id: 'a', label: 'A', active: true, detail: 'Trace A', error: 'Échec serveur.' },
          { id: 'p', label: 'P', active: true, locked: true, lockedReason: 'Fourni par le système.' },
        ]);
      });
      const [a, p] = rows();
      expect(a.textContent).toContain('Trace A');
      expect(a.querySelector('[role=alert]')!.textContent).toContain('Échec serveur.');
      expect(p.textContent).toContain('Fourni par le système.');
      expect(p.querySelector('.lc-list-editor__badge')!.textContent!.trim()).toBe('Protégé');
      expect(p.querySelector('[role=alert]')).toBeNull();
    });
  });

  describe('noms accessibles, libellés, sécurité', () => {
    it('chaque commande porte le libellé de sa ligne ; la liste est un ul nommé ; le groupe est nommé par ariaLabel', async () => {
      const { root, rows, control } = await setup();
      expect(rows().length).toBe(4);
      expect(control(1, 'up').getAttribute('aria-label')).toBe('Monter Deuxième');
      expect(control(1, 'down').getAttribute('aria-label')).toBe('Descendre Deuxième');
      expect(control(1, 'rename').getAttribute('aria-label')).toBe('Renommer Deuxième');
      expect(control(1, 'toggle').getAttribute('aria-label')).toBe('Actif : Deuxième');
      expect(control(1, 'toggle').getAttribute('role')).toBe('switch');
      expect(control(1, 'toggle').textContent!.trim()).toBe('Actif');
      expect(root.querySelector('ul')!.getAttribute('aria-label')).toBe('Éléments');
      const group = root.querySelector('lc-list-editor')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Liste');
    });

    it('quatre arrêts de tabulation par ligne ordinaire, deux pour une ligne protégée', async () => {
      const { rows } = await setup((h) => { h.items.set([{ id: 'a', label: 'A', active: true }, { id: 'p', label: 'P', active: true, locked: true }]); });
      const stops = (row: HTMLElement) => row.querySelectorAll('button').length;
      expect([stops(rows()[0]), stops(rows()[1])]).toEqual([4, 2]);
    });

    it('libellés anglais fournis', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { root, control, addButton, status, settle } = await setup();
      expect(control(1, 'up').getAttribute('aria-label')).toBe('Move Deuxième up');
      expect(control(1, 'toggle').getAttribute('aria-label')).toBe('Active: Deuxième');
      expect(addButton().textContent!.trim()).toBe('Add');
      expect(root.querySelector('ul')!.getAttribute('aria-label')).toBe('Items');
      control(0, 'down').click();
      await settle();
      expect(status()).toBe('Premier, position 2 of 4');
    });

    it('les 21 libellés ont la même forme en français et en anglais', () => {
      const keys = Object.keys(LC_LABELS_FR).filter((key) => key.startsWith('listEditor'));
      expect(keys.length).toBe(21);
      expect(Object.keys(LC_LABELS_EN).filter((key) => key.startsWith('listEditor')).sort()).toEqual(keys.sort());
    });

    it('un libellé contenant du HTML reste du texte', async () => {
      const { root, rows } = await setup((h) => { h.items.set([{ id: 'x', label: '<img src=x onerror=alert(1)>', active: true, detail: '<b>g</b>' }]); });
      expect(rows()[0].querySelector('.lc-list-editor__name')!.textContent).toBe('<img src=x onerror=alert(1)>');
      expect(root.querySelector('img')).toBeNull();
      expect(root.querySelector('.lc-list-editor__detail b')).toBeNull();
    });

    it('hors du champ et sans ariaLabel, avertit en développement', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      @Component({ imports: [LcListEditorComponent], template: '<lc-list-editor />' })
      class BareHostComponent {}
      const fixture = TestBed.createComponent(BareHostComponent);
      await fixture.whenStable();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('ariaLabel'));
      warn.mockRestore();
    });
  });

  describe('dans lc-form-field (CA-L2-14)', () => {
    async function setupField() {
      const fixture = TestBed.createComponent(ListInFieldHostComponent);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      return { fixture, root, group: root.querySelector<HTMLElement>('lc-list-editor')!, label: root.querySelector<HTMLLabelElement>('label.lc-form-field__label')! };
    }

    it('le libellé nomme le groupe ; l\'aide puis l\'erreur sont reliées par aria-describedby', async () => {
      const { fixture, root, group, label } = await setupField();
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(group.hasAttribute('aria-label')).toBe(false);
      const hint = root.querySelector('.lc-form-field__hint')!;
      expect(group.getAttribute('aria-describedby')).toBe(hint.id);
      fixture.componentInstance.errors.set(['Gardez un élément actif.']);
      await fixture.whenStable();
      const errors = root.querySelector('.lc-form-field__errors')!;
      expect(group.getAttribute('aria-describedby')).toBe(`${hint.id} ${errors.id}`);
    });

    it('les interrupteurs des lignes ne reprennent ni l\'aide ni l\'erreur du champ', async () => {
      const { fixture, root } = await setupField();
      fixture.componentInstance.errors.set(['Gardez un élément actif.']);
      await fixture.whenStable();
      const switches = Array.from(root.querySelectorAll<HTMLElement>('[role=switch]'));
      expect(switches.length).toBe(4);
      for (const toggle of switches) expect(toggle.hasAttribute('aria-describedby')).toBe(false);
    });

    it('un interrupteur inerte n\'est décrit que par sa propre raison, et garde son nom', async () => {
      const { fixture, root } = await setupField();
      fixture.componentInstance.minActive.set(1);
      fixture.componentInstance.items.set([{ id: 'a', label: 'Seul', active: true }, { id: 'b', label: 'Off', active: false }]);
      await fixture.whenStable();
      const [first, second] = Array.from(root.querySelectorAll<HTMLElement>('[role=switch]'));
      const reasonId = first.getAttribute('aria-describedby')!;
      expect(reasonId.split(' ').length).toBe(1);
      expect(root.querySelector(`#${reasonId}`)!.textContent).toContain('Seul élément actif');
      expect(first.getAttribute('aria-label')).toBe('Actif : Seul');
      expect(second.hasAttribute('aria-describedby')).toBe(false);
      expect(second.getAttribute('aria-label')).toBe('Actif : Off');
    });

    it('un clic sur le libellé met le focus sur le champ d\'ajout', async () => {
      const { root, label } = await setupField();
      label.click();
      expect(document.activeElement).toBe(root.querySelector('.lc-list-editor__add-input'));
    });
  });
});
