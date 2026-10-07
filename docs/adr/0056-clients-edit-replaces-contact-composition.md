# ADR 0056 — Clients: editing replaces the contact composition

Status: accepted (2026-10); supersedes [ADR 0053](0053-clients-edit-synchronizes-contacts-by-id.md)

## Context

The lists of guardians and reference contacts sent by `PUT /api/v1/clients/{id}` describe the
person's current composition. Reconciliation by child id makes the client send persistence detail
that has no business meaning, adds checks for foreign and repeated ids, and gives different meanings
to otherwise identical contact data.

## Decision

`UpdateClientCommand` receives contact data only. `Client.Update` validates the desired lists before
changing state, then replaces both child collections as one operation. All prior children become
orphans and the existing save interceptor soft-deletes them; all supplied children are new records.

`ClientGuardian` and `ClientReferenceContact` mint their own technical UUID v7 in their internal
factories. The `Client` root remains the only type that invokes those factories and supplies its own
id as the parent relationship, but it does not choose implementation-only ids for its children.

## Consequences

- The API no longer accepts or interprets child ids on a client update.
- The result is atomic: invalid contact data or aggregate rules leave the person and both collections
  unchanged.
- Repeating the same PUT creates a fresh representation of the composition and soft-deletes the
  previous contact rows. Contact identity is therefore not a stable business identifier.
- The `Client.ContactNotFound` and `Client.DuplicateContact` rules are removed because no request
  refers to an existing child.

## Considered and rejected

- **Synchronizing by child id.** It reconciles persistence identity even though the request already
  supplies the complete desired state.
- **Updating collection rows in place.** It preserves a technical id without preserving a business
  identity and requires comparison logic with no user-facing value.
