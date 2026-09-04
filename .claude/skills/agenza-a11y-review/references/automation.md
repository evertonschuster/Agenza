# The automated gate

Two runners, deliberately doing different jobs. Neither replaces passes 1–3; together they stop
regressions of things already fixed.

| Runner | Environment | Catches | Blind to |
| --- | --- | --- | --- |
| Vitest + `axe-core` | jsdom, no layout engine | roles, names, labels, ARIA validity, duplicate ids, list/table structure | anything needing geometry or colour |
| Playwright + `@axe-core/playwright` | real browser, real Aspire stack | the above **plus** contrast and target size | intent, focus order, announcements |

**The trap:** in jsdom, `color-contrast` and `target-size` cannot be evaluated, so axe returns them
as `incomplete`, never as `violations`. Asserting `violations === []` in a unit test therefore passes
on a screen with white-on-white text. Contrast and target size are only real in the Playwright run
and in the human pass.

## The unit helper

Lives in `src/test/a11y.ts` (spec task T121). Keep it ~15 lines over `axe-core` directly — a
third-party matcher wrapper buys nothing here and adds a dependency to keep current.

```ts
import axe from 'axe-core';
import { expect } from 'vitest';

export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const { violations } = await axe.run(container, { rules: { region: { enabled: false } } });
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}
```

Two decisions inside that shape:

- **Map to strings before asserting.** `expect(violations).toEqual([])` dumps an unreadable object
  graph on failure; the mapped form tells you the rule and the selector on the first line.
- **`region` off.** A component rendered on its own is not inside a landmark, so the rule fires on
  every component test. Leave it **on** for the Playwright run, where the landmark is real.

Apply it to the shell, to each overlay, and to the "Em breve" screens (T122).

### Gotchas that produce a false green

- **The container must be in the document.** `render()` from Testing Library attaches it; a manually
  constructed detached node makes axe find nothing and pass.
- **axe only sees what is rendered.** A closed dialog is not audited. Open it with `userEvent` first,
  then run the helper on `document.body`.
- **`await` it.** `axe.run` is async; a forgotten `await` produces a test that passes before the
  audit finishes.

## Assert the things axe cannot — this is the real gate

These belong in the *screen's* test. `src/shared/ui/**` is excluded from coverage, so a primitive's
accessibility contract is proved where the screen uses it, not by a ceremonial test on the primitive.

The four worth writing every time, because each guards a regression that reads as fine in code review:

```ts
// name-in-label: fails the moment a keycap stops being aria-hidden
expect(screen.getByRole('button', { name: 'Novo serviço' })).toBeInTheDocument();

// focus restore: the half of Esc-closes that gets dropped
const opener = screen.getByRole('button', { name: 'Novo serviço' });
await user.click(opener);
await user.keyboard('{Escape}');
expect(opener).toHaveFocus();
```

Plus: the route announcer's live region receives the new screen name, and with the shortcuts
preference off a `/` keypress changes nothing. Both are pure logic in `shared/`, which is where the
coverage gate actually measures.

Query by **role and accessible name**, never by test id, for anything a user perceives. A test that
finds a button by `data-testid` keeps passing after the label is deleted.

## The end-to-end audit

`e2e/a11y.spec.ts` (T123), against the real Aspire stack with the seeded login — same no-mocks rule
as the rest of `e2e/`. Reuse the login helper pattern already in `e2e/auth.spec.ts` rather than
re-deriving it.

Shape: for each theme, for each route, `analyze()` and assert no violations.

```ts
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
expect(results.violations).toEqual([]);
```

- **Seed the theme before the app boots**, with `page.addInitScript` writing the `admin-theme` key —
  the same key and the same `data-theme` attribute the identity-service login page uses. Setting it
  after `goto` audits the screen in the theme you were trying to leave.
- **Pin the tag list.** Left at the default, axe also runs its `best-practice` rules, which are
  opinions rather than conformance failures — a dependency bump then turns an unchanged screen red.
  Run best-practice separately when you want the advice.
- Contrast over a **gradient or image** comes back `incomplete`, not `pass` — axe cannot sample a
  background it did not compute. The brand panel is exactly that case: check it by eye in pass 2.
- The Playwright project runs serially (`workers: 1`, `fullyParallel: false`). Keep the matrix to the
  routes and the two themes; a per-component sweep belongs in Vitest.

## Where this runs

Inside the gates that already exist — the Vitest helper in `test:coverage`, the audit in
`test:e2e`. Do not add a separate a11y CI job; a gate nobody must pass is a gate nobody reads.
