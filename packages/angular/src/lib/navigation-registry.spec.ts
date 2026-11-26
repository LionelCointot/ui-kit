import { describe, expect, it } from 'vitest';
import { LcNavRegistry } from './navigation-registry';

const entry = (url: string, primary = false) => ({ url, label: url, icon: undefined, primary });

describe('LcNavRegistry', () => {
  const host = document.createElement('nav');
  const [a, b, c] = ['a', 'b', 'c'].map(() => host.appendChild(document.createElement('a')));
  document.body.append(host);

  it('liste les rubriques dans l\'ordre du DOM, quel que soit l\'ordre d\'inscription', () => {
    const registry = new LcNavRegistry();
    registry.register(c, entry('/c'));
    registry.register(a, entry('/a'));
    registry.register(b, entry('/b'));
    expect(registry.items().map((e) => e.url)).toEqual(['/a', '/b', '/c']);
  });

  it('une nouvelle inscription du même élément remplace la précédente', () => {
    const registry = new LcNavRegistry();
    registry.register(a, entry('/a'));
    registry.register(a, entry('/a2', true));
    expect(registry.items()).toEqual([entry('/a2', true)]);
  });

  it('retire une rubrique', () => {
    const registry = new LcNavRegistry();
    registry.register(a, entry('/a'));
    registry.register(b, entry('/b'));
    registry.unregister(a);
    expect(registry.items().map((e) => e.url)).toEqual(['/b']);
  });
});
