# The ui segment: page shells, per-page hooks, route.ts

Authoritative source: [`docs/ARCHITECTURE.md`](../../../../apps/admin-frontend/docs/ARCHITECTURE.md)
§1 ("Route pages are shells") and §4. Live examples:
`src/features/auth/ui/pages/LoginPage/` and `src/features/auth/ui/pages/AuthCallbackPage/`.

## One folder per route

```
ui/pages/<Page>/
├── <Page>.tsx        shell — renders, branches on what the hook returns
├── use<Page>.ts      this page's own state and effects
├── route.ts          loader / action
├── components/       created only when this page actually grows sub-components
└── <Page>.test.tsx   colocated
```

`components/` is not scaffolding you create up front. A sub-component that a second page needs is a
sign it belongs in `shared/ui/` (see `agenza-ui-primitive`) — not in a sibling page's folder.

## The shell rule

`<Page>.tsx` contains **no `useState`, no `useEffect`, no `useRef`**. It calls its hook, then renders.
`LoginPage.tsx` is three lines and `AuthCallbackPage.tsx` is a hook call plus one `<Navigate>` — that
is the target, not an accident of them being small.

The reason is testability and the StrictMode class of bug. Both existing hooks carry a
double-invoke guard (`useLoginRedirect.ts` protects the PKCE write; `useAuthCallback.ts` protects the
single-use code) with a terse *why* comment. That guard has to live somewhere it can be unit-tested
without rendering a route tree — the hook. Spread across a component body, it becomes a race you
rediscover in production.

**Hooks are never shared between pages.** The one exception is a pure Context accessor like
`useAuth`. If two pages want the same behaviour, extract the *pure* part into `model/` as a plain
function and let each hook call it. A `useSharedThing` imported by two pages is the smell that ends
with one page's lifecycle quietly driving another's.

Repo rule, no exceptions: no "what" comments, no JSDoc. A short "why" is allowed only for a genuine
race or a non-obvious constraint — the two guards above are the whole standard.

## route.ts

`loader` and `action` live here and are re-exported by the slice barrel, so `app/routes.tsx` imports
`@/features/<slice>` and the direction stays `app → features`. Nothing implements this yet; you are
the first.

```ts
// ui/pages/ClientsPage/route.ts
import { unwrapOrThrow } from '@/shared/api/unwrap';
import { clientRepository } from '../../../api/clientRepository';

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams.get('busca') ?? '';
  return { clients: unwrapOrThrow(await clientRepository.list({ search })) };
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const result = await clientRepository.create(toCommand(form));
  return result.ok ? redirect(`/clientes/${result.data.id}`) : result;
}
```

Note the asymmetry, and keep it: the `loader` unwraps, the `action` returns the `Result`. Details in
[api-integration.md](api-integration.md).

Server data reaches the shell through `useLoaderData()` / `useActionData()` / `useNavigation()`.
Copying loader data into `useState` on mount is the mistake that reintroduces every staleness bug
router revalidation exists to prevent.

Then in the barrel:

```ts
export { ClientsPage } from './ui/pages/ClientsPage/ClientsPage';
export { loader as clientsLoader, action as clientsAction } from './ui/pages/ClientsPage/route';
```

`app/routes.tsx` imports those from `@/features/<slice>` — never from the file path.

## Rendering

- Primitives from `shared/ui/`, built on Base UI, which composes through a **`render` prop**. Radix's
  `asChild` + `Slot` is gone
  ([ADR 0039](../../../../docs/adr/0039-admin-frontend-base-ui-primitives.md)) — a snippet copied
  from a shadcn/Radix tutorial will not compile, and the fix is the `render` prop, not a cast.
- Semantic tokens only: `bg-background`, `text-muted-foreground`, `border-border`. A raw palette
  class breaks light/dark/system, which is a real three-state theme in `shared/theme/`.
- Every interactive control needs an accessible name; decorative icons take `aria-hidden`. Prefer the
  primitive's own keyboard behaviour to a hand-written key handler. Run `agenza-a11y-review`.
- A resting `<kbd>` keycap belongs only on a control that occurs at most **once per screen** — the
  header search, the screen's single primary CTA, a modal's confirm. Row actions, nav items and
  anything destructive get tooltip-on-hover-and-focus or the palette's right rail instead. The keycap
  is `<kbd aria-hidden>` plus `aria-keyshortcuts` on the button; never inside `aria-label`.
- Shortcut matching uses `event.key`, never `event.code` — ABNT2 keyboards.
- All visible strings pt-BR, including empty states and error copy; key names (`Ctrl`, `Esc`,
  `Enter`) are not translated. See `agenza-ptbr-copy`.

## Error and pending states

A thrown `ApiProblemError` from the loader is handled by the route `errorElement` —
`src/app/AppRouteError.tsx` already renders `problem.title` and logs the `code`. Do not add a
per-page `try/catch` to duplicate it. Pending UI comes from `useNavigation()`, not from a
hook-owned `isLoading` flag you set yourself.

## Testing a page

Render through a memory router so `loader`/`action` and `useNavigation` behave as in production;
assert on accessible names and visible pt-BR copy rather than test ids. Mock at the module boundary
(`vi.mock` of the repository or `servicesApi`), never at the network. The hook gets its own test for
the guard and branch logic — that is where the coverage gate is actually satisfied, since
`shared/ui/` and the slice barrel are excluded from coverage. See `agenza-testing`.
