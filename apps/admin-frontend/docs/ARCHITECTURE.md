# admin-frontend — Architecture

The current design of the frontend. Read the section related to the change; the why and the
rejected alternatives are in [decisions/frontend.md](../../../docs/decisions/frontend.md).

## 1. Shape

| Layer               | Responsibility                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `app/`              | Providers, routes and shell composition; placeholders without business capability                 |
| `features/<slice>/` | A business slice with `model/`, `api/`, `application/` (use cases), `ui/` and a public `index.ts` |
| `widgets/`          | Reusable screen compositions, with behavior and without domain                                    |
| `shared/`           | Cross-cutting infrastructure, shared values and primitives without business rules                 |

The direction is `app → features → widgets → shared`. Widgets may compose other widgets without
cycles. Outside a slice, consumers import only its barrel `features/<slice>/index.ts`. Inside it,
the usual direction is `ui → application | model | api`, `application → api | model` and
`api → model`; domain types belong to `model/`, not to
the transport layer.

The [agenza/layer-boundaries](../eslint-rules/layerBoundaries.js) rule, enabled in
[ESLint](../eslint.config.js), checks imports into higher layers and external access that bypasses
the barrel. It covers files in the four layers; it does not check direction between segments inside
a slice, cycles, `src/main.tsx`, support tests outside those layers or configuration. Those limits
stay with review. The OIDC adapter
[sessionDriver](../src/features/auth/model/sessionDriver.ts) has an intentional `model → api`
dependency inside auth; the shared session core does not know OIDC
([decisions/platform.md](../../../docs/decisions/platform.md)).

### Pages, routes and lists

A page has its folder `ui/pages/<Page>/`: the presentation component, its own hook when there is
state or effects, and the hook's types in a sibling file when needed. Subcomponents get
`components/` when their content justifies the split.

To decide where a piece of a slice's `ui/` lives, follow this order and stop at the first match:

1. **Opens by route** (has its own URL): `ui/pages/<Page>/`, even when it shows as a dialog.
2. **Opens from code**, without a URL, and is used outside a single page: `ui/dialogs/<Dialog>/`,
   with hook, types and tests, like a page.
3. **Does not open by itself** and is used by more than one consumer in the slice (page or dialog)
   or exported by the barrel: `ui/components/<Component>/`, with its types and tests. What exists
   only because of it stays in the same folder; internal parts go down to `components/`.
4. **Serves a single page**: in that page's `components/`. A form with a single entry stays in the
   page and moves up to `ui/components/` when it gets a second one.

An entity that can also be created from a selector repeats the tags design: the quick dialog
`<Entity>CreationDialog` in `dialogs/`, exported by the barrel, and the shell, validation and fields
in `components/<Entity>Form/`, also used by the route page. Each entry keeps its own hook: the route
loads by id and closes by navigating; the dialog receives the typed text and returns the created
item.

Page hooks are not a shared business layer; context accessors, generic widget hooks and utilities
such as [useCloseRoute](../src/shared/hooks/useCloseRoute.ts) are reusable.

No page uses a `loader` or `action` today; one that does keeps them in `route.ts`, re-exported by the
barrel for [app/routes.tsx](../src/app/routes.tsx). A blocking loader keeps the page from showing its
own loading state.

[usePaginatedList](../src/widgets/paginated-list-section/use-paginated-list.ts) receives the
controlled state and the repository. The hooks of
[Pessoas](../src/features/clients/ui/pages/ClientListPage/useClientListPage.ts) and
[Etiquetas](../src/features/tags/ui/pages/TagListPage/useTagListPage.ts) supply that state with
[useSearchParamsState](../src/shared/hooks/useSearchParamsState.ts): applied filters, page and size
are read from the query string on mount, and their changes are written with `replace` on the route
that owns the list.

The widget requests data on actions, on mount and when correcting a page past the end. An effect
keyed on the query does not trigger requests. A new action cancels the previous request; cancelled
answers do not replace the current one. `refetch` keeps the rows while it is pending, including when the feature's topics call it; a failed
answer replaces them with the error. The hook derives loading/error/success from the
answer; an empty list is recognized only after a success.

Filter bars are React Hook Form forms with `SearchField` and `SelectField`
(`labelPlacement="inline"`); a Buscar button applies every filter. Deleting is a dialog route over
the list, opened by the row's trash icon, and closes with `useCloseRoute`. A menu link to a list goes
to the path without filters; forms and dialogs go back with `navigate(-1)`.

### Components and forms

A primitive in `shared/ui/<name>/` exposes its `index.tsx`. Its own types may live in
`<name>.types.ts`; types derived from styles stay with whatever defines the styles. `components/` is
for coupled parts or a rendering whose split improves reading. Trivial parts may share a primitives
file; do not create a file per element. Reassess the whole composition when changing it, without
refactoring independent areas out of obligation.

Use early returns for variants and keep discriminated unions until the point where they narrow. A
shared props base is justified when three or more sibling types repeat the same fields. Props needed
for an accessible name are required when the component has no other source for that name. Remove
type variants without an implementation, and test the observable effect of a prop, not only that it
is accepted.

[Base UI](../components.json) is the primitives' base; its composition uses `render`. Use semantic
tokens and the attribute-resolved theme, keeping an explicit theme choice and contrast. Primitives
may own interaction and accessibility behavior; reusable screen compositions live in widgets.

Forms use React Hook Form and Zod with the controls in `shared/form/fields/`; the visual frame lives
in `shared/ui/form-field/`. A field's props type lives in the field's file in `components/`, derived
from the primitive it renders; `fields.types.ts` keeps only the pieces several fields share and
imports nothing from `shared/ui`. The specific recipes belong to the
[form skill](../../../.claude/skills/agenza-form-field/SKILL.md). Picking several `{ id, name }`
options loaded from the backend, with search and pages, uses
[SearchSelect](../src/shared/ui/search-select/search-select.tsx) with the feature's paged call; in a
form, `SearchSelectField` ([decisions/frontend.md](../../../docs/decisions/frontend.md)). The
optional `creation` offers creating the item right there; the feature draws the creation and returns
the item, which enters selected. A creation dialog passes the `finalFocus` it receives to
`DialogContent`, so focus returns to the search. `SelectField` stays for the plain `Select`.
Routes are pt-BR like the product text; `/tags` and its children (`new`, `:id/edit`, `:id/delete`) are an existing exception, and renaming a URL needs
its own product change.

## 2. Talking to the backend

| Source                                                          | Responsibility                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| [generateApiTypes.mjs](../scripts/generateApiTypes.mjs)         | OpenAPI types and date-field metadata; does not generate a facade |
| [apiClient.ts](../src/shared/api/apiClient.ts)                  | openapi-fetch client, current credentials and session headers     |
| [servicesFacade.ts](../src/shared/api/servicesFacade.ts)        | Version, envelope, failure normalization and `ApiResult<T>`       |
| [servicesApi.ts](../src/shared/api/servicesApi.ts)              | Client composition with the shared credentials source             |
| [tagsRepository.ts](../src/features/tags/api/tagsRepository.ts) | Example of typed delegation between a feature and the facade      |

A repository does not repeat token, tenant, version, envelope or exception handling. Domain types
belong to the frontend; an explicit mapping is needed only when the domain shape and the answer
differ. Return annotations keep the structural check against the generated contract.

`servicesApi` resolves with an `ApiResult` on success and on failure. For HTTP rules read
[docs/API.md](../../../docs/API.md); for the outcomes actually normalized read
[servicesFacade.ts](../src/shared/api/servicesFacade.ts).

`unwrapOrThrow` in [unwrap.ts](../src/shared/api/unwrap.ts) has no production caller; it is reserved
for a loader or `queryFn` that signals errors by rejection. Mutations and
actions keep expected failures as values, which keeps validation in the form instead of turning it
into an error screen.

[formErrors.ts](../src/shared/api/formErrors.ts) and
[applyApiProblem.ts](../src/shared/form/applyApiProblem.ts) take API errors to the form fields; the
procedure is in the
[form skill](../../../.claude/skills/agenza-form-field/SKILL.md).

Surfaces use the messages and codes of the normalized `ApiProblem` and keep its representation in
list errors, dialogs, banners and toasts.

### Related records in confirmations

The [ConfirmDialog](../src/widgets/confirm-dialog/index.tsx) shows the related records of any
failure, without configuration by the feature, and every block offers an explicit retry. The
[reader](../src/widgets/confirm-dialog/related-records.ts) is the only source of those records:
known groups (`Clients`, `Services`) with `meta.id` and `meta.name`, without a limit of its own; an unknown group with the problem's code shows as
“Outros vínculos”. Labels and routes come from the list of known groups, never from the metadata,
and nothing is inferred from the message text. The person edit path lives in
`shared/routes/clientPaths.ts` so Etiquetas can use it without depending on Pessoas.

## 3. Auth & tenancy

OIDC Authorization Code + PKCE uses identity-service and oidc-client-ts. The
[authClient](../src/features/auth/api/authClient.ts) configures the integration; the
[sessionDriver](../src/features/auth/model/sessionDriver.ts) adapts its events to the session
machine. The core in `shared/session/` depends on neither React nor the provider. AuthProvider
exposes its snapshot to React through context and a store subscription.

The client decodes `tenant_id` from the access token for routing; it does not verify the signature.
Security is in the backend, which validates the token and the header match. Never resolve the tenant
from a URL, a query or an independent value in localStorage. The library persists the OIDC user in
localStorage for reuse across tabs ([decisions/platform.md](../../../docs/decisions/platform.md));
that does not make it an authorization source.

The HTTP client reads credentials on every call and fails closed when the token or tenant is missing.
The generator removes the tenant header parameter from the types so features do not supply it by
hand. These frontend protections complement the
[server boundary](../../../docs/decisions/platform.md).

### Session identity changes

The machine compares subject and tenant on renewal. An identity change clears credentials, aborts
the request scope and unmounts protected state until an explicit login. The OIDC adapter rejects late
events and tries to remove the persisted user; a failure in that cleanup is logged without restoring
the blocked session's credentials. The HTTP client combines session and consumer cancellation. An
HTTP answer for an invalid session does not change the OIDC snapshot by itself; that handling is not
shared yet, so do not duplicate it in each list. The
implementation is in the [sessionStore](../src/shared/session/sessionStore.ts) and
[decisions/platform.md](../../../docs/decisions/platform.md).

## 4. Principles

- Reuse a composition when there is a concrete need; `entities/`, a global pages layer or a mapper
  are not prerequisites of a feature.
- After an async mutation, check the lifecycle before navigating, closing the page or applying local
  UI effects. Use-case topics may be published after success even if the page has unmounted. HTTP
  cancellation does not replace the protection against late completion.
- Each mutation publishes its own topic (`xCreated`, `xUpdated`, `xDeleted`), never a shared
  `xSaved`, even with no listener at the moment.

## 5. Toolchain & gates

Unit and component tests live next to the code, with Vitest, RTL and module mocks; Playwright and
the contract/OIDC check use the real Aspire stack.
