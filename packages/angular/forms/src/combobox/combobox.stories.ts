import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, commonArgTypes, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent, LcComboboxOptionDirective, LcComboboxComponent, LcHighlightComponent } from '@lionelcointot/ui-angular/forms';

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

/**
 * Search field with a suggestion list (WAI-ARIA combobox). Two modes: local (`options`, filtered in memory without accents or case)
 * and asynchronous (`search`, debounced and cancellable). The selected item is the `value`; `displayWith` and `trackBy` are required.
 *
 * Import: `import { LcComboboxComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcComboboxComponent<City>> = {
  title: 'Forms/Combobox',
  component: LcComboboxComponent,
  decorators: [moduleMetadata({ imports: [LcComboboxComponent, LcComboboxOptionDirective, LcHighlightComponent, LcFormFieldComponent, LcButtonComponent, StoryMotionNoticeComponent] })],
  args: {
    placeholder: 'Rechercher une ville', clearable: true, disabled: false, readonly: false, required: false, invalid: false, touched: false,
    size: 'medium', fillMode: 'solid', rounded: 'medium', maxResults: 50, minLength: 0, openOnFocus: true,
  },
  argTypes: {
    size: commonArgTypes.size,
    fillMode: commonArgTypes.fillMode,
    rounded: commonArgTypes.rounded,
    openOnFocus: { control: 'boolean' },
    minLength: { control: 'number' },
    maxResults: { control: 'number' },
    debounceMs: { table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<LcComboboxComponent<City>>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['minLength', 'maxResults', 'clearable', 'invalid', 'touched'] } },
  render: (args) => ({
    props: { ...args, cities: CITIES, display, trackBy, city: signal<City | null>(null) },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Ville" hint="Tapez « ro » ou « zu » ; Bas ouvre la liste, Entrée choisit, Échap ferme.">
          <lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city"
            [placeholder]="placeholder" [clearable]="clearable" [size]="size" [fillMode]="fillMode" [rounded]="rounded"
            [disabled]="disabled" [readonly]="readonly" [required]="required" [invalid]="invalid" [touched]="touched"
            [minLength]="minLength" [maxResults]="maxResults" [openOnFocus]="openOnFocus" />
        </lc-form-field>
        <p style="margin-top:1rem">Valeur : {{ city()?.name ?? 'aucune' }}</p>
      </div>`,
  }),
};

/** Option template: highlighted name and the country as secondary text. */
export const OptionTemplate: Story = {
  parameters: fixedExample,
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

/** Normal, disabled, read-only and invalid fields side by side. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { cities: CITIES, display, trackBy, city: signal<City | null>(CITIES[1]) },
    template: `
      <div style="display:grid;gap:var(--lc-sys-space-4);max-width:24rem">
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

/** Async mode: 200 ms debounce, cancellation of the previous search, result count announced. */
export const Async: Story = {
  parameters: fixedExample,
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

/** Async mode where the server returns no result. */
export const AsyncEmpty: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { display, trackBy, city: signal<City | null>(null), search: fakeSearch(() => 'empty') },
    template: `
      <div style="max-width:24rem">
        <lc-form-field label="Ville"><lc-combobox [search]="search" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" /></lc-form-field>
      </div>`,
  }),
};

/** Async mode where the search fails: error state with a retry action. */
export const AsyncError: Story = {
  parameters: fixedExample,
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

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcComboboxComponent, LcFormFieldComponent } from '@lionelcointot/ui-angular/forms';

@Component({
  selector: 'app-example',
  imports: [LcComboboxComponent, LcFormFieldComponent],
  template: \`
    <lc-form-field label="Ville">
      <lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" />
    </lc-form-field>\`,
})
export class ExampleComponent {
  readonly cities = ['Amsterdam', 'Berlin', 'Bruxelles', 'Copenhague'];
  readonly city = signal<string | null>(null);
  readonly display = (city: string) => city;
  readonly trackBy = (city: string) => city;
}`;

/** The suggestion list fades in while moving down from the field, and fades out when it closes. "Rejouer" reopens it. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({
    props: { cities: CITIES, display, trackBy, city: signal<City | null>(null), ...replayable({ play: (_later, root) => root.querySelector<HTMLElement>('input')?.click() }) },
    template: `
      <lc-story-motion-notice />
      <div #root style="max-width:24rem;min-height:20rem">
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="replay(root)">Rejouer</button>
        @for (key of keys(); track key) {
          <lc-form-field label="Ville">
            <lc-combobox [options]="cities" [displayWith]="display" [trackBy]="trackBy" [(value)]="city" placeholder="Rechercher une ville" />
          </lc-form-field>
        }
      </div>`,
  }),
};
