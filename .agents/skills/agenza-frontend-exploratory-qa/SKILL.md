---
name: agenza-frontend-exploratory-qa
description: >
  Use for review-only browser QA of an Agenza frontend screen, covering
  functional behavior, failures, usability, accessibility, responsiveness, and
  visible security risks. Produces an evidence-based pt-BR report.
---

# Frontend exploratory QA

Read root/frontend instructions and the UI conventions reference. Establish the
screen, user, environment, test data, and allowed state changes from the request
and repository evidence. When impact is unclear, continue read-only and report
blocked destructive scenarios.

## Explore

- Map controls, navigation, loading, empty, success, and error states.
- Exercise the main flow plus cancel/back/retry/refresh, duplicate submission,
  invalid/boundary input, whitespace, accents, and safe interrupted responses.
- Verify failed actions preserve useful input, explain recovery, and expose no
  stack trace, secret, or tenant data.
- Test keyboard order, visible focus, accessible names, error association,
  dialog focus, and non-color cues.
- Check desktop, 375 px mobile, and 200% zoom where practical for overflow,
  truncation, touch targets, overlays, tables, and virtual-keyboard obstruction.
- Refresh and compare persisted state to catch stale, duplicate, or lost data.

Reproduce suspected defects twice when safe and distinguish confirmed bugs,
risks, usability issues, and suggestions.

## Report in pt-BR

Start with `aprovar`, `aprovar com ressalvas`, or `não aprovar`. Include tested
and blocked scenarios, findings by severity, reproduction, actual/expected,
impact, evidence, fix, verification criterion, and the five highest-priority
follow-ups. This skill does not edit code; implementation uses the frontend
feature skill.
