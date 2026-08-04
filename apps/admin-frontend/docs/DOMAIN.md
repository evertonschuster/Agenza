# Frontend domain glossary

This document contains only confirmed terminology. It does not define wire
schemas; generated OpenAPI types and backend source own those. Do not invent
fields for a feature marked `stub` in `STATUS.md`.

## Implemented/authenticated concepts

### Business / Tenant

A service business whose data is isolated from every other business. The
frontend represents authenticated tenant identity through the auth feature's
`Tenant` and `TenantContext` values. `TenantContext` is session/UI state, not a
repository argument.

### User and Session

A `User` authenticates through OIDC and belongs to one tenant in the current
product model. A `Session` is the validated access-token/user/expiry state. The
frontend must preserve both user and tenant identity during renewal.

### Category

A tenant-scoped grouping for catalog services. The implemented frontend
vertical currently confirms:

- `id`;
- `name`, required after trimming.

Exact request/response types come from the generated services-service contract.

## Confirmed backend concepts not yet implemented as frontend verticals

### Service

A tenant-scoped offering that can be booked. The backend contract exists, but
the frontend route is a stub. Before implementation, inspect the generated
OpenAPI types and backend domain; do not use a copied field inventory here.

### Tag

The backend retains the Tag domain and API. The frontend intentionally removed
its Tag model and UI under frontend ADR 016. A future Service UI must make an
explicit contract/UI decision before exposing tag data.

## Product concepts without a confirmed frontend contract

The product direction includes Clients, Appointments, Conversations/Inbox, and
Business Settings. Their frontend routes are stubs and their field sets,
enums, workflows, and ownership rules are not specified by this glossary.
Implementation requires a confirmed backend/OpenAPI contract and business
rules.

Stable high-level meanings:

- **Client:** a tenant-scoped person interacting with the business.
- **Appointment:** a tenant-scoped booking connecting a client and service.
- **Conversation / Inbox:** a client interaction that may move between AI and
  staff handling.
- **Business Settings:** tenant-owned operating configuration.

## Explicitly out of scope for the current frontend

- payment processing;
- client-facing channel/widget;
- voice/phone AI;
- holiday/exception working schedules;
- multi-business user accounts;
- cross-tenant client identity.

Do not pre-model these capabilities as placeholders. Add domain concepts only
with an implementation task and confirmed rules.
