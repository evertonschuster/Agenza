# ADR 0007 — Controllers bind commands directly, handlers map via extension methods

Status: accepted (2026-07)

## Context

Two small but repeated patterns in the Tags vertical were pure
boilerplate:

1. Every controller redeclared a local `record ...Body(...)` (e.g.
   `TagsController.TagBody`) shaped almost identically to the command
   it fed into (`CreateTagCommand`/`UpdateTagCommand`), just to have
   something to bind the HTTP request body to. The controller action
   then manually copied each field from the body record into a new
   command instance.
2. Command handlers that construct or mutate a domain entity
   (`CreateTagCommandHandler`, `UpdateTagCommandHandler`) inlined the
   `TagColor.From(...)` + `new Tag(...)` / `tag.Update(...)` mapping
   directly in `Handle(...)`, mixing "translate a command into domain
   calls" with the handler's actual orchestration logic (uniqueness
   check, repository call, commit).

## Decisions

### Controllers bind the Command/Query type directly — no per-endpoint body record

`[ApiController]` already infers `[FromBody]` for the first complex-type
action parameter without an explicit binding-source attribute, and
route-template segments (`{id:guid}`) bind their own action parameter
from the route independently — both are standard ASP.NET Core model
binding, not something specific to this repo. So a command whose fields
are *entirely* client-supplied (`CreateTagCommand(string Name, string
Color, string? Description)`) can be the action parameter itself:

```csharp
[HttpPost]
public async Task<IActionResult> Create(CreateTagCommand command, CancellationToken cancellationToken)
{
    var result = await _dispatcher.Send(command, cancellationToken);
    return result.ToActionResult(this, tag => Created($"/api/v1/tags/{tag.Id}", tag));
}
```

For a command that mixes a route-sourced id with body fields
(`UpdateTagCommand(Guid TagId, string Name, string Color, string?
Description)`), the id action parameter and the command parameter bind
independently — the JSON body never contains `tagId`, so
`System.Text.Json`'s parameterized-constructor deserialization just uses
`default(Guid)` (`Guid.Empty`) for that positional parameter (verified:
missing constructor-matched properties don't throw). The route id is
then merged in with a `with` expression right before dispatching:

```csharp
[HttpPut("{id:guid}")]
public async Task<IActionResult> Update(Guid id, UpdateTagCommand command, CancellationToken cancellationToken)
{
    var result = await _dispatcher.Send(command with { TagId = id }, cancellationToken);
    return result.ToActionResult(this, tag => Ok(tag));
}
```

No wire-format change for callers: System.Text.Json's default camelCase
naming policy applies identically whether the bound type is a
one-off `...Body` record or the command itself, so `{"name":...,
"color":...,"description":...}` is unchanged.

`DeleteTagCommand(Guid TagId)` and `ListTagsQuery` don't need this at
all — they're built inline (`new DeleteTagCommand(id)`, `new
ListTagsQuery()`) since there's no body to bind.

### Command → Domain mapping lives in an extension method next to the command, not inline in the handler

`{Feature}/{Operation}/{Operation}CommandExtensions.cs` holds a static
extension method translating the command into domain calls:

```csharp
public static class CreateTagCommandExtensions
{
    public static Tag ToModel(this CreateTagCommand command, Guid tenantId) =>
        new(Guid.CreateVersion7(), tenantId, command.Name, TagColor.From(command.Color), command.Description);
}

public static class UpdateTagCommandExtensions
{
    public static void ApplyTo(this UpdateTagCommand command, Tag tag) =>
        tag.Update(command.Name, TagColor.From(command.Color), command.Description);
}
```

Handlers call `command.ToModel(tenantId)` / `command.ApplyTo(tag)`
instead of inlining the value-object conversion and constructor/mutator
call. This keeps `Handle(...)` reading as orchestration (validate
uniqueness, persist, commit) with the "how do these fields become a
domain object" detail named and testable on its own. Lives in
`Application` (same layer as the command), not Domain — the mapping
still only calls the entity's existing public constructor/behavior
methods, it doesn't add new domain logic.

## Consequences

- New command/query with an HTTP body: bind it directly as the action
  parameter (or merge a route id in via `with` immediately before
  dispatching) — no `{Feature}Body` record type to declare or keep in
  sync.
- New command that constructs or mutates a domain entity: add a
  `ToModel`/`ApplyTo`-shaped extension method beside the command, and
  call it from the handler instead of inlining the construction.
- `backend-use-case` skill's templates and `backend/CLAUDE.md` are
  updated to teach this shape as the default.
- The `ToModel(this CreateTagCommand command, Guid tenantId)` shape
  above is what this decision looked like at the time — it's since
  lost the `tenantId` parameter entirely (docs/adr/0008), and `Tag`'s
  constructor lost its own `tenantId` parameter too
  (docs/adr/0008, docs/adr/0009). The `ToModel`/`ApplyTo` extension
  pattern itself is unchanged; only the tenant plumbing moved.
