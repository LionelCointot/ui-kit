import { Component, NO_ERRORS_SCHEMA, input, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcRevealDirective, LcStaggerDirective } from '@lionelcointot/ui-angular';

/**
 * Support des critères CA-3, CA-7, CA-8, CA-9, CA-10 et CA-11 de la spec 2026-12-mouvement-v2 (tâche T3) ;
 * piloté par `node tools/qa/reveal-browser.mjs` et la commande `motion` de `tools/qa/storybook-browser.mjs`.
 * Les attributs `lcReveal` (vide) et `lcReveal="rise"` sont écrits tels quels : la compilation `strictTemplates` de Storybook prouve la partie AOT de CA-8.
 */

/** Rangs imposés par `lcRevealIndex` (le 11 dépasse le plafond de 8 rangs). */
const INDEXES = [5, 0, 2, 11];

@Component({
  selector: 'lc-qa-reveal-lists',
  imports: [LcRevealDirective],
  template: `
    <button id="toggle" type="button" (click)="shown.set(!shown())">Basculer</button>
    <button id="remove" type="button" (click)="items.set(without(2))">Retirer 2</button>
    <button id="reverse" type="button" (click)="items.set(reversed())">Inverser</button>
    <button id="append" type="button" (click)="items.set(appended())">Ajouter à la fin</button>
    <button id="prepend" type="button" (click)="items.set(prepended())">Ajouter en tête</button>
    @if (shown()) {
      <p id="if-block" lcReveal="rise">Bloc</p>
    }
    <ul id="list">
      @for (item of items(); track item) {
        <li lcReveal [attr.data-id]="item">Ligne {{ item }}</li>
      }
    </ul>
  `,
})
class QaRevealListsComponent {
  protected readonly shown = signal(true);
  protected readonly items = signal([1, 2, 3, 4, 5, 6, 7]);
  private next = 8;
  protected without = (id: number) => this.items().filter((i) => i !== id);
  protected reversed = () => [...this.items()].reverse();
  protected appended = () => [...this.items(), this.next++];
  protected prepended = () => [this.next++, ...this.items()];
}

@Component({
  selector: 'lc-qa-reveal-variants',
  imports: [LcRevealDirective, LcStaggerDirective],
  template: `
    <button id="show" type="button" (click)="shown.set(true)">Afficher</button>
    @if (shown()) {
      <div style="display:flex;flex-wrap:wrap;gap:16px;padding:48px">
        <div id="v-rise" class="qa-box" lcReveal="rise">rise</div>
        <div id="v-default" class="qa-box" lcReveal>défaut</div>
        <div id="v-drop" class="qa-box" lcReveal="drop">drop</div>
        <div id="v-fade" class="qa-box" lcReveal="fade">fade</div>
        <div id="v-scale" class="qa-box" lcReveal="scale">scale</div>
        <div id="v-pop" class="qa-box" lcReveal="pop">pop</div>
        <div id="v-left" class="qa-box" lcReveal="left">left</div>
        <div id="v-right" class="qa-box" lcReveal="right">right</div>
        <div lcStagger="cards" style="display:flex;gap:16px">
          <div id="v-tilt-1" class="qa-box" lcReveal="tilt">tilt 1</div>
          <div id="v-tilt-2" class="qa-box" lcReveal="tilt">tilt 2</div>
        </div>
      </div>
    }
  `,
  styles: ['.qa-box { inline-size: 80px; block-size: 40px; background: currentColor; color: #888 }'],
})
class QaRevealVariantsComponent {
  protected readonly shown = signal(false);
}

/** Éléments `lcReveal` placés dans un composant enfant du `lcStagger` (CA-11). */
@Component({
  selector: 'lc-qa-items',
  imports: [LcRevealDirective],
  template: `@for (i of range(); track i) {
    <p lcReveal [attr.data-i]="i">Élément {{ i }}</p>
  }`,
})
class QaItemsComponent {
  readonly count = input(10);
  protected range() {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}

/** Seul composant qui lie `lcRevealIndex` : `NO_ERRORS_SCHEMA` laisse la story compiler avant que la directive existe ; une fois elle écrite, les types de ses entrées restent vérifiés. */
@Component({
  selector: 'lc-qa-index',
  imports: [LcRevealDirective, LcStaggerDirective],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <section id="s-index" lcStagger>
      @for (i of indexes; track i) {
        <p lcReveal [lcRevealIndex]="i" [attr.data-i]="i">Rang {{ i }}</p>
      }
    </section>
    <section id="s-index-alone">
      <p lcReveal [lcRevealIndex]="3" data-i="3">Rang 3 sans lcStagger</p>
    </section>
  `,
})
class QaIndexComponent {
  protected readonly indexes = INDEXES;
}

@Component({
  selector: 'lc-qa-reveal-stagger',
  imports: [LcStaggerDirective, QaItemsComponent, QaIndexComponent],
  template: `
    <button id="show" type="button" (click)="shown.set(true)">Afficher</button>
    <button id="add" type="button" (click)="normalCount.set(normalCount() + 1)">Ajouter un élément</button>
    @if (shown()) {
      <section id="s-normal" lcStagger><lc-qa-items [count]="normalCount()" /></section>
      <section id="s-default" lcStagger=""><lc-qa-items [count]="3" /></section>
      <section id="s-fine" lcStagger="fine"><lc-qa-items [count]="10" /></section>
      <section id="s-cards" lcStagger="cards"><lc-qa-items [count]="10" /></section>
      <lc-qa-index />
    }
  `,
})
class QaRevealStaggerComponent {
  protected readonly shown = signal(false);
  protected readonly normalCount = signal(12);
}

/** 500 éléments sous un seul `lcStagger` (CA-11, borne de durée totale). */
@Component({
  selector: 'lc-qa-reveal-many',
  imports: [LcRevealDirective, LcStaggerDirective],
  template: `<div id="many" lcStagger>
    @for (i of range; track i) {
      <span lcReveal [attr.data-i]="i">{{ i }}</span>
    }
  </div>`,
})
class QaRevealManyComponent {
  protected readonly range = Array.from({ length: 500 }, (_, i) => i);
}

/** Élément dont l'animation est neutralisée : équivalent navigateur d'un rendu serveur (CA-10, aucune animation ne tourne au premier rendu). */
@Component({
  selector: 'lc-qa-reveal-quiet',
  imports: [LcRevealDirective],
  template: `<p id="quiet" lcReveal style="animation: none">Déjà affiché</p>`,
})
class QaRevealQuietComponent {}

const meta: Meta = {
  title: 'QA/Motion/Reveal acceptance',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaRevealListsComponent, QaRevealVariantsComponent, QaRevealStaggerComponent, QaRevealManyComponent, QaRevealQuietComponent] })],
};
export default meta;
type Story = StoryObj;

export const Lists: Story = { render: () => ({ template: '<lc-qa-reveal-lists />' }) };
export const Variants: Story = { render: () => ({ template: '<lc-qa-reveal-variants />' }) };
export const Stagger: Story = { render: () => ({ template: '<lc-qa-reveal-stagger />' }) };
export const Many: Story = { render: () => ({ template: '<lc-qa-reveal-many />' }) };
export const Quiet: Story = { render: () => ({ template: '<lc-qa-reveal-quiet />' }) };
