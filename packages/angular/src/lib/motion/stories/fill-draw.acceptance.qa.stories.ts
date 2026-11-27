import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDrawDirective, LcFillDirective } from '@lionelcointot/ui-angular';

/**
 * Support des critères CA-12, CA-13 et CA-30 de la spec 2026-12-mouvement-v2 (tâche T4) ;
 * piloté par `node tools/qa/fill-draw-browser.mjs`.
 */

/** `lcFill` et `lcDraw` : un exemplaire présent au chargement (`*-static`, valeur 0,7), les autres montés par `#show` ; `#low` (0,3), `#zero` (0) changent la valeur de tous. */
@Component({
  selector: 'lc-qa-fill-draw',
  imports: [LcFillDirective, LcDrawDirective],
  template: `
    <button id="show" type="button" (click)="shown.set(true)">Afficher</button>
    <button id="low" type="button" (click)="value.set(0.3)">0,3</button>
    <button id="zero" type="button" (click)="value.set(0)">0</button>
    <div id="fill-static" [lcFill]="0.7" style="inline-size:200px;block-size:12px;background:currentColor"></div>
    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" stroke="currentColor" stroke-width="4">
      <path id="draw-static" [lcDraw]="0.7" d="M4 20 H116" />
    </svg>
    @if (shown()) {
      <div id="fill-x" [lcFill]="value()" style="inline-size:200px;block-size:12px;background:currentColor"></div>
      <div id="fill-y" [lcFill]="value()" lcFillAxis="y" style="inline-size:12px;block-size:100px;background:currentColor"></div>
      <svg width="240" height="60" viewBox="0 0 240 60" fill="none" stroke="currentColor" stroke-width="4">
        <path id="draw-path" [lcDraw]="value()" d="M4 20 H60" />
        <circle id="draw-circle" [lcDraw]="value()" cx="100" cy="30" r="20" />
        <line id="draw-line" [lcDraw]="value()" x1="140" y1="10" x2="180" y2="50" />
        <polyline id="draw-polyline" [lcDraw]="value()" points="190,50 210,10 230,50" />
      </svg>
    }
  `,
})
class QaFillDrawComponent {
  protected readonly shown = signal(false);
  protected readonly value = signal(0.7);
}

/** `.lc-pulse` et `.lc-lift` : classes CSS seules, sans directive. */
@Component({
  selector: 'lc-qa-pulse-lift',
  template: `
    <span id="pulse" class="lc-pulse" style="display:inline-block;inline-size:12px;block-size:12px;border-radius:50%;background:currentColor"></span>
    <div id="lift" class="lc-lift" style="inline-size:160px;block-size:80px;margin:24px;border:1px solid currentColor">Carte</div>
  `,
})
class QaPulseLiftComponent {}

const meta: Meta = {
  title: 'QA/Motion/Fill draw acceptance',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaFillDrawComponent, QaPulseLiftComponent] })],
};
export default meta;
type Story = StoryObj;

export const FillDraw: Story = { render: () => ({ template: '<lc-qa-fill-draw />' }) };
export const PulseLift: Story = { render: () => ({ template: '<lc-qa-pulse-lift />' }) };
