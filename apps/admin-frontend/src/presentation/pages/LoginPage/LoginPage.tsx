import { useState, type JSX } from 'react'
import { useAuth } from '../../hooks/useAuth'

/**
 * The entry point for unauthenticated users. A single action triggers
 * the OIDC redirect to IdentityServer - there is no username/password
 * form here since authentication is fully delegated to the identity
 * provider.
 */
export function LoginPage(): JSX.Element {
  const { login } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  async function handleSignIn(): Promise<void> {
    setIsRedirecting(true)
    await login()
    // If login() resolves without redirecting (e.g. in a test or if
    // IdentityServer rejects the initiation), reset the button state so
    // the user can try again.
    setIsRedirecting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
          {/* Branding */}
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold tracking-widest text-teal-700 uppercase">
              Receptionist AI
            </span>
            <h1 className="mt-3 text-2xl font-semibold text-slate-800">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage your appointments and clients.
            </p>
          </div>

          {/* Action */}
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={isRedirecting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRedirecting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Access is limited to registered businesses.
        </p>
      </div>
    </div>
  )
}
