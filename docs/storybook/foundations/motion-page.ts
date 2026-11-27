import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { StoryMotionNoticeComponent, prefersReducedMotion, replayable } from '@lc/storybook';
import {
  LcButtonComponent,
  LcCountUpDirective,
  LcDrawDirective,
  LcFillDirective,
  LcFlashDirective,
  LcFlipDirective,
  LcRevealDirective,
  LcSplitTextDirective,
  LcStaggerDirective,
  lcAnimate,
  type LcMotionEasing,
} from '@lionelcointot/ui-angular';
import { PAGE_STYLES } from './foundation-pages';

/*
 * Page Foundations/Motion (spec 2026-12-mouvement-v2, §5.4.5). Texte en français (contenu de démo), identifiants en anglais.
 * Les durées affichées sont relues des tokens dans le navigateur : un réglage de thème se voit ici sans retoucher ce fichier.
 * Les démos des recettes (glisser-déposer, bouton magnétique) sont des gestes d'application, pas des composants du kit.
 */

type DemoId = 'reveal' | 'variants' | 'remove' | 'stagger' | 'countup' | 'flash' | 'fill' | 'draw' | 'split' | 'flip';

interface NeedRow { need: string; attr: string; effect: string; example: string; demo?: DemoId }

const NEEDS: readonly NeedRow[] = [
  { need: 'Un bloc apparaît', attr: 'lcReveal', effect: 'Il monte un peu et apparaît quand il s’affiche.', example: '<div lcReveal>…</div>', demo: 'reveal' },
  {
    need: 'Il apparaît autrement', attr: 'lcReveal="…"', demo: 'variants', example: '<div lcReveal="pop">',
    effect: '`rise` monte (par défaut), `drop` descend, `left` / `right` arrivent de côté, `pop` rebondit, `tilt` s’incline, `fade` apparaît sur place, `scale` grandit.',
  },
  {
    need: 'Un élément disparaît en douceur quand je le retire', attr: 'lcReveal', demo: 'remove',
    effect: 'Le même attribut le fait apparaître puis disparaître, qu’il soit retiré par un `@if` ou d’une liste `@for`.',
    example: '@for (c of cartes(); track c.id) { <div lcReveal>…</div> }',
  },
  {
    need: 'Des éléments apparaissent l’un après l’autre', attr: '`lcStagger` sur le parent, `lcReveal` sur chaque enfant', demo: 'stagger',
    effect: 'Dès qu’ils s’affichent, chacun arrive un peu après le précédent. Le parent peut être n’importe quel conteneur. Le rythme est le délai entre deux éléments : court (`lcStagger="fine"`, pour beaucoup de petits éléments), normal (sans valeur), long (`lcStagger="cards"`, pour des cartes).',
    example: '<section lcStagger><article lcReveal>…</article></section>',
  },
  {
    need: 'Un chiffre monte jusqu’à sa valeur', attr: 'lcCountUp', demo: 'countup',
    effect: 'À la première apparition il compte depuis 0 ; quand la valeur change, il compte de l’ancienne à la nouvelle (de 1 200 à 1 850). Le format s’ajoute avec `lcCountUpFormat` : `number` (par défaut, « 1 850,00 »), `integer` (« 1 850 »), `percent` (« 12 % »), `money` (« 1 850,00 € »).',
    example: '<span [lcCountUp]="total()" lcCountUpFormat="money"></span>',
  },
  {
    need: 'Un chiffre change et doit attirer l’œil', attr: 'lcFlash', demo: 'flash',
    effect: 'Le nombre ne défile pas : il brille un instant de la couleur d’accent quand il change.',
    example: '<span [lcFlash]="total()">{{ total() }}</span>',
  },
  {
    need: 'Une jauge ou une barre se remplit', attr: 'lcFill', demo: 'fill',
    effect: 'La valeur va de 0 (vide) à 1 (pleine) : 0.7 = 70 %. La barre part de vide à l’affichage puis suit la valeur. Vous lui donnez sa hauteur et sa couleur en CSS (sinon elle reste invisible), le kit anime le remplissage sur toute la largeur de son parent.',
    example: '<div class="ma-barre" [lcFill]="0.7"></div> avec .ma-barre { height: 8px; background: currentColor; }',
  },
  {
    need: 'Un trait, un anneau ou une courbe se dessine', attr: 'lcDraw', demo: 'draw',
    effect: 'Le tracé se dessine de 0 à la valeur (0 à 1), sur un `path`, `circle` ou `line` d’un SVG.',
    example: '<circle [lcDraw]="0.7" … />',
  },
  {
    need: 'Un titre apparaît lettre par lettre', attr: 'lcSplitText', demo: 'split',
    effect: 'Les lettres montent l’une après l’autre ; le titre reste lu en entier par un lecteur d’écran.',
    example: '<h1 [lcSplitText]="titre()"></h1>',
  },
  {
    need: 'Une liste se trie ou se filtre : les lignes glissent à leur place', attr: '`lcFlip` sur la liste', demo: 'flip',
    effect: 'Quand l’ordre ou le contenu change, les lignes qui restent glissent jusqu’à leur nouvelle place. Triez ou filtrez une copie de la liste, jamais la liste elle-même : sinon rien ne bouge.',
    example: '<ul [lcFlip]="lignes()"> et, pour trier, lignes.set([...lignes()].sort(parNom))',
  },
  { need: 'Une page en remplace une autre', attr: 'Rien', effect: '`lc-app-shell` s’en charge.', example: '—' },
  {
    need: 'Un mouvement que rien ne couvre (ressort, rebond)', attr: 'lcAnimate', example: "lcAnimate(el, …, { duration: 'move' })",
    effect: 'Pour les développeurs avancés : voir « Recettes » plus bas.',
  },
  {
    need: 'Changer la vitesse', attr: 'Une valeur dans votre thème', example: ':root { --lc-sys-duration-fill: 600ms; }',
    effect: 'Il y a un réglage par type de mouvement (apparitions, panneaux, jauges…), en millisecondes, à écrire dans le fichier de thème de votre application ou sur `:root` ; la liste complète de ces réglages, avec leur valeur de départ, est plus bas sur cette page (« Régler et couper »).',
  },
  {
    need: 'Un utilisateur a coupé les animations sur son appareil', attr: 'Rien', example: '—',
    effect: 'Tout s’affiche directement dans son état final, sans mouvement (le chiffre final, la barre remplie, les éléments visibles), y compris vos propres éléments animés (`lcReveal`, `lcFill`…).',
  },
];

interface CurveRow { key: LcMotionEasing; says: string; use: string }

const CURVES: readonly CurveRow[] = [
  { key: 'out', says: 'Part vite, finit très doucement.', use: 'Pour les apparitions (`lcReveal`).' },
  { key: 'entrance', says: 'Part très vite, se pose avec douceur.', use: 'Pour les cartes et les grands blocs qui entrent.' },
  { key: 'standard', says: 'Démarre et finit doucement.', use: 'Pour les changements discrets : survol, fondu.' },
  { key: 'fill', says: 'Monte vite, puis ralentit longuement.', use: 'Pour les barres et les jauges qui se remplissent.' },
  { key: 'title', says: 'Très rapide au début, finit lentement.', use: 'Pour les lettres d’un titre.' },
  { key: 'draw', says: 'Lente au début et à la fin, plus vive au milieu.', use: 'Pour les tracés et le glissement des lignes d’une liste.' },
  { key: 'inout', says: 'Symétrique et nette : démarre et finit à la même vitesse.', use: 'Pour les traits et les indicateurs qui se rattrapent.' },
  { key: 'pop', says: 'Dépasse sa place, puis revient.', use: 'Pour un petit rebond (`lcReveal="pop"`, fenêtre qui s’ouvre).' },
  { key: 'pop-strong', says: 'Dépasse davantage sa place, puis revient.', use: 'Pour une pastille ou un badge qu’on veut voir sauter.' },
  { key: 'exit', says: 'Démarre doucement, puis accélère.', use: 'Pour ce qui sort : on ne retient pas un élément qui part.' },
  { key: 'stack', says: 'Part vite, s’arrête net sans rebond.', use: 'Pour une page qui se pose sur la précédente (téléphone).' },
];

interface Setting { type: string; where: string; cssVar: string }

/** Un réglage par type de mouvement : la valeur de départ est lue dans le navigateur. */
const SETTINGS: readonly Setting[] = [
  { type: 'Clin d’œil (appui, petits fondus)', where: 'Boutons, bulles', cssVar: '--lc-sys-duration-fast' },
  { type: 'Disparition', where: 'Tout ce qui sort', cssVar: '--lc-sys-duration-exit' },
  { type: 'Panneau', where: 'Menus, panneaux, ouverture', cssVar: '--lc-sys-duration-normal' },
  { type: 'Apparition d’un bloc', where: '`lcReveal`', cssVar: '--lc-reveal-duration' },
  { type: 'Apparition d’une carte', where: '`lcReveal` sur une carte', cssVar: '--lc-reveal-card-duration' },
  { type: 'Apparition inclinée', where: '`lcReveal="tilt"`', cssVar: '--lc-reveal-tilt-duration' },
  { type: 'Déplacement', where: 'Panneaux qui glissent, indicateurs', cssVar: '--lc-sys-duration-move' },
  { type: 'Lignes qui glissent', where: '`lcFlip`, tableaux', cssVar: '--lc-list-move-duration' },
  { type: 'Page', where: '`lc-app-shell`, changement de page', cssVar: '--lc-sys-duration-view' },
  { type: 'Titre, lettre par lettre', where: '`lcSplitText`', cssVar: '--lc-title-letter-duration' },
  { type: 'Chiffre qui monte', where: '`lcCountUp`', cssVar: '--lc-count-up-duration' },
  { type: 'Jauge', where: '`lcFill`, barres', cssVar: '--lc-sys-duration-fill' },
  { type: 'Tracé', where: '`lcDraw`', cssVar: '--lc-sys-duration-draw' },
  { type: 'Retard entre deux éléments (court)', where: '`lcStagger="fine"`', cssVar: '--lc-sys-motion-stagger-fine' },
  { type: 'Retard entre deux éléments (normal)', where: '`lcStagger`', cssVar: '--lc-sys-motion-stagger-normal' },
  { type: 'Retard entre deux éléments (long)', where: '`lcStagger="cards"`', cssVar: '--lc-sys-motion-stagger-cards' },
];

const MOTION_OFF_CSS = `:root {
  --lc-sys-duration-fast: 0ms;
  --lc-sys-duration-exit: 0ms;
  --lc-sys-duration-normal: 0ms;
  --lc-sys-duration-move: 0ms;
  --lc-sys-duration-view: 0ms;
  --lc-sys-duration-fill: 0ms;
  --lc-sys-duration-draw: 0ms;
  --lc-reveal-duration: 0ms;
  --lc-count-up-duration: 0ms;
}`;

interface CurveTrace { path: string }
const CURVE_SAMPLES = 60;
/** Vue du tracé : le dépassement (courbes `pop`) sort au-dessus de 1, d'où la marge en haut. */
const TRACE_VIEW = '-4 -40 108 148';

const FEATURED_CARDS = ['Projet', 'Tâches', 'Équipe', 'Fichiers'];
const TASKS = ['Préparer la réunion', 'Relire le compte rendu', 'Envoyer les invitations', 'Mettre à jour le planning'];

// Recettes d'application : constantes du geste, pas du kit.
const SLOT_PX = 56;
const SLOTS = 5;
const GRAB_SCALE = 1.03;
const MAGNET_PX = 5;
const MAGNET_LERP = 0.18;
const MAGNET_REST_PX = 0.05;

/** Texte avec des passages `entre accents graves` rendus en code. */
@Component({
  selector: 'lc-doc-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (part of parts(); track $index) {@if ($odd) {<code>{{ part }}</code>} @else {<ng-container>{{ part }}</ng-container>}}`,
  styles: `code { font-family: var(--lc-sys-font-family-mono); font-size: var(--lc-sys-font-size-xs); }`,
})
class DocTextComponent {
  readonly text = input.required<string>();
  protected readonly parts = computed(() => this.text().split('`'));
}

/** Page Foundations/Motion : les attributs de mouvement un besoin à la fois, les courbes et les durées en mots, les réglages, les recettes. */
@Component({
  selector: 'lc-doc-motion',
  imports: [DocTextComponent, LcButtonComponent, LcRevealDirective, LcStaggerDirective, LcCountUpDirective, LcFlashDirective, LcFillDirective, LcDrawDirective, LcSplitTextDirective, LcFlipDirective, StoryMotionNoticeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Mouvement</h2>
    <p class="lead">Les composants du kit bougent déjà sans que vous fassiez rien. Cette page sert à animer vos propres éléments : un attribut par besoin.
      Chaque ligne a un bouton Rejouer : il sert seulement à revoir la démonstration sur cette page, vous n’avez rien à écrire pour lui.
      Les crochets <code>[…]</code> servent à donner une valeur qui change, par exemple <code>total()</code>, votre propre donnée.</p>
    <lc-story-motion-notice />

    <section class="auto" aria-labelledby="auto-title">
      <h3 id="auto-title">Ce qui est automatique</h3>
      <ul>
        <li><strong>Rien à écrire :</strong>&ngsp;<code>lc-app-shell</code> + <code>lc-page</code> + les composants du kit donnent tout le mouvement : changement de page, cartes, listes, jauges, fenêtres, onglets.</li>
        <li><strong>Un attribut pour votre contenu fait main :</strong>&ngsp;<code>lcReveal</code> pour un bloc, <code>lcStagger</code> pour une série ; le tableau ci-dessous dit lequel poser.</li>
        <li><strong>Pour couper :</strong>&ngsp;<code>[lcReveal]="null"</code> sur un élément, ou rien du tout : quand l’utilisateur a réduit les animations sur son appareil, tout s’affiche d’un coup dans son état final.</li>
      </ul>
    </section>

    <h2>Votre besoin, l’attribut à poser</h2>
    <div class="scroll">
      <table>
        <thead><tr><th>Votre besoin</th><th>À poser</th><th>Ce qui se passe</th><th>Exemple</th></tr></thead>
        <tbody>
          @for (row of needs; track row.need) {
            <tr>
              <td>{{ row.need }}</td>
              <td><lc-doc-text [text]="attrText(row.attr)" /></td>
              <td><lc-doc-text [text]="row.effect" /></td>
              <td>
                <code class="example">{{ row.example }}</code>
                @if (row.demo) {
                  <div class="demo" [attr.data-demo]="'need-' + row.demo">
                    <button lcButton fillMode="outline" size="small" (click)="replay(row.demo)">Rejouer</button>
                    @switch (row.demo) {
                      @case ('reveal') { @for (key of demos.reveal.keys(); track key) { <div lcReveal class="chip">Bloc</div> } }
                      @case ('variants') {
                        @for (key of demos.variants.keys(); track key) {
                          <div class="chips">
                            @for (variant of variantNames; track variant) { <div [lcReveal]="variant" class="chip">{{ variant }}</div> }
                          </div>
                        }
                      }
                      @case ('remove') {
                        @for (key of demos.remove.keys(); track key) {
                          <div class="chips">
                            @for (card of cards(); track card) { <div lcReveal class="chip">{{ card }}</div> }
                          </div>
                        }
                      }
                      @case ('stagger') {
                        @for (key of demos.stagger.keys(); track key) {
                          <section lcStagger class="chips">
                            @for (card of featured; track card) { <article lcReveal class="chip">{{ card }}</article> }
                          </section>
                        }
                      }
                      @case ('countup') { @for (key of demos.countup.keys(); track key) { <span class="figure" data-sample [lcCountUp]="total()" lcCountUpFormat="integer"></span> } }
                      @case ('flash') { @for (key of demos.flash.keys(); track key) { <span class="figure" [lcFlash]="flashed()">{{ flashed() }}</span> } }
                      @case ('fill') {
                        @for (key of demos.fill.keys(); track key) {
                          <div class="track"><div class="bar" [lcFill]="0.7"></div></div>
                        }
                      }
                      @case ('draw') {
                        @for (key of demos.draw.keys(); track key) {
                          <svg class="draw" width="120" height="48" viewBox="0 0 120 48" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" aria-hidden="true">
                            <circle class="ring" [lcDraw]="0.7" cx="24" cy="24" r="18" />
                            <path [lcDraw]="1" d="M56 38 C 70 6, 90 6, 112 38" />
                          </svg>
                        }
                      }
                      @case ('split') { @for (key of demos.split.keys(); track key) { <strong class="title" [lcSplitText]="'Bonjour le monde'"></strong> } }
                      @case ('flip') {
                        <ul class="list" [lcFlip]="lines()">
                          @for (line of lines(); track line) { <li class="chip">{{ line }}</li> }
                        </ul>
                      }
                    }
                  </div>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <h2>Les courbes en langage simple</h2>
    <p class="lead">Une courbe dit à quelle vitesse va le mouvement à chaque instant. Sur chaque carte, le tracé va de départ (à gauche, en bas) à arrivée (à droite, en haut) ; la pastille fait le trajet avec la même courbe. Quand le tracé monte au-dessus de la ligne du haut, le mouvement dépasse sa place avant de revenir.</p>
    <div class="curves">
      @for (curve of curves; track curve.key) {
        <figure [attr.data-curve]="curve.key">
          <svg [attr.viewBox]="traceView" role="img" [attr.aria-label]="'Tracé de la courbe ' + curve.key">
            <path class="axes" d="M0 0 V100 H100" />
            <path class="halfway" d="M0 0 H100" />
            <path class="trace" [attr.d]="traces()[curve.key]?.path" />
          </svg>
          <div class="rail"><span class="pill" aria-hidden="true"></span></div>
          <figcaption>
            <strong>{{ curve.says }}</strong>
            <span class="muted"><lc-doc-text [text]="curve.use" /></span>
            <code>{{ curve.key }}</code>
            <button lcButton fillMode="outline" size="small" (click)="playCurve($event, curve.key)">Rejouer</button>
          </figcaption>
        </figure>
      }
    </div>
    <span #probe class="probe"></span>

    <h3>Les durées, en mots</h3>
    <p class="lead">Les valeurs viennent du code de l’application dont le kit s’inspire. Elles se lisent ici telles que votre thème les donne.</p>
    <div class="scroll">
      <table>
        <thead><tr><th>En mots</th><th>Durée</th><th>Où</th></tr></thead>
        <tbody>
          @for (word of words; track word.label) {
            <tr><td>{{ word.label }}</td><td class="muted nowrap">{{ value(word.cssVar) }}</td><td class="muted">{{ word.where }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    <h2>Ce qui ne bouge pas, exprès</h2>
    <p class="lead">Survol d’une ligne, badge de statut, champ en erreur, info-bulle, sélection d’une date : ces éléments changent d’un coup. Le mouvement ne doit pas distraire d’une information importante.</p>

    <h2>Régler et couper</h2>
    <h3>Régler la vitesse</h3>
    <p class="lead">Un réglage par type de mouvement, en millisecondes. Écrivez la valeur voulue dans le fichier de thème de votre application, ou dans sa feuille de style globale sur <code>:root</code> (le fichier listé sous <code>styles</code> dans <code>angular.json</code>, souvent <code>src/styles.css</code>) : tous les composants du kit la suivent.</p>
    <div class="scroll">
      <table>
        <thead><tr><th>Type de mouvement</th><th>Valeur de départ</th><th>Réglage à écrire</th><th>Où</th></tr></thead>
        <tbody>
          @for (setting of settings; track setting.cssVar) {
            <tr><td>{{ setting.type }}</td><td class="muted nowrap">{{ value(setting.cssVar) }}</td><td><code>{{ setting.cssVar }}</code></td><td class="muted"><lc-doc-text [text]="setting.where" /></td></tr>
          }
        </tbody>
      </table>
    </div>
    <pre><code>{{ settingExample }}</code></pre>
    <h3>Pour les personnes qui utilisent une application</h3>
    <p class="lead">Le kit suit déjà le réglage d’accessibilité du système : quand il est activé, toutes les animations s’arrêtent d’elles-mêmes, sans rien configurer. Où le trouver : iPhone et iPad, Réglages › Accessibilité › Mouvement › Réduire les animations ; Mac, Réglages Système › Accessibilité › Affichage › Réduire les animations ; Windows, Paramètres › Accessibilité › Effets visuels › Effets d’animation (désactivé) ; Android, Paramètres › Accessibilité › Supprimer les animations.</p>
    <h3>Pour voir le résultat pendant le développement</h3>
    <p class="lead">Dans les outils de développement du navigateur, simulez le réglage sans toucher à l’appareil : Chrome et Edge, panneau Rendering, « Emulate CSS media feature prefers-reduced-motion » ; Firefox, onglet Inspecteur, bouton de simulation « prefers-reduced-motion » ; Safari, menu Développement › Options d’accessibilité. Les durées passent à zéro : chaque démonstration de cette page affiche aussitôt son état final.</p>
    <h3>Pour couper le mouvement chez tout le monde</h3>
    <p class="lead">Seulement si votre produit veut couper le mouvement pour tous, quel que soit le réglage du système : mettez les durées à <code>0ms</code> dans le fichier de thème ou dans la feuille de style globale. Les courbes et les distances n’ont pas à changer.</p>
    <pre><code>{{ offCss }}</code></pre>

    <h2>Recettes</h2>
    <p class="lead">Deux gestes que le kit ne fournit pas, écrits avec <code>lcAnimate</code> : il lit la durée et la courbe dans les mêmes réglages que le reste, et ne joue rien quand l’utilisateur a réduit les animations.</p>
    <div class="recipes">
      <section>
        <h3>Glisser-déposer au ressort <button lcButton fillMode="outline" size="small" (click)="replayDrag()">Rejouer</button></h3>
        <p class="muted">Saisissez la pastille : elle se soulève et saute de case en case sous le pointeur. Au relâchement elle se pose en ressort.</p>
        <div class="slots" [style.--slot.px]="slotPx" [style.--slots]="slots" data-demo="recipe-drag">
          <span #grip class="grip" tabindex="0" role="slider" aria-label="Position, de 1 à 5" aria-valuemin="1" [attr.aria-valuemax]="slots" [attr.aria-valuenow]="slot() + 1"
            (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up()" (pointercancel)="up()" (keydown)="key($event)">{{ slot() + 1 }}</span>
        </div>
      </section>
      <section>
        <h3>Bouton magnétique <button lcButton fillMode="outline" size="small" (click)="replayMagnet()">Rejouer</button></h3>
        <p class="muted">Passez le pointeur sur le bouton : il est attiré de quelques pixels avec un léger retard, et revient au repos quand vous partez. Pointeur fin seulement.</p>
        <div class="magnet-zone" data-demo="recipe-magnet" (pointermove)="pull($event)" (pointerleave)="release()">
          <button lcButton #magnet>Enregistrer</button>
        </div>
      </section>
    </div>
    <pre><code>{{ dragCode }}</code></pre>
  `,
  styles: [
    PAGE_STYLES,
    `
    h3 { display: flex; align-items: center; justify-content: space-between; gap: var(--lc-sys-space-2); font-size: var(--lc-sys-font-size-md); font-weight: var(--lc-sys-font-weight-medium); margin: var(--lc-sys-space-6) 0 var(--lc-sys-space-2); }
    .auto { padding: var(--lc-sys-space-4); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-raised); max-width: 70ch; }
    .auto h3 { margin-top: 0; }
    .auto ul { margin: 0; padding-inline-start: var(--lc-sys-space-5); display: grid; gap: var(--lc-sys-space-2); line-height: var(--lc-sys-font-line-height-relaxed); }
    .scroll { overflow-x: auto; }
    .nowrap, code { white-space: nowrap; }
    code.example { display: block; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--lc-sys-color-on-surface-muted); }
    td { vertical-align: top; }
    td:nth-child(3) { min-width: 16rem; }
    td:last-child { min-width: 14rem; }
    pre { margin: var(--lc-sys-space-3) 0 0; padding: var(--lc-sys-space-3) var(--lc-sys-space-4); overflow-x: auto; background: var(--lc-sys-color-surface-raised); border-radius: var(--lc-sys-radius-md); }
    pre code { white-space: pre; }
    @media (max-width: 40rem) {
      .scroll table, .scroll tbody, .scroll tr, .scroll td { display: block; }
      .scroll thead { display: none; }
      .scroll tr { padding-block: var(--lc-sys-space-3); border-bottom: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); }
      .scroll td { border: 0; padding: var(--lc-sys-space-1) 0; min-width: 0; }
      .scroll td:last-child, .scroll td:nth-child(3) { min-width: 0; white-space: normal; }
    }
    .demo { display: grid; gap: var(--lc-sys-space-2); justify-items: start; margin-top: var(--lc-sys-space-2); }
    .chips { display: flex; flex-wrap: wrap; gap: var(--lc-sys-space-2); }
    .chip { padding: var(--lc-sys-space-1) var(--lc-sys-space-3); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-raised); }
    .figure { font-size: var(--lc-sys-font-size-xl); font-variant-numeric: tabular-nums; }
    .track { inline-size: 100%; max-inline-size: 12rem; block-size: var(--lc-sys-space-2); border-radius: var(--lc-sys-radius-full); background: var(--lc-sys-color-surface-sunken); overflow: hidden; }
    .bar { block-size: 100%; background: var(--lc-sys-color-primary); }
    .draw { color: var(--lc-sys-color-primary); }
    .ring { transform: rotate(-90deg); transform-origin: 24px 24px; }
    .list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--lc-sys-space-1); }
    .curves { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(13rem, 100%), 1fr)); gap: var(--lc-sys-space-6); }
    figure { margin: 0; }
    figcaption { display: grid; gap: var(--lc-sys-space-1); justify-items: start; margin-top: var(--lc-sys-space-2); font-size: var(--lc-sys-font-size-sm); }
    svg { display: block; width: 100%; background: var(--lc-sys-color-surface-raised); border-radius: var(--lc-sys-radius-md); }
    svg path { fill: none; vector-effect: non-scaling-stroke; }
    .axes { stroke: var(--lc-sys-color-border-strong); stroke-width: 1; }
    .halfway { stroke: var(--lc-sys-color-border); stroke-width: 1; stroke-dasharray: 4 4; }
    .trace { stroke-width: 2; stroke: var(--lc-sys-color-primary); }
    .rail { position: relative; block-size: var(--lc-sys-space-4); margin-top: var(--lc-sys-space-2); border-radius: var(--lc-sys-radius-full); background: var(--lc-sys-color-surface-sunken); }
    .pill { position: absolute; inset-block: 0; inset-inline-start: 0; aspect-ratio: 1; border-radius: var(--lc-sys-radius-full); background: var(--lc-sys-color-primary); }
    .probe { position: absolute; visibility: hidden; }
    .recipes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr)); gap: var(--lc-sys-space-6); align-items: start; }
    .recipes h3 { margin-top: 0; }
    .recipes p { margin: 0 0 var(--lc-sys-space-3); }
    .slots { position: relative; inline-size: calc(var(--slot) * var(--slots)); max-inline-size: 100%; block-size: var(--slot); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-sunken);
      background-image: linear-gradient(to right, var(--lc-sys-color-border) var(--lc-sys-border-width-thin), transparent var(--lc-sys-border-width-thin)); background-size: var(--slot) 100%; touch-action: none; }
    .grip { position: absolute; inset-block: var(--lc-sys-space-1); inset-inline-start: var(--lc-sys-space-1); inline-size: calc(var(--slot) - 2 * var(--lc-sys-space-1)); display: grid; place-items: center; cursor: grab; user-select: none;
      border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-primary); color: var(--lc-sys-color-on-primary); touch-action: none; }
    .grip:focus-visible { outline: var(--lc-sys-focus-ring-width) solid var(--lc-sys-color-focus-ring); outline-offset: var(--lc-sys-focus-ring-offset); }
    .magnet-zone { display: inline-grid; padding: var(--lc-sys-space-5); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-sunken); }
    `,
  ],
})
export class DocMotionComponent {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly needs = NEEDS;
  protected readonly curves = CURVES;
  protected readonly settings = SETTINGS;
  protected readonly offCss = MOTION_OFF_CSS;
  protected readonly settingExample = ':root { --lc-sys-duration-fill: 600ms; }';
  protected readonly traceView = TRACE_VIEW;
  protected readonly variantNames = ['rise', 'drop', 'left', 'right', 'pop', 'tilt', 'fade', 'scale'] as const;
  protected readonly featured = FEATURED_CARDS;
  protected readonly slotPx = SLOT_PX;
  protected readonly slots = SLOTS;
  /** Durées dites en mots : libellé, réglage lu, où. */
  protected readonly words = [
    { label: 'Clin d’œil', cssVar: '--lc-sys-duration-fast', where: 'Appui d’un bouton, petits fondus' },
    { label: 'Survol', cssVar: '--lc-sys-duration-slow', where: 'Une carte qui se soulève' },
    { label: 'Apparition', cssVar: '--lc-reveal-duration', where: 'Un bloc ou une ligne qui entre' },
    { label: 'Déplacement', cssVar: '--lc-sys-duration-move', where: 'Un panneau ou un indicateur qui glisse' },
    { label: 'Panneau', cssVar: '--lc-sys-duration-normal', where: 'Un menu ou une fenêtre qui s’ouvre' },
    { label: 'Page', cssVar: '--lc-sys-duration-view', where: 'Une page qui en remplace une autre' },
    { label: 'Jauge', cssVar: '--lc-sys-duration-fill', where: 'Une barre ou une jauge qui se remplit' },
  ] as const;

  protected readonly demos: Record<DemoId, ReturnType<typeof replayable>> = {
    reveal: replayable({ destroyRef: this.destroyRef }),
    variants: replayable({ destroyRef: this.destroyRef }),
    remove: replayable({ reset: () => this.cards.set(FEATURED_CARDS.slice(0, 3)), play: () => this.cards.set(['Projet', 'Équipe']), wait: 900, destroyRef: this.destroyRef }),
    stagger: replayable({ destroyRef: this.destroyRef }),
    countup: replayable({ reset: () => this.total.set(1200), play: () => this.total.set(1850), wait: 1600, destroyRef: this.destroyRef }),
    flash: replayable({ reset: () => this.flashed.set(1200), play: () => this.flashed.set(1850), wait: 600, destroyRef: this.destroyRef }),
    fill: replayable({ destroyRef: this.destroyRef }),
    draw: replayable({ destroyRef: this.destroyRef }),
    split: replayable({ destroyRef: this.destroyRef }),
    flip: replayable({ destroyRef: this.destroyRef }),
  };
  protected readonly cards = signal<readonly string[]>(FEATURED_CARDS.slice(0, 3));
  protected readonly total = signal(1200);
  protected readonly flashed = signal(1200);
  protected readonly lines = signal<readonly string[]>(TASKS);
  protected readonly traces = signal<Readonly<Record<string, CurveTrace>>>({});
  private readonly resolved = signal<Readonly<Record<string, string>>>({});

  // Recettes.
  protected readonly slot = signal(0);
  private grip?: HTMLElement;
  private drag?: { startX: number; origin: number; x: number; grab: Animation };
  private magnetEl?: HTMLElement;
  private magnetTarget = { x: 0, y: 0 };
  private magnetPos = { x: 0, y: 0 };
  private magnetFrame = 0;

  protected readonly dragCode = `// Au saisir : la pastille se soulève (échelle et durée venues des réglages).
const grab = lcAnimate(grip, [{ scale: 1 }, { scale: 1.03 }], { duration: 'fast', easing: 'out', fill: 'forwards' });
// Pendant le geste : elle suit le pointeur par pas de case, sans animation (style.translate).
grip.style.translate = \`\${slot * largeurCase}px 0\`;
// Au relâchement : elle se pose en ressort, de la position lâchée vers la case.
lcAnimate(grip, [{ translate: \`\${lache}px 0\`, scale: 1.03 }, { translate: \`\${slot * largeurCase}px 0\`, scale: 1 }], { duration: 'move', easing: 'pop' });`;

  constructor() {
    afterNextRender(() => {
      this.grip = this.host.querySelector<HTMLElement>('.grip') ?? undefined;
      this.magnetEl = this.host.querySelector<HTMLElement>('.magnet-zone button') ?? undefined;
      this.sample();
      this.resolveValues();
      for (const pill of this.host.querySelectorAll<HTMLElement>('.pill')) this.runPill(pill, (pill.closest('figure') as HTMLElement).dataset['curve'] as LcMotionEasing);
    });
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.magnetFrame));
  }

  protected replay(id: DemoId): void {
    if (id === 'flip') this.lines.update((list) => [...list].reverse());
    else this.demos[id].replay(this.host);
  }

  /** Un nom d'attribut seul (`lcReveal`) s'affiche en code ; « Rien » ou une phrase restent du texte. */
  protected attrText(attr: string): string {
    return /^lc\w+(="…")?$/.test(attr) ? `\`${attr}\`` : attr;
  }

  protected value(cssVar: string): string {
    return this.resolved()[cssVar] ?? '';
  }

  /** Lit chaque courbe dans le navigateur (une animation en pause), donc tout `cubic-bezier()` ou `linear()` est tracé tel qu'il s'exécute. */
  private sample(): void {
    const probe = this.host.querySelector<HTMLElement>('.probe');
    if (!probe) return;
    const style = getComputedStyle(this.host);
    const next: Record<string, CurveTrace> = {};
    for (const { key } of CURVES) {
      const animation = probe.animate([{ translate: '0px 0' }, { translate: '100px 0' }], { duration: 1000, easing: style.getPropertyValue(`--lc-sys-easing-${key}`).trim() || 'linear', fill: 'both' });
      animation.pause();
      const ys = Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
        animation.currentTime = (i / CURVE_SAMPLES) * 1000;
        const translate = getComputedStyle(probe).translate;
        return 100 - (translate === 'none' ? 0 : parseFloat(translate));
      });
      animation.cancel();
      next[key] = { path: `M${ys.map((y, i) => `${((i / CURVE_SAMPLES) * 100).toFixed(1)} ${y.toFixed(1)}`).join(' L')}` };
    }
    this.traces.set(next);
  }

  private resolveValues(): void {
    const style = getComputedStyle(this.host);
    const next: Record<string, string> = {};
    for (const { cssVar } of [...SETTINGS, ...this.words]) next[cssVar] = style.getPropertyValue(cssVar).trim();
    this.resolved.set(next);
  }

  protected playCurve(event: Event, key: LcMotionEasing): void {
    const pill = (event.currentTarget as HTMLElement).closest('figure')?.querySelector<HTMLElement>('.pill');
    if (pill) this.runPill(pill, key);
  }

  private runPill(pill: HTMLElement, key: LcMotionEasing): void {
    const rail = pill.parentElement as HTMLElement;
    lcAnimate(pill, [{ translate: '0px 0' }, { translate: `${rail.clientWidth - pill.offsetWidth}px 0` }], { duration: 'long', easing: `--lc-sys-easing-${key}` });
  }

  // --- Glisser-déposer au ressort (d32 à d35) ---
  private lift(grip: HTMLElement, origin: number, startX: number): void {
    this.drag = { startX, origin, x: origin, grab: lcAnimate(grip, [{ scale: 1 }, { scale: GRAB_SCALE }], { duration: 'fast', easing: 'out', fill: 'forwards' }) };
  }

  private follow(grip: HTMLElement, x: number): void {
    if (!this.drag) return;
    this.drag.x = Math.min(Math.max(x, 0), SLOT_PX * (SLOTS - 1));
    grip.style.translate = `${Math.round(this.drag.x / SLOT_PX) * SLOT_PX}px 0`; // saute de case en case, sans animation
  }

  private drop(grip: HTMLElement): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = undefined;
    const slot = Math.round(drag.x / SLOT_PX);
    const from = Math.round(drag.x / SLOT_PX) * SLOT_PX;
    this.slot.set(slot);
    drag.grab.cancel();
    grip.style.translate = `${slot * SLOT_PX}px 0`;
    lcAnimate(grip, [{ translate: `${from}px 0`, scale: GRAB_SCALE }, { translate: `${slot * SLOT_PX}px 0`, scale: 1 }], { duration: 'move', easing: 'pop' });
  }

  protected down(event: PointerEvent): void {
    const grip = event.currentTarget as HTMLElement;
    grip.setPointerCapture(event.pointerId);
    this.lift(grip, this.slot() * SLOT_PX, event.clientX);
  }

  protected move(event: PointerEvent): void {
    if (this.drag) this.follow(event.currentTarget as HTMLElement, this.drag.origin + event.clientX - this.drag.startX);
  }

  protected up(): void {
    if (this.grip) this.drop(this.grip);
  }

  protected key(event: KeyboardEvent): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step || !this.grip) return;
    event.preventDefault();
    const origin = this.slot() * SLOT_PX;
    this.lift(this.grip, origin, 0);
    this.follow(this.grip, origin + step * SLOT_PX);
    this.drop(this.grip);
  }

  protected replayDrag(): void {
    const grip = this.grip;
    if (!grip || this.drag) return;
    grip.style.translate = '0px 0';
    this.slot.set(0);
    const timers = [
      setTimeout(() => this.lift(grip, 0, 0), 150),
      setTimeout(() => this.follow(grip, SLOT_PX * 1.4), 450),
      setTimeout(() => this.follow(grip, SLOT_PX * 3.2), 800),
      setTimeout(() => this.drop(grip), 1100),
    ];
    this.destroyRef.onDestroy(() => timers.forEach(clearTimeout));
  }

  // --- Bouton magnétique (d30) : le bouton rejoint le pointeur avec un léger retard (lerp), puis revient au repos ---
  protected pull(event: PointerEvent): void {
    const button = this.magnetEl;
    if (!button || event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const box = button.getBoundingClientRect();
    const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const dy = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
    this.magnetTarget = { x: Math.max(-1, Math.min(1, dx)) * MAGNET_PX, y: Math.max(-1, Math.min(1, dy)) * MAGNET_PX };
    this.magnetLoop();
  }

  protected release(): void {
    this.magnetTarget = { x: 0, y: 0 };
    this.magnetLoop();
  }

  protected replayMagnet(): void {
    if (prefersReducedMotion()) return;
    this.magnetTarget = { x: MAGNET_PX, y: -MAGNET_PX };
    this.magnetLoop();
    const timer = setTimeout(() => this.release(), 700);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  private magnetLoop(): void {
    cancelAnimationFrame(this.magnetFrame);
    const step = () => {
      const button = this.magnetEl;
      if (!button) return;
      this.magnetPos = {
        x: this.magnetPos.x + (this.magnetTarget.x - this.magnetPos.x) * MAGNET_LERP,
        y: this.magnetPos.y + (this.magnetTarget.y - this.magnetPos.y) * MAGNET_LERP,
      };
      const settled = Math.abs(this.magnetTarget.x - this.magnetPos.x) < MAGNET_REST_PX && Math.abs(this.magnetTarget.y - this.magnetPos.y) < MAGNET_REST_PX;
      button.style.translate = settled && !this.magnetTarget.x && !this.magnetTarget.y ? '' : `${this.magnetPos.x}px ${this.magnetPos.y}px`;
      if (!settled) this.magnetFrame = requestAnimationFrame(step);
    };
    this.magnetFrame = requestAnimationFrame(step);
  }
}
