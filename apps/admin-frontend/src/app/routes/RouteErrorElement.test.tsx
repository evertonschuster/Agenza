import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import type { JSX } from 'react'
import { RouteErrorElement } from '@/app/routes/RouteErrorElement'

function ThrowingPage(): JSX.Element {
  throw new Error('boom')
}

function ChunkErrorPage(): JSX.Element {
  throw new Error('Failed to fetch dynamically imported module: /assets/Foo-abc.js')
}

function buildRouter(
  initialEntry: string,
  brokenElement: JSX.Element = <ThrowingPage />,
): ReturnType<typeof createMemoryRouter> {
  const routes: RouteObject[] = [
    {
      errorElement: <RouteErrorElement />,
      children: [
        { path: '/broken', element: brokenElement },
        { path: '/dashboard', element: <div>Dashboard page</div> },
      ],
    },
  ]
  return createMemoryRouter(routes, { initialEntries: [initialEntry] })
}

describe('RouteErrorElement', () => {
  const originalLocation = window.location
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    reloadSpy = vi.fn()
    // A plain stub, not a spread of the Location instance (which would lose
    // its prototype) - only reload is ever read by the code under test;
    // navigation itself goes through react-router's in-memory history, not
    // window.location.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy },
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    vi.restoreAllMocks()
  })

  it('shows a not-found message for an unmatched route', () => {
    const router = buildRouter('/does-not-exist')
    render(<RouterProvider router={router} />)

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument()
  })

  it('shows a generic error message, without the raw error, for a thrown rendering error', () => {
    const router = buildRouter('/broken')
    render(<RouterProvider router={router} />)

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
  })

  it('navigates to the dashboard when "Voltar ao início" is clicked', async () => {
    const router = buildRouter('/broken')
    render(<RouterProvider router={router} />)

    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao início' }))

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('shows the chunk-reload screen for a stale-chunk error and reloads on demand', async () => {
    const router = buildRouter('/broken', <ChunkErrorPage />)
    render(<RouterProvider router={router} />)

    expect(screen.getByText('Nova versão disponível')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar página' }))

    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })
})
