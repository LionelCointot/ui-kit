import { ChangeDetectionStrategy, Component, ViewEncapsulation, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent, LcMessageComposerComponent, type LcFileUploadItem } from '@lionelcointot/ui-angular/forms';

/** Aperçu d'exemple : une image intégrée, sans réseau (adresse `data:image/`, admise). */
const PREVIEW =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" fill="#7a9cc6"/><circle cx="36" cy="40" r="12" fill="#fff"/><path d="M0 112l40-46 28 30 16-16 28 32z" fill="#3d5a80"/></svg>',
  );

const DONE: LcFileUploadItem = { id: 'done', name: 'plan-etage.png', size: 480_000, status: 'done', previewUrl: PREVIEW };
const UPLOADING: LcFileUploadItem = { id: 'up', name: 'rapport-mensuel.pdf', size: 2_300_000, status: 'uploading', progress: 62 };
const FAILED: LcFileUploadItem = { id: 'fail', name: 'scan-signe.pdf', size: 12_400_000, status: 'error', errorMessage: 'Ce fichier dépasse 10 Mo.' };

/** Note interne : l'application redéfinit les tokens du rectangle par une classe posée sur l'hôte, rien d'autre. */
@Component({
  selector: 'lc-internal-note-demo',
  imports: [LcFormFieldComponent, LcMessageComposerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .internal-note {
      --lc-message-composer-border-style: dashed;
      --lc-message-composer-border-width: var(--lc-sys-border-width-thick);
      --lc-message-composer-border-color: var(--lc-sys-color-warning);
      --lc-message-composer-background: var(--lc-sys-color-warning-container);
    }
  `,
  template: `
    <div style="max-width:36rem">
      <lc-form-field label="Votre note" hint="Visible seulement par l'équipe.">
        <lc-message-composer class="internal-note" placeholder="Écrivez une note interne…" [(value)]="text">
          <div lcComposerHeader>Note interne</div>
        </lc-message-composer>
      </lc-form-field>
    </div>
  `,
})
class InternalNoteDemoComponent {
  protected readonly text = signal('');
}

/**
 * Message input in one rectangle (`lc-message-composer`): text, paperclip, free actions and a send arrow, with attachment thumbnails
 * and animated drag-and-drop. It sends nothing: the application receives `send` and `filesAdded`, uploads, and passes `items` back.
 * Label, hint and errors come from `lc-form-field`; outside a field, `ariaLabel` is required.
 *
 * Import: `import { LcMessageComposerComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcMessageComposerComponent> = {
  title: 'Forms/Message composer',
  component: LcMessageComposerComponent,
  decorators: [moduleMetadata({ imports: [LcMessageComposerComponent, LcFormFieldComponent, LcButtonComponent, LcIconComponent, StoryMotionNoticeComponent, InternalNoteDemoComponent] })],
  args: {
    value: '', placeholder: 'Écrivez votre message…', ariaLabel: 'Votre message', disabled: false, readonly: false, sending: false,
    maxLength: 500, minRows: 1, maxRows: 7, enterSends: 'auto', sendIcon: 'send', sendLabel: 'Envoyer', attachIcon: 'paperclip',
    attachments: true, accept: 'image/*,.pdf', maxFiles: 10, showSize: true,
  },
  argTypes: {
    enterSends: { control: 'select', options: ['auto', true, false] },
    maxLength: { control: 'number' },
    maxFiles: { control: 'number' },
    items: { control: false },
    send: { action: 'send' },
    sendBlocked: { action: 'sendBlocked' },
    filesAdded: { action: 'filesAdded' },
    rejected: { action: 'rejected' },
    remove: { action: 'remove' },
    retry: { action: 'retry' },
    touch: { action: 'touch' },
    valueChange: { action: 'valueChange' },
  },
};
export default meta;
type Story = StoryObj<LcMessageComposerComponent>;

/** Fixed composer in a 36 rem column; `attributes` are plain template attributes. */
const fixed = (items: readonly LcFileUploadItem[], attributes = '', value = ''): Story => ({
  parameters: fixedExample,
  render: () => ({
    props: { items, value },
    template: `<div style="max-width:36rem"><lc-message-composer [items]="items" [value]="value" ariaLabel="Votre message" ${attributes} /></div>`,
  }),
});

/** Every input is bound: change them in the Controls panel (the thumbnails stay fixed). */
export const Playground: Story = {
  // `maxRows`, `enterSends` et `maxFiles` n'agissent qu'avec un long texte, le clavier ou une limite atteinte : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['maxRows', 'enterSends', 'maxFiles'] } },
  render: (args) => ({
    props: { ...args, items: [DONE, UPLOADING] },
    template: `
      <div style="max-width:36rem">
        <lc-message-composer [value]="value" [placeholder]="placeholder" [ariaLabel]="ariaLabel" [disabled]="disabled" [readonly]="readonly"
          [sending]="sending" [maxLength]="maxLength" [minRows]="minRows" [maxRows]="maxRows" [enterSends]="enterSends"
          [sendIcon]="sendIcon" [sendLabel]="sendLabel" [attachIcon]="attachIcon" [attachments]="attachments" [accept]="accept"
          [maxFiles]="maxFiles" [showSize]="showSize" [items]="items"
          (valueChange)="valueChange($event)" (send)="send($event)" (sendBlocked)="sendBlocked($event)" (filesAdded)="filesAdded($event)"
          (rejected)="rejected($event)" (remove)="remove($event)" (retry)="retry($event)" (touch)="touch()" />
      </div>`,
  }),
};

/** Empty: the paperclip on the left, the send arrow on the right. */
export const Empty: Story = fixed([]);

/** Attachments in the three states: done (with a preview), uploading (progress bar), failed ("Réessayer" and "Retirer"). */
export const WithAttachments: Story = fixed([DONE, UPLOADING, FAILED], '', 'Voici les pièces demandées.');

/** `sending`: the text is read-only, the send arrow becomes a spinner and the next send is refused. */
export const Sending: Story = fixed([], '[sending]="true"', 'Merci de votre retour.');

/** `maxLength` at 90 %: the counter appears. */
export const NearLimit: Story = fixed([], '[maxLength]="40"', 'Un message presque trop long !!');

/** Disabled: no typing, no drop, no paperclip, no send. */
export const Disabled: Story = fixed([DONE], 'disabled');

/** Label, hint and error come from `lc-form-field`. */
export const InAForm: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="max-width:36rem">
        <lc-form-field label="Votre message" hint="Entrée envoie, Maj+Entrée va à la ligne." [errors]="['Le message est obligatoire.']">
          <lc-message-composer placeholder="Écrivez votre message…" />
        </lc-form-field>
      </div>`,
  }),
};

/** Internal note: an application class redefines the four border and background tokens (dashed border, warning colours); the icons keep the primary colour. */
export const InternalNote: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-internal-note-demo />` }),
};

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcMessageComposerComponent, type LcFileUploadItem } from '@lionelcointot/ui-angular/forms';

@Component({
  selector: 'app-example',
  imports: [LcMessageComposerComponent],
  template: \`
    <lc-message-composer ariaLabel="Votre message" accept="image/*" [items]="items()"
      (filesAdded)="add($event)" (rejected)="onRejected($event)" />
  \`,
})
export class ExampleComponent {
  protected readonly items = signal<readonly LcFileUploadItem[]>([]);
  protected add(files: File[]): void { /* envoyer les fichiers, puis mettre items à jour */ }
  protected onRejected(refused: unknown[]): void { /* le composant affiche déjà le refus et secoue le rectangle */ }
}`;

/** A fixed set of events: a thumbnail appears (fade, 0.96 → 1), the drop overlay lights, a refused file shakes the rectangle. "Rejouer" plays it again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => {
    const items = signal<readonly LcFileUploadItem[]>([]);
    const drag = (box: Element, type: string, files: File[] = []) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        dataTransfer: { value: { types: ['Files'], files, dropEffect: 'copy' } },
        relatedTarget: { value: null },
      });
      box.dispatchEvent(event);
    };
    return {
      props: {
        items,
        ...replayable({
          reset: () => items.set([]),
          play: (later, root) => {
            const box = root.querySelector('.lc-message-composer__box');
            if (!box) return;
            later(0, () => items.set([DONE]));
            later(1500, () => drag(box, 'dragenter', [new File(['x'], 'photo.png', { type: 'image/png' })]));
            later(3000, () => drag(box, 'dragleave'));
            later(3800, () => drag(box, 'drop', [new File(['x'], 'notes.txt', { type: 'text/plain' })]));
          },
        }),
      },
      template: `
        <lc-story-motion-notice />
        <div #root style="max-width:36rem">
          <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="replay(root)">Rejouer</button>
          @for (key of keys(); track key) {
            <lc-message-composer ariaLabel="Votre message" accept="image/*" [items]="items()" />
          }
        </div>`,
    };
  },
};
