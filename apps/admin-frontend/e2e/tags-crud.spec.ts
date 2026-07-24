import { test, expect } from '@playwright/test'
import { injectAuthenticatedSession } from './support/session'

interface TagRecord {
  id: string
  name: string
  color: string
  description: string | null
}

interface TagWriteBody {
  name: string
  color: string
  description?: string | null
}

test.describe('tags catalog - create, edit, delete', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthenticatedSession(page)

    let tags: TagRecord[] = []
    let nextId = 1

    // A tiny in-memory fake of the /api/v1/tags REST surface - exercises the
    // real HttpClient/repository/mapper stack end to end (unlike the unit
    // tests, which fake AppContainer above that layer), without needing
    // services-service or a database running.
    await page.route(
      url => url.pathname.startsWith('/api/v1/tags'),
      async route => {
        const request = route.request()
        const method = request.method()
        const path = new URL(request.url()).pathname

        if (method === 'GET') {
          await route.fulfill({ json: tags })
          return
        }

        if (method === 'POST') {
          const body = request.postDataJSON() as TagWriteBody
          const created: TagRecord = {
            id: `tag-${String(nextId)}`,
            name: body.name,
            color: body.color,
            description: body.description ?? null,
          }
          nextId += 1
          tags = [...tags, created]
          await route.fulfill({ json: created })
          return
        }

        if (method === 'PUT') {
          const id = path.split('/').pop()
          const body = request.postDataJSON() as TagWriteBody
          tags = tags.map(tag =>
            tag.id === id
              ? {
                  ...tag,
                  name: body.name,
                  color: body.color,
                  description: body.description ?? null,
                }
              : tag,
          )
          const updated = tags.find(tag => tag.id === id)
          await route.fulfill({ json: updated })
          return
        }

        if (method === 'DELETE') {
          const id = path.split('/').pop()
          tags = tags.filter(tag => tag.id !== id)
          await route.fulfill({ status: 204 })
          return
        }

        await route.continue()
      },
    )
  })

  test('creates, edits, and deletes a tag end to end', async ({ page }) => {
    await page.goto('/tags')
    await expect(page.getByText('Nenhuma etiqueta ainda. Crie uma para começar.')).toBeVisible()

    await page.getByRole('button', { name: 'Nova etiqueta' }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Promoção de verão')
    await page.getByRole('button', { name: 'Criar etiqueta' }).click()

    await expect(page.getByRole('cell', { name: 'Promoção de verão' })).toBeVisible()

    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Promoção de verão (editado)')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByRole('cell', { name: 'Promoção de verão (editado)' })).toBeVisible()

    await page.getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()

    await expect(page.getByText('Nenhuma etiqueta ainda. Crie uma para começar.')).toBeVisible()
  })
})
