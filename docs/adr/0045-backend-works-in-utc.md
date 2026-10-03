# ADR 0045 — The backend works in UTC only

Status: accepted (2026-10)

## Context

Instants were already UTC everywhere: the save interceptors stamp `CreatedAt`/`UpdatedAt`/`DeletedAt` from
`TimeProvider.GetUtcNow()` and `ApiResponse.Timestamp` is `DateTimeOffset.UtcNow`. #154 brought the first rule that
needs a calendar **day** — "today" decides whether a birth date is in the past, over 120 years, or a minor's — and
its first version answered with Brazil's business day: a `BusinessCalendar.GetBusinessToday()` that converted to
`America/Sao_Paulo`, fell back to the Windows id and then to a fixed UTC−3 when the host had no tzdata.

That is a time-zone concept inside the backend for a product whose rules are not sensitive to the hour, and Brazil
has four zones, so one hard-coded zone was only approximately right anyway.

## Decision

The backend has no time zone.

- Instants are `DateTimeOffset` in UTC, taken from the injected `TimeProvider`.
- Calendar dates (a birth date) are `DateOnly` and carry no zone.
- "Today" is the UTC calendar date: `DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime)`.
- No `TimeZoneInfo`, no `DateTime.Now`/`DateTimeOffset.Now`/`DateTime.Today`, no zone in configuration.

Showing an instant in local time, and reading a local date or time from the user, is the frontend's job.

## Consequences

- Less backend code and no dependency on the host's tzdata or on Windows vs. IANA zone ids.
- From 21:00 to midnight in Brasília (earlier in UTC−4/−5) the backend's "today" is already tomorrow. For the client
  rules that means: a person turning 18 tomorrow in Brazil is treated as an adult, and a birth date equal to the
  local today is accepted as "in the past". Accepted: nothing in the product depends on the exact hour.
- A frontend that pre-validates with the browser's local date is stricter than the backend in that window, never
  looser; the backend stays the authority.
- When a rule does need the business's day — the day's agenda, opening hours, "no booking in the past" — that is a
  new decision (most likely a per-tenant IANA zone), recorded in its own ADR that supersedes this one.

## Tried and reverted

- **Brazil's business day for "today"** (`BusinessCalendar`, `America/Sao_Paulo` with fallbacks) — implemented in
  #160 and removed before merge in favour of this rule.
