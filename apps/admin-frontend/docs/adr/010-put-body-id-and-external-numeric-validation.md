# ADR 010 — PUT body id kept, sent explicitly; runtime validation for widened numeric fields

**Status:** Accepted

## Decision

1. **The PUT request body keeps its `tagId`/`categoryId`/`serviceId` field**
   (the OpenAPI contract is not changed) — but `ApiTagRepository`/
   `ApiCategoryRepository`/`ApiServiceRepository`'s `update()` methods now
   construct that body **explicitly**, typed against the generated
   `Update{Tag,Category,Service}Command` type, setting the id field to the
   exact same `id` value the method already routes to
   (`PUT /api/v1/tags/${id}`). Previously, the hand-written
   `UpdateTagInput`/`UpdateCategoryInput`/`UpdateServiceInput` (which have
   no id field at all) were sent as the body directly — satisfying the
   backend's actual behavior (see Rationale) but silently not conforming
   to the OpenAPI schema it's generated from.
2. **`Service.create()` now validates every externally-sourced numeric
   field at runtime** (`code`, `durationMinutes`, `minDurationMinutes`,
   `maxDurationMinutes`, `price`, `maxDiscountPercentage`): rejects
   non-finite values (`NaN`, `Infinity`), rejects the wrong JS type (a
   string slipping through), and rejects a fractional value for the four
   fields the backend requires as `int32`. `Tag`/`Category` have no
   numeric fields sourced externally and needed no equivalent change.
3. **`Service.tags` is now a genuine defensive copy** (`this.tags = [...tags]`),
   typed `readonly TagSummary[]` — previously the entity stored the
   caller-supplied array by reference, so a caller mutating that array
   after construction (e.g. a mapper reusing a buffer) would have silently
   changed an already-constructed "immutable" entity.

## Rationale

### Why the PUT contract stays as-is

Investigated in this order: the generated OpenAPI type
(`UpdateTagCommand`/etc. in `services-api.d.ts`) marks the id field
required; the frontend's hand-written `Update*Input` types have never
included it; and the backend's `TagsController`/`CategoriesController`/
`ServicesController` all follow the same pattern (docs/adr/0007,
`backend/AGENTS.md`):

```csharp
[HttpPut("{id:guid}")]
public async Task<IActionResult> Update(Guid id, UpdateTagCommand command, ...)
{
    var result = await _dispatcher.Send(command with { TagId = id }, ...);
    ...
}
```

The route id **always** overwrites whatever the body sent, before the
command ever reaches FluentValidation or the handler — confirmed by
reading `UpdateTagCommandValidator` (its `NotEmpty()` rule on `TagId` runs
after the controller's override, so it can never actually fail from
client input) and the equivalent Category/Service validators. Root
`AGENTS.md`'s question policy requires a direct question before silently
changing a public API contract; since the backend's own ADR 0007 already
documents "a route id binds into its own `Guid id` parameter
independently... since the client's JSON body never carries it" as
**intentional**, there is no contract bug to raise with the user - the
generated schema is simply a mechanical artifact of ASP.NET's OpenAPI
generation reflecting the command record's shape, not a statement of what
the server actually reads from the body.

### The fix that was still worth making

Sending a body that doesn't match its own declared OpenAPI schema is a
latent inconsistency: harmless today only because the backend happens to
discard the field, and confusing to anyone reading the generated types
next to the actual runtime payload. Constructing the body explicitly,
keyed on the same `id` variable used for the URL, makes the two
structurally identical by construction - there is no code path where they
could diverge, and the request now honestly matches its contract.

### The external numeric data gap

`serviceMapper.ts`'s `ServiceDto` type already carried a comment
acknowledging the generated `ServiceResponse` types every numeric field as
`number | string` ("a known quirk... not an actual API behavior
difference") and narrowed it back to `number` with `Omit<...> &
Record<NumericServiceFields, number>` - a compile-time-only assertion.
Nothing downstream verified that assumption at runtime. `Service.create()`
is the correct place to enforce it: it's the one boundary every numeric
value must pass through before becoming part of a trusted domain entity,
regardless of which caller (the real mapper, a test, or code added later)
constructs the input.

## Consequences

- `ApiTagRepository.test.ts`/`ApiCategoryRepository.test.ts`/
  `ApiServiceRepository.test.ts`'s "updates at the correct path" tests now
  assert the full body shape, including the id field and explicit `null`
  for omitted optional fields (matching the schema's `null | string`
  fields, which are not optional).
- A `Service.create()` call with a non-finite, wrong-type, or (for the
  four integer fields) fractional numeric value now throws
  `InvalidServiceError` with a pt-BR message, instead of silently storing
  a value that would misbehave later (e.g. a string surviving arithmetic
  by accident, or `Number.isInteger` checks elsewhere failing unexpectedly).
- `Service.tags` mutations by the original caller no longer affect an
  already-constructed `Service` instance.
- This ADR does not touch `Create*Command`'s generated types - those have
  no route id to reconcile against, and their optional/nullable fields
  already round-trip correctly through `JSON.stringify`'s handling of
  `undefined` vs. the backend's nullable-reference-type defaulting.
