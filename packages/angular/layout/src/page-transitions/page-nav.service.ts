import { Location } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, ResolveEnd, Router, type ActivatedRouteSnapshot } from '@angular/router';
import { LcNavRegistry } from '@lionelcointot/ui-angular';
import { LC_NAV_HISTORY_EMPTY, lcNavStep, lcPathLevel, pathOf, type LcNavStepInput, type LcPageDirection } from './page-nav.direction';

/** Une navigation qui déclenche une transition ; un nouvel objet à chaque fois, y compris deux fois le même sens. */
export interface LcPageChange {
  readonly direction: LcPageDirection;
  readonly from: string | null;
  readonly to: string;
}

interface Resolved {
  readonly title: string;
  readonly parent: { title: string; url: string } | null;
  readonly transition: boolean;
}

const urlOf = (snapshot: ActivatedRouteSnapshot): string =>
  '/' + snapshot.pathFromRoot.flatMap((route) => route.url.map((segment) => segment.path)).join('/');

function resolve(root: ActivatedRouteSnapshot, level: number): Resolved {
  const chain = [root];
  while (chain[chain.length - 1].firstChild) chain.push(chain[chain.length - 1].firstChild!);
  const leaf = chain[chain.length - 1];
  const ancestor = level > 1 ? chain.slice(0, -1).reverse().find((route) => route.title) : undefined;
  return {
    title: leaf.title ?? '',
    parent: ancestor ? { title: ancestor.title!, url: urlOf(ancestor) } : null,
    transition: leaf.data['lcPageTransition'] !== false,
  };
}

/**
 * Sens, niveau, titre et page parente de la navigation courante, lus sur le routeur (aucun routeur fourni : inerte).
 * Le sens se juge sur l'URL finale ; `change` reçoit un nouvel objet à chaque navigation qui déclenche une transition
 * (chemin différent, ni `skipLocationChange` ni `data: { lcPageTransition: false }`), premier affichage compris.
 * Niveau = nombre de segments du chemin ; l'ordre des rubriques vient de `LcNavRegistry`.
 */
@Injectable({ providedIn: 'root' })
export class LcPageNav {
  private readonly registry = inject(LcNavRegistry);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly _direction = signal<LcPageDirection>('none');
  private readonly _level = signal(1);
  private readonly _resolved = signal<Resolved | null>(null);
  private readonly _change = signal<LcPageChange | null>(null);

  readonly direction = this._direction.asReadonly();
  readonly level = this._level.asReadonly();
  readonly parent = computed(() => this._resolved()?.parent ?? null);
  readonly title = computed(() => this._resolved()?.title ?? '');
  readonly change = this._change.asReadonly();
  private transitions = false;

  /** @internal Vrai entre le `ResolveEnd` et le `NavigationEnd` d'une navigation qui va transitionner : seule règle d'éligibilité, lue par `lcPageTransitions` pour ne copier la page quittée que si une transition suit. */
  willTransition(): boolean {
    return this.transitions;
  }

  /** @internal Retour : vers la page parente (`parent()`), sinon d'un cran dans l'historique. Commun au bouton `‹ titre` de l'en-tête mobile et au geste. */
  back(): Promise<boolean> {
    const parent = this.parent();
    if (parent) return this.router.navigateByUrl(parent.url);
    this.location.back();
    return Promise.resolve(true);
  }

  constructor() {
    let history = LC_NAV_HISTORY_EMPTY;
    let step: Pick<LcNavStepInput, 'trigger' | 'replace'> & { skip: boolean } = { trigger: 'imperative', skip: false };
    let resolved: Resolved | null = null;

    this.router.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((event) => {
      if (event instanceof NavigationStart) {
        const extras = this.router.currentNavigation()?.extras;
        step = {
          trigger: event.navigationTrigger === 'imperative' ? 'imperative' : 'popstate',
          replace: extras?.replaceUrl,
          skip: !!extras?.skipLocationChange,
        };
      } else if (event instanceof ResolveEnd) {
        resolved = resolve(event.state.root, lcPathLevel(event.urlAfterRedirects));
        this.transitions = !step.skip && resolved.transition && pathOf(event.urlAfterRedirects) !== pathOf(this.router.url);
      } else if (event instanceof NavigationEnd && resolved) {
        const to = pathOf(event.urlAfterRedirects);
        this._level.set(lcPathLevel(to));
        this._resolved.set(resolved);
        // skipLocationChange : le navigateur n'a pas bougé, la pile non plus.
        if (step.skip) return;
        const from = history.urls[history.index] ?? null;
        // shortcut: après un saut du navigateur vers une URL absente de la pile, la pile et l'index du navigateur divergent ; le sens est jugé au niveau. À lever si une transition est jugée fausse.
        const next = lcNavStep(history, { url: to, ...step }, this.registry.items().map((item) => item.url));
        history = next.history;
        if (from === to || !resolved.transition) return;
        this._direction.set(next.direction);
        this._change.set({ direction: next.direction, from, to });
      }
    });
  }
}
