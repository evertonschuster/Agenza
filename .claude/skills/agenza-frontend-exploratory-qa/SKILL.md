---
name: agenza-frontend-exploratory-qa
description: >
  Use to perform a review-only exploratory test of a frontend screen in a
  browser, covering functional behavior, failure paths, usability,
  accessibility, responsiveness, and user-visible security risks. Trigger on
  "test this screen", "exploratory QA", "review accessibility", "teste esta
  tela", or "faça um QA da interface". Produces an evidence-based pt-BR report
  and never edits code or performs destructive real-world actions.
---

# Frontend exploratory QA

## Establish safe scope

1. Read the root and frontend `AGENTS.md`. For the admin frontend, also read
   `../agenza-frontend-feature/references/page-ui-conventions.md`.
2. Identify the screen, intended user, expected primary flow, environment, test
   data, and explicit restrictions from the request and repository evidence.
3. Confirm that any state-changing test is safe for the identified environment.
   Never delete real data, send messages, make payments, change production
   state, or perform an irreversible action without explicit authorization.
4. If the environment or impact cannot be established, continue with read-only
   checks and report the blocked scenarios instead of assuming permission.

## Explore

- Map the visible controls, navigation, main path, loading, empty, success, and
  error states before interacting.
- Exercise the primary flow and safe alternatives: cancel, close, back, retry,
  refresh, duplicate submission, invalid input, boundary lengths, whitespace,
  accents, special characters, and interrupted or slow responses when the
  environment supports them.
- Check that expected failures preserve user input, explain recovery, and do not
  expose stack traces, secrets, tenant data, or unauthorized actions.
- Use keyboard-only navigation. Verify logical focus order, visible focus,
  accessible names, field-error association, dialog focus management, and
  operation without color alone.
- Inspect desktop and 375 px mobile layouts, zoom to 200% when practical, and
  check overflow, truncation, touch targets, overlays, tables, and virtual
  keyboard obstruction.
- Compare the refreshed state with the displayed state to catch stale,
  duplicated, or lost data.

Do not call an assumption a defect. Reproduce a suspected defect twice when it
is safe, record the exact observed result, and distinguish confirmed bugs,
risks, usability problems, and suggestions. Capture screenshots or other
objective evidence when the available browser tooling supports it.

## Report in pt-BR

Lead with an approval recommendation: approve, approve with reservations, or do
not approve. Then report:

1. Tested flows and untested scenarios with reasons.
2. Confirmed findings ordered by critical, high, medium, and low severity.
3. For each finding: category, reproduction steps, actual and expected result,
   user/business impact, evidence, recommended fix, and verification criterion.
4. Accessibility, responsiveness, and UX observations that are not confirmed
   functional bugs.
5. The five highest-priority follow-ups, balancing impact, frequency, and fix
   effort.

This skill is diagnostic. Do not edit code during the QA pass; implementation
requires a separate explicit request and the frontend feature skill.
