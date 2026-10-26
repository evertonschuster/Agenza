# Implementation Plan: CPF conflict navigation

**Branch**: `codex/fix-session-identity-and-client-conflict` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

## Summary

Preserve the field error code and metadata in the generic form mapping. ClientPersonSection observes the CPF error through useFormState and renders the link when it contains the duplicate code and existing client id. The form's own validation controls the error lifetime. The internal edit path opens in another tab and preserves the current page.

## Technical Context

Existing React/TypeScript, RHF, Zod and React Router packages from the repository lockfile. No dependency, HTTP contract, database or session-storage change. Colocated RTL tests plus the real Aspire Playwright flow.

## Constitution Check

Strict types; metadata is read from the generated problem type; tenant authority stays on the server; the existing OIDC and generated client remain; all quality gates apply; Aspire remains the only orchestrator. All checks pass before and after design.

## Project Structure

Change shared/api/formErrors and shared/form/applyApiProblem to preserve generic field error data; ClientPersonSection reads its own CPF error. Keep client-specific interpretation in that section. The page hook, shell and props need no conflict handling. ADR 0085 records the removal of the original state-based implementation of ADR 0084. Sibling documents define behavior and validation.

## Validation

Prove links on create and edit, preserve the draft, hide stale conflicts and omit missing/unrelated metadata. Run the full frontend gates and open the real edit form in another browser tab.
