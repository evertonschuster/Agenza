# ADR 010 — Explicit PUT body ids and runtime validation of external numbers

**Status:** Accepted. Historical Tag examples are removed; the rules remain
current.

## Decision

- When the OpenAPI PUT command includes an id in the body, the repository builds
  that body explicitly and sets it to the same id used in the route.
- Route/body id disagreement is never possible by spreading caller input
  blindly.
- Generated TypeScript types define the static wire shape but do not validate
  runtime JSON.
- Decoders reject non-finite, non-integer, out-of-range, or otherwise invalid
  numeric values according to the backend/domain contract before mapping them
  into domain objects.
- Request builders and decoder tests cover the exact body and invalid numeric
  variants.

## Rationale

This keeps frontend requests conformant with generated OpenAPI while preventing
untrusted JSON from entering the domain merely because TypeScript declared a
narrower type.
