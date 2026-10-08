# ADR 0061 — Validators write their own rules; there is no `<Feature>RuleBuilderExtensions`

Status: accepted (2026-10); supersedes the `<Feature>RuleBuilderExtensions` home for a shared input rule that
[ADR 0049](0049-conventions-for-new-backend-slices.md) (item 3) gave

## Context

`ClientRuleBuilderExtensions` held the validator rules that the create and the edit of a client share: the
limits of guardians and reference contacts, "a minor needs a guardian", the name and relationship of a
contact, and the purposes. It existed so the two validators could not drift, and the convention that a rule
used by two validators moves to a `<Feature>RuleBuilderExtensions` followed from it.

Reviewing the read of a client by id raised the question for the smallest case, a three-line rule that an id
is not empty, and then for the class as a whole. The cost of the class is an indirection: the reader of a
validator opens another file to learn what `MustBeValidContactName("do responsável")` checks, and the
messages are built from a `subject` argument instead of being written where they are shown. The gain is that
one copy changes in one place.

## Decision

- Each validator writes its own rules, with their `.WithErrorCode(…)` and `.WithMessage(…)`. A rule that two
  validators share is repeated in both, the way a few lines of orchestration repeated between two handlers
  are accepted ([ADR 0049](0049-conventions-for-new-backend-slices.md), item 3).
- The nested input validators (`GuardianInputValidator`, `ReferenceContactInputValidator` and their update
  counterparts) restate their rules too.
- `ClientRuleBuilderExtensions` is deleted. A feature gets no `<Feature>RuleBuilderExtensions`, and a
  validator still has no base class.
- What keeps the copies aligned is unchanged: limits come from the domain's constants, and every rule carries
  the domain's error code ([ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md)).
  A rule with no domain counterpart gets a `<Type>.<Rule>` literal in the validator.

## Consequences

- A validator reads top to bottom with no jump. The messages are visible next to their rules.
- The create and the edit validators of clients each carry the rules the class held, and the class is gone.
  The code change adds 102 lines and removes 98, so the code base ends about the same size.
- A change to a shared rule is made in each validator that has it. A copy changed in one place only is caught
  when the other validator's tests assert the changed rule, so a validator's tests assert the code of every
  rule they cover.
- The wire does not change: codes and messages are the ones the class produced.

## Considered and rejected

- **Keeping the class for the long rules and writing the short ones inline.** It needs a length threshold
  that is a judgment call each time, and it leaves both shapes in one feature.
- **Keeping the class and only moving the id rule out.** It answers the case that raised the question and
  leaves the same trade-off in place for the rest.
