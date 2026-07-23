import { Fragment, type ReactNode, type JSX } from 'react'
import { useAuth } from '../hooks/useAuth'

interface TenantBoundaryProps {
  children: ReactNode
}

const NO_SESSION_KEY = 'no-session'

/**
 * Remounts everything inside it whenever the authenticated user or tenant
 * changes identity - keyed on user+tenant, not tenant alone, so two
 * different users of the same tenant never inherit each other's visual
 * state either. This guarantees any state scoped to "the current session"
 * (open dialogs, in-progress forms, filters, pagination, in-flight
 * useAsync calls) is torn down instead of surviving into the next session,
 * even for a single frame - React unmounts the old key's subtree and its
 * effects synchronously as part of the same commit that changes the key.
 */
export function TenantBoundary({ children }: TenantBoundaryProps): JSX.Element {
  const { tenantContext } = useAuth()

  const key =
    tenantContext !== null ? `${tenantContext.user.id}:${tenantContext.tenant.id}` : NO_SESSION_KEY

  return <Fragment key={key}>{children}</Fragment>
}
