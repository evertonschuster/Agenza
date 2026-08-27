import { useLoginRedirect } from './useLoginRedirect';

/** `/login` route. Renders nothing — identity-service owns the actual login UI; this page
 * only bounces the visitor into the OIDC authorize flow (contracts/routes-contract.md). */
export function LoginPage() {
  useLoginRedirect();
  return null;
}
