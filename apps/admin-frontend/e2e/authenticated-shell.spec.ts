import { test, expect } from '@playwright/test'
import { injectAuthenticatedSession, mockOidcSignout } from './support/session'

test.describe('authenticated shell', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthenticatedSession(page, { name: 'Clínica Bem-Estar' })
  })

  test('redirects the index route to the dashboard and renders the nav shell', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Etiquetas' })).toBeVisible()
    await expect(page.getByText('Clínica Bem-Estar')).toBeVisible()
  })

  test('navigates to a catalog page via the sidebar', async ({ page }) => {
    await page.route(
      url => url.pathname.startsWith('/api/v1/tags'),
      route => route.fulfill({ json: [] }),
    )

    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Etiquetas' }).click()

    await expect(page).toHaveURL(/\/tags$/)
    await expect(page.getByRole('heading', { name: 'Etiquetas' })).toBeVisible()
  })

  test('logs out and lands back on /login', async ({ page }) => {
    await mockOidcSignout(page, 'http://localhost:4173/login')

    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Sair' }).click()

    await expect(page).toHaveURL(/\/login$/)
  })
})
