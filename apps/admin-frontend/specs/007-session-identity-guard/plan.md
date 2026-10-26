# Implementation Plan: identity guard

**Branch**: `codex/fix-session-identity-and-client-conflict` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

## Summary

Keep the accepted OIDC subject with the session. Compare subject and token-derived tenant in the pure reducer before replacing credentials. Latch identity changes until explicit login, abort the session request scope in the API middleware, and let ProtectedRoute unmount all loaded feature state. Clean persisted OIDC credentials in the existing auth adapter.

## Technical Context

TypeScript, React, React Router and oidc-client-ts: repository pins and lockfile remain authoritative. Browser SPA; existing local OIDC storage only. No added package, server endpoint or data model migration. Vitest/RTL for state, event races and protected UI; Playwright against Aspire for real login.

## Constitution Check

- Strict types; no any or generated DTO edits.
- Tenant still comes from the token; the backend remains the authorization boundary.
- Existing OIDC provider and ports remain.
- Existing generated client and Result pipeline remain.
- All quality gates run; environment failures are reported.
- Aspire remains the local orchestrator.

All gates remain satisfied after design. No exception or delegation is needed.

## Project Structure

Change `src/shared/session/{session,sessionMachine,sessionStore}.ts`, `src/shared/api/apiClient.ts`, the auth session driver and ProtectedRoute. Extend their colocated tests and token fixtures. Record ADR 0083 and update the auth architecture and tenant review guidance. Research, state model and contract are in the sibling documents.

## Validation

Prove normal renewal, changed tenant/subject, absent identity, late initial/event completion, cancellation and explicit re-login. Run typecheck, lint, format, full coverage, production build, OpenAPI drift and real-stack browser checks.
