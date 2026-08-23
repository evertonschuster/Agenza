# Phase 1 Data Model: OIDC-Authenticated Admin Shell Scaffold

All types below are client-side, in-memory only (no app-level persistence — see research.md "Storage"). They formalize the Key Entities from [spec.md](./spec.md) plus the supporting types needed to implement the Functional Requirements and Clarifications.

## Session

Represents the visitor's current authentication state (spec Key Entities; FR-001, FR-007, FR-009).

| Field | Type | Notes |
|---|---|---|
| `status` | `'unauthenticated' \| 'authenticating' \| 'authenticated' \| 'renewing'` | Drives whether authenticated routes render (FR-001) or redirect (FR-002). No separate `'expired'` value: per FR-009's fail-closed design, an expired token collapses directly into `'unauthenticated'` (see state transitions below) rather than being its own state with no distinct transition into it. |
| `accessToken` | `string \| null` | Opaque to the rest of the app beyond what's needed to call the generated API client; sourced from `oidc-client-ts`'s `User.access_token`. |
| `expiresAt` | `number \| null` | Unix ms timestamp; drives when silent renewal is attempted (FR-007). |
| `failureReason` | `'renewal_failed' \| 'identity_unreachable' \| 'missing_tenant_claim' \| null` | Set only in terminal failure states; see research.md Decision 8. Logged via `authEvents.ts` (FR-015), never shown to the user verbatim (generic "sign in again" copy). |

**State transitions**:

```text
unauthenticated --(login redirect completes)--> authenticating
authenticating --(token validated, has tenant_id claim)--> authenticated
authenticating --(token invalid / missing tenant_id claim)--> unauthenticated (failureReason: missing_tenant_claim)
authenticated --(token nearing expiry)--> renewing
renewing --(renewal succeeds)--> authenticated
renewing --(renewal fails)--> unauthenticated (failureReason: renewal_failed)
authenticated --(logout triggered)--> unauthenticated
authenticated --(access token expired, no valid stored session)--> unauthenticated
any state --(identity-service unreachable)--> unauthenticated (failureReason: identity_unreachable)
```

**Validation rules**:
- A session MUST NOT be considered `authenticated` unless the decoded access token has a well-formed `tenant_id` claim (FR-005, FR-009; Edge Case: token missing tenant claim → fail closed).
- `accessToken` and `expiresAt` MUST be re-derived from the token on every renewal — never patched in place — so a changed tenant claim is always picked up (Edge Case: tenant claim changes on renewal).

## Tenant Context

The organization scope resolved from the access token (spec Key Entities; FR-005, FR-006).

| Field | Type | Notes |
|---|---|---|
| `tenantId` | `string` (GUID) | Sourced **exclusively** from the validated access token's `tenant_id` claim. |

**Validation rules**:
- MUST NOT be constructed from, or overridden by, any URL query/route parameter, request body, or client-side storage value (FR-006; constitution Principle II) — even if such a value is present, it is ignored entirely, not merely deprioritized.
- Has no independent lifecycle — it is derived data recomputed from `Session` whenever the session changes (see relationship below), never stored or mutated on its own.

**Relationship**: `Tenant Context` is a pure derivation of `Session.accessToken`'s `tenant_id` claim — 1:1 with the current session, recomputed (not merged) on every renewal.

## Authenticated User

The principal identity returned by identity-service after login (spec Key Entities).

| Field | Type | Notes |
|---|---|---|
| `displayName` | `string \| null` | From the token/userinfo claims available at login; shown minimally in the shell layout (FR-004). |
| `email` | `string \| null` | From the token/userinfo claims, if present. |

**Validation rules**:
- Carries **no role or permission claims** in this feature (Clarifications, 2026-08-18, Q5) — any authenticated principal with a valid `tenant_id` claim is authorized identically. Do not add a `roles`/`permissions` field until a feature actually needs one.
- Profile management (editing name/email, avatar, etc.) is explicitly not part of this feature (spec Key Entities) — this type is read-only, sourced from the token/userinfo response.

## AuthEvent (supporting type, not a spec Key Entity)

The shape logged by `features/auth/authEvents.ts` to satisfy FR-015 (minimal local logging of auth/session lifecycle events).

| Field | Type | Notes |
|---|---|---|
| `type` | `'login_success' \| 'login_failure' \| 'renewal_failure' \| 'logout'` | One of the four lifecycle events FR-015 requires logging. |
| `timestamp` | `number` | Unix ms, set at log time. |
| `tenantId` | `string \| null` | Included when known, for correlating logs to a tenant without logging any other PII. |

**Validation rules**:
- MUST NOT include the raw access/refresh token or any other credential material.
- Logged via `shared/logger.ts` only (console/structured log) — no external transmission (research.md Decision 9).
