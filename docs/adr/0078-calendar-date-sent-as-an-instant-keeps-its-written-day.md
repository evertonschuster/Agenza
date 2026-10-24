# ADR 0078 — A calendar date sent as an instant keeps its written day

Status: accepted (2026-10); amends [ADR 0045](0045-backend-works-in-utc.md) on what the wire accepts for a calendar
date; consumes [ADR 0055](0055-shared-string-value-objects.md)'s `IDateValueObject<T>`

## Context

A calendar date (`BirthDate`) reached the backend only as `yyyy-MM-dd`: `DateValueObjectJsonConverter` handed the
string to the framework's `DateOnly` converter, which answers 400 to anything else. The admin-frontend met that
contract with `serializeBody`, a `bodySerializer` on its API client that rewrote every `Date` in a request body as its
UTC calendar day.

On 2026-10-23 the owner asked to remove `serializeBody`. Without it, the `Date` the form holds goes out as
`JSON.stringify` writes it, `2015-03-10T00:00:00.000Z`, and creating or updating a person with a birth date failed
with 400 (checked against the real converter). The owner chose to loosen the backend in the same change rather than
convert in the frontend.

## Decision

1. **A date value object also reads an instant.** When the JSON value is a string the reader parses as a
   `DateTimeOffset`, `DateValueObjectJsonConverter` keeps its date **as written** and drops the time and the offset:
   `2015-03-10T00:00:00.000Z`, `2015-03-10T23:59:59-03:00` and `2015-03-10T01:30:00+09:00` all bind 10 March 2015.
2. **Anything else is still the framework's job.** A plain `yyyy-MM-dd` binds as before, and a malformed value
   (`"abc"`, `"10/03/2015"`, `""`, a number) answers with the framework's message at the field, as it did.
3. **The rules run on that day.** `BirthDate.Create(date, today)` judges the kept day against the UTC "today" of ADR
   0045, whatever form it arrived in.
4. **What the backend writes does not change.** Responses and the OpenAPI document still carry `yyyy-MM-dd`
   (`format: date`).
5. **The frontend sends the `Date` it holds.** `createApiClient` has no `bodySerializer`; a calendar day is a `Date` at
   midnight UTC (`utcDate`), so its ISO string carries that day.

## Consequences

- Removing the serializer did not need a conversion in the repository or a change to `generateApiTypes.mjs`: the
  generated request types keep `format: date` as `Date`.
- The day is the one written in the string, not the UTC day of the instant. For the frontend's `Date` at midnight UTC
  the two are the same. A caller that sends a local instant gets its local day, which is what a person typed.
- A frontend `Date` built at local midnight (`new Date(y, m, d)`) east of UTC still goes out as the previous day,
  because `toISOString` writes UTC. Building days with `utcDate`/`todayUtc` stays the rule.
- One converter serves every date value object, so a future `IDateValueObject<T>` reads instants the same way.

## Considered and rejected

- **Converting in `clientsRepository`** (`formatIsoDate` on `birthDate`) and turning the generator's `Date` back into
  `string`. Keeps the strict contract; the owner preferred loosening the backend over touching the generator.
- **Keeping the instant's UTC day.** The owner asked for the date as written, hours and minutes ignored.
- **Keeping `serializeBody`.** The owner asked for it to go.
- **A backend PR first, then the frontend**, as the root `AGENTS.md` asks of a full-stack change. The owner asked for
  one branch, since the backend only accepts more than before and nothing else depends on it.
