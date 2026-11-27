import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcCountUpDirective, LcFlashDirective } from '@lionelcointot/ui-angular';

/**
 * Support des critères CA-3, CA-5, CA-14 et CA-15 de la spec 2026-12-mouvement-v2 (tâche T5) ;
 * piloté par `node tools/qa/count-flash-browser.mjs` (titre QA/Motion/Count flash acceptance).
 */

/** Compteurs : `#show` crée la zone `@if`, `#hide` la détruit (CA-14 : rAF annulé), `#to-1850` change la valeur (1200 → 1850). */
@Component({
  selector: 'lc-qa-count-up',
  imports: [LcCountUpDirective],
  template: `
    <button id="show" type="button" (click)="shown.set(true)">Afficher</button>
    <button id="hide" type="button" (click)="shown.set(false)">Retirer</button>
    <button id="to-1850" type="button" (click)="value.set(1850)">Passer à 1850</button>
    @if (shown()) {
      <div id="zone">
        <p id="live" aria-live="polite">Total : <span id="cu" data-sample [lcCountUp]="value()"></span></p>
        <p>Entier : <span id="cu-int" [lcCountUp]="value()" lcCountUpFormat="integer"></span></p>
        <p>Pourcentage : <span id="cu-pct" [lcCountUp]="12" lcCountUpFormat="percent"></span></p>
        <p>Montant : <span id="cu-money" [lcCountUp]="value()" lcCountUpFormat="money"></span></p>
        <p>Fonction : <span id="cu-fn" [lcCountUp]="value()" [lcCountUpFormat]="fmt"></span></p>
      </div>
    }
  `,
})
class QaCountUpComponent {
  protected readonly shown = signal(false);
  protected readonly value = signal(1200);
  protected readonly fmt = (v: unknown) => `#${v}`;
}

/** Flash : `#show` crée `#fl` (première valeur : aucun flash), `#bump` change la valeur, `#same` réécrit la même valeur (aucun changement). */
@Component({
  selector: 'lc-qa-flash',
  imports: [LcFlashDirective],
  template: `
    <button id="show" type="button" (click)="shown.set(true)">Afficher</button>
    <button id="bump" type="button" (click)="value.set(value() + 1)">Changer</button>
    <button id="same" type="button" (click)="value.set(value())">Même valeur</button>
    @if (shown()) {
      <p id="wrap" style="color: rgb(10, 20, 30)">Valeur : <span id="fl" [lcFlash]="value()">{{ value() }}</span></p>
    }
  `,
})
class QaFlashComponent {
  protected readonly shown = signal(false);
  protected readonly value = signal(72);
}

const meta: Meta = {
  title: 'QA/Motion/Count flash acceptance',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaCountUpComponent, QaFlashComponent] })],
};
export default meta;
type Story = StoryObj;

export const Count: Story = { render: () => ({ template: '<lc-qa-count-up />' }) };
export const Flash: Story = { render: () => ({ template: '<lc-qa-flash />' }) };
