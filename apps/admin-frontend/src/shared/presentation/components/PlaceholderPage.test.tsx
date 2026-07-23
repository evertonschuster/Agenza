import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LayoutDashboard } from 'lucide-react'
import { PlaceholderPage } from '@/shared/presentation/components/PlaceholderPage'

describe('PlaceholderPage', () => {
  it('renders the given title and an under-construction message', () => {
    render(<PlaceholderPage title="Dashboard" icon={LayoutDashboard} />)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText(/em construção/i)).toBeInTheDocument()
  })
})
