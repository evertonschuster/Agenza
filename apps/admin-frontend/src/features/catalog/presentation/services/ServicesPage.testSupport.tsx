import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServicesPage } from '@/features/catalog/presentation/services/ServicesPage'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { AuthProvider } from '@/features/auth'
import type { AppContainer, CatalogFacade } from '@/app/composition/container'
import { Service } from '@/features/catalog/domain/entities/Service'
import { Category } from '@/features/catalog/domain/entities/Category'
import { Tag } from '@/features/catalog/domain/entities/Tag'
import { Tenant } from '@/test/fixtures/authEntityFixtures'
import { User } from '@/test/fixtures/authEntityFixtures'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'

export const tenant = Tenant.create('tenant-123')
export const tenantContext = { tenant, user: User.create({ id: 'user-1', tenant }) }
export const massagemService = Service.create({
  id: 'service-1',
  code: 1001,
  name: 'Massagem relaxante',
  description: 'Uma massagem relaxante de corpo inteiro',
  durationMinutes: 60,
  minDurationMinutes: 30,
  maxDurationMinutes: 90,
  price: 150,
  maxDiscountPercentage: 10,
  categoryId: 'category-1',
  categoryName: 'Massagens',
  tags: [{ id: 'tag-1', name: 'VIP', color: '#0d9488' }],
})
export const massagensCategory = Category.create({ id: 'category-1', name: 'Massagens' })
export const vipTag = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })

export function buildContainer(overrides: Partial<CatalogFacade> = {}): AppContainer {
  return createFakeAppContainer({
    auth: { getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) } },
    catalog: {
      listServices: {
        execute: vi.fn(() =>
          Promise.resolve({ services: [massagemService], totalCount: 1, page: 1, pageSize: 20 }),
        ),
      },
      createService: { execute: vi.fn(() => Promise.resolve(massagemService)) },
      updateService: { execute: vi.fn(() => Promise.resolve(massagemService)) },
      deleteService: { execute: vi.fn(() => Promise.resolve()) },
      listCategories: { execute: vi.fn(() => Promise.resolve([massagensCategory])) },
      createCategory: { execute: vi.fn(() => Promise.resolve(massagensCategory)) },
      updateCategory: { execute: vi.fn(() => Promise.resolve(massagensCategory)) },
      deleteCategory: { execute: vi.fn(() => Promise.resolve()) },
      listTags: { execute: vi.fn(() => Promise.resolve([vipTag])) },
      createTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      updateTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      deleteTag: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  })
}

export function renderServicesPage(container: AppContainer): HTMLElement {
  return render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <ServicesPage />
      </AuthProvider>
    </AppContainerContext.Provider>,
  ).container
}

// The InlineCreatePopover's content is portaled to document.body as a
// sibling of the dialog, not a DOM descendant of it, so its fields must be
// queried through this scoped container rather than `within(dialog)`.
export function getPopoverContent(title: string): HTMLElement {
  const heading = screen.getByText(title, { selector: 'p' })
  const content = heading.closest('[data-slot="popover-content"]')
  if (content === null) {
    throw new Error(`Expected the "${title}" popover to be open`)
  }
  return content as HTMLElement
}
