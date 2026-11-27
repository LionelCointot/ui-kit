import { Directive, ElementRef, PLATFORM_ID, effect, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { lcSplitGraphemes } from '../runtime/split-text';
import { lcPrefersReducedMotion } from '../runtime/reduced-motion';

/**
 * Affiche le texte lettre par lettre : les lettres montent depuis un masque, l'une après l'autre (le CSS vit dans `motion.css`).
 * La directive possède le contenu de l'hôte. L'hôte porte `aria-label` = texte complet et les lettres sont `aria-hidden`.
 * Au rendu serveur et sous mouvement réduit, le texte reste brut (aucun `span`).
 */
@Directive({ selector: '[lcSplitText]' })
export class LcSplitTextDirective {
  readonly lcSplitText = input.required<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    effect(() => {
      const text = this.lcSplitText();
      // shortcut: préférence de mouvement réduit lue à chaque changement de texte, pas en continu (le CSS coupe déjà l'animation) ; à lever si un cas réel l'exige.
      const split = this.browser && !lcPrefersReducedMotion() && typeof Intl.Segmenter === 'function';
      if (!split) {
        this.host.textContent = text;
        this.host.removeAttribute('aria-label');
        return;
      }
      this.host.setAttribute('aria-label', text);
      this.host.replaceChildren(...this.build(text));
    });
  }

  private build(text: string): Node[] {
    const doc = this.host.ownerDocument;
    let rank = 0;
    return lcSplitGraphemes(text, new Intl.Segmenter(undefined, { granularity: 'grapheme' })).map((part) => {
      if ('space' in part) return doc.createTextNode(part.space);
      const word = doc.createElement('span');
      word.className = 'lc-split-word';
      word.append(
        ...part.word.map((grapheme) => {
          const letter = doc.createElement('span');
          letter.className = 'lc-split-char';
          letter.setAttribute('aria-hidden', 'true');
          letter.style.setProperty('--lc-split-rank', String(rank++));
          letter.textContent = grapheme;
          return letter;
        }),
      );
      return word;
    });
  }
}
