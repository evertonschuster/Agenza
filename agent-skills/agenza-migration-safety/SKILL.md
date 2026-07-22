---
name: agenza-migration-safety
description: >
  Use for any EF Core migration or schema change under backend/ — new
  migration, column/constraint change, index change, or data backfill.
  Trigger on "add a migration", "change the schema", "add a column",
  "add an index/constraint", or when reviewing a PR that includes a
  `Migrations/` file. Prevents silent data loss, unsafe concurrent
  execution, and edits to migrations already applied outside local dev.
---

# Migration Safety

## Before writing a migration

1. **Read the model change against real data.** What rows exist today
   that the new schema must still accommodate? A new `NOT NULL` column
   needs either a default or an explicit backfill step for existing rows;
   a narrowed column type/length needs a check that no existing value
   would be truncated.
2. **Check for a destructive operation.** Dropping a column/table,
   narrowing a type, adding a `NOT NULL` without a default, or removing a
   constraint that currently prevents bad data — every one of these can
   destroy data or silently change its meaning. None of these are
   forbidden outright, but every one needs the analysis in this skill
   before it ships, not after.
3. **Never edit a migration that has already been applied** outside of
   local, uncommitted dev iteration. Once a migration has shipped (merged
   to `main`, or plausibly already applied to any shared/deployed
   database), a schema fix is a **new** migration, never an edit to the
   old file — see docs/adr/0012's `20260721121859_AddCaseInsensitiveUniquenessAndCategoryLimits`
   for the pattern of a new, additive migration rather than a rewrite.

## Required for any migration that touches existing data

- **Analysis of existing data**: what rows exist, what the change does to
  them, whether any row could violate the new schema (a duplicate that
  would violate a new unique index, a null that would violate a new
  `NOT NULL`).
- **Validation**: `dotnet ef migrations add <Name>` reviewed by hand — the
  generated `Up`/`Down` should not include anything the description above
  didn't call for (an unexpected `DropColumn`, an unexpected
  `RENAME`-as-`DROP`-then-`ADD` that EF sometimes generates for a rename
  it can't detect as one).
- **Tests**: this repo has no integration test tier against a real
  database (docs/adr/0015) — a migration's actual effect on data has no
  automated coverage. State this explicitly rather than claiming the
  migration is "tested" because unit tests pass; if the change is
  destructive or high-risk, recommend (or perform, if tooling allows) a
  manual dry run against a copy of representative data.
- **Operational documentation**: note in the PR/commit or `docs/MONOREPO.md`'s
  "Known gaps" section anything an operator needs to know before applying
  this in a non-local environment (e.g. the existing note there about
  `Migrations:RunOnStartup` and concurrent replicas — a new migration
  doesn't change that mechanism, but a schema change that's unsafe to
  apply concurrently with multiple running replicas needs the same kind
  of callout).
- **Ask the responsible party when real data-loss risk exists.** This is
  one of the explicit question-policy triggers in root `AGENTS.md`
  ("modifies data already in a production migration" / genuine risk of
  data loss) — don't silently choose a lossy migration path because it's
  simpler to write.

## Prohibited

- Silent truncation (narrowing a column without checking existing values
  fit).
- Silent removal of data (dropping a column/table/row without calling out
  what's lost).
- A destructive change with no verification step at all — at minimum, the
  analysis above, even without automated integration tests.
- Concurrent-unsafe execution assumed away — if the deployment model could
  run migrations from more than one replica at once (see
  `docs/MONOREPO.md`'s "Known gaps"), say so and flag the risk rather than
  assuming today's single-container setup forever.
- Editing a historical, already-applied migration file instead of adding
  a new one.
- Changing a constraint (uniqueness, FK, `NOT NULL`) with no test or
  manual verification that existing data satisfies it.
- Shipping a schema change with no rollback/recovery path at all — even a
  documented manual one ("re-run migration N-1, restore column from
  backup") is better than none.

## Output when reviewing (not authoring) a migration

`change | destructive? | existing-data impact | concurrency-safe? |
rollback path | verified how | open questions for the user (if any)`.
