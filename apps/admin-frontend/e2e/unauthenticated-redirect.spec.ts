import { test, expect } from '@playwright/test'
import { mockOidcLoginStart } from './support/session'

test.describe('unauthenticated access', () => {
  test('automatically opens login for a protected route without a session', async ({ page }) => {
    await mockOidcLoginStart(page)
    await page.goto('/services')

    await expect(page).toHaveURL(/localhost:5081\/connect\/authorize/)
    await expect(page.getByRole('heading', { name: 'Acesso seguro' })).toBeVisible()
  })

  test('automatically opens login from the root path without a session', async ({ page }) => {
    await mockOidcLoginStart(page)
    await page.goto('/')

    await expect(page).toHaveURL(/localhost:5081\/connect\/authorize/)
  })
})
