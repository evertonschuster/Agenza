import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ActionLink } from './index';

function renderAt(link: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={link} />
        <Route path="/nova" element={<h1>Nova</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ActionLink', () => {
  it('is a link named by its children, with the icon hidden from assistive technology', () => {
    renderAt(
      <ActionLink to="/nova" icon={PlusIcon}>
        Nova pessoa
      </ActionLink>,
    );

    const link = screen.getByRole('link', { name: 'Nova pessoa' });
    expect(link).toHaveAttribute('href', '/nova');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveAttribute('data-variant', 'default');
  });

  it('takes the button variant and size, and an accessible name when it shows only the icon', () => {
    renderAt(
      <ActionLink
        to="/nova"
        icon={PencilIcon}
        variant="ghost"
        size="icon-sm"
        aria-label="Editar Lia Souza"
      />,
    );

    const link = screen.getByRole('link', { name: 'Editar Lia Souza' });
    expect(link).toHaveAttribute('data-variant', 'ghost');
    expect(link).toHaveAttribute('data-size', 'icon-sm');
  });

  it('navigates when clicked', async () => {
    const user = userEvent.setup();
    renderAt(<ActionLink to="/nova">Nova pessoa</ActionLink>);

    await user.click(screen.getByRole('link', { name: 'Nova pessoa' }));

    expect(screen.getByRole('heading', { name: 'Nova' })).toBeInTheDocument();
  });
});
