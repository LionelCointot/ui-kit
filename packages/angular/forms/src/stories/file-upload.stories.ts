import { Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
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

const DONE: LcFileUploadItem = { id: 'done', name: 'rapport-trimestriel.pdf', size: 2_300_000, status: 'done' };
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

const meta: Meta<LcFileUploadComponent> = {
  title: 'Formulaires/Dépôt de fichiers',
  component: LcFileUploadComponent,
  decorators: [moduleMetadata({ imports: [LcFileUploadComponent, LcFormFieldComponent, FileUploadDemoComponent] })],
  args: {
    items: [], accept: '', multiple: true, maxFiles: null, disabled: false, ariaLabel: 'Pièces jointes',
    showSize: true, chooseIcon: 'upload', errorPlaceholderIcon: 'file-text', fullWidthMobile: false, removeLabelVisible: false,
  },
  argTypes: { maxFiles: { control: 'number' } },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width:36rem">
        <lc-file-upload [items]="items" [accept]="accept" [multiple]="multiple" [maxFiles]="maxFiles"
          [disabled]="disabled" [ariaLabel]="ariaLabel" [showSize]="showSize" [chooseIcon]="chooseIcon"
          [errorPlaceholderIcon]="errorPlaceholderIcon" [fullWidthMobile]="fullWidthMobile" [removeLabelVisible]="removeLabelVisible" />
      </div>`,
  }),
};
export default meta;
type Story = StoryObj<LcFileUploadComponent>;

/** Aucun fichier : le bouton et la zone de dépôt (la zone apparaît à partir de 768 px). */
export const Vide: Story = {};

export const UnFichierEnCours: Story = { args: { items: [UPLOADING] } };

/** Les quatre états dans une même liste : terminé, en cours, en attente, en erreur. */
export const EtatsMeles: Story = { args: { items: [DONE, UPLOADING, PENDING, FAILED] } };

/** En erreur : le message est annoncé, « Réessayer » et « Retirer » sont deux arrêts de tabulation. */
export const ErreurAvecReessayer: Story = { args: { items: [FAILED] } };

/** Maximum atteint : le bouton est inactif (`aria-disabled`, toujours atteignable au clavier) et le texte le dit. */
export const MaximumAtteint: Story = { args: { items: [DONE, PENDING, FAILED], maxFiles: 3 } };

export const Desactive: Story = { args: { items: [DONE, UPLOADING], disabled: true } };

export const NomsTresLongs: Story = {
  args: {
    items: [
      { id: 'l1', name: 'compte-rendu-de-la-reunion-de-coordination-du-premier-trimestre-version-finale-corrigee-et-relue.pdf', size: 1_250_000, status: 'done' },
      { id: 'l2', name: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', size: 980, status: 'pending' },
      { id: 'l3', name: 'image-avec-un-nom-vraiment-tres-long-pour-verifier-la-coupure.png', size: 8_100_000, status: 'error', errorMessage: 'Le format de ce fichier n\'est pas pris en charge, merci d\'en choisir un autre.' },
    ],
  },
};

/** `showSize` à faux : la ligne ne garde que l'état, sans poids. */
export const SansPoids: Story = { args: { items: [DONE, UPLOADING, PENDING], showSize: false } };

/** `retryable: false` : la ligne en erreur n'a que « Retirer » (l'envoi ne peut pas être refait tel quel). */
export const ErreurNonReessayable: Story = { args: { items: [{ ...FAILED, retryable: false }] } };

/** `chooseIcon` et `errorPlaceholderIcon` : icônes du kit (`image-plus`, `image-off`) pour des photos. */
export const IconesPersonnalisees: Story = {
  args: {
    items: [{ id: 'bad', name: 'IMG_0042.jpg', size: 3_100_000, status: 'error', errorMessage: 'Ce fichier n\'est pas une photo.' }],
    accept: 'image/*', chooseIcon: 'image-plus', errorPlaceholderIcon: 'image-off',
  },
};

/** `removeLabelVisible` : le retrait est un bouton « Retirer » (nom accessible inchangé : « Retirer {nom} »). */
export const RetraitAvecMot: Story = { args: { items: [DONE, FAILED], removeLabelVisible: true } };

/** `fullWidthMobile` : sous 480 px de largeur disponible (ici 400 px, même sur un grand écran), le bouton prend toute la largeur. */
export const BoutonPleineLargeur: Story = {
  args: { fullWidthMobile: true },
  render: (args) => ({
    props: args,
    template: `<div style="max-width:400px"><lc-file-upload [items]="items" ariaLabel="Photos" [fullWidthMobile]="fullWidthMobile" /></div>`,
  }),
};

/** Étroit (360 px) : photos sans poids, erreurs non réessayables, mot « Retirer » visible, message d'erreur en pleine largeur sous la vignette. */
export const PhotosSansPoidsErreursNonReessayables360: Story = {
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
      <div style="max-width:360px;border:1px dashed #888;padding:8px">
        <lc-form-field label="Photos" hint="Ajoutez des photos du problème." hintPlacement="above">
          <lc-file-upload accept="image/*" multiple [items]="items" [showSize]="false" chooseIcon="image-plus"
            errorPlaceholderIcon="image-off" [fullWidthMobile]="true" [removeLabelVisible]="true" />
        </lc-form-field>
      </div>`,
  }),
};

/** Dans `lc-form-field` : le libellé nomme le groupe, l'aide et l'erreur lui sont reliées (`aria-describedby`). */
export const DansUnChamp: Story = {
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

/** Dépôt simulé : choisissez ou déposez des fichiers (un nom contenant « erreur » échoue pour essayer « Réessayer »). */
export const Interactif: Story = {
  render: () => ({ template: `<div style="max-width:36rem"><lc-file-upload-demo /></div>` }),
};
