import { test, expect } from '@playwright/test'

test.describe('unauthenticated access', () => {
  test('redirects a protected route to /login without a session', async ({ page }) => {
    await page.goto('/services')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('redirects the root path to /login without a session', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
  })
})
