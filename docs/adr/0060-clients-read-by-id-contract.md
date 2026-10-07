# ADR 0060 — Reading a client by id: one response, no age on the wire, contacts ordered by name

Status: accepted (2026-10); extends [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) and
[ADR 0056](0056-clients-edit-replaces-contact-composition.md) with the read contract

## Context

`GET /api/v1/clients/{id}` loads one client for its detail screen and for the edit, deactivate,
reactivate and delete screens that start from it. The client aggregate, its response and the soft-delete
and tenant filters already existed. Four things about the read were still open: whether the response
carries the age, whether the detail is a different shape from what `POST` and `PUT` answer, who may see
the whole CPF, and in what order the linked contacts come back.

## Decision

- **One response.** The read returns the same `ClientResponse` as `POST` and `PUT`: person fields,
  situation, guardians and reference contacts with their purposes. There is no `ClientDetailResponse`.
- **The age is not on the wire.** The response carries `birthDate`, and the frontend derives the age to
  display. A client without a birth date has no age to show. The backend stores and returns the date only;
  the age is not stored anywhere.
- **The CPF comes whole to any authenticated user of the tenant**, the person's and the guardians'. The
  project has no roles or permissions (the tenant is the whole authorization story,
  [ARCHITECTURE §12](../../backend/docs/ARCHITECTURE.md)), and the edit form needs the guardians' CPF to
  send it back, because an edit replaces the contact composition (ADR 0056).
- **Situation.** An active and an inactive client are both returned, `status` says which. A soft-deleted
  client is not (the filter hides it).
- **One answer for "not there".** An unknown id, an id of another tenant and an id of a deleted client all
  answer `404 Client.NotFound` with the same body. The two query filters do this; the handler adds no
  existence check of its own, so nothing tells the cases apart. An empty id is `400 Client.IdRequired`.
- **Order.** `GetByIdAsync` loads the guardians and the reference contacts ordered by name, then by id.
  Without it the database returns them in an arbitrary order, and an edit, which replaces every contact
  and its id, could reshuffle them between two reads.

## Consequences

- The detail, the create answer and the update answer cannot drift: one record, one `FromClient`.
- `POST` and `PUT` answer the contacts in the order the request listed them; only a read orders them.
  A screen that shows the saved client reads it.
- The age shown follows the viewer's calendar day. A server-computed age would follow UTC
  ([ADR 0045](0045-backend-works-in-utc.md)) and would turn some hours before the birthday for a viewer
  in Brazil.
- `GetByIdAsync` is shared with the update, so the update loads its contacts in the same order. It
  replaces them all, so the order has no effect there.
- The order is the database's collation of the name, not a culture-aware sort in the application.

## Considered and rejected

- **`age` in the shared response, or in a detail-only response.** It keeps the rule in one place, but
  ties the response to the day it was computed, and a detail-only record means a second shape to map and to
  keep equal to the first.
- **A permission to see the whole CPF.** It contradicts the project's authorization model and needs a
  product decision about who may see it; it is a new ADR if the product asks.
- **Keeping the order the user typed.** It needs a position column, a migration and a change to the create
  and the edit. A `Guid.CreateVersion7()` id does not stand in for it: ids minted in the same millisecond
  are not ordered.
- **Leaving the order to the database.** The simplest, but the screen could reorder the contacts on every
  load.
