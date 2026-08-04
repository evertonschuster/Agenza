# ADR 0013 — Application-only tenant relationship enforcement

Status: superseded by ADR 0024 (2026-07). Historical only; do not follow.

The former decision relied on tenant-filtered application lookups while foreign
keys referenced ids without the tenant boundary. ADR 0024 closed that gap with
database-enforced tenant ownership.

Current rule: application checks remain useful for errors, but tenant-scoped
relationships and uniqueness must also be encoded in database constraints.
