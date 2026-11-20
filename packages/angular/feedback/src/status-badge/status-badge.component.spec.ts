import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_DEFAULT_ICONS } from '@lionelcointot/ui-angular';
import { LC_STATUS_ICONS, LcStatusBadgeKind } from '../status-icons';
import { LcStatusBadgeComponent } from './status-badge.component';

const KINDS: readonly LcStatusBadgeKind[] = ['success', 'error', 'warning', 'highlight', 'info', 'neutral'];

@Component({
  imports: [LcStatusBadgeComponent],
  template: `<lc-status-badge [kind]="kind()" [icon]="icon()" [size]="size()">{{ label() }}</lc-status-badge>`,
})
class StatusBadgeHostComponent {
  readonly kind = signal<LcStatusBadgeKind>('success');
  readonly icon = signal<string | undefined>(undefined);
  readonly size = signal<'small' | 'medium' | 'large' | undefined>(undefined);
  readonly label = signal('Réussi');
}

@Component({ imports: [LcStatusBadgeComponent], template: '<lc-status-badge>Inconnu</lc-status-badge>' })
class DefaultBadgeHostComponent {}

/** Contenu du SVG d'une icône du jeu par défaut, normalisé par le parseur du navigateur. */
function svgContent(name: string): string {
  const holder = document.createElement('div');
  holder.innerHTML = LC_DEFAULT_ICONS[name];
  return holder.querySelector('svg')!.innerHTML;
}

describe('LcStatusBadgeComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(StatusBadgeHostComponent);
    await fixture.whenStable();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('lc-status-badge') as HTMLElement;
    return { fixture, badge };
  }

  // CA-K1.1
  it.each([
    ['success', 'circle-check'],
    ['error', 'circle-x'],
    ['warning', 'triangle-alert'],
    ['highlight', 'activity'],
    ['info', 'info'],
    ['neutral', 'minus'],
  ] as const)('CA-K1.1 : le kind « %s » rend l\'icône « %s » et le texte', async (kind, iconName) => {
    const { fixture, badge } = await setup();
    fixture.componentInstance.kind.set(kind);
    fixture.componentInstance.label.set(`Libellé ${kind}`);
    await fixture.whenStable();
    const icon = badge.querySelector('lc-icon') as HTMLElement;
    expect(icon.querySelector('svg')).not.toBeNull();
    expect(icon.querySelector('svg')!.innerHTML).toBe(svgContent(iconName));
    expect(badge.textContent!.trim()).toBe(`Libellé ${kind}`);
    expect(badge.classList).toContain(`lc-status-badge--${kind}`);
  });

  it('les six kinds ont une icône distincte (l\'état n\'est pas porté par la seule couleur)', () => {
    expect(new Set(KINDS.map((kind) => LC_STATUS_ICONS[kind])).size).toBe(6);
  });

  it('kind par défaut : neutral', async () => {
    const fixture = TestBed.createComponent(DefaultBadgeHostComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('lc-status-badge')!.classList).toContain('lc-status-badge--neutral');
  });

  it('l\'icône est décorative : aria-hidden, le texte porte le nom accessible', async () => {
    const { badge } = await setup();
    const icon = badge.querySelector('lc-icon') as HTMLElement;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('role')).toBeNull();
    expect(badge.getAttribute('role')).toBeNull();
    expect(badge.textContent!.trim()).toBe('Réussi');
  });

  it('une icône personnalisée remplace celle du rôle', async () => {
    const { fixture, badge } = await setup();
    fixture.componentInstance.kind.set('error');
    fixture.componentInstance.icon.set('git-branch');
    await fixture.whenStable();
    const icon = badge.querySelector('lc-icon') as HTMLElement;
    expect(icon.querySelector('svg')!.innerHTML).toBe(svgContent('git-branch'));
    expect(icon.querySelector('svg')!.innerHTML).not.toBe(svgContent('circle-x'));
    expect(badge.classList).toContain('lc-status-badge--error');
  });

  it('applique la taille demandée, la taille par défaut sinon', async () => {
    const { fixture, badge } = await setup();
    expect(badge.className).toMatch(/lc-status-badge--(small|medium|large)/);
    fixture.componentInstance.size.set('large');
    await fixture.whenStable();
    expect(badge.classList).toContain('lc-status-badge--large');
  });

  it('un libellé long reste dans le texte du badge, sans être tronqué par le composant', async () => {
    const { fixture, badge } = await setup();
    const long = 'Intermittent depuis la dernière exécution planifiée du traitement de nuit '.repeat(5).trim();
    fixture.componentInstance.label.set(long);
    await fixture.whenStable();
    expect(badge.querySelector('.lc-status-badge__label')!.textContent).toBe(long);
  });

  it('un libellé long passe à la ligne : pas de points de suspension, texte entier visible', async () => {
    const { badge } = await setup();
    const label = getComputedStyle(badge.querySelector('.lc-status-badge__label')!);
    expect(getComputedStyle(badge).whiteSpace).not.toBe('nowrap');
    expect(label.textOverflow).not.toBe('ellipsis');
    expect(label.overflowWrap).toBe('anywhere');
  });

  // CA-K1.1 (avertissement)
  describe('avertissement en développement', () => {
    afterEach(() => vi.restoreAllMocks());

    it('CA-K1.1 : un contenu vide déclenche un avertissement', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(StatusBadgeHostComponent);
      fixture.componentInstance.label.set('   ');
      await fixture.whenStable();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('lc-status-badge');
    });

    it('un contenu renseigné ne déclenche aucun avertissement', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await setup();
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
