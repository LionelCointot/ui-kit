import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import type { LcFileUploadItem } from '../file-upload/file-upload.component';
import { LcMessageComposerComponent } from '../message-composer/message-composer.component';

// Fixture de la spec 2026-11-messagerie (M0, tests d'acceptation) : pilotée par `node tools/qa/message-composer-browser.mjs`, sans `play`.
// Écrite avant le code : le composant est attendu dans ../message-composer/message-composer.component (LcMessageComposerComponent) ;
// en attente du code, la construction de Storybook échoue sur cet import.
// Fenêtre : window.__composer = { patch(partiel), value(), set(texte), destroy() } ; window.__qa.events = [{ type, detail }] (send, sendBlocked, filesAdded, rejected, remove, retry).

interface QaState {
  items: LcFileUploadItem[];
  sending: boolean;
  disabled: boolean;
  attachments: boolean;
  enterSends: 'auto' | boolean;
  maxLength: number | undefined;
  maxFiles: number | null;
  accept: string;
  minRows: number;
  maxRows: number;
  errors: string[];
  note: boolean; // classe d'application « qa-note » sur l'hôte (CA-C10)
  sendLabel: string | undefined;
  ariaLabel: string | undefined;
}

const DEFAULTS: QaState = { items: [], sending: false, disabled: false, attachments: true, enterSends: 'auto', maxLength: undefined, maxFiles: 10, accept: 'image/*,.pdf', minRows: 1, maxRows: 7, errors: [], note: false, sendLabel: undefined, ariaLabel: undefined };

declare global {
  interface Window {
    __composer: { patch: (p: Partial<QaState>) => void; value: () => string; set: (v: string) => void; destroy: () => void };
    __qa: { events: { type: string; detail: unknown }[] };
  }
}

@Component({
  selector: 'lc-composer-qa',
  imports: [LcFormFieldComponent, LcMessageComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  // Classe d'application (CA-C10) : redéfinit les quatre tokens de bordure et de fond, rien d'autre.
  styles: [`.qa-note { --lc-message-composer-border-style: dashed; --lc-message-composer-border-width: var(--lc-sys-border-width-thick); --lc-message-composer-border-color: var(--lc-sys-color-warning); --lc-message-composer-background: var(--lc-sys-color-warning-container); }`],
  template: `
    @if (!alive()) {
      <p id="qa-destroyed">composant détruit</p>
    } @else if (variant() === 'field') {
      <lc-form-field label="Votre message" hint="Aide du champ" [errors]="s().errors">
        <lc-message-composer [(value)]="text" placeholder="Écrivez votre message…" [class.qa-note]="s().note"
          [sending]="s().sending" [disabled]="s().disabled" [attachments]="attach()" [enterSends]="s().enterSends"
          [maxLength]="s().maxLength" [minRows]="s().minRows" [maxRows]="s().maxRows"
          [items]="s().items" [sendLabel]="s().sendLabel"
          (send)="log('send', $event)" (sendBlocked)="log('sendBlocked', $event)" (filesAdded)="logFiles('filesAdded', $event)"
          (rejected)="log('rejected', $event)" (remove)="log('remove', $event)" (retry)="log('retry', $event)">
          <div lcComposerHeader id="qa-header">En-tête libre <button type="button" id="qa-header-button">Note interne</button></div>
          <button lcComposerAction type="button" id="qa-action">Action</button>
        </lc-message-composer>
      </lc-form-field>
    } @else {
      <lc-message-composer [(value)]="text" [ariaLabel]="s().ariaLabel" [attachments]="attach()" [disabled]="s().disabled"
        [items]="s().items" (send)="log('send', $event)" (sendBlocked)="log('sendBlocked', $event)" />
    }
    <p id="qa-after">Après</p>
  `,
})
class ComposerQaComponent {
  readonly variant = input<'field' | 'bare'>('field');
  protected readonly s = signal<QaState>({ ...DEFAULTS });
  protected readonly attach = computed(() => (this.s().attachments ? { maxFiles: this.s().maxFiles, accept: this.s().accept } : false));
  protected readonly text = signal('');
  protected readonly alive = signal(true);

  constructor() {
    window.__qa = { events: [] };
    window.__composer = { patch: (p) => this.s.update((v) => ({ ...v, ...p })), value: () => this.text(), set: (v) => this.text.set(v), destroy: () => this.alive.set(false) };
  }

  protected log(type: string, detail: unknown): void {
    window.__qa.events.push({ type, detail: JSON.parse(JSON.stringify(detail ?? null, (_k, v) => (v instanceof File ? { name: v.name, size: v.size } : v))) });
  }

  protected logFiles(type: string, files: readonly File[]): void {
    window.__qa.events.push({ type, detail: files.map((f) => ({ name: f.name, size: f.size, type: f.type })) });
  }
}

const meta: Meta = {
  title: 'QA/Forms/Message composer',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [ComposerQaComponent] })],
};
export default meta;
type Story = StoryObj;

export const Acceptance: Story = { render: () => ({ template: `<lc-composer-qa variant="field" />` }) };
export const Bare: Story = { render: () => ({ template: `<lc-composer-qa variant="bare" />` }) };
