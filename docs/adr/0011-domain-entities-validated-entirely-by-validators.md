# ADR 0011 — Validator-only domain experiment

Status: superseded by ADRs 0012 and 0014 (2026-07). Historical only; do not
follow.

This experiment made domain entities trust validators and removed their own
invariant enforcement. It was reverted because entities could be constructed or
mutated through non-HTTP paths without defense in depth.

Current rule: domain factories and mutation methods validate permanent
invariants before changing state and return `DomainResult` for expected failure.
See ADR 0014 and `backend/AGENTS.md`.
