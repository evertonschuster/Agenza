# ADR 0092 — admin-frontend: form fields submitted under another name

Status: accepted (2026-11-06); amends the `TagIds` error handling of
[ADR 0091](0091-admin-frontend-search-select-and-client-tags.md)

## Context

A picker field holds the records it shows, while the command takes their ids under another name: the
person form's `tags` (`{ id, name, color }[]`) are sent as `tagIds` (ADR 0091), and the services commands
already take `categoryId` and `tagIds`. The backend reports a failure under the command's name, so an
error on `TagIds` matches no path of the form and falls to the form banner, away from the picker. An error
on one item, `TagIds[0]`, has a second problem: once renamed, `tags.0` is a path of the current values, so
`setError` accepts it, but no control renders it and the message is never seen.

ADR 0091 solved both inside the person form with a `toClientFormProblem` that matched `TagIds` and
`TagIds[n]` with a regex. The owner asked for an approach that every form with such a field can reuse,
owned by `applyApiProblem` itself rather than a step each page has to remember.

## Decision

`applyApiProblem` takes a single object, `{ problem, methods, aliases }`, so its signature fits one line;
the person and tag forms both call it that way. `aliases` maps a command field to the form path that holds
it, `{ tagIds: 'tags' }`, typed as `FieldAliases<FormFieldValues>`, so a target that is not a path of the
form does not compile. A key matches an alias by its top-level name, ignoring case, and every key under it
(`TagIds[0]`, `TagIds[1].Value`) lands on the form field itself: a picker is one control, without an input
per item. Entries from several keys are joined in the order the server sent them, and the field shows the
first one, as any field does. Forms without such a field leave `aliases` out.

The form module declares its aliases beside the schema transform that renames the field on the way out.
The person form declares `CLIENT_FORM_FIELD_ALIASES = { tagIds: 'tags' }` and its page hook calls
`applyApiProblem({ problem: result.error, methods, aliases: CLIENT_FORM_FIELD_ALIASES })`;
`toClientFormProblem` is gone.

Only top-level command fields take an alias. A list of rows with a picker each (`Services[0].ServiceId`)
would need the indices before the aliased segment kept; that waits for a form that has one.

## Consequences

- A new form with a picker writes its transform and one alias entry; matching, collapsing and joining are
  tested once, in `applyApiProblem.test.ts`.
- The rename is still declared twice, in the transform and in the aliases, side by side in the form
  module. The page test of a server error on the field catches a divergence.
- `toFormErrors` is unchanged; the aliases are resolved before it matches keys to paths.
- A key that only starts with the alias (`TagIdsArchived`) or a nested key of another field
  (`Guardians[0].TagIds`) keeps its own path.

## Alternatives considered

- **A separate `renameFieldErrors(problem, renames)` composed before `applyApiProblem`.** Tried on the
  branch and reverted: it left `applyApiProblem` untouched, but every page with an alias had to remember to
  wrap the problem, and the owner asked for the bridge to own the operation.
- **A third positional parameter on `applyApiProblem`.** The shortest call, and the tag form would not
  change, but the signature would stay wrapped one parameter per line, now with three, which the owner
  asked to avoid.
- **One declaration for both directions**, a helper building the transform and the aliases from
  `{ tags: 'tagIds' }`. It removes the duplication at the cost of a mapped generic type covering lists and
  single ids, and hides a readable one-line `map` behind a function, the trade
  [ADR 0061](0061-validators-write-their-own-rules.md) refused for validator rules. Worth revisiting if the
  two declarations drift in practice.
- **The form holds ids and the picker resolves the records.** The error would land by name, with nothing
  to alias, but the picker would need its own `id → record` cache, fed by the search results and by the
  record on edit: a second source of truth, and a `reset` with ids it has not seen draws chips without
  names. It also reverses the `value: T[]` of ADR 0091.
- **Renaming on the backend**, a `tags` property or `OverridePropertyName("Tags")`. It shapes the contract
  after one screen while other consumers expect the `xIds` convention, and the per-item problem remains.
- **Inferring the alias by convention** (`fooIds` → `foos`, `fooId` → `foo`). It breaks on plurals
  (`categoryIds`) and, when wrong, fails silently to the banner.
