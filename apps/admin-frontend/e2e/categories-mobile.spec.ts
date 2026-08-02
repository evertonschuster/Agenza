import { expect, test } from '@playwright/test'
import { injectAuthenticatedSession } from './support/session'

interface CategoryRecord {
  id: string
  name: string
}

interface CategoryWriteBody {
  name: string
}

test.describe('categories on smartphones', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthenticatedSession(page)

    let categories: CategoryRecord[] = [{ id: 'category-1', name: 'Massagens terapêuticas' }]

    await page.route(
      url => url.pathname.startsWith('/api/v1/categories'),
      async route => {
        const request = route.request()

        if (request.method() === 'GET') {
          await route.fulfill({ json: categories })
          return
        }

        if (request.method() === 'POST') {
          const body = request.postDataJSON() as CategoryWriteBody
          const created = { id: 'category-2', name: body.name }
          categories = [...categories, created]
          await route.fulfill({ status: 201, json: created })
          return
        }

        if (request.method() === 'PUT') {
          const categoryId = request.url().split('/').at(-1)
          const body = request.postDataJSON() as CategoryWriteBody
          const updated = { id: categoryId ?? '', name: body.name }
          categories = categories.map(category => (category.id === categoryId ? updated : category))
          await route.fulfill({ json: updated })
          return
        }

        await route.continue()
      },
    )
  })

  test('keeps the list usable and creates and edits through one modal at 375px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/categories')

    await expect(page.getByText('Massagens terapêuticas')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Editar categoria Massagens terapêuticas' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Excluir categoria Massagens terapêuticas' }),
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

    await page.getByRole('button', { name: /editar categoria/i }).click()
    await expect(page).toHaveURL(/\/categories\/category-1\/edit$/)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Editar categoria' })).toBeVisible()
    await expect(dialog.getByLabel('Nome')).toHaveValue(/Massagens terap/)
    await dialog.getByLabel('Nome').fill('Massagens relaxantes')
    await dialog.getByRole('button', { name: /salvar altera/i }).click()

    await expect(page).toHaveURL(/\/categories$/)
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Massagens relaxantes')).toBeVisible()

    await page.getByRole('button', { name: 'Nova categoria' }).click()
    await expect(page).toHaveURL(/\/categories\/new$/)
    await expect(dialog).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/categories$/)
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'Nova categoria' }).click()
    await expect(page).toHaveURL(/\/categories\/new$/)
    await dialog.getByLabel('Nome').fill('Estética')
    await dialog.getByRole('button', { name: 'Criar categoria' }).click()

    await expect(page).toHaveURL(/\/categories$/)
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Estética')).toBeVisible()
  })
})
