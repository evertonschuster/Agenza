---
name: agenza-architecture-review
description: >
  Use for a repository architecture audit covering boundaries, dependency
  direction, multi-tenancy, Result flow, persistence, contracts, tests, CI, and
  documentation. Review-only unless implementation is explicitly requested.
---

# Architecture review

Load the root instructions, affected area instructions, current layout/config,
and only the ADR indexes relevant to observed concerns.

## Evidence order

1. code, project/package graphs, config, migrations, generated contracts;
2. tests, guards, and workflows;
3. living status/API/layout docs;
4. accepted ADRs;
5. historical ADR content only when explaining how drift occurred.

## Review dimensions

- Monorepo/app/service ownership matches `docs/MONOREPO.md` and `docs/VISION.md`.
- Dependencies point inward and cross-service calls use explicit contracts.
- Features are cohesive vertical slices without speculative shared abstractions.
- Expected failures use the established Result boundary; exceptions remain
  technical.
- Tenant identity is authenticated, propagated atomically, filtered in
  persistence, and included in indexes/relationships/caches where required.
- Migrations, database roles, schemas, and bootstrap behavior preserve service
  ownership and data safety.
- Frontend generated contracts, runtime decoders, and backend OpenAPI agree.
- Tests verify the boundary that matters; gates run in CI and are not weakened.
- Active docs describe current state without copying volatile inventories or
  superseded rules.
- Dependencies and runtime pins have one owner and no unnecessary parallel
  tooling path.

## Report

Lead with blocking security/data-loss findings, then high/medium/low items. For
each: evidence, violated boundary, impact, smallest correction, and verification
criterion. Separate confirmed defects from risks and optional improvements.
When implementation is requested, apply only evidence-backed fixes and run all
applicable gates.
