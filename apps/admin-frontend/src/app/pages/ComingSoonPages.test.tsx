import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expectNoA11yViolations } from '@/test/a11y';
import { Schedule } from './Schedule';
import { Settings } from './Settings';
import { Clients } from './Clients';
import { Conversations } from './Conversations';

const PAGES = [
  { name: 'Agenda', Component: Schedule },
  { name: 'Clientes', Component: Clients },
  { name: 'Conversas', Component: Conversations },
  { name: 'Ajustes', Component: Settings },
];

describe('"Em breve" destinations (spec FR-006, US5)', () => {
  it.each(PAGES)('$name renders its own heading', ({ name, Component }) => {
    const { getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    expect(getByRole('heading', { name })).toBeInTheDocument();
  });

  it('each destination explains its own scope, with no sentence shared between screens', () => {
    const bodies = PAGES.map(({ Component }) => {
      const { container, unmount } = render(
        <MemoryRouter>
          <Component />
        </MemoryRouter>,
      );
      const text = container.querySelector('p')?.textContent ?? '';
      unmount();
      return text;
    });

    expect(bodies.every((text) => text.length > 20)).toBe(true);
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it.each(PAGES)('$name has no a11y violations', async ({ Component }) => {
    const { container } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await expectNoA11yViolations(container);
  });
});
