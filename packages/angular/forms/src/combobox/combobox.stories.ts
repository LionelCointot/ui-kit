import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcComboboxOptionDirective } from './combobox-option.directive';
import { LcComboboxComponent } from './combobox.component';
import { LcHighlightComponent } from './highlight.component';

interface City {
  readonly id: string;
  readonly name: string;
  readonly country: string;
}

const CITIES: readonly City[] = [
  { id: 'ams', name: 'Amsterdam', country: 'Pays-Bas' },
  { id: 'ber', name: 'Berlin', country: 'Allemagne' },
  { id: 'bru', name: 'Bruxelles', country: 'Belgique' },
  { id: 'cph', name: 'Copenhague', country: 'Danemark' },
  { id: 'dub', name: 'Dublin', country: 'Irlande' },
  { id: 'lis', name: 'Lisbonne', country: 'Portugal' },
  { id: 'mad', name: 'Madrid', country: 'Espagne' },
  { id: 'par', name: 'Paris', country: 'France' },
  { id: 'rom', name: 'Rome', country: 'Italie' },
  { id: 'vie', name: 'Vienne', country: 'Autriche' },
  { id: 'zur', name: 'Zurich', country: 'Suisse' },
];

const display = (city: City) => city.name;
const trackBy = (city: City) => city.id;

const meta: Meta<LcComboboxComponent<City>> = {
  title: 'Forms/Combobox',
  component: LcComboboxComponent,
  decorators: [moduleMetadata({ imports: [LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent, LcFormFieldComponent] })],
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    fillMode: { control: 'inline-radio', options: ['solid', 'outline', 'flat'] },
    rounded: { control: 'select', options: ['none', 'small', 'medium', 'large', 'full'] },
  },
  args: { placeholder: 'Rechercher une ville', clearable: true, disabled: false, readonly: false },
};
export default meta;
type Story = StoryObj<LcComboboxComponent<City>>;

/** Mode local : la liste est filtrée en mémoire, sans accents ni casse ; la meilleure proposition est en tête. */
export const Local: Story = {
  render: (args) => ({
    props: { ...args, cities: CITIES, display, trackBy, city: signal<City | null>(null) },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Ville" hint="Tapez « ro » ou « zu » ; Bas ouvre la liste, Entrée choisit, Échap ferme.">
          <lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city"
            [placeholder]="placeholder" [clearable]="clearable" [size]="size" [fillMode]="fillMode" [rounded]="rounded"
            [disabled]="disabled" [readonly]="readonly" />
        </lc-form-field>
        <p style="margin-top:1rem">Valeur : {{ city()?.name ?? 'aucune' }}</p>
      </div>`,
  }),
};

/** Gabarit d'option : nom surligné et pays en texte secondaire. */
export const GabaritDOption: Story = {
  render: () => ({
    props: { cities: CITIES, display, trackBy, city: signal<City | null>(CITIES[7]) },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Ville">
          <lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city">
            <ng-template lcComboboxOption [lcComboboxOptionOf]="cities" let-item let-text="text">
              <span><span [lcHighlight]="item.name" [lcHighlightTerm]="text"></span>
                <span class="lc-combobox-panel__secondary"> · {{ item.country }}</span></span>
            </ng-template>
          </lc-combobox>
        </lc-form-field>
      </div>`,
  }),
};

export const Etats: Story = {
  render: () => ({
    props: { cities: CITIES, display, trackBy, city: signal<City | null>(CITIES[1]) },
    template: `
      <div style="display:grid;gap:16px;max-width:24rem">
        <lc-form-field label="Normal"><lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" /></lc-form-field>
        <lc-form-field label="Désactivé"><lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" disabled /></lc-form-field>
        <lc-form-field label="Lecture seule"><lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" readonly /></lc-form-field>
        <lc-form-field label="Invalide" [errors]="['Choisissez une ville']"><lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [value]="null" /></lc-form-field>
      </div>`,
  }),
};

type RemoteMode = 'ok' | 'empty' | 'error';

/** Faux serveur de 300 ms : annulable, avec un mode vide et un mode erreur. */
function fakeSearch(mode: () => RemoteMode): (text: string, signal: AbortSignal) => Promise<readonly City[]> {
  return (text, signal) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (mode() === 'error') return reject(new Error('Réseau indisponible'));
        if (mode() === 'empty') return resolve([]);
        const needle = text.toLowerCase();
        resolve(CITIES.filter((city) => city.name.toLowerCase().includes(needle)));
      }, 300);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Annulée', 'AbortError'));
      });
    });
}

/** Mode asynchrone : anti-rebond de 200 ms, annulation de la recherche précédente, annonce du nombre de résultats. */
export const Asynchrone: Story = {
  render: () => ({
    props: { display, trackBy, city: signal<City | null>(null), search: fakeSearch(() => 'ok') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Ville (recherche distante)" hint="Tapez au moins 2 lettres, par exemple « ro ».">
          <lc-combobox [search]="search" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" placeholder="Rechercher une ville" />
        </lc-form-field>
        <p style="margin-top:1rem">Valeur : {{ city()?.name ?? 'aucune' }}</p>
      </div>`,
  }),
};

export const AsynchroneVide: Story = {
  render: () => ({
    props: { display, trackBy, city: signal<City | null>(null), search: fakeSearch(() => 'empty') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Ville"><lc-combobox [search]="search" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" /></lc-form-field>
      </div>`,
  }),
};

export const AsynchroneErreur: Story = {
  render: () => ({
    props: { display, trackBy, city: signal<City | null>(null), search: fakeSearch(() => 'error') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Ville" hint="La recherche échoue : état d'erreur et « Réessayer ».">
          <lc-combobox [search]="search" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" />
        </lc-form-field>
      </div>`,
  }),
};
