import { Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import {
  LcFileUploadComponent,
  type LcFileUploadItem,
  type LcFileUploadRejection,
} from '../file-upload/file-upload.component';

/** Aperçu d'exemple : une adresse fournie par l'application (ici une image intégrée, sans réseau). */
const PREVIEW =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" fill="#7a9cc6"/><circle cx="36" cy="40" r="12" fill="#fff"/><path d="M0 112l40-46 28 30 16-16 28 32z" fill="#3d5a80"/></svg>',
  );

const DONE: LcFileUploadItem = { id: 'done', name: 'rapport-mensuel.pdf', size: 2_300_000, status: 'done' };
const UPLOADING: LcFileUploadItem = { id: 'up', name: 'photo-entree.jpg', size: 4_800_000, status: 'uploading', progress: 45, previewUrl: PREVIEW };
const PENDING: LcFileUploadItem = { id: 'wait', name: 'tableau-des-mesures.xlsx', size: 640_000, status: 'pending' };
const FAILED: LcFileUploadItem = {
  id: 'fail', name: 'scan-signe.png', size: 12_400_000, status: 'error', errorMessage: 'Ce fichier dépasse 10 Mo.', previewUrl: PREVIEW,
};

/** Dépôt simulé : aucune requête, seulement des minuteries qui font avancer la progression (un nom avec « erreur » échoue à 60 %). */
@Component({
  selector: 'lc-file-upload-demo',
  imports: [LcFileUploadComponent, LcFormFieldComponent],
  template: `
    <lc-form-field label="Pièces jointes" hint="Trois fichiers au plus, images ou PDF." [errors]="problems()">
      <lc-file-upload accept="image/*,.pdf" multiple [maxFiles]="3" [items]="items()"
        (filesAdded)="add($event)" (rejected)="reject($event)" (remove)="remove($event)" (retry)="retry($event)" />
    </lc-form-field>
  `,
})
class FileUploadDemoComponent {
  protected readonly items = signal<readonly LcFileUploadItem[]>([]);
  protected readonly problems = signal<readonly string[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private nextId = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach((timer) => clearInterval(timer)));
  }

  protected add(files: File[]): void {
    this.problems.set([]);
    for (const file of files) {
      const id = `file-${++this.nextId}`;
      this.items.update((items) => [...items, { id, name: file.name, size: file.size, status: 'pending' }]);
      this.start(id);
    }
  }

  protected reject(rejections: LcFileUploadRejection[]): void {
    this.problems.set(rejections.map(({ file, reason }) => `${file.name} : ${reason === 'type' ? 'type non accepté' : 'trop de fichiers'}.`));
  }

  protected remove(id: string): void {
    clearInterval(this.timers.get(id));
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  protected retry(id: string): void {
    this.patch(id, { status: 'pending', progress: null, errorMessage: undefined });
    this.start(id, true);
  }

  private start(id: string, reliable = false): void {
    let progress = 0;
    this.timers.set(id, setInterval(() => {
      progress += 20;
      const name = this.items().find((item) => item.id === id)?.name ?? '';
      const fails = !reliable && name.includes('erreur') && progress >= 60;
      const finished = progress >= 100;
      if (fails || finished) clearInterval(this.timers.get(id));
      this.patch(id, fails
        ? { status: 'error', progress: null, errorMessage: 'L\'envoi a échoué. Réessayez.' }
        : { status: finished ? 'done' : 'uploading', progress, errorMessage: undefined });
    }, 500));
  }

  private patch(id: string, change: Partial<LcFileUploadItem>): void {
    this.items.update((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }
}

/**
 * File picker with a drop zone and a list of files in progress (`lc-file-upload`). The component picks and validates files
 * (`accept`, `multiple`, `maxFiles`) and emits them; the application uploads and passes `items` back with each file's status.
 *
 * Import: `import { LcFileUploadComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcFileUploadComponent> = {
  title: 'Forms/File upload',
  component: LcFileUploadComponent,
  decorators: [moduleMetadata({ imports: [LcFileUploadComponent, LcFormFieldComponent, FileUploadDemoComponent] })],
  args: {
    accept: '', multiple: true, maxFiles: null, disabled: false, ariaLabel: 'Pièces jointes',
    showSize: true, chooseIcon: 'upload', errorPlaceholderIcon: 'file-text', fullWidthMobile: false, removeLabelVisible: false,
  },
  argTypes: {
    maxFiles: { control: 'number' },
    items: { control: false },
    filesAdded: { action: 'filesAdded' },
    rejected: { action: 'rejected' },
    remove: { action: 'remove' },
    retry: { action: 'retry' },
  },
};
export default meta;
type Story = StoryObj<LcFileUploadComponent>;

/** Fixed list of files in a 36 rem column; `attributes` are plain template attributes. */
const fixed = (items: readonly LcFileUploadItem[], attributes = ''): Story => ({
  parameters: fixedExample,
  render: () => ({
    props: { items },
    template: `<div style="max-width:36rem"><lc-file-upload [items]="items" ariaLabel="Pièces jointes" ${attributes} /></div>`,
  }),
});

/** Every input is bound: change them in the Controls panel (the list stays fixed; see `Interactive` for simulated uploads). */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['errorPlaceholderIcon'] } },
  render: (args) => ({
    props: { ...args, items: [DONE, UPLOADING, PENDING] },
    template: `
      <div style="max-width:36rem">
        <lc-file-upload [items]="items" [accept]="accept" [multiple]="multiple" [maxFiles]="maxFiles"
          [disabled]="disabled" [ariaLabel]="ariaLabel" [showSize]="showSize" [chooseIcon]="chooseIcon"
          [errorPlaceholderIcon]="errorPlaceholderIcon" [fullWidthMobile]="fullWidthMobile" [removeLabelVisible]="removeLabelVisible"
          (filesAdded)="filesAdded($event)" (rejected)="rejected($event)" (remove)="remove($event)" (retry)="retry($event)" />
      </div>`,
  }),
};

/** No file: the button and the drop zone (the zone appears from 768 px). */
export const Empty: Story = fixed([]);

/** One file being uploaded, with a thumbnail and a progress bar. */
export const Uploading: Story = fixed([UPLOADING]);

/** The four states in one list: done, uploading, pending, failed. */
export const MixedStates: Story = fixed([DONE, UPLOADING, PENDING, FAILED]);

/** Failed: the message is announced, "Réessayer" and "Retirer" are two tab stops. */
export const ErrorWithRetry: Story = fixed([FAILED]);

/** Maximum reached: the button is inert (`aria-disabled`, still reachable by keyboard) and the text says so. */
export const MaxReached: Story = fixed([DONE, PENDING, FAILED], '[maxFiles]="3"');

/** Disabled picker. */
export const Disabled: Story = fixed([DONE, UPLOADING], 'disabled');

/** Very long file names are truncated without overflowing. */
export const LongNames: Story = fixed([
  { id: 'l1', name: 'compte-rendu-de-la-reunion-de-coordination-du-premier-trimestre-version-finale-corrigee-et-relue.pdf', size: 1_250_000, status: 'done' },
  { id: 'l2', name: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', size: 980, status: 'pending' },
  { id: 'l3', name: 'image-avec-un-nom-vraiment-tres-long-pour-verifier-la-coupure.png', size: 8_100_000, status: 'error', errorMessage: 'Le format de ce fichier n\'est pas pris en charge, merci d\'en choisir un autre.' },
]);

/** `showSize` off: the row keeps only the status, without the file size. */
export const WithoutSize: Story = fixed([DONE, UPLOADING, PENDING], '[showSize]="false"');

/** `retryable: false`: the failed row only has "Retirer" (the upload cannot be redone as is). */
export const NotRetryable: Story = fixed([{ ...FAILED, retryable: false }]);

/** `chooseIcon` and `errorPlaceholderIcon`: kit icons (`image-plus`, `image-off`) for photos. */
export const CustomIcons: Story = fixed(
  [{ id: 'bad', name: 'IMG_0042.jpg', size: 3_100_000, status: 'error', errorMessage: 'Ce fichier n\'est pas une photo.' }],
  'accept="image/*" chooseIcon="image-plus" errorPlaceholderIcon="image-off"',
);

/** `removeLabelVisible`: removal is a "Retirer" button (accessible name unchanged: "Retirer {name}"). */
export const VisibleRemoveLabel: Story = fixed([DONE, FAILED], '[removeLabelVisible]="true"');

/** `fullWidthMobile`: below 480 px of available width (here 400 px, even on a large screen), the button spans the full width. */
export const FullWidthButton: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:400px"><lc-file-upload [items]="[]" ariaLabel="Photos" [fullWidthMobile]="true" /></div>`,
  }),
};

/** Narrow (360 px): photos without size, non-retryable errors, visible "Retirer" word, error message full width under the thumbnail. */
export const PhotosAt360Pixels: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      items: [
        { id: 'p1', name: 'photo-cuisine.jpg', size: 4_800_000, status: 'uploading', progress: 45, previewUrl: PREVIEW },
        { id: 'p2', name: 'photo-entree.jpg', size: 2_100_000, status: 'done', previewUrl: PREVIEW },
        { id: 'p3', name: 'photo-toiture-avec-un-nom-long.heic', size: 12_400_000, status: 'error', retryable: false,
          errorMessage: 'Cette photo est trop lourde. Choisissez-en une plus légère.' },
        { id: 'p4', name: 'photo-cave.jpg', size: 3_000_000, status: 'error', errorMessage: 'L\'envoi a échoué.', previewUrl: PREVIEW },
      ],
    },
    template: `
      <div style="max-width:360px;border:1px dashed var(--lc-sys-color-border);padding:var(--lc-sys-space-2, 8px)">
        <lc-form-field label="Photos" hint="Ajoutez des photos du problème." hintPlacement="above">
          <lc-file-upload accept="image/*" multiple [items]="items" [showSize]="false" chooseIcon="image-plus"
            errorPlaceholderIcon="image-off" [fullWidthMobile]="true" [removeLabelVisible]="true" />
        </lc-form-field>
      </div>`,
  }),
};

/** In `lc-form-field`: the label names the group, the hint and the error are linked to it (`aria-describedby`). */
export const InAField: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { items: [DONE, FAILED], errors: ['Retirez ou renvoyez le fichier en erreur avant de continuer.'] },
    template: `
      <div style="max-width:36rem">
        <lc-form-field label="Pièces jointes" hint="Trois fichiers au plus, 10 Mo chacun." [errors]="errors">
          <lc-file-upload accept="image/*,.pdf" multiple [maxFiles]="3" [items]="items" />
        </lc-form-field>
      </div>`,
  }),
};

/** Simulated upload: choose or drop files (a name containing "erreur" fails, to try "Réessayer"). */
export const Interactive: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<div style="max-width:36rem"><lc-file-upload-demo /></div>` }),
};
