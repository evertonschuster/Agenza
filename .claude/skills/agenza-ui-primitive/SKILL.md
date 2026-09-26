---
name: agenza-ui-primitive
description: Use when adding, replacing or restyling anything under apps/admin-frontend/src/shared/ui/ — running `npx shadcn add`, writing a cva variant, wiring a Base UI part, choosing between semantic tokens, rendering a backend-supplied tag colour, or deciding whether a control gets a resting keycap.
---

# Adding or changing a primitive in `shared/ui/`

`src/shared/ui/` is **owned source**, not a dependency. Presentational only: no business rule, no
`features/` import, no API call. Anything with behaviour worth testing does not belong here (§6).

Architecture: [`docs/ARCHITECTURE.md`](../../../apps/admin-frontend/docs/ARCHITECTURE.md) §1.
Decisions driving this layer: [`specs/002-ui-foundation/plan.md`](../../../apps/admin-frontend/specs/002-ui-foundation/plan.md) D1, D4, D5;
folder-per-component convention: [`specs/005-shared-ui-component-folders/`](../../../apps/admin-frontend/specs/005-shared-ui-component-folders/).

**Every component under `shared/ui/` is a folder**, not a flat file — `<name>/index.tsx`, with
`<name>.types.ts` and a `components/` subfolder only when there's real content for either. Full
criteria and rationale live in `docs/ARCHITECTURE.md` §1; not repeated here.

**The `components/` check is not a one-time gate at creation — it reruns on every edit.** A render
branch, prop, or conditional added to an existing `index.tsx` is judged against the file's whole
current shape, not just the diff adding it. `list-section` grew loading/error/empty/table/list all
inline across five same-day commits before anyone re-asked the question — don't repeat that. When a
change pushes an existing `index.tsx` past §1's criteria, default to extracting into `components/`,
not to leaving it inline "for now."

**§1 also covers the shape *inside* `components/`, not just when to create the folder** — general
rules, not tied to any one component: early returns over a mutable accumulator, passing a
discriminated union whole instead of destructuring it in the parent, extracting a shared prop base at
three-plus repeats, no dead literal-union values, required over optional for accessible-name props,
and asserting a prop's effect instead of just its presence in tests. Read §1 before writing the render
logic or the prop types for a new sub-part, not only before deciding whether it gets its own file —
`list-section` (§5 in ARCHITECTURE.md) is one worked trail through those rules, not the boundary of
where they apply.

## 0. Base UI, not Radix — read this before pasting anything

The primitive layer is `@base-ui/react` (ADR 0039). **A Radix snippet from a tutorial does not
compile here.** Radix composes with `asChild` + `Slot`; Base UI composes with a `render` prop.

```tsx
<Button asChild>                       {/* Radix — no `asChild` prop exists */}
  <Link to="/agenda">Agenda</Link>
</Button>

<Button render={<Link to="/agenda" />}>Agenda</Button>   {/* Base UI */}
```

**Switching the docs site's tab to "Base UI" does not change what `npx shadcn add` fetches.** The
CLI still defaults to Radix (`style: "new-york"`) regardless of which tab you're reading. What
actually selects Base UI is `components.json`'s `"style"` field: it's set to `"base-nova"` (Base UI
+ the Nova preset, which is Lucide-based — matches this repo's icon choice) and **must stay that
way**. Style names follow `{library}-{preset}`; every `add` then resolves against
`https://ui.shadcn.com/r/styles/base-nova/{name}.json`. If a component ever shows up importing
`@radix-ui/*`, check `components.json`'s `style` before anything else.

`src/shared/ui/button/index.tsx` is the reference for the cva + `data-slot`/`data-variant`/`data-size`
conventions — read it for those, never for `asChild` (retired with T052; `radix-ui` is fully
removed from `package.json`).

## 1. Check whether it already exists

Look in `src/shared/ui/` and grep for the role, not the name (`grep -ri "role=\"dialog\"" src/shared/ui`
still searches every component's folder). **Prefer a new cva variant on an existing primitive over a
new file.** A second button-shaped component is the most common wrong answer here.

## 2. Add it with the CLI, from `apps/admin-frontend/`

```
npx shadcn@4.21.0 add <name>
```

Pinned, not `@latest` — an `npx` run on an unpinned package fetches whatever the registry serves at
that moment, which is a supply-chain risk for a command every contributor and agent runs. Bump the
pin deliberately (check the changelog first), don't drop back to `@latest`.

The pin covers the CLI version, not the component JSON it fetches from the registry at generation
time — the CLI doesn't verify a signature or hash on that response. Review the diff before
committing generated output, same as any other dependency-sourced code; don't treat the command's
exit code as proof the files are safe to commit unread.

`components.json` remaps components to `@/shared/ui` and hooks to `@/shared/hooks`. Do not hand-copy
files from the docs — you lose that rewrite and end up with `@/components/ui` imports that fail the
path check.

**The CLI writes a flat file, not a folder.** `components.json` predates the folder-per-component
convention and still targets `shared/ui/<name>.tsx` directly. After `add` finishes, move its output
into `shared/ui/<name>/index.tsx` yourself before the typing/style passes below — otherwise you're
back to the flat layout the rest of `shared/ui/` deliberately moved away from. Only split out
`<name>.types.ts` or a `components/` subfolder if the generated file actually earns one by the
criteria in `docs/ARCHITECTURE.md` §1 — most single-component `add` output doesn't, and stays a
folder with just `index.tsx` (same shape as `avatar/`, `badge/`, `kbd/`).

**`cn` is not rewritten to `@/shared/lib/utils` by the CLI.** Every `base-nova` file imports
`from "cn"` — a real, wrong npm package the CLI also adds to `package.json` (`"cn": "^0.2.5"`). This
repo handles it with an alias instead of a per-file fix: `vite.config.ts`, `vitest.config.ts` and
`tsconfig.json`'s `paths` all redirect the bare specifier `"cn"` to `src/shared/lib/utils.ts`, so a
freshly generated file works as-is. Still run `npm uninstall cn` after an `add` — the alias makes the
import resolve correctly, but the stray dependency in `package.json` is real and wrong. For
consistency with the rest of the codebase, also rewrite the import to `'@/shared/lib/utils'` by hand
(a new file that's the only one in the repo saying `from "cn"` is a readability smell, even once it
compiles).

Two more things to verify right after: the CLI did **not** add `radix-ui` back to `package.json`, and
any icon it pulled comes from `lucide-react`. If you added or bumped a dependency, regenerate
`package-lock.json` in a Linux container:
`docker run --rm -v "$PWD:/w" -w /w node:22.23.2@sha256:8a34c4ab3ea2c5cd194f07e317b2a8f09461d3c8b05c4e34c8ccd56d56024c4d sh -c "npm install -g npm@12.0.2 && npm install --package-lock-only --ignore-scripts --allow-remote=all"`
from the monorepo root — regenerated on Windows, `npm ci` breaks CI on `@tailwindcss/oxide` native
bindings. The `--allow-remote=all` and the `npm@12.0.2` pin are both load-bearing: npm 12 defaults to
blocking the cross-platform optional-dependency fetches this step exists to capture, and the `node:22`
image's stock npm 10 crashes outright on this workspace's dependency graph. The `sha256` pin is
deliberate (a bare `node:22` is mutable) and needs an occasional manual refresh — full rationale in
[`AGENTS.md`](../../../apps/admin-frontend/AGENTS.md).

## 3. The typing pass — expect it on every component

`exactOptionalPropertyTypes` is on. Generated components spread props through, so an optional prop
whose value may be `undefined` **fails to assign**. This is routine, not occasional:

```tsx
type KbdProps = { keys: string[]; tone?: 'muted' | 'brand' };
<Kbd keys={keys} tone={maybeTone} />   // Type 'undefined' is not assignable to '"muted" | "brand"'
```

Write the `| undefined` explicitly: `tone?: 'muted' | 'brand' | undefined`.

Two more that bite generated files: `verbatimModuleSyntax` (a type import must say `import type` /
`{ type X }`) and `noUncheckedIndexedAccess` (`keys[0]` is `string | undefined`).

Then strip what the generator adds and the repo forbids: **no JSDoc, no "what" comments.**

## 4. The style pass — semantic tokens only

`bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, `ring-ring`. **A raw palette
class (`bg-neutral-900`, `text-white`, `#hex`) breaks theme portability** — it will not flip with
`data-theme` and it will look wrong in one of the two themes.

Dark is an **attribute** variant, not a media query. Writing `@media (prefers-color-scheme: dark)`
in a component breaks explicit light-on-a-dark-OS, which is a supported state.

**A freshly generated overlay's `animate-in`/`fade-in-0`/`zoom-in-95`/`slide-in-from-*` classes do
nothing** — they're `tw-animate-css` classes, and plan.md's D3 deliberately keeps that dependency
out. Convert them to the zero-dependency pattern `Sheet` and `Toast` already ship with: `transition`
plus Base UI's own `data-starting-style` / `data-ending-style` attributes. Don't add `tw-animate-css`
to make the stock classes work — rewrite the class list instead. Details and worked examples:
[`references/tokens.md`](references/tokens.md#transitions-on-overlays).

Full token system, focus ring, dark elevation, and the backend-hex technique: also in
[`references/tokens.md`](references/tokens.md).

## 5. If it is an action — pick its keycap tier

A **resting** keycap only on a control that occurs at most once per screen: the header search, the
screen's single primary CTA, a dialog's confirm. Everything else is tooltip on hover **and** focus,
or palette/help-sheet only. **Never** on destructive actions reached directly, row actions, or nav
items — the exception is a confirmation dialog's confirm, which may carry a **modified** key
(`ConfirmDialog`: `Ctrl/⌘+Delete`); see `references/interaction.md`.

The keycap is **derived from the shortcut registry**, never typed by hand — there is no `shortcut`
prop on the generic `Button`. A control that advertises a shortcut is an **`ActionButton`**
(`shared/ui/action-button`) or a **`LinkButton`** (`shared/ui/link-button`) given the registry id:

```tsx
<ActionButton icon={Plus} shortcutId="novo-servico" onClick={announceComingSoon}>Novo serviço</ActionButton>
<ActionButton type="submit" pending={isSaving} disabled={!canSubmit} shortcutId="salvar-etiqueta">…</ActionButton>
<LinkButton to={newTagTo} icon={PlusIcon} shortcutId="nova-etiqueta">Nova etiqueta</LinkButton>
```

Both read the shortcut from the registry by that id, so an id nobody registered renders no keycap
and no `aria-keyshortcuts` — advertising a key that does nothing is structurally impossible. The
registration itself (`useShortcut`) stays with whoever owns the action (a page hook, the command
palette); the button only advertises it. `ActionButton` also owns the pending look — `pending`
swaps the icon for a spinner and disables the button — so a "Salvar"/"Excluir" in flight looks the
same everywhere.

Accessible name, non-negotiable: `<kbd aria-hidden="true">` inside the button plus
`aria-keyshortcuts` on the button. `role="presentation"` does **not** work — name-from-content still
traverses the subtree, and the button announces as "Novo serviço N". Both components already do
this; hand-rolling `aria-keyshortcuts` + a `<Kbd>` on a plain `Button` is how two call sites once
lost the attribute. For the same reason the shortcut-aware keycap is not exported on its own — a
standalone `ShortcutKbd` kept that path looking sanctioned and was removed (ARCHITECTURE.md §5);
don't bring it back. `Kbd` stays the plain visual primitive.

Tiers, tooltip rules under WCAG 1.4.13, `event.key` vs `event.code`, focus:
[`references/interaction.md`](references/interaction.md).

## 6. Tests and coverage

**Coverage measures logic, not cva markup** — but the exclude list in `vitest.config.ts` is by
file name, not a blanket `src/shared/ui/**`, and which files are on it changes over time. Don't
assume a new primitive is exempt from coverage; read the exclude list itself, or D5 in
`specs/002-ui-foundation/plan.md` for the current reasoning, before skipping its tests.

The exclusion is not permission to skip testing behaviour. It is the boundary that tells you where
behaviour belongs: **anything with logic goes in `shared/` proper** (`shared/theme/`,
`shared/keyboard/`, a hook), where it is measured, and the primitive stays a dumb renderer of it.
A test is still worth writing for an accessible name that a regression could silently break.

**Assert the effect a prop causes, not just that passing it doesn't crash.** A test that renders with
`align: 'end'` but never checks that anything actually right-aligned isn't testing `align` — it's
testing that the component tolerates an extra prop. Query for the thing the prop is supposed to
change (a class, an attribute, an accessible name) and assert on that directly.

## 7. Before you push

`npm run lint && npm run format:check && npm run build && npm run test:coverage`, from
`apps/admin-frontend/`. New visible strings are pt-BR; identifiers stay English. Every interactive
control has an accessible name; decorative icons carry `aria-hidden`. If this change touched an
existing component's `index.tsx` or anything in its `components/` folder, re-read the whole component
— render logic, prop types, and tests — against §1's guidance before committing, not just the lines
you changed.
