import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFlipDirective, LcRevealDirective } from '@lionelcointot/ui-angular';

/**
 * Support de CA-3, CA-17 et CA-18 de la spec 2026-12-mouvement-v2 (tâche T7) ; piloté par `node tools/qa/flip-browser.mjs`.
 * Contrat de la story (lu par le harnais) : paramètres d'URL `n` (nombre de lignes, 8 par défaut) et `reveal` (`1` : les lignes portent aussi `lcReveal`) ;
 * `#list` porte `lcFlip` et contient les `.row[data-k]` de 36 px, clés 1 à n ; boutons `#reverse`, `#filter` (clés paires), `#prepend` (1000, puis 1001…), `#shuffle` (graine fixe), `#all` (inverse, filtre et ajoute en une fois).
 * Les listes sont immuables : chaque action pose un nouveau tableau.
 */
const param = (name: string): string | null => new URLSearchParams(globalThis.location?.search).get(name);

@Component({
  selector: 'lc-qa-flip',
  imports: [LcFlipDirective, LcRevealDirective],
  styles: `
    .row { box-sizing: border-box; block-size: 36px; border-block-end: 1px solid currentColor; }
    #list { margin: 0; padding: 0; }
  `,
  template: `
    <button id="reverse" type="button" (click)="keys.set(reversed())">Inverser</button>
    <button id="filter" type="button" (click)="keys.set(evens())">Filtrer</button>
    <button id="prepend" type="button" (click)="keys.set(prepended())">Ajouter en tête</button>
    <button id="shuffle" type="button" (click)="keys.set(shuffled())">Mélanger</button>
    <button id="all" type="button" (click)="keys.set(everything())">Tout à la fois</button>
    <div id="list" [lcFlip]="keys()">
      @for (k of keys(); track k) {
        <div class="row" [attr.data-k]="k" [lcReveal]="reveal ? 'rise' : null">Ligne {{ k }}</div>
      }
    </div>
  `,
})
class QaFlipComponent {
  protected readonly reveal = param('reveal') === '1';
  protected readonly keys = signal<readonly number[]>(Array.from({ length: Number(param('n') ?? 8) || 8 }, (_, i) => i + 1));
  private next = 1000;
  protected reversed = () => [...this.keys()].reverse();
  protected evens = () => this.keys().filter((k) => k % 2 === 0);
  protected prepended = () => [this.next++, ...this.keys()];
  protected everything = () => [this.next++, ...this.evens().reverse()];
  /** Mélange de Fisher-Yates à graine fixe (générateur congruentiel), reproductible. */
  protected shuffled = () => {
    const list = [...this.keys()];
    let seed = 42;
    for (let i = list.length - 1; i > 0; i -= 1) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const j = seed % (i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
}

const meta: Meta = {
  title: 'QA/Motion/Flip acceptance',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaFlipComponent] })],
  render: () => ({ template: '<lc-qa-flip />' }),
};
export default meta;

export const Flip: StoryObj = {};
