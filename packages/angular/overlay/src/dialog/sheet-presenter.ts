import { NgComponentOutlet } from '@angular/common';
import { ApplicationRef, ChangeDetectionStrategy, Component, ElementRef, EnvironmentInjector, Injector, Provider, Signal, Type, afterNextRender, createComponent, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { LcSheetComponent } from '../sheet/sheet.component';
import type { LcDialogHandle, LcDialogRef } from './dialog-ref';

/** Sous 768 px (même rupture que la carte de `lc-sheet`), dialogues, confirmations et tiroirs se présentent en feuille du bas (D-19). */
export const lcSheetPresentation = (): boolean => typeof matchMedia === 'function' && !matchMedia('(min-width: 48em)').matches;

/**
 * Porte le composant ouvert dans un `lc-sheet` rattaché au `body` : la feuille (un `<dialog>` modal natif) donne le focus, l'inertie du reste, Échap, le geste et la sortie animée.
 * Interne : créé par `lcOpenInSheet`.
 */
@Component({
  selector: 'lc-sheet-presenter',
  imports: [LcSheetComponent, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lc-sheet [(open)]="open" [title]="title()" (closed)="onClosed()">
      <ng-container *ngComponentOutlet="content; injector: contentInjector" />
    </lc-sheet>`,
})
class LcSheetPresenterComponent {
  protected readonly open = signal(true);
  protected title: Signal<string> = signal('');
  protected content: Type<unknown> | null = null;
  protected contentInjector: Injector | undefined;
  private requestClose = (): void => undefined;
  private sheetClosed = (): void => undefined;
  private role: string | undefined;
  private describedBy: string | null | undefined;
  private readonly closedPromise = new Promise<void>((resolve) => (this.sheetClosed = resolve));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      const dialog = host.querySelector('dialog');
      if (!dialog || !this.role) return;
      dialog.setAttribute('role', this.role);
      if (this.describedBy) dialog.setAttribute('aria-describedby', this.describedBy);
    });
  }

  setup(options: { content: Type<unknown>; injector: Injector; title: Signal<string>; role: string; describedBy?: string | null; onClosed: () => void }): void {
    this.content = options.content;
    this.contentInjector = options.injector;
    this.title = options.title;
    this.role = options.role;
    this.describedBy = options.describedBy;
    this.requestClose = options.onClosed;
  }

  /** Sortie : la feuille se ferme, la promesse se résout à son `closed` (fin de la sortie animée). */
  leave(): Promise<void> {
    this.open.set(false);
    return this.closedPromise;
  }

  /** Fermeture que le code n'a pas demandée (Échap, croix, geste) : on s'aligne sur `LcDialogRef.close()`, qui n'attend plus rien. */
  protected onClosed(): void {
    this.sheetClosed();
    this.requestClose();
  }
}

export interface LcSheetPresentationOptions<R, Ref extends LcDialogRef<R>> {
  readonly component: Type<unknown>;
  /** Titre de la feuille : `lc-dialog` et `lc-drawer` y écrivent le leur (`LcDialogContext.sheetTitle`). */
  readonly title: Signal<string>;
  readonly role: 'dialog' | 'alertdialog';
  readonly ariaDescribedBy?: string | null;
  readonly makeRef: (handle: LcDialogHandle<R>, leave: () => Promise<void>) => Ref;
  /** Fournisseurs du composant ouvert (référence, données, contexte). */
  readonly providers: (ref: Ref) => Provider[];
}

/** Ouvre `component` dans une feuille du bas ; rend la même référence que la voie CDK (`closed`, `close(résultat)`). */
export function lcOpenInSheet<R, Ref extends LcDialogRef<R>>(environment: EnvironmentInjector, options: LcSheetPresentationOptions<R, Ref>): Ref {
  const host = createComponent(LcSheetPresenterComponent, { environmentInjector: environment });
  const closed = new Subject<R | undefined>();
  const ref = options.makeRef(
    { closed, close: (result) => { closed.next(result); closed.complete(); host.destroy(); } },
    () => host.instance.leave(),
  );
  host.instance.setup({
    content: options.component,
    injector: Injector.create({ providers: options.providers(ref), parent: host.injector }),
    title: options.title,
    role: options.role,
    describedBy: options.ariaDescribedBy,
    onClosed: () => ref.close(),
  });
  environment.get(ApplicationRef).attachView(host.hostView);
  document.body.append(host.location.nativeElement);
  return ref;
}
