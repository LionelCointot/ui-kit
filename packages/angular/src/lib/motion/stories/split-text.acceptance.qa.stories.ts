import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcSplitTextDirective } from '@lionelcointot/ui-angular';
import { LcPageComponent } from '@lionelcointot/ui-angular/layout';

/**
 * Support de CA-16 (et de CA-3 pour le texte non découpé) de la spec 2026-12-mouvement-v2 (tâche T6) ;
 * piloté par `node tools/qa/split-text-browser.mjs`.
 * Les textes sont ceux des cas de graphèmes de la spec : e + accent combinant, emoji famille, drapeau.
 */
@Component({
  selector: 'lc-qa-split-text',
  imports: [LcSplitTextDirective],
  template: `
    <button id="change" type="button" (click)="text.set('Rapports')">Changer</button>
    <h1 id="t" [lcSplitText]="text()" style="font-size:2rem">x</h1>
    <p id="g-accent" [lcSplitText]="accent"></p>
    <p id="g-family" [lcSplitText]="family"></p>
    <p id="g-flag" [lcSplitText]="flag"></p>
    <p id="g-words" [lcSplitText]="'Un deux trois'"></p>
  `,
})
class QaSplitTextComponent {
  protected readonly text = signal('Projets');
  protected readonly accent = 'Cafe\u0301';
  protected readonly family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}';
  protected readonly flag = '\u{1F1EB}\u{1F1F7}';
}

@Component({
  selector: 'lc-qa-split-page',
  imports: [LcPageComponent],
  template: `
    <button id="change" type="button" (click)="title.set('Rapports')">Changer</button>
    <lc-page [title]="title()" description="Tous les projets de votre équipe."><p>Contenu.</p></lc-page>
  `,
})
class QaSplitPageComponent {
  protected readonly title = signal('Projets');
}

const meta: Meta = {
  title: 'QA/Motion/Split text acceptance',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaSplitTextComponent, QaSplitPageComponent] })],
};
export default meta;
type Story = StoryObj;

/** `#t` (h1, « Projets » puis « Rapports » via `#change`), `#g-accent`, `#g-family`, `#g-flag`, `#g-words`. */
export const Text: Story = { render: () => ({ template: '<lc-qa-split-text />' }) };
/** `lc-page` « Projets » ; `#change` passe le titre à « Rapports ». */
export const Page: Story = { render: () => ({ template: '<lc-qa-split-page />' }) };
