// SPIKE jetable : transitions de pages sans View Transitions. Technique choisie par ?tech=a|b (b par defaut).
import { Directive, ElementRef, Injectable, Injector, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, Router, RouterStateSnapshot } from '@angular/router';

export const TECH = new URLSearchParams(location.search).get('tech') ?? 'b';
export type Dir = 'init' | 'forward' | 'back' | 'same';
export interface Level { title: string; url: string }

/** Niveaux = routes qui declarent un `title` sur le chemin racine -> feuille. Titres deja resolus par le routeur. */
export function levelsOf(snap: RouterStateSnapshot): Level[] {
  const out: Level[] = [];
  const segs: string[] = [];
  for (let r: ActivatedRouteSnapshot | null = snap.root; r; r = r.firstChild) {
    segs.push(...r.url.map((s) => s.path));
    if (r.routeConfig?.title !== undefined) out.push({ title: r.title ?? '', url: '/' + segs.join('/') });
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class PageNav {
  readonly dir = signal<Dir>('init');
  readonly levels = signal<Level[]>([]);
  readonly mobile = signal(false);
  readonly title = computed(() => this.levels().at(-1)?.title ?? '');
  readonly parent = computed(() => this.levels().at(-2) ?? null);
  /** Journal lu par les tests Playwright. */
  readonly log: { url: string; dir: Dir; trigger: string; restored: number | null; entry: number | null; levels: string[] }[] = [];
}

const px = (n: number) => `${n}px`;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

@Directive({
  selector: '[spPageTransitions]',
  host: { '[attr.data-dir]': 'nav.dir()' },
})
export class PageTransitionsDirective {
  /** Liens des rubriques, dans l'ordre du menu : sert au sens « meme niveau ». */
  readonly navOrder = input<string[]>([]);
  protected readonly nav = inject(PageNav);
  protected readonly tech = TECH;
  private readonly router = inject(Router);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  private start: NavigationStart | null = null;
  private prev: { url: string; levels: Level[] } | null = null;
  // Le routeur reecrit history.state.navigationId a chaque popstate : les ids ne suffisent pas a ordonner les entrees,
  // on tient donc une copie de la pile d'historique (ids) et la position courante.
  private stack: number[] = [];
  private pos = -1;
  private replace = false;
  private pending: { dir: Dir; levels: Level[]; clone: HTMLElement | null; skip: boolean } | null = null;
  private snaps = new Map<string, HTMLElement>();
  private skipNext = false;
  private live: HTMLElement[] = []; // clones en cours de sortie
  private edge: HTMLElement | null = null;

  constructor() {
    const mq = matchMedia('(max-width: 759px)');
    this.nav.mobile.set(mq.matches);
    mq.addEventListener('change', () => this.nav.mobile.set(mq.matches));
    (window as unknown as { __spike: unknown }).__spike = {
      nav: this.nav,
      pages: () => document.querySelectorAll('.sp-page').length,
      snaps: () => [...this.snaps.keys()],
    };
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.start = e;
      else if (e instanceof ResolveEnd) this.onResolved(e.state, e.urlAfterRedirects);
      else if (e instanceof NavigationEnd) this.onEnd(e);
      else if (e instanceof NavigationCancel || e instanceof NavigationError) { this.pending = null; this.unfreeze(this.page()); }
    });
    this.makeEdge();
  }

  private page(): HTMLElement | null {
    // La page courante est la derniere ajoutee par le routeur (en A, la sortante est encore la, avant elle).
    return [...this.host.querySelectorAll<HTMLElement>(':scope > router-outlet ~ .sp-page:not([data-clone])')].at(-1) ?? null;
  }

  private direction(next: Level[], url: string): Dir {
    const prev = this.prev;
    if (!prev) return 'init';
    const s = this.start;
    if (s?.navigationTrigger === 'popstate') {
      const rid = s.restoredState?.navigationId ?? null;
      return rid !== null && this.stack.indexOf(rid) > this.pos ? 'forward' : 'back';
    }
    if (next.length !== prev.levels.length) return next.length > prev.levels.length ? 'forward' : 'back';
    const idx = (l: Level[]) => this.navOrder().indexOf(l[0]?.url ?? '');
    const d = idx(next) - idx(prev.levels);
    return url === prev.url || d === 0 ? 'same' : d > 0 ? 'forward' : 'back';
  }

  private onResolved(state: RouterStateSnapshot, url: string): void {
    const levels = levelsOf(state);
    this.replace = !!this.router.currentNavigation()?.extras.replaceUrl;
    const dir = this.direction(levels, url);
    const page = this.page();
    let clone: HTMLElement | null = null;
    if (TECH !== 'a' && page && dir !== 'init' && !reduced()) {
      clone = this.freeze(page);
      if (dir === 'forward' && this.prev) this.snaps.set(this.prev.url.split('?')[0], this.freeze(page, true));
    }
    // A : l'ancienne page (vivante) ne doit plus etre interactive pendant sa sortie.
    // Et on l'ancre au pixel pres (position fixed) : sans cela le retour en haut de page la ferait « sauter ».
    if (TECH === 'a' && page && dir !== 'init' && !reduced()) {
      const r = page.getBoundingClientRect();
      page.inert = true; page.setAttribute('aria-hidden', 'true');
      page.style.cssText = `position:fixed;left:${px(r.left)};top:${px(r.top)};width:${px(r.width)};height:${px(r.height)};margin:0;overflow:hidden;pointer-events:none;`;
    }
    this.pending = { dir, levels, clone, skip: this.skipNext };
    this.skipNext = false;
    // A : le sens doit etre connu avant la destruction de l'ancienne page (animate.leave lit data-dir).
    this.nav.dir.set(dir);
  }

  /** Copie figee non interactive de la page, positionnee a l'endroit exact ou elle est affichee (rect viewport). */
  private freeze(page: HTMLElement, snapshot = false): HTMLElement {
    const r = page.getBoundingClientRect();
    const c = page.cloneNode(true) as HTMLElement;
    c.dataset['clone'] = '1';
    c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.inert = true;
    c.style.cssText = `position:fixed;left:${px(r.left)};top:${px(r.top)};width:${px(r.width)};height:${px(r.height)};margin:0;overflow:hidden;pointer-events:none;`;
    if (snapshot) c.dataset['snapshot'] = '1';
    return c;
  }

  private onEnd(e: NavigationEnd): void {
    this.cleanup();
    const p = this.pending;
    this.pending = null;
    const entry = (history.state as { navigationId?: number } | null)?.navigationId ?? null;
    const restored = this.start?.restoredState?.navigationId ?? null;
    if (entry !== null) {
      const i = this.start?.navigationTrigger === 'popstate' && restored !== null ? this.stack.indexOf(restored) : -1;
      if (i >= 0) { this.stack[i] = entry; this.pos = i; }
      else if (this.replace && this.pos >= 0) this.stack[this.pos] = entry;
      else { this.stack.length = this.pos + 1; this.stack.push(entry); this.pos++; }
    }
    const url = e.urlAfterRedirects;
    const levels = p?.levels ?? [];
    this.prev = { url, levels };
    this.nav.levels.set(levels);
    this.nav.log.push({ url, dir: p?.dir ?? 'init', trigger: this.start?.navigationTrigger ?? '', restored, entry, levels: levels.map((l) => l.title) });
    this.nav.dir.set(p?.dir ?? 'init');
    const page = this.page();
    this.unfreeze(page); // A : page reutilisee (meme route), pas de sortie ; la sortante n'est plus `page()`
    if (!p || p.dir === 'init' || !page) return;
    // Pas de focus force a l'init ; ensuite le titre de la nouvelle page recoit le focus.
    afterNextRender(() => { page.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); this.dropUnder(); }, { injector: this.injector });
    if (p.skip || reduced()) { p.clone = null; return; }
    // Une page quittee en avant reste en memoire pour le retour au geste ; en arriere on l'oublie.
    if (p.dir === 'back') this.snaps.delete(url.split('?')[0]);
    if (p.clone) this.host.append(p.clone);
    this.play(p.dir, p.clone, page);
  }

  private play(dir: Dir, old: HTMLElement | null, page: HTMLElement): void {
    const ease = { out: 'cubic-bezier(0.4,0,1,1)', inn: 'cubic-bezier(0.16,1,0.3,1)', stack: 'cubic-bezier(0.32,0.72,0,1)' };
    const done: Promise<unknown>[] = [];
    const a = (el: Element, kf: Keyframe[], duration: number, easing: string, o: KeyframeAnimationOptions = {}) => {
      const an = el.animate(kf, { duration, easing, ...o });
      const p = an.finished.catch(() => undefined);
      done.push(p);
      return p;
    };
    if (old) this.live.push(old);
    const sgn = dir === 'forward' ? -1 : dir === 'back' ? 1 : 0;
    if (!this.nav.mobile() || dir === 'same') {
      // Ordinateur : sortie 190 ms -16 px, puis entree 700 ms depuis +26 px.
      if (old) void a(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${sgn * 16}px)` }], 190, ease.out, { fill: 'forwards' }).then(() => old.remove());
      a(page, [{ opacity: 0, transform: `translateX(${-sgn * 26}px)` }, { opacity: 1, transform: 'none' }], 700, ease.inn, { delay: 190, fill: 'backwards' });
    } else {
      // Telephone : empilement iOS 500 ms, l'ancienne recule de 30 % avec un voile.
      const fwd = dir === 'forward';
      const dim = document.createElement('i');
      dim.className = 'sp-dim';
      const under = fwd ? old : page;
      under?.append(dim);
      if (old) old.style.zIndex = fwd ? '1' : '3';
      page.style.position = 'relative';
      page.style.zIndex = fwd ? '3' : '1';
      const W = this.host.clientWidth;
      if (old) a(old, fwd ? [{ transform: 'none' }, { transform: `translateX(${-0.3 * W}px)` }] : [{ transform: 'none' }, { transform: `translateX(${W}px)` }], 500, ease.stack, { fill: 'forwards' });
      a(page, fwd ? [{ transform: `translateX(${W}px)` }, { transform: 'none' }] : [{ transform: `translateX(${-0.3 * W}px)` }, { transform: 'none' }], 500, ease.stack, { fill: 'backwards' });
      a(dim, [{ opacity: fwd ? 0 : 0.35 }, { opacity: fwd ? 0.35 : 0 }], 500, ease.stack, { fill: 'forwards' });
      void Promise.all(done).then(() => { dim.remove(); if (page.isConnected) { page.style.position = ''; page.style.zIndex = ''; } });
    }
    void Promise.all(done).then(() => { if (old) { old.remove(); this.live = this.live.filter((x) => x !== old); } });
  }

  /** Navigation qui interrompt la precedente : on termine net, rien ne reste. */
  private cleanup(): void {
    for (const c of this.live) { c.getAnimations({ subtree: true }).forEach((a) => a.cancel()); c.remove(); }
    this.live = [];
    this.page()?.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    this.host.querySelectorAll('.sp-dim').forEach((d) => d.remove());
    const pg = this.page();
    if (pg) { pg.style.position = ''; pg.style.zIndex = ''; pg.style.transform = ''; }
  }

  private unfreeze(p: HTMLElement | null): void { p?.removeAttribute('inert'); p?.removeAttribute('aria-hidden'); if (TECH === 'a') p?.removeAttribute('style'); }

  private dropUnder(): void { this.host.querySelectorAll('[data-under]').forEach((n) => n.remove()); }

  // ---- Retour au geste depuis le bord gauche (telephone) ----
  private makeEdge(): void {
    const edge = document.createElement('div');
    edge.className = 'sp-edge';
    document.body.append(edge);
    this.edge = edge;
    let drag: { x0: number; w: number; p: number; v: number; lx: number; lt: number; under: HTMLElement; cur: HTMLElement; url: string } | null = null;
    const dimOf = (u: HTMLElement) => u.querySelector<HTMLElement>('.sp-dim');
    const set = (d: NonNullable<typeof drag>, p: number) => {
      d.cur.style.transform = `translateX(${p * d.w}px)`;
      d.under.style.transform = `translateX(${-0.3 * (1 - p) * d.w}px)`;
      const dm = dimOf(d.under); if (dm) dm.style.opacity = String(0.35 * (1 - p));
    };
    edge.addEventListener('pointerdown', (e) => {
      const parent = this.nav.parent();
      const cur = this.page();
      if (!this.nav.mobile() || !parent || !cur) return;
      edge.setPointerCapture(e.pointerId);
      let under = this.snaps.get(parent.url);
      this.snaps.delete(parent.url);
      if (!under) { // direct link : pas de copie de la page precedente -> degradation : fond neutre + titre
        under = document.createElement('div');
        under.className = 'sp-page sp-placeholder';
        under.dataset['clone'] = '1';
        under.style.cssText = 'position:fixed;inset:0;padding:1rem;';
        under.textContent = parent.title;
      }
      under.dataset['under'] = '1';
      under.style.zIndex = '1';
      under.append(Object.assign(document.createElement('i'), { className: 'sp-dim' }));
      cur.style.position = 'relative'; cur.style.zIndex = '3';
      this.host.append(under);
      drag = { x0: e.clientX, w: this.host.clientWidth, p: 0, v: 0, lx: e.clientX, lt: e.timeStamp, under, cur, url: parent.url };
      set(drag, 0);
    });
    edge.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.p = Math.min(Math.max((e.clientX - drag.x0) / drag.w, 0), 1);
      drag.v = (e.clientX - drag.lx) / Math.max(e.timeStamp - drag.lt, 1);
      drag.lx = e.clientX; drag.lt = e.timeStamp;
      set(drag, drag.p);
    });
    const release = async () => {
      const d = drag; drag = null;
      if (!d) return;
      const commit = d.p > 0.35 || d.v > 0.5, t = commit ? 1 : 0;
      const ms = Math.max(120, 500 * Math.abs(t - d.p));
      const f = (el: HTMLElement, a: string, b: string) => el.animate([{ transform: a }, { transform: b }], { duration: ms, easing: 'cubic-bezier(0.32,0.72,0,1)', fill: 'forwards' }).finished.catch(() => undefined);
      await Promise.all([
        f(d.cur, `translateX(${d.p * d.w}px)`, `translateX(${t * d.w}px)`),
        f(d.under, `translateX(${-0.3 * (1 - d.p) * d.w}px)`, `translateX(${-0.3 * (1 - t) * d.w}px)`),
      ]);
      if (commit) { this.skipNext = true; void this.router.navigateByUrl(d.url); }
      else { d.under.remove(); d.cur.getAnimations().forEach((a) => a.cancel()); d.cur.style.cssText = ''; }
    };
    edge.addEventListener('pointerup', release);
    edge.addEventListener('pointercancel', release);
  }
}
