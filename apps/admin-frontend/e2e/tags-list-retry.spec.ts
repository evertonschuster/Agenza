import { test, expect } from '@playwright/test'
import { injectAuthenticatedSession } from './support/session'

const EXISTING_TAG = { id: 'tag-1', name: 'VIP', color: '#0d9488', description: null }

test.describe('tags list - failed refetch and retry', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthenticatedSession(page)
  })

  test('keeps showing the last known list on a failed refetch, then recovers on retry', async ({
    page,
  }) => {
    let requestCount = 0
    await page.route(
      url => url.pathname.startsWith('/api/v1/tags'),
      route => {
        requestCount += 1
        // 1st call: initial load. 2nd call: the search-triggered refetch this
        // test deliberately fails. 3rd call: the manual retry, which succeeds.
        if (requestCount === 2) {
          return route.fulfill({ status: 500, json: { title: 'Erro interno' } })
        }
        return route.fulfill({ json: [EXISTING_TAG] })
      },
    )

    await page.goto('/tags')
    await expect(page.getByRole('cell', { name: 'VIP' })).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar etiqueta por nome' }).fill('vip')

    await expect(page.getByText(/Não foi possível atualizar a lista de etiquetas/)).toBeVisible()
    // The mutation that matters (loading the list) already succeeded once -
    // stale data stays on screen instead of being replaced by a blank error.
    await expect(page.getByRole('cell', { name: 'VIP' })).toBeVisible()

    await page.getByRole('button', { name: 'Tentar novamente' }).click()

    await expect(
      page.getByText(/Não foi possível atualizar a lista de etiquetas/),
    ).not.toBeVisible()
    await expect(page.getByRole('cell', { name: 'VIP' })).toBeVisible()
    expect(requestCount).toBe(3)
  })
})
