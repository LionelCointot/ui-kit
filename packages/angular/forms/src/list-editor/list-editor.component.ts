import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  isDevMode,
  linkedSignal,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { LC_LABELS, LcButtonComponent, LcIconComponent, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import { LcSwitchComponent } from '../switch/switch.component';

/** Un élément de la liste, fourni et tenu à jour par l'application. */
export interface LcListEditorItem {
  readonly id: string;
  readonly label: string;
  readonly active: boolean;
  /** Protégé : ni renommable ni désactivable (il compte comme actif), mais réordonnable. */
  readonly locked?: boolean;
  /** Raison de la protection, affichée sous le libellé (texte de l'application). */
  readonly lockedReason?: string;
  /** Texte du badge d'un élément protégé (défaut : libellé `listEditorLocked`). */
  readonly lockedLabel?: string;
  /** Texte secondaire facultatif sous le libellé. */
  readonly detail?: string;
  /** Une opération sur cette ligne est en cours : ses commandes sont inertes. */
  readonly busy?: boolean;
  /** Erreur de cette ligne (par exemple venue du serveur), affichée sous elle. */
  readonly error?: string;
}

export type LcListEditorDirection = 'up' | 'down';
export interface LcListEditorMove {
  readonly id: string;
  readonly direction: LcListEditorDirection;
}
export interface LcListEditorRename {
  readonly id: string;
  readonly label: string;
}
export interface LcListEditorToggle {
  readonly id: string;
  readonly active: boolean;
}

type Command = 'up' | 'down' | 'rename' | 'toggle';

/** Ce qui est attendu de l'application après une action de l'utilisateur : sert au focus et à l'annonce. */
type Pending =
  | { readonly kind: 'move'; readonly id: string; readonly command: Command; readonly index: number }
  | { readonly kind: 'toggle'; readonly id: string; readonly active: boolean }
  | { readonly kind: 'add'; readonly count: number };

interface RowView {
  readonly item: LcListEditorItem;
  readonly index: number;
  readonly locked: boolean;
  readonly blocked: boolean;
  readonly canUp: boolean;
  readonly canDown: boolean;
  /** L'interrupteur est inerte parce que la désactivation violerait `minActive`. */
  readonly keepActive: boolean;
  readonly reasonId: string;
  readonly moveUpLabel: string;
  readonly moveDownLabel: string;
  readonly renameLabel: string;
  readonly renameFieldLabel: string;
  readonly toggleLabel: string;
}

const sameText = (existing: string, candidate: string) => existing.trim().toLocaleLowerCase() === candidate.trim().toLocaleLowerCase();

function sameList(a: readonly LcListEditorItem[], b: readonly LcListEditorItem[]): boolean {
  return a.length === b.length && a.every((item, index) => item.id === b[index].id && item.label === b[index].label && item.active === b[index].active);
}

/**
 * Liste ordonnée modifiable : ajout, renommage en place, activation et réordonnancement (pas de suppression).
 * L'application garde la vérité : le composant émet des demandes (`add`, `rename`, `move`, `toggle`) et affiche `items`.
 * Réordonnancement sans souris : boutons « Monter » et « Descendre » (inertes aux extrémités) et Alt + flèche haut ou bas
 * depuis n'importe quel contrôle de la ligne ; le focus suit la commande dans la nouvelle ligne et la position est annoncée.
 * Les erreurs détectées (vide, trop long, doublon) s'affichent sans émettre ; celles de l'application arrivent par
 * `LcListEditorItem.error` (ligne) et `addError` (champ d'ajout).
 *
 * @example
 * <lc-form-field label="Catégories">
 *   <lc-list-editor [items]="items()" [minActive]="1" [maxLength]="60" addLabel="Nouvelle catégorie"
 *     (add)="onAdd($event)" (rename)="onRename($event)" (move)="onMove($event)" (toggle)="onToggle($event)" />
 * </lc-form-field>
 */
@Component({
  selector: 'lc-list-editor',
  imports: [LcButtonComponent, LcIconComponent, LcSwitchComponent],
  template: `
    @if (rows().length > 0) {
      <ul class="lc-list-editor__list" [attr.aria-label]="listLabel() || labels.listEditorList">
        @for (row of rows(); track row.item.id) {
          <li #rowItem class="lc-list-editor__row" [class.lc-list-editor__row--inactive]="!row.item.active && !row.locked"
            [attr.data-id]="row.item.id" (keydown)="onRowKeydown($event, row)">
            <div class="lc-list-editor__main">
              @if (editing()?.id === row.item.id) {
                <div class="lc-list-editor__edit">
                  <input #editInput type="text" class="lc-input lc-list-editor__edit-input" autocomplete="off"
                    [class.lc-input--invalid]="!!editError()" [value]="editing()?.value ?? ''"
                    [attr.aria-label]="row.renameFieldLabel" [attr.aria-invalid]="editError() ? 'true' : null"
                    [attr.aria-describedby]="editError() ? editErrorId : null"
                    (input)="onEditInput($event)" (keydown.enter)="saveEdit(row)" (keydown.escape)="cancelEdit(row)" />
                  <button lcButton type="button" iconOnly themeColor="primary" [attr.aria-label]="labels.listEditorSave"
                    [disabled]="disabled()" [attr.aria-disabled]="row.blocked && !disabled() ? 'true' : null" (click)="saveEdit(row)">
                    <lc-icon name="save" />
                  </button>
                  <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" [attr.aria-label]="labels.cancel"
                    [disabled]="disabled()" (click)="cancelEdit(row)">
                    <lc-icon name="x" />
                  </button>
                </div>
                @if (editError()) {
                  <p class="lc-list-editor__error" role="alert" [id]="editErrorId"><lc-icon name="circle-alert" /><span>{{ editError() }}</span></p>
                }
              } @else {
                <div class="lc-list-editor__name-line">
                  @if (row.locked) {
                    <lc-icon name="lock" />
                  }
                  <span class="lc-list-editor__name">{{ row.item.label }}</span>
                  @if (row.locked) {
                    <span class="lc-list-editor__badge">{{ row.item.lockedLabel || labels.listEditorLocked }}</span>
                  } @else if (!row.item.active) {
                    <span class="lc-list-editor__badge lc-list-editor__badge--off"><lc-icon name="circle-off" />{{ labels.listEditorInactive }}</span>
                  }
                </div>
              }
              @if (row.item.detail) {
                <span class="lc-list-editor__detail">{{ row.item.detail }}</span>
              }
              @if (row.locked && row.item.lockedReason) {
                <span class="lc-list-editor__detail">{{ row.item.lockedReason }}</span>
              }
              @if (row.keepActive) {
                <span class="lc-list-editor__detail" [id]="row.reasonId">{{ labels.listEditorMinActive(minActive()) }}</span>
              }
              @if (row.item.error) {
                <p class="lc-list-editor__error" role="alert"><lc-icon name="circle-alert" /><span>{{ row.item.error }}</span></p>
              }
            </div>
            <div class="lc-list-editor__actions">
              <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" data-command="up"
                [disabled]="disabled()" [attr.aria-disabled]="row.blocked || !row.canUp ? 'true' : null"
                [attr.aria-label]="row.moveUpLabel" (click)="requestMove(row, 'up', 'up')">
                <lc-icon name="arrow-up" />
              </button>
              <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" data-command="down"
                [disabled]="disabled()" [attr.aria-disabled]="row.blocked || !row.canDown ? 'true' : null"
                [attr.aria-label]="row.moveDownLabel" (click)="requestMove(row, 'down', 'down')">
                <lc-icon name="arrow-down" />
              </button>
              @if (!row.locked) {
                <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" data-command="rename"
                  [disabled]="disabled()" [attr.aria-disabled]="row.blocked ? 'true' : null"
                  [attr.aria-label]="row.renameLabel" (click)="startEdit(row)">
                  <lc-icon name="pencil" />
                </button>
                <button #toggleSwitch lcSwitch data-command="toggle" [checked]="row.item.active" [disabled]="disabled()"
                  [attr.aria-disabled]="row.blocked || row.keepActive ? 'true' : null"
                  [extraDescribedBy]="row.keepActive ? row.reasonId : null" [attr.aria-label]="row.toggleLabel"
                  (checkedChange)="onToggle(row, $event, toggleSwitch)">{{ labels.listEditorActive }}</button>
              }
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="lc-list-editor__empty">{{ emptyText() || labels.listEditorEmpty }}</p>
    }
    <div class="lc-list-editor__add">
      <label class="lc-list-editor__add-label" [attr.for]="addInputId">{{ addLabel() || labels.listEditorAddLabel }}</label>
      <div class="lc-list-editor__add-row">
        <input #addInput type="text" class="lc-input lc-list-editor__add-input" autocomplete="off" [id]="addInputId"
          [class.lc-input--invalid]="!!addErrorText()" [value]="draft()" [disabled]="disabled()"
          [attr.aria-invalid]="addErrorText() ? 'true' : null" [attr.aria-describedby]="addErrorText() ? addErrorId : null"
          (input)="onDraftInput($event)" (keydown.enter)="submitAdd()" />
        <button lcButton type="button" themeColor="primary" [disabled]="disabled()" [attr.aria-disabled]="busy() ? 'true' : null"
          (click)="submitAdd()">
          <lc-icon name="plus" />{{ addButtonLabel() || labels.listEditorAdd }}
        </button>
      </div>
      @if (addErrorText()) {
        <p class="lc-list-editor__error" role="alert" [id]="addErrorId"><lc-icon name="circle-alert" /><span>{{ addErrorText() }}</span></p>
      }
    </div>
    <div class="lc-visually-hidden" role="status" aria-live="polite">{{ announcement() }}</div>
  `,
  styleUrl: './list-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcListEditorComponent) }],
  // Les contrôles internes (interrupteurs) ne reprennent pas l'aide ni les erreurs du `lc-form-field` : elles décrivent le groupe.
  viewProviders: [{ provide: LC_FORM_FIELD, useValue: null }],
  host: {
    class: 'lc-list-editor',
    role: 'group',
    '[attr.id]': 'id()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabel() ? null : (field?.labelId ?? null)',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '[attr.aria-busy]': "busy() ? 'true' : null",
    '[class.lc-list-editor--disabled]': 'disabled()',
  },
})
export class LcListEditorComponent implements LcFormFieldControl {
  protected readonly labels = inject(LC_LABELS);
  protected readonly field = inject(LC_FORM_FIELD, { optional: true, skipSelf: true });
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Éléments, dans l'ordre d'affichage, fournis et tenus à jour par l'application. */
  readonly items = input<readonly LcListEditorItem[]>([]);
  /** État de référence (par exemple celui enregistré) : `modified` est vrai quand `items` en diffère (ordre, libellés, activations). */
  readonly savedItems = input<readonly LcListEditorItem[] | null>(null);
  /** Nombre minimal d'éléments actifs (les protégés comptent) ; au minimum, l'interrupteur du dernier actif est inerte. 0 : aucune règle. */
  readonly minActive = input(0);
  /** Longueur maximale d'un libellé ; `null` : sans limite. */
  readonly maxLength = input<number | null>(null);
  /** Compare un libellé existant et un libellé proposé ; vrai : doublon. Par défaut, égalité insensible à la casse et aux espaces de bord. */
  readonly isDuplicate = input<(existing: string, candidate: string) => boolean>(sameText);
  /** Libellé visible du champ d'ajout (par exemple « Nouvelle catégorie »). */
  readonly addLabel = input('');
  /** Texte du bouton d'ajout. */
  readonly addButtonLabel = input('');
  /** Erreur du champ d'ajout fournie par l'application (par exemple refus du serveur). */
  readonly addError = input<string | null>(null);
  /** Texte de la liste vide. */
  readonly emptyText = input('');
  /** Nom accessible de la liste (`ul`). */
  readonly listLabel = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Opération en cours sur la liste entière : toutes les commandes sont inertes (mais gardent le focus). */
  readonly busy = input(false, { transform: booleanAttribute });
  /** Nom accessible hors de `lc-form-field` (sinon le libellé du champ est utilisé). */
  readonly ariaLabel = input<string>();
  readonly id = input<string>(lcUniqueId('list-editor'));

  /** Libellé valide à ajouter en fin de liste. */
  readonly add = output<string>();
  readonly rename = output<LcListEditorRename>();
  readonly move = output<LcListEditorMove>();
  readonly toggle = output<LcListEditorToggle>();

  readonly controlId = computed(() => this.id());
  readonly labelable = false;

  /** Vrai quand `items` diffère de `savedItems` (toujours faux sans `savedItems`) : l'application peut proposer « Enregistrer ». */
  readonly modified = computed(() => {
    const saved = this.savedItems();
    return saved !== null && !sameList(this.items(), saved);
  });

  protected readonly addInputId = lcUniqueId('list-editor-add');
  protected readonly addErrorId = lcUniqueId('list-editor-add-error');
  protected readonly editErrorId = lcUniqueId('list-editor-edit-error');
  protected readonly draft = signal('');
  protected readonly editing = signal<{ id: string; value: string } | null>(null);
  protected readonly editError = signal<string | null>(null);
  private readonly localAddError = signal<string | null>(null);
  protected readonly addErrorText = computed(() => this.localAddError() ?? this.addError());

  private readonly addInput = viewChild.required<ElementRef<HTMLInputElement>>('addInput');
  private readonly rowElements = viewChildren('rowItem', { read: ElementRef<HTMLElement> });
  private pending: Pending | null = null;
  private resyncing = false;

  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy()));

  protected readonly rows = computed<readonly RowView[]>(() => {
    const items = this.items();
    const activeCount = items.filter((item) => item.locked || item.active).length;
    return items.map((item, index) => {
      const locked = !!item.locked;
      return {
        item,
        index,
        locked,
        blocked: this.disabled() || this.busy() || !!item.busy,
        canUp: index > 0,
        canDown: index < items.length - 1,
        keepActive: !locked && item.active && activeCount <= this.minActive(),
        reasonId: `${this.id()}-reason-${index}`,
        moveUpLabel: this.labels.listEditorMoveUp(item.label),
        moveDownLabel: this.labels.listEditorMoveDown(item.label),
        renameLabel: this.labels.listEditorRename(item.label),
        renameFieldLabel: this.labels.listEditorRenameField(item.label),
        toggleLabel: this.labels.listEditorToggle(item.label),
      };
    });
  });

  /**
   * Annonce polie après l'effet visible d'une action : nouvelle position, activation, ajout. Rien tant que l'application
   * n'a pas changé `items` ; sans changement notable, le texte précédent reste (donc n'est pas ré-annoncé).
   */
  protected readonly announcement = linkedSignal<readonly LcListEditorItem[], string>({
    source: this.items,
    computation: (items, previous) => {
      const pending = this.pending;
      if (!previous || !pending) return previous?.value ?? '';
      if (pending.kind === 'add') {
        const added = items.find((item) => !previous.source.some((before) => before.id === item.id));
        return added ? this.labels.listEditorAnnounceAdded(added.label, items.indexOf(added) + 1) : previous.value;
      }
      const index = items.findIndex((item) => item.id === pending.id);
      if (index < 0) return previous.value;
      const item = items[index];
      if (pending.kind === 'move') {
        return index === pending.index ? previous.value : this.labels.listEditorPosition(item.label, index + 1, items.length);
      }
      return item.active === pending.active
        ? (item.active ? this.labels.listEditorAnnounceActive(item.label) : this.labels.listEditorAnnounceInactive(item.label))
        : previous.value;
    },
  });

  constructor() {
    // Quand l'application a appliqué l'action : le focus suit la commande déplacée (le navigateur le perd quand le nœud
    // change de place), le champ d'ajout est vidé. Si l'application refuse, rien ne change : le texte saisi reste.
    afterRenderEffect(() => {
      const items = this.items();
      const pending = this.pending;
      if (!pending) return;
      if (pending.kind === 'move') {
        const index = items.findIndex((item) => item.id === pending.id);
        if (index < 0 || index === pending.index) return;
        this.pending = null;
        this.focusCommand(pending.id, pending.command);
      } else if (pending.kind === 'toggle') {
        if (items.find((item) => item.id === pending.id)?.active === pending.active) this.pending = null;
      } else if (items.length > pending.count) {
        this.pending = null;
        this.draft.set('');
        this.focusAddInput();
      }
    });

    // Un interrupteur « inerte » reste atteignable au clavier (aria-disabled) : on bloque son clic comme le fait `lcButton`.
    const blockInertSwitch = (event: Event) => {
      if ((event.target as Element).closest('[role="switch"][aria-disabled="true"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    this.host.addEventListener('click', blockInertSwitch, true);
    inject(DestroyRef).onDestroy(() => this.host.removeEventListener('click', blockInertSwitch, true));

    if (isDevMode()) {
      afterNextRender(() => {
        if (!this.ariaLabel() && !this.field && !this.host.hasAttribute('aria-labelledby')) {
          console.warn('[lc-list-editor] ariaLabel est obligatoire hors de lc-form-field.');
        }
      });
    }
  }

  focus(options?: FocusOptions): void {
    this.addInput().nativeElement.focus(options);
  }

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
    this.localAddError.set(null);
  }

  /** Ajout : erreur affichée sans émettre si le libellé est invalide ; sinon la demande part et le focus reste au champ. */
  protected submitAdd(): void {
    if (this.disabled() || this.busy()) return;
    const error = this.validate(this.draft(), null);
    this.localAddError.set(error);
    if (!error) {
      this.pending = { kind: 'add', count: this.items().length };
      this.add.emit(this.draft().trim());
    }
    this.focusAddInput();
  }

  protected startEdit(row: RowView): void {
    if (row.blocked) return;
    this.editError.set(null);
    this.editing.set({ id: row.item.id, value: row.item.label });
    afterNextRender(() => {
      const input = this.rowElement(row.item.id)?.querySelector<HTMLInputElement>('.lc-list-editor__edit-input');
      input?.focus();
      input?.select();
    }, { injector: this.injector });
  }

  protected onEditInput(event: Event): void {
    const editing = this.editing();
    if (editing) this.editing.set({ ...editing, value: (event.target as HTMLInputElement).value });
    this.editError.set(null);
  }

  protected saveEdit(row: RowView): void {
    const editing = this.editing();
    if (!editing || row.blocked) return;
    const label = editing.value.trim();
    if (label === row.item.label) return this.cancelEdit(row);
    const error = this.validate(label, row.item.id);
    this.editError.set(error);
    if (error) return;
    this.rename.emit({ id: row.item.id, label });
    this.closeEdit(row.item.id);
  }

  protected cancelEdit(row: RowView): void {
    this.closeEdit(row.item.id);
  }

  protected requestMove(row: RowView, direction: LcListEditorDirection, command: Command): void {
    if (row.blocked || (direction === 'up' ? !row.canUp : !row.canDown)) return;
    this.pending = { kind: 'move', id: row.item.id, command, index: row.index };
    this.move.emit({ id: row.item.id, direction });
  }

  /** Alt + flèche haut ou bas depuis un contrôle de la ligne : même effet que « Monter » ou « Descendre », focus sur le même contrôle. */
  protected onRowKeydown(event: KeyboardEvent, row: RowView): void {
    const direction = event.altKey ? ({ ArrowUp: 'up', ArrowDown: 'down' } as const)[event.key as 'ArrowUp' | 'ArrowDown'] : undefined;
    if (!direction || this.editing()) return;
    event.preventDefault();
    const command = (event.target as Element).closest('[data-command]')?.getAttribute('data-command') as Command | null;
    this.requestMove(row, direction, command ?? direction);
  }

  /** L'interrupteur change seul de position : on le remet d'accord avec `items` si l'application n'a pas suivi (refus). */
  protected onToggle(row: RowView, active: boolean, control: LcSwitchComponent): void {
    if (this.resyncing) return; // écho de la remise d'accord ci-dessous : jamais une demande de l'utilisateur
    this.pending = { kind: 'toggle', id: row.item.id, active };
    this.toggle.emit({ id: row.item.id, active });
    afterNextRender(() => {
      const current = this.items().find((item) => item.id === row.item.id)?.active ?? !active;
      if (control.checked() === current) return;
      this.resyncing = true;
      control.checked.set(current);
      this.resyncing = false;
    }, { injector: this.injector });
  }

  /** Libellé valide ? Renvoie le message d'erreur, ou `null`. */
  private validate(label: string, ignoreId: string | null): string | null {
    const text = label.trim();
    const max = this.maxLength();
    if (!text) return this.labels.listEditorRequired;
    if (max !== null && text.length > max) return this.labels.listEditorTooLong(max);
    const same = this.isDuplicate();
    return this.items().some((item) => item.id !== ignoreId && same(item.label, text)) ? this.labels.listEditorDuplicate : null;
  }

  private closeEdit(id: string): void {
    this.editing.set(null);
    this.editError.set(null);
    afterNextRender(() => this.focusCommand(id, 'rename'), { injector: this.injector });
  }

  private rowElement(id: string): HTMLElement | undefined {
    return this.rowElements().find((row) => row.nativeElement.dataset['id'] === id)?.nativeElement;
  }

  /** Focus sur un contrôle de la ligne, sauf si l'utilisateur l'a déjà déplacé ailleurs (hors de la liste). */
  private focusCommand(id: string, command: Command): void {
    const active = this.document.activeElement;
    if (active && active !== this.document.body && !this.host.contains(active)) return;
    this.rowElement(id)?.querySelector<HTMLElement>(`[data-command="${command}"]`)?.focus();
  }

  private focusAddInput(): void {
    afterNextRender(() => this.addInput().nativeElement.focus(), { injector: this.injector });
  }
}
