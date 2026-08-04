# ADR 0010 — Repository-backed validation experiment

Status: superseded by ADR 0012 (2026-07). Historical only; do not follow.

This experiment moved existence, uniqueness, and cross-aggregate checks into
FluentValidation. It was reverted because validators became asynchronous,
persistence-coupled, and unable to preserve the intended application error
semantics cleanly.

Current rule: validators check synchronous request shape; handlers perform
current-state and cross-aggregate checks; database constraints protect races.
See ADR 0012 and `backend/AGENTS.md`.
