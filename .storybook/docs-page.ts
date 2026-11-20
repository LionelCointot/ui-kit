import { createElement as h, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Canvas,
  Controls,
  Description,
  DocsContext,
  Heading,
  Primary,
  Subheading,
  Subtitle,
  Title,
  Anchor,
  useOf,
} from '@storybook/addon-docs/blocks';

/** Marge de pré-chargement : l'exemple se monte avant d'entrer dans l'écran. */
const ROOT_MARGIN = '600px';

/** Monte `children` à la première approche du viewport, puis le garde monté (chaque Canvas = une application Angular). */
function WhenNearViewport({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') return setNear(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), {
      rootMargin: ROOT_MARGIN,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return near
    ? h(Fragment, null, children)
    : h(
        'div',
        {
          ref,
          style: {
            minHeight: 160,
            display: 'grid',
            placeItems: 'center',
            margin: '25px 0 40px',
            border: '1px solid rgba(128, 128, 128, 0.3)',
            borderRadius: 4,
            opacity: 0.7,
            font: 'inherit',
          },
        },
        'Loading example…',
      );
}

/** Équivalent de DocsStory (expanded) : titre et description tout de suite (sommaire), Canvas différé. */
function LazyStory({ story }: { story: { id: string; name: string; moduleExport: unknown } }) {
  const of = story.moduleExport as never;
  return h(
    Anchor,
    { storyId: story.id },
    h(Subheading, null, story.name),
    h(Description, { of }),
    h(WhenNearViewport, null, h(Canvas, { of, story: { __forceInitialArgs: true }, source: { __forceInitialArgs: true } })),
  );
}

function Stories() {
  const { componentStories, projectAnnotations, getStoryContext } = useContext(DocsContext) as any;
  let stories: any[] = componentStories();
  const filter = projectAnnotations.parameters?.docs?.stories?.filter;
  if (filter) stories = stories.filter((s) => filter(s, getStoryContext(s)));
  // Même règle que l'autodocs par défaut : si une story porte le tag, seules celles-ci comptent.
  if (stories.some((s) => s.tags?.includes('autodocs'))) {
    stories = stories.filter((s) => s.tags?.includes('autodocs') && !s.usesMount);
  }
  stories = stories.slice(1); // la première est déjà rendue par <Primary />
  if (!stories.length) return null;
  return h(Fragment, null, h(Heading, null, 'Stories'), ...stories.map((s) => h(LazyStory, { key: s.id, story: s })));
}

/** Page autodocs : comme celle de Storybook, mais seules la story principale et les exemples proches de l'écran sont montés. */
export function DocsPage() {
  const { csfFile } = useOf('meta', ['meta']) as any;
  const isSingleStory = Object.keys(csfFile.stories).length === 1;
  return h(
    Fragment,
    null,
    h(Title, null),
    h(Subtitle, null),
    h(Description, { of: 'meta' }),
    isSingleStory ? h(Description, { of: 'story' }) : null,
    h(Primary, null),
    h(Controls, null),
    isSingleStory ? null : h(Stories, null),
  );
}
