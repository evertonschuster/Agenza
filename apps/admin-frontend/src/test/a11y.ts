import axe from 'axe-core';
import { expect } from 'vitest';

// jsdom has no layout engine, so axe can never decide these — it returns them as `incomplete`,
// not `violations`, and asserting on `violations` alone silently never checks them. Real coverage
// for all four lives in e2e/a11y.spec.ts, against a real browser. The last two aren't obviously
// geometry-dependent by name, but every Base UI overlay (Dialog, Sheet, Combobox, Menu, Tooltip)
// trips them the same way: `aria-hidden-focus` can't confirm a clip-path-hidden focus-guard span
// is really untabbable without computed layout, and `aria-valid-attr-value` can't confirm an
// aria-controls target is relevant/visible without it either — even though, checked directly, the
// referenced id does exist in the DOM.
const UNDECIDABLE_IN_JSDOM = [
  'color-contrast',
  'target-size',
  'aria-hidden-focus',
  'aria-valid-attr-value',
];

export async function expectNoA11yViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: Object.fromEntries(UNDECIDABLE_IN_JSDOM.map((id) => [id, { enabled: false }])),
  });
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.failureSummary),
  }));
  expect(violations).toEqual([]);

  const unexpectedIncomplete = results.incomplete
    .filter((item) => !UNDECIDABLE_IN_JSDOM.includes(item.id))
    .map((item) => item.id);
  expect(unexpectedIncomplete).toEqual([]);
}
