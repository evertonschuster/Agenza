import { describe, expect, it } from 'vitest';
import type { ComponentType } from 'react';
import { renderRoutes } from '@/test/renderRoutes';
import { Schedule } from './Schedule';
import { Settings } from './Settings';
import { Conversations } from './Conversations';

const PAGES = [
  { name: 'Agenda', Component: Schedule },
  { name: 'Conversas', Component: Conversations },
  { name: 'Ajustes', Component: Settings },
];

function renderPage(name: string, Component: ComponentType) {
  return renderRoutes(
    [{ path: 'destino', handle: { crumb: name }, element: <Component /> }],
    '/destino',
  );
}

describe('"Em breve" destinations (spec FR-006, US5)', () => {
  it.each(PAGES)('$name renders its own heading', ({ name, Component }) => {
    const { getByRole } = renderPage(name, Component);

    expect(getByRole('heading', { name })).toBeInTheDocument();
  });

  it('each destination explains its own scope, with no sentence shared between screens', () => {
    const bodies = PAGES.map(({ name, Component }) => {
      const { container, unmount } = renderPage(name, Component);
      const text = container.querySelector('p')?.textContent ?? '';
      unmount();
      return text;
    });

    expect(bodies.every((text) => text.length > 20)).toBe(true);
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});
