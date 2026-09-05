import axe from 'axe-core';
import { expect } from 'vitest';

export async function expectNoA11yViolations(container: Element): Promise<void> {
  const { violations } = await axe.run(container);
  const summary = violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.failureSummary),
  }));
  expect(summary).toEqual([]);
}
