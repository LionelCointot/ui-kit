import { TestBed } from '@angular/core/testing';
import { LcAvatarComponent } from './avatar.component';
import { LC_AVATAR_TONE_COUNT, lcAvatarTone, lcInitials } from './avatar-helpers';

describe('lcInitials', () => {
  it.each([
    ['Alice Martin', 'AM'],
    ['  alice   martin ', 'AM'],
    ['Alice', 'A'],
    ['Élodie Ève', 'ÉÈ'],
    ['Jean-Pierre Martin', 'JM'],
    ['Jean-Pierre', 'JP'],
    ['Anne de la Tour', 'AT'],
    ['élodie', 'É'],
    ['Zoë', 'Z'],
    ['李 小龍', '李小'],
    ['', ''],
    ['  - ', ''],
  ])('%j donne « %s »', (name, expected) => {
    expect(lcInitials(name)).toBe(expected);
  });

  it('ne coupe pas une paire de substitution (emoji)', () => {
    expect(lcInitials('🚀 Fusée')).toBe('F');
    expect(lcInitials('𝒜lice Martin')).toBe('𝒜M');
  });
});

describe('lcAvatarTone', () => {
  it('est déterministe et insensible à la casse et aux espaces de bord', () => {
    expect(lcAvatarTone('alice@example.com')).toBe(lcAvatarTone('alice@example.com'));
    expect(lcAvatarTone('Alice')).toBe(lcAvatarTone('  alice '));
  });

  it('reste dans la palette et répartit des graines différentes sur plusieurs teintes', () => {
    const tones = new Set(Array.from({ length: 50 }, (_, index) => lcAvatarTone(`user-${index}`)));
    expect([...tones].every((tone) => tone >= 1 && tone <= LC_AVATAR_TONE_COUNT)).toBe(true);
    expect(tones.size).toBeGreaterThan(4);
  });
});

describe('LcAvatarComponent', () => {
  async function setup(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(LcAvatarComponent);
    fixture.componentRef.setInput('name', 'Élodie Martin');
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    await fixture.whenStable();
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  it('affiche les initiales et reste décoratif sans libellé', async () => {
    const { host } = await setup({});
    expect(host.querySelector('.lc-avatar__initials')?.textContent).toBe('ÉM');
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('role')).toBeNull();
    expect(host.getAttribute('aria-label')).toBeNull();
    expect(host.classList).toContain('lc-avatar--medium');
  });

  it('porte role="img" et aria-label avec un libellé', async () => {
    const { host } = await setup({ label: 'Élodie Martin, connectée', size: 'large' });
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Élodie Martin, connectée');
    expect(host.getAttribute('aria-hidden')).toBeNull();
    expect(host.classList).toContain('lc-avatar--large');
  });

  it('affiche la photo (alt vide : le nom accessible vient de l\'avatar)', async () => {
    const { host } = await setup({ src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });
    const image = host.querySelector('img')!;
    expect(image.getAttribute('alt')).toBe('');
    expect(host.querySelector('.lc-avatar__initials')).toBeNull();
  });

  it('retombe sur les initiales quand la photo ne se charge pas, puis réessaie avec une nouvelle URL', async () => {
    const { fixture, host } = await setup({ src: 'https://invalid.example/missing.png' });
    host.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.lc-avatar__initials')?.textContent).toBe('ÉM');

    fixture.componentRef.setInput('src', 'https://invalid.example/other.png');
    await fixture.whenStable();
    expect(host.querySelector('img')).not.toBeNull();
  });

  it('affiche l\'icône utilisateur quand le nom n\'a pas d\'initiales', async () => {
    const { host } = await setup({ name: '' });
    expect(host.querySelector('.lc-avatar__initials')).toBeNull();
    expect(host.querySelector('lc-icon svg')).not.toBeNull();
  });

  it('choisit la teinte de façon déterministe, par défaut depuis le nom, sinon depuis colorSeed', async () => {
    const tone = (host: HTMLElement) => [...host.classList].find((name) => name.startsWith('lc-avatar--tone-'));
    const byName = await setup({});
    const sameName = await setup({});
    expect(tone(byName.host)).toBe(tone(sameName.host));
    expect(tone(byName.host)).toBe(`lc-avatar--tone-${lcAvatarTone('Élodie Martin')}`);

    const seeded = await setup({ colorSeed: 'user-42' });
    expect(tone(seeded.host)).toBe(`lc-avatar--tone-${lcAvatarTone('user-42')}`);
    const otherName = await setup({ name: 'Autre Personne', colorSeed: 'user-42' });
    expect(tone(otherName.host)).toBe(tone(seeded.host));
  });
});
