---
name: agenza-migration-safety
description: >
  Use for every EF Core migration or schema change. Prevents edits to applied
  migrations, silent data loss, invalid existing rows, unsafe concurrency, and
  missing rollback/verification.
---

# Migration safety

## Before generation

- Identify existing rows affected by new nullability, defaults, ranges,
  uniqueness, foreign keys, renames, type/length changes, or deletions.
- Decide whether backfill, staged deployment, duplicate cleanup, or explicit
  operator action is required.
- Never edit a migration that may have been applied outside disposable local
  development. Add a new migration.
- Confirm service schema, migrations-history table, database role, and tenant
  ownership remain correct.

## Review generated migration

- Inspect `Up` and `Down`; EF may encode a rename as destructive drop/add.
- Reject unexpected drops, truncation, defaulting, cascade behavior, or
  constraint changes.
- Tenant-owned uniqueness/relationships must include the tenant boundary.
- Document locking/concurrency impact and whether the current bootstrap model
  can apply it safely.

## Verification

- Build and test the affected solution.
- Apply the full chain to a clean PostgreSQL database through the current
  contract/runtime gate.
- For existing-data risk, dry-run against representative data or provide an
  explicit validation query and recovery plan. A clean-database test is not
  proof of transition safety.
- State data impact, operational ordering, rollback/recovery, and any required
  backup.

Ask before choosing a lossy path or changing data represented by a production
migration. Review output: `change | existing-data impact | destructive? |
tenant-safe? | operational risk | rollback | verification`.
