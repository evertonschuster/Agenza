import { Fragment, type ReactNode, type JSX } from 'react'
import { useAuth } from '@/features/auth/presentation/useAuth'

interface TenantBoundaryProps {
  children: ReactNode
}

const NO_SESSION_KEY = 'no-session'

// Keyed on user+tenant, not tenant alone, so two users of the same tenant
// never inherit each other's session-scoped state (open dialogs, filters).
export function TenantBoundary({ children }: TenantBoundaryProps): JSX.Element {
  const { tenantContext } = useAuth()

  const key =
    tenantContext !== null ? `${tenantContext.user.id}:${tenantContext.tenant.id}` : NO_SESSION_KEY

  return <Fragment key={key}>{children}</Fragment>
}
