# ADR 0059 — A root with many members takes an `<Entity>Data` record, and the handler calls the domain

Status: accepted (2026-10); narrows [ADR 0007](0007-direct-command-binding-and-mapping-extensions.md) for the clients
slice

## Context

`Client.Create` and `Client.Update` took nine or ten positional arguments, and the command extensions
(`ToModel`, `ApplyTo`) called them. The handler therefore never showed the domain operation it
orchestrates: `command.ApplyTo(client, today)` hid `client.Update(...)` behind a mapping method, and the
mapping did two jobs (turn nested inputs into domain data, and invoke the behaviour).

## Decision

- `ClientData` (`ServicesService.Domain/Entities`) carries what the outside hands the aggregate: the value
  objects as received, plus the child data records (`GuardianData`, `ReferenceContactData`). It sits beside
  those records and follows the rule that data records describe a child without creating one.
- `Client.Create(ClientData, today)` and `client.Update(ClientData, today)` take it. `Create` mints the
  root's id (`Guid.CreateVersion7()`), so no caller supplies one.
- The command extensions are pure mapping: `ToClientData()` on the create and on the update command turns
  the nested inputs into child data and builds the record. `ToModel` and `ApplyTo` are gone from clients.
- The handlers call the domain themselves: `Client.Create(command.ToClientData(), today)` and
  `client.Update(command.ToClientData(), today)`, then handle the `DomainResult`.
- The other slices keep `ToModel` / `ApplyTo` until they are next touched; a root that grows past a few
  members is converted the same way.

## Consequences

- The handler reads as orchestration: load, call the domain operation, pre-checks, persist, save.
- Create and update share one input shape, and the long positional signatures disappear.
- Tests build a client through `ClientTestData.Data(...)`, which supplies defaults.
- A root created from a data record owns its id; a root still created by `ToModel` receives it from the
  caller. Both shapes coexist until the older slices are converted.

## Considered and rejected

- **Public child mappers and a nine-argument call in the handler.** It moves the call to the handler with
  the smallest diff, but leaves the long signatures and two copies of the same list of arguments.
- **Private mapping methods in the handler.** It breaks the rule that the mapping lives beside the command
  and would duplicate the nested-input mapping between create and update.
