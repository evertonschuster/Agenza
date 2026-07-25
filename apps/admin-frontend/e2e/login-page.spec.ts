import { test, expect } from '@playwright/test'
import { mockOidcLoginStart } from './support/session'

test.describe('automatic login transition', () => {
  test('explains the redirect in dark mode before opening the identity provider', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await mockOidcLoginStart(page, 1_000)
    await page.goto('/login')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('heading', { name: 'Redirecionando para o login' })).toBeVisible()
    await expect(page.getByText('Redirecionamento automático em andamento')).toBeVisible()

    await expect(page).toHaveURL(/localhost:5081\/connect\/authorize/)
    await expect(page.getByRole('heading', { name: 'Acesso seguro' })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('theme')).toBe('dark')
  })

  test('renders the transition without horizontal overflow at a 375px viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockOidcLoginStart(page, 1_000)
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Redirecionando para o login' })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)

    await expect(page).toHaveURL(/localhost:5081\/connect\/authorize/)
    expect(new URL(page.url()).searchParams.get('theme')).toBe('light')
  })
})
